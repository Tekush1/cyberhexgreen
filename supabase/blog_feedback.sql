-- ============================================================
-- Event feedback form (/blog/feedback), 1 Nov 2026.
-- Applied as migrations blog_feedback_form and pinaka_feedback_flag.
-- Feedback is saved in form_submissions with form = 'feedback', so it shows up in Admin -> Inbox.
-- Submitting returns the feedback flag from event_secrets.
--
-- THE FLAG IS NOT IN THIS FILE (this repo is public). To set or change it, run in the Supabase SQL editor:
--   INSERT INTO public.event_secrets (key, value) VALUES ('feedback_flag', 'CyberHx{...}')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- ============================================================
ALTER TABLE public.form_submissions
  DROP CONSTRAINT form_submissions_form_check,
  ADD CONSTRAINT form_submissions_form_check
    CHECK (form = ANY (ARRAY['contact','registration','mentor','session','partnership','feedback','other']));

-- Private key/value store for event secrets (CTF flags). Nobody outside the database can read it.
CREATE TABLE IF NOT EXISTS public.event_secrets (
  key   text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.event_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_secrets FROM PUBLIC, anon, authenticated;

-- Saves one event-feedback form (Admin -> Inbox) and returns the feedback flag.
-- The same email sending again gets the flag back without a second row.
CREATE OR REPLACE FUNCTION public.feedback_submit(p_name text, p_email text, p_data jsonb, p_message text DEFAULT '')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $function$
DECLARE
  n   text := left(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]+', ' ', 'g')), 200);
  e   text := lower(trim(coalesce(p_email, '')));
  ev  text := left(coalesce(p_data->>'event', ''), 80);
  flag text;
BEGIN
  IF length(n) < 2 THEN RAISE EXCEPTION 'Add your name.' USING ERRCODE = 'P0001'; END IF;
  IF length(e) > 200 OR e !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Add a valid email.' USING ERRCODE = 'P0001';
  END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' OR pg_column_size(p_data) > 8000 THEN
    RAISE EXCEPTION 'Something is wrong with the form. Reload the page and try again.' USING ERRCODE = 'P0001';
  END IF;
  IF length(coalesce(p_data->>'favourite_challenge', '')) < 2 OR coalesce(p_data->>'ui', '') !~ '^[1-5]/5'
     OR coalesce(p_data->>'more_events', '') NOT IN ('Yes', 'Maybe', 'No') THEN
    RAISE EXCEPTION 'Answer the three questions first.' USING ERRCODE = 'P0001';
  END IF;

  SELECT value INTO flag FROM event_secrets WHERE key = 'feedback_flag';

  -- Already sent feedback for this event: give the flag again, don't store a duplicate.
  IF EXISTS (SELECT 1 FROM form_submissions WHERE form = 'feedback' AND email = e AND data->>'event' = ev) THEN
    RETURN flag;
  END IF;
  -- Flood guard for the whole form.
  IF (SELECT count(*) FROM form_submissions WHERE form = 'feedback' AND created_at > now() - interval '10 minutes') >= 400 THEN
    RAISE EXCEPTION 'Too many people are sending feedback right now. Try again in a few minutes.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO form_submissions (form, name, email, subject, message, page, data, status)
  VALUES ('feedback', n, e, left('Feedback · ' || coalesce(nullif(p_data->>'event_name', ''), 'Event'), 300),
          left(coalesce(p_message, ''), 5000), '/blog/feedback', p_data, 'new');
  RETURN flag;
END $function$;

REVOKE ALL ON FUNCTION public.feedback_submit(text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feedback_submit(text, text, jsonb, text) TO anon, authenticated;

-- 4 Nov 2026 (migration company_form): /companies applications are saved with form = 'company'.
ALTER TABLE public.form_submissions
  DROP CONSTRAINT form_submissions_form_check,
  ADD CONSTRAINT form_submissions_form_check
    CHECK (form = ANY (ARRAY['contact','registration','mentor','session','partnership','feedback','company','other']));
