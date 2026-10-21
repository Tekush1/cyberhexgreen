-- ============================================================
-- Outreach, part 2: send pitch emails from Admin → Outreach, keep what was sent,
-- and let the Outreach role run its own "CTF hosting call" hours and booking links.
-- ============================================================

-- 1) Every pitch email sent from the Outreach tab (one row per send).
CREATE TABLE IF NOT EXISTS public.outreach_mails (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid REFERENCES public.outreach_leads(id) ON DELETE SET NULL,
  to_emails    text[] NOT NULL,
  subject      text NOT NULL,
  body         text NOT NULL,
  booking_link text,
  message_ids  text[] NOT NULL DEFAULT '{}',
  provider     text NOT NULL DEFAULT 'resend',
  sent_by      text,
  sent_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outreach_mails_lead_idx ON public.outreach_mails (lead_id, sent_at DESC);
ALTER TABLE public.outreach_mails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outreach_mails_staff ON public.outreach_mails;
CREATE POLICY outreach_mails_staff ON public.outreach_mails FOR ALL TO authenticated
  USING ((SELECT public.can('outreach'))) WITH CHECK ((SELECT public.can('outreach')));
REVOKE ALL ON public.outreach_mails FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.outreach_mails TO authenticated;

CREATE OR REPLACE FUNCTION public.outreach_mail_stamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.sent_by := coalesce(auth.jwt() ->> 'email', NEW.sent_by);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS outreach_mail_stamp ON public.outreach_mails;
CREATE TRIGGER outreach_mail_stamp BEFORE INSERT ON public.outreach_mails
  FOR EACH ROW EXECUTE FUNCTION public.outreach_mail_stamp();

-- 2) Availability: row 1 = interviews & meetings (HR), row 2 = CTF hosting calls (Outreach).
ALTER TABLE public.meeting_availability DROP CONSTRAINT IF EXISTS meeting_availability_id_check;
ALTER TABLE public.meeting_availability ADD CONSTRAINT meeting_availability_id_check CHECK (id IN (1, 2));
INSERT INTO public.meeting_availability (id, config)
SELECT 2, config FROM public.meeting_availability WHERE id = 1
ON CONFLICT (id) DO NOTHING;
ALTER POLICY availability_admin_write ON public.meeting_availability
  USING ((SELECT public.can('availability')) OR (id = 2 AND (SELECT public.can('outreach'))))
  WITH CHECK ((SELECT public.can('availability')) OR (id = 2 AND (SELECT public.can('outreach'))));

-- 3) Booking links: the Outreach role may create / see / delete CTF-call links only.
ALTER POLICY meeting_links_admin ON public.meeting_links
  USING ((SELECT public.can('meetings')) OR ((payload ->> 'k') = 'ctf' AND (SELECT public.can('outreach'))))
  WITH CHECK ((SELECT public.can('meetings')) OR ((payload ->> 'k') = 'ctf' AND (SELECT public.can('outreach'))));
