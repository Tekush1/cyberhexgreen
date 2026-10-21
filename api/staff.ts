// Vercel serverless function: admin sign-in log (Admin → Team → Sign-in activity, owners only).
//
//   POST /api/staff { action:'login' }            header Authorization: Bearer <the new session token>
//        -> records a successful sign-in for that person (server checks the token itself)
//   POST /api/staff { action:'failed', email }    -> records a failed password attempt (rate limited per IP)
//
// Where they signed in from: Cloudflare's visitor headers (cf-connecting-ip, cf-ipcountry, cf-ipcity, cf-region);
// when the city is missing (Cloudflare "Add visitor location headers" is off) the IP is looked up on ipwho.is.
// Writes go through public.staff_log_login, which needs PAYMENTS_DB_SECRET (no service key on the server).

import { allow, clientIp, db } from '../server/payments.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const h = (req: any, k: string) => { const v = req.headers?.[k]; return String(Array.isArray(v) ? v[0] : v || '').trim(); };
const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
const countryName = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return code === 'T1' ? 'Tor network' : '';
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch { return code; }
};

async function where(req: any) {
  const ip = clientIp(req);
  const viaCf = !!h(req, 'cf-connecting-ip');
  let city = viaCf ? h(req, 'cf-ipcity') : dec(h(req, 'x-vercel-ip-city'));
  let region = viaCf ? h(req, 'cf-region') : h(req, 'x-vercel-ip-country-region');
  let country = countryName((viaCf ? h(req, 'cf-ipcountry') : h(req, 'x-vercel-ip-country')).toUpperCase());
  if (!city && ip && ip !== 'unknown') {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country`, { signal: ctl.signal });
      clearTimeout(t);
      const d: any = await r.json().catch(() => ({}));
      if (d?.success) { city = d.city || ''; region = region || d.region || ''; country = country || d.country || ''; }
    } catch { /* location is best effort */ }
  }
  return { ip, city: city.slice(0, 100), region: region.slice(0, 100), country: country.slice(0, 100), ua: h(req, 'user-agent').slice(0, 400) };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = typeof req.body === 'object' && req.body ? req.body : {};
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon || !process.env.PAYMENTS_DB_SECRET) return res.status(200).json({ ok: false, skipped: 'not configured' });

  try {
    if (b.action === 'login') {
      const auth = h(req, 'authorization');
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
      // Who is this, really? Ask Supabase with their own token.
      const [uRes, meRes] = await Promise.all([
        fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } }),
        fetch(`${url}/rest/v1/rpc/staff_me`, { method: 'POST', headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' }),
      ]);
      if (!uRes.ok) return res.status(401).json({ error: 'Unauthorized' });
      const u: any = await uRes.json();
      const me: any = meRes.ok ? await meRes.json().catch(() => ({})) : {};
      if (!(await allow('staff.login', String(u.id || ''), 30, 600))) return res.status(200).json({ ok: true, throttled: true });
      const w = await where(req);
      await db('staff_log_login', { p_ok: true, p_user: u.id, p_email: u.email || '', p_role: me?.role || '', p_ip: w.ip, p_city: w.city, p_region: w.region, p_country: w.country, p_ua: w.ua });
      return res.status(200).json({ ok: true });
    }

    if (b.action === 'failed') {
      const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
      const w = await where(req);
      if (!(await allow('staff.failed', w.ip, 20, 600))) return res.status(200).json({ ok: true, throttled: true });
      await db('staff_log_login', { p_ok: false, p_user: null, p_email: EMAIL_RE.test(email) ? email : email.replace(/[^\w@.+-]/g, '').slice(0, 80), p_role: '', p_ip: w.ip, p_city: w.city, p_region: w.region, p_country: w.country, p_ua: w.ua });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    console.error('staff log failed', e instanceof Error ? e.message : e);
    return res.status(200).json({ ok: false }); // logging never blocks signing in
  }
}
