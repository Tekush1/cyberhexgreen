import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Link2, Loader2, Mail, Trash2, X } from 'lucide-react';

/* =============================================================
   Reschedule / Cancel a booked meeting (Admin → Meetings).
   - "I pick the new time": the calendar event moves (same Meet link, invite updated for everyone)
     and they get a CyberHx "new time" email.
   - "Let them pick": the old meeting is removed, a fresh booking link is made for the same people,
     and they get a "please pick a new time" email with it.
   - Cancel: removed from everyone's calendar + a CyberHx "cancelled" email (optional).
============================================================= */

type Api = (init?: RequestInit, query?: string) => Promise<any>;
interface SlotData { slotMinutes: number; slots: string[]; taken: string[] }
export interface BookingLite { eventId: string; name: string; start: string; end: string; group?: boolean; attendees?: { email: string }[]; email?: string }

const IST = { timeZone: 'Asia/Kolkata' } as const;
const istDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', IST);
const istDayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' });
const istTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { ...IST, hour: 'numeric', minute: '2-digit' });
const istToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const input = 'w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';
const chip = (on: boolean) => `px-3 py-1.5 rounded-lg text-xs border transition ${on ? 'border-[#a3e635] text-[#a3e635] bg-[#a3e635]/10' : 'border-white/10 text-gray-300 hover:text-white'}`;

const who = (b: BookingLite) => (b.group ? `${b.attendees?.length || 0} people` : b.name);

