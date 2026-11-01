-- ============================================================
-- Blog feedback form (/blog/feedback), 1 Nov 2026. Applied as migration blog_feedback_form.
-- Feedback is saved in form_submissions with form = 'feedback', so it shows up in Admin -> Inbox.
-- The existing public insert policy (security_hardening.sql) still limits every field's length.
-- ============================================================
ALTER TABLE public.form_submissions
  DROP CONSTRAINT form_submissions_form_check,
  ADD CONSTRAINT form_submissions_form_check
    CHECK (form = ANY (ARRAY['contact','registration','mentor','session','partnership','feedback','other']));
