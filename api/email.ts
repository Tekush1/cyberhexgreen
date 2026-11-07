// Vercel serverless function: send a CyberHx email through Resend (admin only).
//
//   POST /api/email   (header `Authorization: Bearer <Supabase admin session token>`)
//        { template, to: string[] | recipients: [{ email, name, vars? }], vars: { name, title, start, end, meetLink, bookingLink, note, subject, body } }
//        team_voucher: shared vars { event, product, expires, redeemUrl, note }; each recipient's vars { team, rank, tier, code, discount }
//        -> { sent: number }
//   GET  /api/email?admin=log[&after=<id>]  -> { items: [{ id, to, subject, createdAt, lastEvent }], hasMore }
//        (needs a Resend key with Full access; opens/clicks need tracking turned on for the domain in Resend)
//
// Required env vars (Vercel -> Project -> Settings -> Environment Variables; NEVER commit them):
//   RESEND_API_KEY   your Resend API key (re_...)
//   RESEND_FROM      optional sender, default "CyberHx <team@mail.cyberhx.com>" (mail.cyberhx.com is verified in Resend)
//   Replies always go to mail@cyberhx.com (DEFAULT_REPLY_TO in server/mailer.ts)
// Plus the SUPABASE_URL / SUPABASE_ANON_KEY already used by api/interview.ts for the admin check.

