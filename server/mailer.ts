// Multi-provider email router (server only).
//
// Every provider is optional: it is used only when its API key is set in Vercel env vars.
// Each send reserves quota in Supabase (public.mail_take_quota) so free-plan daily/monthly limits are never crossed.
// When a provider is out of quota or fails as a whole (bad key, domain not verified, rate limited, down),
// the remaining recipients move to the next provider in the lane.

export type ProviderId = 'resend' | 'brevo' | 'sender' | 'mailjet' | 'mailtrap' | 'smtp2go' | 'maileroo' | 'ahasend';
export type Lane = 'event' | 'newsletter' | 'notification';

export interface OutMsg {
  to: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}
interface Addr { email: string; name: string }
export interface SendResult { ok: boolean; id?: string; error?: string; /** provider-level problem: try the next provider */ fatal?: boolean }

interface ProviderDef {
  id: ProviderId;
  label: string;
  /** Env vars that must all be set for the provider to be used. */
  env: string[];
  defaultFrom: string;
  /** Free-plan limits (override with <ID>_DAILY_LIMIT / <ID>_MONTHLY_LIMIT; "0" or "none" = no limit). */
  day: number | null;
  month: number | null;
  /** Parallel requests to this provider. */
  concurrency: number;
  dashboard: string;
  send: (msgs: OutMsg[], from: Addr, replyTo: string) => Promise<SendResult[]>;
}

const env = (k: string) => (process.env[k] || '').trim();

// ---------- helpers ----------
export function parseFrom(s: string): Addr {
  const m = /^\s*(.*?)\s*<\s*([^>\s]+@[^>\s]+)\s*>\s*$/.exec(s);
  if (m) return { name: m[1].replace(/^"|"$/g, ''), email: m[2] };
  return { name: 'CyberHx', email: s.trim() };
}
const fmtAddr = (a: Addr) => (a.name ? `${a.name.replace(/[<>"]/g, '')} <${a.email}>` : a.email);

const RECIPIENT_ERR = /(recipient|not valid|malformed|invalid.{0,20}(email|address)|(email|address).{0,20}invalid|not a valid|blacklist|blocklist|blocked|suppress|bounced|unsubscribed|does not exist)/i;

// Errors about our own setup (sender, domain, key, plan) always mean: use the next provider.
const PROVIDER_ERR = /(sender|from address|\bfrom\b|domain|authenticat|api.?key|token|unauthori[sz]ed|forbidden|ip address|plan|quota|limit|credits|suspend|disabled|not allowed)/i;

async function readErr(r: Response): Promise<string> {
  const t = await r.text().catch(() => '');
  try {
    const j = JSON.parse(t);
    const msg =
      j?.message || j?.error?.message || j?.error || j?.ErrorMessage || j?.Messages?.[0]?.Errors?.[0]?.ErrorMessage ||
      j?.errors?.[0]?.message || j?.errors?.[0] || j?.data?.error || j?.data?.failures?.[0] || j?.code;
    return `${r.status} ${typeof msg === 'string' ? msg : JSON.stringify(msg || j).slice(0, 200)}`;
  } catch {
    return `${r.status} ${t.slice(0, 200)}`;
  }
}

/** Turn an HTTP failure into a result: recipient problems fail just that email, everything else is provider-level. */
function failure(status: number, error: string): SendResult {
  const recipientOnly = (status === 400 || status === 422) && RECIPIENT_ERR.test(error) && !PROVIDER_ERR.test(error);
  return { ok: false, error, fatal: !recipientOnly };
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    return await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Run one request per message with limited parallelism; once a provider-level error happens, skip the rest. */
async function perMessage(msgs: OutMsg[], concurrency: number, one: (m: OutMsg) => Promise<SendResult>): Promise<SendResult[]> {
  const out: SendResult[] = new Array(msgs.length);
  let next = 0;
  let broken = '';
  const worker = async () => {
    while (next < msgs.length) {
      const i = next++;
      if (broken) { out[i] = { ok: false, fatal: true, error: broken }; continue; }
      try {
        out[i] = await one(msgs[i]);
      } catch (e) {
        out[i] = { ok: false, fatal: true, error: e instanceof Error ? e.message : String(e) };
      }
      if (!out[i].ok && out[i].fatal) broken = out[i].error || 'provider error';
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, msgs.length)) }, worker));
  return out;
}

