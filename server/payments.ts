// CTF checkout payments through Razorpay (same approach as pentestlab.cyberhx.com).
//
// Env (Vercel → Settings → Environment Variables, never in code):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET   Razorpay → Account & Settings → API keys
//   RAZORPAY_WEBHOOK_SECRET                 the secret you type when adding the webhook (see PAYMENTS_SETUP.md)
//   PAYMENTS_DB_SECRET                      printed by supabase/payments.sql
//   PAYMENTS_NOTIFY_TO (optional)           where the team gets "new paid order" mail, default mail@cyberhx.com
//
// The server has no service-role key: every database write goes through the pay_* SQL functions,
// which only accept PAYMENTS_DB_SECRET.

import crypto from 'node:crypto';
import { esc, layout, textVersion } from '../shared/emailTemplates.js';
import { formatMinor, type PayCurrency } from '../shared/ctfPricing.js';
import { PRIMARY_LANE, sendDirect, type ProviderId } from './mailer.js';
import { CALENDAR_ID, calendarConfigured, gcal } from './google.js';

export class PayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const env = (k: string) => (process.env[k] || '').trim();
export const site = () => (env('SITE_URL') || 'https://cyberhx.com').replace(/\/+$/, '');
const sb = () => ({ url: env('SUPABASE_URL') || env('VITE_SUPABASE_URL'), anon: env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY') });

export function paymentsReady(): { ok: boolean; missing: string[] } {
  const missing = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'PAYMENTS_DB_SECRET'].filter((k) => !env(k));
  if (!sb().url || !sb().anon) missing.push('SUPABASE_URL / SUPABASE_ANON_KEY');
  return { ok: missing.length === 0, missing };
}
export const razorpayKeyId = () => env('RAZORPAY_KEY_ID');

/** The visitor's IP: Cloudflare's header first (the site sits behind Cloudflare), then Vercel's. */
export function clientIp(req: any): string {
  const h = (k: string) => { const v = req.headers?.[k]; return String(Array.isArray(v) ? v[0] : v || '').split(',')[0].trim(); };
  return (h('cf-connecting-ip') || h('x-real-ip') || h('x-forwarded-for') || 'unknown').slice(0, 64);
}

/**
 * Fixed-window rate limit kept in the database (rate_hit). Fails OPEN if the database can't be reached,
 * so a hiccup never blocks real buyers.
 */
export async function allow(bucket: string, key: string, limit: number, seconds: number): Promise<boolean> {
  try {
    return (await db<boolean>('rate_hit', { p_bucket: bucket, p_key: key, p_limit: limit, p_seconds: seconds })) !== false;
  } catch {
    return true;
  }
}

// ---------- database (pay_* functions) ----------
export async function db<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { url, anon } = sb();
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_secret: env('PAYMENTS_DB_SECRET'), ...args }),
  });
  const t = await r.text();
  if (!r.ok) {
    let j: any = null;
    try { j = JSON.parse(t); } catch { /* text */ }
    if (j?.code === 'PGRST202' || j?.code === '42883') throw new PayError(503, 'Payments are not set up yet (run supabase/payments.sql).');
    if (j?.code === '42501') throw new PayError(503, 'Payments are not set up yet (PAYMENTS_DB_SECRET does not match the database).');
    if (j?.code === 'P0001') throw new PayError(/^Too many/.test(String(j.message)) ? 429 : 400, String(j.message));
    throw new Error(`${fn}: ${(j?.message || t).slice(0, 300)}`);
  }
  return (t ? JSON.parse(t) : null) as T;
}

/** Payment log for Admin → Payments. Never throws. */
export async function log(ref: string | null, rzpOrder: string | null, event: string, level: 'info' | 'warn' | 'error', detail: Record<string, unknown> = {}) {
  try {
    await db('pay_log', { p_ref: ref, p_rzp_order: rzpOrder, p_event: event, p_level: level, p_detail: detail });
  } catch (e) {
    console.error('pay_log failed', event, e instanceof Error ? e.message : e);
  }
}

