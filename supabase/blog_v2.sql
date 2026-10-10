-- ============================================================
-- CyberHx Blog v2 (run in Supabase → SQL Editor → New query → Run)
--
-- Safe to run more than once. Order, if starting from scratch:
--   1. supabase/migrations.sql      (blog tables + categories)
--   2. supabase/admin_security.sql  (admins allow-list, is_admin(), RLS)
--   3. this file                    (image storage, likes, fixes)
--
-- What this adds:
--   • "blog-media" storage bucket for cover and inline images (and PDFs)
--   • Community writers may upload only into submissions/, max 8 MB
--   • Admins may upload, replace and delete anywhere in the bucket
--   • like_post() and a safer increment_post_views()
--   • avatar column on submissions so approved posts keep the writer's photo
-- ============================================================

-- ─── Columns used by the new editor ──────────────────────────
ALTER TABLE public.article_submissions ADD COLUMN IF NOT EXISTS author_avatar TEXT DEFAULT '';
ALTER TABLE public.blog_posts          ADD COLUMN IF NOT EXISTS author_avatar TEXT NOT NULL DEFAULT '';

-- Public readers must never see a writer's email: it lives only in article_submissions,
-- which the public cannot read (see admin_security.sql).

-- ─── Views: only count published posts ─────────────────────
CREATE OR REPLACE FUNCTION public.increment_post_views(post_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.blog_posts SET views = views + 1
  WHERE id = post_id AND status = 'published';
$$;
REVOKE ALL ON FUNCTION public.increment_post_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO anon, authenticated;

-- ─── Likes: +1 or -1, never below zero, published posts only ─
CREATE OR REPLACE FUNCTION public.like_post(post_id uuid, delta int DEFAULT 1)
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.blog_posts
     SET likes = greatest(0, likes + CASE WHEN delta < 0 THEN -1 ELSE 1 END)
   WHERE id = post_id AND status = 'published'
  RETURNING likes;
$$;
REVOKE ALL ON FUNCTION public.like_post(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.like_post(uuid, int) TO anon, authenticated;

-- ─── Approving a submission keeps the avatar too ─────────────
CREATE OR REPLACE FUNCTION public.approve_submission(sub_id uuid)
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
     author_name, author_avatar, author_role, read_time, status, published_at)
  VALUES
    (s.title, new_slug, s.excerpt, s.content, coalesce(s.cover_image, ''), s.category, s.tags,
     s.author_name, coalesce(s.author_avatar, ''), coalesce(s.author_role, 'Contributor'),
     greatest(1, ceil(array_length(regexp_split_to_array(s.content, '\s+'), 1) / 200.0)::int),
     'published', now());

  UPDATE public.article_submissions SET status = 'approved' WHERE id = sub_id;
END $$;
REVOKE ALL ON FUNCTION public.approve_submission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_submission(uuid) TO authenticated;

-- ─── Storage bucket for blog media ───────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media', 'blog-media', true, 8388608,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS blog_media_public_read      ON storage.objects;
DROP POLICY IF EXISTS blog_media_submission_upload ON storage.objects;
DROP POLICY IF EXISTS blog_media_admin_all         ON storage.objects;

-- Anyone can view files (the bucket is public, this covers listing via the API too)
CREATE POLICY blog_media_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-media');

-- Community writers: upload new files into submissions/ only (no overwrite, no delete)
CREATE POLICY blog_media_submission_upload ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'blog-media' AND (storage.foldername(name))[1] = 'submissions');

-- Admins: everything inside the bucket
CREATE POLICY blog_media_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'blog-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'blog-media' AND public.is_admin());

-- ─── Default categories (kept if they already exist) ─────────
INSERT INTO public.blog_categories (name, slug, description) VALUES
  ('Scam Alert',         'scam-alert',         'Latest scam warnings and phishing campaigns'),
  ('Malware Analysis',   'malware-analysis',   'Deep dives into malware samples'),
  ('Fraud Investigation','fraud-investigation','Investigations into fraud rings'),
  ('Social Engineering', 'social-engineering', 'Manipulation tactics and awareness'),
  ('Web Security',       'web-security',       'Web vulnerabilities and bug bounty findings'),
  ('Mobile Security',    'mobile-security',    'Android and iOS threats'),
  ('CTF Writeups',       'ctf-writeups',       'Capture the flag challenge solutions'),
  ('Tutorials',          'tutorials',          'Step-by-step guides'),
  ('News & Updates',     'news-updates',       'CyberHx announcements')
ON CONFLICT (slug) DO NOTHING;
