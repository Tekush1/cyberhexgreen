-- ============================================================
-- Security hardening (audit 14 Oct 2026). ALREADY APPLIED to the live database. Safe to re-run.
-- Uses ALTER POLICY (tighten in place) instead of DROP.
-- ============================================================

-- 1) Storage: the old article-images bucket let ANYONE upload ANY file of ANY size. Uploads off, limits on.
ALTER POLICY "public upload images" ON storage.objects WITH CHECK (false);
UPDATE storage.buckets
   SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
 WHERE id = 'article-images';
-- Public buckets serve files by URL without a SELECT policy; these only let strangers LIST every file.
ALTER POLICY "public read images" ON storage.objects USING (false);
ALTER POLICY blog_media_public_read ON storage.objects USING (false);

-- 2) Public forms can't pre-fill admin-only fields, point at other files, or fake the date.
ALTER POLICY ctf_requests_public_insert ON public.ctf_requests WITH CHECK (
  status = 'new' AND admin_notes IS NULL
  AND length(name) BETWEEN 2 AND 200 AND length(email) BETWEEN 5 AND 200
  AND coalesce(length(message), 0) <= 10000 AND coalesce(length(requirements), 0) <= 10000
  AND coalesce(length(order_items), 0) <= 10000
  AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes'
);
ALTER POLICY job_applications_public_insert ON public.job_applications WITH CHECK (
  status = 'new' AND admin_notes IS NULL
  AND length(full_name) BETWEEN 2 AND 200 AND length(email) BETWEEN 5 AND 200
  AND coalesce(length(motivation), 0) <= 10000
  AND (coalesce(resume_path, '') = '' OR resume_path LIKE 'resumes/%')
  AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes'
);
ALTER POLICY form_submissions_public_insert ON public.form_submissions WITH CHECK (
  status = 'new' AND admin_notes IS NULL
  AND length(name) BETWEEN 2 AND 200 AND length(email) BETWEEN 5 AND 200
  AND email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  AND coalesce(length(subject), 0) <= 300 AND coalesce(length(message), 0) <= 10000
  AND coalesce(length(phone), 0) <= 40 AND coalesce(length(page), 0) <= 300
  AND pg_column_size(data) <= 20000
  AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes'
);
ALTER POLICY submissions_public_insert ON public.article_submissions WITH CHECK (
  status = 'pending'
  AND length(title) BETWEEN 3 AND 300 AND length(content) <= 200000
  AND coalesce(length(author_name), 0) <= 120 AND coalesce(length(excerpt), 0) <= 1000
  AND (coalesce(cover_image, '') = '' OR cover_image ~ '^https://[^[:space:]"''<>]+$')
  AND (coalesce(author_avatar, '') = '' OR author_avatar ~ '^https://[^[:space:]"''<>]+$')
  AND submitted_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes'
);

-- 3) Functions flagged by the Supabase security advisor
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
DO $$ BEGIN
  IF to_regprocedure('public.store_approve_host(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.store_approve_host(uuid) FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.store_guard_listing_status() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.store_has_role(uuid, public.store_role) FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.toggle_post_like(uuid, text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.toggle_post_like(uuid, text) FROM PUBLIC, anon, authenticated;
    ALTER FUNCTION public.toggle_post_like(uuid, text) SET search_path = public;
  END IF;
END $$;
