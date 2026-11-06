-- ============================================================
-- Admin -> Vouchers: saved events (7 Nov 2026, migration voucher_events).
-- Each CTF keeps its own colour, product, redeem link, expiry, email style, mail service, signer, note
-- and prize tiers: [{ id, label, from, to, type: 'percent'|'custom', percent, prize, members }].
-- ============================================================
CREATE TABLE IF NOT EXISTS public.voucher_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  color       text NOT NULL DEFAULT '#c6f135' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  product     text NOT NULL DEFAULT 'CAPT certification',
  redeem_url  text NOT NULL DEFAULT 'https://pentestlab.cyberhx.com/capt' CHECK (redeem_url ~ '^https://'),
  expires     date,
  style       text NOT NULL DEFAULT 'plain' CHECK (style IN ('plain','designed')),
  sender      text NOT NULL DEFAULT 'mail' CHECK (length(sender) <= 20),
  signer      text NOT NULL DEFAULT '',
  note        text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  tiers       jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(tiers) = 'array'),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voucher_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voucher_events FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voucher_events TO authenticated;
CREATE POLICY voucher_events_staff ON public.voucher_events FOR ALL TO authenticated
  USING (public.can('ctf') OR public.can('emails')) WITH CHECK (public.can('ctf') OR public.can('emails'));
