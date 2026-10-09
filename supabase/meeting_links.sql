-- ============================================================
-- Short booking links  (https://your-site.com/meet/k7m2xq9p)
-- Run ONCE in Supabase -> SQL Editor. Safe to re-run.
-- Needs public.is_admin() from supabase/admin_security.sql.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meeting_links (
  code        TEXT PRIMARY KEY,
  payload     JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_links ENABLE ROW LEVEL SECURITY;

-- Only admins can create / read / delete rows. The public can NOT list or read the table directly...
DROP POLICY IF EXISTS meeting_links_admin ON public.meeting_links;
CREATE POLICY meeting_links_admin ON public.meeting_links
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ...they can only look up ONE link when they already know its secret code (used by /api/interview).
CREATE OR REPLACE FUNCTION public.get_meeting_link(p_code TEXT)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT payload FROM public.meeting_links WHERE code = p_code AND expires_at > now() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_meeting_link(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_meeting_link(TEXT) TO anon, authenticated;

-- Optional housekeeping: remove expired links (run whenever you like)
-- DELETE FROM public.meeting_links WHERE expires_at < now() - interval '30 days';
