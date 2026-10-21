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
// Env: RESEND_API_KEY (+ optional RESEND_FROM), SUPABASE_URL / SUPABASE_ANON_KEY. Never commit keys.

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
  if (!key) return res.status(500).json({ error: 'Email is not set up yet: add RESEND_API_KEY in Vercel.' });

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
  if (!UUID_RE.test(leadId)) return res.status(400).json({ error: 'Pick a lead first.' });
  if (!to.length) return res.status(400).json({ error: 'Add at least one valid email address.' });
  if (!subject || !body) return res.status(400).json({ error: 'Subject and message are needed.' });

  // Who is sending (for reply-to and the history)
  let me = '';
  try { me = String((await rpc<{ email?: string }>(auth, 'staff_me', {}))?.email || '').toLowerCase(); } catch { /* optional */ }
  if (!(await allow('outreach.send', me || 'anon', 60, 3600))) return res.status(429).json({ error: 'Too many emails this hour. Try again later.' });

  const from = process.env.RESEND_FROM || 'CyberHx <team@mail.cyberhx.com>';
  const replyTo = [DEFAULT_REPLY_TO, ...(EMAIL_RE.test(me) ? [me] : [])];
  let id = '';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to, subject, html: toHtml(body), text: body, reply_to: replyTo,
        ...(inReplyTo ? { headers: { 'In-Reply-To': inReplyTo, References: inReplyTo } } : {}), // keeps the thread together in their inbox
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = [d?.name, d?.message].filter(Boolean).join(': ');
      return res.status(500).json({ error: `Resend ${r.status}${detail ? ` - ${detail}` : ''}` });
    }
    id = String(d?.id || '');
  } catch {
    return res.status(500).json({ error: 'Could not reach the email service. Try again.' });
  }
  await countUsage(auth, 'resend', 1);

  // Keep a copy (with the sender's own session, so RLS applies). Never blocks the send.
  let mail: unknown = null;
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (url && anon) {
      const r = await fetch(`${url}/rest/v1/outreach_mails`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ lead_id: leadId, to_emails: to, subject, body, booking_link: bookingLink, message_ids: id ? [id] : [], provider: 'resend' }),
      });
      if (r.ok) mail = (await r.json())?.[0] || null;
      else console.error('outreach_mails insert failed', r.status, await r.text().catch(() => ''));
    }
  } catch (e) { console.error('outreach_mails insert error', e); }

  return res.status(200).json({ ok: true, id, mail });
}
