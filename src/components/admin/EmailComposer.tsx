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

const input =
  'w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';

/** Pick a template, edit recipients and a note, preview, send through /api/email (Resend). */
export const EmailComposer: React.FC<{ target: EmailTarget; onClose: () => void; onSent: (msg: string) => void }> = ({ target, onClose, onSent }) => {
  const [template, setTemplate] = useState<TemplateId>('confirmation');
  const [to, setTo] = useState<string[]>(target.emails);
  const [note, setNote] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const info = TEMPLATES.find((t) => t.id === template)!;
  const vars = {
    name: to.length > 1 ? '' : target.name,
    title: target.title,
    start: target.start,
    end: target.end,
    meetLink: target.meetLink,
    bookingLink,
    note,
    subject,
    body,
  };
  const preview = useMemo(() => renderEmail(template, vars), [template, to.length, target, note, bookingLink, subject, body]); // eslint-disable-line react-hooks/exhaustive-deps

  const bookingOk = !bookingLink || /^https:\/\/\S+$/i.test(bookingLink);
  const canSend = !busy && to.length > 0 && bookingOk && (!info.isCustom || (subject.trim() && body.trim()));

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` },
        body: JSON.stringify({ template, to, vars }),
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
      onSent(`"${preview.subject}" sent to ${data.sent ?? to.length} ${(data.sent ?? to.length) === 1 ? 'person' : 'people'}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="basis-full pt-4 border-t border-white/5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white text-sm font-medium">Send an email</p>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5" aria-label="Close email composer">
          <X size={14} />
        </button>
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

          <GuestInput guests={to} setGuests={setTo} max={100} />

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
            Send to {to.length} {to.length === 1 ? 'person' : 'people'}
          </button>
          {to.length > 1 && <p className="text-[11px] text-gray-600 -mt-2">Each person gets their own copy and cannot see the others.</p>}
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
