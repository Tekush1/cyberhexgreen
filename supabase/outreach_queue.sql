-- ============================================================
-- Outreach mail queue (8 Nov 2026, migration outreach_queue).
-- Pitch emails to leads that go out slowly from the server (pg_cron -> /api/voucher-queue, same minute tick
-- as vouchers), as one outreach person (e.g. yashika@cyberhx.com), exactly like pressing "Email" in Admin -> Outreach:
-- CC + reply-to mail@cyberhx.com, saved in outreach_mails, lead set to Contacted with a follow-up 4 days later.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outreach_queue (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id     uuid REFERENCES public.outreach_leads(id) ON DELETE CASCADE,
  sent_by_id  uuid NOT NULL,
  to_emails   text[] NOT NULL CHECK (cardinality(to_emails) BETWEEN 1 AND 6),
  subject     text NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 8000),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','cancelled')),
  attempts    int NOT NULL DEFAULT 0,
  last_error  text NOT NULL DEFAULT '',
  not_before  timestamptz NOT NULL DEFAULT now(),
  claimed_at  timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS outreach_queue_once ON public.outreach_queue (lead_id) WHERE status IN ('pending','sending','sent');
ALTER TABLE public.outreach_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outreach_queue FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_queue TO authenticated;
CREATE POLICY outreach_queue_owner ON public.outreach_queue FOR ALL TO authenticated
  USING ((SELECT public.staff_role()) = 'owner') WITH CHECK ((SELECT public.staff_role()) = 'owner');

-- Next due pitch(es) with the sender's address. Secret = app_secrets 'inbound' (same as the voucher queue).
CREATE OR REPLACE FUNCTION public.outreach_queue_claim(p_secret text, p_limit int DEFAULT 2)
RETURNS TABLE (id bigint, lead_id uuid, to_emails text[], subject text, body text, attempts int, sent_by_id uuid, from_email text, from_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $f$
BEGIN
  IF p_secret IS NULL OR p_secret IS DISTINCT FROM (SELECT value FROM app_secrets WHERE name = 'inbound') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH c AS (
    UPDATE outreach_queue q SET status = 'sending', claimed_at = now(), attempts = q.attempts + 1
     WHERE q.id IN (SELECT x.id FROM outreach_queue x
                     WHERE (x.status = 'pending' AND x.not_before <= now()) OR (x.status = 'sending' AND x.claimed_at < now() - interval '5 minutes')
                     ORDER BY x.not_before, x.id LIMIT greatest(1, least(coalesce(p_limit, 2), 5)) FOR UPDATE SKIP LOCKED)
    RETURNING q.*)
  SELECT c.id, c.lead_id, c.to_emails, c.subject, c.body, c.attempts, c.sent_by_id, p.send_as, p.name
  FROM c JOIN outreach_people p ON p.user_id = c.sent_by_id;
END $f$;

-- Results: [{id, ok, message_ids[], error, retry_minutes}]
CREATE OR REPLACE FUNCTION public.outreach_queue_done(p_secret text, p_results jsonb)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $f$
DECLARE r jsonb; q outreach_queue; p outreach_people; n int := 0;
BEGIN
  IF p_secret IS NULL OR p_secret IS DISTINCT FROM (SELECT value FROM app_secrets WHERE name = 'inbound') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p_results, '[]')) LOOP
    SELECT * INTO q FROM outreach_queue WHERE outreach_queue.id = (r->>'id')::bigint AND status = 'sending';
    IF NOT FOUND THEN CONTINUE; END IF;
    IF (r->>'ok')::boolean THEN
      SELECT * INTO p FROM outreach_people WHERE user_id = q.sent_by_id;
      UPDATE outreach_queue SET status = 'sent', sent_at = now(), last_error = '' WHERE outreach_queue.id = q.id;
      INSERT INTO outreach_mails (lead_id, to_emails, subject, body, message_ids, provider, from_email, cc_emails, sent_by_id, sent_by)
      VALUES (q.lead_id, q.to_emails, q.subject, q.body, ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'message_ids', '[]'))),
              'mailtrap', p.send_as, '{}', q.sent_by_id, p.name);
      UPDATE outreach_leads SET status = CASE WHEN status = 'todo' THEN 'contacted' ELSE status END,
             last_contacted_at = now(), next_followup = (now() AT TIME ZONE 'Asia/Kolkata')::date + 4, updated_by = p.name, updated_at = now()
       WHERE outreach_leads.id = q.lead_id;
      INSERT INTO mail_usage (provider, day, count) VALUES ('mailtrap', current_date, cardinality(q.to_emails) + 1)
        ON CONFLICT (provider, day) DO UPDATE SET count = mail_usage.count + EXCLUDED.count;
    ELSIF coalesce((r->>'retry_minutes')::int, 0) > 0 AND q.attempts < 8 THEN
      UPDATE outreach_queue SET status = 'pending', not_before = now() + make_interval(mins => least((r->>'retry_minutes')::int, 1500)),
             last_error = left(coalesce(r->>'error', ''), 500) WHERE outreach_queue.id = q.id;
    ELSE
      UPDATE outreach_queue SET status = 'failed', last_error = left(coalesce(r->>'error', 'failed'), 500) WHERE outreach_queue.id = q.id;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $f$;
REVOKE ALL ON FUNCTION public.outreach_queue_claim(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.outreach_queue_done(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.outreach_queue_claim(text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_queue_done(text, jsonb) TO anon, authenticated;

-- The minute tick also wakes up for outreach pitches.
CREATE OR REPLACE FUNCTION public.voucher_queue_tick()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $f$
BEGIN
  IF EXISTS (SELECT 1 FROM voucher_queue WHERE (status = 'pending' AND not_before <= now()) OR (status = 'sending' AND claimed_at < now() - interval '5 minutes'))
     OR EXISTS (SELECT 1 FROM outreach_queue WHERE (status = 'pending' AND not_before <= now()) OR (status = 'sending' AND claimed_at < now() - interval '5 minutes')) THEN
    PERFORM net.http_post(
      url := 'https://cyberhx.com/api/voucher-queue',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-queue-secret', (SELECT value FROM app_secrets WHERE name = 'inbound')),
      body := '{}'::jsonb, timeout_milliseconds := 55000);
  END IF;
END $f$;
REVOKE ALL ON FUNCTION public.voucher_queue_tick() FROM PUBLIC, anon, authenticated;
