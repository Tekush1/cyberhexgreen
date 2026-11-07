import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, Gift, Loader2, Plus, Save, Send, Trash2, Users, User, Globe } from 'lucide-react';
import { TOKEN_KEY } from './adminApi';
import { renderEmail, MAX_FIELD, type EmailVars } from '../../../shared/emailTemplates';
import { campaignApi, downloadCsv, sbInsert, sbRows, sbRpc, sbWrite } from './mailingApi';

/* Admin -> Vouchers.
   Events: each CTF is saved (table voucher_events) with its own colour, product, redeem link, expiry, email style,
   mail service, signer and PRIZE TIERS (rank ranges -> a % voucher or a custom prize, and how many members may use it).
   Sending: paste the leaderboard (Rank, Team, Email(s), Code) or send one team. Each rank gets its tier's prize.
   Every member email gets its own copy through /api/email (template team_voucher). */

export interface Tier { id: string; label: string; from: number; to: number; type: 'percent' | 'custom'; percent: number; prize: string; members: number }
export interface VoucherEvent {
  id: string; name: string; color: string; product: string; redeem_url: string; expires: string | null;
  style: 'plain' | 'designed'; sender: string; signer: string; note: string; tiers: Tier[];
}
interface Provider { id: string; label: string; configured: boolean; from: string; day: number | null; usedToday?: number }

const EMAIL_RE = /[^\s<>,;|"'()]+@[^\s<>,;|"'()]+\.[a-z]{2,}/gi;
const ONE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORE = 'cx_vouchers_v3';
const SWATCHES = ['#ff4545', '#f5c542', '#c6f135', '#30d158', '#0a84ff', '#bf5af2', '#ff9f0a', '#64d2ff'];

interface TeamRow { line: number; rank: number; team: string; emails: string[]; code: string; members?: number; problems: string[] }
type Mode = 'board' | 'one' | 'special';
interface SpecialRow { line: number; email: string; name: string; code: string }

const input = 'w-full bg-[#05080f] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#0A84FF]/70';
const label = 'block text-[12px] font-medium text-white/55 mb-1.5';
const card = 'rounded-[22px] border border-white/[0.08] bg-[#0b0f19] p-5 sm:p-6';

const load = <T,>(k: string, fb: T): T => { try { const v = localStorage.getItem(k); return v ? { ...fb, ...JSON.parse(v) } : fb; } catch { return fb; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const cleanCode = (c: string) => c.trim().replace(/[^\w-]/g, '').slice(0, MAX_FIELD.code);
const uid = () => Math.random().toString(36).slice(2, 8);
const prizeLabel = (t: Tier) => (t.type === 'custom' ? (t.prize.trim() || 'Custom prize') : t.percent >= 100 ? 'Full voucher' : `${t.percent}% voucher`);
const rangeLabel = (t: Tier) => (t.from === t.to ? `Rank ${t.from}` : `Ranks ${t.from}–${t.to}`);

const NEW_EVENT = (): Omit<VoucherEvent, 'id'> => ({
  name: '', color: '#c6f135', product: 'CAPT certification', redeem_url: 'https://pentestlab.cyberhx.com/capt', expires: null,
  style: 'plain', sender: 'mail', signer: '', note: '',
  tiers: [
    { id: uid(), label: 'Top 10', from: 1, to: 10, type: 'percent', percent: 100, prize: '', members: 0 },
    { id: uid(), label: 'Top 50', from: 11, to: 50, type: 'percent', percent: 80, prize: '', members: 4 },
  ],
});

/** Problems with an event's settings that would make a send go wrong. */
function eventProblems(e: Omit<VoucherEvent, 'id'>): string[] {
  const p: string[] = [];
  if (e.name.trim().length < 2) p.push('Give the event a name.');
  if (!/^https:\/\/\S+$/i.test(e.redeem_url.trim())) p.push('The redeem link must start with https://');
  if (!e.tiers.length) p.push('Add at least one prize tier.');
  if (/^resend/.test(e.sender)) p.push('Vouchers never go through Resend (its limit is kept for PentestLab). Pick another mail service.');
  e.tiers.forEach((t, i) => {
    const n = t.label.trim() || `Tier ${i + 1}`;
    if (!(t.from >= 1) || !(t.to >= t.from)) p.push(`${n}: ranks must go from low to high.`);
    if (t.type === 'custom' && !t.prize.trim()) p.push(`${n}: describe the prize.`);
  });
  const sorted = [...e.tiers].sort((a, b) => a.from - b.from);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].from <= sorted[i - 1].to) p.push(`${sorted[i - 1].label || 'A tier'} and ${sorted[i].label || 'another tier'} share ranks.`);
  return p;
}

/** Reads pasted rows from Google Sheets / Excel / CSV. Header row optional; default order Rank, Team, Emails, Code. */
function parse(text: string): TeamRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const split = (l: string) => {
    if (l.includes('\t')) return l.split('\t').map((c) => c.trim());
    const out: string[] = []; let cur = ''; let q = false;
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; }
    out.push(cur.trim());
    return out;
  };
  let col = { rank: 0, team: 1, emails: 2, code: 3, members: -1 };
  let start = 0;
  const head = split(lines[0]).map((c) => c.toLowerCase());
  if (head.some((c) => /team|rank|code|voucher|email/.test(c)) && !(lines[0].match(EMAIL_RE) || []).length) {
    const find = (re: RegExp, fb: number) => { const i = head.findIndex((c) => re.test(c)); return i >= 0 ? i : fb; };
    col = { rank: find(/rank|pos|place|#/, 0), team: find(/team/, 1), emails: find(/mail/, 2), code: find(/code|voucher|coupon/, 3), members: find(/member|players|size/, -1) };
    start = 1;
  }
  const rows: TeamRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const c = split(lines[i]);
    const rank = Number(String(c[col.rank] || '').replace(/[^\d]/g, ''));
    const team = (c[col.team] || '').replace(/\s+/g, ' ').trim().slice(0, MAX_FIELD.team);
    const emails = [...new Set((String(c[col.emails] || '').match(EMAIL_RE) || []).map((e) => e.toLowerCase()))];
    const code = cleanCode(String(c[col.code] || ''));
    const problems: string[] = [];
    if (!rank) problems.push('no rank');
    if (!team) problems.push('no team name');
    if (!emails.length) problems.push('no email');
    if (!code) problems.push('no voucher code');
    const m = col.members >= 0 ? Math.round(Number(String(c[col.members] || '').replace(/[^\d]/g, ''))) : 0;
    rows.push({ line: i + 1, rank, team, emails, code, members: m > 0 ? Math.min(50, m) : undefined, problems });
  }
  const seen = new Map<string, number>();
  rows.forEach((r) => r.code && seen.set(r.code.toUpperCase(), (seen.get(r.code.toUpperCase()) || 0) + 1));
  rows.forEach((r) => { if (r.code && (seen.get(r.code.toUpperCase()) || 0) > 1) r.problems.push('code used twice'); });
  return rows.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
}

