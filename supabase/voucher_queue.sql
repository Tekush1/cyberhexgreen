-- ============================================================
-- Voucher mail queue (7 Nov 2026, migration voucher_queue).
-- Admin -> Vouchers puts every email in voucher_queue; the server sends a few each minute,
-- even when nobody has the admin page open. Slow and steady keeps us out of spam and under provider limits.
--
--   pg_cron (every minute) --pg_net--> POST https://cyberhx.com/api/voucher-queue  (header x-queue-secret)
--   /api/voucher-queue -> voucher_queue_claim(secret, n) -> sends -> voucher_queue_done(secret, results)
--
-- The secret is the existing app_secrets row 'inbound' (checked inside the database). It is never in this repo.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.voucher_queue (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id    uuid REFERENCES public.voucher_events(id) ON DELETE SET NULL,
  kind        text NOT NULL DEFAULT 'rank' CHECK (kind IN ('rank','special')),
  email       text NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 200),
  name        text NOT NULL DEFAULT '' CHECK (length(name) <= 120),
  vars        jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(vars) = 'object' AND pg_column_size(vars) < 4000),
  shared      jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(shared) = 'object' AND pg_column_size(shared) < 6000),
  via         text NOT NULL DEFAULT 'mail' CHECK (via !~ '^resend' AND length(via) <= 20),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','cancelled')),
  attempts    int NOT NULL DEFAULT 0,
  last_error  text NOT NULL DEFAULT '',
  provider    text NOT NULL DEFAULT '',
  not_before  timestamptz NOT NULL DEFAULT now(),
  claimed_at  timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS voucher_queue_due ON public.voucher_queue (not_before) WHERE status IN ('pending','sending');
CREATE INDEX IF NOT EXISTS voucher_queue_event ON public.voucher_queue (event_id, kind);
-- The same email + code is never queued twice while it is waiting or already sent.
CREATE UNIQUE INDEX IF NOT EXISTS voucher_queue_once ON public.voucher_queue (email, ((vars->>'code')), kind)
  WHERE status IN ('pending','sending','sent');

ALTER TABLE public.voucher_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voucher_queue FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voucher_queue TO authenticated;
CREATE POLICY voucher_queue_staff ON public.voucher_queue FOR ALL TO authenticated
  USING ((SELECT public.can('ctf')) OR (SELECT public.can('emails')))
  WITH CHECK ((SELECT public.can('ctf')) OR (SELECT public.can('emails')));

-- Hand out the next due emails (oldest first) to the sender. Rows stuck in 'sending' for 5 minutes are retried.
CREATE OR REPLACE FUNCTION public.voucher_queue_claim(p_secret text, p_limit int DEFAULT 6)
RETURNS SETOF public.voucher_queue LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $f$
BEGIN
  IF p_secret IS NULL OR p_secret IS DISTINCT FROM (SELECT value FROM app_secrets WHERE name = 'inbound') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  UPDATE voucher_queue q SET status = 'sending', claimed_at = now(), attempts = q.attempts + 1
   WHERE q.id IN (
     SELECT id FROM voucher_queue
      WHERE (status = 'pending' AND not_before <= now())
         OR (status = 'sending' AND claimed_at < now() - interval '5 minutes')
      ORDER BY not_before, id
      LIMIT greatest(1, least(coalesce(p_limit, 6), 20))
      FOR UPDATE SKIP LOCKED)
  RETURNING q.*;
END $f$;

