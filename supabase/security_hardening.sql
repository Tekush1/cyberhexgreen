-- ============================================================
-- Security hardening (audit 14 Oct 2026). Safe to re-run.
-- ============================================================

-- 1) Storage: the old article-images bucket let ANYONE upload ANY file of ANY size.
--    Nothing on the site uploads there any more: uploads off, limits on (existing images keep working).
DROP POLICY IF EXISTS "public upload images" ON storage.objects;
UPDATE storage.buckets
   SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
 WHERE id = 'article-images';

-- Public buckets serve files by URL without any SELECT policy. These two policies only let
-- strangers LIST every file (incl. uploads from pending submissions), so remove them.
DROP POLICY IF EXISTS "public read images" ON storage.objects;
DROP POLICY IF EXISTS blog_media_public_read ON storage.objects;

-- 2) Public forms can't pre-fill admin-only fields, point at other people's files, or fake the date.
DROP POLICY IF EXISTS ctf_requests_public_insert ON public.ctf_requests;
CREATE POLICY ctf_requests_public_insert ON public.ctf_requests FOR INSERT TO anon, authenticated WITH CHECK (
  status = 'new' AND admin_notes IS NULL
  AND length(name) BETWEEN 2 AND 200 AND length(email) BETWEEN 5 AND 200
  AND coalesce(length(message), 0) <= 10000 AND coalesce(length(requirements), 0) <= 10000
  AND coalesce(length(order_items), 0) <= 10000
  AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes'
);

DROP POLICY IF EXISTS job_applications_public_insert ON public.job_applications;
CREATE POLICY job_applications_public_insert ON public.job_applications FOR INSERT TO anon, authenticated WITH CHECK (
  status = 'new' AND admin_notes IS NULL
  AND length(full_name) BETWEEN 2 AND 200 AND length(email) BETWEEN 5 AND 200
  AND coalesce(length(motivation), 0) <= 10000
  AND (coalesce(resume_path, '') = '' OR resume_path LIKE 'resumes/%')
  AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes'
);

DROP POLICY IF EXISTS form_submissions_public_insert ON public.form_submissions;
CREATE POLICY form_submissions_public_insert ON public.form_submissions FOR INSERT TO anon, authenticated WITH CHECK (
  status = 'new' AND admin_notes IS NULL
  AND length(name) BETWEEN 2 AND 200 AND length(email) BETWEEN 5 AND 200
  AND email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  AND coalesce(length(subject), 0) <= 300 AND coalesce(length(message), 0) <= 10000
  AND coalesce(length(phone), 0) <= 40 AND coalesce(length(page), 0) <= 300
  AND pg_column_size(data) <= 20000
  AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes'
);

-- Blog submissions: images must be https links and the date can't be faked.
DROP POLICY IF EXISTS submissions_public_insert ON public.article_submissions;
CREATE POLICY submissions_public_insert ON public.article_submissions FOR INSERT TO anon, authenticated WITH CHECK (
  status = 'pending'
  AND length(title) BETWEEN 3 AND 300 AND length(content) <= 200000
  AND coalesce(length(author_name), 0) <= 120 AND coalesce(length(excerpt), 0) <= 1000
  AND (coalesce(cover_image, '') = '' OR cover_image ~ '^https://[^[:space:]"''<>]+$')
  AND (coalesce(author_avatar, '') = '' OR author_avatar ~ '^https://[^[:space:]"''<>]+$')
  AND submitted_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes'
);

-- 3) Functions flagged by the Supabase security advisor
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;  -- event trigger only, nobody should call it
ALTER FUNCTION public.update_updated_at() SET search_path = public;