// ---------- Razorpay ----------
export async function rzp<T = any>(path: string, body?: object): Promise<T> {
  const auth = 'Basic ' + Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64');
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Razorpay ${r.status}: ${String(j?.error?.description || j?.error?.code || 'request failed').slice(0, 200)}`);
  return j as T;
}

export const hmacHex = (secret: string, body: string) => crypto.createHmac('sha256', secret).update(body).digest('hex');
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export const checkoutSignatureOk = (orderId: string, paymentId: string, signature: string) =>
  !!env('RAZORPAY_KEY_SECRET') && safeEqual(hmacHex(env('RAZORPAY_KEY_SECRET'), `${orderId}|${paymentId}`), signature);
export const webhookSecret = () => env('RAZORPAY_WEBHOOK_SECRET');

// ---------- USD → INR ----------
let rateCache: { rate: number; at: number } | null = null;
const saneRate = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 70 && n < 115;

export async function usdToInr(): Promise<number> {
  if (rateCache && Date.now() - rateCache.at < 3_600_000) return rateCache.rate;
  const sources: [string, (j: any) => unknown][] = [
    ['https://open.er-api.com/v6/latest/USD', (j) => j?.rates?.INR],
    ['https://api.frankfurter.app/latest?from=USD&to=INR', (j) => j?.rates?.INR],
  ];
  for (const [url, pick] of sources) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } }).finally(() => clearTimeout(t));
      const rate = pick(await r.json());
      if (saneRate(rate)) { rateCache = { rate, at: Date.now() }; return rate; }
    } catch { /* next source */ }
  }
  if (rateCache && Date.now() - rateCache.at < 86_400_000) return rateCache.rate;
  throw new PayError(503, 'Rupee pricing is unavailable right now. Pay in USD or try again in a few minutes.');
}

// ---------- order row (as stored by payments.sql) ----------
export interface OrderRow {
  id: string; ref: string; status: string; kind: string; title: string; items: { label: string; usd: number | null }[];
  total_usd: number; currency: PayCurrency; list_minor: number; amount_minor: number; promo_code: string | null; percent_off: number | null;
  razorpay_order_id: string; razorpay_payment_id: string | null; payment_method: string | null;
  name: string; email: string; phone: string; organization: string; event_name: string; event_date: string; finale_date: string;
  start_time: string; time_zone: string; event_format: string; location: string; participants: string; theme: string; message: string;
  logo_path: string; hours: number; finale_hours: number; paid_at: string | null; calendar_event_id: string | null; receipt_sent_at: string | null;
}

export const logoUrl = (path: string) => (path ? `${sb().url}/storage/v1/object/public/ctf-logos/${path.split('/').map(encodeURIComponent).join('/')}` : '');

/**
 * Confirms a payment with Razorpay (captures it if only authorised), marks the order paid exactly once,
 * then creates the event (CTF request + calendar entry) and mails the receipt. Safe to call twice:
 * the browser and the webhook can both arrive, only the first one does the follow-up work.
 */
export async function fulfill(rzpOrderId: string, paymentId: string, source: 'browser' | 'webhook') {
  const order = await db<OrderRow | null>('pay_get', { p_rzp_order: rzpOrderId });
  if (!order) throw new PayError(404, 'Order not found');
  if (order.status === 'paid') return { order, first: false };

  let payment: any = await rzp(`/payments/${encodeURIComponent(paymentId)}`);
  if (payment.order_id !== rzpOrderId) {
    await log(order.ref, rzpOrderId, 'payment.wrong_order', 'error', { paymentId, source });
    throw new PayError(400, 'This payment does not belong to this order.');
  }
  if (Number(payment.amount) !== order.amount_minor || payment.currency !== order.currency) {
    await log(order.ref, rzpOrderId, 'payment.amount_mismatch', 'error', { paymentId, paid: payment.amount, currency: payment.currency, expected: order.amount_minor, source });
    throw new PayError(400, 'Payment amount does not match the order.');
  }
  if (payment.status === 'authorized') {
    try {
      payment = await rzp(`/payments/${encodeURIComponent(paymentId)}/capture`, { amount: order.amount_minor, currency: order.currency });
    } catch (e) {
      // The webhook and the browser can capture at the same moment: look again before giving up.
      payment = await rzp(`/payments/${encodeURIComponent(paymentId)}`);
      if (payment.status !== 'captured') throw e;
    }
  }
  if (payment.status !== 'captured') {
    await log(order.ref, rzpOrderId, 'payment.not_captured', 'warn', { paymentId, status: payment.status, source });
    throw new PayError(402, `Payment not completed yet (status: ${payment.status}).`);
  }

  const res = await db<{ first: boolean; order: OrderRow }>('pay_mark_paid', { p_rzp_order: rzpOrderId, p_payment: paymentId, p_method: String(payment.method || '') });
  if (res.first) {
    await log(res.order.ref, rzpOrderId, 'payment.paid', 'info', {
      paymentId, source, method: payment.method || null, amount: formatMinor(res.order.amount_minor, res.order.currency), email: res.order.email,
    });
    await afterPaid(res.order);
  }
  return res;
}

/** Free order (a 100% code): no Razorpay, straight to paid. */
export async function fulfillFree(rzpOrderId: string, code: string) {
  const res = await db<{ first: boolean; order: OrderRow }>('pay_mark_paid', { p_rzp_order: rzpOrderId, p_payment: `promo:${code}`, p_method: 'promo code' });
  if (res.first) {
    await log(res.order.ref, rzpOrderId, 'payment.paid', 'info', { source: 'promo', code, amount: formatMinor(0, res.order.currency), email: res.order.email });
    await afterPaid(res.order);
  }
  return res;
}

// ---------- after payment: event, receipt, team mail ----------
const pad = (n: number) => String(n).padStart(2, '0');
/** "2026-11-20" + "18:00" + 8h → local "2026-11-21T02:00:00" (no time-zone maths: Google gets the zone separately). */
function addHours(date: string, time: string, hours: number) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (/^\d{2}:\d{2}$/.test(time) ? time : '10:00').split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm) + hours * 3_600_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:00`;
}
const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const zoneLabel = (z: string) => z.replace(/_/g, ' ');

