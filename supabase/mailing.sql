-- ============================================================
-- Mailing: subscribers, campaigns (event blasts / newsletters / notifications),
-- a send queue, and per-provider daily/monthly usage for the multi-provider router.
-- Run in Supabase -> SQL Editor. Safe to re-run. Needs public.is_admin() (admin_security.sql).
-- ============================================================

-- ---------- Contacts (subscribers + imported lists) ----------
CREATE TABLE IF NOT EXISTS public.mail_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL UNIQUE CHECK (email = lower(email) AND email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' AND length(email) <= 200),
  name            text NOT NULL DEFAULT '' CHECK (length(name) <= 120),
  tags            text[] NOT NULL DEFAULT '{}',
  subscribed      boolean NOT NULL DEFAULT true,
  source          text NOT NULL DEFAULT 'admin' CHECK (length(source) <= 60),
  unsub_token     uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);
CREATE INDEX IF NOT EXISTS mail_contacts_tags_idx ON public.mail_contacts USING gin (tags);
CREATE INDEX IF NOT EXISTS mail_contacts_created_idx ON public.mail_contacts (created_at DESC);

-- ---------- Campaigns ----------
CREATE TABLE IF NOT EXISTS public.mail_campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('event','newsletter','notification')),
  name        text NOT NULL DEFAULT '' CHECK (length(name) <= 160),
  template    text NOT NULL,
  vars        jsonb NOT NULL DEFAULT '{}',
  audience    jsonb NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','paused','done','cancelled')),
  total       int NOT NULL DEFAULT 0,
  sent        int NOT NULL DEFAULT 0,
  failed      int NOT NULL DEFAULT 0,
  skipped     int NOT NULL DEFAULT 0,
  providers   jsonb NOT NULL DEFAULT '{}',
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mail_campaigns_created_idx ON public.mail_campaigns (created_at DESC);

