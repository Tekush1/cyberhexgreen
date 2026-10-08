-- ============================================================
-- CyberHx admin tables (run ONCE in Supabase → SQL Editor)
-- Needs supabase/admin_security.sql to have been run first (uses public.is_admin()).
--
--   job_applications      internship / job applications  (shown in Admin → Applications)
--   ctf_requests          "Host your CTF" requests       (shown in Admin → CTF Requests)
--   meeting_availability  your open dates & times        (edited in Admin → Availability)
--
-- Public (anon) may only INSERT into the first two (form submissions).
-- Only admins can read / update / delete. Safe to re-run.
-- ============================================================

-- ─── Job / internship applications ──────────────────────────
CREATE TABLE IF NOT EXISTS public.job_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT DEFAULT '',
  college       TEXT DEFAULT '',
  year          TEXT DEFAULT '',
  branch        TEXT DEFAULT '',
  cgpa          TEXT DEFAULT '',
  position      TEXT NOT NULL DEFAULT '',          -- the job / internship applied for
  experience    TEXT DEFAULT '',
  skills        TEXT[] NOT NULL DEFAULT '{}',
  portfolio     TEXT DEFAULT '',
  availability  TEXT DEFAULT '',
  motivation    TEXT DEFAULT '',
  resume_note   TEXT DEFAULT '',
  source        TEXT DEFAULT '',                   -- e.g. 'contact-page' | 'hiring-popup'
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','shortlisted','interviewed','hired','rejected')),
  admin_notes   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_applications_created_idx ON public.job_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS job_applications_status_idx  ON public.job_applications (status);

-- ─── CTF hosting requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ctf_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT DEFAULT '',
  organization     TEXT DEFAULT '',
  organization_url TEXT DEFAULT '',
  event_name       TEXT DEFAULT '',
  event_format     TEXT DEFAULT '',
  event_date       TEXT DEFAULT '',
  participants     TEXT DEFAULT '',
  budget           TEXT DEFAULT '',
  requirements     TEXT DEFAULT '',
  message          TEXT DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','scheduled','done','declined')),
  admin_notes      TEXT DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ctf_requests_created_idx ON public.ctf_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS ctf_requests_status_idx  ON public.ctf_requests (status);

-- ─── Availability (single row, id = 1) ───────────────────────
-- config = { slotMinutes, weekly: {"0":[{s,e}],...}, dates: {"YYYY-MM-DD":[{s,e}]} }  (times are IST, "HH:MM")
CREATE TABLE IF NOT EXISTS public.meeting_availability (
  id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Row Level Security ──────────────────────────────────────
ALTER TABLE public.job_applications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctf_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_availability ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN ('job_applications','ctf_requests','meeting_availability')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- Public: may only INSERT a fresh 'new' row (cannot read, edit or delete anything)
CREATE POLICY job_applications_public_insert ON public.job_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND length(full_name) BETWEEN 2 AND 200
    AND length(email) BETWEEN 5 AND 200
    AND length(motivation) <= 10000
  );

CREATE POLICY ctf_requests_public_insert ON public.ctf_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND length(name) BETWEEN 2 AND 200
    AND length(email) BETWEEN 5 AND 200
    AND length(message) <= 10000
    AND length(requirements) <= 10000
  );

-- Admins: everything
CREATE POLICY job_applications_admin_all ON public.job_applications
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ctf_requests_admin_all ON public.ctf_requests
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Availability: anyone may READ (the booking page needs it to build free slots), only admins write
CREATE POLICY availability_public_read ON public.meeting_availability
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY availability_admin_write ON public.meeting_availability
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed the availability row (Mon–Sat 10:00–18:00 IST, 30-min slots) if it does not exist yet
INSERT INTO public.meeting_availability (id, config)
VALUES (1, '{
  "slotMinutes": 30,
  "weekly": {
    "0": [],
    "1": [{"s":"10:00","e":"18:00"}],
    "2": [{"s":"10:00","e":"18:00"}],
    "3": [{"s":"10:00","e":"18:00"}],
    "4": [{"s":"10:00","e":"18:00"}],
    "5": [{"s":"10:00","e":"18:00"}],
    "6": [{"s":"10:00","e":"18:00"}]
  },
  "dates": {}
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
