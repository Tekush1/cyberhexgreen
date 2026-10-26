-- ============================================================
-- Security audit, 26 Oct 2026. Applied to the live database as migrations
-- security_audit_oct26 (part 1) and security_audit_oct26_revoke (part 2).
--   1. A single-use promo code can't pay for several orders (re-reserved before the money is taken).
--   2. Newsletter sign-ups only through /api/subscribe (honeypot + per-visitor limit), never straight
--      from the browser, and a sign-up can't pose as an admin import.
--   3. The public CTF-request form can't fake a "paid" order.
--   4. mail_filter_ok gets a fixed search_path.
-- ============================================================

-- ---------- 1. promo code: reserve again before capture ----------
-- Called by fulfill() (server/payments.ts) when an order's reserved use was given back because an
-- earlier checkout for it was closed or failed. True = the order may be paid at its discount.
CREATE OR REPLACE FUNCTION public.pay_reserve_again(p_secret text, p_rzp_order text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE o ctf_orders;
BEGIN
  PERFORM pay_check(p_secret);
  SELECT * INTO o FROM ctf_orders WHERE razorpay_order_id = p_rzp_order FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF o.status = 'paid' OR o.promo_code IS NULL OR o.promo_reserved THEN RETURN true; END IF;
  UPDATE ctf_promo_codes pc SET uses = pc.uses + 1
   WHERE pc.code = o.promo_code AND pc.active
     AND (pc.expires_at IS NULL OR pc.expires_at > now())
     AND (pc.max_uses IS NULL OR pc.uses < pc.max_uses);
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE ctf_orders SET promo_reserved = true WHERE id = o.id;
  RETURN true;
END $function$;
REVOKE ALL ON FUNCTION public.pay_reserve_again(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_reserve_again(text, text) TO anon;

-- ---------- 2. newsletter: server-only sign-up ----------
CREATE OR REPLACE FUNCTION public.mail_subscribe(p_secret text, p_email text, p_name text DEFAULT '', p_source text DEFAULT 'website')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  e   text := lower(trim(coalesce(p_email, '')));
  n   text := left(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:],;:<>"\\]+', ' ', 'g')), 120);
  src text := CASE WHEN p_source IN ('website', 'footer', 'blog', 'home', 'events', 'popup') THEN p_source ELSE 'website' END;
  cur mail_contacts%ROWTYPE;
BEGIN
  PERFORM pay_check(p_secret);
  IF e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR length(e) > 200 THEN RETURN 'invalid'; END IF;
  -- Flood guard: public sign-ups can't add more than 300 people an hour.
  IF (SELECT count(*) FROM mail_contacts
       WHERE source IN ('website', 'footer', 'blog', 'home', 'events', 'popup') AND created_at > now() - interval '1 hour') >= 300 THEN
    RETURN 'busy';
  END IF;
  SELECT * INTO cur FROM mail_contacts WHERE email = e;
  IF FOUND THEN
    -- Someone who unsubscribed is never re-subscribed by a form (only an admin can do that on request).
    IF NOT cur.subscribed AND cur.unsubscribed_at IS NOT NULL THEN RETURN 'unsubscribed'; END IF;
    UPDATE mail_contacts
       SET subscribed = true,
           name = CASE WHEN name = '' THEN n ELSE name END,
           tags = CASE WHEN 'subscriber' = ANY (tags) THEN tags ELSE tags || 'subscriber' END
     WHERE id = cur.id;
    RETURN 'ok';
  END IF;
  INSERT INTO mail_contacts (email, name, source, tags) VALUES (e, n, src, ARRAY['subscriber'])
  ON CONFLICT (email) DO NOTHING;
  RETURN 'ok';
END $function$;
REVOKE ALL ON FUNCTION public.mail_subscribe(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mail_subscribe(text, text, text, text) TO anon;

-- ---------- 3. public CTF requests can't pose as paid orders ----------
-- Only pay_mark_paid (server secret) writes "… paid" totals and the "PAID · payment" line.
DO $$
DECLARE cur text;
BEGIN
  SELECT with_check INTO cur FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'ctf_requests' AND policyname = 'ctf_requests_public_insert';
  IF cur IS NOT NULL AND cur !~ 'PAID · payment' THEN
    EXECUTE format(
      'ALTER POLICY ctf_requests_public_insert ON public.ctf_requests WITH CHECK ((%s) AND coalesce(order_total, '''') !~* ''paid'' AND coalesce(requirements, '''') !~* ''PAID · payment'')',
      cur);
  END IF;
END $$;

-- ---------- 4. fixed search_path ----------
ALTER FUNCTION public.mail_filter_ok(public.mail_contacts, jsonb) SET search_path = public, pg_temp;

-- ============================================================
-- Part 2: run AFTER the API that uses the new mail_subscribe is live.
-- The old 3-argument version (no secret) can no longer be called from outside.
-- ============================================================
-- REVOKE EXECUTE ON FUNCTION public.mail_subscribe(text, text, text) FROM PUBLIC, anon, authenticated;
