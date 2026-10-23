// Vercel serverless function: campaigns (event blasts, newsletters, notifications) through the multi-provider router.
// Admin only (header `Authorization: Bearer <Supabase admin session token>`).
//
//   GET  /api/campaign?admin=providers                 -> { providers: [...with today/month usage], lanes, site }
//   POST /api/campaign { action:'create', kind, name, template, vars, audience } -> { id, total, skipped }
//        audience = {type:'all'} | {type:'tag', tag} | {type:'list', rows:[{email,name}], tag?}
//   POST /api/campaign { action:'send', id }           -> sends the next batch: { sent, failed, pending, status, note, batch }
//   POST /api/campaign { action:'test', kind, template, vars, to } -> { provider }
//   POST /api/campaign { action:'pause' | 'resume' | 'cancel' | 'retry', id }
//
// Provider keys live only in Vercel env vars: see MAILING_SETUP.md.

import {
  CAMPAIGN_TEMPLATES, CAMPAIGN_FIELDS, CAMPAIGN_MAX, renderCampaign, missingField, senderName, BRAND_SENDERS,
  type CampaignKind, type CampaignTemplateId, type CampaignVars,
} from '../shared/campaignTemplates.js';
import { canAny } from '../server/staff.js';
import { allProviders, checkProvider, isProviderId, isTeamOnly, LANES, PRIMARY_LANE, route, rpc, sbGet, type OutMsg, type ProviderId } from '../server/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KINDS: CampaignKind[] = ['event', 'newsletter', 'notification'];
const BATCH = 40;
const MAX_LIST = 20000;


const site = () => (process.env.SITE_URL || 'https://cyberhx.com').replace(/\/+$/, '');

function cleanVars(v: any): CampaignVars {
  const out: CampaignVars = {};
  for (const k of CAMPAIGN_FIELDS) if (typeof v?.[k] === 'string') out[k] = v[k].slice(0, CAMPAIGN_MAX[k]);
  return out;
}

interface QueueRow { id: number; email: string; name: string; unsub_token: string | null; attempts: number }

