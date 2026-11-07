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

const PER_RUN = 5; // emails per minute in total
const LIMIT = /429|rate.?limit|too many|throttl|slow down|per minute|quota|daily limit|limit reached|exceeded|probation|not allowed to send|credits/i;
/** Minutes until a service may be used again: its own "retry after <time>", or "enabled in N seconds", else an hour. */
function restMinutes(error: string): number {
  const at = Date.parse((/retry after\s+([0-9T:.\-]+Z)/i.exec(error) || [])[1] || '');
  if (Number.isFinite(at)) return Math.min(Math.max(Math.ceil((at - Date.now()) / 60000) + 1, 5), 1440);
  const secs = Number((/enabled in (\d+) seconds/i.exec(error) || [])[1]);
  if (secs > 0) return Math.min(Math.max(Math.ceil(secs / 60) + 1, 5), 1440);
  return 60;
}
const GAP_MS = 1500; // pause between two emails
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
  // Services at their limit (from earlier minutes, and any that hit it now): skipped, the next one in line sends.
  const resting = new Map<string, number>(); // provider -> until (ms)
  try {
    const rests = (await rpc<{ provider: string; until: string }[]>(auth, 'voucher_queue_rests', { p_secret: secret })) || [];
    rests.forEach((r) => resting.set(r.provider, Date.parse(r.until)));
  } catch { /* table missing: no rests known */ }

  for (let i = 0; i < rows.length; i++) {
    const q = rows[i];
    const vars = { ...(q.shared || {}), ...(q.vars || {}) } as EmailVars;
    const mail = renderEmail('team_voucher', vars);
    // The chosen service first, then the next ones; leave out those resting.
    const order: ProviderId[] = viaOrder(q.via, q.id).filter((p) => !resting.has(p));
    if (!order.length) {
      // Every service in line is at its limit: wait until the first one is free again (no try used up).
      const soonest = Math.min(...viaOrder(q.via, q.id).map((p) => resting.get(p) || Date.now() + 3600_000));
      results.push({ id: q.id, hold_minutes: Math.min(Math.max(Math.ceil((soonest - Date.now()) / 60000) + 1, 1), 1440), error: 'every mail service is at its limit' });
      continue;
    }
    const fromName = vars.signer ? `${vars.signer} from CyberHx` : undefined;
    try {
      const r = await sendDirect(order, {
        to: q.email, name: '', subject: mail.subject, html: mail.html, text: mail.text, tracking: false,
        headers: { 'Message-ID': `<${crypto.randomUUID()}@cyberhx.com>` },
      }, fromName, q.via === 'mail' ? 'mail@cyberhx.com' : undefined);
      // A service that said "limit": rest it (saved for the next minutes too) and move on to the next one.
      Object.entries(r.errors).forEach(([pid, e]) => {
        if (!LIMIT.test(e) || resting.has(pid)) return;
        const minutes = restMinutes(e);
        resting.set(pid, Date.now() + minutes * 60000);
        results.push({ rest_provider: pid, minutes, reason: e.slice(0, 280) });
      });
      if (r.ok) {
        results.push({ id: q.id, ok: true, provider: r.provider, subject: mail.subject, text: mail.text, message_id: r.id || null });
      } else {
        const error = Object.entries(r.errors).map(([k, e]) => `${k}: ${e}`).join('; ').slice(0, 480) || 'Could not send.';
        const allLimited = Object.values(r.errors).every((e) => LIMIT.test(e) || e === 'not connected');
        if (allLimited) {
          results.push({ id: q.id, hold_minutes: 30, error });
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
