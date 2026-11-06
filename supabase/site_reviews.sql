-- ============================================================
-- Public reviews (cyberhx.com/reviews + homepage), 7 Nov 2026. Migration site_reviews.
-- site_reviews: feedback quotes chosen to show on the site (Admin -> Feedback -> "Show on site").
-- Only the quote, the player's handle, team and event are public. Never the email or real name.
-- review_stats(): totals for the public page (no personal data).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid UNIQUE REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  quote         text NOT NULL CHECK (length(quote) BETWEEN 3 AND 600),
  author        text NOT NULL DEFAULT '' CHECK (length(author) <= 60),
  team          text NOT NULL DEFAULT '' CHECK (length(team) <= 60),
  event_name    text NOT NULL DEFAULT '' CHECK (length(event_name) <= 80),
  rating        smallint CHECK (rating BETWEEN 1 AND 5),
  published     boolean NOT NULL DEFAULT true,
  sort          integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_reviews FROM anon, authenticated;
GRANT SELECT ON public.site_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_reviews TO authenticated;
CREATE POLICY site_reviews_public_read ON public.site_reviews FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY site_reviews_staff ON public.site_reviews FOR ALL TO authenticated
  USING ((SELECT public.can('inbox')) OR (SELECT public.can('ctf'))) WITH CHECK ((SELECT public.can('inbox')) OR (SELECT public.can('ctf')));

CREATE OR REPLACE FUNCTION public.review_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $f$
  WITH f AS (
    SELECT coalesce(nullif(data->>'event_name',''), 'CyberHx event') AS ev,
           nullif(substring(coalesce(data->>'quality', data->>'ui', '') from '^([1-5])/5'), '')::int AS r,
           data->>'more_events' AS more,
           CASE WHEN jsonb_typeof(data->'categories') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(data->'categories'))
                WHEN coalesce(data->>'category','') <> '' THEN ARRAY[data->>'category'] ELSE ARRAY[]::text[] END AS cats
    FROM form_submissions WHERE form = 'feedback'
  ), c AS (
    SELECT CASE x WHEN 'Web' THEN 'Web Exploitation' WHEN 'Forensics' THEN 'Digital Forensics' WHEN 'Reversing' THEN 'Reverse Engineering' ELSE x END AS name, count(*) n
    FROM f, unnest(cats) x WHERE x NOT IN ('Something else','Sanity','Not picked','') GROUP BY 1 ORDER BY 2 DESC LIMIT 6
  )
  SELECT jsonb_build_object(
    'responses', (SELECT count(*) FROM f),
    'avg', (SELECT round(avg(r)::numeric, 1) FROM f),
    'happy_pct', (SELECT round(100.0 * count(*) FILTER (WHERE r >= 4) / nullif(count(r), 0)) FROM f),
    'more_pct', (SELECT round(100.0 * count(*) FILTER (WHERE more = 'Yes') / nullif(count(more), 0)) FROM f),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', ev, 'responses', n, 'avg', a) ORDER BY n DESC), '[]')
               FROM (SELECT ev, count(*) n, round(avg(r)::numeric, 1) a FROM f GROUP BY ev) e),
    'categories', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'n', n) ORDER BY n DESC), '[]') FROM c)
  );
$f$;
REVOKE ALL ON FUNCTION public.review_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_stats() TO anon, authenticated;
