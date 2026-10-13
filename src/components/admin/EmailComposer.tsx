import React, { useMemo, useState } from 'react';
import { Send, Loader2, X, Check, AlertTriangle } from 'lucide-react';
import { TEMPLATES, MAX_FIELD, renderEmail, type TemplateId } from '../../../shared/emailTemplates';
import { TOKEN_KEY } from './adminApi';
import { GuestInput } from './GuestInput';

export interface EmailTarget {
  name: string;
  emails: string[];
  title: string;
  start?: string | null;
  end?: string | null;
  meetLink?: string | null;
}

const DURATIONS = [15, 30, 45, 60, 90, 120];
/** IST date (YYYY-MM-DD) + time (HH:MM) -> ISO string */
const istToIso = (d: string, t: string) => (d && t ? new Date(`${d}T${t}:00+05:30`).toISOString() : null);

const EMAIL_IN_LINE = /[^\s,;<>"'()]+@[^\s,;<>"'()]+\.[^\s,;<>"'()]+/;
/** "Riya Sharma, riya@x.com" / "Riya <riya@x.com>" / "riya@x.com" -> one recipient per line, each with their own name. */
export function parseRecipients(text: string) {
  const out: { email: string; name: string }[] = [];
  let bad = 0;
  for (const line of text.split(/\n/)) {
    if (!line.trim()) continue;
    const m = line.match(EMAIL_IN_LINE);
    if (!m) { bad++; continue; }
    const email = m[0].toLowerCase().replace(/\.+$/, '');
    const name = line.replace(m[0], ' ').replace(/[<>,;:|"'()\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_FIELD.name);
    if (!out.some((r) => r.email === email)) out.push({ email, name });
  }
  return { list: out.slice(0, 100), bad, over: Math.max(0, out.length - 100) };
}

const input =
  'w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';

/** Pick a template, edit recipients and a note, preview, send through /api/email (Resend). */
export const EmailComposer: React.FC<{
  target: EmailTarget;
  onClose?: () => void;
  onSent: (msg: string) => void;
  initialTemplate?: TemplateId;
  initialBookingLink?: string;
  /** Standalone mode: name, meeting, date/time and Meet link are typed in by hand. */
  editable?: boolean;
  heading?: string;
}> = ({ target, onClose, onSent, initialTemplate = 'confirmation', initialBookingLink = '', editable = false, heading = 'Send an email' }) => {
  const [template, setTemplate] = useState<TemplateId>(initialTemplate);
  const [to, setTo] = useState<string[]>(target.emails);
  const [note, setNote] = useState('');
  const [bookingLink, setBookingLink] = useState(initialBookingLink);
  const [rcptText, setRcptText] = useState('');
  const [eTitle, setETitle] = useState(target.title);
  const [eDate, setEDate] = useState('');
  const [eTime, setETime] = useState('');
  const [eLen, setELen] = useState('30');
  const [eMeet, setEMeet] = useState(target.meetLink || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const info = TEMPLATES.find((t) => t.id === template)!;
  const parsed = useMemo(() => parseRecipients(rcptText), [rcptText]);
  const count = editable ? parsed.list.length : to.length;
  const eStart = editable ? istToIso(eDate, eTime) : null;
  const vars = {
    name: editable ? parsed.list[0]?.name || '' : to.length > 1 ? '' : target.name,
    title: editable ? eTitle || 'meeting' : target.title,
    start: editable ? eStart : target.start,
    end: editable ? (eStart ? new Date(new Date(eStart).getTime() + Number(eLen) * 60000).toISOString() : null) : target.end,
    meetLink: editable ? eMeet.trim() || null : target.meetLink,
    bookingLink,
    note,
    subject,
    body,
  };
  const preview = useMemo(() => renderEmail(template, vars), [template, to.length, target, note, bookingLink, subject, body, parsed, eTitle, eDate, eTime, eLen, eMeet, editable]); // eslint-disable-line react-hooks/exhaustive-deps

  const bookingOk = !bookingLink || /^https:\/\/\S+$/i.test(bookingLink);
  const meetOk = !editable || !eMeet.trim() || /^https:\/\/\S+$/i.test(eMeet.trim());
  const canSend = !busy && count > 0 && bookingOk && meetOk && (!info.isCustom || (subject.trim() && body.trim()));

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` },
        body: JSON.stringify(editable ? { template, recipients: parsed.list, vars } : { template, to, vars }),
      });
      const raw = await res.text();
      let data: { error?: string; sent?: number } = {};
      try { data = JSON.parse(raw); } catch { /* non-JSON (proxy error page) */ }
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        window.location.reload();
        return;
      }
      if (!res.ok) throw new Error(data.error || `Could not send (HTTP ${res.status}).`);
      onSent(`"${preview.subject}" sent to ${data.sent ?? count} ${(data.sent ?? count) === 1 ? 'person' : 'people'}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="basis-full pt-4 border-t border-white/5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white text-sm font-medium">{heading}</p>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5" aria-label="Close email composer">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5">
        <div className="space-y-4 min-w-0">
          <div>
            <p className="text-gray-400 text-xs font-medium mb-2">Template</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((t) => {
                const active = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    aria-pressed={active}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-all ${
                      active ? 'bg-[#a3e635]/10 border-[#a3e635]' : 'bg-[#05080f] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <span className={`block text-xs font-semibold ${active ? 'text-white' : 'text-gray-300'}`}>{t.label}</span>
                    <span className="block text-[11px] text-gray-500 mt-0.5">{t.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {editable ? (
            <div>
              <label htmlFor="em-rcpt" className="text-gray-400 text-xs font-medium mb-1.5 flex items-center justify-between">
                <span>Recipients: one per line, name then email</span>
                <span className="text-gray-500">{parsed.list.length}/100</span>
              </label>
              <textarea
                id="em-rcpt"
                value={rcptText}
                onChange={(e) => setRcptText(e.target.value)}
                rows={5}
                className={`${input} resize-y font-mono text-[13px]`}
                placeholder={'Riya Sharma, riya@example.com\nArjun Mehta <arjun@example.com>\nteam@company.com'}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Each person gets "Hi &lt;their first name&gt;". No name on a line: "Hi there". Paste straight from a sheet (name and email columns).
                {parsed.bad > 0 && <span className="text-amber-400"> {parsed.bad} line{parsed.bad > 1 ? 's' : ''} without an email skipped.</span>}
                {parsed.over > 0 && <span className="text-amber-400"> {parsed.over} over the limit of 100 skipped.</span>}
              </p>
            </div>
          ) : (
            <GuestInput guests={to} setGuests={setTo} max={100} />
          )}

          {editable && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="em-title" className="text-gray-400 text-xs font-medium mb-1.5 block">Meeting is a… (used in the text)</label>
                <input id="em-title" value={eTitle} onChange={(e) => setETitle(e.target.value.slice(0, MAX_FIELD.title))} className={input} placeholder="interview, partnership call…" />
              </div>
              <div>
                <label htmlFor="em-date" className="text-gray-400 text-xs font-medium mb-1.5 block">Date (optional)</label>
                <input id="em-date" type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} className={`${input} [color-scheme:dark]`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="em-time" className="text-gray-400 text-xs font-medium mb-1.5 block">Time (IST)</label>
                  <input id="em-time" type="time" value={eTime} onChange={(e) => setETime(e.target.value)} className={`${input} [color-scheme:dark]`} />
                </div>
                <div>
                  <label htmlFor="em-len" className="text-gray-400 text-xs font-medium mb-1.5 block">Length</label>
                  <select id="em-len" value={eLen} onChange={(e) => setELen(e.target.value)} className={input}>
                    {DURATIONS.map((n) => <option key={n} value={n}>{n} min</option>)}
                  </select>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="em-meet" className="text-gray-400 text-xs font-medium mb-1.5 block">Google Meet link (optional)</label>
                <input id="em-meet" value={eMeet} onChange={(e) => setEMeet(e.target.value.slice(0, MAX_FIELD.link))} className={input} placeholder="https://meet.google.com/…" />
                {!meetOk && <p className="text-amber-400 text-[11px] mt-1">Use a full https:// link.</p>}
              </div>
            </div>
          )}

          {info.isCustom && (
            <>
              <div>
                <label htmlFor="em-subject" className="text-gray-400 text-xs font-medium mb-1.5 block">Subject</label>
                <input id="em-subject" value={subject} onChange={(e) => setSubject(e.target.value.slice(0, MAX_FIELD.subject))} className={input} placeholder="What is this email about?" />
              </div>
              <div>
                <label htmlFor="em-body" className="text-gray-400 text-xs font-medium mb-1.5 block">Message</label>
                <textarea id="em-body" value={body} onChange={(e) => setBody(e.target.value.slice(0, MAX_FIELD.body))} rows={6} className={`${input} resize-y`} placeholder="Write your message. Leave an empty line between paragraphs." />
              </div>
            </>
          )}

          {info.usesBookingLink && (
            <div>
              <label htmlFor="em-link" className="text-gray-400 text-xs font-medium mb-1.5 block">Booking link (optional)</label>
              <input id="em-link" value={bookingLink} onChange={(e) => setBookingLink(e.target.value.trim().slice(0, MAX_FIELD.link))} className={input} placeholder="https://cyberhx.com/meet/…" />
              {!bookingOk && <p className="text-amber-400 text-[11px] mt-1">Use a full https:// link.</p>}
            </div>
          )}

          <div>
            <label htmlFor="em-note" className="text-gray-400 text-xs font-medium mb-1.5 block">Personal note (optional)</label>
            <textarea id="em-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, MAX_FIELD.note))} rows={3} className={`${input} resize-y`} placeholder="Shown in its own highlighted box" />
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-start gap-1.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          <button
            onClick={send}
            disabled={!canSend}
            className="px-5 py-2.5 bg-[#a3e635] text-[#05080f] font-bold rounded-xl hover:bg-[#bef264] disabled:opacity-50 flex items-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send to {count} {count === 1 ? 'person' : 'people'}
          </button>
          {count > 1 && <p className="text-[11px] text-gray-600 -mt-2">Each person gets their own copy and cannot see the others.</p>}
        </div>

        <div className="min-w-0">
          <p className="text-gray-400 text-xs font-medium mb-2 flex items-center gap-1.5">
            <Check size={12} className="text-[#a3e635]" /> Preview
          </p>
          <div className="rounded-xl border border-white/10 overflow-hidden bg-[#05070c]">
            <div className="px-4 py-2.5 border-b border-white/10 text-xs">
              <span className="text-gray-500">Subject: </span>
              <span className="text-white">{preview.subject}</span>
            </div>
            <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="w-full h-[560px] bg-[#05070c]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;
