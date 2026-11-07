-- ============================================================
-- Vouchers v2 (7 Nov 2026, migration voucher_system_v2).
-- Every email the Vouchers tab sends is a record in voucher_queue; every "Queue" press is a batch (voucher_batches).
--   History tab  = batches + records (search, filter, stop, resume, retry, send again, delete, export)
--   Duplicates   = one email + code + kind is sent once, unless someone presses "Send again" (copy = 1, 2, …)
--   Old sends    = emails sent before the queue existed were imported from mail_log as sent records.
-- Sending itself is unchanged: supabase/voucher_queue.sql (pg_cron -> /api/voucher-queue, ~5 a minute).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.voucher_batches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid REFERENCES public.voucher_events(id) ON DELETE SET NULL,
  event_name  text NOT NULL DEFAULT '' CHECK (length(event_name) <= 80),
  kind        text NOT NULL DEFAULT 'rank' CHECK (kind IN ('rank','one','special','imported')),
  label       text NOT NULL DEFAULT '' CHECK (length(label) <= 120),
  via         text NOT NULL DEFAULT '' CHECK (length(via) <= 20),
  created_by  text NOT NULL DEFAULT coalesce(auth.jwt()->>'email', ''),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voucher_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voucher_batches FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voucher_batches TO authenticated;
CREATE POLICY voucher_batches_staff ON public.voucher_batches FOR ALL TO authenticated
  USING ((SELECT public.can('ctf')) OR (SELECT public.can('emails')))
  WITH CHECK ((SELECT public.can('ctf')) OR (SELECT public.can('emails')));

ALTER TABLE public.voucher_queue
  ADD COLUMN IF NOT EXISTS batch_id   uuid REFERENCES public.voucher_batches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS copy       int  NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS voucher_queue_batch ON public.voucher_queue (batch_id, status);
CREATE INDEX IF NOT EXISTS voucher_queue_email ON public.voucher_queue (email);
DROP INDEX IF EXISTS public.voucher_queue_once;
CREATE UNIQUE INDEX voucher_queue_once ON public.voucher_queue (email, ((vars->>'code')), kind, copy)
  WHERE status IN ('pending','sending','sent');

-- ---------- Backfill 1: queue rows that existed before batches ----------
DO $$ DECLARE g record; b uuid; BEGIN
  FOR g IN SELECT q.event_id, q.kind, min(q.created_at) AS at, coalesce(e.name, '') AS ename, min(q.via) AS via
           FROM voucher_queue q LEFT JOIN voucher_events e ON e.id = q.event_id
           WHERE q.batch_id IS NULL GROUP BY q.event_id, q.kind, e.name LOOP
    INSERT INTO voucher_batches (event_id, event_name, kind, label, via, created_by, created_at)
    VALUES (g.event_id, g.ename, g.kind, CASE g.kind WHEN 'special' THEN 'Special discount' ELSE 'Leaderboard' END, g.via, '', g.at)
    RETURNING id INTO b;
    UPDATE voucher_queue SET batch_id = b, event_name = g.ename
     WHERE batch_id IS NULL AND kind = g.kind AND event_id IS NOT DISTINCT FROM g.event_id;
  END LOOP;
END $$;

-- ---------- Backfill 2: voucher emails sent before the queue (from mail_log) ----------
DO $$ DECLARE g record; b uuid; BEGIN
  CREATE TEMP TABLE old_sends ON COMMIT DROP AS
  SELECT l.id, lower(l.email) AS email, l.created_at, l.provider, l.subject,
         CASE WHEN l.subject ILIKE '%pentest lab%' THEN 'special' ELSE 'rank' END AS kind,
         coalesce(substring(l.body from 'Your voucher code:\s*([A-Za-z0-9_-]+)'), '') AS code,
         left(coalesce(substring(l.body from 'Hi ([^,\n]{1,80}),'), ''), 80) AS name,
         CASE WHEN l.subject ILIKE '%pentest lab%' THEN ''
              ELSE coalesce(substring(l.subject from ' at (.+?)(?::|\s\(|$)'), '') END AS ename
  FROM mail_log l WHERE l.template = 'team_voucher';
  DELETE FROM old_sends o WHERE o.code = '' OR EXISTS (
    SELECT 1 FROM voucher_queue q WHERE q.email = o.email AND q.vars->>'code' = o.code AND q.kind = o.kind AND q.status = 'sent'
      AND abs(extract(epoch FROM (q.sent_at - o.created_at))) < 120);
  FOR g IN SELECT kind, ename, min(created_at) AS at FROM old_sends GROUP BY kind, ename LOOP
    INSERT INTO voucher_batches (event_id, event_name, kind, label, via, created_by, created_at)
    VALUES ((SELECT id FROM voucher_events WHERE name = g.ename LIMIT 1),
            CASE WHEN g.kind = 'special' THEN coalesce((SELECT event_name FROM voucher_batches WHERE kind = 'special' AND event_name <> '' LIMIT 1), '') ELSE g.ename END,
            'imported', CASE g.kind WHEN 'special' THEN 'Special discount · sent before the queue' ELSE 'Leaderboard · sent before the queue' END,
            '', '', g.at)
    RETURNING id INTO b;
    INSERT INTO voucher_queue (batch_id, event_id, event_name, kind, email, name, vars, via, status, provider, attempts, created_at, sent_at, not_before, copy)
    SELECT b, (SELECT event_id FROM voucher_batches WHERE id = b), (SELECT event_name FROM voucher_batches WHERE id = b), o.kind, o.email, o.name,
           jsonb_build_object('team', o.name, 'code', o.code), 'mail', 'sent', o.provider, 1, o.created_at, o.created_at, o.created_at,
           (row_number() OVER (PARTITION BY o.email, o.code, o.kind ORDER BY o.created_at) - 1)
             + coalesce((SELECT max(q.copy) + 1 FROM voucher_queue q WHERE q.email = o.email AND q.vars->>'code' = o.code AND q.kind = o.kind), 0)
    FROM old_sends o WHERE o.kind = g.kind AND o.ename = g.ename
    ORDER BY o.created_at;
  END LOOP;
