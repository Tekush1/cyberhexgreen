-- ============================================================
-- Outreach: CTF organisers to pitch Cyber HX hosting to (Admin → Outreach).
-- New team role 'outreach' that sees only this tab. Owners see it too.
-- ============================================================

-- 1) Allow the new role
ALTER TABLE public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_role_check;
ALTER TABLE public.admin_roles ADD CONSTRAINT admin_roles_role_check
  CHECK (role IN ('owner','hr','campaign','event','outreach','none'));

CREATE OR REPLACE FUNCTION public.can(p_area text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE staff_role()
    WHEN 'owner'    THEN true
    WHEN 'hr'       THEN p_area IN ('applications','meetings','availability','emails')
    WHEN 'campaign' THEN p_area IN ('campaigns','subscribers','blog')
    WHEN 'event'    THEN p_area IN ('ctf','inbox','meetings','campaigns','payments')
    WHEN 'outreach' THEN p_area IN ('outreach')
    ELSE false END;
$$;

CREATE OR REPLACE FUNCTION public.staff_set(p_email text, p_role text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid; e text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF staff_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Only owners can manage the team' USING ERRCODE = '42501'; END IF;
  IF p_role NOT IN ('owner','hr','campaign','event','outreach') THEN RAISE EXCEPTION 'Unknown role'; END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = e LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No login exists for %. Create it first in Supabase -> Authentication -> Add user (tick Auto Confirm), then add the role here.', e USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM admins WHERE user_id = uid) THEN RAISE EXCEPTION '% is a main owner already.', e; END IF;
  INSERT INTO admin_roles (user_id, email, role, added_by) VALUES (uid, e, p_role, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET role = excluded.role, email = excluded.email;
  RETURN jsonb_build_object('user_id', uid, 'email', e, 'role', p_role);
END $$;
REVOKE ALL ON FUNCTION public.can(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.staff_set(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_set(text, text) TO authenticated;

-- 2) The leads
CREATE TABLE IF NOT EXISTS public.outreach_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event        text NOT NULL,
  organizer    text NOT NULL DEFAULT '',
  event_date   text NOT NULL DEFAULT '',
  sort_date    date,
  emails       text NOT NULL DEFAULT '',
  phones       text NOT NULL DEFAULT '',
  link         text NOT NULL DEFAULT '',
  platform     text NOT NULL DEFAULT '',
  priority     text NOT NULL DEFAULT 'target' CHECK (priority IN ('target','maybe')),
  status       text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','contacted','replied','meeting','won','lost','skip')),
  notes        text NOT NULL DEFAULT '',
  next_followup date,
  last_contacted_at timestamptz,
  updated_by   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outreach_staff ON public.outreach_leads;
CREATE POLICY outreach_staff ON public.outreach_leads FOR ALL TO authenticated
  USING ((SELECT public.can('outreach'))) WITH CHECK ((SELECT public.can('outreach')));
REVOKE ALL ON public.outreach_leads FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_leads TO authenticated;

CREATE OR REPLACE FUNCTION public.outreach_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := coalesce(auth.jwt() ->> 'email', NEW.updated_by);
  IF NEW.status = 'contacted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'contacted') THEN
    NEW.last_contacted_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS outreach_touch ON public.outreach_leads;
CREATE TRIGGER outreach_touch BEFORE INSERT OR UPDATE ON public.outreach_leads
  FOR EACH ROW EXECUTE FUNCTION public.outreach_touch();

-- 3) First batch (researched 18 Oct 2026). Only seeded when the table is empty.
INSERT INTO public.outreach_leads (event, organizer, event_date, sort_date, emails, phones, link, platform, priority)
SELECT * FROM (VALUES
 ('CTF Arena (D3 Fest)','TechSoc, IIIT Bhubaneswar','Prelims 22 Dec 2026 · Finale 5–7 Feb 2027','2026-12-22'::date,'ankushmohapatra2004@gmail.com','+91 6370883783','https://unstop.com/competitions/ctf-arena-international-institute-of-information-technology-iiit-bhubaneswar-1742226','Platform never named; fest site says "Coming Soon". Paid event, most lead time.','target'),
 ('Techkriti''27 CTF','Techkriti, IIT Kanpur','28–31 Jan 2027 (reg by 14 Nov)','2027-01-28','pratyushs@techkriti.org, ayushks@techkriti.org, ridhams@techkriti.org','+91 9260967921, +91 8433768226','https://unstop.com/hackathons/capture-the-flag-techkriti27-techkriti-1764472','"Event platform will be announced separately". Not decided yet.','target'),
 ('hackosquadCTF 2026: DOOMSDAY','Hackosquad','7–8 Nov 2026 (reg by 5 Nov)','2026-11-07','minhaz@hackosquad.com','','https://unstop.com/hackathons/hackosquad-ctf-2026-hackosquad-1766739','Runs several CTFs a year with no platform of its own. Possible recurring customer.','target'),
 ('VOID CTF 2026','KIET Cyber Security CoE + VOID Society, Ghaziabad','Qualifier 24–25 Oct · Finale 29–30 Nov 2026','2026-11-29','admissions@kiet.edu','LinkedIn: linkedin.com/company/void-society · +91 7949335337','https://internshala.com/competitions/void-ctf-2026-national-level-cybersecurity-competition/','Registration via Internshala, no platform named. Pitch the Nov finale.','target'),
 ('Siege Of Troy (DevHost 2026)','Sahyadri Open Source Community, Mangaluru','12 Nov 2026 (reg closes 22 Oct)','2026-11-12','sosc@sahyadri.edu.in, valasapalli.m.cs24@sahyadri.edu.in, sweekar.shetty.cs24@sahyadri.edu.in','+91 7227981580, +91 9449417695','https://unstop.com/competitions/siege-of-troy-ctf-devhost-2026-sahyadri-open-source-community-1738040','Mentions an "event portal" but never names it. Urgent.','target'),
 ('Tech Fusion ''26 CTF','Vaish College of Engineering, Rohtak','Online 23 Oct · Offline 26 Oct 2026','2026-10-23','vcertk.tech.fusion@gmail.com','','https://unstop.com/hackathons/capture-the-flag-tech-fusion-26-vaish-college-of-engineering-rohtak-haryana-1770937','Screening is a 5-question Unstop quiz; offline finale has no CTF platform.','target'),
 ('Tenet''26 CTF','AISSMS IOIT (Tenet), Pune','24 Oct 2026','2026-10-24','ioit.tenet@aissmsioit.org, siddheshwaghmare9m@gmail.com, prathameshvaydande@gmail.com','+91 7028663868, +91 8010861038','https://unstop.com/competitions/tenet26-ctf-tenet-aissms-institute-of-information-technology-pune-maharashtra-1758898','"Platform Walkthrough" in schedule but no platform named. Pitch next edition.','target'),
 ('Hacker''s Gambit 2026','Jaihind College of Engineering, Kuran (Pune)','Offline finale 30–31 Oct 2026','2026-10-30','tanmay20.11.04@gmail.com','+91 9209181727','https://unstop.com/hackathons/hackers-gambit-2026-jaihind-college-of-engineering-kuran-1723293','No platform named; site on free GitHub Pages.','target'),
 ('Obsidian Labs CTF 2026','Obsidian Labs','31 Oct 2026','2026-10-31','','Message via the Unstop page','https://unstop.com/hackathons/obsidian-labs-ctf-2026-jeopardy-style-cybersecurity-challenge-obsidian-labs-1770219','"Platform details will be shared with registered participants."','target'),
 ('Sea of Secrets CTF','HackitUp','31 Oct – 1 Nov 2026','2026-10-31','','Message via the Unstop page','https://unstop.com/hackathons/sea-of-secrets-ctf-hackitup-1764913','No platform and no web presence outside Unstop.','target'),
 ('Hacker''s Heist 2k26','Cyberslay, Hyderabad','31 Oct 2026','2026-10-31','','eventbrite.com/o/121385767818','https://www.eventbrite.com/e/hackers-heist-2k26-tickets-1999359058766','Only Eventbrite + Cashfree form visible.','target'),
 ('RIFT CTF 2026','GeekHaven, IIIT Allahabad','31 Oct – 1 Nov 2026','2026-10-31','geekhaven@iiita.ac.in','','https://unstop.com/competitions/rift-ctf-2026-kagexai-x-geekhaven-iiita-indian-institute-of-information-technology-iiit-allahabad-1762770','"Official CTF platform" mentioned, never named. Strong club, ask first.','maybe'),
 ('Omnikon Bug Hunt 2026','Omnikon','5 Nov 2026','2026-11-05','contact@omnikonhub.com','','https://unstop.com/competitions/omnikon-bug-hunt-2026-web-security-challenge-omnikon-1771594','Bug-report format (own vulnerable site + form), no scoreboard.','maybe'),
 ('Koolage Cybersecurity Challenge','Koolage','Reg by 30 Oct · date unconfirmed',NULL,'','Message via the Unstop page','https://unstop.com/hackathons/koolage-cybersecurity-challenge-can-you-spot-the-vulnerability-koolage-cybersecurity-challeng-koolage-1757802','Quiz-style questions, no platform.','maybe'),
 ('QCTF – Quantum CTF','SRM University AP','26–30 Oct 2026 fest','2026-10-26','qiskitfallfest@srmap.edu.in','','https://unstop.com/hackathons/qctf-quantum-capture-the-flag-srm-university-ap-1761629','No platform but registration closed. Pitch next year''s Fall Fest.','maybe')
) AS v(event, organizer, event_date, sort_date, emails, phones, link, platform, priority)
WHERE NOT EXISTS (SELECT 1 FROM public.outreach_leads);
