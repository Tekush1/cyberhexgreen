import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link2, Copy, Check, Mail, Video, Trash2, Loader2, RefreshCw, AlertTriangle,
  UserCheck, Handshake, Flag, PenLine, CalendarClock,
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

interface Booking {
  eventId: string;
  name: string;
  email: string;
  status: string;
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

export const MeetingsPanel: React.FC<{ prefill?: MeetingPrefill | null }> = ({ prefill }) => {
  const [kind, setKind] = useState<MeetingKind>('interview');
  const [topic, setTopic] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('7');
  const [link, setLink] = useState('');
  const [linkKind, setLinkKind] = useState<MeetingKind>('interview');
  const [linkTopic, setLinkTopic] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | MeetingKind>('all');

  // Pre-fill coming from the Applications / CTF Requests tabs
  useEffect(() => {
    if (!prefill) return;
    setKind(prefill.kind);
    setName(prefill.name);
    setEmail(prefill.email);
    setLink('');
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const topicMissing = kind === 'other' && !topic.trim();
  const canGenerate = !busy && name.trim() && email.trim() && !topicMissing;

  const createLink = async () => {
    setBusy(true);
    setError('');
    setLink('');
    try {
      const data = await api({
        method: 'POST',
        body: JSON.stringify({ action: 'create-link', name, email, days: Number(days), kind, topic: kind === 'other' ? topic : '' }),
      });
      setLink(data.link);
      setLinkKind(kind);
      setLinkTopic(kind === 'other' ? topic.trim() : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (b: Booking) => {
    if (!confirm(`Cancel ${b.name}'s meeting? They will get a cancellation email and can book again.`)) return;
    try {
      await api({ method: 'POST', body: JSON.stringify({ action: 'cancel', eventId: b.eventId }) });
      setItems((prev) => prev.filter((x) => x.eventId !== b.eventId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const mailto = useMemo(() => {
    const k = KINDS[linkKind];
    return `mailto:${email}?subject=${encodeURIComponent(k.mailSubject(linkTopic))}&body=${encodeURIComponent(k.mailBody(name, link, linkTopic))}`;
  }, [linkKind, linkTopic, email, name, link]);

  const shown = filter === 'all' ? items : items.filter((i) => (i.kind || 'interview') === filter);

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
        <p className="text-gray-500 text-xs mb-5">Pick what the meeting is for, then send the person a private booking link. They choose from the times you marked available.</p>

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

        <div className="grid sm:grid-cols-[1fr_1fr_110px_auto] gap-3 items-end">
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1.5 block">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" className={input} />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1.5 block">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their email" type="email" className={input} />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1.5 block">Valid (days)</label>
            <input value={days} onChange={(e) => setDays(e.target.value)} type="number" min={1} max={60} className={input} />
          </div>
          <button
            onClick={createLink}
            disabled={!canGenerate}
            className="px-5 py-2.5 bg-[#a3e635] text-[#05080f] font-bold rounded-xl hover:bg-[#bef264] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CalendarClock size={15} />} Generate link
          </button>
        </div>

        {link && (
          <div className="mt-4 p-3 rounded-xl bg-[#05080f] border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${KINDS[linkKind].badge}`}>
                {linkKind === 'other' && linkTopic ? linkTopic : KINDS[linkKind].label}
              </span>
              <span className="text-gray-600 text-xs">link ready for {name}</span>
            </div>
            <p className="text-gray-300 text-xs break-all mb-3">{link}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={copy} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5">
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy link'}
              </button>
              <a href={mailto} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5">
                <Mail size={12} /> Open in mail app
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Bookings */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-white font-medium">Booked meetings</h3>
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
        {!loading && shown.length === 0 && <p className="text-gray-500 text-sm">No meetings booked yet.</p>}
        <div className="space-y-3">
          {shown.map((b) => {
            const k = b.kind || 'interview';
            return (
              <div key={b.eventId} className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-medium truncate">{b.name}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${KINDS[k].badge}`}>
                      {k === 'other' && b.topic ? b.topic : KINDS[k].label}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">{b.email}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {fmt(b.start)} IST ·{' '}
                    <span className={b.status === 'accepted' ? 'text-green-400' : b.status === 'declined' ? 'text-red-400' : 'text-yellow-400'}>
                      {b.status === 'needsAction' ? 'invite pending' : b.status}
                    </span>
                  </p>
                </div>
                {b.meetLink && (
                  <a href={b.meetLink} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5">
                    <Video size={12} /> Join Meet
                  </a>
                )}
                <button onClick={() => cancel(b)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10" title="Cancel meeting">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
