import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Download, FileUp, Gift, Globe, Loader2, Send, User, Users } from 'lucide-react';
import { renderEmail, MAX_FIELD, type EmailVars } from '../../../../shared/emailTemplates';
import { downloadCsv, sbRpc } from '../mailingApi';
import {
  EMAIL_RE, MailPreview, Notice, ONE_EMAIL, STORE, Section, Segmented, StatusPill, btn, btnPrimary, card, cleanCode, duration,
  eventProblems, eventShared, input, label, load, parseBoard, parsePeople, plural, prizeLabel, rangeLabel, readFile, save,
  sendTestEmail, senderOptions, when, type Provider, type Rest, type Tier, type VoucherEvent,
} from './shared';

/* Admin -> Vouchers -> Send.
   1. pick the event   2. pick what to send   3. paste or upload the list   4. check the table   5. queue.
   Every row is checked before anything is queued: missing data, duplicates in the list, no prize for the rank,
   and people who already got this exact code (those are skipped unless "send again" is ticked). */

type Mode = 'board' | 'one' | 'special';
interface Recipient { email: string; name: string; code: string; kind: 'rank' | 'special'; vars: Record<string, unknown> }
interface Row {
  key: string; line: number; title: string; sub: string; code: string; prize: string;
  problems: string[]; recipients: Recipient[];
}
type Seen = Record<string, { status: string; sent_at: string | null; event_name: string }>;
const seenKey = (email: string, code: string, kind: string) => `${email.toLowerCase()}|${code}|${kind}`;

