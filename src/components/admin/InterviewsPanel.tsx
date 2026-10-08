import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Copy, Check, Mail, Video, Trash2, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

interface Booking {
  eventId: string;
  name: string;
  email: string;
  status: string;
  start: string;
  end: string;
  meetLink: string | null;
}

const TOKEN_KEY = 'cyberhx_admin_token';
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const input =
  'w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';

export const InterviewsPanel: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('7');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const api = useCallback(
    async (init?: RequestInit, query = '') => {
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
    },
    [],
  );

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

  const createLink = async () => {
    setBusy(true);
    setError('');
    setLink('');
    try {
      const data = await api({ method: 'POST', body: JSON.stringify({ action: 'create-link', name, email, days: Number(days) }) });
      setLink(data.link);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (b: Booking) => {
    if (!confirm(`Cancel ${b.name}'s interview? They will get a cancellation email and can book again.`)) return;
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

  const mailto = `mailto:${email}?subject=${encodeURIComponent('CyberHx Interview - choose your slot')}&body=${encodeURIComponent(
    `Hi ${name},\n\nCongratulations, you have been shortlisted! Please book an interview slot that suits you here:\n\n${link}\n\nA Google Meet link will be added to your calendar once you confirm.\n\nRegards,\nTeam CyberHx`,
  )}`;

  return (
    <div className="space-y-8">
      {error && (
        <p className="text-red-400 text-sm flex items-center gap-1.5">
          <AlertTriangle size={14} /> {error}
        </p>
      )}

      {/* Create link */}
      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-6">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Link2 size={16} className="text-[#a3e635]" /> Create booking link for a shortlisted candidate
        </h3>
        <div className="grid sm:grid-cols-[1fr_1fr_100px_auto] gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Candidate name" className={input} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Candidate email" type="email" className={input} />
          <input value={days} onChange={(e) => setDays(e.target.value)} type="number" min={1} max={60} title="Link valid for (days)" className={input} />
          <button
            onClick={createLink}
            disabled={busy || !name.trim() || !email.trim()}
            className="px-5 py-2.5 bg-[#a3e635] text-[#05080f] font-bold rounded-xl hover:bg-[#bef264] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />} Generate
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-2">Third box = link valid for that many days.</p>

        {link && (
          <div className="mt-4 p-3 rounded-xl bg-[#05080f] border border-white/10">
            <p className="text-gray-300 text-xs break-all mb-3">{link}</p>
            <div className="flex gap-2">
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">Booked interviews</h3>
          <button onClick={load} className="text-gray-500 hover:text-white p-1.5" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {!loading && items.length === 0 && <p className="text-gray-500 text-sm">No interviews booked yet.</p>}
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.eventId} className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{b.name}</p>
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
              <button onClick={() => cancel(b)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10" title="Cancel interview">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
