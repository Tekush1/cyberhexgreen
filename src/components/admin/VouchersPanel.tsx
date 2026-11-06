import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Download, Gift, Loader2, Send, Trophy, Users, User } from 'lucide-react';
import { TOKEN_KEY } from './adminApi';
import { renderEmail, MAX_FIELD, type EmailVars } from '../../../shared/emailTemplates';
import { downloadCsv } from './mailingApi';

/* Admin -> Vouchers: reward the leaderboard of a CyberHx CTF.
   Whole leaderboard: paste Rank, Team, Email(s), Voucher code. Ranks 1-10 get the Top 10 email, 11-50 the Top 50 one.
   One team: type one team's details. Every member email gets its own copy, addressed to the team, with the team's code.
   Sending goes through /api/email (template team_voucher). */

export const VOUCHER_EVENTS = [
  { id: 'null-origin-ctf-2026', name: 'Null Origin CTF 2026', short: 'Null Origin CTF', year: '2026' },
  { id: 'pinaka-ctf-2026', name: 'Pinaka CTF 2026', short: 'Pinaka CTF', year: '2026' },
] as const;

const EMAIL_RE = /[^\s<>,;|"'()]+@[^\s<>,;|"'()]+\.[a-z]{2,}/gi;
const ONE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORE = 'cx_vouchers_v2';
const GOLD = '#f5c542';

interface Settings { event: string; product: string; redeemUrl: string; expires: string; top10: number; top50: number; plain: boolean; signer: string; via: 'mail' | 'resend' }
interface TeamRow { line: number; rank: number; team: string; emails: string[]; code: string; problems: string[] }
type Mode = 'board' | 'one';

const DEFAULTS: Settings = { event: VOUCHER_EVENTS[0].name, product: 'CAPT certification', redeemUrl: 'https://pentestlab.cyberhx.com/capt', expires: '', top10: 100, top50: 80, plain: true, signer: '', via: 'mail' };

const input = 'w-full bg-[#05080f] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#0A84FF]/70';
const label = 'block text-[12px] font-medium text-white/55 mb-1.5';
const card = 'rounded-[22px] border border-white/[0.08] bg-[#0b0f19] p-5 sm:p-6';

const load = <T,>(k: string, fb: T): T => { try { const v = localStorage.getItem(k); return v ? { ...fb, ...JSON.parse(v) } : fb; } catch { return fb; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const cleanCode = (c: string) => c.trim().replace(/[^\w-]/g, '').slice(0, MAX_FIELD.code);
const offLabel = (n: number) => (n >= 100 ? 'Full voucher' : `${n}% voucher`);

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
  let col = { rank: 0, team: 1, emails: 2, code: 3 };
  let start = 0;
  const head = split(lines[0]).map((c) => c.toLowerCase());
  if (head.some((c) => /team|rank|code|voucher|email/.test(c)) && !(lines[0].match(EMAIL_RE) || []).length) {
    const find = (re: RegExp, fb: number) => { const i = head.findIndex((c) => re.test(c)); return i >= 0 ? i : fb; };
    col = { rank: find(/rank|pos|place|#/, 0), team: find(/team/, 1), emails: find(/mail/, 2), code: find(/code|voucher|coupon/, 3) };
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
    else if (rank > 50) problems.push('rank above 50');
    if (!team) problems.push('no team name');
    if (!emails.length) problems.push('no email');
    if (!code) problems.push('no voucher code');
    rows.push({ line: i + 1, rank, team, emails, code, problems });
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
  return data as { sent: number; failed?: string[] };
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

export const VouchersPanel: React.FC = () => {
  const [set, setSet] = useState<Settings>(() => {
    const s = load(STORE, DEFAULTS);
    // Older saved settings still point at the lab's home page: vouchers are redeemed on /capt.
    return /^https:\/\/pentestlab\.cyberhx\.com\/?$/.test(s.redeemUrl) ? { ...s, redeemUrl: DEFAULTS.redeemUrl } : s;
  });
  const [mode, setMode] = useState<Mode>(() => (load(`${STORE}_ui`, { mode: 'board' as Mode }).mode));
  const [raw, setRaw] = useState<string>(() => { try { return localStorage.getItem(`${STORE}_list`) || ''; } catch { return ''; } });
  const [sent, setSent] = useState<Record<string, string>>(() => load(`${STORE}_sent`, {} as Record<string, string>));
  const [status, setStatus] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<number | null>(null);
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState<'' | 'test' | 'all' | 'one'>('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // One team
  const [one, setOne] = useState({ team: '', rank: '', tier: 10 as 10 | 50, code: '', emails: '' });

  useEffect(() => save(STORE, set), [set]);
  useEffect(() => save(`${STORE}_ui`, { mode }), [mode]);
  useEffect(() => { try { localStorage.setItem(`${STORE}_list`, raw); } catch { /* ignore */ } }, [raw]);
  useEffect(() => save(`${STORE}_sent`, sent), [sent]);
  useEffect(() => setMsg(null), [mode]);

  const keyOf = (r: { team: string; code: string }) => `${set.event}|${r.team.toLowerCase()}|${r.code}`;
  const tierOf = (rank: number) => (rank > 0 && rank <= 10 ? 10 : 50);
  const shared = { event: set.event.trim(), product: set.product.trim() || 'CAPT certification', expires: set.expires, redeemUrl: set.redeemUrl.trim(), plain: set.plain, signer: set.signer.trim() };
  /** Every send goes out from the address picked under "Send from". */
  const send = (b: object) => (set.event.trim() ? post({ ...b, via: set.via }) : Promise.reject(new Error('Type the CTF name first.')));
  const perRequest = set.via === 'mail' ? 20 : 100;
  const failedNote = (f?: string[]) => (f?.length ? ` Not delivered to: ${f.join(', ')}.` : '');
  const teamVars = (team: string, rank: number, tier: 10 | 50, code: string) => ({ team, rank: rank || undefined, tier, code, discount: tier === 10 ? set.top10 : set.top50 });

  // ----- Whole leaderboard -----
  const rows = useMemo(() => parse(raw), [raw]);
  const good = rows.filter((r) => !r.problems.length);
  const top10 = good.filter((r) => r.rank <= 10);
  const top50 = good.filter((r) => r.rank > 10);
  const pending = good.filter((r) => !sent[keyOf(r)]);
  const emailsToSend = pending.reduce((n, r) => n + r.emails.length, 0);

  // ----- One team -----
  const oneRank = Math.max(0, Math.min(10000, Math.round(Number(one.rank) || 0)));
  const oneEmails = [...new Set((one.emails.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))].slice(0, 100);
  const oneCode = cleanCode(one.code);
  const oneReady = !!one.team.trim() && !!oneCode && oneEmails.length > 0;

  // ----- Preview -----
  const sample = { team: 'Team Phantom', rank: 3, code: 'CAPT-TOP10-X7K2' };
  const boardRow = (pick !== null && rows[pick]) || good[0] || null;
  const pv = mode === 'one'
    ? { team: one.team.trim() || 'Your team', rank: oneRank, tier: one.tier, code: oneCode || 'CODE-HERE' }
    : boardRow ? { team: boardRow.team || 'Team', rank: boardRow.rank, tier: tierOf(boardRow.rank) as 10 | 50, code: boardRow.code || 'CODE-HERE' }
    : { ...sample, tier: 10 as const };
  const vars: EmailVars = { ...shared, ...teamVars(pv.team, pv.rank, pv.tier, pv.code) };
  const preview = useMemo(() => renderEmail('team_voucher', vars), [JSON.stringify(vars)]); // eslint-disable-line react-hooks/exhaustive-deps
  const who = mode === 'one' ? (one.team.trim() || 'your team') : boardRow ? boardRow.team : 'sample team';

  const sendTest = async () => {
    if (!ONE_EMAIL.test(testTo.trim())) { setMsg({ ok: false, text: 'Type the email address to send the test to.' }); return; }
    setBusy('test'); setMsg(null);
    try {
      const t = await send({ template: 'team_voucher', recipients: [{ email: testTo.trim(), name: pv.team, vars: teamVars(pv.team, pv.rank, pv.tier, pv.code) }], vars: shared });
      if (t.failed?.length) throw new Error(`Could not send the test to ${testTo.trim()}.`);
      setMsg({ ok: true, text: `Test sent to ${testTo.trim()} from ${set.via === 'mail' ? 'mail@cyberhx.com' : 'team@mail.cyberhx.com'}.` });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not send the test.' }); }
    finally { setBusy(''); }
  };

  const sendOne = async () => {
    if (!oneReady) return;
    if (!confirm(`Send ${one.team.trim()}'s voucher (${offLabel(one.tier === 10 ? set.top10 : set.top50)}) to ${oneEmails.length} email${oneEmails.length === 1 ? '' : 's'}?`)) return;
    setBusy('one'); setMsg(null);
    try {
      const v = teamVars(one.team.trim(), oneRank, one.tier, oneCode);
      const r = await send({ template: 'team_voucher', recipients: oneEmails.map((email) => ({ email, name: v.team, vars: v })), vars: shared });
      setSent((s) => ({ ...s, [keyOf({ team: v.team, code: oneCode })]: new Date().toISOString() }));
      setMsg({ ok: !r.failed?.length, text: `Voucher sent to ${r.sent} member${r.sent === 1 ? '' : 's'} of ${v.team}.${failedNote(r.failed)}` });
      setOne({ team: '', rank: '', tier: one.tier, code: '', emails: '' });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not send.' }); }
    finally { setBusy(''); }
  };

  /** Send one leaderboard team again (lost email, new member, wrong address fixed). */
  const resendTeam = async (r: TeamRow) => {
    if (busy) return;
    if (!confirm(`Send ${r.team}'s voucher again to ${r.emails.join(', ')}?`)) return;
    const k = keyOf(r);
    setBusy('all'); setMsg(null);
    setStatus((s) => ({ ...s, [k]: 'sending' }));
    try {
      const d = await send({ template: 'team_voucher', recipients: r.emails.map((email) => ({ email, name: r.team, vars: teamVars(r.team, r.rank, tierOf(r.rank) as 10 | 50, r.code) })), vars: shared });
      setSent((s) => ({ ...s, [k]: new Date().toISOString() }));
      setStatus((s) => ({ ...s, [k]: 'sent' }));
      setMsg({ ok: !d.failed?.length, text: `Sent ${r.team}'s voucher again.${failedNote(d.failed)}` });
    } catch (e) {
      setStatus((s) => ({ ...s, [k]: `failed: ${e instanceof Error ? e.message : 'failed'}` }));
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not send.' });
    } finally { setBusy(''); }
  };

  const sendAll = async () => {
    if (!pending.length) return;
    if (!confirm(`Send ${emailsToSend} email${emailsToSend === 1 ? '' : 's'} to ${pending.length} team${pending.length === 1 ? '' : 's'} of ${set.event}?\n\nTop 10: ${offLabel(set.top10)} · Top 50: ${offLabel(set.top50)} on ${shared.product}.`)) return;
    setBusy('all'); setMsg(null);
    const chunks: TeamRow[][] = [];
    let cur: TeamRow[] = []; let n = 0;
    for (const r of pending) {
      if (n + r.emails.length > perRequest && cur.length) { chunks.push(cur); cur = []; n = 0; }
      cur.push(r); n += r.emails.length;
    }
    if (cur.length) chunks.push(cur);
    let ok = 0; let fail = 0;
    for (const c of chunks) {
      c.forEach((r) => setStatus((s) => ({ ...s, [keyOf(r)]: 'sending' })));
      try {
        const d = await send({ template: 'team_voucher', recipients: c.flatMap((r) => r.emails.map((email) => ({ email, name: r.team, vars: teamVars(r.team, r.rank, tierOf(r.rank) as 10 | 50, r.code) }))), vars: shared });
        const stamp = new Date().toISOString();
        // A team counts as sent only when every one of its emails went out.
        const bad = new Set(d.failed || []);
        const done = c.filter((r) => !r.emails.some((e) => bad.has(e)));
        const missed = c.filter((r) => r.emails.some((e) => bad.has(e)));
        setSent((s) => ({ ...s, ...Object.fromEntries(done.map((r) => [keyOf(r), stamp])) }));
        done.forEach((r) => setStatus((s) => ({ ...s, [keyOf(r)]: 'sent' })));
        missed.forEach((r) => setStatus((s) => ({ ...s, [keyOf(r)]: `failed: not delivered to ${r.emails.filter((e) => bad.has(e)).join(', ')}` })));
        ok += done.length;
        fail += missed.length;
      } catch (e) {
        const m = e instanceof Error ? e.message : 'failed';
        c.forEach((r) => setStatus((s) => ({ ...s, [keyOf(r)]: `failed: ${m}` })));
        fail += c.length;
      }
    }
    setBusy('');
    setMsg(fail
      ? { ok: false, text: `${ok} team${ok === 1 ? '' : 's'} sent, ${fail} failed. Press Send again to retry; teams already sent are skipped.` }
      : { ok: true, text: `Vouchers sent to ${ok} team${ok === 1 ? '' : 's'}.` });
  };

  const sampleSheet = () => downloadCsv('team-vouchers-template.csv', [
    ['Rank', 'Team', 'Emails', 'Voucher code'],
    [1, 'Team Phantom', 'captain@example.com; member@example.com', 'CAPT-TOP10-AB12'],
    [11, 'Null Pointers', 'lead@example.com', 'CAPT-TOP50-CD34'],
  ]);

  const pct = (k: 'top10' | 'top50') => (
    <div className="relative">
      <input id={`v-${k}`} type="number" min={1} max={100} className={`${input} pr-8`} value={set[k]} onChange={(e) => setSet({ ...set, [k]: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">%</span>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Event + mode */}
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-[17px] font-semibold text-white"><Gift size={18} style={{ color: GOLD }} /> Vouchers</h3>
            <p className="mt-1 text-[13px] text-white/45">Reward a CTF's top teams: each member gets the team's code in a personal email.</p>
          </div>
          <div className="w-full sm:w-80">
            <label className={label} htmlFor="v-event">CTF name</label>
            <input
              id="v-event"
              list="v-event-list"
              className={`${input} text-[15px] font-medium`}
              value={set.event}
              maxLength={MAX_FIELD.event}
              placeholder="Any CTF, e.g. CyberHeist 2026"
              onChange={(e) => setSet({ ...set, event: e.target.value })}
            />
            <datalist id="v-event-list">{VOUCHER_EVENTS.map((e) => <option key={e.id} value={e.name} />)}</datalist>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VOUCHER_EVENTS.map((e) => (
                <button key={e.id} type="button" onClick={() => setSet({ ...set, event: e.name })}
                  className={`rounded-full border px-2.5 py-0.5 text-[11.5px] transition ${set.event === e.name ? 'border-[#0A84FF] text-white' : 'border-white/10 text-white/50 hover:text-white'}`}>
                  {e.short}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1"><label className={label} htmlFor="v-product">Voucher for</label><input id="v-product" className={input} value={set.product} maxLength={MAX_FIELD.product} onChange={(e) => setSet({ ...set, product: e.target.value })} /></div>
          <div className="lg:col-span-1"><label className={label} htmlFor="v-url">Redeem link</label><input id="v-url" className={input} value={set.redeemUrl} maxLength={300} onChange={(e) => setSet({ ...set, redeemUrl: e.target.value })} /></div>
          <div><label className={label} htmlFor="v-top10"><Trophy size={12} className="-mt-0.5 mr-1 inline" style={{ color: GOLD }} />Top 10 discount</label>{pct('top10')}</div>
          <div><label className={label} htmlFor="v-top50">Top 50 discount</label>{pct('top50')}</div>
          <div><label className={label} htmlFor="v-exp">Valid until <span className="text-white/30">(optional)</span></label><input id="v-exp" type="date" className={`${input} [color-scheme:dark]`} value={set.expires} onChange={(e) => setSet({ ...set, expires: e.target.value })} /></div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 lg:grid-cols-[1fr_16rem]">
          <div>
            <p className={label}>Email style</p>
            <div role="radiogroup" aria-label="Email style" className="grid gap-2 sm:grid-cols-2">
              {([
                { v: true, title: 'Simple letter', sub: 'Lands in Gmail Primary. Plain text, code in bold.' },
                { v: false, title: 'Designed', sub: 'Coupon card and button. Gmail usually files it in Promotions.' },
              ] as const).map((o) => {
                const on = set.plain === o.v;
                return (
                  <button key={String(o.v)} type="button" role="radio" aria-checked={on} onClick={() => setSet({ ...set, plain: o.v })}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${on ? 'border-[#0A84FF] bg-[#0A84FF]/10' : 'border-white/10 hover:border-white/25'}`}>
                    <span className="flex items-center gap-2 text-sm font-semibold text-white">{o.title}{o.v && <span className="rounded-full bg-[#30d158]/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#30d158]">Recommended</span>}</span>
                    <span className="mt-0.5 block text-[12px] text-white/45">{o.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={label} htmlFor="v-signer">Signed by <span className="text-white/30">(optional)</span></label>
            <input id="v-signer" className={input} value={set.signer} maxLength={MAX_FIELD.name} onChange={(e) => setSet({ ...set, signer: e.target.value })} placeholder="Your name" />
            <p className="mt-1.5 text-[11.5px] text-white/35">A real name above "Team CyberHx" also helps it reach Primary.</p>
          </div>
        </div>

        <div className="mt-4">
          <p className={label}>Send from</p>
          <div role="radiogroup" aria-label="Send from" className="grid gap-2 sm:grid-cols-2">
            {([
              { v: 'mail', title: 'mail@cyberhx.com', sub: 'Main domain, like Outreach (Mailtrap). About 150 a day, shared with Outreach.' },
              { v: 'resend', title: 'team@mail.cyberhx.com', sub: 'Resend, like meeting emails. 100 a day on the free plan.' },
            ] as const).map((o) => {
              const on = set.via === o.v;
              return (
                <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => setSet({ ...set, via: o.v })}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${on ? 'border-[#0A84FF] bg-[#0A84FF]/10' : 'border-white/10 hover:border-white/25'}`}>
                  <span className="flex items-center gap-2 font-mono text-[13px] font-semibold text-white">{o.title}{o.v === 'mail' && <span className="rounded-full bg-[#30d158]/15 px-2 py-0.5 font-sans text-[10.5px] font-semibold text-[#30d158]">Recommended</span>}</span>
                  <span className="mt-0.5 block text-[12px] text-white/45">{o.sub}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-white/35">Replies always go to mail@cyberhx.com. {set.signer.trim() ? `Shows as "${set.signer.trim()} from CyberHx".` : 'Fill "Signed by" to show a person\'s name as the sender.'}</p>
        </div>
      </div>

      <Segmented label="How to send" value={mode} onChange={setMode} options={[
        { v: 'board' as Mode, label: <><Users size={14} /> Whole leaderboard</> },
        { v: 'one' as Mode, label: <><User size={14} /> One team</> },
      ]} />

      <div className="space-y-5">
        <div className="min-w-0 space-y-5">
          {mode === 'board' ? (
            <div className={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[15px] font-semibold text-white" htmlFor="v-list">Leaderboard</label>
                <button onClick={sampleSheet} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white"><Download size={13} /> Sample sheet</button>
              </div>
              <p className="mt-1 text-[13px] text-white/45">Paste from Google Sheets: Rank, Team, Email(s), Voucher code. Several emails can share one cell.</p>
              <textarea
                id="v-list"
                rows={7}
                value={raw}
                onChange={(e) => { setRaw(e.target.value); setPick(null); }}
                placeholder={'1\tTeam Phantom\tcaptain@example.com; member@example.com\tCAPT-TOP10-AB12\n11\tNull Pointers\tlead@example.com\tCAPT-TOP50-CD34'}
                className={`${input} mt-3 resize-y font-mono text-[12.5px] leading-6`}
              />

              {rows.length > 0 && (
                <>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border px-2.5 py-1" style={{ borderColor: `${GOLD}66`, color: GOLD, background: `${GOLD}14` }}>Top 10 · {top10.length} team{top10.length === 1 ? '' : 's'} · {offLabel(set.top10)}</span>
                    <span className="rounded-full border border-[#a3e635]/40 bg-[#a3e635]/10 px-2.5 py-1 text-[#a3e635]">Top 50 · {top50.length} team{top50.length === 1 ? '' : 's'} · {offLabel(set.top50)}</span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/70">{good.reduce((n, r) => n + r.emails.length, 0)} emails</span>
                    {rows.length - good.length > 0 && <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-red-300">{rows.length - good.length} to fix</span>}
                  </div>
                  <div className="mt-3 max-h-[420px] overflow-auto rounded-2xl border border-white/[0.08]">
                    <table className="w-full text-[13px]">
                      <thead className="sticky top-0 bg-[#10151f]">
                        <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                          <th className="px-3 py-2.5 font-medium">#</th><th className="px-3 py-2.5 font-medium">Team</th><th className="px-3 py-2.5 font-medium">Emails</th>
                          <th className="px-3 py-2.5 font-medium">Code</th><th className="px-3 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const k = keyOf(r);
                          const st = status[k] || (sent[k] ? 'sent' : '');
                          const t10 = r.rank > 0 && r.rank <= 10;
                          return (
                            <tr key={`${r.line}-${i}`} onClick={() => setPick(i)} className={`cursor-pointer border-t border-white/5 ${pick === i || (pick === null && boardRow === r) ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                              <td className="px-3 py-2.5 tabular-nums">
                                {r.rank ? <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold" style={t10 ? { background: `${GOLD}22`, color: GOLD } : r.rank <= 50 ? { background: 'rgba(163,230,53,.12)', color: '#a3e635' } : { color: 'rgba(255,255,255,.4)' }}>{r.rank}</span> : '—'}
                              </td>
                              <td className="max-w-[11rem] truncate px-3 py-2.5 text-white">{r.team || <span className="text-white/30">—</span>}</td>
                              <td className="max-w-[14rem] truncate px-3 py-2.5 text-white/55" title={r.emails.join(', ')}>{r.emails.join(', ') || <span className="text-white/30">—</span>}</td>
                              <td className="px-3 py-2.5 font-mono text-[12px] text-white/75">{r.code || <span className="text-white/30">—</span>}</td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                                {r.problems.length ? <span className="text-red-300">{r.problems.join(', ')}</span>
                                  : st === 'sending' ? <span className="flex items-center gap-1 text-white/50"><Loader2 size={12} className="animate-spin" />Sending</span>
                                  : st === 'sent' ? (
                                    <span className="flex items-center gap-2">
                                      <span className="flex items-center gap-1 text-[#30d158]"><Check size={12} />Sent</span>
                                      <button type="button" disabled={!!busy} onClick={(e) => { e.stopPropagation(); resendTeam(r); }} className="rounded-lg border border-white/15 px-2 py-0.5 text-[11px] text-white/70 hover:border-white/30 hover:text-white disabled:opacity-40">Resend</button>
                                    </span>
                                  )
                                  : st.startsWith('failed') ? <span className="text-red-300" title={st}>Failed</span>
                                  : <span className="text-white/45">{t10 ? 'Top 10' : 'Top 50'} · {offLabel(t10 ? set.top10 : set.top50)}</span>}
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
            </div>
          ) : (
            <div className={`${card} space-y-4`}>
              <div>
                <p className="text-[15px] font-semibold text-white">One team</p>
                <p className="mt-1 text-[13px] text-white/45">For a single team, or a late addition to the leaderboard.</p>
              </div>
              <div>
                <p className={label}>Placed in</p>
                <div role="radiogroup" aria-label="Tier" className="grid grid-cols-2 gap-2">
                  {([10, 50] as const).map((t) => {
                    const on = one.tier === t;
                    return (
                      <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setOne({ ...one, tier: t })}
                        className="rounded-2xl border px-4 py-3 text-left transition"
                        style={on ? { borderColor: t === 10 ? GOLD : '#a3e635', background: t === 10 ? `${GOLD}14` : 'rgba(163,230,53,.08)' } : { borderColor: 'rgba(255,255,255,.1)' }}>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">{t === 10 && <Trophy size={14} style={{ color: GOLD }} />}Top {t}</span>
                        <span className="mt-0.5 block text-[12px] text-white/45">{t === 10 ? 'Ranks 1–10' : 'Ranks 11–50'} · {offLabel(t === 10 ? set.top10 : set.top50)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                <div><label className={label} htmlFor="v1-team">Team name</label><input id="v1-team" className={input} value={one.team} maxLength={MAX_FIELD.team} onChange={(e) => setOne({ ...one, team: e.target.value })} placeholder="Jokers" /></div>
                <div>
                  <label className={label} htmlFor="v1-rank">Rank</label>
                  <input id="v1-rank" type="number" min={1} className={input} value={one.rank} placeholder={one.tier === 10 ? '1–10' : '11–50'}
                    onChange={(e) => { const r = Number(e.target.value) || 0; setOne({ ...one, rank: e.target.value, tier: r ? (r <= 10 ? 10 : 50) : one.tier }); }} />
                </div>
              </div>
              <div><label className={label} htmlFor="v1-code">Voucher code</label><input id="v1-code" className={`${input} font-mono tracking-wider`} value={one.code} maxLength={MAX_FIELD.code} onChange={(e) => setOne({ ...one, code: e.target.value })} placeholder="CAPT-TOP10-AB12" /></div>
              <div>
                <label className={label} htmlFor="v1-emails">Team member emails <span className="text-white/30">· {oneEmails.length}</span></label>
                <textarea id="v1-emails" rows={4} className={`${input} resize-y font-mono text-[13px]`} value={one.emails} onChange={(e) => setOne({ ...one, emails: e.target.value })} placeholder={'captain@example.com\nmember@example.com'} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`${card} flex flex-col`}>
              <p className="text-sm font-semibold text-white">Send a test first</p>
              <p className="mt-1 text-[12.5px] text-white/45">The email in the preview, to one address.</p>
              <div className="mt-auto flex gap-2 pt-4">
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email" placeholder="you@cyberhx.com" aria-label="Test email address" className={input} />
              <button onClick={sendTest} disabled={!!busy} className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white hover:bg-white/5 disabled:opacity-50">
                {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send test
              </button>
              </div>
            </div>
            <div className={`${card} flex flex-col`}>
              {mode === 'board' ? (
                <>
                  <p className="text-sm font-semibold text-white">Send to every team</p>
                  <p className="mb-4 mt-1 text-[12.5px] text-white/45">{pending.length ? `${pending.length} team${pending.length === 1 ? '' : 's'} · ${emailsToSend} email${emailsToSend === 1 ? '' : 's'}` : good.length ? 'Every team on the list has been sent.' : 'Paste the leaderboard first.'}</p>
                  <button onClick={sendAll} disabled={!!busy || !pending.length} className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0A84FF] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#2b95ff] disabled:opacity-40">
                    {busy === 'all' ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Send vouchers
                  </button>
                  {Object.keys(sent).length > 0 && (
                    <button onClick={() => { if (confirm('Forget which teams were sent on this device? They could then be sent again.')) setSent({}); }} className="mt-2 w-full text-[11px] text-white/35 hover:text-white/60">Reset sent list</button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-white">Send to this team</p>
                  <p className="mb-4 mt-1 text-[12.5px] text-white/45">{oneReady ? `${oneEmails.length} email${oneEmails.length === 1 ? '' : 's'} · ${offLabel(one.tier === 10 ? set.top10 : set.top50)}` : 'Add the team name, code and at least one email.'}</p>
                  <button onClick={sendOne} disabled={!!busy || !oneReady} className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0A84FF] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#2b95ff] disabled:opacity-40">
                    {busy === 'one' ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Send voucher
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
          <p className="text-[11.5px] text-white/30">{set.via === 'mail' ? 'Sending from mail@cyberhx.com: about 150 emails a day, shared with Outreach.' : 'Sending through Resend: 100 emails a day on the free plan.'} If a send stops at the limit, press Send again the next day; teams already sent are skipped.</p>
        </div>

        <MailPreview html={preview.html} subject={preview.subject} who={who} />
      </div>
    </div>
  );
};

export default VouchersPanel;
