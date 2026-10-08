-- ============================================================
-- CyberHx admin security (run ONCE in Supabase → SQL Editor)
-- Replaces the old "anyone with the anon key can edit" setup with real
-- Supabase Auth + an admins allow-list enforced by Row Level Security.
--
-- BEFORE running: Authentication → Users → "Add user" → create your admin
-- account (email + password, tick "Auto Confirm User").
-- AFTER running:  insert your admin email at the bottom (see STEP 2).
-- ============================================================

-- ─── Admin allow-list ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
-- no policies on purpose: nobody can read/write admins via the API

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ─── Submissions table (created if it only existed in the dashboard) ──
CREATE TABLE IF NOT EXISTS public.article_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_name TEXT NOT NULL,
  author_email TEXT DEFAULT '',
  author_role TEXT DEFAULT 'Contributor',
  cover_image TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Wipe every old policy on these 3 tables, then recreate strict ones ──
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN ('blog_posts','blog_categories','article_submissions')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public.blog_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_submissions  ENABLE ROW LEVEL SECURITY;

-- Public: read published posts + categories only
CREATE POLICY posts_public_read ON public.blog_posts
  FOR SELECT USING (status = 'published');
CREATE POLICY categories_public_read ON public.blog_categories
  FOR SELECT USING (true);

-- Public: may only INSERT a *pending* submission (cannot read, edit, delete)
CREATE POLICY submissions_public_insert ON public.article_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND length(title) BETWEEN 3 AND 300 AND length(content) <= 200000);

-- Admins: everything
CREATE POLICY posts_admin_all ON public.blog_posts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY categories_admin_all ON public.blog_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY submissions_admin_all ON public.article_submissions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─── Approve / reject (admin only, runs with elevated rights) ──
DROP FUNCTION IF EXISTS public.approve_submission(uuid);
DROP FUNCTION IF EXISTS public.reject_submission(uuid);

CREATE FUNCTION public.approve_submission(sub_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.article_submissions%ROWTYPE; new_slug text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO s FROM public.article_submissions WHERE id = sub_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found or already reviewed'; END IF;

  new_slug := trim(both '-' from lower(regexp_replace(s.title, '[^a-zA-Z0-9]+', '-', 'g')))
              || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO public.blog_posts
    (title, slug, excerpt, content, cover_image, category, tags,
     author_name, author_role, read_time, status, published_at)
  VALUES
    (s.title, new_slug, s.excerpt, s.content, coalesce(s.cover_image, ''), s.category, s.tags,
     s.author_name, coalesce(s.author_role, 'Contributor'),
     greatest(1, ceil(array_length(regexp_split_to_array(s.content, '\s+'), 1) / 200.0)::int),
     'published', now());

  UPDATE public.article_submissions SET status = 'approved' WHERE id = sub_id;
END $$;

CREATE FUNCTION public.reject_submission(sub_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.article_submissions SET status = 'rejected' WHERE id = sub_id;
END $$;

REVOKE ALL ON FUNCTION public.approve_submission(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_submission(uuid)  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_submission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_submission(uuid)  TO authenticated;

-- ============================================================
-- STEP 2 — make yourself admin (change the email, run this line):
--
--   INSERT INTO public.admins (user_id)
--   SELECT id FROM auth.users WHERE email = 'you@example.com';
--
-- ============================================================
