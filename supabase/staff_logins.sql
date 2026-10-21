-- ============================================================
-- Admin sign-in log: who signed in (or tried to), when, from which IP / city / country and device.
-- Written only by /api/staff (server checks the person first; the function needs PAYMENTS_DB_SECRET).
-- Only owners can read it (Admin → Team → Sign-in activity).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_logins (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  ok         boolean NOT NULL,
  user_id    uuid,
  email      text NOT NULL DEFAULT '',
  role       text NOT NULL DEFAULT '',
  ip         text NOT NULL DEFAULT '',
  city       text NOT NULL DEFAULT '',
  region     text NOT NULL DEFAULT '',
  country    text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS staff_logins_at_idx ON public.staff_logins (at DESC);
ALTER TABLE public.staff_logins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_logins_owner_read ON public.staff_logins;
CREATE POLICY staff_logins_owner_read ON public.staff_logins FOR SELECT TO authenticated
  USING ((SELECT public.staff_role()) = 'owner');
REVOKE ALL ON public.staff_logins FROM anon;
GRANT SELECT ON public.staff_logins TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_log_login(
  p_secret text, p_ok boolean, p_user uuid, p_email text, p_role text,
  p_ip text, p_city text, p_region text, p_country text, p_ua text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pay_check(p_secret);
  INSERT INTO staff_logins (ok, user_id, email, role, ip, city, region, country, user_agent)
  VALUES (coalesce(p_ok, false), p_user, left(lower(coalesce(p_email, '')), 200), left(coalesce(p_role, ''), 20),
          left(coalesce(p_ip, ''), 64), left(coalesce(p_city, ''), 100), left(coalesce(p_region, ''), 100),
          left(coalesce(p_country, ''), 100), left(coalesce(p_ua, ''), 400));
END $$;
REVOKE ALL ON FUNCTION public.staff_log_login(text, boolean, uuid, text, text, text, text, text, text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_log_login(text, boolean, uuid, text, text, text, text, text, text, text) TO anon;
