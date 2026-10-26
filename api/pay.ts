// Vercel serverless function: CTF checkout with Razorpay.
//
//   GET  /api/pay                                   -> { enabled, currency }  (is online payment switched on?)
//   POST /api/pay { action:'quote',  cart, currency, code? }                    -> price for the checkout
//   POST /api/pay { action:'create', cart, currency, code?, form, acceptTerms } -> Razorpay order to open
//   POST /api/pay { action:'verify', razorpay_order_id, razorpay_payment_id, razorpay_signature } -> { ref }
//   POST /api/pay { action:'failed', razorpay_order_id, reason }                -> logged for Admin → Payments
//
// The price is always worked out here from the cart (shared/ctfPricing.ts); the browser's numbers are ignored.

import crypto from 'node:crypto';
import { applyPercent, formatMinor, MIN_MINOR, priceCart, usdToInrMinor, type PayCurrency, type Priced } from '../shared/ctfPricing.js';
import { booking } from '../src/data/hosting.js';
import {
  allow, checkoutSignatureOk, clientIp, db, fulfill, fulfillFree, log, PayError, paymentsReady, razorpayKeyId, rzp, usdToInr,
} from '../server/payments.js';

// Strict: no spaces, ?, & or quotes (a crafted address must not add recipients to an admin's mailto reply).
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const LOGO_RE = /^logos\/[a-z0-9-]{8,80}\.(png|jpe?g|webp)$/;
const FORMATS = ['Online', 'Offline', 'Hybrid'];

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function countryOf(req: any): string | null {
  const c = req.headers?.['x-vercel-ip-country'];
  const v = Array.isArray(c) ? c[0] : c;
  return typeof v === 'string' && /^[A-Z]{2}$/.test(v) ? v : null;
}
const defaultCurrency = (req: any): PayCurrency => (countryOf(req) === 'IN' ? 'INR' : 'USD');
const pickCurrency = (req: any, v: unknown): PayCurrency => (v === 'INR' || v === 'USD' ? v : defaultCurrency(req));

interface Quote {
  priced: Priced;
  currency: PayCurrency;
  fxRate: number | null;
  listMinor: number;
  amountMinor: number;
  code: string | null;
  percentOff: number | null;
  codeError: string | null;
}

async function quote(req: any, body: any): Promise<Quote> {
  const priced = priceCart(body.cart);
  if (!priced) throw new PayError(400, 'That package is not available.');
  const currency = pickCurrency(req, body.currency);
  const usdMinor = Math.round(priced.totalUsd * 100);
  let fxRate: number | null = null;
  let listMinor = usdMinor;
  if (currency === 'INR') { fxRate = await usdToInr(); listMinor = usdToInrMinor(usdMinor, fxRate); }
  listMinor = Math.max(MIN_MINOR, listMinor);

  const raw = str(body.code, 40).toUpperCase();
  let code: string | null = null;
  let percentOff: number | null = null;
  let codeError: string | null = null;
  if (raw) {
    const r = await db<{ ok: boolean; code?: string; percent_off?: number; error?: string }>('pay_promo', { p_code: raw });
    if (r?.ok) { code = r.code!; percentOff = Number(r.percent_off); } else codeError = r?.error || 'That code is not valid.';
  }
  const amountMinor = percentOff ? applyPercent(listMinor, percentOff, currency) : listMinor;
  return { priced, currency, fxRate, listMinor, amountMinor, code, percentOff, codeError };
}

const quoteJson = (q: Quote) => ({
  currency: q.currency,
  list: q.listMinor,
  amount: q.amountMinor,
  listLabel: formatMinor(q.listMinor, q.currency),
  amountLabel: q.amountMinor === 0 ? 'Free' : formatMinor(q.amountMinor, q.currency),
  fxRate: q.fxRate,
  code: q.code,
  percentOff: q.percentOff,
  codeError: q.codeError,
  quoted: q.priced.quoted,
  totalUsd: q.priced.totalUsd,
});

const todayUtc = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
const isoPlus = (days: number) => new Date(todayUtc().getTime() + days * 86_400_000).toISOString().slice(0, 10);