// ---------- providers ----------
const PROVIDERS: ProviderDef[] = [
  {
    id: 'sender', label: 'Sender', env: ['SENDER_API_KEY'], defaultFrom: 'CyberHx <events@events.cyberhx.com>',
    day: null, month: 15000, concurrency: 4, dashboard: 'https://app.sender.net',
    send: (msgs, from, replyTo) =>
      perMessage(msgs, 4, async (m) => {
        const r = await post('https://api.sender.net/v2/message/send', { Authorization: `Bearer ${env('SENDER_API_KEY')}` }, {
          from: { email: from.email, name: from.name || 'CyberHx' },
          to: { email: m.to, ...(m.name ? { name: m.name } : {}) },
          subject: m.subject, html: m.html, text: m.text,
          headers: { ...(m.headers || {}), ...(replyTo ? { 'Reply-To': replyTo } : {}) },
        });
        if (!r.ok) { const e = await readErr(r); return failure(r.status, e); }
        const j = await r.json().catch(() => ({}));
        return j?.success === false ? failure(400, String(j?.message || 'rejected')) : { ok: true, id: j?.emailId };
      }),
  },
  {
    id: 'brevo', label: 'Brevo', env: ['BREVO_API_KEY'], defaultFrom: 'CyberHx <news@subscriber.cyberhx.com>',
    day: 300, month: null, concurrency: 4, dashboard: 'https://app.brevo.com',
    send: (msgs, from, replyTo) =>
      perMessage(msgs, 4, async (m) => {
        const r = await post('https://api.brevo.com/v3/smtp/email', { 'api-key': env('BREVO_API_KEY') }, {
          sender: { email: from.email, name: from.name || 'CyberHx' },
          to: [{ email: m.to, ...(m.name ? { name: m.name } : {}) }],
          subject: m.subject, htmlContent: m.html, textContent: m.text,
          ...(replyTo ? { replyTo: parseFrom(replyTo) } : {}),
          ...(m.headers ? { headers: m.headers } : {}),
        });
        if (!r.ok) return failure(r.status, await readErr(r));
        const j = await r.json().catch(() => ({}));
        return { ok: true, id: j?.messageId };
      }),
  },
  {
    id: 'mailjet', label: 'Mailjet', env: ['MAILJET_API_KEY', 'MAILJET_SECRET_KEY'], defaultFrom: 'CyberHx <alerts@notification.cyberhx.com>',
    day: 200, month: 6000, concurrency: 2, dashboard: 'https://app.mailjet.com',
    send: async (msgs, from, replyTo) => {
      // Up to 50 separate messages per call; each one has its own status.
      const out: SendResult[] = [];
      const auth = 'Basic ' + Buffer.from(`${env('MAILJET_API_KEY')}:${env('MAILJET_SECRET_KEY')}`).toString('base64');
      for (let i = 0; i < msgs.length; i += 50) {
        const part = msgs.slice(i, i + 50);
        if (out.some((x) => x.fatal)) { out.push(...part.map(() => ({ ok: false, fatal: true, error: out.find((x) => x.fatal)!.error }))); continue; }
        let r: Response;
        try {
          r = await post('https://api.mailjet.com/v3.1/send', { Authorization: auth }, {
            Messages: part.map((m) => ({
              From: { Email: from.email, Name: from.name || 'CyberHx' },
              To: [{ Email: m.to, ...(m.name ? { Name: m.name } : {}) }],
              Subject: m.subject, TextPart: m.text, HTMLPart: m.html,
              ...(replyTo ? { ReplyTo: { Email: parseFrom(replyTo).email, Name: parseFrom(replyTo).name } } : {}),
              ...(m.headers ? { Headers: m.headers } : {}),
            })),
          });
        } catch (e) {
          out.push(...part.map(() => ({ ok: false, fatal: true, error: e instanceof Error ? e.message : 'network error' })));
          continue;
        }
        const j = await r.json().catch(() => null);
        const res: any[] = Array.isArray(j?.Messages) ? j.Messages : [];
        if (!res.length) {
          const err = `${r.status} ${String(j?.ErrorMessage || j?.Message || 'request failed')}`;
          out.push(...part.map(() => failure(r.status, err)));
          continue;
        }
        part.forEach((_, k) => {
          const x = res[k];
          if (x?.Status === 'success') out.push({ ok: true, id: String(x?.To?.[0]?.MessageID || '') });
          else {
            const e = x?.Errors?.[0];
            out.push(failure(Number(e?.StatusCode) || r.status, `${e?.StatusCode || r.status} ${e?.ErrorMessage || 'rejected'}`));
          }
        });
      }
      return out;
    },
  },
  {
    id: 'mailtrap', label: 'Mailtrap', env: ['MAILTRAP_API_KEY'], defaultFrom: 'CyberHx <alerts@n2.cyberhx.com>',
    day: 150, month: 4000, concurrency: 3, dashboard: 'https://mailtrap.io',
    send: (msgs, from, replyTo) =>
      perMessage(msgs, 3, async (m) => {
        const r = await post('https://send.api.mailtrap.io/api/send', { Authorization: `Bearer ${env('MAILTRAP_API_KEY')}` }, {
          from: { email: from.email, name: from.name || 'CyberHx' },
          to: [{ email: m.to, ...(m.name ? { name: m.name } : {}) }],
          subject: m.subject, html: m.html, text: m.text, category: 'cyberhx-campaign',
          ...(replyTo ? { reply_to: parseFrom(replyTo) } : {}),
          ...(m.headers ? { headers: m.headers } : {}),
        });
        if (!r.ok) return failure(r.status, await readErr(r));
        const j = await r.json().catch(() => ({}));
        return { ok: true, id: j?.message_ids?.[0] };
      }),
  },
  {
    id: 'maileroo', label: 'Maileroo', env: ['MAILEROO_API_KEY'], defaultFrom: 'CyberHx <alerts@n3.cyberhx.com>',
    day: null, month: 3000, concurrency: 3, dashboard: 'https://app.maileroo.com',
    send: (msgs, from, replyTo) =>
      perMessage(msgs, 3, async (m) => {
        const r = await post('https://smtp.maileroo.com/api/v2/emails', { 'X-Api-Key': env('MAILEROO_API_KEY') }, {
          from: { address: from.email, display_name: from.name || 'CyberHx' },
          to: [{ address: m.to, ...(m.name ? { display_name: m.name } : {}) }],
          subject: m.subject.slice(0, 255), html: m.html, plain: m.text,
          ...(replyTo ? { reply_to: { address: parseFrom(replyTo).email, display_name: parseFrom(replyTo).name } } : {}),
          ...(m.headers ? { headers: m.headers } : {}),
        });
        if (!r.ok) return failure(r.status, await readErr(r));
        const j = await r.json().catch(() => ({}));
        return j?.success === false ? failure(400, String(j?.message || 'rejected')) : { ok: true, id: j?.data?.reference_id };
      }),
  },
  {
    id: 'smtp2go', label: 'SMTP2GO', env: ['SMTP2GO_API_KEY'], defaultFrom: 'CyberHx <alerts@n4.cyberhx.com>',
    day: 200, month: 1000, concurrency: 3, dashboard: 'https://app.smtp2go.com',
    send: (msgs, from, replyTo) =>
      perMessage(msgs, 3, async (m) => {
        const headers = { ...(m.headers || {}), ...(replyTo ? { 'Reply-To': replyTo } : {}) };
        const r = await post('https://api.smtp2go.com/v3/email/send', { 'X-Smtp2go-Api-Key': env('SMTP2GO_API_KEY') }, {
          sender: fmtAddr(from),
          to: [m.name ? fmtAddr({ email: m.to, name: m.name }) : m.to],
          subject: m.subject, html_body: m.html, text_body: m.text, fastaccept: true,
          custom_headers: Object.entries(headers).map(([header, value]) => ({ header, value })),
        });
        if (!r.ok) return failure(r.status, await readErr(r));
        // SMTP2GO answers 200 even when the email failed: check the body.
        const j = await r.json().catch(() => ({}));
        if (Number(j?.data?.failed) > 0 || j?.data?.error) return failure(400, String(j?.data?.failures?.[0] || j?.data?.error || 'rejected'));
        return { ok: true, id: j?.data?.email_id };
      }),
  },
  {
    id: 'ahasend', label: 'AhaSend', env: ['AHASEND_API_KEY', 'AHASEND_ACCOUNT_ID'], defaultFrom: 'CyberHx <alerts@n5.cyberhx.com>',
    day: null, month: 1000, concurrency: 3, dashboard: 'https://dash.ahasend.com',
    send: (msgs, from, replyTo) =>
      perMessage(msgs, 3, async (m) => {
        const r = await post(`https://api.ahasend.com/v2/accounts/${encodeURIComponent(env('AHASEND_ACCOUNT_ID'))}/messages`, { Authorization: `Bearer ${env('AHASEND_API_KEY')}` }, {
          from: { email: from.email, name: from.name || 'CyberHx' },
          recipients: [{ email: m.to, ...(m.name ? { name: m.name } : {}) }],
          subject: m.subject, html_content: m.html, text_content: m.text,
          ...(replyTo ? { reply_to: parseFrom(replyTo) } : {}),
          ...(m.headers ? { headers: m.headers } : {}),
        });
        if (!r.ok) return failure(r.status, await readErr(r));
        const j = await r.json().catch(() => ({}));
        const d = j?.data?.[0];
        return d?.status === 'error' ? failure(400, String(d?.error || 'rejected')) : { ok: true, id: d?.id };
      }),
  },
  {
    id: 'resend', label: 'Resend', env: ['RESEND_API_KEY'], defaultFrom: 'CyberHx <team@mail.cyberhx.com>',
    // Resend's free plan is 100/day, 3,000/month. Campaigns may use 70/day so interview emails always have room.
    day: 70, month: 2500, concurrency: 1, dashboard: 'https://resend.com/emails',
    send: async (msgs, from, replyTo) => {
      const out: SendResult[] = [];
      for (let i = 0; i < msgs.length; i += 100) {
        const part = msgs.slice(i, i + 100);
        if (out.some((x) => x.fatal)) { out.push(...part.map(() => ({ ok: false, fatal: true, error: 'skipped' }))); continue; }
        let r: Response;
        try {
          r = await post('https://api.resend.com/emails/batch', { Authorization: `Bearer ${env('RESEND_API_KEY')}` },
            part.map((m) => ({
              from: fmtAddr(from), to: [m.to], subject: m.subject, html: m.html, text: m.text,
              ...(replyTo ? { reply_to: replyTo } : {}),
              ...(m.headers ? { headers: m.headers } : {}),
            })));
        } catch (e) {
          out.push(...part.map(() => ({ ok: false, fatal: true, error: e instanceof Error ? e.message : 'network error' })));
          continue;
        }
        if (!r.ok) {
          const e = await readErr(r);
          out.push(...part.map(() => ({ ok: false, fatal: true, error: e }))); // batch is all-or-nothing
          continue;
        }
        const j = await r.json().catch(() => ({}));
        part.forEach((_, k) => out.push({ ok: true, id: j?.data?.[k]?.id }));
      }
      return out;
    },
  },
];

