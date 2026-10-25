-- ============================================================
-- CyberHx Blog v3 (run after blog_v2.sql). Safe to run more than once.
--   • read_time is always worked out from the post text (200 words a minute)
--   • author pages: author_slug, author_bio, author_url + the public view blog_authors
--   • CTF write-ups: difficulty, and event_slug to tie a post to an event page (/events/<slug>)
--   • blog_category_counts: categories that actually have posts (for the filter chips)
--   • approve_submission() copies the new fields
-- ============================================================

-- ─── New columns ───────────────────────────────────────────
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS author_bio text NOT NULL DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS author_url text NOT NULL DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS event_slug text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS author_slug text
  GENERATED ALWAYS AS (nullif(trim(both '-' from regexp_replace(lower(coalesce(author_name, '')), '[^a-z0-9]+', '-', 'g')), '')) STORED;

ALTER TABLE public.article_submissions ADD COLUMN IF NOT EXISTS author_bio text NOT NULL DEFAULT '';
ALTER TABLE public.article_submissions ADD COLUMN IF NOT EXISTS author_url text NOT NULL DEFAULT '';
ALTER TABLE public.article_submissions ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE public.article_submissions ADD COLUMN IF NOT EXISTS event_slug text;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['blog_posts', 'article_submissions'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_v3_check') THEN
      EXECUTE format($f$ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
        length(author_bio) <= 300
        AND (author_url = '' OR author_url ~ '^https://[^[:space:]"''<>]{3,300}$')
        AND (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard', 'insane'))
        AND (event_slug IS NULL OR event_slug ~ '^[a-z0-9-]{1,60}$'))$f$, t, t || '_v3_check');
    END IF;
  END LOOP;
END $$;

GRANT INSERT (author_bio, author_url, difficulty, event_slug) ON public.article_submissions TO anon, authenticated;

CREATE INDEX IF NOT EXISTS blog_posts_author_slug_idx ON public.blog_posts (author_slug) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS blog_posts_event_slug_idx ON public.blog_posts (event_slug) WHERE status = 'published';

-- ─── Read time from the text, never typed in ───────────────
CREATE OR REPLACE FUNCTION public.blog_read_time()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.read_time := greatest(1, round((
    SELECT count(*) FROM regexp_matches(regexp_replace(coalesce(NEW.content, ''), '```.*?```', ' ', 'g'), '\S+', 'g')
  )::numeric / 200))::int;
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER trg_blog_read_time BEFORE INSERT OR UPDATE OF content, read_time ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.blog_read_time();

-- ─── Writers (only published posts count) ──────────────────
CREATE OR REPLACE VIEW public.blog_authors WITH (security_invoker = true) AS
SELECT author_slug AS slug,
       (array_agg(author_name ORDER BY published_at DESC NULLS LAST))[1] AS name,
       (array_agg(nullif(author_avatar, '') ORDER BY (author_avatar = ''), published_at DESC NULLS LAST))[1] AS avatar,
       (array_agg(nullif(author_role, '') ORDER BY (author_role = ''), published_at DESC NULLS LAST))[1] AS role,
       (array_agg(nullif(author_bio, '') ORDER BY (author_bio = ''), published_at DESC NULLS LAST))[1] AS bio,
       (array_agg(nullif(author_url, '') ORDER BY (author_url = ''), published_at DESC NULLS LAST))[1] AS url,
       count(*)::int AS posts,
       coalesce(sum(likes), 0)::int AS likes,
       coalesce(sum(views), 0)::int AS views,
       max(published_at) AS last_post
  FROM public.blog_posts
 WHERE status = 'published' AND author_slug IS NOT NULL AND author_slug NOT IN ('anonymous', 'anon', 'unknown')
 GROUP BY author_slug;
GRANT SELECT ON public.blog_authors TO anon, authenticated;

CREATE OR REPLACE VIEW public.blog_category_counts WITH (security_invoker = true) AS
SELECT category, count(*)::int AS posts FROM public.blog_posts WHERE status = 'published' GROUP BY category;
GRANT SELECT ON public.blog_category_counts TO anon, authenticated;

-- ─── Approving a submission keeps every field ──────────────
CREATE OR REPLACE FUNCTION public.approve_submission(sub_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE s public.article_submissions%ROWTYPE; new_slug text;
BEGIN
  IF NOT public.can('blog') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO s FROM public.article_submissions WHERE id = sub_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found or already reviewed'; END IF;
  new_slug := trim(both '-' from lower(regexp_replace(s.title, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || substr(md5(random()::text), 1, 6);
  INSERT INTO public.blog_posts
    (title, slug, excerpt, content, cover_image, category, tags, author_name, author_avatar, author_role,
     author_bio, author_url, difficulty, event_slug, status, published_at)
  VALUES
    (s.title, new_slug, s.excerpt, s.content, coalesce(s.cover_image, ''), s.category, s.tags,
     s.author_name, coalesce(s.author_avatar, ''), coalesce(s.author_role, 'Contributor'),
     coalesce(s.author_bio, ''), coalesce(s.author_url, ''), s.difficulty, s.event_slug, 'published', now());
  UPDATE public.article_submissions SET status = 'approved' WHERE id = sub_id;
END $function$;
REVOKE ALL ON FUNCTION public.approve_submission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_submission(uuid) TO authenticated;

INSERT INTO public.blog_categories (name, slug, description) VALUES
  ('Blockchain & Web3', 'blockchain-web3', 'How blockchain, crypto and web3 work, and how they get attacked')
ON CONFLICT (slug) DO NOTHING;

-- Recompute read times for posts already live, without marking every post as edited today
-- (updated_at feeds the sitemap's lastmod and the posts' dateModified).
ALTER TABLE public.blog_posts DISABLE TRIGGER trg_posts_updated_at;
UPDATE public.blog_posts SET content = content;
ALTER TABLE public.blog_posts ENABLE TRIGGER trg_posts_updated_at;
