import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Loader2, MessageSquareQuote, RefreshCw } from 'lucide-react';
import { sbSelect, timeAgo, fmtDateTime } from './adminApi';
import { downloadCsv } from './mailingApi';

/* Admin → Feedback: the event review form (/blog/feedback) as charts.
   Rows come from form_submissions where form = 'feedback'; answers live in row.data. */

type FbData = {
  event?: string; event_name?: string; favourite_challenge?: string; category?: string; why_it_was_good?: string;
  ui?: string; ui_notes?: string; more_events?: string; team_or_username?: string;
};
type FbRow = { id: string; name: string; email: string; message: string | null; data: FbData | null; created_at: string };

// Colours (validated on the dark admin surface; every mark also carries a text label, so colour is never alone).
const STATUS = { good: '#0ca30c', warning: '#fab219', critical: '#d03b3b' };
const RATING = [
  { v: 1, label: 'Poor', color: '#d03b3b' },
  { v: 2, label: 'Fair', color: '#ec835a' },
  { v: 3, label: 'Good', color: '#fab219' },
  { v: 4, label: 'Great', color: '#4fb34f' },
  { v: 5, label: 'Excellent', color: '#0ca30c' },
];
const MORE = [
  { v: 'Yes', label: 'Yes, host more', color: STATUS.good },
  { v: 'Maybe', label: 'Maybe', color: STATUS.warning },
  { v: 'No', label: 'Not for me', color: STATUS.critical },
];
// Categorical slots in fixed order: colour follows the category, never its rank.
const CATEGORY_COLOR: Record<string, string> = {
  Cryptography: '#3987e5',
  'Web Exploitation': '#d95926',
  OSINT: '#199e70',
  'Digital Forensics': '#c98500',
  'Reverse Engineering': '#d55181',
  'Something else': '#8a8f98',
  'Not picked': '#4b515c',
};
const BLUE = '#3987e5';

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const uiScore = (r: FbRow) => Number(/^([1-5])\/5/.exec(r.data?.ui || '')?.[1] || 0);
const scoreColor = (s: number) => (s >= 4 ? STATUS.good : s >= 3 ? STATUS.warning : STATUS.critical);

/**
 * Players typed challenge names by hand ("Kakbhushundi", "Kaakbhusundhi", "Kakabhussundi - 29th universe").
 * Same challenge → same key: drop the " - subtitle", a leading "a/the", vowels and h, and doubled letters.
 */
const challengeKey = (raw: string) => {
  const base = raw.toLowerCase().split(/\s[-–—:|]\s/)[0].replace(/^(a|an|the)\s+/, '').replace(/[^a-z0-9]/g, '');
  const skel = base.replace(/[aeiouyh]/g, '').replace(/(.)\1+/g, '$1');
  return skel.length >= 3 ? skel : base;
};
const titleCase = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/(^|\s)([a-z])/g, (_m, sp, c) => sp + c.toUpperCase());

/* ───────── small building blocks ───────── */