/** Provider order per lane. Unconfigured providers are skipped; Resend is last so interviews keep their quota. */
export const LANES: Record<Lane, ProviderId[]> = {
  event: ['sender', 'brevo', 'mailjet', 'mailtrap', 'maileroo', 'smtp2go', 'ahasend', 'resend'],
  newsletter: ['brevo', 'sender', 'mailjet', 'mailtrap', 'maileroo', 'smtp2go', 'ahasend', 'resend'],
  notification: ['mailjet', 'mailtrap', 'maileroo', 'smtp2go', 'ahasend', 'brevo', 'sender', 'resend'],
};

const limitFromEnv = (k: string, fallback: number | null): number | null => {
  const v = env(k).toLowerCase();
  if (!v) return fallback;
  if (v === '0' || v === 'none' || v === 'unlimited') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  configured: boolean;
  missingEnv: string[];
  from: string;
  day: number | null;
  month: number | null;
  dashboard: string;
}

export function providerInfo(p: ProviderDef): ProviderInfo {
  const U = p.id.toUpperCase();
  const missing = p.env.filter((k) => !env(k));
  return {
    id: p.id,
    label: p.label,
    configured: missing.length === 0,
    missingEnv: missing,
    from: env(`${U}_FROM`) || (p.id === 'resend' ? env('RESEND_FROM') : '') || p.defaultFrom,
    day: limitFromEnv(`${U}_DAILY_LIMIT`, p.day),
    month: limitFromEnv(`${U}_MONTHLY_LIMIT`, p.month),
    dashboard: p.dashboard,
  };
}
export const allProviders = () => PROVIDERS.map(providerInfo);