async function createCalendarEvents(o: OrderRow): Promise<string | null> {
  if (!calendarConfigured()) { await log(o.ref, o.razorpay_order_id, 'calendar.skipped', 'warn', { reason: 'Google Calendar is not connected' }); return null; }
  const rounds = [
    { label: o.finale_date ? 'Qualifier' : 'CTF', date: o.event_date, hours: o.hours || 8 },
    ...(o.finale_date ? [{ label: 'Grand finale', date: o.finale_date, hours: o.finale_hours || 8 }] : []),
  ];
  const ids: string[] = [];
  for (const r of rounds) {
    try {
      const ev = await gcal(`/calendars/${encodeURIComponent(CALENDAR_ID())}/events`, {
        method: 'POST',
        body: JSON.stringify({
          summary: `${r.label}: ${o.event_name} (${o.organization || o.name}) · PAID ${o.ref}`,
          description: [
            `Order ${o.ref} · ${formatMinor(o.amount_minor, o.currency)} paid${o.promo_code ? ` (code ${o.promo_code})` : ''}`,
            `Buyer: ${o.name} <${o.email}> ${o.phone}`,
            `Organization: ${o.organization}`,
            `Format: ${o.event_format}${o.location ? ` · ${o.location}` : ''} · Players: ${o.participants}`,
            '', o.title, ...o.items.map((l) => `• ${l.label}: ${l.usd === null ? 'quote' : `$${l.usd}`}`),
            o.theme ? `\nTheme: ${o.theme}` : null, o.message ? `Notes: ${o.message}` : null,
            o.logo_path ? `\nLogo: ${logoUrl(o.logo_path)}` : null,
          ].filter((x) => typeof x === 'string').join('\n'),
          start: { dateTime: addHours(r.date, o.start_time, 0), timeZone: o.time_zone || 'Asia/Kolkata' },
          end: { dateTime: addHours(r.date, o.start_time, r.hours), timeZone: o.time_zone || 'Asia/Kolkata' },
          transparency: 'transparent', // does not block meeting slots
          colorId: '10',
          extendedProperties: { private: { ctfOrder: o.ref } },
        }),
      });
      ids.push(String(ev.id));
    } catch (e) {
      await log(o.ref, o.razorpay_order_id, 'calendar.failed', 'error', { round: r.label, error: e instanceof Error ? e.message : String(e) });
    }
  }
  if (ids.length) await log(o.ref, o.razorpay_order_id, 'calendar.created', 'info', { events: ids.length });
  return ids.join(',') || null;
}

export function receiptEmail(o: OrderRow, paymentId: string) {
  const paid = formatMinor(o.amount_minor, o.currency);
  const when = `${prettyDate(o.event_date)}${o.start_time ? `, ${o.start_time}` : ''} (${zoneLabel(o.time_zone)})`;
  const details: [string, string][] = [
    ['Order', o.ref],
    ['Paid', `${paid}${o.promo_code ? ` (code ${o.promo_code}, ${Number(o.percent_off)}% off ${formatMinor(o.list_minor, o.currency)})` : ''}`],
    ['Payment ID', paymentId],
    ['Package', o.title],
    ['Event', o.event_name],
    [o.finale_date ? 'Qualifier' : 'Date', when],
    ...(o.finale_date ? [['Grand finale', `${prettyDate(o.finale_date)}${o.start_time ? `, ${o.start_time}` : ''}`] as [string, string]] : []),
    ['Players', o.participants],
  ];
  const L = {
    plain: true,
    preheader: `Payment received for ${o.event_name}`,
    eyebrow: 'Payment receipt',
    heading: `Payment received: ${o.event_name}`,
    paragraphs: [
      `Hi ${o.name.split(/\s+/)[0] || 'there'},`,
      `Thank you! We have received your payment of ${paid} for ${o.event_name}. This email is your receipt.`,
      'What happens next: our team confirms your date within one business day, builds and tests your challenges, and sends your host dashboard login before the event.',
    ],
    details,
    note: [
      'Items:',
      ...o.items.map((l) => `• ${l.label}${l.usd === null ? '' : ` ($${l.usd})`}`),
      '',
      'Questions? Just reply to this email.',
    ].join('\n'),
  };
  return {
    subject: `Receipt ${o.ref}: ${paid} paid for ${o.event_name}`,
    html: layout(L),
    text: textVersion(L),
  };
}

