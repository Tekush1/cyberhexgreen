// Meeting emails sent by the server itself (Reschedule / Cancel in Admin → Meetings), through Resend,
// the same way api/email.ts sends them: one email per person, replies to mail@cyberhx.com, counted in
// the Resend usage and remembered in mail_log so the meeting card shows what was sent.

import { renderEmail, type EmailVars, type TemplateId } from '../shared/emailTemplates.js';
import { countUsage, DEFAULT_REPLY_TO } from './mailer.js';

export interface Rcpt { email: string; name: string }

export async function sendMeetingMail(auth: string, template: TemplateId, vars: EmailVars, to: Rcpt[]): Promise<{ sent: number; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: 0, error: 'RESEND_API_KEY is not set' };
  const list = to.filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)).slice(0, 100);
  if (!list.length) return { sent: 0 };
  const from = process.env.RESEND_FROM || 'CyberHx <team@mail.cyberhx.com>';
  const batch = list.map((r) => {
    const mail = renderEmail(template, { ...vars, name: list.length > 1 ? '' : r.name });
    return { from, to: [r.email], subject: mail.subject, html: mail.html, text: mail.text, reply_to: DEFAULT_REPLY_TO };
  });
  try {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return { sent: 0, error: `Resend ${res.status}${data?.message ? ` - ${data.message}` : ''}` };
    await countUsage(auth, 'resend', list.length);
    try {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (url && anon) {
        await fetch(`${url}/rest/v1/mail_log`, {
          method: 'POST',
          headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(batch.map((b, i) => ({
            email: b.to[0], template, subject: String(b.subject).slice(0, 300), body: String(b.text || '').slice(0, 8000), provider: 'resend',
            message_id: data?.data?.[i]?.id ? String(data.data[i].id).slice(0, 200) : null,
          }))),
        });
      }
    } catch { /* the log never blocks a send */ }
    return { sent: list.length };
  } catch (e) {
    return { sent: 0, error: e instanceof Error ? e.message : 'send failed' };
  }
}
