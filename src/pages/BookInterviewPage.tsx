import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, CheckCircle, AlertCircle, Video, Loader2 } from 'lucide-react';

type Kind = 'interview' | 'partnership' | 'ctf' | 'other';
const KIND_TEXT: Record<Kind, { title: string; noun: string }> = {
  interview: { title: 'Book your interview', noun: 'interview' },
  partnership: { title: 'Book a partnership call', noun: 'call' },
  ctf: { title: 'Book your CTF hosting call', noun: 'call' },
  other: { title: 'Book a meeting with CyberHx', noun: 'meeting' },
};

type Booked = { meetLink: string | null; start: string; end: string };

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD, local tz
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const fullLabel = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });

const BookInterviewPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('t') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('interview');
  const [topic, setTopic] = useState('');
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [slots, setSlots] = useState<string[]>([]);
  const [alreadyBooked, setAlreadyBooked] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Booked | null>(null);

  useEffect(() => {
    document.title = 'Book a meeting | CyberHx';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const loadSlots = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/interview?t=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load slots.');
      setName(data.name);
      if (data.kind in KIND_TEXT) setKind(data.kind);
      setTopic(data.topic || '');
      if (data.slotMinutes) setSlotMinutes(data.slotMinutes);
      setAlreadyBooked(data.booked || null);
      setSlots(data.slots || []);
      setSelectedDay(data.slots?.[0] ? dayKey(data.slots[0]) : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load slots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('This link is invalid. Please use the link we emailed you.');
      setLoading(false);
      return;
    }
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    slots.forEach((s) => {
      const k = dayKey(s);
      map.set(k, [...(map.get(k) || []), s]);
    });
    return Array.from(map.entries());
  }, [slots]);

  const book = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token, start: selectedSlot }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Booking failed.');
        if (res.status === 409) {
          setSelectedSlot('');
          await loadSlots();
        }
        return;
      }
      setDone(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const card = 'max-w-2xl mx-auto bg-dark-100 border border-gray-700 rounded-2xl p-6 sm:p-8';

  return (
    <div className="min-h-screen bg-dark-300 py-24 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold gradient-text mb-3">{KIND_TEXT[kind].title}</h1>
        {kind === 'other' && topic && !done && !alreadyBooked && <p className="text-primary mb-2">{topic}</p>}
        {name && !done && !alreadyBooked && (
          <p className="text-gray-400">Hi {name}, pick a time that works for you.</p>
        )}
      </div>

      {loading && (
        <div className={`${card} flex items-center justify-center gap-3 text-gray-300`}>
          <Loader2 className="w-5 h-5 animate-spin" /> Loading available slots…
        </div>
      )}

      {!loading && done && (
        <div className={card}>
          <div className="flex items-center gap-3 text-green-400 mb-4">
            <CheckCircle className="w-6 h-6" />
            <h2 className="text-xl font-semibold">You're booked!</h2>
          </div>
          <p className="text-gray-300 mb-2">{fullLabel(done.start)}</p>
          <p className="text-gray-400 text-sm mb-5">
            A Google Calendar invite with the Meet link has been sent to your email.
          </p>
          {done.meetLink && (
            <a
              href={done.meetLink}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-dark-300 font-medium hover:bg-secondary transition-colors"
            >
              <Video className="w-4 h-4" /> Google Meet link
            </a>
          )}
        </div>
      )}

      {!loading && !done && alreadyBooked && (
        <div className={card}>
          <div className="flex items-center gap-3 text-primary mb-3">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Already booked</h2>
          </div>
          <p className="text-gray-300">{fullLabel(alreadyBooked)}</p>
          <p className="text-gray-400 text-sm mt-3">Check your email for the calendar invite. Need to reschedule? Reply to our email.</p>
        </div>
      )}

      {!loading && !done && !alreadyBooked && (
        <div className={card}>
          {error && (
            <div className="flex items-start gap-2 text-red-400 mb-5 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /> <span>{error}</span>
            </div>
          )}

          {slots.length === 0 && !error && (
            <p className="text-gray-300">No slots are open right now. Please check back soon or reply to our email.</p>
          )}

          {days.length > 0 && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
                {days.map(([k, list]) => (
                  <button
                    key={k}
                    onClick={() => {
                      setSelectedDay(k);
                      setSelectedSlot('');
                    }}
                    className={`shrink-0 px-4 py-2 rounded-lg border text-sm transition-colors ${
                      selectedDay === k
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {dayLabel(list[0])}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
                {(days.find(([k]) => k === selectedDay)?.[1] || []).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSlot(s)}
                    className={`py-2 rounded-lg border text-sm transition-colors ${
                      selectedSlot === s
                        ? 'border-primary bg-primary text-dark-300 font-medium'
                        : 'border-gray-700 text-gray-200 hover:border-primary'
                    }`}
                  >
                    {timeLabel(s)}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Times shown in your timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). {slotMinutes}-minute {KIND_TEXT[kind].noun} on Google Meet.
              </p>

              <button
                onClick={book}
                disabled={!selectedSlot || submitting}
                className="w-full py-3 rounded-lg bg-primary text-dark-300 font-medium hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Booking…
                  </>
                ) : (
                  'Confirm slot'
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BookInterviewPage;
