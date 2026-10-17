-- ============================================================
-- Security audit, 17 Oct 2026. ALREADY APPLIED to the live database
-- (migrations security_audit_oct17 + fix_pay_create_order_promo_var). Kept here as a record.
--
-- 1) post_likes (old, unused) was fully open: anyone could read, change or wipe it -> closed.
-- 2) ctf_requests / job_applications: strict email format on public inserts
--    (a crafted address like a@b.co?bcc=x could add hidden recipients to an admin's mailto reply).
-- 3) rate_hits + rate_hit(): per-IP limits for /api/pay, /api/subscribe and public meeting booking.
-- 4) Promo codes: a use is reserved atomically when the order is created (no race past max_uses,
--    no trusting the client's percent), given back when the payment fails or the window is closed,
--    and every failure returns the same "not valid" message (codes can't be probed).
-- 5) pay_* / rate_hit callable only by the server's anon key + secret, not by signed-in users.
-- The full function bodies are in the live database; see supabase/payments.sql for the originals.
-- ============================================================
ALTER POLICY public_like ON public.post_likes USING (false) WITH CHECK (false);
REVOKE ALL ON public.post_likes FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.rate_hits (
  bucket text NOT NULL, key text NOT NULL, win timestamptz NOT NULL, n int NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key, win)
);
ALTER TABLE public.rate_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctf_orders ADD COLUMN IF NOT EXISTS promo_reserved boolean NOT NULL DEFAULT false;
-- (rate_hit, pay_promo, pay_create_order, pay_mark_paid, pay_update: see the migration in the dashboard
--  under Database -> Migrations, or `select pg_get_functiondef('public.pay_create_order(text,jsonb)'::regprocedure)`.)

-- 17 Oct evening FIX: admin_notes defaults to '' on job_applications and form_submissions, so the
-- 14 Oct rule "admin_notes IS NULL" rejected every public application and contact message (14–17 Oct).
-- All three public insert rules now use coalesce(admin_notes, '') = ''. (Applied live as
-- migration fix_public_form_insert_admin_notes.)