function cleanForm(f: any, p: Priced) {
  const form = {
    name: str(f?.name, 200), email: str(f?.email, 200).toLowerCase(), phone: str(f?.phone, 40), organization: str(f?.organization, 200),
    eventName: str(f?.eventName, 200), eventDate: str(f?.eventDate, 10), finaleDate: str(f?.finaleDate, 10),
    startTime: str(f?.startTime, 5), timeZone: str(f?.timeZone, 60), eventFormat: str(f?.eventFormat, 20), location: str(f?.location, 200),
    participants: str(f?.participants, 60), eventTheme: str(f?.eventTheme, 200), message: str(f?.message, 5000), logoPath: str(f?.logoPath, 300),
  };
  const bad = (m: string) => { throw new PayError(400, m); };
  if (form.name.length < 2) bad('Enter your name.');
  if (!EMAIL_RE.test(form.email)) bad('Enter a valid email.');
  if (form.phone.replace(/\D/g, '').length < 6) bad('Enter a phone number.');
  if (form.organization.length < 2) bad('Enter your organization.');
  if (form.eventName.length < 2) bad('Enter the event name.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.eventDate) || form.eventDate < isoPlus(p.leadDays - 1) || form.eventDate > booking.lastDate) bad(`Pick an event date at least ${p.leadDays} days from today.`);
  if (p.split && (!/^\d{4}-\d{2}-\d{2}$/.test(form.finaleDate) || form.finaleDate <= form.eventDate)) bad('Pick a grand finale date after the qualifier.');
  if (!p.split) form.finaleDate = '';
  if (!/^\d{2}:\d{2}$/.test(form.startTime)) bad('Pick a start time.');
  if (!form.timeZone) bad('Pick a time zone.');
  if (!FORMATS.includes(form.eventFormat)) bad('Pick the event format.');
  if (form.eventFormat !== 'Online' && form.location.length < 2) bad('Enter the venue city and country.');
  if (!form.participants) bad('Pick the expected number of players.');
  if (!LOGO_RE.test(form.logoPath)) bad('Upload your CTF logo.');
  return form;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const ready = paymentsReady();

  if (req.method === 'GET') return res.status(200).json({ enabled: ready.ok, currency: defaultCurrency(req) });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ready.ok) return res.status(503).json({ error: 'Online payment is not switched on yet.' });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const action = String(body.action || '');
  const ip = clientIp(req);
  /** Per-IP limit for this action; throws 429 when it is exceeded. */
  const limit = async (n: number, seconds: number) => {
    if (!(await allow(`pay.${action}`, ip, n, seconds))) throw new PayError(429, 'Too many attempts. Please wait a few minutes and try again.');
  };
  /**
   * Every promo-code check (quote AND create) counts against the same limits: per visitor, and site-wide for
   * guessers that rotate IP addresses. These fail closed: no database, no code checks.
   */
  const codeGuard = async () => {
    if (!str(body.code, 40)) return;
    if (!(await allow('pay.code', ip, 15, 600, true)) || !(await allow('pay.code.all', '*', 200, 600, true)))
      throw new PayError(429, 'Too many attempts. Please wait a few minutes and try again.');
  };
  try {
    if (action === 'quote') {
      // Prices are public; only guessing promo codes is limited.
      await codeGuard();
      return res.status(200).json(quoteJson(await quote(req, body)));
    }

    if (action === 'create') {
      await limit(10, 600); // before anything reaches Razorpay
      await codeGuard();
      if (body.acceptTerms !== true) throw new PayError(400, 'Please agree to the Terms of Service to continue.');
      const q = await quote(req, body);
      if (q.priced.quoted) throw new PayError(400, 'Custom challenges are priced by quote, so this order cannot be paid online.');
      // The whole form is checked before the code, so a code can't be tested with an empty form
      // ("code not valid" vs "enter your name" would tell a guesser which codes exist).
      const f = cleanForm(body.form, q.priced);
      if (q.codeError) throw new PayError(400, q.codeError);
      const ref = `CHX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const free = q.amountMinor === 0;

      let rzpOrderId = `free_${ref}`;
      if (!free) {
        const o = await rzp<{ id: string }>('/orders', {
          amount: q.amountMinor,
          currency: q.currency,
          receipt: ref,
          notes: { ref, event: f.eventName.slice(0, 200), email: f.email, ...(q.code ? { code: q.code } : {}) },
        });
        rzpOrderId = o.id;
      }
      await db('pay_create_order', {
        p_row: {
          ref, kind: q.priced.kind, title: q.priced.title, items: q.priced.lines, total_usd: q.priced.totalUsd,
          currency: q.currency, list_minor: q.listMinor, amount_minor: q.amountMinor, fx_rate: q.fxRate,
          promo_code: q.code, percent_off: q.percentOff, razorpay_order_id: rzpOrderId,
          name: f.name, email: f.email, phone: f.phone, organization: f.organization, event_name: f.eventName,
          event_date: f.eventDate, finale_date: f.finaleDate, start_time: f.startTime, time_zone: f.timeZone,
          event_format: f.eventFormat, location: f.location, participants: f.participants, theme: f.eventTheme,
          message: f.message, logo_path: f.logoPath, hours: q.priced.hours, finale_hours: q.priced.finaleHours,
        },
      });
      await log(ref, rzpOrderId, 'order.created', 'info', {
        amount: formatMinor(q.amountMinor, q.currency), usd: q.priced.totalUsd, email: f.email, event: f.eventName,
        ...(q.code ? { code: q.code, percentOff: q.percentOff } : {}), country: countryOf(req),
      });

      if (free) {
        await fulfillFree(rzpOrderId, q.code || '');
        return res.status(200).json({ free: true, ref });
      }
      return res.status(200).json({
        ref, order_id: rzpOrderId, amount: q.amountMinor, currency: q.currency, key_id: razorpayKeyId(),
        description: q.priced.title, amountLabel: formatMinor(q.amountMinor, q.currency),
      });
    }

    if (action === 'verify') {
      await limit(30, 600);
      const orderId = str(body.razorpay_order_id, 80);
      const paymentId = str(body.razorpay_payment_id, 80);
      const signature = str(body.razorpay_signature, 200);
      if (!orderId || !paymentId || !signature) throw new PayError(400, 'Missing payment details.');
      if (!checkoutSignatureOk(orderId, paymentId, signature)) {
        await log(null, orderId, 'payment.bad_signature', 'error', { paymentId });
        throw new PayError(400, 'Payment could not be verified.');
      }
      const r = await fulfill(orderId, paymentId, 'browser');
      return res.status(200).json({ ok: true, ref: r.order.ref });
    }

    if (action === 'failed') {
      await limit(30, 600);
      const orderId = str(body.razorpay_order_id, 80);
      if (!orderId) return res.status(200).json({ ok: true });
      const order = await db<{ ref: string; status: string; created_at: string } | null>('pay_get', { p_rzp_order: orderId });
      // Only the buyer's own fresh checkout can be reported (order ids are only shown to the buyer).
      if (!order || order.status === 'paid' || Date.now() - new Date(order.created_at).getTime() > 3 * 3_600_000) return res.status(200).json({ ok: true });
      const reason = str(body.reason, 300) || 'Payment failed';
      const dismissed = body.dismissed === true;
      await log(order.ref, orderId, dismissed ? 'checkout.closed' : 'payment.failed', dismissed ? 'info' : 'warn', {
        reason, code: str(body.code, 60) || null, step: str(body.step, 60) || null, paymentId: str(body.payment_id, 80) || null,
      });
      // Either way the reserved promo use goes back; a retry in the same window re-counts it when paid.
      await db('pay_update', { p_rzp_order: orderId, p_patch: dismissed ? { release_promo: true } : { status: 'failed', failure_reason: reason, release_promo: true } });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    if (e instanceof PayError) return res.status(e.status).json({ error: e.message });
    console.error('pay error', action, e);
    await log(null, str(body.razorpay_order_id, 80) || null, `error.${action || 'unknown'}`, 'error', { message: e instanceof Error ? e.message.slice(0, 300) : String(e) });
    return res.status(500).json({
      error: action === 'verify'
        ? 'Your payment went through but we could not confirm it here. It will be confirmed automatically in a few minutes; you will get a receipt by email.'
        : 'Something went wrong. Please try again in a minute.',
    });
  }
}
