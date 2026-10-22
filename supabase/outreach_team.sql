-- ============================================================
-- Outreach, part 4: one dashboard per outreach person.
--   * outreach_people: who they are, which address they send as (yashika@cyberhx.com ...), their own call hours
--   * leads / sent mail / inbox rows belong to one person (owner_id); the Outreach role sees only its own,
--     owners see everyone's
--   * booking links carry the person (payload.o) so slots come from THAT person's hours
--   * our own CC copies (from a send_as address to mail@) are not stored as inbox mail
-- ============================================================

CREATE TABLE IF NOT EXISTS public.outreach_people (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  send_as      text NOT NULL UNIQUE CHECK (send_as ~ '^[a-z0-9._+-]+@cyberhx\.com$'),
  availability jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outreach_people_read ON public.outreach_people;
CREATE POLICY outreach_people_read ON public.outreach_people FOR SELECT TO authenticated
  USING ((SELECT public.staff_role()) = 'owner' OR user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS outreach_people_owner_write ON public.outreach_people;
CREATE POLICY outreach_people_owner_write ON public.outreach_people FOR ALL TO authenticated
  USING ((SELECT public.staff_role()) = 'owner') WITH CHECK ((SELECT public.staff_role()) = 'owner');
DROP POLICY IF EXISTS outreach_people_self_hours ON public.outreach_people;
CREATE POLICY outreach_people_self_hours ON public.outreach_people FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.outreach_people FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_people TO authenticated;

-- A person may change only their own hours; name and address are the owner's to set.
CREATE OR REPLACE FUNCTION public.outreach_people_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT staff_role()) IS DISTINCT FROM 'owner' THEN
    NEW.name := OLD.name; NEW.send_as := OLD.send_as; NEW.user_id := OLD.user_id;
  END IF;
  NEW.send_as := lower(NEW.send_as);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS outreach_people_guard ON public.outreach_people;
CREATE TRIGGER outreach_people_guard BEFORE UPDATE ON public.outreach_people
  FOR EACH ROW EXECUTE FUNCTION public.outreach_people_guard();

-- Public: a person's call hours (only hours, nothing else) for the booking page.
CREATE OR REPLACE FUNCTION public.outreach_hours(p_user uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT availability FROM outreach_people WHERE user_id = p_user;
$$;
REVOKE ALL ON FUNCTION public.outreach_hours(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.outreach_hours(uuid) TO anon, authenticated;

-- The signed-in person's own outreach profile (name + send-as address), used by the send and booking server code.
CREATE OR REPLACE FUNCTION public.outreach_me()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(p) - 'availability' FROM outreach_people p WHERE p.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.outreach_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.outreach_me() TO authenticated;

-- ---------- ownership columns ----------
ALTER TABLE public.outreach_leads   ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.outreach_mails   ADD COLUMN IF NOT EXISTS sent_by_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.outreach_mails   ADD COLUMN IF NOT EXISTS from_email text;
ALTER TABLE public.outreach_replies ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS outreach_leads_owner_idx ON public.outreach_leads (owner_id);
CREATE INDEX IF NOT EXISTS outreach_mails_owner_idx ON public.outreach_mails (sent_by_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS outreach_replies_owner_idx ON public.outreach_replies (owner_id, received_at DESC);

-- Outreach role: only its own rows. Owners: everything.
DROP POLICY IF EXISTS outreach_staff ON public.outreach_leads;
CREATE POLICY outreach_staff ON public.outreach_leads FOR ALL TO authenticated
  USING ((SELECT public.can('outreach')) AND ((SELECT public.staff_role()) = 'owner' OR owner_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT public.can('outreach')) AND ((SELECT public.staff_role()) = 'owner' OR owner_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS outreach_mails_staff ON public.outreach_mails;
CREATE POLICY outreach_mails_staff ON public.outreach_mails FOR ALL TO authenticated
  USING ((SELECT public.can('outreach')) AND ((SELECT public.staff_role()) = 'owner' OR sent_by_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT public.can('outreach')) AND ((SELECT public.staff_role()) = 'owner' OR sent_by_id = (SELECT auth.uid())));

ALTER POLICY outreach_replies_read ON public.outreach_replies
  USING ((SELECT public.can('outreach')) AND ((SELECT public.staff_role()) = 'owner' OR owner_id = (SELECT auth.uid())));
ALTER POLICY outreach_replies_mark ON public.outreach_replies
  USING ((SELECT public.can('outreach')) AND ((SELECT public.staff_role()) = 'owner' OR owner_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT public.can('outreach')) AND ((SELECT public.staff_role()) = 'owner' OR owner_id = (SELECT auth.uid())));
REVOKE UPDATE ON public.outreach_replies FROM authenticated;
GRANT UPDATE (read_at, lead_id, owner_id) ON public.outreach_replies TO authenticated;

-- Booking links: the Outreach role sees only its own CTF-call links.
ALTER POLICY meeting_links_admin ON public.meeting_links
  USING ((SELECT public.can('meetings')) OR ((payload ->> 'k') = 'ctf' AND (payload ->> 'o') = (SELECT auth.uid())::text AND (SELECT public.can('outreach'))))
  WITH CHECK ((SELECT public.can('meetings')) OR ((payload ->> 'k') = 'ctf' AND (payload ->> 'o') = (SELECT auth.uid())::text AND (SELECT public.can('outreach'))));

-- ---------- inbound: who does this email belong to? ----------
CREATE OR REPLACE FUNCTION public.outreach_inbound(p_secret text, p_from text, p_from_name text, p_to text, p_subject text, p_body text, p_message_id text, p_in_reply_to text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  f text := lower(trim(coalesce(p_from, '')));
  irt text := nullif(trim(coalesce(p_in_reply_to, '')), '');
  lid uuid;
  own uuid;
  rid uuid;
BEGIN
  IF p_secret IS NULL OR p_secret IS DISTINCT FROM (SELECT value FROM app_secrets WHERE name = 'inbound') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF f !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN f := coalesce(nullif(f, ''), 'unknown@unknown'); END IF;
  -- Our own CC copy (yashika@ → mail@): already in Sent, don't put it in the inbox.
  IF EXISTS (SELECT 1 FROM outreach_people WHERE send_as = f) THEN
    RETURN jsonb_build_object('stored', false, 'reason', 'own copy');
  END IF;

  -- 1) a reply to one of our emails (Message-ID we set when sending)
  IF irt IS NOT NULL THEN
    SELECT m.lead_id, m.sent_by_id INTO lid, own FROM outreach_mails m
     WHERE irt = ANY (m.message_ids) OR ('<' || irt || '>') = ANY (m.message_ids) OR trim(both '<>' from irt) = ANY (m.message_ids)
     ORDER BY m.sent_at DESC LIMIT 1;
  END IF;
  -- 2) someone we emailed from Outreach
  IF lid IS NULL AND own IS NULL THEN
    SELECT m.lead_id, m.sent_by_id INTO lid, own FROM outreach_mails m
     WHERE f = ANY (m.to_emails) ORDER BY m.sent_at DESC LIMIT 1;
  END IF;
  -- 3) an address listed on a lead
  IF lid IS NULL THEN
    SELECT l.id INTO lid FROM outreach_leads l
     WHERE f = ANY (regexp_split_to_array(lower(l.emails), '[,;\s]+')) ORDER BY l.updated_at DESC LIMIT 1;
  END IF;
  IF lid IS NOT NULL THEN
    SELECT coalesce(l.owner_id, own) INTO own FROM outreach_leads l WHERE l.id = lid;
  END IF;

  INSERT INTO outreach_replies (lead_id, owner_id, from_email, from_name, to_email, subject, body, message_id, in_reply_to)
  VALUES (lid, own, f, left(coalesce(p_from_name, ''), 200), left(lower(coalesce(p_to, '')), 200), left(coalesce(p_subject, ''), 300),
          left(coalesce(p_body, ''), 20000), nullif(left(coalesce(p_message_id, ''), 300), ''), left(irt, 300))
  ON CONFLICT (message_id) DO NOTHING
  RETURNING id INTO rid;

  IF rid IS NOT NULL AND lid IS NOT NULL THEN
    UPDATE outreach_leads SET status = 'replied', updated_by = 'email reply'
     WHERE id = lid AND status IN ('todo', 'contacted');
  END IF;
  RETURN jsonb_build_object('stored', rid IS NOT NULL, 'lead_id', lid);
END $$;

-- ---------- backfill: everything so far was Yashika's ----------
INSERT INTO public.outreach_people (user_id, name, send_as, availability)
SELECT r.user_id, 'Yashika', 'yashika@cyberhx.com', (SELECT config FROM meeting_availability WHERE id = 2)
FROM public.admin_roles r WHERE r.email = 'yastikacyberhx@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
UPDATE public.outreach_leads SET owner_id = (SELECT user_id FROM outreach_people WHERE send_as = 'yashika@cyberhx.com')
 WHERE owner_id IS NULL OR owner_id NOT IN (SELECT user_id FROM outreach_people);
UPDATE public.outreach_mails m SET sent_by_id = coalesce(
    (SELECT r.user_id FROM admin_roles r WHERE r.email = lower(m.sent_by) AND r.role = 'outreach'),
    (SELECT user_id FROM outreach_people WHERE send_as = 'yashika@cyberhx.com'))
 WHERE sent_by_id IS NULL;
UPDATE public.outreach_replies r SET owner_id = l.owner_id FROM public.outreach_leads l WHERE r.lead_id = l.id AND r.owner_id IS NULL;
UPDATE public.meeting_links SET payload = payload || jsonb_build_object('o', (SELECT user_id FROM outreach_people WHERE send_as = 'yashika@cyberhx.com'))
 WHERE payload ->> 'k' = 'ctf' AND payload ->> 'o' IS NULL;

-- Owners: the outreach team with each person's login email and last sign-in (Admin → Outreach → Team).
CREATE OR REPLACE FUNCTION public.outreach_team()
RETURNS TABLE (user_id uuid, name text, send_as text, login_email text, last_sign_in timestamptz, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF staff_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Only owners can see the outreach team' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT p.user_id, p.name, p.send_as, u.email::text, u.last_sign_in_at, p.created_at
      FROM outreach_people p LEFT JOIN auth.users u ON u.id = p.user_id
     ORDER BY p.created_at;
END $$;
REVOKE ALL ON FUNCTION public.outreach_team() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.outreach_team() TO authenticated;

-- Update (22 Oct): the Inbox is shared. Every outreach person sees ALL mail to mail@cyberhx.com
-- (leads, sent mail and calls stay per person). Applied as migration "outreach_inbox_shared".
ALTER POLICY outreach_replies_read ON public.outreach_replies USING ((SELECT public.can('outreach')));
ALTER POLICY outreach_replies_mark ON public.outreach_replies
  USING ((SELECT public.can('outreach'))) WITH CHECK ((SELECT public.can('outreach')));
