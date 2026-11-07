// Vercel serverless function: sends the next few emails waiting in public.voucher_queue (Admin -> Vouchers).
//
//   POST /api/voucher-queue   (header x-queue-secret = app_secrets 'inbound'; checked by the database)
//        Called every minute by pg_cron in Supabase (supabase/voucher_queue.sql), so emails keep going out
//        slowly even when nobody has the admin page open. -> { claimed, sent, retry, failed }
//
// Pace: a few emails per minute, one at a time with a pause between them. Slow and steady keeps mail out of spam
// and under each provider's per-minute limits. Never Resend (its quota is kept for PentestLab).
// Env: SUPABASE_URL / SUPABASE_ANON_KEY, provider keys. Never commit them.

import { renderEmail, type EmailVars } from '../shared/emailTemplates.js';
import { rpc, sendDirect, viaOrder, type ProviderId } from '../server/mailer.js';
import crypto from 'node:crypto';

const PER_RUN = 6; // emails per minute in total
// Per service, per minute: stay under each one's hourly / daily limits (Mailgun probation: 100 an hour).
const PER_MIN: Record<string, number> = { mailgun: 1, mailtrap: 2, mail: 2, sender: 3, brevo: 3, 'brevo,sender': 5 };
const GAP_MS = 1500; // pause between two emails
const RATE = /429|rate.?limit|too many|throttl|slow down|per minute|quota|daily limit|limit reached|exceeded/i;
const RECIPIENT = /(recipient|not valid|malformed|invalid.{0,20}(email|address)|does not exist|bounced|unsubscribed|suppress|blocklist|blacklist)/i;

interface Row { id: number; email: string; name: string; vars: Partial<EmailVars>; shared: Partial<EmailVars>; via: string; attempts: number }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  // The database checks the secret (app_secrets 'inbound', the same one the mail@ inbound worker uses), like api/outreach.ts.
  const secret = String(req.headers['x-queue-secret'] || '');
  if (secret.length < 16) return res.status(401).json({ error: 'Unauthorized' });

  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const auth = `Bearer ${anon}`;
  let rows: Row[] = [];
  try {
    rows = (await rpc<Row[]>(auth, 'voucher_queue_claim', { p_secret: secret, p_limit: PER_RUN })) || [];
  } catch (e) {
    if (/not allowed/i.test(String((e as Error).message))) return res.status(401).json({ error: 'Unauthorized' });
    console.error('voucher queue claim failed', e);
    return res.status(500).json({ error: 'claim failed' });
  }
  if (!rows.length) return res.status(200).json({ claimed: 0 });

  const results: Record<string, unknown>[] = [];
  const used: Record<string, number> = {};
  const resting = new Set<string>(); // services that hit a limit in this run (provider ids, or the queue's via)
  for (let i = 0; i < rows.length; i++) {
    const q = rows[i];
    // Over this service's per-minute share, or it just hit a limit: wait without counting it as a try.
    if (resting.has(q.via)) { results.push({ id: q.id, hold_minutes: 60, error: 'waiting for the mail service limit' }); continue; }
    if ((used[q.via] || 0) >= (PER_MIN[q.via] ?? PER_RUN)) { results.push({ id: q.id, hold_minutes: 1 }); continue; }
    used[q.via] = (used[q.via] || 0) + 1;
    const vars = { ...(q.shared || {}), ...(q.vars || {}) } as EmailVars;
    const mail = renderEmail('team_voucher', vars);
    // Several services ("brevo,sender"): take turns, so each carries half; if one is full the next one sends.
    const order: ProviderId[] = viaOrder(q.via, q.id).filter((p) => !resting.has(p));
    if (!order.length || order.some((p) => p.startsWith('resend'))) {
      results.push(q.via === 'auto' || q.via.includes(',') ? { id: q.id, hold_minutes: 30, error: 'every mail service is at its limit' } : { id: q.id, ok: false, error: 'Unknown mail service.' });
      continue;
    }
    const fromName = vars.signer ? `${vars.signer} from CyberHx` : undefined;
    try {
      const r = await sendDirect(order, {
        to: q.email, name: '', subject: mail.subject, html: mail.html, text: mail.text, tracking: false,
        headers: { 'Message-ID': `<${crypto.randomUUID()}@cyberhx.com>` },
      }, fromName, q.via === 'mail' ? 'mail@cyberhx.com' : undefined);
      // Remember services that said "limit" so the rest of this run skips them.
      Object.entries(r.errors).forEach(([pid, e]) => { if (RATE.test(e) || /probation|not allowed to send/i.test(e)) resting.add(pid); });
      if (r.ok) {
        results.push({ id: q.id, ok: true, provider: r.provider, subject: mail.subject, text: mail.text, message_id: r.id || null });
      } else {
        const error = Object.entries(r.errors).map(([k, e]) => `${k}: ${e}`).join('; ').slice(0, 480) || 'Could not send.';
        const limited = RATE.test(error) || /probation|not allowed to send/i.test(error);
        if (limited) {
          // The service is full: this email and every other one waiting for it wait an hour (no try used up).
          resting.add(q.via);
          results.push({ id: q.id, hold_minutes: 60, error });
          results.push({ rest_via: q.via, minutes: 60 });
        } else {
          const recipient = RECIPIENT.test(error);
          results.push({ id: q.id, ok: false, error, retry_minutes: recipient ? 0 : Math.min(10 * 2 ** Math.max(0, q.attempts - 1), 360) });
        }
      }
    } catch (e) {
      results.push({ id: q.id, ok: false, error: e instanceof Error ? e.message.slice(0, 480) : 'failed', retry_minutes: 10 });
    }
    if (i < rows.length - 1) await new Promise((r) => setTimeout(r, GAP_MS));
  }

  try {
    await rpc(auth, 'voucher_queue_done', { p_secret: secret, p_results: results });
  } catch (e) {
    console.error('voucher queue done failed', e);
  }
  return res.status(200).json({
    claimed: rows.length,
    sent: results.filter((r) => r.ok).length,
    held: results.filter((r) => r.hold_minutes).length,
    retry: results.filter((r) => r.ok === false && Number(r.retry_minutes) > 0).length,
    failed: results.filter((r) => r.ok === false && !Number(r.retry_minutes)).length,
  });
}
