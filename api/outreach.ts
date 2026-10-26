// Vercel serverless function: Admin → Outreach (owners and the 'outreach' role).
//
//   POST /api/outreach  { action:'send', leadId, to: string[], subject, body }
//        Sends ONE plain, personal-looking email (all of the lead's addresses on it) through Mailtrap,
//        from the sender's own address (yashika@cyberhx.com ...), CC + reply-to mail@cyberhx.com; saved in outreach_mails.
//        Owners may pass `as: <user id>` to send as that person.
//        -> { ok: true, id, mail }
//   GET  /api/outreach?status=<resend id>,<resend id>...   -> { status: { [id]: 'delivered' | 'opened' | ... } }
//   POST /api/outreach  (header x-inbound-secret, body = the raw email)  <- Cloudflare Email Worker on mail@cyberhx.com
//        Parses the reply and hands it to public.outreach_inbound(), which keeps it only if it came from a lead.
//        See supabase/outreach_replies.sql and scripts/cloudflare-email-worker.js.
//
// Env: MAILTRAP_API_KEY (+ optional OUTREACH_FROM, default mail@cyberhx.com); RESEND_API_KEY only for delivery status, SUPABASE_URL / SUPABASE_ANON_KEY. Never commit keys.

import { canAny } from '../server/staff.js';
import { countUsage, rpc } from '../server/mailer.js';
import { allow } from '../server/payments.js';
import PostalMime from 'postal-mime';
import crypto from 'node:crypto';

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
  if (!process.env.MAILTRAP_API_KEY) return res.status(500).json({ error: 'Email is not set up yet: add MAILTRAP_API_KEY in Vercel.' });

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
  const ccIn = [...new Set((Array.isArray(b.cc) ? b.cc : []).map((x: unknown) => String(x).trim().toLowerCase()).filter((x: string) => EMAIL_RE.test(x) && x.length <= 200 && !to.includes(x)))].slice(0, 6) as string[];
  // Attachments: [{ name, type, data (base64) }], at most 5 files / 3 MB in total (Vercel takes ~4.5 MB per request).
  // Only everyday documents, images and archives (an allow-list: .html, .svg and other active files can run
  // code when opened, and would go out from our own domain). The type comes from the extension, not the browser.
  const ALLOWED: Record<string, string> = {
    pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet', odp: 'application/vnd.oasis.opendocument.presentation',
    rtf: 'application/rtf', txt: 'text/plain', csv: 'text/csv', md: 'text/markdown',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', zip: 'application/zip',
  };
  const files: { filename: string; type: string; content: string; size: number }[] = [];
  let total = 0;
  for (const a of (Array.isArray(b.attachments) ? b.attachments : []).slice(0, 6)) {
    const filename = String(a?.name || '').replace(/[\r\n"\\/]+/g, ' ').trim().slice(0, 120);
    const content = String(a?.data || '').replace(/^data:[^,]*,/, '');
    if (!filename || !/^[A-Za-z0-9+/=]+$/.test(content)) return res.status(400).json({ error: 'One attachment could not be read. Remove it and add it again.' });
    const type = ALLOWED[(filename.match(/\.([A-Za-z0-9]+)$/)?.[1] || '').toLowerCase()];
    if (!type) return res.status(400).json({ error: `${filename}: this kind of file can't be attached. Send PDF, Word, Excel, PowerPoint, text, image or ZIP files.` });
    const size = Math.floor((content.length * 3) / 4);
    total += size;
    files.push({ filename, type, content, size });
  }
  if (files.length > 5) return res.status(400).json({ error: 'At most 5 attachments per email.' });
  if (total > 3 * 1024 * 1024) return res.status(400).json({ error: 'Attachments are too big: 3 MB in total at most.' });
  // leadId is optional: replying to a mail@ email from someone who isn't a lead yet, or a plain new email.
  if (!to.length) return res.status(400).json({ error: 'Add at least one valid email address.' });
  if (!subject || !body) return res.status(400).json({ error: 'Subject and message are needed.' });

  // Who is sending. Each outreach person sends as their own address (outreach_people.send_as, e.g. yashika@cyberhx.com),
  // CC mail@cyberhx.com, replies to mail@cyberhx.com. Owners send as mail@, or as a person when they pass `as`.
  let staff: { email?: string; role?: string } = {};
  try { staff = (await rpc<{ email?: string; role?: string }>(auth, 'staff_me', {})) || {}; } catch { /* optional */ }
  const me = String(staff.email || '').toLowerCase();
  if (!(await allow('outreach.send', me || 'anon', 60, 3600))) return res.status(429).json({ error: 'Too many emails this hour. Try again later.' });

  type Person = { user_id: string; name: string; send_as: string };
  let person: Person | null = null;
  try { person = await rpc<Person | null>(auth, 'outreach_me', {}); } catch { /* not an outreach person */ }
  if (!person && staff.role === 'owner' && UUID_RE.test(String(b.as || ''))) {
    try {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      const r = await fetch(`${url}/rest/v1/outreach_people?user_id=eq.${b.as}&select=user_id,name,send_as`, { headers: { apikey: String(anon), Authorization: auth } });
      person = r.ok ? ((await r.json())?.[0] || null) : null;
    } catch { /* fall back to mail@ */ }
  }
  if (!person && staff.role !== 'owner') return res.status(403).json({ error: 'Your sending address is not set up yet. Ask the owner to add you in Outreach → Team.' });

  const MAIN = 'mail@cyberhx.com';
  const fromAddr = person ? { email: person.send_as, name: `${person.name} from CyberHx` } : { email: MAIN, name: 'CyberHx' };
  const cc = [
    ...ccIn.filter((e) => e !== MAIN).map((email) => ({ email })),
    ...(fromAddr.email === MAIN || to.includes(MAIN) ? [] : [{ email: MAIN, name: 'CyberHx' }]),
  ];
  const msgId = `<${crypto.randomUUID()}@cyberhx.com>`; // replies quote this, so they land in the right person's inbox
  const headers: Record<string, string> = { 'Message-ID': msgId, ...(inReplyTo ? { 'In-Reply-To': inReplyTo, References: inReplyTo } : {}) };

  let ids: string[] = [];
  try {
    const r = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.MAILTRAP_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddr, to: to.map((email) => ({ email })), ...(cc.length ? { cc } : {}),
        reply_to: { email: MAIN, name: 'CyberHx' },
        subject, text: body, html: toHtml(body), category: 'outreach', headers,
        ...(files.length ? { attachments: files.map((f) => ({ content: f.content, filename: f.filename, type: f.type, disposition: 'attachment' })) } : {}),
      }),
    });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok || d?.success === false) {
      const err = String((d?.errors || []).join('; ') || d?.error || '').slice(0, 200);
      console.error('outreach send failed', r.status, err);
      return res.status(500).json({ error: `Mailtrap ${r.status}${err ? ` - ${err}` : ''}` });
    }
    ids = (d?.message_ids || []).map(String);
  } catch {
    return res.status(500).json({ error: 'Could not reach the email service. Try again.' });
  }
  const id = ids[0] || 'ok';
  await countUsage(auth, 'mailtrap', to.length + cc.length);

  // Keep a copy (with the sender's own session, so RLS applies). Never blocks the send.
  let mail: unknown = null;
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (url && anon) {
      const r = await fetch(`${url}/rest/v1/outreach_mails`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ lead_id: UUID_RE.test(leadId) ? leadId : null, to_emails: to, subject, body, booking_link: bookingLink, message_ids: [msgId, ...ids], provider: 'mailtrap', from_email: fromAddr.email,
          cc_emails: ccIn, attachments: files.map((f) => ({ name: f.filename, size: f.size, type: f.type })), ...(person ? { sent_by_id: person.user_id } : {}) }),
      });
      if (r.ok) mail = (await r.json())?.[0] || null;
      else console.error('outreach_mails insert failed', r.status, await r.text().catch(() => ''));
    }
  } catch (e) { console.error('outreach_mails insert error', e); }

  return res.status(200).json({ ok: true, id, mail, from: fromAddr.email });
}