function teamEmail(o: OrderRow) {
  const paid = formatMinor(o.amount_minor, o.currency);
  const rows: [string, string][] = [
    ['Order', o.ref], ['Paid', `${paid}${o.promo_code ? ` (code ${o.promo_code})` : ''}`], ['Payment', o.razorpay_payment_id || ''],
    ['Buyer', `${o.name} · ${o.email} · ${o.phone}`], ['Organization', o.organization], ['Event', o.event_name],
    ['Date', `${o.event_date} ${o.start_time} (${o.time_zone})${o.finale_date ? ` · finale ${o.finale_date}` : ''}`],
    ['Format', `${o.event_format}${o.location ? ` · ${o.location}` : ''}`], ['Players', o.participants], ['Package', o.title],
  ];
  const logo = logoUrl(o.logo_path);
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222">
<p><b>New paid CTF order ${esc(o.ref)}</b>: ${esc(paid)} for ${esc(o.event_name)}.</p>
<table cellpadding="4" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#777">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<p>${o.items.map((l) => `• ${esc(l.label)}: ${l.usd === null ? 'quote' : `$${l.usd}`}`).join('<br>')}</p>
${o.theme ? `<p>Theme: ${esc(o.theme)}</p>` : ''}${o.message ? `<p>Notes: ${esc(o.message)}</p>` : ''}
${logo ? `<p>Logo: <a href="${esc(logo)}">${esc(logo)}</a></p>` : ''}
<p>It is in Admin → Payments and in CTF Requests (status Scheduled).</p></div>`;
  const text = `New paid CTF order ${o.ref}: ${paid} for ${o.event_name}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${o.items.map((l) => `• ${l.label}`).join('\n')}${logo ? `\n\nLogo: ${logo}` : ''}`;
  return { subject: `💳 Paid CTF order ${o.ref}: ${paid} · ${o.event_name}`, html, text };
}

/** Receipts go through Sender first (as asked), then any other connected service so the buyer always gets one. */
// Receipts matter more than campaigns: Resend is the last resort if every campaign service is full.
const RECEIPT_ORDER: ProviderId[] = ['sender', ...PRIMARY_LANE.filter((p) => p !== 'sender'), 'resend'];

async function afterPaid(o: OrderRow) {
  const calendarIds = await createCalendarEvents(o);
  if (calendarIds) await db('pay_update', { p_rzp_order: o.razorpay_order_id, p_patch: { calendar_event_id: calendarIds } }).catch(() => undefined);

  const r = receiptEmail(o, o.razorpay_payment_id || '');
  const sent = await sendDirect(RECEIPT_ORDER, { to: o.email, name: o.name, subject: r.subject, html: r.html, text: r.text, tracking: false }, 'CyberHx');
  if (sent.ok) {
    await log(o.ref, o.razorpay_order_id, 'receipt.sent', sent.provider === 'sender' ? 'info' : 'warn', {
      to: o.email, provider: sent.provider, ...(sent.provider !== 'sender' ? { senderError: sent.errors.sender || 'not used' } : {}),
    });
    await db('pay_update', { p_rzp_order: o.razorpay_order_id, p_patch: { receipt_provider: sent.provider } }).catch(() => undefined);
  } else {
    await log(o.ref, o.razorpay_order_id, 'receipt.failed', 'error', { to: o.email, errors: sent.errors });
  }

  const t = teamEmail(o);
  const team = await sendDirect([...PRIMARY_LANE, 'resend'], { to: env('PAYMENTS_NOTIFY_TO') || 'mail@cyberhx.com', name: 'CyberHx team', ...t, tracking: false }, 'CyberHx Payments');
  await log(o.ref, o.razorpay_order_id, team.ok ? 'team.notified' : 'team.notify_failed', team.ok ? 'info' : 'warn', team.ok ? { provider: team.provider } : { errors: team.errors });
}