-- ---------- Send queue: one row per recipient per campaign ----------
CREATE TABLE IF NOT EXISTS public.mail_queue (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.mail_campaigns(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text NOT NULL DEFAULT '',
  unsub_token uuid,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  provider    text,
  message_id  text,
  error       text,
  attempts    int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);
CREATE INDEX IF NOT EXISTS mail_queue_campaign_status_idx ON public.mail_queue (campaign_id, status, id);

-- ---------- Provider usage (router quota) ----------
CREATE TABLE IF NOT EXISTS public.mail_usage (
  provider text NOT NULL,
  day      date NOT NULL,
  count    int  NOT NULL DEFAULT 0,
  PRIMARY KEY (provider, day)
);

-- ---------- RLS: admins only (public goes through the functions below) ----------
ALTER TABLE public.mail_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_queue     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_usage     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mail_contacts_admin  ON public.mail_contacts;
DROP POLICY IF EXISTS mail_campaigns_admin ON public.mail_campaigns;
DROP POLICY IF EXISTS mail_queue_admin     ON public.mail_queue;
DROP POLICY IF EXISTS mail_usage_admin     ON public.mail_usage;
CREATE POLICY mail_contacts_admin  ON public.mail_contacts  FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY mail_campaigns_admin ON public.mail_campaigns FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY mail_queue_admin     ON public.mail_queue     FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY mail_usage_admin     ON public.mail_usage     FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

-- ============================================================
-- Public: subscribe / unsubscribe
-- ============================================================
CREATE OR REPLACE FUNCTION public.mail_subscribe(p_email text, p_name text DEFAULT '', p_source text DEFAULT 'website')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e text := lower(trim(coalesce(p_email, '')));
  n text := left(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:],;:<>"\\]+', ' ', 'g')), 120);
  cur mail_contacts%ROWTYPE;
BEGIN
  IF e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR length(e) > 200 THEN RETURN 'invalid'; END IF;
  -- Flood guard: the public form can't add more than 300 people an hour.
  IF (SELECT count(*) FROM mail_contacts WHERE source NOT IN ('admin','import','campaign') AND created_at > now() - interval '1 hour') >= 300 THEN
    RETURN 'busy';
  END IF;
  SELECT * INTO cur FROM mail_contacts WHERE email = e;
  IF FOUND THEN
    -- Someone who unsubscribed is never re-subscribed by a form (only an admin can do that on request).
    IF NOT cur.subscribed AND cur.unsubscribed_at IS NOT NULL THEN RETURN 'unsubscribed'; END IF;
    UPDATE mail_contacts
       SET subscribed = true,
           name = CASE WHEN name = '' THEN n ELSE name END,
           tags = CASE WHEN 'subscriber' = ANY (tags) THEN tags ELSE tags || 'subscriber' END
     WHERE id = cur.id;
    RETURN 'ok';
  END IF;
  INSERT INTO mail_contacts (email, name, source, tags)
  VALUES (e, n, left(coalesce(nullif(regexp_replace(trim(coalesce(p_source, '')), '[^A-Za-z0-9_: -]', '', 'g'), ''), 'website'), 60), ARRAY['subscriber'])
  ON CONFLICT (email) DO NOTHING;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.mail_unsubscribe(p_token uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (
    UPDATE mail_contacts SET subscribed = false, unsubscribed_at = coalesce(unsubscribed_at, now())
    WHERE unsub_token = p_token RETURNING email
  )
  SELECT coalesce((SELECT regexp_replace(email, '^(.)[^@]*', '\1***') FROM u), '');
$$;

REVOKE ALL ON FUNCTION public.mail_subscribe(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mail_unsubscribe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mail_subscribe(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mail_unsubscribe(uuid) TO anon, authenticated;

-- ============================================================
-- Admin: import contacts  rows = [{email, name}], adds p_tags, never re-subscribes someone who opted out
-- ============================================================
CREATE OR REPLACE FUNCTION public.mail_import(p_rows jsonb, p_tags text[] DEFAULT '{}', p_source text DEFAULT 'import')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_new int; n_all int;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  WITH src AS (
    SELECT DISTINCT ON (lower(trim(r->>'email'))) lower(trim(r->>'email')) AS email, left(trim(coalesce(r->>'name', '')), 120) AS name
    FROM jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
    WHERE lower(trim(r->>'email')) ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' AND length(trim(r->>'email')) <= 200
  ), ins AS (
    INSERT INTO mail_contacts (email, name, tags, source)
    SELECT email, name, coalesce(p_tags, '{}'), left(coalesce(nullif(p_source, ''), 'import'), 60) FROM src
    ON CONFLICT (email) DO UPDATE
      SET name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE mail_contacts.name END,
          tags = ARRAY(SELECT DISTINCT unnest(mail_contacts.tags || excluded.tags))
    RETURNING (xmax = 0) AS inserted
  )
  SELECT count(*) FILTER (WHERE inserted), count(*) INTO n_new, n_all FROM ins;
  RETURN jsonb_build_object('added', n_new, 'updated', n_all - n_new);
END $$;

-- ============================================================
-- Admin: create a campaign and fill its queue
--   p_audience = {"type":"all"} (everyone tagged 'subscriber') | {"type":"tag","tag":"ctf-2026"} | {"type":"list","rows":[{email,name}],"tag":"..."}
--   Event blasts and newsletters skip people who unsubscribed. Notifications don't.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mail_create_campaign(p_kind text, p_name text, p_template text, p_vars jsonb, p_audience jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid uuid;
  a_type text := coalesce(p_audience->>'type', 'all');
  a_tag text := nullif(trim(coalesce(p_audience->>'tag', '')), '');
  promo boolean := p_kind <> 'notification';
  n_total int; n_skipped int := 0;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  IF p_kind NOT IN ('event','newsletter','notification') THEN RAISE EXCEPTION 'bad kind'; END IF;

  IF a_type = 'list' THEN
    PERFORM mail_import(p_audience->'rows', CASE WHEN a_tag IS NULL THEN '{}'::text[] ELSE ARRAY[a_tag] END, 'campaign');
  END IF;

  INSERT INTO mail_campaigns (kind, name, template, vars, audience)
  VALUES (p_kind, left(coalesce(p_name, ''), 160), p_template, coalesce(p_vars, '{}'),
          CASE WHEN a_type = 'list' THEN jsonb_build_object('type', 'list', 'tag', a_tag, 'count', jsonb_array_length(coalesce(p_audience->'rows', '[]'::jsonb)))
               ELSE jsonb_build_object('type', a_type, 'tag', a_tag) END)
  RETURNING id INTO cid;

  WITH pick AS (
    SELECT c.email, c.name, c.unsub_token, c.subscribed FROM mail_contacts c
    WHERE CASE a_type
      WHEN 'all'  THEN c.subscribed AND 'subscriber' = ANY (c.tags)
      WHEN 'tag'  THEN a_tag IS NOT NULL AND c.tags @> ARRAY[a_tag]
      WHEN 'list' THEN c.email IN (SELECT lower(trim(r->>'email')) FROM jsonb_array_elements(coalesce(p_audience->'rows', '[]'::jsonb)) r)
      ELSE false END
  ), ins AS (
    INSERT INTO mail_queue (campaign_id, email, name, unsub_token)
    SELECT cid, email, name, unsub_token FROM pick WHERE subscribed OR NOT promo
    ON CONFLICT DO NOTHING RETURNING 1
  )
  SELECT (SELECT count(*) FROM ins), (SELECT count(*) FROM pick WHERE NOT subscribed AND promo) INTO n_total, n_skipped;

  UPDATE mail_campaigns SET total = n_total, skipped = n_skipped, status = CASE WHEN n_total = 0 THEN 'done' ELSE 'sending' END WHERE id = cid;
  RETURN jsonb_build_object('id', cid, 'total', n_total, 'skipped', n_skipped);
END $$;

-- ============================================================
-- Admin: claim the next batch to send (also re-claims rows stuck in 'sending' for 10+ minutes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mail_claim(p_campaign uuid, p_limit int)
RETURNS SETOF public.mail_queue LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  UPDATE mail_queue q SET status = 'sending', updated_at = now(), attempts = q.attempts + 1
  WHERE q.id IN (
    SELECT id FROM mail_queue
    WHERE campaign_id = p_campaign
      AND (status = 'pending' OR (status = 'sending' AND updated_at < now() - interval '10 minutes'))
    ORDER BY id LIMIT least(greatest(p_limit, 1), 200)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.*;
END $$;

-- ============================================================
-- Admin: atomically reserve quota on a provider. Returns how many sends were granted (0..p_want).
--   p_day_limit / p_month_limit: NULL = no limit of that kind. Days/months are UTC.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mail_take_quota(p_provider text, p_want int, p_day_limit int, p_month_limit int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'utc')::date;
  used_day int; used_month int; grant_n int;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  IF p_want <= 0 THEN RETURN 0; END IF;
  INSERT INTO mail_usage (provider, day, count) VALUES (p_provider, today, 0) ON CONFLICT DO NOTHING;
  SELECT count INTO used_day FROM mail_usage WHERE provider = p_provider AND day = today FOR UPDATE;
  SELECT coalesce(sum(count), 0) INTO used_month FROM mail_usage
   WHERE provider = p_provider AND day >= date_trunc('month', today)::date;
  grant_n := p_want;
  IF p_day_limit IS NOT NULL THEN grant_n := least(grant_n, p_day_limit - used_day); END IF;
  IF p_month_limit IS NOT NULL THEN grant_n := least(grant_n, p_month_limit - used_month); END IF;
  grant_n := greatest(grant_n, 0);
  IF grant_n > 0 THEN UPDATE mail_usage SET count = count + grant_n WHERE provider = p_provider AND day = today; END IF;
  RETURN grant_n;
END $$;

-- Give back unused quota (send failed before reaching the provider), or count sends made outside the router (p_n < 0 to add).
CREATE OR REPLACE FUNCTION public.mail_return_quota(p_provider text, p_n int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  INSERT INTO mail_usage (provider, day, count) VALUES (p_provider, today, greatest(-p_n, 0))
  ON CONFLICT (provider, day) DO UPDATE SET count = greatest(mail_usage.count - p_n, 0);
END $$;

-- ============================================================
-- Admin: save send results and refresh the campaign's counters
--   p_results = [{id, status:'sent'|'failed'|'pending', provider, message_id, error}]
-- ============================================================
CREATE OR REPLACE FUNCTION public.mail_finish(p_campaign uuid, p_results jsonb, p_note text DEFAULT NULL, p_pause boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_sent int; n_failed int; n_left int; prov jsonb; st text;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  UPDATE mail_queue q SET
    status = r.status, provider = coalesce(r.provider, q.provider), message_id = r.message_id,
    error = left(r.error, 500), updated_at = now()
  FROM jsonb_to_recordset(coalesce(p_results, '[]'::jsonb)) AS r(id bigint, status text, provider text, message_id text, error text)
  WHERE q.id = r.id AND q.campaign_id = p_campaign AND r.status IN ('sent','failed','pending');

  SELECT count(*) FILTER (WHERE status = 'sent'), count(*) FILTER (WHERE status = 'failed'), count(*) FILTER (WHERE status IN ('pending','sending'))
    INTO n_sent, n_failed, n_left FROM mail_queue WHERE campaign_id = p_campaign;
  SELECT coalesce(jsonb_object_agg(provider, n), '{}') INTO prov FROM (
    SELECT provider, count(*) AS n FROM mail_queue WHERE campaign_id = p_campaign AND status = 'sent' AND provider IS NOT NULL GROUP BY provider
  ) t;

  UPDATE mail_campaigns SET
    sent = n_sent, failed = n_failed, providers = prov, updated_at = now(),
    note = coalesce(p_note, note),
    status = CASE WHEN status = 'cancelled' THEN 'cancelled' WHEN n_left = 0 THEN 'done' WHEN p_pause OR status = 'paused' THEN 'paused' ELSE 'sending' END
  WHERE id = p_campaign RETURNING status INTO st;

  RETURN jsonb_build_object('sent', n_sent, 'failed', n_failed, 'pending', n_left, 'status', st, 'providers', prov);
END $$;

-- Admin: put failed rows back in the queue (retry)
CREATE OR REPLACE FUNCTION public.mail_retry_failed(p_campaign uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  UPDATE mail_queue SET status = 'pending', error = NULL, updated_at = now() WHERE campaign_id = p_campaign AND status = 'failed';
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE mail_campaigns SET status = 'sending', updated_at = now() WHERE id = p_campaign AND n > 0;
  RETURN n;
END $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.mail_import(jsonb, text[], text)',
    'public.mail_create_campaign(text, text, text, jsonb, jsonb)',
    'public.mail_claim(uuid, int)',
    'public.mail_take_quota(text, int, int, int)',
    'public.mail_return_quota(text, int)',
    'public.mail_finish(uuid, jsonb, text, boolean)',
    'public.mail_retry_failed(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;