import { TEMPLATES, MAX_FIELD, renderEmail, type TemplateId, type EmailVars } from '../shared/emailTemplates.js';
import { countUsage, DEFAULT_REPLY_TO, sendDirect, viaOrder, type ProviderId } from '../server/mailer.js';
import { canAny } from '../server/staff.js';
import crypto from 'node:crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 100; // Resend batch limit
const MAILTRAP_MAX = 20; // one Mailtrap call per email, 3 at a time: keep each request well inside the function time limit

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Per-team fields of a voucher email (each recipient carries its own team, rank and code). */
function voucherVars(raw: unknown): Partial<EmailVars> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const v = raw as Record<string, unknown>;
  const num = (x: unknown, lo: number, hi: number) => { const n = Math.round(Number(x)); return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined; };
  return {
    team: str(v.team, MAX_FIELD.team).trim(),
    code: str(v.code, MAX_FIELD.code).replace(/[^\w\-]/g, ''),
    rank: num(v.rank, 1, 10000),
    tier: num(v.tier, 1, 10000),
    discount: num(v.discount, 1, 100),
    tierLabel: str(v.tierLabel, 40).trim(),
    prize: str(v.prize, 120).trim(),
    members: num(v.members, 0, 50),
    special: v.special === true,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  // HR (Emails tab) and anyone who handles meetings (email button on booking links / sent history) may use this.
  if (!(await canAny(String(req.headers?.authorization || ''), ['emails', 'meetings', 'ctf']))) return res.status(401).json({ error: 'Unauthorized' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'Email is not set up yet: add RESEND_API_KEY in Vercel environment variables.' });

  // ----- Sent-email log (who got what, delivered / opened / clicked) -----
  if (req.method === 'GET') {
    const after = typeof req.query?.after === 'string' && /^[\w-]{1,80}$/.test(req.query.after) ? req.query.after : '';
    try {
      const r = await fetch(`https://api.resend.com/emails?limit=100${after ? `&after=${after}` : ''}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const restricted = r.status === 401 || r.status === 403 || /restricted|permission/i.test(String(data?.name || data?.message || ''));
        return res.status(500).json({
          error: restricted
            ? 'Your Resend API key can only send. To see the sent list, create a key with "Full access" in Resend and put it in RESEND_API_KEY.'
            : `Resend ${r.status}${data?.message ? ` - ${data.message}` : ''}`,
        });
      }
      const items = (Array.isArray(data?.data) ? data.data : []).map((e: any) => ({
        id: String(e.id || ''),
        to: Array.isArray(e.to) ? e.to : e.to ? [e.to] : [],
        subject: String(e.subject || ''),
        createdAt: e.created_at || null,
        lastEvent: String(e.last_event || 'sent'),
      }));
      return res.status(200).json({ items, hasMore: !!data?.has_more });
    } catch (e) {
      console.error('resend list failed', e);
      return res.status(500).json({ error: 'Could not reach the email service. Try again.' });
    }
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const template = String(body.template || '') as TemplateId;
  if (!TEMPLATES.some((t) => t.id === template)) return res.status(400).json({ error: 'Unknown template.' });

  // Either `recipients: [{ email, name }]` (each email gets its own name) or `to: string[]`.
  const seen = new Set<string>();
  const list: { email: string; name: string; own?: Partial<EmailVars> }[] = [];
  const raw: unknown[] = Array.isArray(body.recipients) ? body.recipients : Array.isArray(body.to) ? body.to : [];
  for (const x of raw) {
    const email = String(typeof x === 'object' && x ? (x as any).email : x).trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 200 || seen.has(email)) continue;
    seen.add(email);
    list.push({
      email,
      name: typeof x === 'object' && x ? str((x as any).name, MAX_FIELD.name).trim() : '',
      own: template === 'team_voucher' && typeof x === 'object' && x ? voucherVars((x as any).vars) : undefined,
    });
  }
  if (!list.length) return res.status(400).json({ error: 'Add at least one valid email address.' });
  if (list.length > MAX_RECIPIENTS) return res.status(400).json({ error: `At most ${MAX_RECIPIENTS} recipients at a time.` });
  const perName = Array.isArray(body.recipients);

  const v = body.vars || {};
  const vars: EmailVars = {
    name: list.length > 1 ? '' : str(v.name, MAX_FIELD.name),
    title: str(v.title, MAX_FIELD.title),
    start: str(v.start, 40) || null,
    end: str(v.end, 40) || null,
    meetLink: str(v.meetLink, MAX_FIELD.link) || null,
    bookingLink: str(v.bookingLink, MAX_FIELD.link),
    note: str(v.note, MAX_FIELD.note),
    subject: str(v.subject, MAX_FIELD.subject),
    body: str(v.body, MAX_FIELD.body),
    // Team voucher: shared settings (each team's own team / rank / code come per recipient)
    product: str(v.product, MAX_FIELD.product),
    event: str(v.event, MAX_FIELD.event),
    expires: /^\d{4}-\d{2}-\d{2}$/.test(String(v.expires || '')) ? String(v.expires) : '',
    redeemUrl: str(v.redeemUrl, MAX_FIELD.link),
    plain: v.plain === true,
    signer: str(v.signer, MAX_FIELD.name).trim(),
    color: /^#[0-9a-f]{6}$/i.test(String(v.color || '')) ? String(v.color) : '',
  };
  if (template === 'team_voucher' && list.some((r) => !r.own?.team || !r.own?.code || (!r.own?.discount && !r.own?.prize))) {
    return res.status(400).json({ error: 'Every email needs a name, a voucher code and a prize.' });
  }
  if (template === 'custom' && (!vars.subject?.trim() || !vars.body?.trim())) {
    return res.status(400).json({ error: 'Custom emails need a subject and a message.' });
  }

  const from = process.env.RESEND_FROM || 'CyberHx <team@mail.cyberhx.com>';
  const replyTo = DEFAULT_REPLY_TO; // all replies go to mail@cyberhx.com
  const shared = perName ? null : renderEmail(template, vars);

  // One email per person, so nobody sees the other recipients; each one greets that person by name.
  const batch = list.map(({ email, name, own }) => {
    const mail = shared || renderEmail(template, { ...vars, name, ...(own || {}) });
    return {
      from,
      to: [email],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    };
  });

  const auth = String(req.headers?.authorization || '');
  // Remember who got which email, so Admin -> Meetings can show it on each card. Never blocks the send.
  const logSent = async (rows: { to: string; subject: string; text: string; id: string | null }[], provider: string) => {
    try {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (url && anon && rows.length) {
        await fetch(`${url}/rest/v1/mail_log`, {
          method: 'POST',
          headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(rows.map((b) => ({
            email: b.to, template, subject: String(b.subject).slice(0, 300), body: String(b.text || '').slice(0, 8000), provider,
            message_id: b.id ? String(b.id).slice(0, 200) : null,
          }))),
        });
      }
    } catch (e) { console.error('mail_log insert failed', e); }
  };

  // Vouchers can go from mail@cyberhx.com (the main domain, through Mailtrap, the same setup Outreach uses)
  // instead of Resend's team@mail.cyberhx.com. Mail from the main domain, signed by a person, reads as a personal email.
  // Vouchers through any other mail service: 'auto' tries the Primary-friendly order, or a chosen service only.
  const via = String(body.via || (template === 'team_voucher' ? 'mail' : 'resend'));
  // Resend's daily limit is kept for PentestLab, so vouchers never go through Resend.
  if (template === 'team_voucher' && /^resend/.test(via)) {
    return res.status(400).json({ error: 'Vouchers are never sent through Resend (its limit is kept for PentestLab). Pick another mail service.' });
  }
  if (template === 'team_voucher' && via !== 'resend' && via !== 'mail') {
    const order: ProviderId[] | null = viaOrder(via).length ? viaOrder(via) : null;
    if (!order) return res.status(400).json({ error: 'Unknown mail service.' });
    if (list.length > MAILTRAP_MAX) return res.status(400).json({ error: `At most ${MAILTRAP_MAX} emails at a time.` });
    const fromName = vars.signer ? `${vars.signer} from CyberHx` : undefined;
    const results: { to: string; subject: string; text: string; id: string | null; provider?: ProviderId; error?: string }[] = [];
    const one = async (b: (typeof batch)[number]) => {
      const r = await sendDirect(order, { to: b.to[0], name: '', subject: b.subject, html: b.html, text: b.text, tracking: false, headers: { 'Message-ID': `<${crypto.randomUUID()}@cyberhx.com>` } }, fromName);
      results.push(r.ok
        ? { to: b.to[0], subject: b.subject, text: b.text, id: r.id || null, provider: r.provider }
        : { to: b.to[0], subject: b.subject, text: b.text, id: null, error: Object.entries(r.errors).map(([k, e]) => `${k}: ${e}`).join('; ').slice(0, 300) || 'Could not send.' });
    };
    for (let i = 0; i < batch.length; i += 3) await Promise.all(batch.slice(i, i + 3).map(one));
    const ok = results.filter((x) => !x.error);
    const failed = results.filter((x) => x.error);
    const used = new Map<ProviderId, typeof ok>();
    ok.forEach((x) => used.set(x.provider!, [...(used.get(x.provider!) || []), x]));
    for (const [pid, rows] of used) {
      await countUsage(auth, pid, rows.length);
      await logSent(rows, pid);
    }
    if (!ok.length) return res.status(500).json({ error: failed[0]?.error || 'Could not send.' });
    return res.status(200).json({ sent: ok.length, failed: failed.map((x) => x.to), reasons: Object.fromEntries(failed.map((x) => [x.to, x.error])), providers: Object.fromEntries([...used].map(([k, r]) => [k, r.length])) });
  }

  if (template === 'team_voucher' && via === 'mail') {
    const mtKey = process.env.MAILTRAP_API_KEY;
    if (!mtKey) return res.status(500).json({ error: 'Sending from mail@cyberhx.com is not set up: MAILTRAP_API_KEY is missing in Vercel.' });
    if (list.length > MAILTRAP_MAX) return res.status(400).json({ error: `At most ${MAILTRAP_MAX} emails at a time from mail@cyberhx.com.` });
    const MAIN = 'mail@cyberhx.com';
    const fromAddr = { email: MAIN, name: vars.signer ? `${vars.signer} from CyberHx` : 'CyberHx' };
    const results: { to: string; subject: string; text: string; id: string | null; error?: string }[] = [];
    const sendOne = async (b: (typeof batch)[number]) => {
      try {
        const r = await fetch('https://send.api.mailtrap.io/api/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${mtKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromAddr, to: [{ email: b.to[0] }], reply_to: { email: MAIN, name: 'CyberHx' },
            subject: b.subject, text: b.text, html: b.html, category: 'voucher',
            headers: { 'Message-ID': `<${crypto.randomUUID()}@cyberhx.com>` },
          }),
        });
        const d: any = await r.json().catch(() => ({}));
        if (!r.ok || d?.success === false) {
          results.push({ to: b.to[0], subject: b.subject, text: b.text, id: null, error: `Mailtrap ${r.status}${d?.errors ? ` - ${String([].concat(d.errors).join('; ')).slice(0, 200)}` : ''}` });
        } else results.push({ to: b.to[0], subject: b.subject, text: b.text, id: d?.message_ids?.[0] ? String(d.message_ids[0]) : null });
      } catch {
        results.push({ to: b.to[0], subject: b.subject, text: b.text, id: null, error: 'Could not reach Mailtrap.' });
      }
    };
    for (let i = 0; i < batch.length; i += 3) await Promise.all(batch.slice(i, i + 3).map(sendOne)); // 3 at a time
    const ok = results.filter((x) => !x.error);
    const failed = results.filter((x) => x.error);
    if (ok.length) {
      await countUsage(auth, 'mailtrap', ok.length);
      await logSent(ok, 'mailtrap');
    }
    if (!ok.length) return res.status(500).json({ error: failed[0]?.error || 'Could not send.' });
    return res.status(200).json({ sent: ok.length, failed: failed.map((x) => x.to), reasons: Object.fromEntries(failed.map((x) => [x.to, x.error])) });
  }

  try {
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('resend error', r.status, data);
      // 500, not 502: Cloudflare in front of cyberhx.com replaces 502 bodies with its own page.
      const detail = [data?.name, data?.message].filter(Boolean).join(': ');
      return res.status(500).json({ error: `Resend ${r.status}${detail ? ` - ${detail}` : ''}` });
    }
    await countUsage(auth, 'resend', list.length); // keeps Admin -> Campaigns usage honest
    await logSent(batch.map((b, i) => ({ to: b.to[0], subject: b.subject, text: b.text, id: data?.data?.[i]?.id ? String(data.data[i].id) : null })), 'resend');
    return res.status(200).json({ sent: list.length });
  } catch (e) {
    console.error('resend request failed', e);
    return res.status(500).json({ error: 'Could not reach the email service. Try again.' });
  }
}
