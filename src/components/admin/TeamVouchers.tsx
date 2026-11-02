import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Download, Gift, Loader2, Send, Trophy } from 'lucide-react';
import { TOKEN_KEY } from './adminApi';
import { renderEmail, type EmailVars } from '../../../shared/emailTemplates';
import { downloadCsv } from './mailingApi';

/* Admin -> Emails -> Team vouchers.
   Paste the leaderboard (Rank, Team, Email(s), Voucher code). Ranks 1-10 get the Top 10 email and discount,
   11-50 the Top 50 one. Every member email gets its own copy, greeting the team by name, with the team's code. */

const EMAIL_RE = /[^\s<>,;|"'()]+@[^\s<>,;|"'()]+\.[a-z]{2,}/gi;
const STORE = 'cx_team_vouchers_v1';

interface Settings { event: string; product: string; redeemUrl: string; expires: string; top10: number; top50: number }
interface TeamRow { line: number; rank: number; team: string; emails: string[]; code: string; problems: string[] }

const DEFAULTS: Settings = { event: 'Pinaka CTF 2026', product: 'CAPT certification', redeemUrl: 'https://pentestlab.cyberhx.com', expires: '', top10: 100, top50: 80 };

const input = 'w-full bg-[#05080f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';
const label = 'block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5';

const load = <T,>(k: string, fb: T): T => { try { const v = localStorage.getItem(k); return v ? { ...fb, ...JSON.parse(v) } : fb; } catch { return fb; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

/** Reads pasted rows from Google Sheets / Excel / CSV. Header row optional; default column order Rank, Team, Emails, Code. */
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
  if (head.some((c) => /team|rank|code|voucher|email/.test(c)) && !EMAIL_RE.test(lines[0])) {
    const find = (re: RegExp, fb: number) => { const i = head.findIndex((c) => re.test(c)); return i >= 0 ? i : fb; };
    col = { rank: find(/rank|pos|place|#/, 0), team: find(/team/, 1), emails: find(/mail/, 2), code: find(/code|voucher|coupon/, 3) };
    start = 1;
  }
  EMAIL_RE.lastIndex = 0;
  const rows: TeamRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const c = split(lines[i]);
    const rank = Number(String(c[col.rank] || '').replace(/[^\d]/g, ''));
    const team = (c[col.team] || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const emails = [...new Set((String(c[col.emails] || '').match(EMAIL_RE) || []).map((e) => e.toLowerCase()))];
    const code = String(c[col.code] || '').trim().replace(/[^\w-]/g, '').slice(0, 60);
    const problems: string[] = [];
    if (!rank) problems.push('no rank');
    else if (rank > 50) problems.push('rank above 50');
    if (!team) problems.push('no team name');
    if (!emails.length) problems.push('no email');
    if (!code) problems.push('no voucher code');
    rows.push({ line: i + 1, rank, team, emails, code, problems });
  }
  // Same code on two teams is almost always a paste mistake.
  const seen = new Map<string, number>();
  rows.forEach((r) => r.code && seen.set(r.code.toUpperCase(), (seen.get(r.code.toUpperCase()) || 0) + 1));
  rows.forEach((r) => { if (r.code && (seen.get(r.code.toUpperCase()) || 0) > 1) r.problems.push('code used twice'); });
  return rows.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
}

const keyOf = (s: Settings, r: TeamRow) => `${s.event}|${r.team.toLowerCase()}|${r.code}`;

async function send(body: object) {
  const res = await fetch('/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); window.location.reload(); throw new Error('Session expired.'); }
  if (!res.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
  return data as { sent: number };
}

export const TeamVouchers: React.FC = () => {
  const [set, setSet] = useState<Settings>(() => load(STORE, DEFAULTS));
  const [raw, setRaw] = useState<string>(() => { try { return localStorage.getItem(`${STORE}_list`) || ''; } catch { return ''; } });
  const [sent, setSent] = useState<Record<string, string>>(() => load(`${STORE}_sent`, {} as Record<string, string>));
  const [status, setStatus] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<number | null>(null);
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState<'' | 'test' | 'all'>('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => save(STORE, set), [set]);
  useEffect(() => { try { localStorage.setItem(`${STORE}_list`, raw); } catch { /* ignore */ } }, [raw]);
  useEffect(() => save(`${STORE}_sent`, sent), [sent]);

  const rows = useMemo(() => parse(raw), [raw]);
  const good = rows.filter((r) => !r.problems.length);
  const top10 = good.filter((r) => r.rank <= 10);
  const top50 = good.filter((r) => r.rank > 10);
  const pending = good.filter((r) => !sent[keyOf(set, r)]);
  const emailsToSend = pending.reduce((n, r) => n + r.emails.length, 0);

  const varsFor = (r: TeamRow): EmailVars => ({
    team: r.team, rank: r.rank, tier: r.rank <= 10 ? 10 : 50, code: r.code,
    discount: r.rank <= 10 ? set.top10 : set.top50,
    event: set.event, product: set.product, expires: set.expires, redeemUrl: set.redeemUrl,
  });
  const sample: TeamRow = { line: 0, rank: 3, team: 'Team Phantom', emails: [], code: 'CAPT-TOP10-X7K2', problems: [] };
  const previewRow = (pick !== null && rows[pick]) || good[0] || sample;
  const preview = useMemo(() => renderEmail('team_voucher', varsFor(previewRow)), [previewRow, set]); // eslint-disable-line react-hooks/exhaustive-deps

  const recipientsOf = (r: TeamRow, to?: string) =>
    (to ? [to] : r.emails).map((email) => ({ email, name: r.team, vars: { team: r.team, rank: r.rank, tier: r.rank <= 10 ? 10 : 50, code: r.code, discount: r.rank <= 10 ? set.top10 : set.top50 } }));
  const shared = { event: set.event, product: set.product, expires: set.expires, redeemUrl: set.redeemUrl };

  const sendTest = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo.trim())) { setMsg({ ok: false, text: 'Type the email address to send the test to.' }); return; }
    setBusy('test'); setMsg(null);
    try {
      await send({ template: 'team_voucher', recipients: recipientsOf(previewRow, testTo.trim()), vars: shared });
      setMsg({ ok: true, text: `Test sent to ${testTo.trim()} (as ${previewRow.team}).` });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not send the test.' }); }
    finally { setBusy(''); }
  };

  const sendAll = async () => {
    if (!pending.length) return;
    if (!confirm(`Send ${emailsToSend} email${emailsToSend === 1 ? '' : 's'} to ${pending.length} team${pending.length === 1 ? '' : 's'}?\n\nTop 10: ${set.top10}% · Top 50: ${set.top50}% on ${set.product}.`)) return;
    setBusy('all'); setMsg(null);
    // Up to 100 emails per request, never splitting a team across two requests.
    const chunks: TeamRow[][] = [];
    let cur: TeamRow[] = []; let n = 0;
    for (const r of pending) {
      if (n + r.emails.length > 100 && cur.length) { chunks.push(cur); cur = []; n = 0; }
      cur.push(r); n += r.emails.length;
    }
    if (cur.length) chunks.push(cur);
    let ok = 0; let fail = 0;
    for (const c of chunks) {
      c.forEach((r) => setStatus((s) => ({ ...s, [keyOf(set, r)]: 'sending' })));
      try {
        await send({ template: 'team_voucher', recipients: c.flatMap((r) => recipientsOf(r)), vars: shared });
        const stamp = new Date().toISOString();
        setSent((s) => ({ ...s, ...Object.fromEntries(c.map((r) => [keyOf(set, r), stamp])) }));
        c.forEach((r) => setStatus((s) => ({ ...s, [keyOf(set, r)]: 'sent' })));
        ok += c.length;
      } catch (e) {
        const m = e instanceof Error ? e.message : 'failed';
        c.forEach((r) => setStatus((s) => ({ ...s, [keyOf(set, r)]: `failed: ${m}` })));
        fail += c.length;
      }
    }
    setBusy('');
    setMsg(fail ? { ok: false, text: `${ok} team${ok === 1 ? '' : 's'} sent, ${fail} failed. Fix the problem and press Send again: teams already sent are skipped.` } : { ok: true, text: `Vouchers sent to ${ok} team${ok === 1 ? '' : 's'}.` });
  };

  const sampleSheet = () => downloadCsv('team-vouchers-template.csv', [
    ['Rank', 'Team', 'Emails', 'Voucher code'],
    [1, 'Team Phantom', 'captain@example.com; member@example.com', 'CAPT-TOP10-AB12'],
    [11, 'Null Pointers', 'lead@example.com', 'CAPT-TOP50-CD34'],
  ]);

  return (
    <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2"><Gift size={16} className="text-[#f5c542]" /> Team vouchers</h3>
          <p className="text-gray-500 text-xs mt-1">Reward the leaderboard: Top 10 and Top 50 teams each get their voucher code in a personal email.</p>
        </div>
        <button onClick={sampleSheet} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5"><Download size={13} /> Sample sheet</button>
      </div>

      {/* Settings */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><label className={label} htmlFor="tv-event">Event</label><input id="tv-event" className={input} value={set.event} maxLength={80} onChange={(e) => setSet({ ...set, event: e.target.value })} /></div>
        <div><label className={label} htmlFor="tv-product">Voucher for</label><input id="tv-product" className={input} value={set.product} maxLength={80} onChange={(e) => setSet({ ...set, product: e.target.value })} /></div>
        <div><label className={label} htmlFor="tv-url">Redeem link</label><input id="tv-url" className={input} value={set.redeemUrl} maxLength={300} onChange={(e) => setSet({ ...set, redeemUrl: e.target.value })} /></div>
        <div>
          <label className={label} htmlFor="tv-top10"><Trophy size={11} className="inline -mt-0.5 mr-1 text-[#f5c542]" />Top 10 discount</label>
          <div className="relative"><input id="tv-top10" type="number" min={1} max={100} className={`${input} pr-8`} value={set.top10} onChange={(e) => setSet({ ...set, top10: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span></div>
        </div>
        <div>
          <label className={label} htmlFor="tv-top50">Top 50 discount (ranks 11–50)</label>
          <div className="relative"><input id="tv-top50" type="number" min={1} max={100} className={`${input} pr-8`} value={set.top50} onChange={(e) => setSet({ ...set, top50: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span></div>
        </div>
        <div><label className={label} htmlFor="tv-exp">Valid until <span className="normal-case tracking-normal text-gray-600">(optional)</span></label><input id="tv-exp" type="date" className={input} value={set.expires} onChange={(e) => setSet({ ...set, expires: e.target.value })} /></div>
      </div>

      {/* Paste */}
      <div className="mt-5">
        <label className={label} htmlFor="tv-list">Leaderboard: Rank, Team, Email(s), Voucher code</label>
        <textarea
          id="tv-list"
          rows={6}
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setPick(null); }}
          placeholder={'Paste from Google Sheets or a CSV. One team per line; several emails can share a cell.\n1\tTeam Phantom\tcaptain@example.com; member@example.com\tCAPT-TOP10-AB12\n11\tNull Pointers\tlead@example.com\tCAPT-TOP50-CD34'}
          className={`${input} font-mono text-[12.5px] leading-6 resize-y`}
        />
      </div>

      {rows.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/10 text-[#f5c542]">Top 10 · {top10.length} teams · {set.top10 >= 100 ? 'free' : `${set.top10}% off`}</span>
            <span className="px-2.5 py-1 rounded-full border border-[#a3e635]/40 bg-[#a3e635]/10 text-[#a3e635]">Top 50 · {top50.length} teams · {set.top50}% off</span>
            <span className="px-2.5 py-1 rounded-full border border-white/10 text-gray-300">{good.reduce((n, r) => n + r.emails.length, 0)} emails</span>
            {rows.length - good.length > 0 && <span className="px-2.5 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-300">{rows.length - good.length} row{rows.length - good.length === 1 ? '' : 's'} need fixing</span>}
          </div>

          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0d1322]">
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2 font-medium">#</th><th className="px-3 py-2 font-medium">Team</th><th className="px-3 py-2 font-medium">Emails</th>
                  <th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Voucher</th><th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const k = keyOf(set, r);
                  const st = status[k] || (sent[k] ? 'sent' : '');
                  const t10 = r.rank > 0 && r.rank <= 10;
                  return (
                    <tr key={`${r.line}-${i}`} onClick={() => setPick(i)} className={`border-t border-white/5 cursor-pointer ${pick === i ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}>
                      <td className="px-3 py-2 tabular-nums text-gray-300">{r.rank || '—'}</td>
                      <td className="px-3 py-2 text-white max-w-[12rem] truncate">{r.team || <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-2 text-gray-400 max-w-[16rem] truncate" title={r.emails.join(', ')}>{r.emails.join(', ') || <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-gray-300">{r.code || <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.rank && r.rank <= 50 ? (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${t10 ? 'border-[#f5c542]/40 text-[#f5c542]' : 'border-[#a3e635]/40 text-[#a3e635]'}`}>
                            {t10 ? 'Top 10' : 'Top 50'} · {t10 ? (set.top10 >= 100 ? 'free' : `${set.top10}%`) : `${set.top50}%`}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {r.problems.length ? <span className="text-red-300">{r.problems.join(', ')}</span>
                          : st === 'sending' ? <span className="text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" />Sending</span>
                          : st === 'sent' ? <span className="text-[#a3e635] flex items-center gap-1"><Check size={12} />Sent</span>
                          : st.startsWith('failed') ? <span className="text-red-300" title={st}>Failed</span>
                          : <span className="text-gray-500">Ready</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-gray-600">Click a row to preview that team's email. Rows with a problem are skipped. Teams already sent are remembered on this device and skipped next time.</p>
        </>
      )}

      {/* Preview */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_17rem]">
        <div>
          <p className={label}>Preview{rows.length ? ` · ${previewRow.team}` : ' · sample team'}</p>
          <p className="text-sm text-gray-300 mb-2 truncate"><span className="text-gray-500">Subject:</span> {preview.subject}</p>
          <iframe title="Voucher email preview" srcDoc={preview.html} sandbox="" className="w-full h-[640px] rounded-xl border border-white/8 bg-[#05070c]" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-white/8 p-4">
            <p className="text-sm text-white font-medium">Send a test first</p>
            <p className="text-xs text-gray-500 mt-1">Sends the email shown on the left to one address.</p>
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email" placeholder="you@cyberhx.com" className={`${input} mt-3`} />
            <button onClick={sendTest} disabled={!!busy} className="mt-2 w-full px-3 py-2 rounded-lg text-sm border border-white/15 text-white hover:bg-white/5 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send test
            </button>
          </div>
          <div className="rounded-xl border border-[#a3e635]/25 bg-[#a3e635]/[0.04] p-4">
            <p className="text-sm text-white font-medium">Send to every team</p>
            <p className="text-xs text-gray-400 mt-1">{pending.length ? `${pending.length} team${pending.length === 1 ? '' : 's'} · ${emailsToSend} email${emailsToSend === 1 ? '' : 's'}` : good.length ? 'Every team on the list has been sent.' : 'Paste the leaderboard first.'}</p>
            <button onClick={sendAll} disabled={!!busy || !pending.length} className="mt-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold bg-[#a3e635] text-[#05080f] hover:bg-[#bef264] disabled:opacity-40 flex items-center justify-center gap-1.5">
              {busy === 'all' ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Send vouchers
            </button>
            {Object.keys(sent).length > 0 && (
              <button onClick={() => { if (confirm('Forget which teams were sent on this device? They could then be sent again.')) setSent({}); }} className="mt-2 w-full text-[11px] text-gray-500 hover:text-gray-300">
                Reset sent list
              </button>
            )}
          </div>
          {msg && (
            <p className={`p-3 rounded-xl text-sm flex items-start gap-2 ${msg.ok ? 'bg-[#a3e635]/5 border border-[#a3e635]/30 text-[#a3e635]' : 'bg-red-500/5 border border-red-500/30 text-red-300'}`}>
              {msg.ok ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />} {msg.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
