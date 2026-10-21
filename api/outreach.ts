// Vercel serverless function: Admin → Outreach (owners and the 'outreach' role).
//
//   POST /api/outreach  { action:'send', leadId, to: string[], subject, body }
//        Sends ONE plain, personal-looking email (all of the lead's addresses on it) through Resend,
//        replies go to mail@cyberhx.com AND to the staff member who sent it, then saves it in outreach_mails.
//        -> { ok: true, id, mail }
//   GET  /api/outreach?status=<resend id>,<resend id>...   -> { status: { [id]: 'delivered' | 'opened' | ... } }
//   POST /api/outreach  (header x-inbound-secret, body = the raw email)  <- Cloudflare Email Worker on mail@cyberhx.com
//        Parses the reply and hands it to public.outreach_inbound(), which keeps it only if it came from a lead.
//        See supabase/outreach_replies.sql and scripts/cloudflare-email-worker.js.
//
// Env: RESEND_API_KEY / SENDER_API_KEY (+ optional OUTREACH_FROM, default mail@cyberhx.com; RESEND_FROM = fallback), SUPABASE_URL / SUPABASE_ANON_KEY. Never commit keys.

import { canAny } from '../server/staff.js';
import { countUsage, DEFAULT_REPLY_TO, rpc } from '../server/mailer.js';
import { allow } from '../server/payments.js';
import PostalMime from 'postal-mime';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Plain text -> simple HTML: paragraphs, line breaks, clickable links. Looks like a normal person-to-person email. */
function toHtml(text: string) {
  const linkify = (s: string) => s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, (u) => `<a href="${u}" style="color:#0a66c2">${u}</a>`);
  const paras = text.split(/\n\s*\n/).map((p) => `<p style="margin:0 0 14px">${linkify(esc(p.trim())).replace(/\n/g, '<br>')}</p>`);
  return `<!doctype html><html><body style="margin:0;padding:0"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1d1d1f;max-width:620px;padding:8px 4px">${paras.join('')}</div></body></html>`;
}

