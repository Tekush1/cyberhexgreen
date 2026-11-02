import React, { useMemo, useState } from 'react';
import { Send, Loader2, X, Check, AlertTriangle, Trophy } from 'lucide-react';
import { TEMPLATES, MAX_FIELD, renderEmail, type TemplateId } from '../../../shared/emailTemplates';
import { TOKEN_KEY } from './adminApi';
import { GuestInput } from './GuestInput';
import { VOUCHER_EVENTS } from './TeamVouchers';

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
  /** On a booked meeting: opens the real Reschedule (moves the calendar event too). */
  onReschedule?: () => void;
}> = ({ target, onClose, onSent, initialTemplate = 'confirmation', initialBookingLink = '', editable = false, heading = 'Send an email', onReschedule }) => {
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
  // Voucher template
  const [vEvent, setVEvent] = useState<string>(VOUCHER_EVENTS[0].name);
  const [vTier, setVTier] = useState<10 | 50>(10);
  const [vDisc, setVDisc] = useState<Record<10 | 50, number>>({ 10: 100, 50: 80 });
  const [vTeam, setVTeam] = useState('');
  const [vRank, setVRank] = useState('');
  const [vCode, setVCode] = useState('');
  const [vProduct, setVProduct] = useState('CAPT certification');
  const [vExpires, setVExpires] = useState('');
  const [vRedeem, setVRedeem] = useState('https://pentestlab.cyberhx.com');
  const isVoucher = template === 'team_voucher';

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
  const rankNum = Math.max(0, Math.min(10000, Math.round(Number(vRank) || 0)));
  const vTeamVars = { team: vTeam.trim(), rank: rankNum || undefined, tier: vTier, code: vCode.trim().replace(/[^\w-]/g, ''), discount: vDisc[vTier] };
  const vShared = { event: vEvent, product: vProduct.trim() || 'CAPT certification', expires: vExpires, redeemUrl: vRedeem.trim(), note };
  const preview = useMemo(
    () => (isVoucher
      ? renderEmail('team_voucher', { ...vShared, ...vTeamVars, team: vTeamVars.team || 'Your team', code: vTeamVars.code || 'CODE-HERE' })
      : renderEmail(template, vars)),
    [template, to.length, target, note, bookingLink, subject, body, parsed, eTitle, eDate, eTime, eLen, eMeet, editable, vEvent, vTier, vDisc, vTeam, vRank, vCode, vProduct, vExpires, vRedeem], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const bookingOk = !bookingLink || /^https:\/\/\S+$/i.test(bookingLink);
  const meetOk = !editable || !eMeet.trim() || /^https:\/\/\S+$/i.test(eMeet.trim());
  const redeemOk = !isVoucher || !vRedeem.trim() || /^https:\/\/\S+$/i.test(vRedeem.trim());
  const canSend = !busy && count > 0 && bookingOk && meetOk && redeemOk && (!info.isCustom || (subject.trim() && body.trim())) && (!isVoucher || (!!vTeamVars.team && !!vTeamVars.code));

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` },
        body: JSON.stringify(
          isVoucher
            ? { template, recipients: (editable ? parsed.list.map((r) => r.email) : to).map((email) => ({ email, name: vTeamVars.team, vars: vTeamVars })), vars: vShared }
            : editable ? { template, recipients: parsed.list, vars } : { template, to, vars },
        ),
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
              {TEMPLATES.filter((t) => !t.auto && (editable || !t.standaloneOnly)).map((t) => {
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

          {template === 'reschedule' && onReschedule && (
            <div role="note" className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">
              This template only sends an email; the meeting stays where it is. To really move it (calendar updated for everyone,
              plus the email), use <b>Reschedule</b>.
              <button type="button" onClick={onReschedule} className="mt-2 block rounded-lg bg-[#a3e635] px-3 py-1.5 text-xs font-semibold text-[#05080f]">
                Open Reschedule
              </button>
            </div>
          )}

          {editable ? (
            <div>
              <label htmlFor="em-rcpt" className="text-gray-400 text-xs font-medium mb-1.5 flex items-center justify-between">
                <span>{isVoucher ? 'Team member emails: one per line' : 'Recipients: one per line, name then email'}</span>
                <span className="text-gray-500">{parsed.list.length}/100</span>
              </label>
              <textarea
                id="em-rcpt"
                value={rcptText}
                onChange={(e) => setRcptText(e.target.value)}
                rows={5}
                className={`${input} resize-y font-mono text-[13px]`}
                placeholder={isVoucher ? 'captain@example.com\nmember@example.com' : 'Riya Sharma, riya@example.com\nArjun Mehta <arjun@example.com>\nteam@company.com'}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {isVoucher ? "Every member gets their own copy, addressed to the team, with the team's code." : 'Each person gets "Hi <their first name>". No name on a line: "Hi there". Paste straight from a sheet (name and email columns).'}
                {parsed.bad > 0 && <span className="text-amber-400"> {parsed.bad} line{parsed.bad > 1 ? 's' : ''} without an email skipped.</span>}
                {parsed.over > 0 && <span className="text-amber-400"> {parsed.over} over the limit of 100 skipped.</span>}
              </p>
            </div>
          ) : (
            <GuestInput guests={to} setGuests={setTo} max={100} />
          )}

          {isVoucher && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#05080f]/60 p-4">
              <div>
                <p className="text-gray-400 text-xs font-medium mb-2">Event</p>
                <div role="radiogroup" aria-label="Event" className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-black/30 p-1">
                  {VOUCHER_EVENTS.map((e) => {
                    const on = vEvent === e.name;
                    return (
                      <button key={e.id} type="button" role="radio" aria-checked={on} onClick={() => setVEvent(e.name)}
                        className={`rounded-lg px-3 py-2 text-left transition ${on ? 'bg-white/[0.12] text-white' : 'text-gray-400 hover:text-white'}`}>
                        <span className="block text-xs font-semibold">{e.short}</span>
                        <span className="block text-[11px] text-gray-500">{e.year}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium mb-2">Placed in</p>
                <div role="radiogroup" aria-label="Tier" className="grid grid-cols-2 gap-1.5">
                  {([10, 50] as const).map((t) => {
                    const on = vTier === t;
                    return (
                      <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setVTier(t)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${on ? (t === 10 ? 'border-[#f5c542] bg-[#f5c542]/10' : 'border-[#a3e635] bg-[#a3e635]/10') : 'border-white/10 hover:border-white/25'}`}>
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${on ? 'text-white' : 'text-gray-300'}`}>{t === 10 && <Trophy size={12} className="text-[#f5c542]" />}Top {t}</span>
                        <span className="block text-[11px] text-gray-500 mt-0.5">{vDisc[t] >= 100 ? 'Free' : `${vDisc[t]}% off`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid sm:grid-cols-[1fr_6rem_6.5rem] gap-3">
                <div>
                  <label htmlFor="em-v-team" className="text-gray-400 text-xs font-medium mb-1.5 block">Team name</label>
                  <input id="em-v-team" value={vTeam} onChange={(e) => setVTeam(e.target.value.slice(0, MAX_FIELD.team))} className={input} placeholder="Jokers" />
                </div>
                <div>
                  <label htmlFor="em-v-rank" className="text-gray-400 text-xs font-medium mb-1.5 block">Rank</label>
                  <input id="em-v-rank" type="number" min={1} value={vRank} onChange={(e) => setVRank(e.target.value)} className={input} placeholder={vTier === 10 ? '1–10' : '11–50'} />
                </div>
                <div>
                  <label htmlFor="em-v-disc" className="text-gray-400 text-xs font-medium mb-1.5 block">Discount</label>
                  <div className="relative">
                    <input id="em-v-disc" type="number" min={1} max={100} value={vDisc[vTier]} onChange={(e) => setVDisc({ ...vDisc, [vTier]: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} className={`${input} pr-8`} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="em-v-code" className="text-gray-400 text-xs font-medium mb-1.5 block">Voucher code</label>
                  <input id="em-v-code" value={vCode} onChange={(e) => setVCode(e.target.value.replace(/[^\w-]/g, '').slice(0, MAX_FIELD.code))} className={`${input} font-mono tracking-wider`} placeholder="CAPT-TOP10-AB12" />
                </div>
                <div>
                  <label htmlFor="em-v-product" className="text-gray-400 text-xs font-medium mb-1.5 block">Voucher for</label>
                  <input id="em-v-product" value={vProduct} onChange={(e) => setVProduct(e.target.value.slice(0, MAX_FIELD.product))} className={input} />
                </div>
                <div>
                  <label htmlFor="em-v-exp" className="text-gray-400 text-xs font-medium mb-1.5 block">Valid until (optional)</label>
                  <input id="em-v-exp" type="date" value={vExpires} onChange={(e) => setVExpires(e.target.value)} className={`${input} [color-scheme:dark]`} />
                </div>
                <div>
                  <label htmlFor="em-v-url" className="text-gray-400 text-xs font-medium mb-1.5 block">Redeem link</label>
                  <input id="em-v-url" value={vRedeem} onChange={(e) => setVRedeem(e.target.value.slice(0, MAX_FIELD.link))} className={input} />
                  {!redeemOk && <p className="text-amber-400 text-[11px] mt-1">Use a full https:// link.</p>}
                </div>
              </div>
              <p className="text-[11px] text-gray-500">Sending a whole leaderboard at once? Use <b className="text-gray-300">Team vouchers</b> below.</p>
            </div>
          )}

          {editable && !isVoucher && (
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
            <textarea id="em-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, MAX_FIELD.note))} rows={3} className={`${input} resize-y`} placeholder={isVoucher ? 'Default: Enter the code at checkout. It belongs to your team, so keep it private.' : 'Shown in its own highlighted box'} />
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
