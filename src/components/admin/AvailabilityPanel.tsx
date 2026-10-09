import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Save, AlertTriangle, CalendarDays, Clock, Copy, RefreshCw } from 'lucide-react';
import { sbSelect, sbUpsert } from './adminApi';

interface Win { s: string; e: string }
interface Config {
  slotMinutes: number;
  daysAhead: number;
  minNoticeHours: number;
  weekly: Record<string, Win[]>;
  dates: Record<string, Win[]>;
}

const DEFAULT_WIN: Win = { s: '10:00', e: '18:00' };
const DEFAULT_CONFIG: Config = {
  slotMinutes: 30,
  daysAhead: 30,
  minNoticeHours: 2,
  weekly: { '0': [], '1': [{ ...DEFAULT_WIN }], '2': [{ ...DEFAULT_WIN }], '3': [{ ...DEFAULT_WIN }], '4': [{ ...DEFAULT_WIN }], '5': [{ ...DEFAULT_WIN }], '6': [{ ...DEFAULT_WIN }] },
  dates: {},
};

// Monday first
const WEEK: { dow: number; name: string; short: string }[] = [
  { dow: 1, name: 'Monday', short: 'Mon' },
  { dow: 2, name: 'Tuesday', short: 'Tue' },
  { dow: 3, name: 'Wednesday', short: 'Wed' },
  { dow: 4, name: 'Thursday', short: 'Thu' },
  { dow: 5, name: 'Friday', short: 'Fri' },
  { dow: 6, name: 'Saturday', short: 'Sat' },
  { dow: 0, name: 'Sunday', short: 'Sun' },
];
const SLOT_OPTIONS = [15, 20, 30, 45, 60];
const AHEAD_OPTIONS = [7, 14, 30, 45, 60, 90];
const NOTICE_OPTIONS = [0, 1, 2, 4, 12, 24, 48];

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const winOk = (w: Win) => /^\d{2}:\d{2}$/.test(w.s) && /^\d{2}:\d{2}$/.test(w.e) && toMin(w.e) > toMin(w.s);
const fmt12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
};
const summary = (ws: Win[]) => (ws.length ? ws.map((w) => `${fmt12(w.s)}–${fmt12(w.e)}`).join(', ') : 'Not available');
const prettyDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Sort, validate, and reject overlaps. Returns an error message or the cleaned list. */
function cleanWindows(ws: Win[], label: string): { ok: true; value: Win[] } | { ok: false; error: string } {
  const sorted = [...ws].sort((a, b) => toMin(a.s) - toMin(b.s));
  for (let i = 0; i < sorted.length; i++) {
    if (!winOk(sorted[i])) return { ok: false, error: `${label}: end time must be after start time.` };
    if (i > 0 && toMin(sorted[i].s) < toMin(sorted[i - 1].e)) return { ok: false, error: `${label}: time ranges overlap.` };
  }
  return { ok: true, value: sorted };
}

const timeInput =
  'bg-[#05080f] border rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#a3e635]/60 [color-scheme:dark]';

const WindowsEditor: React.FC<{ windows: Win[]; onChange: (w: Win[]) => void }> = ({ windows, onChange }) => (
  <div className="space-y-2">
    {windows.map((w, i) => {
      const bad = !winOk(w);
      return (
        <div key={i} className="flex items-center gap-2 flex-wrap">
          <input type="time" value={w.s} step={900} onChange={(e) => onChange(windows.map((x, j) => (j === i ? { ...x, s: e.target.value } : x)))}
            className={`${timeInput} ${bad ? 'border-red-500/60' : 'border-white/10'}`} />
          <span className="text-gray-600 text-xs">to</span>
          <input type="time" value={w.e} step={900} onChange={(e) => onChange(windows.map((x, j) => (j === i ? { ...x, e: e.target.value } : x)))}
            className={`${timeInput} ${bad ? 'border-red-500/60' : 'border-white/10'}`} />
          <button onClick={() => onChange(windows.filter((_, j) => j !== i))} className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-red-500/10" title="Remove">
            <X size={14} />
          </button>
        </div>
      );
    })}
    <button
      onClick={() => {
        const last = windows[windows.length - 1];
        const s = last ? pad(Math.min(toMin(last.e) / 60 + 1, 22) | 0) + ':00' : DEFAULT_WIN.s;
        const e = last ? pad(Math.min(((toMin(s) / 60) | 0) + 2, 23)) + ':00' : DEFAULT_WIN.e;
        onChange([...windows, { s, e }]);
      }}
      className="text-xs text-[#a3e635] hover:text-[#bef264] flex items-center gap-1"
    >
      <Plus size={12} /> Add time range
    </button>
  </div>
);

