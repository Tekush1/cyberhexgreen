// Vercel serverless function: sends the next few emails waiting in public.voucher_queue (Admin -> Vouchers).
//
//   POST /api/voucher-queue   (header x-queue-secret = INBOUND_SECRET)
//        Called every minute by pg_cron in Supabase (supabase/voucher_queue.sql), so emails keep going out
//        slowly even when nobody has the admin page open. -> { claimed, sent, retry, failed }
//
// Pace: a few emails per minute, one at a time with a pause between them. Slow and steady keeps mail out of spam
// and under each provider's per-minute limits. Never Resend (its quota is kept for PentestLab).
// Env: INBOUND_SECRET (shared with the database), SUPABASE_URL / SUPABASE_ANON_KEY, provider keys. Never commit them.

import { renderEmail, type EmailVars } from '../shared/emailTemplates.js';
import { isProviderId, PRIMARY_LANE, rpc, sendDirect, type ProviderId } from '../server/mailer.js';
import crypto from 'node:crypto';

const PER_RUN = 6; // emails per minute
const GAP_MS = 1500; // pause between two emails
const RATE = /429|rate.?limit|too many|throttl|slow down|per minute|quota|daily limit|limit reached|exceeded/i;
const RECIPIENT = /(recipient|not valid|malformed|invalid.{0,20}(email|address)|does not exist|bounced|unsubscribed|suppress|blocklist|blacklist)/i;

interface Row { id: number; email: string; name: string; vars: Partial<EmailVars>; shared: Partial<EmailVars>; via: string; attempts: number }

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const secret = process.env.INBOUND_SECRET || '';
  const given = String(req.headers['x-queue-secret'] || '');
  if (!secret || !given || !sameSecret(given, secret)) return res.status(401).json({ error: 'Unauthorized' });

  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const auth = `Bearer ${anon}`;
  let rows: Row[] = [];
  try {
    rows = (await rpc<Row[]>(auth, 'voucher_queue_claim', { p_secret: secret, p_limit: PER_RUN })) || [];
  } catch (e) {
    console.error('voucher queue claim failed', e);
    return res.status(500).json({ error: 'claim failed' });
  }
  if (!rows.length) return res.status(200).json({ claimed: 0 });

  const results: Record<string, unknown>[] = [];
  // Services that said "slow down" in this run: the rest of their emails wait for a later minute.
  const resting = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const q = rows[i];
    if (resting.has(q.via)) { results.push({ id: q.id, ok: false, error: 'waiting for the mail service limit', retry_minutes: 10 }); continue; }
    const vars = { ...(q.shared || {}), ...(q.vars || {}) } as EmailVars;
    const mail = renderEmail('team_voucher', vars);
    const order: ProviderId[] = q.via === 'mail' ? ['mailtrap'] : q.via === 'auto' ? PRIMARY_LANE : isProviderId(q.via) ? [q.via] : [];
    if (!order.length || order.some((p) => p.startsWith('resend'))) { results.push({ id: q.id, ok: false, error: 'Unknown mail service.' }); continue; }
    const fromName = vars.signer ? `${vars.signer} from CyberHx` : undefined;
    try {
      const r = await sendDirect(order, {
        to: q.email, name: '', subject: mail.subject, html: mail.html, text: mail.text, tracking: false,
        headers: { 'Message-ID': `<${crypto.randomUUID()}@cyberhx.com>` },
      }, fromName, q.via === 'mail' ? 'mail@cyberhx.com' : undefined);
      if (r.ok) {
        results.push({ id: q.id, ok: true, provider: r.provider, subject: mail.subject, text: mail.text, message_id: r.id || null });
      } else {
        const error = Object.entries(r.errors).map(([k, e]) => `${k}: ${e}`).join('; ').slice(0, 480) || 'Could not send.';
        const recipient = RECIPIENT.test(error) && !RATE.test(error);
        // Limits and temporary errors: try again later (10, 20, 40 … minutes). A bad address: give up.
        const retry = recipient ? 0 : Math.min(10 * 2 ** Math.max(0, q.attempts - 1), 360);
        if (RATE.test(error)) resting.add(q.via);
        results.push({ id: q.id, ok: false, error, retry_minutes: retry });
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
    retry: results.filter((r) => !r.ok && Number(r.retry_minutes) > 0).length,
    failed: results.filter((r) => !r.ok && !Number(r.retry_minutes)).length,
  });
}