const Card: React.FC<{ title: string; sub?: string; children: React.ReactNode; className?: string }> = ({ title, sub, children, className = '' }) => (
  <section className={`rounded-[22px] border border-white/[0.08] bg-[#0b0f19] p-5 sm:p-6 ${className}`}>
    <h3 className="text-[15px] font-semibold text-white">{title}</h3>
    {sub && <p className="mt-0.5 text-[13px] text-white/45">{sub}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const Kpi: React.FC<{ label: string; value: React.ReactNode; note?: React.ReactNode; dot?: string; small?: boolean }> = ({ label, value, note, dot, small }) => (
  <div className="rounded-[20px] border border-white/[0.08] bg-[#0b0f19] p-4 sm:p-5">
    <p className="flex items-center gap-2 text-[12.5px] font-medium text-white/50">
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {label}
    </p>
    <p className={`mt-2 font-semibold leading-tight tabular-nums text-white ${small ? 'line-clamp-2 break-words text-[20px] sm:text-[22px]' : 'truncate text-[28px]'}`}>{value}</p>
    {note && <p className="mt-1 truncate text-[12.5px] text-white/45">{note}</p>}
  </div>
);

/** Donut: segments with a 2px gap; the centre carries the headline. */
const Donut: React.FC<{ parts: { label: string; value: number; color: string }[]; size?: number; center: React.ReactNode }> = ({ parts, size = 168, center }) => {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const live = parts.filter((p) => p.value > 0);
  const gap = live.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={parts.map((p) => `${p.label} ${pct(p.value, total)}%`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {total > 0 && live.map((p) => {
          const len = (p.value / total) * c;
          const seg = (
            <circle key={p.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(len - gap, 0.01)} ${c}`} strokeDashoffset={-offset} strokeLinecap="butt">
              <title>{`${p.label}: ${p.value} (${pct(p.value, total)}%)`}</title>
            </circle>
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
    </div>
  );
};

/** Single progress ring (value out of max). */
const Ring: React.FC<{ value: number; max: number; color: string; size?: number; children: React.ReactNode }> = ({ value, max, color, size = 168, children }) => {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(Math.min(value, max) / max) * c} ${c}`} style={{ transition: 'stroke-dasharray .8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

/** Horizontal bars: label left, value + share right, thin rounded bar under the label. */
const HBars: React.FC<{ items: { label: string; value: number; color: string; hint?: string }[]; total: number; empty?: string }> = ({ items, total, empty = 'No answers yet.' }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="text-sm text-white/40">{empty}</p>;
  return (
    <ul className="space-y-3.5">
      {items.map((i) => (
        <li key={i.label} title={`${i.label}: ${i.value} of ${total} (${pct(i.value, total)}%)${i.hint ? `\nAlso written as: ${i.hint}` : ''}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
            <span className="flex min-w-0 items-center gap-2 text-white/85">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: i.color }} />
              <span className="truncate">{i.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-white/55">
              <span className="font-semibold text-white">{i.value}</span> · {pct(i.value, total)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-white/[0.05]">
            <div className="h-2 rounded-full transition-[width] duration-700" style={{ width: `${(i.value / max) * 100}%`, background: i.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

/* ───────── the panel ───────── */

export const FeedbackPanel: React.FC = () => {
  const [rows, setRows] = useState<FbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [event, setEvent] = useState('all');
  const [allChallenges, setAllChallenges] = useState(false);
  const [allNotes, setAllNotes] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await sbSelect<FbRow>('form_submissions', {
      select: 'id,name,email,message,data,created_at',
      form: 'eq.feedback',
      order: 'created_at.desc',
      limit: '5000',
    });
    if (res.ok && Array.isArray(res.data)) setRows(res.data);
    else setError(res.error || 'Could not load feedback.');
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const events = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => r.data?.event && m.set(r.data.event, r.data.event_name || r.data.event));
    return [...m.entries()];
  }, [rows]);

  const shown = useMemo(() => (event === 'all' ? rows : rows.filter((r) => r.data?.event === event)), [rows, event]);

  const s = useMemo(() => {
    const n = shown.length;
    const scores = shown.map(uiScore).filter(Boolean);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const rating = RATING.map((r) => ({ ...r, count: scores.filter((x) => x === r.v).length }));
    const happy = scores.filter((x) => x >= 4).length;
    const more = MORE.map((m) => ({ ...m, count: shown.filter((r) => r.data?.more_events === m.v).length }));
    const answeredMore = more.reduce((a, b) => a + b.count, 0);

    // Favourite challenges, merging spelling variants.
    const groups = new Map<string, { count: number; names: Map<string, number> }>();
    shown.forEach((r) => {
      const raw = (r.data?.favourite_challenge || '').trim();
      if (!raw) return;
      const k = challengeKey(raw);
      const g = groups.get(k) || { count: 0, names: new Map() };
      g.count++;
      const nice = titleCase(raw.split(/\s[-–—:|]\s/)[0]);
      g.names.set(nice, (g.names.get(nice) || 0) + 1);
      groups.set(k, g);
    });
    const challenges = [...groups.values()]
      .map((g) => {
        const names = [...g.names.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length);
        return { label: names[0][0], value: g.count, color: BLUE, hint: names.slice(1).map((x) => x[0]).join(', ') };
      })
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    const cats = new Map<string, number>();
    shown.forEach((r) => {
      const c = r.data?.category || 'Not picked';
      cats.set(c, (cats.get(c) || 0) + 1);
    });
    const categories = [...cats.entries()]
      .map(([label, value]) => ({ label, value, color: CATEGORY_COLOR[label] || '#8a8f98' }))
      .sort((a, b) => (a.label === 'Not picked' ? 1 : b.label === 'Not picked' ? -1 : b.value - a.value));

    const day = shown.filter((r) => Date.now() - new Date(r.created_at).getTime() < 864e5).length;
    const notes = shown
      .map((r) => ({ r, text: [r.data?.why_it_was_good, r.data?.ui_notes, r.message].map((x) => (x || '').trim()).filter(Boolean) }))
      .filter((x) => x.text.length);

    return { n, avg, scores: scores.length, rating, happy, more, answeredMore, challenges, categories, day, notes };
  }, [shown]);

  const exportCsv = () => {
    downloadCsv(`cyberhx-feedback-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Submitted', 'Event', 'Name', 'Email', 'Team / username', 'Favourite challenge', 'Category', 'Why', 'UI rating', 'UI notes', 'More events', 'Anything else'],
      ...shown.map((r) => [
        r.created_at, r.data?.event_name || '', r.name, r.email, r.data?.team_or_username || '', r.data?.favourite_challenge || '',
        r.data?.category || '', r.data?.why_it_was_good || '', r.data?.ui || '', r.data?.ui_notes || '', r.data?.more_events || '', r.message || '',
      ]),
    ]);
  };

  if (loading && !rows.length) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-[#a3e635]" /></div>;
  }

  const yes = s.more[0].count;
  const top = s.challenges[0];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {events.length > 1 && (
          <select value={event} onChange={(e) => setEvent(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b0f19] px-3 py-2 text-sm text-white focus:border-[#a3e635]/50 focus:outline-none">
            <option value="all">All events</option>
            {events.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        {events.length === 1 && <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-white/70">{events[0][1]}</span>}
        <div className="ml-auto flex gap-2">
          <button onClick={exportCsv} disabled={!shown.length} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0b0f19] px-3.5 py-2 text-sm text-white/70 hover:text-white disabled:opacity-40">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0b0f19] px-3.5 py-2 text-sm text-white/70 hover:text-white">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && <p className="flex items-center gap-1.5 text-sm text-red-400"><AlertTriangle size={14} />{error}</p>}

      {!s.n ? (
        <div className="rounded-[22px] border border-white/[0.08] bg-[#0b0f19] py-20 text-center text-white/45">No feedback yet. Share cyberhx.com/blog/feedback with your players.</div>
      ) : (
        <>
          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Responses" value={s.n} note={s.day ? `${s.day} in the last 24 hours` : 'none in the last 24 hours'} dot={BLUE} />
            <Kpi label="Platform UI" value={<>{s.avg.toFixed(1)}<span className="text-lg text-white/40"> / 5</span></>} note={`${pct(s.happy, s.scores)}% rated it 4 or 5`} dot={scoreColor(s.avg)} />
            <Kpi label="Want more events" value={`${pct(yes, s.answeredMore)}%`} note={`${yes} of ${s.answeredMore} said yes`} dot={STATUS.good} />
            <Kpi small label="Top challenge" value={top ? top.label : '—'} note={top ? `${top.value} vote${top.value === 1 ? '' : 's'} · ${pct(top.value, s.n)}%` : undefined} dot={STATUS.warning} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* UI rating */}
            <Card title="How did the platform feel?" sub={`${s.scores} ratings`}>
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
                <Ring value={s.avg} max={5} color={scoreColor(s.avg)}>
                  <span className="text-[38px] font-semibold leading-none tabular-nums text-white">{s.avg.toFixed(1)}</span>
                  <span className="mt-1 text-[12px] text-white/45">average of 5</span>
                </Ring>
                <div className="w-full flex-1">
                  <div className="flex h-36 items-end gap-2" role="img" aria-label={s.rating.map((r) => `${r.v} ${r.label}: ${r.count}`).join(', ')}>
                    {s.rating.map((r) => {
                      const max = Math.max(1, ...s.rating.map((x) => x.count));
                      return (
                        <div key={r.v} className="flex h-full flex-1 flex-col items-center justify-end" title={`${r.v} · ${r.label}: ${r.count} (${pct(r.count, s.scores)}%)`}>
                          <span className="mb-1 text-[12px] tabular-nums text-white/70">{pct(r.count, s.scores)}%</span>
                          <div className="w-full max-w-[44px] rounded-t-[4px] transition-[height] duration-700" style={{ height: `${Math.max((r.count / max) * 100, r.count ? 4 : 1.5)}%`, background: r.count ? r.color : 'rgba(255,255,255,0.08)' }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-2 border-t border-white/[0.08] pt-2">
                    {s.rating.map((r) => (
                      <div key={r.v} className="flex-1 text-center">
                        <p className="text-[13px] font-semibold text-white">{r.v}</p>
                        <p className="text-[11px] text-white/45">{r.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* More events */}
            <Card title="Want more events on CyberHx?" sub={`${s.answeredMore} answers`}>
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <Donut
                  parts={s.more.map((m) => ({ label: m.label, value: m.count, color: m.color }))}
                  center={<>
                    <span className="text-[38px] font-semibold leading-none tabular-nums text-white">{pct(yes, s.answeredMore)}%</span>
                    <span className="mt-1 text-[12px] text-white/45">said yes</span>
                  </>}
                />
                <ul className="w-full flex-1 space-y-3">
                  {s.more.map((m) => (
                    <li key={m.v} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: m.color }} />
                      <span className="flex-1 text-[14px] text-white/85">{m.label}</span>
                      <span className="tabular-nums text-[14px] text-white/55"><span className="font-semibold text-white">{pct(m.count, s.answeredMore)}%</span> · {m.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Favourite challenges */}
            <Card title="Favourite challenges" sub="Spelling variants of the same name are counted together. Hover a bar to see them.">
              <HBars items={allChallenges ? s.challenges : s.challenges.slice(0, 8)} total={s.n} />
              {s.challenges.length > 8 && (
                <button onClick={() => setAllChallenges((v) => !v)} className="mt-4 text-[13px] font-semibold text-[#a3e635] hover:underline">
                  {allChallenges ? 'Show top 8' : `Show all ${s.challenges.length}`}
                </button>
              )}
            </Card>

            {/* Categories */}
            <Card title="Favourite category" sub="Category of the challenge they liked most">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <Donut
                  size={150}
                  parts={s.categories.map((c) => ({ label: c.label, value: c.value, color: c.color }))}
                  center={<>
                    <span className="max-w-[90px] text-[15px] font-semibold leading-tight text-white">{s.categories.find((c) => c.label !== 'Not picked')?.label || '—'}</span>
                    <span className="mt-1 text-[11px] text-white/45">most loved</span>
                  </>}
                />
                <div className="w-full flex-1"><HBars items={s.categories} total={s.n} /></div>
              </div>
            </Card>
          </div>

          {/* What players said */}
          <Card title="What players said" sub={`${s.notes.length} wrote something`}>
            {s.notes.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {s.notes.slice(0, allNotes ? undefined : 8).map(({ r, text }) => {
                  const sc = uiScore(r);
                  return (
                    <li key={r.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                      <MessageSquareQuote size={16} className="text-white/25" />
                      {text.map((t, i) => <p key={i} className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-white/80">{t}</p>)}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
                        <span className="font-medium text-white/70">{r.name}</span>
                        {r.data?.favourite_challenge && <span>♥ {r.data.favourite_challenge}</span>}
                        {sc > 0 && <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: RATING[sc - 1].color }} />UI {sc}/5</span>}
                        <span title={fmtDateTime(r.created_at)}>{timeAgo(r.created_at)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-white/40">No written comments yet.</p>}
            {s.notes.length > 8 && (
              <button onClick={() => setAllNotes((v) => !v)} className="mt-4 text-[13px] font-semibold text-[#a3e635] hover:underline">
                {allNotes ? 'Show fewer' : `Show all ${s.notes.length}`}
              </button>
            )}
          </Card>
          <p className="text-[12px] text-white/35">Full answers with names and emails are in Inbox (Event feedback), or use Export CSV.</p>
        </>
      )}
    </div>
  );
};
