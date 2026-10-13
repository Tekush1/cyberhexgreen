// Vercel serverless function: public newsletter subscribe / unsubscribe.
//
//   POST /api/subscribe { email, name?, source?, website? }  -> { ok: true }      (website = honeypot, must be empty)
//   POST /api/subscribe { action:'unsubscribe', token }       -> { ok: true, email: 'a***@x.com' }
//   POST /api/subscribe?unsub=<token>                         -> one-click unsubscribe from the mail app (RFC 8058)
//   GET  /api/subscribe?unsub=<token>                         -> redirects to the /unsubscribe page (never unsubscribes on GET)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function call(fn: string, args: object) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('not configured');
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${fn} ${r.status}`);
  return r.json();
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const unsub = typeof req.query?.unsub === 'string' ? req.query.unsub : '';

  if (req.method === 'GET') {
    if (!UUID.test(unsub)) return res.status(400).json({ error: 'Bad link.' });
    res.setHeader('Location', `/unsubscribe?t=${unsub}`);
    return res.status(302).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // One-click unsubscribe from Gmail / Yahoo / Apple Mail.
    if (unsub) {
      if (!UUID.test(unsub)) return res.status(400).json({ error: 'Bad link.' });
      await call('mail_unsubscribe', { p_token: unsub });
      return res.status(200).json({ ok: true });
    }

    const body = typeof req.body === 'object' && req.body ? req.body : {};
    if (body.action === 'unsubscribe') {
      const token = String(body.token || '');
      if (!UUID.test(token)) return res.status(400).json({ error: 'This unsubscribe link is not valid.' });
      const email = await call('mail_unsubscribe', { p_token: token });
      if (!email) return res.status(404).json({ error: 'This unsubscribe link is not valid or has expired.' });
      return res.status(200).json({ ok: true, email });
    }

    if (body.website) return res.status(200).json({ ok: true }); // bot filled the hidden field: pretend it worked
    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 200) return res.status(400).json({ error: 'Please enter a valid email address.' });
    const name = String(body.name || '').replace(/[\u0000-\u001f\u007f,;:<>"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    const source = String(body.source || 'website').replace(/[^\w\-: ]/g, '').slice(0, 60) || 'website';
    const out = await call('mail_subscribe', { p_email: email, p_name: name, p_source: source });
    if (out === 'unsubscribed') return res.status(409).json({ error: 'This email unsubscribed earlier. To join again, write to contact@cyberhx.com from that address.' });
    if (out === 'busy') return res.status(429).json({ error: 'Too many sign-ups right now. Please try again later.' });
    if (out !== 'ok') return res.status(400).json({ error: 'Please enter a valid email address.' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('subscribe error', e);
    return res.status(500).json({ error: 'Could not save that right now. Please try again in a minute.' });
  }
}
