// Vercel serverless function: Admin → Outreach (owners and the 'outreach' role).
//
//   POST /api/outreach  { action:'send', leadId, to: string[], subject, body }
//        Sends ONE plain, personal-looking email (all of the lead's addresses on it) through Resend,
//        replies go to mail@cyberhx.com AND to the staff member who sent it, then saves it in outreach_mails.
//        -> { ok: true, id, mail }
//   GET  /api/outreach?status=<resend id>,<resend id>...   -> { status: { [id]: 'delivered' | 'opened' | ... } }
//
// Env: RESEND_API_KEY (+ optional RESEND_FROM), SUPABASE_URL / SUPABASE_ANON_KEY. Never commit keys.

import { canAny } from '../server/staff.js';
import { countUsage, DEFAULT_REPLY_TO, rpc } from '../server/mailer.js';
import { allow } from '../server/payments.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Plain text -> simple HTML: paragraphs, line breaks, clickable links. Looks like a normal person-to-person email. */
function toHtml(text: string) {
  const linkify = (s: string) => s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, (u) => `<a href="${u}" style="color:#0a66c2">${u}</a>`);
  const paras = text.split(/\n\s*\n/).map((p) => `<p style="margin:0 0 14px">${linkify(esc(p.trim())).replace(/\n/g, '<br>')}</p>`);
  return `<!doctype html><html><body style="margin:0;padding:0"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1d1d1f;max-width:620px;padding:8px 4px">${paras.join('')}</div></body></html>`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
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
      body: JSON.stringify({ from, to, subject, html: toHtml(body), text: body, reply_to: replyTo }),
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