// ---------- Supabase RPC with the admin's own session ----------
const SB = () => ({
  url: env('SUPABASE_URL') || env('VITE_SUPABASE_URL'),
  anon: env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY'),
});

export async function rpc<T = unknown>(auth: string, fn: string, args: object): Promise<T> {
  const { url, anon } = SB();
  if (!url || !anon) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY missing on the server');
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const t = await r.text();
  if (!r.ok) {
    let msg = t;
    try { const j = JSON.parse(t); msg = j?.message || t; if (j?.code === 'PGRST202' || j?.code === '42883' || j?.code === 'PGRST205') msg = 'Mailing tables are missing: run supabase/mailing.sql in Supabase.'; } catch { /* keep text */ }
    throw new Error(msg.slice(0, 300));
  }
  return (t ? JSON.parse(t) : null) as T;
}

export async function sbGet<T = unknown>(auth: string, path: string): Promise<T> {
  const { url, anon } = SB();
  if (!url || !anon) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY missing on the server');
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: anon, Authorization: auth } });
  const t = await r.text();
  if (!r.ok) {
    let msg = t;
    try { const j = JSON.parse(t); msg = j?.message || t; if (j?.code === 'PGRST205' || j?.code === '42P01') msg = 'Mailing tables are missing: run supabase/mailing.sql in Supabase.'; } catch { /* keep text */ }
    throw new Error(msg.slice(0, 300));
  }
  return JSON.parse(t) as T;
}