/** Drops the quoted earlier conversation ("On Mon, X wrote:" and the "> ..." lines under it). */
function stripQuoted(t: string) {
  const lines = t.replace(/\r\n/g, '\n').split('\n');
  const cut = lines.findIndex((l, i) =>
    /^\s*On .{4,200}wrote:\s*$/i.test(l) || (/^\s*On .{4,200}$/i.test(l) && /wrote:\s*$/i.test(lines[i + 1] || '')) ||
    /^-{2,}\s*Original Message\s*-{2,}/i.test(l) || /^_{10,}$/.test(l.trim()) || /^From:\s.+/i.test(l) && /^(Sent|Date):\s/i.test(lines[i + 1] || ''));
  const kept = (cut > 0 ? lines.slice(0, cut) : lines).filter((l, i, a) => !(l.startsWith('>') && a.slice(i).every((x) => x.startsWith('>') || !x.trim())));
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
const htmlToText = (h: string) => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function inbound(req: any, res: any) {
  const secret = String(req.headers['x-inbound-secret'] || '');
  let raw: string = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!raw && req.readable) {
    raw = await new Promise<string>((ok, bad) => { const c: Buffer[] = []; req.on('data', (d: Buffer) => c.push(d)); req.on('end', () => ok(Buffer.concat(c).toString('utf8'))); req.on('error', bad); });
  }
  if (!raw) return res.status(400).json({ error: 'empty' });
  let m: any;
  try { m = await PostalMime.parse(raw); } catch { return res.status(400).json({ error: 'unreadable email' }); }
  const from = String(m?.from?.address || req.headers['x-mail-from'] || '').toLowerCase();
  const text = stripQuoted(String(m?.text || (m?.html ? htmlToText(m.html) : '') || '')).slice(0, 20000);
  try {
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    const r = await rpc<{ stored: boolean; reason?: string }>(`Bearer ${anon}`, 'outreach_inbound', {
      p_secret: secret, p_from: from, p_from_name: String(m?.from?.name || '').slice(0, 200),
      p_to: String(req.headers['x-mail-to'] || m?.to?.[0]?.address || ''), p_subject: String(m?.subject || '').slice(0, 300),
      p_body: text, p_message_id: String(m?.messageId || '').slice(0, 300), p_in_reply_to: String(m?.inReplyTo || '').slice(0, 300),
    });
    return res.status(200).json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    return res.status(/not allowed/i.test(msg) ? 401 : 500).json({ error: /not allowed/i.test(msg) ? 'Unauthorized' : 'Could not store' });
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST' && req.headers?.['x-inbound-secret']) return inbound(req, res);
  const auth = String(req.headers?.authorization || '');
  if (!(await canAny(auth, ['outreach']))) return res.status(401).json({ error: 'Unauthorized' });
  const key = process.env.RESEND_API_KEY;
  if (!key && !process.env.SENDER_API_KEY) return res.status(500).json({ error: 'Email is not set up yet: add RESEND_API_KEY in Vercel.' });

  // ----- delivery status of sent emails -----
  if (req.method === 'GET') {
    const ids = String(req.query?.status || '').split(',').filter((x) => /^[\w-]{8,80}$/.test(x)).slice(0, 25);
    const out: Record<string, string> = {};
    await Promise.all(ids.map(async (id) => {
      try {
        const r = await fetch(`https://api.resend.com/emails/${id}`, { headers: { Authorization: `Bearer ${key}` } });
        const d = await r.json().catch(() => ({}));
        out[id] = r.ok ? String(d?.last_event || 'sent') : r.status === 401 || r.status === 403 ? 'unknown' : 'sent';
      } catch { out[id] = 'unknown'; }
    }));
    return res.status(200).json({ status: out });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = typeof req.body === 'object' && req.body ? req.body : {};
  if (b.action !== 'send') return res.status(400).json({ error: 'Unknown action.' });

  const leadId = String(b.leadId || '');
  const to = [...new Set((Array.isArray(b.to) ? b.to : []).map((x: unknown) => String(x).trim().toLowerCase()).filter((x: string) => EMAIL_RE.test(x) && x.length <= 200))].slice(0, 6) as string[];
  const subject = String(b.subject || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
  const body = String(b.body || '').trim().slice(0, 8000);
  const inReplyTo = /^<[^<>\s]{3,250}>$/.test(String(b.inReplyTo || '')) ? String(b.inReplyTo) : '';
  const bookingLink = /^https:\/\/[^\s]+$/.test(String(b.bookingLink || '')) ? String(b.bookingLink).slice(0, 500) : null;
  // leadId is optional: replying to a mail@ email from someone who isn't a lead yet.
  if (!to.length) return res.status(400).json({ error: 'Add at least one valid email address.' });
  if (!subject || !body) return res.status(400).json({ error: 'Subject and message are needed.' });

  // Who is sending (for reply-to and the history)
  let me = '';
  try { me = String((await rpc<{ email?: string }>(auth, 'staff_me', {}))?.email || '').toLowerCase(); } catch { /* optional */ }
  if (!(await allow('outreach.send', me || 'anon', 60, 3600))) return res.status(429).json({ error: 'Too many emails this hour. Try again later.' });

  // From address: mail@cyberhx.com (the inbox the panel reads). Tried in order:
  //   0. Mailtrap as OUTREACH_FROM (cyberhx.com verified in Mailtrap → Domains)
  //   0. Mailjet as OUTREACH_FROM (cyberhx.com verified in Mailjet → Senders & Domains)
  //   1. Resend as OUTREACH_FROM (works once cyberhx.com is verified in Resend → Domains)
  //   2. Sender as OUTREACH_FROM (cyberhx.com is already authenticated there)
  //   3. Resend as team@mail.cyberhx.com (always works) — replies still go to mail@cyberhx.com
  const want = process.env.OUTREACH_FROM || 'CyberHx <mail@cyberhx.com>';
  const safe = process.env.RESEND_FROM || 'CyberHx <team@mail.cyberhx.com>';
  const replyTo = [DEFAULT_REPLY_TO, ...(EMAIL_RE.test(me) ? [me] : [])];
  const threadHeaders = inReplyTo ? { 'In-Reply-To': inReplyTo, References: inReplyTo } : undefined; // keeps the thread together in their inbox
  const errors: string[] = [];

  const viaResend = async (from: string) => {
    if (!key) { errors.push('Resend: no key'); return ''; }
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html: toHtml(body), text: body, reply_to: replyTo, ...(threadHeaders ? { headers: threadHeaders } : {}) }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.id) return String(d.id);
      errors.push(`Resend ${r.status}: ${[d?.name, d?.message].filter(Boolean).join(' - ')}`);
    } catch { errors.push('Resend: unreachable'); }
    return '';
  };
  const viaMailjet = async (from: string) => {
    const pk = process.env.MAILJET_API_KEY, sk = process.env.MAILJET_SECRET_KEY;
    if (!pk || !sk) { errors.push('Mailjet: no key'); return ''; }
    const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
    try {
      const r = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${pk}:${sk}`).toString('base64'), 'Content-Type': 'application/json' },
        body: JSON.stringify({ Messages: [{
          From: { Email: (m ? m[2] : from).trim(), Name: (m ? m[1] : '').replace(/^"|"$/g, '') || 'CyberHx' },
          To: to.map((Email) => ({ Email })),
          ReplyTo: { Email: 'mail@cyberhx.com', Name: 'CyberHx' }, // Mailjet takes one reply-to
          Subject: subject, TextPart: body, HTMLPart: toHtml(body),
          ...(threadHeaders ? { Headers: threadHeaders } : {}),
        }] }),
      });
      const d: any = await r.json().catch(() => ({}));
      const msg = d?.Messages?.[0];
      if (r.ok && msg?.Status === 'success') return (msg.To || []).map((x: any) => String(x.MessageUUID || x.MessageID)).join(',') || 'ok';
      const err = msg?.Errors?.[0]?.ErrorMessage || d?.ErrorMessage || '';
      errors.push(`Mailjet ${r.status}: ${String(err).slice(0, 200)}`);
    } catch { errors.push('Mailjet: unreachable'); }
    return '';
  };
  const viaMailtrap = async (from: string) => {
    const tk = process.env.MAILTRAP_API_KEY;
    if (!tk) { errors.push('Mailtrap: no key'); return ''; }
    const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
    try {
      const r = await fetch('https://send.api.mailtrap.io/api/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: { email: (m ? m[2] : from).trim(), name: (m ? m[1] : '').replace(/^"|"$/g, '') || 'CyberHx' },
          to: to.map((email) => ({ email })),
          reply_to: { email: 'mail@cyberhx.com', name: 'CyberHx' }, // Mailtrap takes one reply-to
          subject, text: body, html: toHtml(body), category: 'outreach',
          ...(threadHeaders ? { headers: threadHeaders } : {}),
        }),
      });
      const d: any = await r.json().catch(() => ({}));
      if (r.ok && d?.success !== false) return (d?.message_ids || []).map(String).join(',') || 'ok';
      errors.push(`Mailtrap ${r.status}: ${String((d?.errors || []).join('; ') || d?.error || '').slice(0, 200)}`);
    } catch { errors.push('Mailtrap: unreachable'); }
    return '';
  };
  const viaSender = async (from: string) => {
    const sk = process.env.SENDER_API_KEY;
    if (!sk) { errors.push('Sender: no key'); return ''; }
    const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
    const addr = { email: (m ? m[2] : from).trim(), name: (m ? m[1] : '').replace(/^"|"$/g, '') || 'CyberHx' };
    const ids: string[] = [];
    for (const rcpt of to) { // Sender sends one recipient per call
      try {
        const r = await fetch('https://api.sender.net/v2/message/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sk}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ from: addr, to: { email: rcpt }, subject, html: toHtml(body), text: body, headers: { ...(threadHeaders || {}), 'Reply-To': replyTo.join(', ') } }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || d?.success === false) { errors.push(`Sender ${r.status}: ${String(d?.message || '').slice(0, 200)}`); return ids.length ? ids.join(',') : ''; }
        ids.push(String(d?.emailId || 'ok'));
      } catch { errors.push('Sender: unreachable'); return ids.join(','); }
    }
    return ids.join(',');
  };

  let id = '', provider = '', sentFrom = '';
  for (const [p, f] of [['mailtrap', want], ['mailjet', want], ['resend', want], ['sender', want], ['resend', safe]] as const) {
    if (p === 'resend' && f === safe && f === want) continue;
    id = p === 'mailtrap' ? await viaMailtrap(f) : p === 'mailjet' ? await viaMailjet(f) : p === 'resend' ? await viaResend(f) : await viaSender(f);
    if (id) { provider = p; sentFrom = f; break; }
  }
  if (!id) {
    console.error('outreach send failed', errors);
    return res.status(500).json({ error: `Could not send. ${errors.slice(-1)[0] || ''}`.trim(), errors });
  }
  await countUsage(auth, provider as any, provider === 'resend' ? 1 : to.length);

  // Keep a copy (with the sender's own session, so RLS applies). Never blocks the send.
  let mail: unknown = null;
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (url && anon) {
      const r = await fetch(`${url}/rest/v1/outreach_mails`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ lead_id: UUID_RE.test(leadId) ? leadId : null, to_emails: to, subject, body, booking_link: bookingLink, message_ids: id ? id.split(',') : [], provider }),
      });
      if (r.ok) mail = (await r.json())?.[0] || null;
      else console.error('outreach_mails insert failed', r.status, await r.text().catch(() => ''));
    }
  } catch (e) { console.error('outreach_mails insert error', e); }

  return res.status(200).json({ ok: true, id, mail, provider, from: sentFrom });
}