export const SendTab: React.FC<{
  events: VoucherEvent[]; selId: string; onSelect: (id: string) => void; providers: Provider[]; rests: Rest[];
  onQueued: (batchIds: string[]) => void; goEvents: () => void;
}> = ({ events, selId, onSelect, providers, rests, onQueued, goEvents }) => {
  const ev = events.find((e) => e.id === selId) || null;
  const [mode, setMode] = useState<Mode>(() => load(`${STORE}_send`, { mode: 'board' as Mode }).mode);
  const [lists, setLists] = useState<Record<Mode, string>>(() => load(`${STORE}_lists`, { board: '', one: '', special: '' } as Record<Mode, string>));
  const [sp, setSp] = useState(() => load(`${STORE}_special`, { percent: 30, prize: '', members: 0, code: '' }));
  const [one, setOne] = useState({ team: '', rank: '', tierId: '', code: '', emails: '' });
  const [via, setVia] = useState<string>('');
  const [again, setAgain] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ready' | 'already' | 'problem'>('all');
  const [showAll, setShowAll] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [testTo, setTestTo] = useState(() => load(`${STORE}_send`, { testTo: '' }).testTo);
  const [busy, setBusy] = useState<'' | 'test' | 'queue'>('');
  const [msg, setMsg] = useState<{ ok: boolean; text: React.ReactNode } | null>(null);
  const [seen, setSeen] = useState<Seen>({});
  const [checking, setChecking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => save(`${STORE}_send`, { mode, testTo }), [mode, testTo]);
  useEffect(() => save(`${STORE}_lists`, lists), [lists]);
  useEffect(() => save(`${STORE}_special`, sp), [sp]);
  useEffect(() => { setVia(mode === 'special' ? load(`${STORE}_send`, { spVia: 'auto' }).spVia : ev?.sender || 'auto'); }, [mode, ev?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (mode === 'special') save(`${STORE}_send`, { mode, testTo, spVia: via }); }, [via]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setMsg(null); setPick(null); setFilter('all'); setShowAll(false); }, [mode, selId]);

  const opts = senderOptions(providers);
  const viaOpt = opts.find((o) => o.id === via);
  const problems = ev ? eventProblems(ev) : ['Pick an event first.'];
  const tiers = useMemo(() => (ev ? [...ev.tiers].sort((a, b) => a.from - b.from) : []), [ev]);
  const tierFor = (rank: number) => tiers.find((t) => rank >= t.from && rank <= t.to);
  const shared = ev ? eventShared(ev) : null;

  const teamVars = (team: string, rank: number, t: Tier, code: string, members?: number) => ({
    team, rank: rank || undefined, tier: t.to <= 10 ? 10 : 50, code, tierLabel: t.label.trim() || rangeLabel(t),
    discount: t.type === 'percent' ? t.percent : undefined, prize: t.type === 'custom' ? t.prize.trim() : '', members: members ?? (t.members || 0),
  });
  const spPct = Math.min(100, Math.max(1, Math.round(Number(sp.percent) || 1)));
  const spShared = cleanCode(sp.code);
  const spVars = (name: string, code: string) => ({
    team: name.trim() || 'there', code, tier: 50, special: true, members: sp.members || 0,
    discount: sp.prize.trim() ? undefined : spPct, prize: sp.prize.trim(),
  });
  const spPrize = sp.prize.trim() || (spPct >= 100 ? 'Full voucher' : `${spPct}% voucher`);

  /* ----- Rows for the table (one per team or person) ----- */
  const rows: Row[] = useMemo(() => {
    if (!ev) return [];
    if (mode === 'board') {
      return parseBoard(lists.board).map((r) => {
        const t = r.rank ? tierFor(r.rank) : undefined;
        const p = [...r.problems];
        if (r.rank && !t) p.push(`no prize for rank ${r.rank}`);
        return {
          key: `b${r.line}`, line: r.line, title: r.team || '—', sub: `#${r.rank || '?'} · ${r.emails.join(', ') || 'no email'}`,
          code: r.code, prize: t ? `${t.label || rangeLabel(t)} · ${prizeLabel(t)}` : '—', problems: p,
          recipients: t && !p.length ? r.emails.map((email) => ({ email, name: r.team, code: r.code, kind: 'rank' as const, vars: teamVars(r.team, r.rank, t, r.code, r.members) })) : [],
        };
      });
    }
    if (mode === 'special') {
      return parsePeople(lists.special, sp.code).map((r) => {
        const code = r.code || spShared;
        return {
          key: `s${r.line}`, line: r.line, title: r.email || '—', sub: r.name ? `Hi ${r.name}` : 'Hi there', code, prize: spPrize, problems: r.problems,
          recipients: r.problems.length ? [] : [{ email: r.email, name: r.name, code, kind: 'special' as const, vars: spVars(r.name, code) }],
        };
      });
    }
    // One team
    const rank = Math.max(0, Math.min(10000, Math.round(Number(one.rank) || 0)));
    const t = tiers.find((x) => x.id === one.tierId) || (rank ? tierFor(rank) : undefined) || tiers[0];
    const emails = [...new Set((one.emails.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))].slice(0, 100);
    const code = cleanCode(one.code);
    const team = one.team.trim().slice(0, MAX_FIELD.team);
    if (!team && !code && !emails.length) return [];
    const p: string[] = [];
    if (!team) p.push('no team name');
    if (!code) p.push('no voucher code');
    if (!emails.length) p.push('no email');
    if (!t) p.push('no prize tier');
    return [{
      key: 'one', line: 1, title: team || '—', sub: `${rank ? `#${rank} · ` : ''}${emails.join(', ') || 'no email'}`, code, prize: t ? `${t.label || rangeLabel(t)} · ${prizeLabel(t)}` : '—', problems: p,
      recipients: t && !p.length ? emails.map((email) => ({ email, name: team, code, kind: 'rank' as const, vars: teamVars(team, rank, t, code) })) : [],
    }];
  }, [ev, mode, lists, sp, one, tiers]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- Who already got this exact code? (checked in the database, a moment after typing stops) ----- */
  const allEmails = useMemo(() => [...new Set(rows.flatMap((r) => r.recipients.map((x) => x.email)))], [rows]);
  useEffect(() => {
    if (!allEmails.length) { setSeen({}); return; }
    let live = true;
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const next: Seen = {};
        for (let i = 0; i < allEmails.length; i += 1000) {
          const got = await sbRpc<{ email: string; code: string; kind: string; status: string; sent_at: string | null; event_name: string }[]>('voucher_sent_lookup', { p_emails: allEmails.slice(i, i + 1000) });
          (got || []).forEach((g) => { next[seenKey(g.email, g.code, g.kind)] = { status: g.status, sent_at: g.sent_at, event_name: g.event_name }; });
        }
        if (live) setSeen(next);
      } catch { if (live) setSeen({}); }
      finally { if (live) setChecking(false); }
    }, 600);
    return () => { live = false; clearTimeout(t); };
  }, [allEmails]);

  const already = (x: Recipient) => seen[seenKey(x.email, x.code, x.kind)];
  const rowState = (r: Row): 'problem' | 'already' | 'ready' => {
    if (r.problems.length || !r.recipients.length) return 'problem';
    if (r.recipients.every((x) => already(x))) return 'already';
    return 'ready';
  };
  const toSend = rows.flatMap((r) => r.recipients.filter((x) => again || !already(x)));
  const counts = {
    all: rows.length,
    ready: rows.filter((r) => rowState(r) === 'ready').length,
    already: rows.filter((r) => rowState(r) === 'already').length,
    problem: rows.filter((r) => rowState(r) === 'problem').length,
  };
  const skippedPeople = rows.flatMap((r) => r.recipients).filter((x) => already(x)).length;
  const shown = rows.filter((r) => filter === 'all' || rowState(r) === filter);
  const visible = showAll ? shown : shown.slice(0, 200);

  /* ----- Preview ----- */
  const pickRow = rows.find((r) => r.key === pick) || rows.find((r) => r.recipients.length) || null;
  const sampleTier = tiers[0];
  const pv: Recipient | null = pickRow?.recipients[0]
    || (mode === 'special' ? { email: 'sample@example.com', name: 'Aman', code: spShared || 'CODE-HERE', kind: 'special', vars: spVars('Aman', spShared || 'CODE-HERE') }
      : sampleTier ? { email: 'sample@example.com', name: 'Team Phantom', code: 'CODE-X7K2', kind: 'rank', vars: teamVars('Team Phantom', sampleTier.from, sampleTier, 'CODE-X7K2') } : null);
  const vars: EmailVars | null = shared && pv ? ({ ...shared, ...pv.vars } as EmailVars) : null;
  const preview = useMemo(() => (vars ? renderEmail('team_voucher', vars) : null), [JSON.stringify(vars)]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- Actions ----- */
  const sendTest = async () => {
    if (!ev || !shared || !pv) return;
    if (!ONE_EMAIL.test(testTo.trim())) { setMsg({ ok: false, text: 'Type the email address to send the test to.' }); return; }
    setBusy('test'); setMsg(null);
    try {
      const t = await sendTestEmail({ template: 'team_voucher', via, recipients: [{ email: testTo.trim(), name: pv.name, vars: pv.vars }], vars: shared });
      if (t.failed?.length) throw new Error(`Could not send the test: ${Object.values(t.reasons || {})[0] || 'not delivered'}`);
      setMsg({ ok: true, text: `Test sent to ${testTo.trim()} through ${t.providers ? Object.keys(t.providers).join(', ') : viaOpt?.short || via}. It is not saved in History.` });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not send the test.' }); }
    finally { setBusy(''); }
  };

  const queue = async () => {
    if (!ev || !shared || problems.length || !toSend.length) return;
    if (!viaOpt?.ok) { setMsg({ ok: false, text: 'That mail service is not connected. Pick another one.' }); return; }
    const what = mode === 'special' ? `the special discount (${spPrize})` : mode === 'one' ? `the voucher for ${rows[0]?.title}` : `${ev.name} vouchers`;
    const skip = !again && skippedPeople ? `\n${plural(skippedPeople, 'person')} already got this code and will be skipped.` : '';
    const bad = counts.problem ? `\n${plural(counts.problem, 'row')} with problems will be left out.` : '';
    if (!confirm(`Queue ${plural(toSend.length, 'email')} with ${what}?\n\nService: ${viaOpt.short} (then the next ones if it hits a limit)\nPace: about ${duration(toSend.length).replace('about ', '')}, even with this page closed.${skip}${bad}`)) return;
    setBusy('queue'); setMsg(null);
    const ids: string[] = []; let added = 0; const skipped: string[] = [];
    try {
      const label = mode === 'special' ? `Special discount · ${spPrize}${spShared ? ` · ${spShared}` : ''}` : mode === 'one' ? `One team · ${rows[0]?.title}` : `Leaderboard · ${plural(counts.ready, 'team')}`;
      for (let i = 0; i < toSend.length; i += 5000) {
        const part = toSend.slice(i, i + 5000);
        const r = await sbRpc<{ batch_id: string | null; added: number; skipped: string[] }>('voucher_send_create', {
          p_batch: { event_id: ev.id, event_name: ev.name, kind: mode === 'board' ? 'rank' : mode, label: `${label}${toSend.length > 5000 ? ` (part ${i / 5000 + 1})` : ''}`, via, again },
          p_rows: part.map((x) => ({ email: x.email, name: x.name, kind: x.kind, vars: x.vars, shared })),
        });
        if (r.batch_id) ids.push(r.batch_id);
        added += r.added; skipped.push(...(r.skipped || []));
      }
      setSeen((s) => ({ ...s, ...Object.fromEntries(toSend.map((x) => [seenKey(x.email, x.code, x.kind), { status: 'pending', sent_at: null, event_name: ev.name }])) }));
      if (mode === 'one') setOne({ team: '', rank: '', tierId: one.tierId, code: '', emails: '' });
      setMsg({
        ok: added > 0,
        text: (
          <span>
            {added ? `${plural(added, 'email')} queued. They go out over ${duration(added)} through ${viaOpt.short}; you can close this page.` : 'Nothing new to queue: everyone on the list already has this code.'}
            {skipped.length > 0 && ` ${plural(skipped.length, 'person')} skipped (already queued or sent).`}
            {ids.length > 0 && <button onClick={() => onQueued(ids)} className="ml-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2">See it in History <ArrowRight size={13} /></button>}
          </span>
        ),
      });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not queue the emails.' }); }
    finally { setBusy(''); }
  };

  const onFile = async (f?: File | null) => {
    if (!f) return;
    try { const text = await readFile(f); setLists((l) => ({ ...l, [mode]: text })); setMsg({ ok: true, text: `Loaded ${f.name}.` }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not read that file.' }); }
  };
  const sample = () => (mode === 'special'
    ? downloadCsv('special-discount-template.csv', [['Email', 'Name', 'Code'], ['aman@example.com', 'Aman', ''], ['priya@university.edu', 'Priya', 'CX-PRIYA-30']])
    : downloadCsv('leaderboard-template.csv', [['Rank', 'Team', 'Emails', 'Voucher code', 'Members'], [1, 'Team Phantom', 'captain@example.com; member@example.com', 'CTF-R1-AB12', 2], [11, 'Null Pointers', 'lead@example.com', 'CTF-R11-CD34', 4]]));

  const restingHere = rests.filter((r) => r.provider === via || via.split(',').includes(r.provider));

  if (!events.length) {
    return (
      <div className={card}>
        <p className="text-[15px] font-semibold text-white">Create an event first</p>
        <p className="mt-1 text-[13px] text-white/50">Every voucher email uses an event's look, redeem link and prize tiers.</p>
        <button onClick={goEvents} className={`${btnPrimary} mt-4`}>Go to Events</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1 + 2: event and what to send */}
      <div className={card}>
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className={label}>1 · Event</p>
            <div className="flex flex-wrap gap-2">
              {events.map((e) => (
                <button key={e.id} onClick={() => onSelect(e.id)}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] transition ${e.id === selId ? 'border-white/30 bg-white/[0.1] text-white' : 'border-white/10 text-white/60 hover:text-white'}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />{e.name}
                </button>
              ))}
              <button onClick={goEvents} className="rounded-full px-2 py-1.5 text-[12.5px] text-white/45 underline-offset-2 hover:text-white hover:underline">Edit events</button>
            </div>
          </div>
          <div>
            <p className={label}>2 · What to send</p>
            <Segmented label="What to send" value={mode} onChange={setMode} options={[
              { v: 'board' as Mode, label: <><Users size={14} /> Leaderboard</> },
              { v: 'one' as Mode, label: <><User size={14} /> One team</> },
              { v: 'special' as Mode, label: <><Globe size={14} /> Special discount</> },
            ]} />
          </div>
        </div>
        {ev && problems.length > 0 && (
          <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3 text-[13px] text-amber-200">
            {ev.name}: {problems[0]} <button onClick={goEvents} className="underline">Fix it in Events</button>
          </p>
        )}
      </div>

      {/* 3: the list */}
      {mode === 'one' ? (
        <Section title="3 · The team" sub="For one team, or a late addition. Queued like everything else and recorded in History.">
          <div className="space-y-4">
            <div role="radiogroup" aria-label="Prize tier" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tiers.map((t) => {
                const rank = Number(one.rank) || 0;
                const on = (one.tierId || (rank ? tierFor(rank)?.id : tiers[0]?.id)) === t.id;
                return (
                  <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setOne({ ...one, tierId: t.id })}
                    className="rounded-2xl border px-4 py-3 text-left transition" style={on ? { borderColor: ev?.color, background: `${ev?.color}14` } : { borderColor: 'rgba(255,255,255,.1)' }}>
                    <span className="block text-sm font-semibold text-white">{t.label || rangeLabel(t)}</span>
                    <span className="mt-0.5 block text-[12px] text-white/45">{rangeLabel(t)} · {prizeLabel(t)}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem_1fr]">
              <div><label className={label} htmlFor="v1-team">Team name</label><input id="v1-team" className={input} value={one.team} maxLength={MAX_FIELD.team} onChange={(e) => setOne({ ...one, team: e.target.value })} placeholder="Jokers" /></div>
              <div><label className={label} htmlFor="v1-rank">Rank</label><input id="v1-rank" type="number" min={1} className={input} value={one.rank} placeholder="1" onChange={(e) => { const r = Number(e.target.value) || 0; setOne({ ...one, rank: e.target.value, tierId: (r && tierFor(r)?.id) || one.tierId }); }} /></div>
              <div><label className={label} htmlFor="v1-code">Voucher code</label><input id="v1-code" className={`${input} font-mono tracking-wider`} value={one.code} maxLength={MAX_FIELD.code} onChange={(e) => setOne({ ...one, code: e.target.value })} placeholder="CTF-R1-AB12" /></div>
            </div>
            <div><label className={label} htmlFor="v1-emails">Team member emails</label><textarea id="v1-emails" rows={3} className={`${input} resize-y font-mono text-[13px]`} value={one.emails} onChange={(e) => setOne({ ...one, emails: e.target.value })} placeholder={'captain@example.com\nmember@example.com'} /></div>
          </div>
        </Section>
      ) : (
        <Section
          title={mode === 'special' ? '3 · People' : '3 · Leaderboard'}
          sub={mode === 'special'
            ? 'One per line: email, name, code. Name and code are optional. Copy from Sheets, paste a CSV, or upload a file.'
            : `One team per line: Rank, Team, Email(s), Voucher code, Members (optional). Ranks ${tiers.length ? `${tiers[0].from}–${Math.max(...tiers.map((t) => t.to))}` : '…'} get a prize.`}
          right={
            <div className="flex flex-wrap gap-2">
              <button onClick={() => fileRef.current?.click()} className={btn}><FileUp size={13} /> Upload CSV</button>
              <button onClick={sample} className={btn}><Download size={13} /> Sample file</button>
              {lists[mode] && <button onClick={() => { if (confirm('Clear the list?')) setLists((l) => ({ ...l, [mode]: '' })); }} className={btn}>Clear</button>}
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          }
        >
          {mode === 'special' && (
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <div>
                <label className={label} htmlFor="sp-pct">Voucher %</label>
                <div className="relative"><input id="sp-pct" type="number" min={1} max={100} className={`${input} pr-8`} value={sp.percent} disabled={!!sp.prize.trim()} onChange={(e) => setSp({ ...sp, percent: Number(e.target.value) || 1 })} /><span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">%</span></div>
              </div>
              <div>
                <label className={label} htmlFor="sp-prize">Or a custom offer</label>
                <input id="sp-prize" className={input} value={sp.prize} maxLength={120} placeholder="e.g. 1 year of CAPT at 50% off" onChange={(e) => setSp({ ...sp, prize: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor="sp-code">Code for everyone</label>
                <input id="sp-code" className={`${input} font-mono tracking-wider`} value={sp.code} maxLength={MAX_FIELD.code} placeholder="CYBERHXCAPT50" onChange={(e) => setSp({ ...sp, code: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor="sp-members">Who can use the code</label>
                <select id="sp-members" className={input} value={sp.members} onChange={(e) => setSp({ ...sp, members: Number(e.target.value) })}>
                  <option value={0}>Only them</option>
                  {[2, 3, 5, 10, 25, 50].map((n) => <option key={n} value={n}>Up to {n} people</option>)}
                </select>
              </div>
            </div>
          )}
          <textarea
            aria-label={mode === 'special' ? 'People' : 'Leaderboard'} rows={7} value={lists[mode]}
            onChange={(e) => { setLists((l) => ({ ...l, [mode]: e.target.value })); setPick(null); }}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
            placeholder={mode === 'special' ? 'aman@example.com, Aman\npriya@university.edu, Priya, CX-PRIYA-30\nsomeone@example.com' : '1\tTeam Phantom\tcaptain@example.com; member@example.com\tCTF-R1-AB12\n11\tNull Pointers\tlead@example.com\tCTF-R11-CD34'}
            className={`${input} resize-y font-mono text-[12.5px] leading-6`}
          />
        </Section>
      )}

      {/* 4: check */}
      {rows.length > 0 && (
        <Section
          title="4 · Check the list"
          sub={<span className="flex items-center gap-2">{checking && <Loader2 size={12} className="animate-spin" />}{checking ? 'Checking who already got these codes…' : 'Click a row to preview its email.'}</span>}
          right={
            <div role="tablist" aria-label="Filter" className="flex flex-wrap gap-1.5 text-xs">
              {([['all', 'All'], ['ready', 'Ready'], ['already', 'Already got it'], ['problem', 'Fix these']] as const).map(([k, t]) => (
                <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                  className={`rounded-full border px-2.5 py-1 ${filter === k ? 'border-white/30 bg-white/[0.1] text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>
                  {t} <span className="tabular-nums text-white/45">{counts[k]}</span>
                </button>
              ))}
            </div>
          }
        >
          <div className="max-h-[440px] overflow-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#10151f]">
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                  <th className="px-3 py-2.5 font-medium">{mode === 'special' ? 'Email' : 'Team'}</th>
                  <th className="px-3 py-2.5 font-medium">Code</th>
                  <th className="px-3 py-2.5 font-medium">Prize</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const st = rowState(r);
                  const got = r.recipients.map(already).find(Boolean);
                  return (
                    <tr key={r.key} onClick={() => setPick(r.key)} className={`cursor-pointer border-t border-white/5 ${pickRow?.key === r.key ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                      <td className="max-w-[22rem] px-3 py-2.5">
                        <span className="block truncate text-white">{r.title}</span>
                        <span className="block truncate text-[12px] text-white/45">{r.sub}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-white/75">{r.code || <span className="text-red-300">—</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-white/60">{r.prize}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {st === 'problem' ? <span className="text-red-300">{r.problems.join(', ') || 'nothing to send'}</span>
                          : st === 'already' ? <span className="flex flex-wrap items-center gap-1.5"><StatusPill s="already" /><span className="text-white/40">{got?.status === 'sent' ? `sent ${when(got.sent_at)}` : 'waiting in queue'}</span></span>
                          : got ? <span className="flex flex-wrap items-center gap-1.5"><StatusPill s="ready" /><span className="text-white/40">some members already have it</span></span>
                          : <StatusPill s="ready" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {shown.length > visible.length && <button onClick={() => setShowAll(true)} className={`${btn} mt-3`}>Show all {shown.length.toLocaleString('en-IN')} rows</button>}
        </Section>
      )}

      {/* 5: send */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className={`${card} flex flex-col`}>
          <p className="text-sm font-semibold text-white">5 · Queue the emails</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="v-via">Mail service</label>
              <select id="v-via" className={input} value={via} onChange={(e) => setVia(e.target.value)}>
                {!opts.some((o) => o.id === via) && via && <option value={via}>{via}</option>}
                {opts.map((o) => <option key={o.id} value={o.id} disabled={!o.ok}>{o.label}{o.ok ? '' : ' (not connected)'}</option>)}
              </select>
              <p className="mt-1.5 text-[11.5px] text-white/40">{viaOpt?.note}</p>
              {restingHere.length > 0 && <p className="mt-1 text-[11.5px] text-amber-200/80">At its limit right now: {restingHere.map((r) => `${r.provider} until ${when(r.until)}`).join(', ')}. {via === 'mail' ? 'Emails will wait for it.' : 'The next service sends meanwhile.'}</p>}
            </div>
            <label className="flex items-start gap-2.5 text-[12.5px] text-white/65 sm:col-span-2">
              <input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0A84FF]" />
              <span>Also send to people who already got this code <span className="text-white/35">(off: they are skipped, so nobody gets it twice)</span></span>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <p className="text-[12.5px] text-white/55">
              {toSend.length ? <>{plural(toSend.length, 'email')} · {duration(toSend.length)}</> : 'Nothing to queue yet.'}
              {!again && skippedPeople > 0 && <span className="text-white/35"> · {skippedPeople} skipped</span>}
            </p>
            <button onClick={queue} disabled={!!busy || !toSend.length || problems.length > 0} className={btnPrimary}>
              {busy === 'queue' ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Queue {toSend.length ? plural(toSend.length, 'email') : 'emails'}
            </button>
          </div>
        </div>
        <div className={`${card} flex flex-col`}>
          <p className="text-sm font-semibold text-white">Send a test first</p>
          <p className="mt-1 text-[12.5px] text-white/45">The email in the preview, sent now through {viaOpt?.short || via}. Not recorded in History.</p>
          <div className="mt-auto flex gap-2 pt-4">
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email" placeholder="you@cyberhx.com" aria-label="Test email address" className={input} />
            <button onClick={sendTest} disabled={!!busy || !pv || problems.length > 0} className={`${btn} shrink-0 px-4 py-2.5 text-sm`}>
              {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send test
            </button>
          </div>
        </div>
      </div>

      <Notice msg={msg} onClose={() => setMsg(null)} />

      {preview && <MailPreview html={preview.html} subject={preview.subject} who={pv?.email === 'sample@example.com' ? 'sample' : `${pv?.name || ''} ${pv ? `<${pv.email}>` : ''}`} />}
    </div>
  );
};