export function RescheduleBox({ b, api, onDone, onClose }: { b: BookingLite; api: Api; onDone: (msg: string) => void; onClose: () => void }) {
  const mins = Math.max(15, Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000));
  const [mode, setMode] = useState<'pick' | 'custom' | 'link'>('pick');
  const [slots, setSlots] = useState<SlotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [cDate, setCDate] = useState('');
  const [cTime, setCTime] = useState('');
  const [days, setDays] = useState('7');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const d: SlotData = await api(undefined, `?admin=slots&dur=${mins}`);
      setSlots(d);
      setDay(d.slots[0] ? istDay(d.slots[0]) : '');
      setSlot('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load free slots.');
    }
    setLoading(false);
  }, [api, mins]);
  useEffect(() => { if (mode === 'pick' && !slots) loadSlots(); }, [mode, slots, loadSlots]);

  const daysList = useMemo(() => [...new Set((slots?.slots || []).map(istDay))].slice(0, 14), [slots]);
  const daySlots = (slots?.slots || []).filter((s) => istDay(s) === day);

  const ready = mode === 'pick' ? !!slot : mode === 'custom' ? !!cDate && !!cTime && cDate >= istToday() : true;

  const go = async (force = false): Promise<void> => {
    setBusy(true);
    setErr('');
    try {
      if (mode === 'link') {
        const d = await api({ method: 'POST', body: JSON.stringify({ action: 'reschedule-link', eventId: b.eventId, days: Number(days), note, notify }) });
        onDone(`Old meeting removed. New booking link ${d.emailed ? `emailed to ${d.emailed} ${d.emailed > 1 ? 'people' : 'person'}` : 'created'}${d.emailError ? ` (email failed: ${d.emailError})` : ''}.`);
      } else {
        const d = await api({
          method: 'POST',
          body: JSON.stringify({
            action: 'reschedule', eventId: b.eventId, note, notify,
            ...(mode === 'custom' ? { custom: { date: cDate, time: cTime }, force } : { start: slot }),
          }),
        });
        onDone(`Moved to ${istDayLabel(d.start)}, ${istTime(d.start)} IST. Calendar invite updated${d.emailed ? ` and "new time" email sent to ${d.emailed}` : ''}${d.emailError ? ` (email failed: ${d.emailError})` : ''}.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed.';
      if (mode === 'custom' && !force && /already have something/i.test(msg)) {
        setBusy(false);
        if (confirm(`${msg}\n\nMove it there anyway (double-book)?`)) return go(true);
        return;
      }
      setErr(msg);
      if (mode === 'pick') loadSlots();
    }
    setBusy(false);
  };

  return (
    <div className="basis-full pt-3 border-t border-white/5 space-y-3" role="group" aria-label={`Reschedule meeting with ${b.name}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-white font-medium flex items-center gap-2"><CalendarClock size={15} className="text-[#a3e635]" />Reschedule · now {istDayLabel(b.start)}, {istTime(b.start)} IST · {mins} min</p>
        <button onClick={onClose} aria-label="Close" className="p-1 text-gray-500 hover:text-white"><X size={15} /></button>
      </div>

      <div role="radiogroup" aria-label="How to reschedule" className="flex flex-wrap gap-2">
        <button role="radio" aria-checked={mode === 'pick'} onClick={() => setMode('pick')} className={chip(mode === 'pick')}>I pick a free slot</button>
        <button role="radio" aria-checked={mode === 'custom'} onClick={() => setMode('custom')} className={chip(mode === 'custom')}>Any date &amp; time</button>
        <button role="radio" aria-checked={mode === 'link'} onClick={() => setMode('link')} className={chip(mode === 'link')}><Link2 size={11} className="inline -mt-0.5 mr-1" />Let them pick</button>
      </div>

      {mode === 'pick' && (
        loading ? <div className="py-4 flex justify-center"><Loader2 size={18} className="animate-spin text-[#a3e635]" /></div> :
        !daysList.length ? <p className="text-xs text-gray-500">No free slots in your availability. Use "Any date &amp; time" or "Let them pick".</p> : (
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {daysList.map((d) => (
                <button key={d} onClick={() => { setDay(d); setSlot(''); }} className={`shrink-0 ${chip(day === d)}`}>{istDayLabel(`${d}T06:00:00Z`)}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {daySlots.map((s) => (
                <button key={s} onClick={() => setSlot(s)} aria-pressed={slot === s} className={`min-w-[84px] ${slot === s ? 'px-3 py-1.5 rounded-lg text-xs bg-[#a3e635] text-[#05080f] font-semibold' : chip(false)}`}>{istTime(s)}</button>
              ))}
            </div>
          </div>
        )
      )}

      {mode === 'custom' && (
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          <label className="text-xs text-gray-400">Date (IST)<input type="date" min={istToday()} value={cDate} onChange={(e) => setCDate(e.target.value)} className={`${input} mt-1`} /></label>
          <label className="text-xs text-gray-400">Time (IST)<input type="time" value={cTime} onChange={(e) => setCTime(e.target.value)} className={`${input} mt-1`} /></label>
        </div>
      )}

      {mode === 'link' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 leading-5">The current meeting is removed from {who(b)}'s calendar. They get a new booking link (same people, same length) to choose a time themselves.</p>
          <label className="text-xs text-gray-400 inline-flex items-center gap-2">Link valid for
            <input type="number" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} className={`${input} !w-20`} /> days
          </label>
        </div>
      )}

      <label className="block text-xs text-gray-400">Note in the email (optional)
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value.slice(0, 1500))} placeholder="e.g. Sorry, the interviewer is travelling that day." className={`${input} mt-1 resize-none`} />
      </label>
      <label className="flex items-center gap-2 text-xs text-gray-300">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[#a3e635] w-4 h-4" />
        <Mail size={12} /> Send them a CyberHx email about it {mode !== 'link' && <span className="text-gray-500">(the calendar invite updates either way)</span>}
      </label>

      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <button onClick={() => go()} disabled={busy || !ready}
        className="px-4 py-2 bg-[#a3e635] text-[#05080f] text-sm font-bold rounded-xl hover:bg-[#bef264] disabled:opacity-50 flex items-center gap-2">
        {busy ? <Loader2 size={14} className="animate-spin" /> : mode === 'link' ? <Link2 size={14} /> : <CalendarClock size={14} />}
        {mode === 'link' ? 'Send new booking link' : 'Move meeting'}
      </button>
    </div>
  );
}

export function CancelBox({ b, api, onDone, onClose }: { b: BookingLite; api: Api; onDone: (msg: string) => void; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true);
    setErr('');
    try {
      const d = await api({ method: 'POST', body: JSON.stringify({ action: 'cancel', eventId: b.eventId, note, notify }) });
      onDone(`Meeting with ${b.name} cancelled${d.emailed ? ` and "cancelled" email sent to ${d.emailed}` : ''}${d.emailError ? ` (email failed: ${d.emailError})` : ''}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed.');
      setBusy(false);
    }
  };
  return (
    <div className="basis-full pt-3 border-t border-white/5 space-y-3" role="group" aria-label={`Cancel meeting with ${b.name}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-white font-medium flex items-center gap-2"><Trash2 size={15} className="text-red-400" />Cancel {istDayLabel(b.start)}, {istTime(b.start)} IST?</p>
        <button onClick={onClose} aria-label="Close" className="p-1 text-gray-500 hover:text-white"><X size={15} /></button>
      </div>
      <p className="text-xs text-gray-400">It is removed from everyone's calendar. To move it instead, use Reschedule.</p>
      <label className="block text-xs text-gray-400">Reason / note in the email (optional)
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value.slice(0, 1500))} className={`${input} mt-1 resize-none`} />
      </label>
      <label className="flex items-center gap-2 text-xs text-gray-300">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[#a3e635] w-4 h-4" />
        <Mail size={12} /> Send them a CyberHx "meeting cancelled" email
      </label>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <button onClick={go} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/90 text-white hover:bg-red-500 disabled:opacity-50 flex items-center gap-2">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Cancel meeting
      </button>
    </div>
  );
}
