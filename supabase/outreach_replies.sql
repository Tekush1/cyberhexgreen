-- ============================================================
-- Outreach, part 3: organisers' replies to mail@cyberhx.com show up in Admin → Outreach.
-- Flow: Cloudflare Email Routing (mail@cyberhx.com) → Email Worker (forwards as before AND posts a copy)
--       → /api/outreach (inbound) → public.outreach_inbound(secret, ...) below.
-- Only mail FROM a lead's address (or someone we emailed from Outreach) is stored; everything else is ignored.
-- The last query prints the secret to put in the Worker (INBOUND_SECRET).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.outreach_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid REFERENCES public.outreach_leads(id) ON DELETE CASCADE,
  from_email  text NOT NULL,
  from_name   text NOT NULL DEFAULT '',
  to_email    text NOT NULL DEFAULT '',
  subject     text NOT NULL DEFAULT '',
  body        text NOT NULL DEFAULT '',
  message_id  text UNIQUE,
  in_reply_to text,
  received_at timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz
);
CREATE INDEX IF NOT EXISTS outreach_replies_lead_idx ON public.outreach_replies (lead_id, received_at DESC);
ALTER TABLE public.outreach_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outreach_replies_read ON public.outreach_replies;
CREATE POLICY outreach_replies_read ON public.outreach_replies FOR SELECT TO authenticated USING ((SELECT public.can('outreach')));
DROP POLICY IF EXISTS outreach_replies_mark ON public.outreach_replies;
CREATE POLICY outreach_replies_mark ON public.outreach_replies FOR UPDATE TO authenticated
  USING ((SELECT public.can('outreach'))) WITH CHECK ((SELECT public.can('outreach')));
REVOKE ALL ON public.outreach_replies FROM anon;
GRANT SELECT ON public.outreach_replies TO authenticated;
GRANT UPDATE (read_at) ON public.outreach_replies TO authenticated;

INSERT INTO public.app_secrets (name, value)
VALUES ('inbound', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.outreach_inbound(
  p_secret text, p_from text, p_from_name text, p_to text, p_subject text, p_body text, p_message_id text, p_in_reply_to text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  f text := lower(trim(coalesce(p_from, '')));
  lid uuid;
  rid uuid;
BEGIN
  IF p_secret IS NULL OR p_secret IS DISTINCT FROM (SELECT value FROM app_secrets WHERE name = 'inbound') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF f !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR f LIKE '%@cyberhx.com' OR f LIKE '%.cyberhx.com' THEN
    RETURN jsonb_build_object('stored', false, 'reason', 'ignored sender');
  END IF;

  -- Someone we emailed from Outreach (newest first), else an address listed on a lead.
  SELECT m.lead_id INTO lid FROM outreach_mails m
   WHERE m.lead_id IS NOT NULL AND f = ANY (m.to_emails) ORDER BY m.sent_at DESC LIMIT 1;
  IF lid IS NULL THEN
    SELECT l.id INTO lid FROM outreach_leads l
     WHERE f = ANY (regexp_split_to_array(lower(l.emails), '[,;\s]+')) ORDER BY l.updated_at DESC LIMIT 1;
  END IF;
  IF lid IS NULL THEN RETURN jsonb_build_object('stored', false, 'reason', 'not a lead'); END IF;

  INSERT INTO outreach_replies (lead_id, from_email, from_name, to_email, subject, body, message_id, in_reply_to)
  VALUES (lid, f, left(coalesce(p_from_name, ''), 200), left(lower(coalesce(p_to, '')), 200), left(coalesce(p_subject, ''), 300),
          left(coalesce(p_body, ''), 20000), nullif(left(coalesce(p_message_id, ''), 300), ''), nullif(left(coalesce(p_in_reply_to, ''), 300), ''))
  ON CONFLICT (message_id) DO NOTHING
  RETURNING id INTO rid;

  IF rid IS NOT NULL THEN
    UPDATE outreach_leads SET status = 'replied', updated_by = 'email reply'
     WHERE id = lid AND status IN ('todo', 'contacted');
  END IF;
  RETURN jsonb_build_object('stored', rid IS NOT NULL, 'lead_id', lid);
END $$;
REVOKE ALL ON FUNCTION public.outreach_inbound(text, text, text, text, text, text, text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_inbound(text, text, text, text, text, text, text, text) TO anon;

-- SELECT value AS "INBOUND_SECRET (put in the Cloudflare Worker)" FROM public.app_secrets WHERE name = 'inbound';

-- ---------- Update (21 Oct): keep EVERY email to mail@ ----------
-- outreach_inbound now stores all mail (lead_id stays NULL when the sender isn't a lead).
-- Owners see everything in Admin → Outreach → Inbox; the Outreach role still sees only lead mail:
-- ALTER POLICY outreach_replies_read ON public.outreach_replies
--   USING ((SELECT public.can('outreach')) AND (lead_id IS NOT NULL OR (SELECT public.staff_role()) = 'owner'));
-- (same for outreach_replies_mark) and GRANT UPDATE (read_at, lead_id) so "Add as lead" can link a mail.
-- Applied as migration "outreach_inbox_all_mail".
