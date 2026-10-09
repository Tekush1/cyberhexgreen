import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link2, Copy, Check, Mail, Video, Trash2, Loader2, RefreshCw, AlertTriangle,
  UserCheck, Handshake, Flag, PenLine, CalendarClock, Users, Upload, X, Clock, UserPlus,
} from 'lucide-react';
import { TOKEN_KEY } from './adminApi';

export type MeetingKind = 'interview' | 'partnership' | 'ctf' | 'other';

export interface MeetingPrefill {
  name: string;
  email: string;
  kind: MeetingKind;
  /** change this on every prefill so the same prefill can be applied twice */
  nonce: number;
}

interface PendingLink {
  code: string;
  link: string;
  name: string;
  email: string;
  group: boolean;
  guests: string[];
  kind: MeetingKind;
  topic: string;
  expiresAt: string;
  createdAt: string;
}

interface Booking {
  eventId: string;
  name: string;
  email: string;
  status: string;
  group?: boolean;
  canAdd?: boolean;
  attendees?: { email: string; status: string }[];
  start: string;
  end: string;
  meetLink: string | null;
  kind?: MeetingKind;
  topic?: string;
}

const KINDS: Record<
  MeetingKind,
  { label: string; hint: string; icon: React.ReactNode; badge: string; mailSubject: (topic: string) => string; mailBody: (name: string, link: string, topic: string) => string }
> = {
  interview: {
    label: 'Interview',
    hint: 'Shortlisted candidates',
    icon: <UserCheck size={22} />,
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    mailSubject: () => 'CyberHx Interview - choose your slot',
    mailBody: (n, l) =>
      `Hi ${n},\n\nCongratulations, you have been shortlisted! Please book an interview slot that suits you here:\n\n${l}\n\nA Google Meet link will be added to your calendar once you confirm.\n\nRegards,\nTeam CyberHx`,
  },
  partnership: {
    label: 'Partnership',
    hint: 'Collabs & sponsors',
    icon: <Handshake size={22} />,
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    mailSubject: () => 'CyberHx x You - let\'s talk partnership',
    mailBody: (n, l) =>
      `Hi ${n},\n\nThanks for your interest in partnering with CyberHx! Please pick a time that works for you for a short call:\n\n${l}\n\nA Google Meet link will be added to your calendar once you confirm.\n\nRegards,\nTeam CyberHx`,
  },
  ctf: {
    label: 'Host a CTF',
    hint: 'CTF hosting requests',
    icon: <Flag size={22} />,
    badge: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
    mailSubject: () => 'CyberHx - your CTF hosting call',
    mailBody: (n, l) =>
      `Hi ${n},\n\nThanks for reaching out about hosting a CTF with CyberHx. Let's discuss the details on a quick call - please pick a slot here:\n\n${l}\n\nA Google Meet link will be added to your calendar once you confirm.\n\nRegards,\nTeam CyberHx`,
  },
  other: {
    label: 'Other',
    hint: 'Write your own topic',
    icon: <PenLine size={22} />,
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    mailSubject: (t) => `CyberHx - ${t || 'let\'s connect'}`,
    mailBody: (n, l, t) =>
      `Hi ${n},\n\nWe'd like to set up a call with you${t ? ` about: ${t}` : ''}. Please pick a time that works for you:\n\n${l}\n\nA Google Meet link will be added to your calendar once you confirm.\n\nRegards,\nTeam CyberHx`,
  },
};

const KIND_ORDER: MeetingKind[] = ['interview', 'partnership', 'ctf', 'other'];

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const input =
  'w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';

const EMAIL_FIND = /[^\s,;<>"'()]+@[^\s,;<>"'()]+\.[^\s,;<>"'()]+/g;
const MAX_LINK_GUESTS = 50; // people on one booking link
const MAX_DIRECT_GUESTS = 100; // people when you book the time yourself
const DURATIONS = [30, 45, 60, 90, 120, 180];
const istToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const IST = { timeZone: 'Asia/Kolkata' } as const;
const istDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', IST);
const istDayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' });
const istTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { ...IST, hour: 'numeric', minute: '2-digit' });

