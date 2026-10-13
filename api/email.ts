// Vercel serverless function: send a CyberHx email through Resend (admin only).
//
//   POST /api/email   (header `Authorization: Bearer <Supabase admin session token>`)
//        { template, to: string[] | recipients: [{ email, name }], vars: { name, title, start, end, meetLink, bookingLink, note, subject, body } }
//        -> { sent: number }
//   GET  /api/email?admin=log[&after=<id>]  -> { items: [{ id, to, subject, createdAt, lastEvent }], hasMore }
//        (needs a Resend key with Full access; opens/clicks need tracking turned on for the domain in Resend)
//
// Required env vars (Vercel -> Project -> Settings -> Environment Variables; NEVER commit them):
//   RESEND_API_KEY   your Resend API key (re_...)
//   RESEND_FROM      optional sender, default "CyberHx <team@mail.cyberhx.com>" (mail.cyberhx.com is verified in Resend)
//   MAIL_REPLY_TO    optional: where replies go (default support@cyberhx.com)
// Plus the SUPABASE_URL / SUPABASE_ANON_KEY already used by api/interview.ts for the admin check.

import { TEMPLATES, MAX_FIELD, renderEmail, type TemplateId, type EmailVars } from '../shared/emailTemplates.js';
import { countUsage, DEFAULT_REPLY_TO } from '../server/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 100; // Resend batch limit

// Admin = a Supabase Auth user listed in the `admins` table (same check as api/interview.ts).
async function isAdmin(req: any): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const auth = String(req.headers?.authorization || '');
  if (!url || !anon || !auth.startsWith('Bearer ')) return false;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' },
      body: '{}',
    });
    return res.ok && (await res.json()) === true;
  } catch {
    return false;
  }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await isAdmin(req))) return res.status(401).json({ error: 'Unauthorized' });

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
  const list: { email: string; name: string }[] = [];
  const raw: unknown[] = Array.isArray(body.recipients) ? body.recipients : Array.isArray(body.to) ? body.to : [];
  for (const x of raw) {
    const email = String(typeof x === 'object' && x ? (x as any).email : x).trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 200 || seen.has(email)) continue;
    seen.add(email);
    list.push({ email, name: typeof x === 'object' && x ? str((x as any).name, MAX_FIELD.name).trim() : '' });
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
  };
  if (template === 'custom' && (!vars.subject?.trim() || !vars.body?.trim())) {
    return res.status(400).json({ error: 'Custom emails need a subject and a message.' });
  }

  const from = process.env.RESEND_FROM || 'CyberHx <team@mail.cyberhx.com>';
  const replyTo = process.env.MAIL_REPLY_TO || process.env.RESEND_REPLY_TO || DEFAULT_REPLY_TO;
  const shared = perName ? null : renderEmail(template, vars);

  // One email per person, so nobody sees the other recipients; each one greets that person by name.
  const batch = list.map(({ email, name }) => {
    const mail = shared || renderEmail(template, { ...vars, name });
    return {
      from,
      to: [email],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    };
  });

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
    await countUsage(String(req.headers?.authorization || ''), 'resend', list.length); // keeps Admin -> Campaigns usage honest
    return res.status(200).json({ sent: list.length });
  } catch (e) {
    console.error('resend request failed', e);
    return res.status(500).json({ error: 'Could not reach the email service. Try again.' });
  }
}
