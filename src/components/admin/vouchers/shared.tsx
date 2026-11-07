import React, { useEffect, useRef, useState } from 'react';
import { TOKEN_KEY } from '../adminApi';
import { MAX_FIELD } from '../../../../shared/emailTemplates';

/* Shared pieces of Admin -> Vouchers (Send, History, Events, Mail services).
   Data lives in Supabase:
     voucher_events   saved CTFs: look, product, redeem link, date, style, signer, prize tiers
     voucher_batches  one row per "Queue" press
     voucher_queue    one row per email (the record): waiting -> sent / failed / stopped
   pg_cron sends ~5 emails a minute through /api/voucher-queue, so nothing depends on this page staying open. */

export interface Tier { id: string; label: string; from: number; to: number; type: 'percent' | 'custom'; percent: number; prize: string; members: number }
export interface VoucherEvent {
  id: string; name: string; color: string; product: string; redeem_url: string; expires: string | null;
  style: 'plain' | 'designed'; sender: string; signer: string; note: string; tiers: Tier[];
}
export type EventDraft = Omit<VoucherEvent, 'id'> & { id?: string };
export interface Provider { id: string; label: string; configured: boolean; from: string; day: number | null; usedToday?: number }
export interface Rest { provider: string; until: string; reason: string }
export type Status = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
export interface QueueRecord {
  id: number; batch_id: string | null; event_id: string | null; event_name: string; kind: 'rank' | 'special';
  email: string; name: string; vars: Record<string, unknown>; shared: Record<string, unknown>; via: string; status: Status;
  attempts: number; last_error: string; provider: string; not_before: string; sent_at: string | null; created_at: string; copy: number;
}
export interface BatchStat {
  id: string; event_id: string | null; event_name: string; kind: 'rank' | 'one' | 'special' | 'imported'; label: string; via: string;
  created_by: string; created_at: string; total: number; waiting: number; sent: number; failed: number; stopped: number;
  last_sent_at: string | null; next_try: string | null;
}

export const EMAIL_RE = /[^\s<>,;|"'()]+@[^\s<>,;|"'()]+\.[a-z]{2,}/gi;
export const ONE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const STORE = 'cx_vouchers_v4';
export const SWATCHES = ['#ff4545', '#f5c542', '#c6f135', '#30d158', '#0a84ff', '#bf5af2', '#ff9f0a', '#64d2ff'];
export const PER_MINUTE = 5;

export const input = 'w-full bg-[#05080f] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#0A84FF]/70 disabled:opacity-50';
export const label = 'block text-[12px] font-medium text-white/55 mb-1.5';
export const card = 'rounded-[22px] border border-white/[0.08] bg-[#0b0f19] p-5 sm:p-6';
export const btn = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/75 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none';
export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A84FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2b95ff] disabled:opacity-40 disabled:pointer-events-none';
export const btnDanger = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40 disabled:pointer-events-none';

export const load = <T,>(k: string, fb: T): T => { try { const v = localStorage.getItem(k); return v ? { ...fb, ...JSON.parse(v) } : fb; } catch { return fb; } };
export const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
export const cleanCode = (c: string) => c.trim().replace(/[^\w-]/g, '').slice(0, MAX_FIELD.code);
export const uid = () => Math.random().toString(36).slice(2, 8);
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
export const prizeLabel = (t: Pick<Tier, 'type' | 'prize' | 'percent'>) => (t.type === 'custom' ? (t.prize.trim() || 'Custom prize') : t.percent >= 100 ? 'Full voucher' : `${t.percent}% voucher`);
export const rangeLabel = (t: Pick<Tier, 'from' | 'to'>) => (t.from === t.to ? `Rank ${t.from}` : `Ranks ${t.from}–${t.to}`);
export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
/** "about 12 minutes" for n emails at the queue's pace. */
export const duration = (n: number) => { const m = Math.ceil(n / PER_MINUTE); return m < 60 ? `about ${m} minute${m === 1 ? '' : 's'}` : `about ${(Math.round(m / 6) / 10).toLocaleString('en-IN')} hours`; };