/** Count sends made outside the router (e.g. interview emails through api/email.ts). Never throws. */
export async function countUsage(auth: string, provider: ProviderId, n: number) {
  try { await rpc(auth, 'mail_return_quota', { p_provider: provider, p_n: -n }); } catch { /* tables may not exist yet */ }
}

// Providers that just failed as a whole are rested for a few minutes (per warm function instance).
const cooldown = new Map<ProviderId, { until: number; error: string }>();

export interface RoutedResult<R> { row: R; ok: boolean; provider?: ProviderId; id?: string; error?: string }

/**
 * Send one message per row through the lane, respecting quotas and falling over between providers.
 * Rows that could not be sent (no quota left anywhere, or every provider failing) come back with ok=false and no error
 * in `leftover`, so they can stay queued.
 */
export async function route<R>(
  auth: string,
  lane: Lane,
  rows: R[],
  build: (row: R) => OutMsg,
): Promise<{ done: RoutedResult<R>[]; leftover: R[]; providerErrors: Record<string, string>; anyConfigured: boolean }> {
  const replyTo = env('MAIL_REPLY_TO') || env('RESEND_REPLY_TO');
  const done: RoutedResult<R>[] = [];
  const providerErrors: Record<string, string> = {};
  let pool = rows.slice();
  let anyConfigured = false;

  for (const pid of LANES[lane]) {
    if (!pool.length) break;
    const def = PROVIDERS.find((p) => p.id === pid)!;
    const info = providerInfo(def);
    if (!info.configured) continue;
    anyConfigured = true;
    const cd = cooldown.get(pid);
    if (cd && cd.until > Date.now()) { providerErrors[pid] = cd.error; continue; }

    const granted = await rpc<number>(auth, 'mail_take_quota', { p_provider: pid, p_want: pool.length, p_day_limit: info.day, p_month_limit: info.month });
    if (!granted) continue;
    const chunk = pool.splice(0, granted);
    const results = await def.send(chunk.map(build), parseFrom(info.from), replyTo);

    const retry: R[] = [];
    let unsent = 0;
    chunk.forEach((row, i) => {
      const r = results[i] || { ok: false, fatal: true, error: 'no result' };
      if (r.ok) done.push({ row, ok: true, provider: pid, id: r.id ? String(r.id).slice(0, 200) : undefined });
      else if (r.fatal) { retry.push(row); unsent++; providerErrors[pid] = r.error || 'failed'; }
      else { done.push({ row, ok: false, provider: pid, error: r.error }); }
    });
    if (unsent) {
      cooldown.set(pid, { until: Date.now() + 5 * 60_000, error: providerErrors[pid] });
      await rpc(auth, 'mail_return_quota', { p_provider: pid, p_n: unsent }).catch(() => undefined);
    }
    pool = retry.concat(pool);
  }

  return { done, leftover: pool, providerErrors, anyConfigured };
}