-- Results: [{id, ok, provider, error, retry_minutes, subject, text, message_id}]
CREATE OR REPLACE FUNCTION public.voucher_queue_done(p_secret text, p_results jsonb)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $f$
DECLARE r jsonb; n int := 0; q voucher_queue;
BEGIN
  IF p_secret IS NULL OR p_secret IS DISTINCT FROM (SELECT value FROM app_secrets WHERE name = 'inbound') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p_results, '[]')) LOOP
    SELECT * INTO q FROM voucher_queue WHERE id = (r->>'id')::bigint AND status = 'sending';
    IF NOT FOUND THEN CONTINUE; END IF;
    IF (r->>'ok')::boolean THEN
      UPDATE voucher_queue SET status = 'sent', sent_at = now(), provider = left(coalesce(r->>'provider',''), 20), last_error = '' WHERE id = q.id;
      INSERT INTO mail_usage (provider, day, count) VALUES (left(coalesce(r->>'provider','unknown'), 20), current_date, 1)
        ON CONFLICT (provider, day) DO UPDATE SET count = mail_usage.count + 1;
      INSERT INTO mail_log (email, template, subject, provider, message_id, body)
        VALUES (q.email, 'team_voucher', left(coalesce(r->>'subject',''), 300), left(coalesce(r->>'provider',''), 20),
                left(r->>'message_id', 200), left(coalesce(r->>'text',''), 8000));
    ELSIF coalesce((r->>'retry_minutes')::int, 0) > 0 AND q.attempts < 8 THEN
      UPDATE voucher_queue SET status = 'pending', not_before = now() + make_interval(mins => least((r->>'retry_minutes')::int, 720)),
        last_error = left(coalesce(r->>'error',''), 500) WHERE id = q.id;
    ELSE
      UPDATE voucher_queue SET status = 'failed', last_error = left(coalesce(r->>'error','failed'), 500) WHERE id = q.id;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $f$;

REVOKE ALL ON FUNCTION public.voucher_queue_claim(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.voucher_queue_done(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.voucher_queue_claim(text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.voucher_queue_done(text, jsonb) TO anon, authenticated;

-- Every minute: wake the sender, only when something is due.
CREATE OR REPLACE FUNCTION public.voucher_queue_tick()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $f$
BEGIN
  IF EXISTS (SELECT 1 FROM voucher_queue WHERE (status = 'pending' AND not_before <= now())
                                          OR (status = 'sending' AND claimed_at < now() - interval '5 minutes')) THEN
    PERFORM net.http_post(
      url := 'https://cyberhx.com/api/voucher-queue',
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'x-queue-secret', (SELECT value FROM app_secrets WHERE name = 'inbound')),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000);
  END IF;
END $f$;
REVOKE ALL ON FUNCTION public.voucher_queue_tick() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('voucher-queue', '* * * * *', 'SELECT public.voucher_queue_tick()');

-- Admin -> Vouchers adds emails with this (as the signed-in staff member; RLS applies).
-- Emails already waiting or already sent with the same code are skipped. Returns how many were added.
CREATE OR REPLACE FUNCTION public.voucher_queue_add(p_rows jsonb)
RETURNS int LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $f$
DECLARE n int;
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 2000 THEN
    RAISE EXCEPTION 'Send at most 2000 emails at a time.' USING ERRCODE = 'P0001';
  END IF;
  WITH ins AS (
    INSERT INTO voucher_queue (event_id, kind, email, name, vars, shared, via, not_before)
    SELECT nullif(r->>'event_id','')::uuid, coalesce(r->>'kind','rank'), lower(trim(r->>'email')), left(coalesce(r->>'name',''), 120),
           coalesce(r->'vars','{}'), coalesce(r->'shared','{}'), coalesce(nullif(r->>'via',''),'mail'), now()
    FROM jsonb_array_elements(p_rows) r
    ON CONFLICT DO NOTHING
    RETURNING 1)
  SELECT count(*) INTO n FROM ins;
  RETURN n;
END $f$;
REVOKE ALL ON FUNCTION public.voucher_queue_add(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.voucher_queue_add(jsonb) TO authenticated;

-- 7 Nov 2026 (migration voucher_queue_hold): voucher_queue_done also understands
--   {id, hold_minutes}      wait without using up a try (per-minute share, or the service is at its limit)
--   {rest_via, minutes}     the service is full: every email waiting for it waits that long too
-- (see the live function; same body as above plus these two branches)
-- Waits can last up to 1500 minutes (a provider's daily limit, e.g. Sender "Retry after <time>"): the 720 caps in
-- voucher_queue_done were raised to 1500 on 7 Nov 2026.