/** Chips + type/paste/import. Shared by the create form and the "Add people" box. */
const GuestInput: React.FC<{ guests: string[]; setGuests: (g: string[]) => void; max: number; extra?: React.ReactNode }> = ({ guests, setGuests, max, extra }) => {
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState('');

  const add = (text: string) => {
    const found = Array.from(new Set((text.match(EMAIL_FIND) || []).map((x) => x.toLowerCase().replace(/\.+$/, ''))));
    if (!found.length) {
      if (text.trim()) setMsg('No valid email found.');
      return;
    }
    const next = [...guests];
    let added = 0, dup = 0, over = 0;
    for (const e of found) {
      if (next.includes(e)) dup++;
      else if (next.length >= max) over++;
      else { next.push(e); added++; }
    }
    setGuests(next);
    setMsg(`${added} added${dup ? `, ${dup} duplicate` : ''}${over ? `, ${over} skipped (max ${max})` : ''}`);
  };

  return (
    <div>
      <label className="text-gray-400 text-xs font-medium mb-1.5 flex items-center justify-between">
        <span>Emails ({guests.length}/{max})</span>
        {guests.length > 0 && (
          <button type="button" onClick={() => { setGuests([]); setMsg(''); }} className="text-gray-500 hover:text-red-400">Clear all</button>
        )}
      </label>
      <div className="bg-[#05080f] border border-white/10 rounded-xl p-2 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto focus-within:border-[#a3e635]/50">
        {guests.map((g) => (
          <span key={g} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">
            {g}
            <button type="button" onClick={() => setGuests(guests.filter((x) => x !== g))} className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-red-400" aria-label={`Remove ${g}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (['Enter', ',', ' ', ';'].includes(e.key) && draft.trim()) {
              e.preventDefault();
              add(draft);
              setDraft('');
            } else if (e.key === 'Backspace' && !draft && guests.length) {
              setGuests(guests.slice(0, -1));
            }
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text');
            if (/[\s,;]/.test(t.trim())) {
              e.preventDefault();
              add(t);
            }
          }}
          onBlur={() => {
            if (draft.trim()) { add(draft); setDraft(''); }
          }}
          placeholder={guests.length ? 'Add another…' : 'Type an email and press Enter, or paste a whole list'}
          className="flex-1 min-w-[200px] bg-transparent px-2 py-1 text-sm text-white placeholder-gray-600 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <label className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer">
          <Upload size={12} /> Import list (.csv / .txt)
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) add(await f.text());
              e.target.value = '';
            }}
          />
        </label>
        {extra}
        {msg && <span className="text-[11px] text-gray-500">{msg}</span>}
      </div>
    </div>
  );
};

interface SlotData { slotMinutes: number; slots: string[]; taken: string[] }

