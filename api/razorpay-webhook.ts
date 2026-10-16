// Razorpay webhook: the backup that confirms a payment even if the buyer closed the tab before
// the browser could tell us. Add it in Razorpay → Settings → Webhooks:
//   URL     https://cyberhx.com/api/razorpay-webhook
//   Secret  the same value as RAZORPAY_WEBHOOK_SECRET in Vercel
//   Events  payment.captured, payment.failed, order.paid

import { db, fulfill, hmacHex, log, PayError, safeEqual, webhookSecret } from '../server/payments.js';

// Razorpay signs the raw body, so read it before anything parses it.
export const config = { api: { bodyParser: false } };

function rawBody(req: any): Promise<string> {
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'));
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = webhookSecret();
  if (!secret) return res.status(503).json({ error: 'Webhook not configured' });

  const raw = await rawBody(req);
  const sig = String(req.headers['x-razorpay-signature'] || '');
  if (!sig || !safeEqual(hmacHex(secret, raw), sig)) {
    await log(null, null, 'webhook.bad_signature', 'error', { bytes: raw.length });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: 'Bad JSON' }); }
  const payment = event?.payload?.payment?.entity;
  const orderId: string | undefined = payment?.order_id || event?.payload?.order?.entity?.id;

  try {
    if ((event.event === 'payment.captured' || event.event === 'order.paid') && orderId && payment?.id) {
      await fulfill(orderId, payment.id, 'webhook');
    } else if (event.event === 'payment.failed' && orderId) {
      const order = await db<{ ref: string } | null>('pay_get', { p_rzp_order: orderId });
      if (order) {
        const reason = String(payment?.error_description || 'Payment failed').slice(0, 300);
        await log(order.ref, orderId, 'payment.failed', 'warn', { source: 'webhook', paymentId: payment?.id, reason, code: payment?.error_code || null });
        await db('pay_update', { p_rzp_order: orderId, p_patch: { status: 'failed', failure_reason: reason, release_promo: true } });
      }
    }
  } catch (e) {
    // Payments that were not made through this checkout (e.g. pentestlab or payment links) are ignored.
    if (e instanceof PayError && e.status === 404) return res.status(200).json({ received: true, ignored: true });
    await log(null, orderId || null, 'webhook.error', 'error', { event: event?.event, message: e instanceof Error ? e.message.slice(0, 300) : String(e) });
    return res.status(500).json({ error: 'retry later' });
  }
  return res.status(200).json({ received: true });
}