function buildMsg(kind: CampaignKind, template: CampaignTemplateId, vars: CampaignVars, row: { email: string; name: string; unsub_token: string | null }): OutMsg {
  const promo = kind !== 'notification';
  const unsubPage = promo && row.unsub_token ? `${site()}/unsubscribe?t=${row.unsub_token}` : '';
  const mail = renderCampaign(template, vars, { name: row.name, unsubscribeUrl: unsubPage || undefined });
  const headers: Record<string, string> = {};
  if (promo && row.unsub_token) {
    headers['List-Unsubscribe'] = `<${site()}/api/subscribe?unsub=${row.unsub_token}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  return { to: row.email, name: row.name, subject: mail.subject, html: mail.html, text: mail.text, headers, tracking: vars.style === 'designed' };
}

function summarizeErrors(errs: Record<string, string>) {
  return Object.entries(errs).map(([p, e]) => `${p}: ${e}`).join(' | ').slice(0, 600);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const auth = String(req.headers?.authorization || '');
  // Campaign managers and event managers (public.can('campaigns')).
  if (!(await canAny(auth, ['campaigns']))) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // ---------- Provider status + usage ----------
    if (req.method === 'GET') {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const monthStart = `${today.slice(0, 8)}01`;
      let usage: { provider: string; day: string; count: number }[] = [];
      let tablesMissing = false;
      try {
        usage = await sbGet(auth, `mail_usage?select=provider,day,count&day=gte.${monthStart}`);
      } catch (e) {
        tablesMissing = /missing/i.test(String((e as Error).message));
      }
      const providers = allProviders().map((p) => {
        const mine = usage.filter((u) => u.provider === p.id);
        return {
          ...p,
          usedToday: mine.filter((u) => u.day === today).reduce((a, u) => a + u.count, 0),
          usedMonth: mine.reduce((a, u) => a + u.count, 0),
          teamOnly: isTeamOnly(p.id), // shown, but never used by campaigns
        };
      });
      return res.status(200).json({ providers, lanes: LANES, primaryLane: PRIMARY_LANE, site: site(), tablesMissing });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const action = String(body.action || '');

    if (action === 'check') {
      if (!isProviderId(body.provider)) return res.status(400).json({ error: 'Unknown email service.' });
      return res.status(200).json(await checkProvider(body.provider));
    }

    // ---------- Create ----------
    if (action === 'create' || action === 'test') {
      const kind = String(body.kind) as CampaignKind;
      const template = String(body.template) as CampaignTemplateId;
      if (!KINDS.includes(kind)) return res.status(400).json({ error: 'Pick a campaign type.' });
      if (!CAMPAIGN_TEMPLATES.some((t) => t.id === template)) return res.status(400).json({ error: 'Unknown template.' });
      const vars = cleanVars(body.vars);
      const miss = missingField(template, vars);
      // Optional: send only through one service (no automatic switching).
      let only: ProviderId | undefined;
      if (body.provider && body.provider !== 'auto') {
        if (!isProviderId(body.provider)) return res.status(400).json({ error: 'Unknown email service.' });
        if (isTeamOnly(body.provider)) return res.status(400).json({ error: 'This service is kept for team emails (meetings / Outreach). Pick another one, or Automatic.' });
        const info = allProviders().find((p) => p.id === body.provider)!;
        if (!info.configured) return res.status(400).json({ error: `${info.label} is not connected yet (add ${info.missingEnv.join(' + ')} in Vercel).` });
        only = body.provider;
      }
      // Sending as another brand (e.g. Pinaka CTF) always uses that brand's own verified service.
      const brandSender = BRAND_SENDERS[String(vars.sender ?? '')];
      if (brandSender) {
        const info = allProviders().find((p) => p.id === brandSender.provider);
        if (!info?.configured) return res.status(400).json({ error: `${brandSender.label} is not connected yet: add ${info?.missingEnv.join(' + ') || 'its API key'} in Vercel, then redeploy.` });
        only = brandSender.provider as ProviderId;
      }
      if (miss) return res.status(400).json({ error: `Fill in "${miss}" (links must start with https://).` });

      if (action === 'test') {
        const to = String(body.to || '').trim().toLowerCase();
        if (!EMAIL_RE.test(to)) return res.status(400).json({ error: 'Enter a valid email for the test.' });
        const r = await route(auth, kind, [{ email: to, name: String(body.name || '').slice(0, 80), unsub_token: null }], (row) => {
          const m = buildMsg(kind, template, vars, row);
          return { ...m, subject: `[TEST] ${m.subject}` };
        }, only, senderName(vars), vars.style !== 'designed');
        if (!r.anyConfigured) return res.status(400).json({ error: 'No email service is connected yet. Add at least one API key in Vercel (see MAILING_SETUP.md).' });
        const d = r.done[0];
        if (d?.ok) return res.status(200).json({ provider: d.provider });
        const err = d?.error || summarizeErrors(r.providerErrors) || "Today's limits are used up on every connected service.";
        return res.status(500).json({ error: `Test not sent: ${err}` });
      }

      const name = String(body.name || '').slice(0, 160);
      const a = body.audience || {};
      const type = ['all', 'tag', 'list'].includes(a.type) ? a.type : 'all';
      const tag = typeof a.tag === 'string' ? a.tag.trim().toLowerCase().replace(/[^a-z0-9:_\-. ]/g, '').slice(0, 60) : '';
      let audience: any = { type };
      if (type === 'tag') {
        if (!tag) return res.status(400).json({ error: 'Pick a tag.' });
        audience.tag = tag;
      }
      if (type === 'list') {
        const rows = (Array.isArray(a.rows) ? a.rows : [])
          .map((r: any) => ({ email: String(r?.email || '').trim().toLowerCase(), name: String(r?.name || '').trim().slice(0, 120) }))
          .filter((r: any) => EMAIL_RE.test(r.email) && r.email.length <= 200);
        if (!rows.length) return res.status(400).json({ error: 'The list has no valid email addresses.' });
        if (rows.length > MAX_LIST) return res.status(400).json({ error: `At most ${MAX_LIST} people per campaign.` });
        audience = { type, rows, tag: tag || undefined };
      }
      const out = await rpc<{ id: string; total: number; skipped: number }>(auth, 'mail_create_campaign', {
        p_kind: kind, p_name: name, p_template: template, p_vars: vars, p_audience: audience,
      });
      if (only) {
        const { url, anon } = { url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY };
        await fetch(`${url}/rest/v1/mail_campaigns?id=eq.${out.id}`, {
          method: 'PATCH',
          headers: { apikey: String(anon), Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ provider: only }),
        });
      }
      return res.status(200).json(out);
    }

    const id = String(body.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Bad campaign id.' });

    // ---------- Send next batch ----------
    if (action === 'send') {
      const [c] = await sbGet<any[]>(auth, `mail_campaigns?id=eq.${id}&select=id,kind,template,vars,status,total,sent,failed,note,providers,provider`);
      if (!c) return res.status(404).json({ error: 'Campaign not found.' });
      if (c.status !== 'sending') {
        return res.status(200).json({
          sent: c.sent, failed: c.failed, pending: Math.max(0, c.total - c.sent - c.failed), status: c.status, note: c.note, providers: c.providers, batch: 0,
        });
      }
      const rows = await rpc<QueueRow[]>(auth, 'mail_claim', { p_campaign: id, p_limit: BATCH });
      if (!rows.length) {
        const p = await rpc<any>(auth, 'mail_finish', { p_campaign: id, p_results: [] });
        return res.status(200).json({ ...p, batch: 0 });
      }
      const r = await route(auth, c.kind as CampaignKind, rows, (row) => buildMsg(c.kind, c.template, c.vars || {}, row), isProviderId(c.provider) && !isTeamOnly(c.provider) ? c.provider : undefined, senderName(c.vars || {}), (c.vars || {}).style !== 'designed');
      const results = [
        ...r.done.map((d) => ({ id: d.row.id, status: d.ok ? 'sent' : 'failed', provider: d.provider, message_id: d.id || null, error: d.ok ? null : d.error || 'failed' })),
        ...r.leftover.map((row) =>
          // Rejected by every service several times: give up on this address so the campaign can finish.
          row.attempts >= 3 && Object.keys(r.providerErrors).length
            ? { id: row.id, status: 'failed', provider: null, message_id: null, error: summarizeErrors(r.providerErrors).slice(0, 400) }
            : { id: row.id, status: 'pending', provider: null, message_id: null, error: null },
        ),
      ];
      const stuck = results.filter((x) => x.status === 'pending').length;
      let note: string | null = null;
      let pause = false;
      if (stuck) {
        pause = true;
        if (!r.anyConfigured) note = 'No email service is connected yet. Add API keys in Vercel (see MAILING_SETUP.md), then press Continue.';
        else if (Object.keys(r.providerErrors).length && isProviderId(c.provider)) note = `${allProviders().find((p) => p.id === c.provider)?.label} failed. Fix it and press Continue. ${summarizeErrors(r.providerErrors)}`;
        else if (Object.keys(r.providerErrors).length) note = `Some services failed, the rest are out of quota. Fix and press Continue. ${summarizeErrors(r.providerErrors)}`;
        else if (isProviderId(c.provider)) note = `Today's free limit on ${allProviders().find((p) => p.id === c.provider)?.label} is used up. Press Continue tomorrow (05:30 IST), or start a new campaign on Automatic.`;
        else note = "Today's free limits are used up on every connected service. Press Continue tomorrow (limits reset at 05:30 IST).";
      } else if (Object.keys(r.providerErrors).length) {
        note = `Switched services after an error. ${summarizeErrors(r.providerErrors)}`;
      }
      const p = await rpc<any>(auth, 'mail_finish', { p_campaign: id, p_results: results, p_note: note, p_pause: pause });
      return res.status(200).json({ ...p, note: note || '', batch: rows.length });
    }

    // ---------- Pause / resume / cancel / retry ----------
    const patch = async (fields: object) => {
      const { url, anon } = { url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY };
      const r = await fetch(`${url}/rest/v1/mail_campaigns?id=eq.${id}`, {
        method: 'PATCH',
        headers: { apikey: String(anon), Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
      });
      if (!r.ok) throw new Error(`Could not update the campaign (${r.status}).`);
    };
    if (action === 'pause') { await patch({ status: 'paused', note: 'Paused by you.' }); return res.status(200).json({ ok: true }); }
    if (action === 'resume') { await patch({ status: 'sending', note: '' }); return res.status(200).json({ ok: true }); }
    if (action === 'cancel') { await patch({ status: 'cancelled', note: 'Cancelled. Emails already sent stay sent.' }); return res.status(200).json({ ok: true }); }
    if (action === 'retry') { const n = await rpc<number>(auth, 'mail_retry_failed', { p_campaign: id }); return res.status(200).json({ retried: n }); }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    console.error('campaign error', e);
    // 500 (not 502): Cloudflare replaces 502 bodies.
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Something went wrong.' });
  }
}