export const NEW_EVENT = (): EventDraft => ({
  name: '', color: '#c6f135', product: 'CAPT certification', redeem_url: 'https://pentestlab.cyberhx.com/capt', expires: null,
  style: 'plain', sender: 'auto', signer: '', note: '',
  tiers: [
    { id: uid(), label: 'Top 10', from: 1, to: 10, type: 'percent', percent: 100, prize: '', members: 0 },
    { id: uid(), label: 'Top 50', from: 11, to: 50, type: 'percent', percent: 80, prize: '', members: 4 },
  ],
});

/** Problems with an event's settings that would make a send go wrong. */
export function eventProblems(e: EventDraft): string[] {
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

/** Shared email settings of an event (the same for every person in a send). */
export const eventShared = (ev: EventDraft) => ({
  event: ev.name.trim(), product: ev.product.trim() || 'CAPT certification', expires: ev.expires || '', redeemUrl: ev.redeem_url.trim(),
  plain: ev.style === 'plain', signer: ev.signer.trim(), color: ev.color, note: ev.note.trim(),
});

/* ───────── Reading pasted lists / CSV files ───────── */

/** Splits one line of a sheet: tabs (copied from Sheets/Excel), else commas with "quoted, cells", else semicolons. */
export function splitCells(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  if (!line.includes(',') && line.includes(';') && !(line.match(EMAIL_RE) || []).length) return line.split(';').map((c) => c.trim());
  const out: string[] = []; let cur = ''; let q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  out.push(cur.trim());
  return out;
}
const lines = (text: string) => text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

export interface TeamRow { line: number; rank: number; team: string; emails: string[]; code: string; members?: number; problems: string[] }

/** Leaderboard: Rank, Team, Email(s), Voucher code, Members (optional). A header row is detected and can be in any order. */
export function parseBoard(text: string): TeamRow[] {
  const ls = lines(text);
  if (!ls.length) return [];
  let col = { rank: 0, team: 1, emails: 2, code: 3, members: -1 };
  let start = 0;
  const head = splitCells(ls[0]).map((c) => c.toLowerCase());
  if (head.some((c) => /team|rank|code|voucher|email/.test(c)) && !(ls[0].match(EMAIL_RE) || []).length) {
    const find = (re: RegExp, fb: number) => { const i = head.findIndex((c) => re.test(c)); return i >= 0 ? i : fb; };
    col = { rank: find(/rank|pos|place|#/, 0), team: find(/team/, 1), emails: find(/mail/, 2), code: find(/code|voucher|coupon/, 3), members: find(/member|players|size/, -1) };
    start = 1;
  }
  const rows: TeamRow[] = [];
  for (let i = start; i < ls.length; i++) {
    const c = splitCells(ls[i]);
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
  const codes = new Map<string, number>();
  rows.forEach((r) => r.code && codes.set(r.code.toUpperCase(), (codes.get(r.code.toUpperCase()) || 0) + 1));
  rows.forEach((r) => { if (r.code && (codes.get(r.code.toUpperCase()) || 0) > 1) r.problems.push('code used twice'); });
  const ranks = new Map<number, number>();
  rows.forEach((r) => r.rank && ranks.set(r.rank, (ranks.get(r.rank) || 0) + 1));
  rows.forEach((r) => { if (r.rank && (ranks.get(r.rank) || 0) > 1) r.problems.push('rank used twice'); });
  return rows.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
}

export interface PersonRow { line: number; email: string; name: string; code: string; problems: string[] }

/**
 * People list for the special discount. One per line: email, name, code — name and code optional.
 * A header row (Email / Name / Code in any order) is detected. Without one, the order is email, name, code:
 * with two extra cells the first is the name and the last the code, so a handle like "0xVeN0M" stays a name.
 */
export function parsePeople(text: string, sharedCode: string): PersonRow[] {
  const ls = lines(text);
  if (!ls.length) return [];
  const shared = cleanCode(sharedCode).toUpperCase();
  let col: { email: number; name: number; code: number } | null = null;
  let start = 0;
  const head = splitCells(ls[0]).map((c) => c.toLowerCase());
  if (!(ls[0].match(EMAIL_RE) || []).length && head.some((c) => /mail/.test(c))) {
    const find = (re: RegExp) => head.findIndex((c) => re.test(c));
    col = { email: find(/mail/), name: find(/name|user|handle|team/), code: find(/code|voucher|coupon/) };
    start = 1;
  }
  const looksCode = (c: string) => c.toUpperCase() === shared || (/^[A-Z0-9_-]{4,}$/.test(c) && /\d/.test(c) && /[A-Z]/.test(c));
  const seen = new Set<string>();
  const out: PersonRow[] = [];
  for (let i = start; i < ls.length; i++) {
    const cells = splitCells(ls[i]).map((c) => c.trim());
    let email = ''; let name = ''; let code = '';
    if (col) {
      email = (cells[col.email] || '').toLowerCase();
      name = col.name >= 0 ? cells[col.name] || '' : '';
      code = col.code >= 0 ? cells[col.code] || '' : '';
    } else {
      email = (cells.find((c) => ONE_EMAIL.test(c)) || cells.find((c) => c.includes('@')) || '').toLowerCase();
      const rest = cells.filter((c) => c && c.toLowerCase() !== email);
      if (rest.length >= 2) { name = rest[0]; code = rest[rest.length - 1]; }
      else if (rest.length === 1) { if (looksCode(rest[0])) code = rest[0]; else name = rest[0]; }
    }
    const problems: string[] = [];
    if (!ONE_EMAIL.test(email)) problems.push(email ? 'email looks wrong' : 'no email');
    else if (seen.has(email)) problems.push('listed twice (gets one email)');
    seen.add(email);
    code = cleanCode(code);
    if (!code && !shared) problems.push('no voucher code');
    out.push({ line: i + 1, email, name: name.replace(/\s+/g, ' ').slice(0, MAX_FIELD.team), code, problems });
  }
  return out;
}

/** Reads a dropped / chosen file as text (CSV, TSV, TXT). */
export const readFile = (f: File) => new Promise<string>((ok, fail) => {
  if (f.size > 5_000_000) { fail(new Error('That file is over 5 MB. Split it or paste the rows.')); return; }
  const r = new FileReader();
  r.onload = () => ok(String(r.result || ''));
  r.onerror = () => fail(new Error('Could not read that file.'));
  r.readAsText(f);
});

/* ───────── Direct send (test emails only) ───────── */

export async function sendTestEmail(body: object) {
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

/* ───────── Mail services ───────── */

export const CHAIN = ['Mailgun', 'Mailjet', 'Maileroo', 'SMTP2GO', 'AhaSend', 'Brevo', 'Sender', 'Mailtrap'];

export interface SenderOption { id: string; label: string; short: string; note: string; ok: boolean }
export function senderOptions(providers: Provider[]): SenderOption[] {
  const known = providers.length > 0;
  const conn = (id: string) => (known ? !!providers.find((p) => p.id === id)?.configured : true);
  return [
    { id: 'auto', label: 'Auto (all services in turn)', short: 'Auto', note: `Tries ${CHAIN.join(' → ')}. A service at its limit is skipped until it is free again.`, ok: true },
    { id: 'mail', label: 'mail@cyberhx.com only (Mailtrap)', short: 'mail@cyberhx.com', note: 'Only the main domain. If Mailtrap is at its limit, emails wait for it.', ok: conn('mailtrap') },
    { id: 'brevo,sender', label: 'Brevo + Sender (taking turns)', short: 'Brevo + Sender', note: 'Brevo and Sender share the load; when both are full, the other services take over.', ok: conn('brevo') || conn('sender') },
    ...providers.filter((p) => p.id !== 'mailtrap' && !p.id.startsWith('resend')).map((p) => ({
      id: p.id, label: `${p.label} first · ${p.from.replace(/^.*<|>$/g, '')}`, short: p.label,
      note: p.configured
        ? `${p.label} sends first${p.day ? ` (${p.usedToday ?? 0} / ${p.day} today)` : ''}. When it reaches its limit, the next service sends, then the next.`
        : 'Not connected in Vercel.',
      ok: p.configured,
    })),
  ];
}
export const viaShort = (via: string, providers: Provider[]) => senderOptions(providers).find((o) => o.id === via)?.short || via || '—';

/* ───────── Small UI pieces ───────── */

export const Section: React.FC<{ title: string; sub?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode; className?: string }> = ({ title, sub, children, right, className = '' }) => (
  <div className={`${card} ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-white">{title}</p>
        {sub && <div className="mt-1 text-[13px] text-white/45">{sub}</div>}
      </div>
      {right}
    </div>
    <div className="mt-5">{children}</div>
  </div>
);

export const Segmented = <T extends string | number>({ value, options, onChange, label: aria }: { value: T; options: { v: T; label: React.ReactNode }[]; onChange: (v: T) => void; label: string }) => (
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

const STATUS_STYLE: Record<string, [string, string]> = {
  pending: ['Waiting', 'text-amber-200 bg-amber-400/10 border-amber-400/25'],
  sending: ['Sending', 'text-sky-200 bg-sky-400/10 border-sky-400/25'],
  sent: ['Sent', 'text-[#30d158] bg-[#30d158]/10 border-[#30d158]/25'],
  failed: ['Failed', 'text-red-300 bg-red-500/10 border-red-500/25'],
  cancelled: ['Stopped', 'text-white/55 bg-white/[0.04] border-white/10'],
  ready: ['Ready', 'text-white/70 bg-white/[0.04] border-white/10'],
  already: ['Already got it', 'text-violet-200 bg-violet-400/10 border-violet-400/25'],
  problem: ['Fix this', 'text-red-300 bg-red-500/10 border-red-500/25'],
};
export const StatusPill: React.FC<{ s: string; title?: string }> = ({ s, title }) => {
  const [t, c] = STATUS_STYLE[s] || [s, 'text-white/60 border-white/10'];
  return <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${c}`}>{t}</span>;
};

export const Notice: React.FC<{ msg: { ok: boolean; text: React.ReactNode } | null; onClose?: () => void }> = ({ msg, onClose }) => (msg ? (
  <div role="status" className={`flex items-start justify-between gap-3 rounded-2xl p-3.5 text-sm ${msg.ok ? 'border border-[#30d158]/30 bg-[#30d158]/[0.06] text-[#30d158]' : 'border border-red-500/30 bg-red-500/5 text-red-300'}`}>
    <div className="min-w-0">{msg.text}</div>
    {onClose && <button onClick={onClose} aria-label="Close" className="shrink-0 text-white/40 hover:text-white">×</button>}
  </div>
) : null);

/** The email exactly as it will arrive, at full height (no scrollbar inside the frame). */
export const MailPreview: React.FC<{ html: string; subject: string; who: string }> = ({ html, subject, who }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(600);
  const fit = () => {
    try { const d = ref.current?.contentDocument; if (d?.body) setH(Math.max(360, Math.ceil(d.body.getBoundingClientRect().height) + 24)); } catch { /* keep */ }
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

/** Progress bar of a batch: sent / waiting / failed / stopped. */
export const Progress: React.FC<{ b: Pick<BatchStat, 'total' | 'sent' | 'waiting' | 'failed' | 'stopped'> }> = ({ b }) => {
  const pct = (n: number) => `${b.total ? (n / b.total) * 100 : 0}%`;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
      <span className="bg-[#30d158]" style={{ width: pct(b.sent) }} />
      <span className="bg-amber-300/80" style={{ width: pct(b.waiting) }} />
      <span className="bg-red-400" style={{ width: pct(b.failed) }} />
      <span className="bg-white/25" style={{ width: pct(b.stopped) }} />
    </div>
  );
};
