-- ============================================================
-- CTF checkout payments (Razorpay) — run once in Supabase → SQL Editor → Run.
--
--   ctf_orders     every checkout: created → paid / failed. A paid order also becomes a
--                  "scheduled" row in CTF Requests and an entry in the team calendar.
--   promo_codes    percent-off codes, managed in Admin → Payments.
--   payment_logs   everything that happened (order created, paid, failed, receipt mailed …).
--   ctf-logos      storage bucket for the CTF logo the buyer uploads at checkout.
--
-- The website's server has no service-role key. It writes through the pay_* functions below,
-- which only work with the secret stored in app_secrets. The LAST query of this file prints
-- that secret: put it in Vercel as PAYMENTS_DB_SECRET.
-- Safe to run again.
-- ============================================================

-- ---------- server secret ----------
CREATE TABLE IF NOT EXISTS public.app_secrets (
  name  text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;          -- no policies: nobody reads it over the API
INSERT INTO public.app_secrets (name, value)
VALUES ('payments', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.pay_check(p_secret text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_secret IS NULL OR p_secret IS DISTINCT FROM (SELECT value FROM app_secrets WHERE name = 'payments') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
END $$;

-- ---------- team roles: Payments tab for owners and event managers ----------
CREATE OR REPLACE FUNCTION public.can(p_area text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE staff_role()
    WHEN 'owner'    THEN true
    WHEN 'hr'       THEN p_area IN ('applications','meetings','availability','emails')
    WHEN 'campaign' THEN p_area IN ('campaigns','subscribers','blog')
    WHEN 'event'    THEN p_area IN ('ctf','inbox','meetings','campaigns','payments')
    ELSE false END;
$$;

-- ---------- tables ----------
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE CHECK (code = upper(code) AND code ~ '^[A-Z0-9_-]{3,40}$'),
  percent_off numeric(5,2) NOT NULL CHECK (percent_off > 0 AND percent_off <= 100),
  max_uses    int CHECK (max_uses IS NULL OR max_uses > 0),
  uses        int NOT NULL DEFAULT 0,
  expires_at  timestamptz,
  active      boolean NOT NULL DEFAULT true,
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ctf_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref                 text NOT NULL UNIQUE,                 -- CHX-XXXXXX, shown to the buyer
  status              text NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed','refunded')),
  kind                text NOT NULL,                        -- hosting / prebuilt / build
  title               text NOT NULL,
  items               jsonb NOT NULL DEFAULT '[]',          -- [{label, usd}]
  total_usd           numeric(10,2) NOT NULL,
  currency            text NOT NULL CHECK (currency IN ('INR','USD')),
  list_minor          int NOT NULL,                         -- before the code, in paise / cents
  amount_minor        int NOT NULL,                         -- what was charged
  fx_rate             numeric(10,4),
  promo_code          text,
  percent_off         numeric(5,2),
  razorpay_order_id   text NOT NULL UNIQUE,
  razorpay_payment_id text,
  payment_method      text,
  failure_reason      text,
  name text NOT NULL, email text NOT NULL, phone text NOT NULL DEFAULT '', organization text NOT NULL DEFAULT '',
  event_name text NOT NULL, event_date text NOT NULL, finale_date text NOT NULL DEFAULT '',
  start_time text NOT NULL DEFAULT '', time_zone text NOT NULL DEFAULT '', event_format text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '', participants text NOT NULL DEFAULT '', theme text NOT NULL DEFAULT '', message text NOT NULL DEFAULT '',
  logo_path           text NOT NULL DEFAULT '',
  hours               int NOT NULL DEFAULT 8,
  finale_hours        int NOT NULL DEFAULT 0,
  ctf_request_id      uuid,
  calendar_event_id   text,
  receipt_provider    text,
  receipt_sent_at     timestamptz,
  admin_notes         text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  paid_at             timestamptz
);
CREATE INDEX IF NOT EXISTS ctf_orders_created_idx ON public.ctf_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS ctf_orders_email_idx   ON public.ctf_orders (email, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_logs (
  id                bigserial PRIMARY KEY,
  at                timestamptz NOT NULL DEFAULT now(),
  ref               text,
  razorpay_order_id text,
  event             text NOT NULL,          -- order.created, payment.verified, payment.failed, receipt.sent, …
  level             text NOT NULL DEFAULT 'info' CHECK (level IN ('info','warn','error')),
  detail            jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS payment_logs_at_idx ON public.payment_logs (at DESC);

ALTER TABLE public.ctf_requests ADD COLUMN IF NOT EXISTS order_id    text;
ALTER TABLE public.ctf_requests ADD COLUMN IF NOT EXISTS order_total text;
ALTER TABLE public.ctf_requests ADD COLUMN IF NOT EXISTS order_items text;

-- ---------- who can read what ----------
ALTER TABLE public.promo_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctf_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promo_codes_admin  ON public.promo_codes;
DROP POLICY IF EXISTS ctf_orders_admin_r ON public.ctf_orders;
DROP POLICY IF EXISTS ctf_orders_admin_u ON public.ctf_orders;
DROP POLICY IF EXISTS payment_logs_admin ON public.payment_logs;
CREATE POLICY promo_codes_admin  ON public.promo_codes  FOR ALL    TO authenticated USING ((SELECT public.can('payments'))) WITH CHECK ((SELECT public.can('payments')));
CREATE POLICY ctf_orders_admin_r ON public.ctf_orders   FOR SELECT TO authenticated USING ((SELECT public.can('payments')));
CREATE POLICY ctf_orders_admin_u ON public.ctf_orders   FOR UPDATE TO authenticated USING ((SELECT public.can('payments'))) WITH CHECK ((SELECT public.can('payments')));
CREATE POLICY payment_logs_admin ON public.payment_logs FOR SELECT TO authenticated USING ((SELECT public.can('payments')));

-- ---------- server functions (need the secret) ----------
CREATE OR REPLACE FUNCTION public.pay_log(p_secret text, p_ref text, p_rzp_order text, p_event text, p_level text, p_detail jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pay_check(p_secret);
  INSERT INTO payment_logs (ref, razorpay_order_id, event, level, detail)
  VALUES (left(p_ref, 40), left(p_rzp_order, 60), left(p_event, 60),
          CASE WHEN p_level IN ('info','warn','error') THEN p_level ELSE 'info' END, coalesce(p_detail, '{}'));
END $$;

-- Is this promo code usable right now? Never lists codes.
CREATE OR REPLACE FUNCTION public.pay_promo(p_secret text, p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c promo_codes;
BEGIN
  PERFORM pay_check(p_secret);
  SELECT * INTO c FROM promo_codes WHERE code = upper(trim(coalesce(p_code, '')));
  IF NOT FOUND OR NOT c.active THEN RETURN jsonb_build_object('ok', false, 'error', 'That code is not valid.'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'That code has expired.'); END IF;
  IF c.max_uses IS NOT NULL AND c.uses >= c.max_uses THEN RETURN jsonb_build_object('ok', false, 'error', 'That code has been fully used.'); END IF;
  RETURN jsonb_build_object('ok', true, 'code', c.code, 'percent_off', c.percent_off);
END $$;

CREATE OR REPLACE FUNCTION public.pay_create_order(p_secret text, p_row jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oid uuid; e text := lower(trim(p_row->>'email'));
BEGIN
  PERFORM pay_check(p_secret);
  IF (SELECT count(*) FROM ctf_orders WHERE email = e AND created_at > now() - interval '10 minutes') >= 8 THEN
    RAISE EXCEPTION 'Too many checkout attempts. Try again in a few minutes.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO ctf_orders (ref, kind, title, items, total_usd, currency, list_minor, amount_minor, fx_rate, promo_code, percent_off,
    razorpay_order_id, name, email, phone, organization, event_name, event_date, finale_date, start_time, time_zone,
    event_format, location, participants, theme, message, logo_path, hours, finale_hours)
  VALUES (p_row->>'ref', p_row->>'kind', left(p_row->>'title', 200), coalesce(p_row->'items', '[]'), (p_row->>'total_usd')::numeric,
    p_row->>'currency', (p_row->>'list_minor')::int, (p_row->>'amount_minor')::int, nullif(p_row->>'fx_rate', '')::numeric,
    nullif(p_row->>'promo_code', ''), nullif(p_row->>'percent_off', '')::numeric,
    p_row->>'razorpay_order_id', left(p_row->>'name', 200), e, left(coalesce(p_row->>'phone', ''), 40), left(coalesce(p_row->>'organization', ''), 200),
    left(p_row->>'event_name', 200), left(p_row->>'event_date', 20), left(coalesce(p_row->>'finale_date', ''), 20),
    left(coalesce(p_row->>'start_time', ''), 10), left(coalesce(p_row->>'time_zone', ''), 60), left(coalesce(p_row->>'event_format', ''), 20),
    left(coalesce(p_row->>'location', ''), 200), left(coalesce(p_row->>'participants', ''), 60), left(coalesce(p_row->>'theme', ''), 200),
    left(coalesce(p_row->>'message', ''), 5000), left(coalesce(p_row->>'logo_path', ''), 300),
    coalesce((p_row->>'hours')::int, 8), coalesce((p_row->>'finale_hours')::int, 0))
  RETURNING id INTO oid;
  RETURN oid;
END $$;

CREATE OR REPLACE FUNCTION public.pay_get(p_secret text, p_rzp_order text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pay_check(p_secret);
  RETURN (SELECT to_jsonb(o) FROM ctf_orders o WHERE razorpay_order_id = p_rzp_order);
END $$;

-- Marks the order paid exactly once and turns it into a scheduled CTF request ("the event").
CREATE OR REPLACE FUNCTION public.pay_mark_paid(p_secret text, p_rzp_order text, p_payment text, p_method text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o ctf_orders; req uuid; total text; lines text;
BEGIN
  PERFORM pay_check(p_secret);
  SELECT * INTO o FROM ctf_orders WHERE razorpay_order_id = p_rzp_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002'; END IF;
  IF o.status = 'paid' THEN RETURN jsonb_build_object('first', false, 'order', to_jsonb(o)); END IF;

  total := CASE o.currency WHEN 'INR' THEN '₹' || to_char(o.amount_minor / 100.0, 'FM999,999,990.00') ELSE '$' || to_char(o.amount_minor / 100.0, 'FM999,999,990.00') END
           || ' paid' || CASE WHEN o.promo_code IS NOT NULL THEN ' (code ' || o.promo_code || ')' ELSE '' END;
  SELECT string_agg((i->>'label') || ': ' || CASE WHEN i->>'usd' IS NULL THEN 'quote' ELSE '$' || (i->>'usd') END, E'\n') INTO lines
    FROM jsonb_array_elements(o.items) i;

  INSERT INTO ctf_requests (name, email, phone, organization, event_name, event_format, event_date, participants,
                            requirements, message, status, order_id, order_total, order_items)
  VALUES (o.name, o.email, o.phone, o.organization, o.event_name, o.event_format, o.event_date, o.participants,
          o.title || E'\n' || coalesce(lines, '') || E'\n\nPAID · payment ' || p_payment || CASE WHEN o.logo_path <> '' THEN E'\nLogo: ' || o.logo_path ELSE '' END,
          concat_ws(E'\n\n', nullif('Theme: ' || o.theme, 'Theme: '), nullif(o.message, '')),
          'scheduled', o.ref, total, lines)
  RETURNING id INTO req;

  UPDATE ctf_orders SET status = 'paid', razorpay_payment_id = p_payment, payment_method = left(p_method, 40),
         paid_at = now(), failure_reason = NULL, ctf_request_id = req
   WHERE id = o.id RETURNING * INTO o;
  IF o.promo_code IS NOT NULL THEN UPDATE promo_codes SET uses = uses + 1 WHERE code = o.promo_code; END IF;
  RETURN jsonb_build_object('first', true, 'order', to_jsonb(o));
END $$;

-- Small follow-up fields after payment (calendar entry, receipt) or a failure reason.
CREATE OR REPLACE FUNCTION public.pay_update(p_secret text, p_rzp_order text, p_patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pay_check(p_secret);
  UPDATE ctf_orders SET
    calendar_event_id = coalesce(p_patch->>'calendar_event_id', calendar_event_id),
    receipt_provider  = coalesce(p_patch->>'receipt_provider', receipt_provider),
    receipt_sent_at   = CASE WHEN p_patch ? 'receipt_provider' THEN now() ELSE receipt_sent_at END,
    failure_reason    = CASE WHEN status <> 'paid' AND p_patch ? 'failure_reason' THEN left(p_patch->>'failure_reason', 500) ELSE failure_reason END,
    status            = CASE WHEN status = 'created' AND p_patch->>'status' = 'failed' THEN 'failed'
                             WHEN status = 'failed'  AND p_patch->>'status' = 'created' THEN 'created' ELSE status END
  WHERE razorpay_order_id = p_rzp_order;
END $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.pay_check(text)', 'public.pay_log(text, text, text, text, text, jsonb)', 'public.pay_promo(text, text)',
    'public.pay_create_order(text, jsonb)', 'public.pay_get(text, text)', 'public.pay_mark_paid(text, text, text, text)',
    'public.pay_update(text, text, jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', f);
  END LOOP;
END $$;

-- ---------- CTF logo uploads ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ctf-logos', 'ctf-logos', true, 3145728, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS ctf_logos_public_upload ON storage.objects;
DROP POLICY IF EXISTS ctf_logos_admin_all     ON storage.objects;
-- Buyers can add a new file under logos/ (no listing, no overwrite, no delete). The bucket is public, so files open by URL.
CREATE POLICY ctf_logos_public_upload ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'ctf-logos' AND (storage.foldername(name))[1] = 'logos');
CREATE POLICY ctf_logos_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'ctf-logos' AND (SELECT public.can('payments')))
  WITH CHECK (bucket_id = 'ctf-logos' AND (SELECT public.can('payments')));

-- ---------- copy this value into Vercel as PAYMENTS_DB_SECRET ----------
SELECT value AS "PAYMENTS_DB_SECRET (copy into Vercel)" FROM public.app_secrets WHERE name = 'payments';