END $$;

-- ---------- Batch totals for the History tab ----------
CREATE OR REPLACE VIEW public.voucher_batch_stats WITH (security_invoker = true) AS
SELECT b.*,
  count(q.id)                                            AS total,
  count(q.id) FILTER (WHERE q.status IN ('pending','sending')) AS waiting,
  count(q.id) FILTER (WHERE q.status = 'sent')           AS sent,
  count(q.id) FILTER (WHERE q.status = 'failed')         AS failed,
  count(q.id) FILTER (WHERE q.status = 'cancelled')      AS stopped,
  max(q.sent_at)                                         AS last_sent_at,
  min(q.not_before) FILTER (WHERE q.status = 'pending')  AS next_try
FROM voucher_batches b LEFT JOIN voucher_queue q ON q.batch_id = b.id
GROUP BY b.id;
GRANT SELECT ON public.voucher_batch_stats TO authenticated;

-- ---------- Queue a batch (runs as the signed-in staff member; RLS applies) ----------
-- p_batch: {event_id, event_name, kind, label, via, again}
-- p_rows : [{email, name, kind, vars, shared}]
-- Returns {batch_id, added, skipped: [emails already waiting or sent with that code]}.
-- again = true sends a fresh copy even to people who already got it (the "Send again" button).
CREATE OR REPLACE FUNCTION public.voucher_send_create(p_batch jsonb, p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $f$
DECLARE b uuid; n int; again boolean := coalesce((p_batch->>'again')::boolean, false); sk jsonb;
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'Nothing to send.' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_array_length(p_rows) > 5000 THEN
    RAISE EXCEPTION 'Send at most 5000 emails at a time.' USING ERRCODE = 'P0001';
  END IF;
  IF coalesce(p_batch->>'via', '') ~ '^resend' THEN
    RAISE EXCEPTION 'Vouchers never go through Resend (its limit is kept for PentestLab).' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO voucher_batches (event_id, event_name, kind, label, via)
  VALUES (nullif(p_batch->>'event_id','')::uuid, left(coalesce(p_batch->>'event_name',''), 80),
          coalesce(p_batch->>'kind','rank'), left(coalesce(p_batch->>'label',''), 120), left(coalesce(p_batch->>'via','auto'), 20))
  RETURNING id INTO b;

  CREATE TEMP TABLE IF NOT EXISTS _vin (email text, name text, kind text, vars jsonb, shared jsonb) ON COMMIT DROP;
  TRUNCATE _vin;
  INSERT INTO _vin
  SELECT DISTINCT ON (lower(trim(r->>'email')), r->'vars'->>'code')
         lower(trim(r->>'email')), left(coalesce(r->>'name',''), 120), coalesce(r->>'kind','rank'), coalesce(r->'vars','{}'), coalesce(r->'shared','{}')
  FROM jsonb_array_elements(p_rows) r WHERE coalesce(r->>'email','') <> '';

  SELECT coalesce(jsonb_agg(i.email), '[]') INTO sk FROM _vin i
   WHERE NOT again AND EXISTS (SELECT 1 FROM voucher_queue q WHERE q.email = i.email AND q.vars->>'code' = i.vars->>'code'
                                AND q.kind = i.kind AND q.status IN ('pending','sending','sent'));

  WITH ins AS (
    INSERT INTO voucher_queue (batch_id, event_id, event_name, kind, email, name, vars, shared, via, not_before, copy)
    SELECT b, nullif(p_batch->>'event_id','')::uuid, left(coalesce(p_batch->>'event_name',''), 80), i.kind, i.email, i.name, i.vars, i.shared,
           left(coalesce(p_batch->>'via','auto'), 20), now(),
           CASE WHEN again THEN coalesce((SELECT max(q.copy) + 1 FROM voucher_queue q WHERE q.email = i.email AND q.vars->>'code' = i.vars->>'code' AND q.kind = i.kind), 0) ELSE 0 END
    FROM _vin i
    ON CONFLICT DO NOTHING
    RETURNING 1)
  SELECT count(*) INTO n FROM ins;

  IF n = 0 THEN DELETE FROM voucher_batches WHERE id = b; b := NULL; END IF;
  RETURN jsonb_build_object('batch_id', b, 'added', n, 'skipped', sk);
END $f$;
REVOKE ALL ON FUNCTION public.voucher_send_create(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.voucher_send_create(jsonb, jsonb) TO authenticated;

-- ---------- Who already got a voucher? (preview before queueing) ----------
CREATE OR REPLACE FUNCTION public.voucher_sent_lookup(p_emails text[])
RETURNS TABLE (email text, code text, kind text, status text, sent_at timestamptz, event_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $f$
  SELECT DISTINCT ON (q.email, q.vars->>'code', q.kind) q.email, q.vars->>'code', q.kind, q.status, q.sent_at, q.event_name
  FROM voucher_queue q
  WHERE q.email = ANY (SELECT lower(trim(x)) FROM unnest(p_emails) x) AND q.status IN ('pending','sending','sent')
  ORDER BY q.email, q.vars->>'code', q.kind, (q.status = 'sent') DESC, q.sent_at DESC NULLS LAST;
$f$;
REVOKE ALL ON FUNCTION public.voucher_sent_lookup(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.voucher_sent_lookup(text[]) TO authenticated;

-- After the backfill (7 Nov 2026): batches without an event were named 'CyberHx Pentest Lab' (the special discount),
-- and two test sends to an event called "o" were labelled as test sends.

-- ---------- Stop / retry / delete records (History tab), one by one so a duplicate never blocks the rest ----------
-- p_action: 'stop' (waiting -> stopped), 'retry' (failed or stopped -> waiting), 'delete' (remove the record).
-- Pick rows with p_ids, or a whole batch with p_batch. Returns {changed, skipped}.
CREATE OR REPLACE FUNCTION public.voucher_records_action(p_action text, p_ids bigint[] DEFAULT NULL, p_batch uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $f$
DECLARE r voucher_queue; changed int := 0; skipped int := 0;
BEGIN
  IF p_action NOT IN ('stop','retry','delete') THEN RAISE EXCEPTION 'Unknown action.' USING ERRCODE = 'P0001'; END IF;
  IF p_ids IS NULL AND p_batch IS NULL THEN RAISE EXCEPTION 'Pick some records first.' USING ERRCODE = 'P0001'; END IF;
  FOR r IN SELECT * FROM voucher_queue
            WHERE (p_ids IS NULL OR id = ANY (p_ids)) AND (p_batch IS NULL OR batch_id = p_batch) ORDER BY id LOOP
    IF p_action = 'stop' THEN
      IF r.status = 'pending' THEN UPDATE voucher_queue SET status = 'cancelled' WHERE id = r.id; changed := changed + 1; ELSE skipped := skipped + 1; END IF;
    ELSIF p_action = 'retry' THEN
      IF r.status IN ('failed','cancelled') AND NOT EXISTS (
           SELECT 1 FROM voucher_queue d WHERE d.id <> r.id AND d.email = r.email AND d.vars->>'code' = r.vars->>'code'
             AND d.kind = r.kind AND d.copy = r.copy AND d.status IN ('pending','sending','sent')) THEN
        UPDATE voucher_queue SET status = 'pending', attempts = 0, not_before = now(), last_error = '' WHERE id = r.id;
        changed := changed + 1;
      ELSE skipped := skipped + 1; END IF;
    ELSE
      IF r.status <> 'sending' THEN DELETE FROM voucher_queue WHERE id = r.id; changed := changed + 1; ELSE skipped := skipped + 1; END IF;
    END IF;
  END LOOP;
  IF p_action = 'delete' THEN
    -- A batch with no records left has nothing to show.
    DELETE FROM voucher_batches b WHERE NOT EXISTS (SELECT 1 FROM voucher_queue q WHERE q.batch_id = b.id);
  END IF;
  RETURN jsonb_build_object('changed', changed, 'skipped', skipped);
END $f$;
REVOKE ALL ON FUNCTION public.voucher_records_action(text, bigint[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.voucher_records_action(text, bigint[], uuid) TO authenticated;

-- Staff can lift a mail service's rest early (Admin -> Vouchers -> Mail services -> "Try it again now").
GRANT DELETE ON public.mail_provider_rest TO authenticated;
CREATE POLICY mail_provider_rest_staff_delete ON public.mail_provider_rest FOR DELETE TO authenticated
  USING ((SELECT public.can('ctf')) OR (SELECT public.can('emails')));