export const AvailabilityPanel: React.FC = () => {
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [savedJson, setSavedJson] = useState(JSON.stringify(DEFAULT_CONFIG));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  // dates are IST everywhere (the booking API generates slots in IST), so "today" must be IST too
  const today = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), []);
  const [view, setView] = useState(() => { const [y, m] = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).split('-').map(Number); return new Date(y, m - 1, 1); });
  const [selected, setSelected] = useState('');

  const dirty = JSON.stringify(cfg) !== savedJson;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await sbSelect<{ config: Partial<Config> }>('meeting_availability', { select: 'config', id: 'eq.1' });
    if (!res.ok) {
      setMissing(res.missingTable);
      setError(res.error);
    } else {
      setMissing(false);
      const c = res.data?.[0]?.config;
      const next: Config = {
        slotMinutes: SLOT_OPTIONS.includes(Number(c?.slotMinutes)) ? Number(c?.slotMinutes) : DEFAULT_CONFIG.slotMinutes,
        daysAhead: Number(c?.daysAhead) >= 1 ? Math.min(Number(c?.daysAhead), 90) : DEFAULT_CONFIG.daysAhead,
        minNoticeHours: c?.minNoticeHours !== undefined && Number(c?.minNoticeHours) >= 0 ? Math.min(Number(c?.minNoticeHours), 168) : DEFAULT_CONFIG.minNoticeHours,
        weekly: c?.weekly && Object.keys(c.weekly).length ? { ...DEFAULT_CONFIG.weekly, ...c.weekly } : DEFAULT_CONFIG.weekly,
        dates: c?.dates || {},
      };
      setCfg(next);
      setSavedJson(JSON.stringify(next));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setError('');
    // validate + normalise
    const weekly: Record<string, Win[]> = {};
    for (const d of WEEK) {
      const r = cleanWindows(cfg.weekly[String(d.dow)] || [], d.name);
      if (!r.ok) return setError(r.error);
      weekly[String(d.dow)] = r.value;
    }
    const dates: Record<string, Win[]> = {};
    for (const [k, ws] of Object.entries(cfg.dates)) {
      if (k < today) continue; // drop past overrides
      const r = cleanWindows(ws, prettyDate(k));
      if (!r.ok) return setError(r.error);
      dates[k] = r.value;
    }
    const next: Config = { slotMinutes: cfg.slotMinutes, daysAhead: cfg.daysAhead, minNoticeHours: cfg.minNoticeHours, weekly, dates };
    setSaving(true);
    const res = await sbUpsert('meeting_availability', { id: 1, config: next, updated_at: new Date().toISOString() });
    setSaving(false);
    if (!res.ok) { setMissing(res.missingTable); return setError(res.error); }
    setCfg(next);
    setSavedJson(JSON.stringify(next));
    setToast('✅ Availability saved');
    setTimeout(() => setToast(''), 2500);
  };

  const setWeekly = (dow: number, ws: Win[]) => setCfg((c) => ({ ...c, weekly: { ...c.weekly, [String(dow)]: ws } }));
  const setDate = (key: string, ws: Win[] | null) =>
    setCfg((c) => {
      const dates = { ...c.dates };
      if (ws === null) delete dates[key]; else dates[key] = ws;
      return { ...c, dates };
    });

  // calendar cells
  const cells = useMemo(() => {
    const y = view.getFullYear(), m = view.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
    const days = new Date(y, m + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)] as (number | null)[];
  }, [view]);

  const effective = (key: string): { ws: Win[]; custom: boolean } => {
    const [y, m, d] = key.split('-').map(Number);
    if (cfg.dates[key]) return { ws: cfg.dates[key], custom: true };
    return { ws: cfg.weekly[String(new Date(y, m - 1, d).getDay())] || [], custom: false };
  };

  const upcoming = Object.keys(cfg.dates).filter((k) => k >= today).sort();

  if (missing) {
    return (
      <div className="bg-[#0a0f1a] border border-yellow-500/30 rounded-2xl p-6 text-sm">
        <p className="text-yellow-400 font-medium flex items-center gap-2 mb-2"><AlertTriangle size={16} /> One-time database setup needed</p>
        <p className="text-gray-400">Supabase → SQL Editor → paste & run <code className="text-[#a3e635]">supabase/admin_tables.sql</code>, then press refresh.</p>
        <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:text-white text-sm flex items-center gap-2"><RefreshCw size={14} />Refresh</button>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={32} className="text-[#a3e635] animate-spin" /></div>;

  const sel = selected ? effective(selected) : null;
  const selMode = !selected ? 'default' : cfg.dates[selected] === undefined ? 'default' : cfg.dates[selected].length === 0 ? 'off' : 'custom';

  return (
    <div className="space-y-6 pb-24">
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#0a0f1a] border border-[#a3e635]/30 text-[#a3e635] px-5 py-2.5 rounded-xl text-sm font-medium z-50 shadow-xl">{toast}</div>}

      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-white font-medium flex items-center gap-2"><Clock size={16} className="text-[#a3e635]" /> When are you available?</h3>
            <p className="text-gray-500 text-xs mt-1 max-w-xl">
              People can only book inside these times (all times are <b className="text-gray-300">IST</b>). Slots that clash with something already on your Google Calendar are hidden automatically.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Slot length</label>
              <select value={cfg.slotMinutes} onChange={(e) => setCfg((c) => ({ ...c, slotMinutes: Number(e.target.value) }))}
                className="bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a3e635]/50">
                {SLOT_OPTIONS.map((n) => <option key={n} value={n}>{n} minutes</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Bookable up to</label>
              <select value={cfg.daysAhead} onChange={(e) => setCfg((c) => ({ ...c, daysAhead: Number(e.target.value) }))}
                className="bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a3e635]/50">
                {(AHEAD_OPTIONS.includes(cfg.daysAhead) ? AHEAD_OPTIONS : [...AHEAD_OPTIONS, cfg.daysAhead].sort((a, b) => a - b)).map((n) => <option key={n} value={n}>{n} days ahead</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Minimum notice</label>
              <select value={cfg.minNoticeHours} onChange={(e) => setCfg((c) => ({ ...c, minNoticeHours: Number(e.target.value) }))}
                className="bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a3e635]/50">
                {(NOTICE_OPTIONS.includes(cfg.minNoticeHours) ? NOTICE_OPTIONS : [...NOTICE_OPTIONS, cfg.minNoticeHours].sort((a, b) => a - b)).map((n) => <option key={n} value={n}>{n === 0 ? 'No notice needed' : `${n} hour${n > 1 ? 's' : ''} before`}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly */}
      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5 sm:p-6">
        <h3 className="text-white font-medium mb-1">Weekly schedule</h3>
        <p className="text-gray-500 text-xs mb-4">Your normal hours. You can override any single date below.</p>
        <div className="divide-y divide-white/5">
          {WEEK.map((d) => {
            const ws = cfg.weekly[String(d.dow)] || [];
            const on = ws.length > 0;
            return (
              <div key={d.dow} className="py-3 flex gap-4 items-start flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 w-36 flex-shrink-0 pt-1">
                  <button
                    role="switch" aria-checked={on} aria-label={`${d.name} available`}
                    onClick={() => setWeekly(d.dow, on ? [] : [{ ...DEFAULT_WIN }])}
                    className={`relative w-10 h-6 rounded-full transition-colors ${on ? 'bg-[#a3e635]' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#05080f] transition-transform ${on ? 'translate-x-4' : ''}`} />
                  </button>
                  <span className={`text-sm ${on ? 'text-white font-medium' : 'text-gray-500'}`}>{d.name}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {on ? <WindowsEditor windows={ws} onChange={(w) => setWeekly(d.dow, w)} /> : <p className="text-gray-600 text-sm pt-1">Unavailable</p>}
                </div>
                {on && (
                  <button
                    onClick={() => WEEK.forEach((o) => o.dow !== d.dow && setWeekly(o.dow, ws.map((w) => ({ ...w }))))}
                    className="text-[11px] text-gray-500 hover:text-white flex items-center gap-1 pt-1.5 whitespace-nowrap" title="Use these hours on every day"
                  >
                    <Copy size={11} /> Copy to all
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Specific dates */}
      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5 sm:p-6">
        <h3 className="text-white font-medium mb-1 flex items-center gap-2"><CalendarDays size={16} className="text-[#a3e635]" /> Specific dates</h3>
        <p className="text-gray-500 text-xs mb-4">Tap a date to take it off, or give it its own hours (e.g. a festival, an exam day, a free Sunday).</p>

        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5" aria-label="Previous month"><ChevronLeft size={16} /></button>
              <p className="text-white text-sm font-medium">{view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
              <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5" aria-label="Next month"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d} className="text-[10px] uppercase text-gray-600">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <span key={`b${i}`} />;
                const key = keyOf(view.getFullYear(), view.getMonth(), d);
                const past = key < today;
                const { ws, custom } = effective(key);
                const off = ws.length === 0;
                const isSel = selected === key;
                let cls = 'border-transparent text-gray-300 hover:bg-white/5';
                if (off) cls = 'border-transparent text-gray-600 hover:bg-white/5';
                if (custom && off) cls = 'border-red-500/40 bg-red-500/10 text-red-300';
                if (custom && !off) cls = 'border-[#a3e635]/50 bg-[#a3e635]/10 text-[#a3e635]';
                return (
                  <button key={key} disabled={past} onClick={() => setSelected(key)}
                    className={`aspect-square rounded-lg border text-sm transition-all disabled:opacity-25 disabled:cursor-not-allowed ${cls} ${isSel ? 'ring-2 ring-white' : ''} ${key === today ? 'font-bold underline underline-offset-4' : ''}`}>
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-[11px] text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#a3e635]/40" />Custom hours</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/40" />Day off</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-white/10" />Weekly schedule</span>
            </div>
          </div>

          <div>
            {!selected || !sel ? (
              <div className="h-full min-h-[160px] flex items-center justify-center text-gray-600 text-sm border border-dashed border-white/10 rounded-xl">Select a date to edit it</div>
            ) : (
              <div className="bg-[#05080f] border border-white/10 rounded-xl p-4">
                <p className="text-white font-medium mb-1">{prettyDate(selected)}</p>
                <p className="text-gray-500 text-xs mb-4">Currently: {summary(sel.ws)}{sel.custom ? '' : ' (from weekly schedule)'}</p>
                <div className="flex gap-2 flex-wrap mb-4">
                  {([
                    ['default', 'Weekly schedule'],
                    ['off', 'Day off'],
                    ['custom', 'Custom hours'],
                  ] as const).map(([mode, label]) => (
                    <button key={mode}
                      onClick={() => {
                        if (mode === 'default') setDate(selected, null);
                        else if (mode === 'off') setDate(selected, []);
                        else setDate(selected, sel.ws.length ? sel.ws : [{ ...DEFAULT_WIN }]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${selMode === mode ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635] font-semibold' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {selMode === 'custom' && <WindowsEditor windows={cfg.dates[selected]} onChange={(w) => setDate(selected, w)} />}
              </div>
            )}
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="text-gray-400 text-xs font-medium mb-2">Your date overrides</p>
            <div className="flex flex-wrap gap-2">
              {upcoming.map((k) => {
                const ws = cfg.dates[k];
                const [y, m] = k.split('-').map(Number);
                return (
                  <span key={k} className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-lg border text-xs ${ws.length ? 'border-[#a3e635]/30 bg-[#a3e635]/5 text-[#a3e635]' : 'border-red-500/30 bg-red-500/5 text-red-300'}`}>
                    <button onClick={() => { setSelected(k); setView(new Date(y, m - 1, 1)); }} className="hover:underline">
                      {prettyDate(k)} · {ws.length ? summary(ws) : 'Off'}
                    </button>
                    <button onClick={() => setDate(k, null)} className="p-1 rounded hover:bg-white/10" title="Remove override"><X size={11} /></button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm flex items-center gap-1.5"><AlertTriangle size={14} />{error}</p>}

      {/* Sticky save bar */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all ${dirty ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center gap-4 bg-[#0a0f1a] border border-[#a3e635]/40 rounded-2xl pl-5 pr-2 py-2 shadow-2xl">
          <span className="text-sm text-gray-300">You have unsaved changes</span>
          <button onClick={load} className="text-xs text-gray-500 hover:text-white">Discard</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#a3e635] text-[#05080f] font-bold rounded-xl hover:bg-[#bef264] disabled:opacity-60 flex items-center gap-2 text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save availability
          </button>
        </div>
      </div>
    </div>
  );
};
