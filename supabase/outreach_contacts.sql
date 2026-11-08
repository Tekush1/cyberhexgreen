-- ============================================================
-- Admin -> Contacts (8 Nov 2026, migration outreach_contacts).
-- A shared address book next to Outreach: colleges, fests, space centres, sponsors, govt programs ... and bulk emails to them.
--   * outreach_contacts: one row per person / office (email unique, stored lower-case; email may be empty while we find it)
--   * outreach_contact_batches: one row per bulk email (subject + body template, who it goes out as)
--   * bulk emails go through the existing outreach_queue (pg_cron -> /api/voucher-queue, 2 a minute, Mailtrap, from the
--     outreach person's own address, CC + reply-to mail@cyberhx.com), so replies land in Outreach -> Inbox as usual
--   * a reply from a contact's address marks the contact "Replied"
-- Who: owners and the Outreach role (public.can('outreach')). Outreach people see the batches they created / sent.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.outreach_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL DEFAULT '' CHECK (length(name) <= 200),
  org             text NOT NULL DEFAULT '' CHECK (length(org) <= 200),
  role            text NOT NULL DEFAULT '' CHECK (length(role) <= 200),
  email           text UNIQUE CHECK (email IS NULL OR (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' AND length(email) <= 200)),
  phone           text NOT NULL DEFAULT '' CHECK (length(phone) <= 100),
  category        text NOT NULL DEFAULT 'other' CHECK (category IN ('college','fest','space','govt','sponsor','program','community','media','other')),
  city            text NOT NULL DEFAULT '' CHECK (length(city) <= 100),
  state           text NOT NULL DEFAULT '' CHECK (length(state) <= 100),
  country         text NOT NULL DEFAULT 'India' CHECK (length(country) <= 100),
  website         text NOT NULL DEFAULT '' CHECK (length(website) <= 500),
  source          text NOT NULL DEFAULT '' CHECK (length(source) <= 500),
  tags            text[] NOT NULL DEFAULT '{}',
  notes           text NOT NULL DEFAULT '' CHECK (length(notes) <= 4000),
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new','mailed','replied','interested','not_interested','bounced','skip')),
  mail_count      int NOT NULL DEFAULT 0,
  last_mailed_at  timestamptz,
  last_replied_at timestamptz,
  owner_id        uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outreach_contacts_cat_idx ON public.outreach_contacts (category, status);
ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outreach_contacts_staff ON public.outreach_contacts;
CREATE POLICY outreach_contacts_staff ON public.outreach_contacts FOR ALL TO authenticated
  USING ((SELECT public.can('outreach'))) WITH CHECK ((SELECT public.can('outreach')));
REVOKE ALL ON public.outreach_contacts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_contacts TO authenticated;

CREATE OR REPLACE FUNCTION public.outreach_contacts_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.email := nullif(lower(trim(coalesce(NEW.email, ''))), '');
  NEW.tags := ARRAY(SELECT DISTINCT lower(trim(t)) FROM unnest(coalesce(NEW.tags, '{}')) t WHERE trim(t) <> '');
  NEW.updated_at := now();
  NEW.updated_by := coalesce(auth.jwt() ->> 'email', NEW.updated_by);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS outreach_contacts_touch ON public.outreach_contacts;
CREATE TRIGGER outreach_contacts_touch BEFORE INSERT OR UPDATE ON public.outreach_contacts
  FOR EACH ROW EXECUTE FUNCTION public.outreach_contacts_touch();

-- Bulk emails
CREATE TABLE IF NOT EXISTS public.outreach_contact_batches (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL DEFAULT '' CHECK (length(name) <= 200),
  subject     text NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 8000),
  sent_by_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  total       int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_contact_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outreach_contact_batches FROM anon, authenticated; -- read through contact_batches()

ALTER TABLE public.outreach_queue ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.outreach_contacts(id) ON DELETE CASCADE;
ALTER TABLE public.outreach_queue ADD COLUMN IF NOT EXISTS batch_id bigint REFERENCES public.outreach_contact_batches(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS outreach_queue_batch_once ON public.outreach_queue (batch_id, contact_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_queue_contact_idx ON public.outreach_queue (contact_id) WHERE contact_id IS NOT NULL;
ALTER TABLE public.outreach_mails ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.outreach_contacts(id) ON DELETE SET NULL;
ALTER TABLE public.outreach_mails ADD COLUMN IF NOT EXISTS batch_id bigint REFERENCES public.outreach_contact_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS outreach_mails_contact_idx ON public.outreach_mails (contact_id, sent_at DESC) WHERE contact_id IS NOT NULL;

-- Fill {first_name} {name} {org} {role} {city} for one contact.
CREATE OR REPLACE FUNCTION public.contact_fill(p_text text, c public.outreach_contacts)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT replace(replace(replace(replace(replace(p_text,
    '{first_name}', coalesce(nullif(split_part(trim(c.name), ' ', 1), ''), 'there')),
    '{name}',       coalesce(nullif(trim(c.name), ''), 'there')),
    '{org}',        coalesce(nullif(trim(c.org), ''), 'your team')),
    '{role}',       coalesce(nullif(trim(c.role), ''), '')),
    '{city}',       coalesce(nullif(trim(c.city), ''), 'your city'));
$$;

-- Import many contacts at once. New emails are added; for an email we already have, only empty fields are filled
-- (nothing typed by the team is overwritten) and tags are merged. Rows without an email are added as new rows when
-- p_keep_no_email is true (for offices whose email we still need to find).
CREATE OR REPLACE FUNCTION public.contacts_import(p_rows jsonb, p_category text DEFAULT 'other', p_tags text[] DEFAULT '{}', p_keep_no_email boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $f$
DECLARE r jsonb; e text; cat text; added int := 0; updated int := 0; skipped int := 0; ex outreach_contacts;
BEGIN
  IF NOT can('outreach') THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  IF jsonb_array_length(coalesce(p_rows, '[]')) > 2000 THEN RAISE EXCEPTION 'At most 2000 rows at a time.'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p_rows, '[]')) LOOP
    e := nullif(lower(trim(coalesce(r->>'email', ''))), '');
    IF e IS NOT NULL AND (e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR length(e) > 200) THEN skipped := skipped + 1; CONTINUE; END IF;
    IF e IS NULL AND (NOT p_keep_no_email OR coalesce(trim(r->>'org'), '') || coalesce(trim(r->>'name'), '') = '') THEN skipped := skipped + 1; CONTINUE; END IF;
    cat := CASE WHEN r->>'category' IN ('college','fest','space','govt','sponsor','program','community','media','other') THEN r->>'category'
                WHEN p_category IN ('college','fest','space','govt','sponsor','program','community','media','other') THEN p_category ELSE 'other' END;
    ex := NULL;
    IF e IS NOT NULL THEN SELECT * INTO ex FROM outreach_contacts WHERE email = e; END IF;
    IF ex.id IS NULL THEN
      INSERT INTO outreach_contacts (name, org, role, email, phone, category, city, state, country, website, source, tags, notes)
      VALUES (left(coalesce(trim(r->>'name'), ''), 200), left(coalesce(trim(r->>'org'), ''), 200), left(coalesce(trim(r->>'role'), ''), 200), e,
              left(coalesce(trim(r->>'phone'), ''), 100), cat, left(coalesce(trim(r->>'city'), ''), 100), left(coalesce(trim(r->>'state'), ''), 100),
              left(coalesce(nullif(trim(r->>'country'), ''), 'India'), 100), left(coalesce(trim(r->>'website'), ''), 500), left(coalesce(trim(r->>'source'), ''), 500),
              coalesce(p_tags, '{}') || ARRAY(SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(r->'tags') = 'array' THEN r->'tags' ELSE '[]' END)),
              left(coalesce(trim(r->>'notes'), ''), 4000));
      added := added + 1;
    ELSE
      UPDATE outreach_contacts SET
        name = CASE WHEN name = '' THEN left(coalesce(trim(r->>'name'), ''), 200) ELSE name END,
        org = CASE WHEN org = '' THEN left(coalesce(trim(r->>'org'), ''), 200) ELSE org END,
        role = CASE WHEN role = '' THEN left(coalesce(trim(r->>'role'), ''), 200) ELSE role END,
        phone = CASE WHEN phone = '' THEN left(coalesce(trim(r->>'phone'), ''), 100) ELSE phone END,
        city = CASE WHEN city = '' THEN left(coalesce(trim(r->>'city'), ''), 100) ELSE city END,
        state = CASE WHEN state = '' THEN left(coalesce(trim(r->>'state'), ''), 100) ELSE state END,
        website = CASE WHEN website = '' THEN left(coalesce(trim(r->>'website'), ''), 500) ELSE website END,
        source = CASE WHEN source = '' THEN left(coalesce(trim(r->>'source'), ''), 500) ELSE source END,
        notes = CASE WHEN notes = '' THEN left(coalesce(trim(r->>'notes'), ''), 4000) ELSE notes END,
        tags = tags || coalesce(p_tags, '{}') || ARRAY(SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(r->'tags') = 'array' THEN r->'tags' ELSE '[]' END))
      WHERE id = ex.id;
      updated := updated + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('added', added, 'updated', updated, 'skipped', skipped);
END $f$;
REVOKE ALL ON FUNCTION public.contacts_import(jsonb, text, text[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contacts_import(jsonb, text, text[], boolean) TO authenticated;

-- Queue one bulk email to many contacts. Owners pick the outreach person it goes out as (p_as); everyone else sends as
-- themselves. Skipped: no email, marked Skip / Bounced / Not interested, already waiting in another bulk email, and
-- (p_skip_mailed) anyone emailed before.
CREATE OR REPLACE FUNCTION public.contacts_queue_send(p_ids uuid[], p_subject text, p_body text, p_as uuid DEFAULT NULL, p_name text DEFAULT '', p_skip_mailed boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $f$
DECLARE sender uuid; bid bigint; c outreach_contacts; n int := 0;
        no_email int := 0; opted int := 0; waiting int := 0; mailed int := 0; i int := 0;
BEGIN
  IF NOT can('outreach') THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  IF staff_role() = 'owner' AND p_as IS NOT NULL THEN sender := p_as; ELSE sender := auth.uid(); END IF;
  IF NOT EXISTS (SELECT 1 FROM outreach_people WHERE user_id = sender) THEN
    RAISE EXCEPTION 'Choose who the email goes out as (an outreach person with a cyberhx.com address).';
  END IF;
  IF coalesce(cardinality(p_ids), 0) = 0 THEN RAISE EXCEPTION 'Pick at least one contact.'; END IF;
  IF cardinality(p_ids) > 3000 THEN RAISE EXCEPTION 'At most 3000 contacts in one bulk email.'; END IF;
  IF length(trim(coalesce(p_subject, ''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Write a subject (up to 200 characters).'; END IF;
  IF length(trim(coalesce(p_body, ''))) NOT BETWEEN 1 AND 7500 THEN RAISE EXCEPTION 'Write the message (up to 7500 characters).'; END IF;

  INSERT INTO outreach_contact_batches (name, subject, body, sent_by_id)
  VALUES (left(coalesce(nullif(trim(p_name), ''), trim(p_subject)), 200), trim(p_subject), trim(p_body), sender)
  RETURNING id INTO bid;

  FOR c IN SELECT * FROM outreach_contacts WHERE id = ANY (p_ids) ORDER BY org, name LOOP
    IF c.email IS NULL THEN no_email := no_email + 1; CONTINUE; END IF;
    IF c.status IN ('skip','bounced','not_interested') THEN opted := opted + 1; CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM outreach_queue q WHERE q.contact_id = c.id AND q.status IN ('pending','sending')) THEN waiting := waiting + 1; CONTINUE; END IF;
    IF p_skip_mailed AND c.mail_count > 0 THEN mailed := mailed + 1; CONTINUE; END IF;
    INSERT INTO outreach_queue (lead_id, sent_by_id, to_emails, subject, body, contact_id, batch_id, not_before)
    VALUES (NULL, sender, ARRAY[c.email], left(contact_fill(trim(p_subject), c), 200), left(contact_fill(trim(p_body), c), 8000), c.id, bid,
            now() + make_interval(secs => i * 2));
    n := n + 1; i := i + 1;
  END LOOP;
  IF n = 0 THEN
    DELETE FROM outreach_contact_batches WHERE id = bid;
    bid := NULL;
  ELSE
    UPDATE outreach_contact_batches SET total = n WHERE id = bid;
  END IF;
  RETURN jsonb_build_object('batch_id', bid, 'queued', n, 'no_email', no_email, 'opted_out', opted, 'waiting', waiting, 'mailed_before', mailed);
END $f$;
REVOKE ALL ON FUNCTION public.contacts_queue_send(uuid[], text, text, uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contacts_queue_send(uuid[], text, text, uuid, text, boolean) TO authenticated;

-- Bulk emails with live counts. Owners see all; an outreach person sees the ones they created or that go out as them.
CREATE OR REPLACE FUNCTION public.contact_batches()
RETURNS TABLE (id bigint, name text, subject text, body text, sent_by_id uuid, sender text, send_as text, created_at timestamptz,
               total int, sent int, pending int, sending int, failed int, cancelled int, last_sent_at timestamptz, next_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $f$
BEGIN
  IF NOT can('outreach') THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT b.id, b.name, b.subject, b.body, b.sent_by_id, p.name, p.send_as, b.created_at, b.total,
         count(*) FILTER (WHERE q.status = 'sent')::int, count(*) FILTER (WHERE q.status = 'pending')::int,
         count(*) FILTER (WHERE q.status = 'sending')::int, count(*) FILTER (WHERE q.status = 'failed')::int,
         count(*) FILTER (WHERE q.status = 'cancelled')::int, max(q.sent_at), min(q.not_before) FILTER (WHERE q.status = 'pending')
    FROM outreach_contact_batches b
    LEFT JOIN outreach_people p ON p.user_id = b.sent_by_id
    LEFT JOIN outreach_queue q ON q.batch_id = b.id
   WHERE staff_role() = 'owner' OR b.created_by = auth.uid() OR b.sent_by_id = auth.uid()
   GROUP BY b.id, p.name, p.send_as
   ORDER BY b.created_at DESC
   LIMIT 200;
END $f$;
REVOKE ALL ON FUNCTION public.contact_batches() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contact_batches() TO authenticated;

-- Everyone in one bulk email and what happened to their email.
CREATE OR REPLACE FUNCTION public.contact_batch_rows(p_batch bigint)
RETURNS TABLE (id bigint, contact_id uuid, email text, name text, org text, status text, attempts int, last_error text, not_before timestamptz, sent_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $f$
BEGIN
  IF NOT can('outreach') OR NOT EXISTS (SELECT 1 FROM outreach_contact_batches b WHERE b.id = p_batch
       AND (staff_role() = 'owner' OR b.created_by = auth.uid() OR b.sent_by_id = auth.uid())) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT q.id, q.contact_id, q.to_emails[1], coalesce(c.name, ''), coalesce(c.org, ''), q.status, q.attempts, q.last_error, q.not_before, q.sent_at
    FROM outreach_queue q LEFT JOIN outreach_contacts c ON c.id = q.contact_id
   WHERE q.batch_id = p_batch
   ORDER BY CASE q.status WHEN 'failed' THEN 0 WHEN 'sending' THEN 1 WHEN 'pending' THEN 2 WHEN 'sent' THEN 3 ELSE 4 END, q.not_before, q.id;
END $f$;
REVOKE ALL ON FUNCTION public.contact_batch_rows(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contact_batch_rows(bigint) TO authenticated;

-- stop: waiting emails are cancelled · resume: cancelled ones wait again · retry: failed ones are tried again
CREATE OR REPLACE FUNCTION public.contact_batch_action(p_batch bigint, p_action text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $f$
DECLARE n int := 0;
BEGIN
  IF NOT can('outreach') OR NOT EXISTS (SELECT 1 FROM outreach_contact_batches b WHERE b.id = p_batch
       AND (staff_role() = 'owner' OR b.created_by = auth.uid() OR b.sent_by_id = auth.uid())) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_action = 'stop' THEN
    UPDATE outreach_queue SET status = 'cancelled', last_error = 'Stopped from Admin -> Contacts' WHERE batch_id = p_batch AND status = 'pending';
  ELSIF p_action = 'resume' THEN
    UPDATE outreach_queue q SET status = 'pending', not_before = now(), last_error = ''
     WHERE q.batch_id = p_batch AND q.status = 'cancelled'
       AND NOT EXISTS (SELECT 1 FROM outreach_queue o WHERE o.contact_id = q.contact_id AND o.id <> q.id AND o.status IN ('pending','sending'));
  ELSIF p_action = 'retry' THEN
    UPDATE outreach_queue SET status = 'pending', not_before = now(), attempts = 0, last_error = '' WHERE batch_id = p_batch AND status = 'failed';
  ELSE
    RAISE EXCEPTION 'Unknown action %', p_action;
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $f$;
REVOKE ALL ON FUNCTION public.contact_batch_action(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contact_batch_action(bigint, text) TO authenticated;

-- The queue's "done" step now also knows contacts: saves the sent mail with the contact, marks the contact Emailed,
-- and marks it Bounced when the address itself was refused.
CREATE OR REPLACE FUNCTION public.outreach_queue_done(p_secret text, p_results jsonb)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $f$
DECLARE r jsonb; q outreach_queue; p outreach_people; n int := 0;
BEGIN
  IF p_secret IS NULL OR p_secret IS DISTINCT FROM (SELECT value FROM app_secrets WHERE name = 'inbound') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p_results, '[]')) LOOP
    SELECT * INTO q FROM outreach_queue WHERE outreach_queue.id = (r->>'id')::bigint AND status = 'sending';
    IF NOT FOUND THEN CONTINUE; END IF;
    IF (r->>'ok')::boolean THEN
      SELECT * INTO p FROM outreach_people WHERE user_id = q.sent_by_id;
      UPDATE outreach_queue SET status = 'sent', sent_at = now(), last_error = '' WHERE outreach_queue.id = q.id;
      INSERT INTO outreach_mails (lead_id, contact_id, batch_id, to_emails, subject, body, message_ids, provider, from_email, cc_emails, sent_by_id, sent_by)
      VALUES (q.lead_id, q.contact_id, q.batch_id, q.to_emails, q.subject, q.body, ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'message_ids', '[]'))),
              'mailtrap', p.send_as, '{}', q.sent_by_id, p.name);
      IF q.lead_id IS NOT NULL THEN
        UPDATE outreach_leads SET status = CASE WHEN status = 'todo' THEN 'contacted' ELSE status END,
               last_contacted_at = now(), next_followup = (now() AT TIME ZONE 'Asia/Kolkata')::date + 4, updated_by = p.name, updated_at = now()
         WHERE outreach_leads.id = q.lead_id;
      END IF;
      IF q.contact_id IS NOT NULL THEN
        UPDATE outreach_contacts SET status = CASE WHEN status = 'new' THEN 'mailed' ELSE status END,
               mail_count = mail_count + 1, last_mailed_at = now(), updated_by = p.name
         WHERE outreach_contacts.id = q.contact_id;
      END IF;
      INSERT INTO mail_usage (provider, day, count) VALUES ('mailtrap', current_date, cardinality(q.to_emails) + 1)
        ON CONFLICT (provider, day) DO UPDATE SET count = mail_usage.count + EXCLUDED.count;
    ELSIF coalesce((r->>'retry_minutes')::int, 0) > 0 AND q.attempts < 8 THEN
      UPDATE outreach_queue SET status = 'pending', not_before = now() + make_interval(mins => least((r->>'retry_minutes')::int, 1500)),
             last_error = left(coalesce(r->>'error', ''), 500) WHERE outreach_queue.id = q.id;
    ELSE
      UPDATE outreach_queue SET status = 'failed', last_error = left(coalesce(r->>'error', 'failed'), 500) WHERE outreach_queue.id = q.id;
      IF q.contact_id IS NOT NULL AND coalesce(r->>'error', '') ~* '(recipient|invalid.{0,20}(email|address)|does not exist|bounced)' THEN
        UPDATE outreach_contacts SET status = 'bounced' WHERE outreach_contacts.id = q.contact_id AND status IN ('new','mailed');
      END IF;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $f$;
REVOKE ALL ON FUNCTION public.outreach_queue_done(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.outreach_queue_done(text, jsonb) TO anon, authenticated;

-- A reply from a contact's address: mark the contact Replied (the reply itself shows in Outreach -> Inbox).
CREATE OR REPLACE FUNCTION public.outreach_contacts_on_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE outreach_contacts SET status = CASE WHEN status IN ('new','mailed') THEN 'replied' ELSE status END,
         last_replied_at = now(), updated_by = 'email reply'
   WHERE email = lower(NEW.from_email);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.outreach_contacts_on_reply() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS outreach_contacts_on_reply ON public.outreach_replies;
CREATE TRIGGER outreach_contacts_on_reply AFTER INSERT ON public.outreach_replies
  FOR EACH ROW EXECUTE FUNCTION public.outreach_contacts_on_reply();