async function post(body: object) {
  const res = await fetch('/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); window.location.reload(); throw new Error('Session expired.'); }
  if (!res.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
  return data as { sent: number; failed?: string[]; reasons?: Record<string, string>; providers?: Record<string, number> };
}

/** The email exactly as it will arrive, at full height (no scrollbar inside the frame). */
const MailPreview: React.FC<{ html: string; subject: string; who: string }> = ({ html, subject, who }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(980);
  const fit = () => {
    try {
      const d = ref.current?.contentDocument;
      if (d?.documentElement) setH(Math.max(400, d.documentElement.scrollHeight));
    } catch { /* keep the default height */ }
  };
  useEffect(() => { const t = setTimeout(fit, 60); return () => clearTimeout(t); }, [html]);
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#05070c]">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Preview · {who}</p>
        <p className="mt-1 text-[13px] leading-5 text-white"><span className="text-white/45">Subject </span>{subject}</p>
      </div>
      {/* allow-same-origin (no scripts) only so the frame can be measured; the HTML is our own escaped template. */}
      <iframe ref={ref} title="Voucher email preview" srcDoc={html} sandbox="allow-same-origin" onLoad={fit} scrolling="no" style={{ height: h }} className="block w-full bg-[#05070c]" />
    </div>
  );
};

const Segmented = <T extends string | number>({ value, options, onChange, label: aria }: { value: T; options: { v: T; label: React.ReactNode }[]; onChange: (v: T) => void; label: string }) => (
  <div role="radiogroup" aria-label={aria} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[14px] border border-white/[0.08] bg-[#1c1c1e]/70 p-[3px]">
    {options.map((o) => {
      const on = o.v === value;
      return (
        <button key={String(o.v)} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.v)}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[11px] px-4 py-1.5 text-[13.5px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 ${on ? 'bg-white/[0.16] text-white shadow-[0_2px_8px_rgba(0,0,0,.35)]' : 'text-white/55 hover:text-white/85'}`}>
          {o.label}
        </button>
      );
    })}
  </div>
);


const Section: React.FC<{ title: string; sub?: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, sub, children, right }) => (
  <div className={card}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[15px] font-semibold text-white">{title}</p>
        {sub && <p className="mt-1 text-[13px] text-white/45">{sub}</p>}
      </div>
      {right}
    </div>
    <div className="mt-5">{children}</div>
  </div>
);

export const VouchersPanel: React.FC = () => {
  // ----- Events -----
  const [events, setEvents] = useState<VoucherEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [selId, setSelId] = useState<string>(() => load(`${STORE}_ui`, { sel: '' }).sel);
  const [draft, setDraft] = useState<Omit<VoucherEvent, 'id'> & { id?: string }>(NEW_EVENT());
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);

  // ----- Sending -----
  const [mode, setMode] = useState<Mode>(() => load(`${STORE}_ui`, { mode: 'board' as Mode }).mode);
  const [raw, setRaw] = useState<string>(() => { try { return localStorage.getItem(`${STORE}_list`) || ''; } catch { return ''; } });
  const [sent, setSent] = useState<Record<string, string>>(() => load(`${STORE}_sent`, {} as Record<string, string>));
  const [status, setStatus] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<number | null>(null);
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState<'' | 'test' | 'all' | 'one'>('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [one, setOne] = useState({ team: '', rank: '', tierId: '', code: '', emails: '' });
  // Special discount: not a CTF result. "Pentest Lab is open worldwide, here is a code for you."
  const [sp, setSp] = useState(() => load(`${STORE}_special`, { percent: 30, prize: '', members: 0, code: '', list: '', via: 'sender' }));
  useEffect(() => save(`${STORE}_special`, sp), [sp]);

  const loadEvents = useCallback(async (select?: string) => {
    setLoadingEvents(true);
    setEventsError('');
    try {
      const { rows } = await sbRows<VoucherEvent>('voucher_events?select=*&order=created_at.desc');
      setEvents(rows);
      const want = select ?? selId;
      const found = rows.find((r) => r.id === want) || rows[0];
      if (found) { setSelId(found.id); setDraft({ ...found, tiers: found.tiers.map((t) => ({ ...t })) }); }
      else { setSelId(''); setDraft(NEW_EVENT()); }
    } catch (e) {
      setEventsError(e instanceof Error ? e.message : 'Could not load events.');
    } finally { setLoadingEvents(false); }
  }, [selId]);
  useEffect(() => { loadEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    campaignApi<{ providers: Provider[] }>().then((d) => setProviders(d.providers || [])).catch(() => setProviders([]));
  }, []);

  // ----- Server queue (voucher_queue) for the selected event -----
  type QRow = { id: number; email: string; status: string; last_error: string; not_before: string; sent_at: string | null; kind: string };
  const [queue, setQueue] = useState<{ rows: QRow[]; at: number } | null>(null);
  const loadQueue = useCallback(async () => {
    if (!selId) { setQueue(null); return; }
    try {
      const { rows: list } = await sbRows<QRow>(`voucher_queue?select=id,email,status,last_error,not_before,sent_at,kind&event_id=eq.${selId}&order=id.desc&limit=5000`);
      setQueue({ rows: list, at: Date.now() });
    } catch { setQueue(null); }
  }, [selId]);
  useEffect(() => { loadQueue(); const t = setInterval(loadQueue, 20_000); return () => clearInterval(t); }, [loadQueue]);
  const qByEmail = useMemo(() => {
    const m = new Map<string, QRow>();
    (queue?.rows || []).forEach((r) => { if (!m.has(r.email)) m.set(r.email, r); }); // newest first
    return m;
  }, [queue]);
  /** Queue state of a set of emails: sent, failed, waiting, or '' when not queued. */
  const qState = (emails: string[]) => {
    const st = emails.map((e) => qByEmail.get(e.toLowerCase())?.status).filter(Boolean) as string[];
    if (!st.length) return '';
    if (st.some((x) => x === 'failed')) return 'failed';
    if (st.every((x) => x === 'sent')) return 'sent';
    if (st.every((x) => x === 'cancelled')) return 'cancelled';
    return 'waiting';
  };
  const qCount = (st: string) => (queue?.rows || []).filter((r) => r.status === st).length;
  const qAction = async (what: 'cancel' | 'retry') => {
    if (!selId) return;
    if (what === 'cancel' && !confirm('Stop the emails that are still waiting? Emails already sent are not affected.')) return;
    try {
      if (what === 'cancel') await sbWrite('PATCH', `voucher_queue?event_id=eq.${selId}&status=eq.pending`, { status: 'cancelled' });
      else await sbWrite('PATCH', `voucher_queue?event_id=eq.${selId}&status=in.(failed,cancelled)`, { status: 'pending', attempts: 0, not_before: new Date().toISOString(), last_error: '' });
      await loadQueue();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not update the queue.' }); }
  };

  useEffect(() => save(`${STORE}_ui`, { sel: selId, mode }), [selId, mode]);
  useEffect(() => { try { localStorage.setItem(`${STORE}_list`, raw); } catch { /* ignore */ } }, [raw]);
  useEffect(() => save(`${STORE}_sent`, sent), [sent]);
  useEffect(() => setMsg(null), [mode, selId]);

  const saved = events.find((e) => e.id === selId);
  const dirty = !saved || JSON.stringify({ ...saved, id: undefined }) !== JSON.stringify({ ...draft, id: undefined });
  const problems = eventProblems(draft);
  const ev = draft; // what the preview and sends use
  const tiers = useMemo(() => [...ev.tiers].sort((a, b) => a.from - b.from), [ev.tiers]);
  const tierFor = (rank: number) => tiers.find((t) => rank >= t.from && rank <= t.to);
  const maxRank = tiers.length ? Math.max(...tiers.map((t) => t.to)) : 0;

  const pickEvent = (id: string) => {
    if (dirty && saved && !confirm('Discard unsaved changes to this event?')) return;
    const e = events.find((x) => x.id === id);
    if (e) { setSelId(e.id); setDraft({ ...e, tiers: e.tiers.map((t) => ({ ...t })) }); setPick(null); setStatus({}); }
  };
  const newEvent = () => {
    if (dirty && saved && !confirm('Discard unsaved changes to this event?')) return;
    setSelId(''); setDraft(NEW_EVENT());
  };
  const duplicate = () => { setSelId(''); setDraft({ ...draft, id: undefined, name: `${draft.name} (copy)`.slice(0, 80), tiers: draft.tiers.map((t) => ({ ...t, id: uid() })) }); };

  const saveEvent = async () => {
    if (problems.length) { setMsg({ ok: false, text: problems[0] }); return; }
    setSaving(true); setMsg(null);
    const row = {
      name: draft.name.trim(), color: draft.color, product: draft.product.trim() || 'CAPT certification', redeem_url: draft.redeem_url.trim(),
      expires: draft.expires || null, style: draft.style, sender: draft.sender, signer: draft.signer.trim(), note: draft.note.trim(),
      tiers: [...draft.tiers].sort((a, b) => a.from - b.from).map((t) => ({ ...t, label: t.label.trim() || rangeLabel(t), prize: t.prize.trim() })),
      updated_at: new Date().toISOString(),
    };
    try {
      if (saved) { await sbWrite('PATCH', `voucher_events?id=eq.${saved.id}`, row); await loadEvents(saved.id); }
      else { const r = await sbInsert<VoucherEvent>('voucher_events', row); await loadEvents(r.id); }
      setMsg({ ok: true, text: `Saved ${row.name}.` });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not save.' }); }
    finally { setSaving(false); }
  };
  const deleteEvent = async () => {
    if (!saved || !confirm(`Delete the event "${saved.name}"? Its settings and prize tiers are removed. Emails already sent are not affected.`)) return;
    try { await sbWrite('DELETE', `voucher_events?id=eq.${saved.id}`); await loadEvents(''); setMsg({ ok: true, text: `Deleted ${saved.name}.` }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not delete.' }); }
  };
  const setTier = (id: string, patch: Partial<Tier>) => setDraft((d) => ({ ...d, tiers: d.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const addTier = () => setDraft((d) => {
    const last = Math.max(0, ...d.tiers.map((t) => t.to));
    return { ...d, tiers: [...d.tiers, { id: uid(), label: '', from: last + 1, to: last + 10, type: 'percent', percent: 50, prize: '', members: 0 }] };
  });

  // ----- Shared vars for every email of this event -----
  const shared = {
    event: ev.name.trim(), product: ev.product.trim() || 'CAPT certification', expires: ev.expires || '', redeemUrl: ev.redeem_url.trim(),
    plain: ev.style === 'plain', signer: ev.signer.trim(), color: ev.color, note: ev.note.trim(),
  };
  const teamVars = (team: string, rank: number, t: Tier, code: string, members?: number) => ({
    team, rank: rank || undefined, tier: t.to <= 10 ? 10 : 50, code, tierLabel: t.label.trim() || rangeLabel(t),
    discount: t.type === 'percent' ? t.percent : undefined, prize: t.type === 'custom' ? t.prize.trim() : '', members: members ?? (t.members || 0),
  });
  const send = (b: object) => {
    if (problems.length) return Promise.reject(new Error(problems[0]));
    if (dirty) return Promise.reject(new Error('Save the event first, so every email matches what is saved.'));
    return post({ ...b, via: mode === 'special' ? sp.via : ev.sender });
  };
  const perRequest = ev.sender === 'resend' ? 100 : 20;
  /** Mail services cap how many emails go out per minute. When one says "slow down", wait a minute and try again (twice at most). */
  const RATE = /429|rate.?limit|too many|throttl|slow down|per minute/i;
  const sendPatient = async (body: { recipients: { email: string }[] } & Record<string, unknown>) => {
    let d = await send(body).catch((e: Error) => { if (RATE.test(e.message)) return { sent: 0, failed: body.recipients.map((r) => r.email), reasons: Object.fromEntries(body.recipients.map((r) => [r.email, e.message])) }; throw e; });
    for (let tries = 0; tries < 2 && d.failed?.length && Object.values(d.reasons || {}).some((x) => RATE.test(x)); tries++) {
      setMsg({ ok: true, text: `The mail service asked us to slow down. Waiting a minute, then sending the rest automatically. Keep this tab open.` });
      await new Promise((r) => setTimeout(r, 65_000));
      const again = new Set(d.failed);
      const r2 = await send({ ...body, recipients: body.recipients.filter((r) => again.has(r.email)) }).catch((e: Error) => ({ sent: 0, failed: [...again], reasons: Object.fromEntries([...again].map((x) => [x, e.message])) }));
      d = { ...d, sent: (d.sent || 0) + (r2.sent || 0), failed: r2.failed || [], reasons: r2.reasons || {} };
    }
    return d;
  };
  const firstReason = (r?: Record<string, string>) => { const x = Object.values(r || {})[0]; return x ? ` Reason: ${x.slice(0, 200).replace(/[.\s]+$/, '')}.` : ''; };
  let lastReason = '';
  const failedNote = (f?: string[]) => (f?.length ? ` Not delivered to: ${f.join(', ')}.` : '');
  const keyOf = (r: { team: string; code: string }) => `${saved?.id || 'new'}|${r.team.toLowerCase()}|${r.code}`;

  // ----- Whole leaderboard -----
  const rows = useMemo(() => {
    const list = parse(raw);
    list.forEach((r) => { if (r.rank && !tiers.some((t) => r.rank >= t.from && r.rank <= t.to)) r.problems.push(`no prize for rank ${r.rank}`); });
    return list;
  }, [raw, tiers]);
  const good = rows.filter((r) => !r.problems.length);
  const pending = good.filter((r) => !sent[keyOf(r)]);
  const emailsToSend = pending.reduce((n, r) => n + r.emails.length, 0);
  const perTier = tiers.map((t) => ({ t, n: good.filter((r) => r.rank >= t.from && r.rank <= t.to).length }));

  // ----- One team -----
  const oneRank = Math.max(0, Math.min(10000, Math.round(Number(one.rank) || 0)));
  const oneTier = tiers.find((t) => t.id === one.tierId) || (oneRank ? tierFor(oneRank) : undefined) || tiers[0];
  const oneEmails = [...new Set((one.emails.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))].slice(0, 100);
  const oneCode = cleanCode(one.code);
  const oneReady = !!one.team.trim() && !!oneCode && oneEmails.length > 0 && !!oneTier;

  // ----- Special discount -----
  // One line per person: email, name (optional), code (optional; else the shared code). Comma, tab or semicolon.
  const sharedCodeUpper = cleanCode(sp.code).toUpperCase();
  const spRows = useMemo<SpecialRow[]>(() => {
    const seen = new Set<string>();
    const out: SpecialRow[] = [];
    sp.list.split(/\r?\n/).forEach((line, i) => {
      const cells = line.split(/[\t,;|]+/).map((c) => c.trim()).filter(Boolean);
      const email = cells.find((c) => ONE_EMAIL.test(c))?.toLowerCase();
      if (!email || seen.has(email)) return;
      seen.add(email);
      // Order matters: email, name, code. With two extra columns the first is the name and the last the code
      // (a handle like "0xVeN0M" is a name, not a code). With one, it is a code only if it looks like one.
      const rest = cells.filter((c) => c.toLowerCase() !== email);
      const looksCode = (c: string) => c.toUpperCase() === sharedCodeUpper || (/^[A-Z0-9_-]{4,}$/.test(c) && /\d/.test(c) && /[A-Z]/.test(c));
      let name = ''; let code = '';
      if (rest.length >= 2) { name = rest[0]; code = cleanCode(rest[rest.length - 1]); }
      else if (rest.length === 1) { if (looksCode(rest[0])) code = cleanCode(rest[0]); else name = rest[0]; }
      name = name.replace(/\s+/g, ' ').slice(0, MAX_FIELD.team);
      out.push({ line: i + 1, email, name, code });
    });
    return out;
  }, [sp.list, sharedCodeUpper]);
  const spShared = cleanCode(sp.code);
  const spPct = Math.min(100, Math.max(1, Math.round(Number(sp.percent) || 1)));
  const spVars = (name: string, code: string) => ({
    team: name.trim() || 'there', code, tier: 50, special: true, members: sp.members || 0,
    discount: sp.prize.trim() ? undefined : spPct, prize: sp.prize.trim(),
  });
  const spKey = (r: SpecialRow) => `${saved?.id || 'new'}|special|${r.email}|${r.code || spShared}`;
  const spReady = spRows.filter((r) => r.code || spShared);
  const spPending = spReady.filter((r) => !sent[spKey(r)]);
  const spPrize = sp.prize.trim() || (spPct >= 100 ? 'Full voucher' : `${spPct}% voucher`);

  // ----- Preview -----
  const boardRow = (pick !== null && rows[pick]) || good[0] || null;
  const sampleTier = tiers[0] || NEW_EVENT().tiers[0];
  const pv = mode === 'one'
    ? { team: one.team.trim() || 'Your team', rank: oneRank, tier: oneTier || sampleTier, code: oneCode || 'CODE-HERE' }
    : boardRow && tierFor(boardRow.rank) ? { team: boardRow.team || 'Team', rank: boardRow.rank, tier: tierFor(boardRow.rank)!, code: boardRow.code || 'CODE-HERE', members: boardRow.members }
    : { team: 'Team Phantom', rank: sampleTier.from, tier: sampleTier, code: 'CODE-X7K2' };
  const spFirst = spRows[0];
  const testVars = mode === 'special'
    ? spVars(spFirst?.name || '', spFirst?.code || spShared || 'CODE-HERE')
    : teamVars(pv.team, pv.rank, pv.tier, pv.code, 'members' in pv ? pv.members : undefined);
  const vars: EmailVars = { ...shared, ...testVars };
  const preview = useMemo(() => renderEmail('team_voucher', vars), [JSON.stringify(vars)]); // eslint-disable-line react-hooks/exhaustive-deps
  const who = mode === 'special' ? (spFirst?.name || spFirst?.email || 'sample person') : mode === 'one' ? (one.team.trim() || 'your team') : boardRow ? boardRow.team : 'sample team';

  const senderOptions = [
    { id: 'auto', label: 'Auto: best for Primary inbox', note: 'Tries Mailgun, Mailjet, Maileroo, SMTP2GO, AhaSend, then Brevo, Sender', ok: true },
    { id: 'brevo,sender', label: 'Brevo + Sender (shared)', note: 'Takes turns between Brevo and Sender; if one is at its limit the other sends', ok: providers.length ? providers.some((p) => (p.id === 'brevo' || p.id === 'sender') && p.configured) : true },
    { id: 'mail', label: 'mail@cyberhx.com (Mailtrap)', note: 'Main domain, like Outreach', ok: providers.length ? !!providers.find((p) => p.id === 'mailtrap')?.configured : true },
    ...providers.filter((p) => p.id !== 'mailtrap' && !p.id.startsWith('resend')).map((p) => ({
      id: p.id, label: `${p.label} · ${p.from.replace(/^.*<|>$/g, '')}`,
      note: p.configured ? (p.day ? `${p.usedToday ?? 0} / ${p.day} sent today` : 'No daily limit') : 'Not connected',
      ok: p.configured,
    })),
  ];
  const viaNow = mode === 'special' ? sp.via : ev.sender;
  const senderName = senderOptions.find((o) => o.id === viaNow)?.label || viaNow;

  const sendTest = async () => {
    if (!ONE_EMAIL.test(testTo.trim())) { setMsg({ ok: false, text: 'Type the email address to send the test to.' }); return; }
    setBusy('test'); setMsg(null);
    try {
      const t = await send({ template: 'team_voucher', recipients: [{ email: testTo.trim(), name: testVars.team, vars: testVars }], vars: shared });
      if (t.failed?.length) throw new Error(`Could not send the test to ${testTo.trim()}.`);
      setMsg({ ok: true, text: `Test sent to ${testTo.trim()} via ${t.providers ? Object.keys(t.providers).join(', ') : senderName}.` });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not send the test.' }); }
    finally { setBusy(''); }
  };

  const sendOne = async () => {
    if (!oneReady || !oneTier) return;
    if (!confirm(`Send ${one.team.trim()}'s ${prizeLabel(oneTier)} (${ev.name}) to ${oneEmails.length} email${oneEmails.length === 1 ? '' : 's'} via ${senderName}?`)) return;
    setBusy('one'); setMsg(null);
    try {
      const v = teamVars(one.team.trim(), oneRank, oneTier, oneCode);
      const r = await send({ template: 'team_voucher', recipients: oneEmails.map((email) => ({ email, name: v.team, vars: v })), vars: shared });
      setSent((s) => ({ ...s, [keyOf({ team: v.team, code: oneCode })]: new Date().toISOString() }));
      setMsg({ ok: !r.failed?.length, text: `Sent to ${r.sent} member${r.sent === 1 ? '' : 's'} of ${v.team}.${failedNote(r.failed)}` });
      setOne({ team: '', rank: '', tierId: one.tierId, code: '', emails: '' });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not send.' }); }
    finally { setBusy(''); }
  };

  const sendTeams = async (list: TeamRow[], again = false) => {
    const chunks: TeamRow[][] = [];
    let cur: TeamRow[] = []; let n = 0;
    for (const r of list) {
      if (n + r.emails.length > perRequest && cur.length) { chunks.push(cur); cur = []; n = 0; }
      cur.push(r); n += r.emails.length;
    }
    if (cur.length) chunks.push(cur);
    let ok = 0; let fail = 0;
    for (const c of chunks) {
      c.forEach((r) => setStatus((s) => ({ ...s, [keyOf(r)]: 'sending' })));
      try {
        const d = await sendPatient({ template: 'team_voucher', recipients: c.flatMap((r) => r.emails.map((email) => ({ email, name: r.team, vars: teamVars(r.team, r.rank, tierFor(r.rank)!, r.code, r.members) }))), vars: shared });
        const stamp = new Date().toISOString();
        const bad = new Set(d.failed || []);
        if (d.failed?.length) lastReason = firstReason(d.reasons);
        const done = c.filter((r) => !r.emails.some((e) => bad.has(e)));
        const missed = c.filter((r) => r.emails.some((e) => bad.has(e)));
        setSent((s) => ({ ...s, ...Object.fromEntries(done.map((r) => [keyOf(r), stamp])) }));
        done.forEach((r) => setStatus((s) => ({ ...s, [keyOf(r)]: 'sent' })));
        missed.forEach((r) => setStatus((s) => ({ ...s, [keyOf(r)]: `failed: not delivered to ${r.emails.filter((e) => bad.has(e)).join(', ')}` })));
        ok += done.length; fail += missed.length;
      } catch (e) {
        const m = e instanceof Error ? e.message : 'failed';
        c.forEach((r) => setStatus((s) => ({ ...s, [keyOf(r)]: `failed: ${m}` })));
        fail += c.length; lastReason = ` Reason: ${m.slice(0, 200).replace(/[.\s]+$/, '')}.`;
        if (/Save the event|name|redeem|tier|prize/i.test(m)) { setMsg({ ok: false, text: m }); return; }
      }
    }
    setMsg(fail
      ? { ok: false, text: `${ok} team${ok === 1 ? '' : 's'} sent, ${fail} failed.${lastReason} Press Send again to retry; teams already sent are skipped.` }
      : { ok: true, text: again ? `Sent again to ${ok} team${ok === 1 ? '' : 's'}.` : `Sent to ${ok} team${ok === 1 ? '' : 's'} via ${senderName}.` });
  };

  /** Put emails in the server queue: about 6 a minute go out, even with this page closed. */
  const enqueue = async (rows: { email: string; name: string; vars: object; kind: 'rank' | 'special'; via: string }[]) => {
    if (problems.length) throw new Error(problems[0]);
    if (dirty || !saved) throw new Error('Save the event first, so every email matches what is saved.');
    let added = 0;
    for (let i = 0; i < rows.length; i += 500) {
      added += await sbRpc<number>('voucher_queue_add', { p_rows: rows.slice(i, i + 500).map((r) => ({ ...r, event_id: saved.id, shared })) });
    }
    return added;
  };
  const minutes = (n: number) => { const m = Math.ceil(n / 6); return m < 60 ? `about ${m} minute${m === 1 ? '' : 's'}` : `about ${Math.round(m / 6) / 10} hours`; };

  const sendAll = async () => {
    if (!pending.length) return;
    const lines = perTier.filter((x) => x.n).map((x) => `${x.t.label || rangeLabel(x.t)}: ${x.n} team${x.n === 1 ? '' : 's'} · ${prizeLabel(x.t)}`).join('\n');
    if (!confirm(`Queue ${emailsToSend} email${emailsToSend === 1 ? '' : 's'} to ${pending.length} team${pending.length === 1 ? '' : 's'} of ${ev.name} via ${senderName}?\n\nThey go out slowly (about 6 a minute), even if you close this page.\n\n${lines}`)) return;
    setBusy('all'); setMsg(null);
    try {
      const added = await enqueue(pending.flatMap((r) => r.emails.map((email) => ({ email, name: r.team, kind: 'rank' as const, via: ev.sender, vars: teamVars(r.team, r.rank, tierFor(r.rank)!, r.code, r.members) }))));
      const stamp = new Date().toISOString();
      setSent((x) => ({ ...x, ...Object.fromEntries(pending.map((r) => [keyOf(r), stamp])) }));
      pending.forEach((r) => setStatus((st) => ({ ...st, [keyOf(r)]: 'queued' })));
      setMsg({ ok: true, text: `${added} email${added === 1 ? '' : 's'} queued${added < emailsToSend ? ` (${emailsToSend - added} were already queued or sent)` : ''}. They go out over ${minutes(added)}; you can close this page.` });
      loadQueue();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not queue the emails.' }); }
    setBusy('');
  };
  const resendTeam = async (r: TeamRow) => {
    if (busy || !confirm(`Send ${r.team}'s email again to ${r.emails.join(', ')}?`)) return;
    setBusy('all'); setMsg(null);
    await sendTeams([r], true);
    setBusy('');
  };

  const sendSpecial = async () => {
    if (!spPending.length) return;
    if (!confirm(`Queue the special discount (${spPrize}) for ${spPending.length} ${spPending.length === 1 ? 'person' : 'people'} via ${senderName}?\n\nThey go out slowly (about 6 a minute), even if you close this page.`)) return;
    setBusy('all'); setMsg(null);
    try {
      const added = await enqueue(spPending.map((r) => ({ email: r.email, name: r.name, kind: 'special' as const, via: sp.via, vars: spVars(r.name, r.code || spShared) })));
      const stamp = new Date().toISOString();
      setSent((x) => ({ ...x, ...Object.fromEntries(spPending.map((r) => [spKey(r), stamp])) }));
      spPending.forEach((r) => setStatus((st) => ({ ...st, [spKey(r)]: 'queued' })));
      setMsg({ ok: true, text: `${added} email${added === 1 ? '' : 's'} queued${added < spPending.length ? ` (${spPending.length - added} were already queued or sent)` : ''}. They go out over ${minutes(added)}; you can close this page.` });
      loadQueue();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not queue the emails.' }); }
    setBusy('');
  };

  const sampleSheet = () => downloadCsv('team-vouchers-template.csv', [
    ['Rank', 'Team', 'Emails', 'Voucher code', 'Members'],
    [1, 'Team Phantom', 'captain@example.com; member@example.com', 'CTF-R1-AB12', 2],
    [11, 'Null Pointers', 'lead@example.com', 'CTF-R11-CD34', 4],
  ]);

  return (
    <div className="space-y-5">
      {/* Events */}
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-[17px] font-semibold text-white"><Gift size={18} style={{ color: ev.color }} /> Vouchers</h3>
            <p className="mt-1 text-[13px] text-white/45">Each event keeps its own look, prize tiers and mail service. Pick one, or create a new one.</p>
          </div>
          <button onClick={newEvent} className="flex items-center gap-1.5 rounded-xl bg-[#0A84FF] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#2b95ff]"><Plus size={15} /> New event</button>
        </div>
        {eventsError && <p className="mt-4 flex items-center gap-1.5 text-sm text-red-300"><AlertTriangle size={14} />{eventsError}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {loadingEvents && !events.length && <Loader2 size={18} className="animate-spin text-white/40" />}
          {events.map((e) => {
            const on = e.id === selId;
            return (
              <button key={e.id} onClick={() => pickEvent(e.id)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] transition ${on ? 'border-white/30 bg-white/[0.1] text-white' : 'border-white/10 text-white/60 hover:text-white'}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />{e.name}
              </button>
            );
          })}
          {!selId && <span className="flex items-center gap-2 rounded-full border border-dashed border-white/25 px-3.5 py-1.5 text-[13.5px] text-white"><span className="h-2.5 w-2.5 rounded-full" style={{ background: draft.color }} />{draft.name.trim() || 'New event'}</span>}
        </div>
      </div>

      {/* Event settings */}
      <Section
        title={saved ? 'Event settings' : 'New event'}
        sub={dirty ? 'Unsaved changes' : 'Saved'}
        right={
          <div className="flex flex-wrap gap-2">
            {saved && <button onClick={duplicate} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white"><Copy size={13} /> Duplicate</button>}
            {saved && <button onClick={deleteEvent} className="flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"><Trash2 size={13} /> Delete</button>}
            <button onClick={saveEvent} disabled={saving || !dirty} className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-white/90 disabled:opacity-40">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save event
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className={label} htmlFor="ve-name">CTF name</label>
            <input id="ve-name" className={`${input} text-[15px] font-medium`} value={draft.name} maxLength={MAX_FIELD.event} placeholder="e.g. CyberHeist 2026" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <p className={label}>Colour</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {SWATCHES.map((c) => (
                <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setDraft({ ...draft, color: c })}
                  className={`h-8 w-8 rounded-full border-2 transition ${draft.color.toLowerCase() === c ? 'border-white' : 'border-transparent hover:border-white/40'}`} style={{ background: c }} />
              ))}
              <input type="color" aria-label="Custom colour" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="h-8 w-8 cursor-pointer rounded-full border border-white/20 bg-transparent" />
            </div>
          </div>
          <div><label className={label} htmlFor="ve-product">Voucher for</label><input id="ve-product" className={input} value={draft.product} maxLength={MAX_FIELD.product} onChange={(e) => setDraft({ ...draft, product: e.target.value })} /></div>
          <div><label className={label} htmlFor="ve-url">Redeem link</label><input id="ve-url" className={input} value={draft.redeem_url} maxLength={300} onChange={(e) => setDraft({ ...draft, redeem_url: e.target.value })} /></div>
          <div><label className={label} htmlFor="ve-exp">Apply before <span className="text-white/30">(optional)</span></label><input id="ve-exp" type="date" className={`${input} [color-scheme:dark]`} value={draft.expires || ''} onChange={(e) => setDraft({ ...draft, expires: e.target.value || null })} /></div>
        </div>

        {/* Prize tiers */}
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Prize tiers</p>
              <p className="mt-0.5 text-[12.5px] text-white/45">Each rank range gets its own prize. A team's rank picks its tier automatically.</p>
            </div>
            <button onClick={addTier} className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/5"><Plus size={13} /> Add tier</button>
          </div>
          <div className="mt-4 space-y-2.5">
            {draft.tiers.map((t) => (
              <div key={t.id} className="grid items-end gap-2.5 rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:grid-cols-[1.2fr_0.55fr_0.55fr_1fr_1.4fr_0.8fr_auto]">
                <div><label className="mb-1 block text-[11px] text-white/45">Tier name</label><input className={input} value={t.label} maxLength={40} placeholder="e.g. Winner" onChange={(e) => setTier(t.id, { label: e.target.value })} /></div>
                <div><label className="mb-1 block text-[11px] text-white/45">From rank</label><input type="number" min={1} className={input} value={t.from} onChange={(e) => setTier(t.id, { from: Math.max(1, Math.round(Number(e.target.value) || 1)) })} /></div>
                <div><label className="mb-1 block text-[11px] text-white/45">To rank</label><input type="number" min={1} className={input} value={t.to} onChange={(e) => setTier(t.id, { to: Math.max(1, Math.round(Number(e.target.value) || 1)) })} /></div>
                <div>
                  <label className="mb-1 block text-[11px] text-white/45">Prize type</label>
                  <select className={input} value={t.type} onChange={(e) => setTier(t.id, { type: e.target.value as Tier['type'] })}>
                    <option value="percent">% voucher</option>
                    <option value="custom">Custom prize</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-white/45">{t.type === 'percent' ? 'Voucher %' : 'Prize'}</label>
                  {t.type === 'percent' ? (
                    <div className="relative"><input type="number" min={1} max={100} className={`${input} pr-8`} value={t.percent} onChange={(e) => setTier(t.id, { percent: Math.min(100, Math.max(1, Math.round(Number(e.target.value) || 1))) })} /><span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">%</span></div>
                  ) : (
                    <input className={input} value={t.prize} maxLength={120} placeholder="e.g. CAPT voucher + CyberHx hoodie" onChange={(e) => setTier(t.id, { prize: e.target.value })} />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-white/45">Members who can use it</label>
                  <select className={input} value={t.members} onChange={(e) => setTier(t.id, { members: Number(e.target.value) })}>
                    <option value={0}>Team only</option>
                    {[2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>Up to {n}</option>)}
                  </select>
                </div>
                <button type="button" aria-label="Remove tier" onClick={() => setDraft({ ...draft, tiers: draft.tiers.filter((x) => x.id !== t.id) })} className="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-red-300"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* How it goes out */}
        <div className="mt-6 grid gap-4 border-t border-white/[0.06] pt-5 lg:grid-cols-2">
          <div>
            <p className={label}>Email style</p>
            <div role="radiogroup" aria-label="Email style" className="grid gap-2 sm:grid-cols-2">
              {([
                { v: 'plain', title: 'Simple letter', sub: 'Best for Gmail Primary. Plain text, code in bold.' },
                { v: 'designed', title: 'Designed', sub: 'Coloured card and button. Often filed in Promotions.' },
              ] as const).map((o) => {
                const on = draft.style === o.v;
                return (
                  <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => setDraft({ ...draft, style: o.v })}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${on ? 'border-[#0A84FF] bg-[#0A84FF]/10' : 'border-white/10 hover:border-white/25'}`}>
                    <span className="text-sm font-semibold text-white">{o.title}</span>
                    <span className="mt-0.5 block text-[12px] text-white/45">{o.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="ve-sender">Mail service</label>
              <select id="ve-sender" className={input} value={draft.sender} onChange={(e) => setDraft({ ...draft, sender: e.target.value })}>
                {senderOptions.map((o) => <option key={o.id} value={o.id} disabled={!o.ok}>{o.label}{o.ok ? '' : ' (not connected)'}</option>)}
              </select>
              <p className="mt-1.5 text-[11.5px] text-white/35">{senderOptions.find((o) => o.id === draft.sender)?.note}</p>
            </div>
            <div><label className={label} htmlFor="ve-signer">Signed by <span className="text-white/30">(optional)</span></label><input id="ve-signer" className={input} value={draft.signer} maxLength={MAX_FIELD.name} placeholder="Your name" onChange={(e) => setDraft({ ...draft, signer: e.target.value })} /></div>
            <div><label className={label} htmlFor="ve-note">Extra line <span className="text-white/30">(optional)</span></label><input id="ve-note" className={input} value={draft.note} maxLength={300} placeholder="Shown near the end" onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></div>
          </div>
        </div>

        {problems.length > 0 && (
          <ul className="mt-5 space-y-1 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3.5 text-[13px] text-amber-200">
            {problems.map((p) => <li key={p}>• {p}</li>)}
          </ul>
        )}
      </Section>

      <Segmented label="How to send" value={mode} onChange={setMode} options={[
        { v: 'board' as Mode, label: <><Users size={14} /> Whole leaderboard</> },
        { v: 'one' as Mode, label: <><User size={14} /> One team</> },
        { v: 'special' as Mode, label: <><Globe size={14} /> Special discount</> },
      ]} />

      {mode === 'special' ? (
        <Section title="Special discount" sub="Not a CTF result: CyberHx Pentest Lab is open worldwide, so we invite people from every university and country with a personal code. Uses this event's look, redeem link, date and mail service.">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={label} htmlFor="sp-pct">Voucher %</label>
                <div className="relative"><input id="sp-pct" type="number" min={1} max={100} className={`${input} pr-8`} value={sp.percent} disabled={!!sp.prize.trim()} onChange={(e) => setSp({ ...sp, percent: Number(e.target.value) || 1 })} /><span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">%</span></div>
              </div>
              <div>
                <label className={label} htmlFor="sp-prize">Or a custom offer <span className="text-white/30">(optional)</span></label>
                <input id="sp-prize" className={input} value={sp.prize} maxLength={120} placeholder="e.g. 3 months of Pentest Lab" onChange={(e) => setSp({ ...sp, prize: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor="sp-members">Who can use the code</label>
                <select id="sp-members" className={input} value={sp.members} onChange={(e) => setSp({ ...sp, members: Number(e.target.value) })}>
                  <option value={0}>Only them</option>
                  {[2, 3, 5, 10, 25, 50].map((n) => <option key={n} value={n}>Up to {n} people</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={label} htmlFor="sp-via">Mail service for the special discount</label>
              <select id="sp-via" className={input} value={sp.via} onChange={(e) => setSp({ ...sp, via: e.target.value })}>
                {senderOptions.map((o) => <option key={o.id} value={o.id} disabled={!o.ok}>{o.label}{o.ok ? '' : ' (not connected)'}</option>)}
              </select>
              <p className="mt-1.5 text-[11.5px] text-white/35">{senderOptions.find((o) => o.id === sp.via)?.note} · Kept separate from the event's own mail service.</p>
            </div>
            <div>
              <label className={label} htmlFor="sp-code">Voucher code for everyone <span className="text-white/30">(used when a line has no code of its own)</span></label>
              <input id="sp-code" className={`${input} font-mono tracking-wider`} value={sp.code} maxLength={MAX_FIELD.code} placeholder="CXGLOBAL30" onChange={(e) => setSp({ ...sp, code: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor="sp-list">People <span className="text-white/30">· one per line: email, name (optional), code (optional) · {spRows.length} found</span></label>
              <textarea id="sp-list" rows={7} className={`${input} resize-y font-mono text-[12.5px] leading-6`} value={sp.list} onChange={(e) => setSp({ ...sp, list: e.target.value })}
                placeholder={'aman@example.com, Aman\nstudent@university.edu, Priya, CX-PRIYA-30\nsomeone@example.com'} />
            </div>
            {spRows.length > 0 && (
              <div className="max-h-[320px] overflow-auto rounded-2xl border border-white/[0.08]">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-[#10151f]">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                      <th className="px-3 py-2.5 font-medium">Email</th><th className="px-3 py-2.5 font-medium">Name</th><th className="px-3 py-2.5 font-medium">Code</th><th className="px-3 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spRows.map((r) => {
                      const k = spKey(r);
                      const q = qByEmail.get(r.email);
                      const st = q?.status === 'pending' || q?.status === 'sending' ? 'queued' : q?.status === 'failed' ? `failed: ${q.last_error || 'not delivered'}` : q?.status === 'sent' ? 'sent' : status[k] || (sent[k] ? 'sent' : '');
                      const code = r.code || spShared;
                      return (
                        <tr key={r.email} className="border-t border-white/5">
                          <td className="max-w-[16rem] truncate px-3 py-2.5 text-white/80">{r.email}</td>
                          <td className="px-3 py-2.5 text-white/60">{r.name || <span className="text-white/30">Hi there</span>}</td>
                          <td className="px-3 py-2.5 font-mono text-[12px] text-white/75">{code || <span className="text-red-300">no code</span>}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                            {!code ? <span className="text-red-300">add a code</span>
                              : st === 'sending' ? <span className="flex items-center gap-1 text-white/50"><Loader2 size={12} className="animate-spin" />Sending</span>
                              : st === 'sent' ? <span className="flex items-center gap-1 text-[#30d158]"><Check size={12} />Sent</span>
                              : st === 'queued' ? <span className="text-amber-200/80">Waiting in queue</span>
                              : st.startsWith('failed') ? <span className="block max-w-[18rem] whitespace-normal text-red-300" title={st}>Failed{st.length > 7 ? `: ${st.slice(8, 140)}` : ''}</span>
                              : <span className="text-white/45">Ready</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Section>
      ) : mode === 'board' ? (
        <Section
          title="Leaderboard"
          sub={`Paste from Google Sheets: Rank, Team, Email(s), Voucher code, Members (optional). Ranks 1–${maxRank || '…'} get a prize.`}
          right={<button onClick={sampleSheet} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white"><Download size={13} /> Sample sheet</button>}
        >
          <textarea
            id="v-list" rows={7} value={raw}
            onChange={(e) => { setRaw(e.target.value); setPick(null); }}
            placeholder={'1\tTeam Phantom\tcaptain@example.com; member@example.com\tCTF-R1-AB12\n11\tNull Pointers\tlead@example.com\tCTF-R11-CD34'}
            className={`${input} resize-y font-mono text-[12.5px] leading-6`}
          />
          {rows.length > 0 && (
            <>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {perTier.map(({ t, n }) => (
                  <span key={t.id} className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-white/75">
                    <span className="h-2 w-2 rounded-full" style={{ background: ev.color }} />{t.label || rangeLabel(t)} · {n} team{n === 1 ? '' : 's'} · {prizeLabel(t)}
                  </span>
                ))}
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/70">{good.reduce((n, r) => n + r.emails.length, 0)} emails</span>
                {rows.length - good.length > 0 && <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-red-300">{rows.length - good.length} to fix</span>}
              </div>
              <div className="mt-3 max-h-[420px] overflow-auto rounded-2xl border border-white/[0.08]">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-[#10151f]">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                      <th className="px-3 py-2.5 font-medium">#</th><th className="px-3 py-2.5 font-medium">Team</th><th className="px-3 py-2.5 font-medium">Emails</th>
                      <th className="px-3 py-2.5 font-medium">Code</th><th className="px-3 py-2.5 font-medium">Prize</th><th className="px-3 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const k = keyOf(r);
                      const qs = qState(r.emails);
                      const st = qs === 'waiting' ? 'queued' : qs === 'failed' ? `failed: ${r.emails.map((e) => qByEmail.get(e)?.last_error).find(Boolean) || 'not delivered'}` : qs === 'sent' ? 'sent' : status[k] || (sent[k] ? 'sent' : '');
                      const t = r.rank ? tierFor(r.rank) : undefined;
                      return (
                        <tr key={`${r.line}-${i}`} onClick={() => setPick(i)} className={`cursor-pointer border-t border-white/5 ${pick === i || (pick === null && boardRow === r) ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                          <td className="px-3 py-2.5 tabular-nums text-white/80">{r.rank || '—'}</td>
                          <td className="max-w-[11rem] truncate px-3 py-2.5 text-white">{r.team || <span className="text-white/30">—</span>}</td>
                          <td className="max-w-[14rem] truncate px-3 py-2.5 text-white/55" title={r.emails.join(', ')}>{r.emails.join(', ') || <span className="text-white/30">—</span>}</td>
                          <td className="px-3 py-2.5 font-mono text-[12px] text-white/75">{r.code || <span className="text-white/30">—</span>}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-white/60">{t ? `${t.label || rangeLabel(t)} · ${prizeLabel(t)}` : '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                            {r.problems.length ? <span className="text-red-300">{r.problems.join(', ')}</span>
                              : st === 'sending' ? <span className="flex items-center gap-1 text-white/50"><Loader2 size={12} className="animate-spin" />Sending</span>
                              : st === 'sent' ? (
                                <span className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-[#30d158]"><Check size={12} />Sent</span>
                                  <button onClick={(e) => { e.stopPropagation(); resendTeam(r); }} disabled={!!busy} className="rounded-md border border-white/10 px-1.5 py-0.5 text-[11px] text-white/60 hover:text-white disabled:opacity-40">Resend</button>
                                </span>
                              )
                              : st === 'queued' ? <span className="text-amber-200/80">Waiting in queue</span>
                              : st.startsWith('failed') ? <span className="text-red-300" title={st}>Failed</span>
                              : <span className="text-white/45">Ready</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11.5px] text-white/35">Click a team to preview its email. Rows with a problem are skipped. Teams already sent are remembered on this device.</p>
            </>
          )}
        </Section>
      ) : (
        <Section title="One team" sub="For a single team, or a late addition to the leaderboard.">
          <div className="space-y-4">
            <div>
              <p className={label}>Prize tier</p>
              <div role="radiogroup" aria-label="Prize tier" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tiers.map((t) => {
                  const on = oneTier?.id === t.id;
                  return (
                    <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setOne({ ...one, tierId: t.id })}
                      className="rounded-2xl border px-4 py-3 text-left transition"
                      style={on ? { borderColor: ev.color, background: `${ev.color}14` } : { borderColor: 'rgba(255,255,255,.1)' }}>
                      <span className="block text-sm font-semibold text-white">{t.label || rangeLabel(t)}</span>
                      <span className="mt-0.5 block text-[12px] text-white/45">{rangeLabel(t)} · {prizeLabel(t)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <div><label className={label} htmlFor="v1-team">Team name</label><input id="v1-team" className={input} value={one.team} maxLength={MAX_FIELD.team} onChange={(e) => setOne({ ...one, team: e.target.value })} placeholder="Jokers" /></div>
              <div>
                <label className={label} htmlFor="v1-rank">Rank</label>
                <input id="v1-rank" type="number" min={1} className={input} value={one.rank} placeholder="1"
                  onChange={(e) => { const r = Number(e.target.value) || 0; const t = r ? tierFor(r) : undefined; setOne({ ...one, rank: e.target.value, tierId: t ? t.id : one.tierId }); }} />
              </div>
            </div>
            <div><label className={label} htmlFor="v1-code">Voucher code</label><input id="v1-code" className={`${input} font-mono tracking-wider`} value={one.code} maxLength={MAX_FIELD.code} onChange={(e) => setOne({ ...one, code: e.target.value })} placeholder="CTF-R1-AB12" /></div>
            <div>
              <label className={label} htmlFor="v1-emails">Team member emails <span className="text-white/30">· {oneEmails.length}</span></label>
              <textarea id="v1-emails" rows={4} className={`${input} resize-y font-mono text-[13px]`} value={one.emails} onChange={(e) => setOne({ ...one, emails: e.target.value })} placeholder={'captain@example.com\nmember@example.com'} />
            </div>
          </div>
        </Section>
      )}

      {/* Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${card} flex flex-col`}>
          <p className="text-sm font-semibold text-white">Send a test first</p>
          <p className="mt-1 text-[12.5px] text-white/45">The email in the preview, through {senderName}.</p>
          <div className="mt-auto flex gap-2 pt-4">
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email" placeholder="you@cyberhx.com" aria-label="Test email address" className={input} />
            <button onClick={sendTest} disabled={!!busy} className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white hover:bg-white/5 disabled:opacity-50">
              {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send test
            </button>
          </div>
        </div>
        <div className={`${card} flex flex-col`}>
          {mode === 'special' ? (
            <>
              <p className="text-sm font-semibold text-white">Send the special discount</p>
              <p className="mb-4 mt-1 text-[12.5px] text-white/45">{spPending.length ? `${spPending.length} ${spPending.length === 1 ? 'person' : 'people'} · ${spPrize} · ${senderName}` : spReady.length ? 'Everyone on the list is queued or sent.' : 'Add people and a voucher code first.'}</p>
              <button onClick={sendSpecial} disabled={!!busy || !spPending.length} className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0A84FF] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#2b95ff] disabled:opacity-40">
                {busy === 'all' ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Queue for everyone
              </button>
            </>
          ) : mode === 'board' ? (
            <>
              <p className="text-sm font-semibold text-white">Send to every team</p>
              <p className="mb-4 mt-1 text-[12.5px] text-white/45">{pending.length ? `${pending.length} team${pending.length === 1 ? '' : 's'} · ${emailsToSend} email${emailsToSend === 1 ? '' : 's'} · ${senderName}` : good.length ? 'Every team on the list is queued or sent.' : 'Paste the leaderboard first.'}</p>
              <button onClick={sendAll} disabled={!!busy || !pending.length} className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0A84FF] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#2b95ff] disabled:opacity-40">
                {busy === 'all' ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Queue for all teams
              </button>
              {Object.keys(sent).length > 0 && (
                <button onClick={() => { if (confirm('Forget which teams were sent on this device? They could then be sent again.')) setSent({}); }} className="mt-2 w-full text-[11px] text-white/35 hover:text-white/60">Reset sent list</button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-white">Send to this team</p>
              <p className="mb-4 mt-1 text-[12.5px] text-white/45">{oneReady && oneTier ? `${oneEmails.length} email${oneEmails.length === 1 ? '' : 's'} · ${prizeLabel(oneTier)} · ${senderName}` : 'Add the team name, code and at least one email.'}</p>
              <button onClick={sendOne} disabled={!!busy || !oneReady} className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0A84FF] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#2b95ff] disabled:opacity-40">
                {busy === 'one' ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Send to team
              </button>
            </>
          )}
        </div>
      </div>
      {msg && (
        <p className={`flex items-start gap-2 rounded-2xl p-3.5 text-sm ${msg.ok ? 'border border-[#30d158]/30 bg-[#30d158]/[0.06] text-[#30d158]' : 'border border-red-500/30 bg-red-500/5 text-red-300'}`}>
          {msg.ok ? <Check size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />} {msg.text}
        </p>
      )}
      {queue && queue.rows.length > 0 && (
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Mail queue · {ev.name}</p>
              <p className="mt-1 text-[12.5px] text-white/45">About 6 emails a minute, one by one. It keeps going when this page is closed. If a mail service hits its limit, those emails wait and try again later.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadQueue} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white">Refresh</button>
              {qCount('pending') > 0 && <button onClick={() => qAction('cancel')} className="rounded-xl border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">Stop waiting emails</button>}
              {qCount('failed') + qCount('cancelled') > 0 && <button onClick={() => qAction('retry')} className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/5">Try failed again</button>}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Waiting', qCount('pending') + qCount('sending'), 'text-amber-200'],
              ['Sent', qCount('sent'), 'text-[#30d158]'],
              ['Failed', qCount('failed'), 'text-red-300'],
              ['Stopped', qCount('cancelled'), 'text-white/50'],
            ].map(([k, v, c]) => (
              <div key={k as string} className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3">
                <p className={`text-2xl font-semibold tabular-nums ${c}`}>{v as number}</p>
                <p className="text-[12px] text-white/45">{k as string}</p>
              </div>
            ))}
          </div>
          {qCount('pending') + qCount('sending') > 0 && <p className="mt-3 text-[12px] text-white/40">Done in {minutes(qCount('pending') + qCount('sending'))} if nothing is held back by a limit.</p>}
          {(queue.rows.filter((r) => r.status === 'failed' || (r.status === 'pending' && r.last_error)).slice(0, 5)).map((r) => (
            <p key={r.id} className="mt-2 truncate text-[12px] text-red-300/90" title={r.last_error}>
              {r.email}: {r.status === 'pending' ? `waiting (${r.last_error.slice(0, 120)}), next try ${new Date(r.not_before).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : r.last_error.slice(0, 160)}
            </p>
          ))}
        </div>
      )}
      {dirty && <p className="text-[12px] text-amber-200/80">Save the event before sending, so every email matches the saved settings.</p>}

      <MailPreview html={preview.html} subject={preview.subject} who={who} />
    </div>
  );
};

export default VouchersPanel;
