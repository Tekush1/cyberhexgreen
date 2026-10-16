-- ============================================================
-- Team roles for the admin panel: owner, hr, campaign (campaigns + newsletter), event.
-- Owners = everyone in public.admins (+ anyone given the 'owner' role here).
-- Every table policy checks public.can('<area>'), so a role only reaches its own data.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_roles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL CHECK (role IN ('owner','hr','campaign','event','none')),  -- 'none' = access removed
  added_by   uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;  -- no policies: only the functions below touch it

CREATE OR REPLACE FUNCTION public.staff_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) THEN 'owner'
              ELSE (SELECT nullif(role, 'none') FROM admin_roles WHERE user_id = auth.uid()) END;
$$;

-- Which role may use which part of the admin panel.
CREATE OR REPLACE FUNCTION public.can(p_area text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE staff_role()
    WHEN 'owner'    THEN true
    WHEN 'hr'       THEN p_area IN ('applications','meetings','availability','emails')
    WHEN 'campaign' THEN p_area IN ('campaigns','subscribers','blog')
    WHEN 'event'    THEN p_area IN ('ctf','inbox','meetings','campaigns','payments')
    ELSE false END;
$$;

-- "Is this person staff at all" (used by the API before the per-area check).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT staff_role() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.staff_me()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('role', staff_role(), 'email', (SELECT email FROM auth.users WHERE id = auth.uid()));
$$;

CREATE OR REPLACE FUNCTION public.staff_list()
RETURNS TABLE (user_id uuid, email text, role text, created_at timestamptz, fixed boolean, last_sign_in timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF staff_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Only owners can manage the team' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT a.user_id, u.email::text, 'owner'::text, a.created_at, true, u.last_sign_in_at
      FROM admins a JOIN auth.users u ON u.id = a.user_id
    UNION ALL
    SELECT r.user_id, coalesce(u.email::text, r.email), r.role, r.created_at, false, u.last_sign_in_at
      FROM admin_roles r LEFT JOIN auth.users u ON u.id = r.user_id
     WHERE r.role <> 'none' AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.user_id = r.user_id)
    ORDER BY 4;
END $$;

CREATE OR REPLACE FUNCTION public.staff_set(p_email text, p_role text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid; e text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF staff_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Only owners can manage the team' USING ERRCODE = '42501'; END IF;
  IF p_role NOT IN ('owner','hr','campaign','event') THEN RAISE EXCEPTION 'Unknown role'; END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = e LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No login exists for %. Create it first in Supabase -> Authentication -> Add user (tick Auto Confirm), then add the role here.', e USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM admins WHERE user_id = uid) THEN RAISE EXCEPTION '% is a main owner already.', e; END IF;
  INSERT INTO admin_roles (user_id, email, role, added_by) VALUES (uid, e, p_role, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET role = excluded.role, email = excluded.email;
  RETURN jsonb_build_object('user_id', uid, 'email', e, 'role', p_role);
END $$;

CREATE OR REPLACE FUNCTION public.staff_remove(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF staff_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Only owners can manage the team' USING ERRCODE = '42501'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'You cannot remove yourself.'; END IF;
  UPDATE admin_roles SET role = 'none' WHERE user_id = p_user;  -- keeps history, removes all access
END $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.staff_role()','public.can(text)','public.staff_me()','public.staff_list()','public.staff_set(text, text)','public.staff_remove(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

-- ---------- Table rules: each area only for its roles ----------
ALTER POLICY submissions_admin_all  ON public.article_submissions USING ((SELECT public.can('blog'))) WITH CHECK ((SELECT public.can('blog')));
ALTER POLICY categories_admin_all   ON public.blog_categories     USING ((SELECT public.can('blog'))) WITH CHECK ((SELECT public.can('blog')));
ALTER POLICY posts_admin_all        ON public.blog_posts          USING ((SELECT public.can('blog'))) WITH CHECK ((SELECT public.can('blog')));
ALTER POLICY ctf_requests_admin_all ON public.ctf_requests        USING ((SELECT public.can('ctf'))) WITH CHECK ((SELECT public.can('ctf')));
ALTER POLICY form_submissions_admin_all ON public.form_submissions USING ((SELECT public.can('inbox'))) WITH CHECK ((SELECT public.can('inbox')));
ALTER POLICY job_applications_admin_all ON public.job_applications USING ((SELECT public.can('applications'))) WITH CHECK ((SELECT public.can('applications')));
ALTER POLICY availability_admin_write ON public.meeting_availability USING ((SELECT public.can('availability'))) WITH CHECK ((SELECT public.can('availability')));
ALTER POLICY meeting_links_admin    ON public.meeting_links       USING ((SELECT public.can('meetings'))) WITH CHECK ((SELECT public.can('meetings')));
ALTER POLICY mail_campaigns_admin   ON public.mail_campaigns      USING ((SELECT public.can('campaigns'))) WITH CHECK ((SELECT public.can('campaigns')));
ALTER POLICY mail_queue_admin       ON public.mail_queue          USING ((SELECT public.can('campaigns'))) WITH CHECK ((SELECT public.can('campaigns')));
ALTER POLICY mail_drafts_admin      ON public.mail_drafts         USING ((SELECT public.can('campaigns'))) WITH CHECK ((SELECT public.can('campaigns')));
ALTER POLICY mail_contacts_admin    ON public.mail_contacts       USING ((SELECT public.can('campaigns') OR public.can('subscribers'))) WITH CHECK ((SELECT public.can('campaigns') OR public.can('subscribers')));
ALTER POLICY mail_usage_admin       ON public.mail_usage          USING ((SELECT public.can('campaigns') OR public.can('emails') OR public.can('meetings')));
ALTER POLICY mail_log_admin         ON public.mail_log            USING ((SELECT public.can('meetings') OR public.can('emails') OR public.can('campaigns'))) WITH CHECK ((SELECT public.can('meetings') OR public.can('emails') OR public.can('campaigns')));
ALTER POLICY applications_admin_all ON storage.objects USING (bucket_id = 'applications' AND (SELECT public.can('applications'))) WITH CHECK (bucket_id = 'applications' AND (SELECT public.can('applications')));
ALTER POLICY blog_media_admin_all   ON storage.objects USING (bucket_id = 'blog-media' AND (SELECT public.can('blog'))) WITH CHECK (bucket_id = 'blog-media' AND (SELECT public.can('blog')));

-- ---------- Functions: same areas ----------
CREATE OR REPLACE FUNCTION public.approve_submission(sub_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE s public.article_submissions%ROWTYPE; new_slug text;
BEGIN
  IF NOT public.can('blog') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO s FROM public.article_submissions WHERE id = sub_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found or already reviewed'; END IF;
  new_slug := trim(both '-' from lower(regexp_replace(s.title, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || substr(md5(random()::text), 1, 6);
  INSERT INTO public.blog_posts
    (title, slug, excerpt, content, cover_image, category, tags, author_name, author_avatar, author_role, read_time, status, published_at)
  VALUES
    (s.title, new_slug, s.excerpt, s.content, coalesce(s.cover_image, ''), s.category, s.tags,
     s.author_name, coalesce(s.author_avatar, ''), coalesce(s.author_role, 'Contributor'),
     greatest(1, ceil(array_length(regexp_split_to_array(s.content, '\s+'), 1) / 200.0)::int), 'published', now());
  UPDATE public.article_submissions SET status = 'approved' WHERE id = sub_id;
END $function$;

CREATE OR REPLACE FUNCTION public.reject_submission(sub_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.can('blog') THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.article_submissions SET status = 'rejected' WHERE id = sub_id;
END $function$;

CREATE OR REPLACE FUNCTION public.mail_create_campaign(p_kind text, p_name text, p_template text, p_vars jsonb, p_audience jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid uuid;
  a_type text := coalesce(p_audience->>'type', 'all');
  a_tag text := nullif(trim(coalesce(p_audience->>'tag', '')), '');
  promo boolean := p_kind <> 'notification';
  n_total int; n_skipped int := 0;
BEGIN
  IF NOT can('campaigns') THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
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

CREATE OR REPLACE FUNCTION public.mail_claim(p_campaign uuid, p_limit int)
RETURNS SETOF public.mail_queue LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can('campaigns') THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
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

CREATE OR REPLACE FUNCTION public.mail_finish(p_campaign uuid, p_results jsonb, p_note text DEFAULT NULL, p_pause boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_sent int; n_failed int; n_left int; prov jsonb; st text;
BEGIN
  IF NOT can('campaigns') THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
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

CREATE OR REPLACE FUNCTION public.mail_retry_failed(p_campaign uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT can('campaigns') THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  UPDATE mail_queue SET status = 'pending', error = NULL, updated_at = now() WHERE campaign_id = p_campaign AND status = 'failed';
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE mail_campaigns SET status = 'sending', updated_at = now() WHERE id = p_campaign AND n > 0;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.mail_import(p_rows jsonb, p_tags text[] DEFAULT '{}', p_source text DEFAULT 'import')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_new int; n_all int;
BEGIN
  IF NOT (can('campaigns') OR can('subscribers')) THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
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