export const MeetingsPanel: React.FC<{ prefill?: MeetingPrefill | null }> = ({ prefill }) => {
  const [kind, setKind] = useState<MeetingKind>('interview');
  const [topic, setTopic] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('7');
  const [mode, setMode] = useState<'single' | 'group'>('single');
  const [guests, setGuests] = useState<string[]>([]);
  const [hideGuests, setHideGuests] = useState(true);
  const [when, setWhen] = useState<'link' | 'now' | 'custom'>('link');
  const [dur, setDur] = useState(''); // '' = one slot
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addGuestsList, setAddGuestsList] = useState<string[]>([]);
  const [addBusy, setAddBusy] = useState(false);
  const [emailsCopied, setEmailsCopied] = useState(false);
  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [pickDay, setPickDay] = useState('');
  const [pickSlot, setPickSlot] = useState('');
  const [okMsg, setOkMsg] = useState<{ text: string; meet: string | null } | null>(null);
  const [link, setLink] = useState('');
  const [linkKind, setLinkKind] = useState<MeetingKind>('interview');
  const [linkTopic, setLinkTopic] = useState('');
  const [linkTo, setLinkTo] = useState<string[]>([]);
  const [linkName, setLinkName] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Booking[]>([]);
  const [pending, setPending] = useState<PendingLink[]>([]);
  const [copiedCode, setCopiedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | MeetingKind>('all');

  // Pre-fill coming from the Applications / CTF Requests tabs
  useEffect(() => {
    if (!prefill) return;
    setKind(prefill.kind);
    setMode('single');
    setName(prefill.name);
    setEmail(prefill.email);
    setLink('');
    setOkMsg(null);
    setError('');
  }, [prefill]);

  const api = useCallback(async (init?: RequestInit, query = '') => {
    const res = await fetch(`/api/interview${query}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.reload(); // session expired → back to login
      throw new Error('Session expired.');
    }
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api(undefined, '?admin=list');
      setItems(data.items || []);
      setPending(data.pending || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  // Slot picker (only when the admin wants to choose the time himself)
  const loadSlotPicker = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const d: SlotData = await api(undefined, `?admin=slots${dur ? `&dur=${dur}` : ''}`);
      setSlotData(d);
      setPickDay((cur) => (cur && [...d.slots, ...d.taken].some((s) => istDay(s) === cur) ? cur : d.slots[0] ? istDay(d.slots[0]) : ''));
      setPickSlot('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load slots.');
    } finally {
      setSlotsLoading(false);
    }
  }, [api, dur]);

  useEffect(() => {
    if (when === 'now') loadSlotPicker();
  }, [when, loadSlotPicker]);

  const topicMissing = kind === 'other' && !topic.trim();
  const maxGuests = when === 'link' ? MAX_LINK_GUESTS : MAX_DIRECT_GUESTS;
  const emailOk = mode === 'group' ? guests.length > 0 && guests.length <= maxGuests : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const timeOk = when === 'link' || (when === 'now' && !!pickSlot) || (when === 'custom' && !!customDate && !!customTime && customDate >= istToday());
  const canGenerate = !busy && !!name.trim() && emailOk && !topicMissing && timeOk;

  const createLink = async () => {
    setBusy(true);
    setError('');
    setLink('');
    setOkMsg(null);
    try {
      const base = { action: 'create-link', name, days: Number(days), kind, topic: kind === 'other' ? topic : '', ...(dur ? { dur: Number(dur) } : {}) };
      const data = await api({
        method: 'POST',
        body: JSON.stringify(mode === 'group' ? { ...base, emails: guests, hideGuests } : { ...base, email }),
      });
      setLink(data.link);
      setLinkKind(kind);
      setLinkTopic(kind === 'other' ? topic.trim() : '');
      setLinkTo(mode === 'group' ? guests : [email.trim()]);
      setLinkName(name);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  const bookNow = async (force = false): Promise<void> => {
    setBusy(true);
    setError('');
    setLink('');
    setOkMsg(null);
    try {
      const body = {
        action: 'book-now', name, kind, topic: kind === 'other' ? topic : '', hideGuests,
        ...(dur ? { dur: Number(dur) } : {}),
        ...(when === 'custom' ? { custom: { date: customDate, time: customTime }, force } : { start: pickSlot }),
        ...(mode === 'group' ? { emails: guests } : { email }),
      };
      const d = await api({ method: 'POST', body: JSON.stringify(body) });
      setOkMsg({ text: `Booked ${istDayLabel(d.start)}, ${istTime(d.start)} IST. Invite sent to ${d.guests} ${d.guests > 1 ? 'people' : 'person'}.`, meet: d.meetLink });
      await Promise.all([load(), when === 'now' ? loadSlotPicker() : Promise.resolve()]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed.';
      if (when === 'custom' && !force && /already have something/i.test(msg)) {
        setBusy(false);
        if (confirm(`${msg}\n\nBook it anyway (double-book)?`)) return bookNow(true);
        return;
      }
      setError(msg);
      if (when === 'now') loadSlotPicker();
    } finally {
      setBusy(false);
    }
  };

  const addPeople = async (b: Booking) => {
    setAddBusy(true);
    setError('');
    try {
      const d = await api({ method: 'POST', body: JSON.stringify({ action: 'add-attendees', eventId: b.eventId, emails: addGuestsList }) });
      setOkMsg({ text: `${d.added} added${d.skipped ? `, ${d.skipped} already invited` : ''}. Invites sent.`, meet: null });
      setAddGuestsList([]);
      setAddingTo(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setAddBusy(false);
    }
  };

  const cancel = async (b: Booking) => {
    if (!confirm(`Cancel ${b.name}'s meeting? They will get a cancellation email and can book again.`)) return;
    try {
      await api({ method: 'POST', body: JSON.stringify({ action: 'cancel', eventId: b.eventId }) });
      setItems((prev) => prev.filter((x) => x.eventId !== b.eventId));
      if (when === 'now') loadSlotPicker();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    }
  };

  const removePending = async (p: PendingLink) => {
    if (!confirm(`Delete the unused link for ${p.name}? It will stop working.`)) return;
    try {
      await api({ method: 'POST', body: JSON.stringify({ action: 'delete-link', code: p.code }) });
      setPending((prev) => prev.filter((x) => x.code !== p.code));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    }
  };

  const copyPending = async (p: PendingLink) => {
    await navigator.clipboard.writeText(p.link);
    setCopiedCode(p.code);
    setTimeout(() => setCopiedCode(''), 1500);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Group links are short now, but a long BCC list can still overflow mail apps - so the guest list is
  // copied separately ("Copy all emails") and the mailto only carries subject + body.
  const mailto = useMemo(() => {
    const k = KINDS[linkKind];
    const group = linkTo.length > 1;
    const to = group ? '?' : `${linkTo[0] || ''}?`;
    return `mailto:${to}subject=${encodeURIComponent(k.mailSubject(linkTopic))}&body=${encodeURIComponent(k.mailBody(group ? 'all' : linkName, link, linkTopic))}`;
  }, [linkKind, linkTopic, linkTo, linkName, link]);

  const shown = filter === 'all' ? items : items.filter((i) => (i.kind || 'interview') === filter);
  const shownPending = filter === 'all' ? pending : pending.filter((i) => i.kind === filter);

  // slot picker data: every slot inside your hours, taken ones are shown as "Booked"
  const pickDays = useMemo(() => {
    const map = new Map<string, { iso: string; taken: boolean }[]>();
    if (slotData) {
      const free = new Set(slotData.slots);
      [...slotData.slots, ...slotData.taken].sort().forEach((iso) => {
        const k = istDay(iso);
        map.set(k, [...(map.get(k) || []), { iso, taken: !free.has(iso) }]);
      });
    }
    return Array.from(map.entries());
  }, [slotData]);

  const seg = (active: boolean) =>
    `px-3.5 py-1.5 rounded-lg text-xs border transition-all ${active ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635] font-semibold' : 'bg-[#05080f] border-white/10 text-gray-400 hover:text-white'}`;

  return (
    <div className="space-y-8">
      {error && (
        <p className="text-red-400 text-sm flex items-center gap-1.5">
          <AlertTriangle size={14} /> {error}
        </p>
      )}

      {/* Create link */}
      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5 sm:p-6">
        <h3 className="text-white font-medium mb-1 flex items-center gap-2">
          <Link2 size={16} className="text-[#a3e635]" /> Schedule a meeting
        </h3>
        <p className="text-gray-500 text-xs mb-5">Pick what the meeting is for, then send a private booking link (or pick the time yourself). Booked slots are blocked for everyone else automatically.</p>

        {/* Type buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {KIND_ORDER.map((k) => {
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={active}
                className={`text-left rounded-2xl border p-4 transition-all ${
                  active
                    ? 'bg-[#a3e635]/10 border-[#a3e635] shadow-[0_0_0_1px_rgba(163,230,53,0.4),0_8px_30px_-12px_rgba(163,230,53,0.5)]'
                    : 'bg-[#05080f] border-white/10 hover:border-white/25 hover:bg-white/[0.03]'
                }`}
              >
                <div className={`mb-3 ${active ? 'text-[#a3e635]' : 'text-gray-500'}`}>{KINDS[k].icon}</div>
                <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-gray-300'}`}>{KINDS[k].label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{KINDS[k].hint}</p>
              </button>
            );
          })}
        </div>

        {kind === 'other' && (
          <div className="mb-3">
            <label className="text-gray-400 text-xs font-medium mb-1.5 block">Meeting topic (you write it)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 80))}
              placeholder="e.g. Podcast guest chat, Workshop planning…"
              className={input}
            />
          </div>
        )}

        {/* Who */}
        <div className="flex gap-2 flex-wrap mb-4">
          <button type="button" onClick={() => setMode('single')} className={seg(mode === 'single')}>
            <span className="inline-flex items-center gap-1.5"><UserCheck size={12} /> One person (1:1)</span>
          </button>
          <button type="button" onClick={() => setMode('group')} className={seg(mode === 'group')}>
            <span className="inline-flex items-center gap-1.5"><Users size={12} /> Group - one link, many people</span>
          </button>
        </div>

        {mode === 'single' ? (
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" className={input} />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their email" type="email" className={input} />
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Meeting / group name</label>
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} placeholder="e.g. Core team sync, Mentor onboarding" className={input} />
            </div>
            <GuestInput
              guests={guests}
              setGuests={setGuests}
              max={maxGuests}
              extra={
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                  <input type="checkbox" checked={hideGuests} onChange={(e) => setHideGuests(e.target.checked)} className="accent-[#a3e635]" />
                  Hide guest list from attendees
                </label>
              }
            />
            {when === 'link' && guests.length > MAX_LINK_GUESTS && (
              <p className="text-amber-400 text-xs">A booking link holds up to {MAX_LINK_GUESTS} people. Remove some, or choose "I pick the date & time" (up to {MAX_DIRECT_GUESTS}).</p>
            )}
          </div>
        )}

        {/* When */}
        <div className="flex gap-2 flex-wrap mb-4 items-center">
          <span className="text-gray-500 text-xs mr-1 flex items-center gap-1"><Clock size={12} /> Time:</span>
          <button type="button" onClick={() => setWhen('link')} className={seg(when === 'link')}>They pick (send link)</button>
          <button type="button" onClick={() => setWhen('now')} className={seg(when === 'now')}>I pick a free slot</button>
          <button type="button" onClick={() => setWhen('custom')} className={seg(when === 'custom')}>Any date & time</button>
          <span className="ml-auto flex items-center gap-2">
            <label className="text-gray-500 text-xs">Length</label>
            <select value={dur} onChange={(e) => { setDur(e.target.value); setPickSlot(''); }} className="bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#a3e635]/50">
              <option value="">Default (1 slot)</option>
              {DURATIONS.map((n) => <option key={n} value={n}>{n} min</option>)}
            </select>
          </span>
        </div>

        {when === 'custom' && (
          <div className="mb-4 p-4 rounded-xl bg-[#05080f] border border-white/10">
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Date</label>
                <input type="date" value={customDate} min={istToday()} onChange={(e) => setCustomDate(e.target.value)} className={`${input} [color-scheme:dark]`} />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Time (IST)</label>
                <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className={`${input} [color-scheme:dark]`} />
              </div>
            </div>
            <p className="text-[11px] text-gray-600 mt-2">Works even outside your normal hours. If you already have something at that time, you'll be asked before double-booking.</p>
          </div>
        )}

        {when === 'now' && (
          <div className="mb-4 p-4 rounded-xl bg-[#05080f] border border-white/10">
            {slotsLoading && !slotData ? (
              <p className="text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading slots…</p>
            ) : pickDays.length === 0 ? (
              <p className="text-gray-500 text-sm">No open slots. Add hours in the Availability tab.</p>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
                  {pickDays.map(([k, list]) => (
                    <button key={k} type="button" onClick={() => { setPickDay(k); setPickSlot(''); }}
                      className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs transition-all ${pickDay === k ? 'border-[#a3e635] text-[#a3e635] bg-[#a3e635]/10' : 'border-white/10 text-gray-300 hover:border-white/30'}`}>
                      {istDayLabel(list[0].iso)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
                  {(pickDays.find(([k]) => k === pickDay)?.[1] || []).map(({ iso, taken }) => (
                    <button key={iso} type="button" disabled={taken} onClick={() => setPickSlot(iso)}
                      title={taken ? 'Already booked / busy' : ''}
                      className={`py-2 rounded-lg border text-xs transition-all ${
                        taken
                          ? 'border-white/5 bg-white/[0.02] text-gray-600 line-through cursor-not-allowed'
                          : pickSlot === iso
                            ? 'border-[#a3e635] bg-[#a3e635] text-[#05080f] font-semibold'
                            : 'border-white/10 text-gray-200 hover:border-[#a3e635]/60'
                      }`}>
                      {istTime(iso)}
                      {taken && <span className="block text-[9px] no-underline">Booked</span>}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-600 mt-3">All times IST · {slotData?.slotMinutes}-minute meeting on Google Meet</p>
              </>
            )}
          </div>
        )}

        <div className="flex items-end gap-3 flex-wrap">
          {when === 'link' && (
            <div className="w-28">
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Valid (days)</label>
              <input value={days} onChange={(e) => setDays(e.target.value)} type="number" min={1} max={60} className={input} />
            </div>
          )}
          <button
            onClick={() => (when === 'link' ? createLink() : bookNow())}
            disabled={!canGenerate}
            className="px-5 py-2.5 bg-[#a3e635] text-[#05080f] font-bold rounded-xl hover:bg-[#bef264] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CalendarClock size={15} />}
            {when === 'link' ? 'Generate link' : 'Book & send invites'}
          </button>
        </div>

        {okMsg && (
          <div className="mt-4 p-3 rounded-xl bg-[#a3e635]/5 border border-[#a3e635]/30 text-sm text-[#a3e635] flex items-center gap-3 flex-wrap">
            <Check size={14} /> {okMsg.text}
            {okMsg.meet && <a href={okMsg.meet} target="_blank" rel="noreferrer" className="underline flex items-center gap-1"><Video size={12} /> Meet link</a>}
          </div>
        )}

        {link && (
          <div className="mt-4 p-3 rounded-xl bg-[#05080f] border border-white/10">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${KINDS[linkKind].badge}`}>
                {linkKind === 'other' && linkTopic ? linkTopic : KINDS[linkKind].label}
              </span>
              <span className="text-gray-600 text-xs">
                {linkTo.length > 1 ? `one link for ${linkTo.length} people - the first to book picks the slot, everyone gets the invite` : `link ready for ${linkName}`}
              </span>
            </div>
            <p className="text-gray-300 text-xs break-all mb-3">{link}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={copy} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5">
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy link'}
              </button>
              <a href={mailto} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5">
                <Mail size={12} /> Open in mail app
              </a>
              {linkTo.length > 1 && (
                <button
                  onClick={async () => { await navigator.clipboard.writeText(linkTo.join(', ')); setEmailsCopied(true); setTimeout(() => setEmailsCopied(false), 1500); }}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5"
                >
                  {emailsCopied ? <Check size={12} /> : <Users size={12} />} {emailsCopied ? 'Copied' : `Copy all ${linkTo.length} emails (paste in BCC)`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bookings */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-white font-medium">Meetings &amp; links</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', ...KIND_ORDER] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                  filter === f ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635] font-medium' : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : KINDS[f].label}
              </button>
            ))}
            <button onClick={load} className="text-gray-500 hover:text-white p-1.5" title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        {!loading && shown.length === 0 && shownPending.length === 0 && <p className="text-gray-500 text-sm">No meetings or links yet.</p>}
        <div className="space-y-3">
          {shownPending.map((p) => (
            <div key={p.code} className="bg-[#0a0f1a] border border-dashed border-white/15 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm font-medium truncate">{p.name}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${KINDS[p.kind].badge}`}>
                    {p.kind === 'other' && p.topic ? p.topic : KINDS[p.kind].label}
                  </span>
                  {p.group && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-gray-300 flex items-center gap-1">
                      <Users size={10} /> Group · {p.guests.length}
                    </span>
                  )}
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-yellow-500/30 text-yellow-300 flex items-center gap-1">
                    <Clock size={10} /> Waiting for slot
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5 truncate">{p.group ? `${p.guests.length} people invited` : p.email}</p>
                <p className="text-gray-400 text-xs mt-1 break-all">{p.link}</p>
                <p className="text-gray-600 text-[11px] mt-0.5">Expires {fmt(p.expiresAt)} IST</p>
              </div>
              <button onClick={() => copyPending(p)} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5">
                {copiedCode === p.code ? <Check size={12} /> : <Copy size={12} />} {copiedCode === p.code ? 'Copied' : 'Copy link'}
              </button>
              <button onClick={() => removePending(p)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10" title="Delete link">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {shown.map((b) => {
            const k = b.kind || 'interview';
            const n = b.attendees?.length || 0;
            const accepted = (b.attendees || []).filter((a) => a.status === 'accepted').length;
            return (
              <div key={b.eventId} className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-medium truncate">{b.name}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${KINDS[k].badge}`}>
                      {k === 'other' && b.topic ? b.topic : KINDS[k].label}
                    </span>
                    {b.group && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-gray-300 flex items-center gap-1">
                        <Users size={10} /> Group · {n}
                      </span>
                    )}
                  </div>
                  {b.group ? (
                    <details className="mt-0.5">
                      <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-300">{accepted}/{n} accepted · show guests</summary>
                      <ul className="mt-1.5 space-y-0.5">
                        {(b.attendees || []).map((a) => (
                          <li key={a.email} className="text-xs text-gray-400 flex items-center gap-2">
                            {a.email}
                            <span className={a.status === 'accepted' ? 'text-green-400' : a.status === 'declined' ? 'text-red-400' : 'text-yellow-400'}>
                              {a.status === 'needsAction' ? 'pending' : a.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <p className="text-gray-500 text-xs">{b.email}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    {fmt(b.start)} IST
                    {!b.group && (
                      <>
                        {' · '}
                        <span className={b.status === 'accepted' ? 'text-green-400' : b.status === 'declined' ? 'text-red-400' : 'text-yellow-400'}>
                          {b.status === 'needsAction' ? 'invite pending' : b.status}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {(b.group || b.canAdd) && (
                  <button
                    onClick={() => { setAddingTo(addingTo === b.eventId ? null : b.eventId); setAddGuestsList([]); }}
                    className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5"
                  >
                    <UserPlus size={12} /> Add people
                  </button>
                )}
                {b.meetLink && (
                  <a href={b.meetLink} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5">
                    <Video size={12} /> Join Meet
                  </a>
                )}
                <button onClick={() => cancel(b)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10" title="Cancel meeting">
                  <Trash2 size={14} />
                </button>
                {addingTo === b.eventId && (
                  <div className="basis-full pt-3 border-t border-white/5">
                    <GuestInput guests={addGuestsList} setGuests={setAddGuestsList} max={MAX_DIRECT_GUESTS} />
                    <button
                      onClick={() => addPeople(b)}
                      disabled={!addGuestsList.length || addBusy}
                      className="mt-3 px-4 py-2 bg-[#a3e635] text-[#05080f] text-sm font-bold rounded-xl hover:bg-[#bef264] disabled:opacity-50 flex items-center gap-2"
                    >
                      {addBusy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Invite {addGuestsList.length || ''} {addGuestsList.length === 1 ? 'person' : 'people'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
