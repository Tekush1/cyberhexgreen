// Vercel serverless function: send a CyberHx email through Resend (admin only).
//
//   POST /api/email   (header `Authorization: Bearer <Supabase admin session token>`)
//        { template, to: string[], vars: { name, title, start, end, meetLink, bookingLink, note, subject, body } }
//        -> { sent: number }
//
// Required env vars (Vercel -> Project -> Settings -> Environment Variables; NEVER commit them):
//   RESEND_API_KEY   your Resend API key (re_...)
//   RESEND_FROM      sender, e.g. "CyberHx <team@cyberhx.com>" (the domain must be verified in Resend)
//   RESEND_REPLY_TO  optional reply-to address
// Plus the SUPABASE_URL / SUPABASE_ANON_KEY already used by api/interview.ts for the admin check.

import { TEMPLATES, MAX_FIELD, renderEmail, type TemplateId, type EmailVars } from '../shared/emailTemplates.js';

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await isAdmin(req))) return res.status(401).json({ error: 'Unauthorized' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'Email is not set up yet: add RESEND_API_KEY in Vercel environment variables.' });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const template = String(body.template || '') as TemplateId;
  if (!TEMPLATES.some((t) => t.id === template)) return res.status(400).json({ error: 'Unknown template.' });

  const to: string[] = Array.from(
    new Set(
      (Array.isArray(body.to) ? body.to : [])
        .map((x: unknown) => String(x).trim().toLowerCase())
        .filter((x: string) => EMAIL_RE.test(x) && x.length <= 200),
    ),
  );
  if (!to.length) return res.status(400).json({ error: 'Add at least one valid email address.' });
  if (to.length > MAX_RECIPIENTS) return res.status(400).json({ error: `At most ${MAX_RECIPIENTS} recipients at a time.` });

  const v = body.vars || {};
  const vars: EmailVars = {
    name: to.length > 1 ? '' : str(v.name, MAX_FIELD.name),
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

  const mail = renderEmail(template, vars);
  const from = process.env.RESEND_FROM || 'CyberHx <onboarding@resend.dev>';
  const replyTo = process.env.RESEND_REPLY_TO;

  // One email per person, so nobody sees the other recipients.
  const batch = to.map((addr) => ({
    from,
    to: [addr],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    ...(replyTo ? { reply_to: replyTo } : {}),
  }));

  try {
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('resend error', r.status, data);
      return res.status(502).json({ error: data?.message || `Email service error (${r.status}).` });
    }
    return res.status(200).json({ sent: to.length });
  } catch (e) {
    console.error('resend request failed', e);
    return res.status(502).json({ error: 'Could not reach the email service. Try again.' });
  }
}
