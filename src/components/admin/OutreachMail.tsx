import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CalendarPlus, Check, Copy, Link2, Loader2, Trash2, Video, X } from 'lucide-react';
import { TOKEN_KEY } from './adminApi';

/* =============================================================
   Admin → Outreach, part 2: write & send pitch emails, see what was sent (and whether it was opened),
   and the CTF hosting calls booked through Outreach links.
   Server: api/outreach.ts (send + status), api/interview.ts (CTF booking links, scoped for this role).
============================================================= */

export interface OutMail {
  id: string; lead_id: string | null; to_emails: string[]; subject: string; body: string; booking_link: string | null;
  message_ids: string[]; sent_by: string | null; sent_at: string;
}
export interface Reply {
  id: string; lead_id: string | null; from_email: string; from_name: string; subject: string; body: string;
  message_id: string | null; received_at: string; read_at: string | null;
}
export interface LeadLite { id: string; event: string; organizer: string; emails: string; status: string }

const glass = 'bg-white/[0.045] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_40px_-12px_rgba(0,0,0,0.6)]';
const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const when = (d: string | null | undefined) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const whenLong = (d: string) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Calls our own /api/* with the signed-in staff session. */
export async function api<T = any>(path: string, body?: object): Promise<T> {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('Session expired. Please sign in again.');
  if (!res.ok) throw new Error(d?.error || `Request failed (${res.status}).`);
  return d as T;
}

/* ---------- delivery status (Resend) ---------- */
const STATE: Record<string, { label: string; color: string }> = {
  sent: { label: 'Sent', color: '#98989D' },
  delivered: { label: 'Delivered', color: '#0A84FF' },
  opened: { label: 'Opened', color: '#30D158' },
  clicked: { label: 'Clicked', color: '#30D158' },
  bounced: { label: 'Bounced', color: '#FF453A' },
  complained: { label: 'Marked spam', color: '#FF453A' },
  delivery_delayed: { label: 'Delayed', color: '#FF9F0A' },
  unknown: { label: 'Sent', color: '#98989D' },
};
const statusCache = new Map<string, string>();

export function useMailStatus(ids: string[]) {
  const [, bump] = useState(0);
  const key = ids.filter((i) => !statusCache.has(i)).slice(0, 25).join(',');
  useEffect(() => {
    if (!key) return;
    let alive = true;
    api<{ status: Record<string, string> }>(`/api/outreach?status=${key}`)
      .then((d) => { Object.entries(d.status || {}).forEach(([k, v]) => statusCache.set(k, v)); if (alive) bump((n) => n + 1); })
      .catch(() => { /* status is a nice-to-have */ });
    return () => { alive = false; };
  }, [key]);
  return (id?: string) => (id ? statusCache.get(id) : undefined);
}

function StateBadge({ s }: { s?: string }) {
  const st = STATE[s || ''] || (s ? { label: s, color: '#98989D' } : null);
  if (!st) return <span className="text-[11.5px] text-white/30">…</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium" style={{ background: `${st.color}22`, color: st.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />{st.label}
    </span>
  );
}

/* =============================================================
   Compose sheet
============================================================= */
export function ComposeSheet({ lead, pitch, onClose, onSent, replyTo }: {
  lead: LeadLite; pitch: { subject: string; body: string };
  onClose: () => void; onSent: (m: OutMail | null) => void;
  /** Answering a reply: send only to that person, in the same thread. */
  replyTo?: Reply;
}) {
  const initial = useMemo(() => (replyTo ? [replyTo.from_email] : lead.emails.split(/[,;\s]+/).filter((e) => EMAIL_RE.test(e))), [lead.emails, replyTo]);
  const [to, setTo] = useState<string[]>(initial);
  const [extra, setExtra] = useState('');
  const [subject, setSubject] = useState(pitch.subject);
  const [body, setBody] = useState(pitch.body);
  const [link, setLink] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = o; };
  }, [onClose, busy]);

  const addExtra = () => {
    const parts = extra.split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    const bad = parts.filter((x) => !EMAIL_RE.test(x));
    if (bad.length) { setErr(`Not an email: ${bad[0]}`); return; }
    setTo((t) => [...new Set([...t, ...parts])].slice(0, 6)); setExtra(''); setErr('');
  };

  /** Makes a one-time CTF-call booking link (uses Call hours) and puts it in the message. */
  const addBookingLink = async () => {
    if (!to.length) { setErr('Add an email address first.'); return; }
    setLinkBusy(true); setErr('');
    try {
      const d = await api<{ link: string }>('/api/interview', {
        action: 'create-link', kind: 'ctf', days: 14,
        name: (lead.organizer.split(',')[0] || lead.event).slice(0, 80),
        ...(to.length > 1 ? { emails: to, hideGuests: false } : { email: to[0] }),
      });
      setLink(d.link);
      const line = `You can pick a time for a quick 15-minute call here: ${d.link}`;
      setBody((b) => (/Would a quick 15-minute call this week work\?/.test(b)
        ? b.replace(/Would a quick 15-minute call this week work\?/, line)
        : b.replace(/\n\nBest,/, `\n\n${line}\n\nBest,`)));
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not create the link.'); }
    setLinkBusy(false);
  };

  const send = async () => {
    if (!to.length) { setErr('Add at least one email address.'); return; }
    if (!subject.trim() || !body.trim()) { setErr('Subject and message are needed.'); return; }
    setBusy(true); setErr('');
    try {
      const d = await api<{ mail: OutMail | null }>('/api/outreach', { action: 'send', leadId: lead.id, to, subject, body, bookingLink: link || undefined, inReplyTo: replyTo?.message_id || undefined });
      onSent(d.mail);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not send.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="compose-h">
      <button aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className={`relative flex w-full sm:max-w-2xl max-h-[94vh] flex-col rounded-t-[28px] sm:rounded-[28px] ${glass} bg-[#1c1c1e]/90`}>
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-white/25 sm:hidden" />
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-white/[0.07]">
          <button onClick={onClose} disabled={busy} className="text-[16px] text-[#0A84FF] disabled:opacity-40">Cancel</button>
          <h3 id="compose-h" className="text-[17px] font-semibold text-white">{replyTo ? 'Reply' : 'New Message'}</h3>
          <button onClick={send} disabled={busy} aria-label="Send"
            className="h-9 rounded-full bg-[#0A84FF] px-4 text-[15px] font-semibold text-white disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition">
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}Send
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* To */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.07] py-2.5">
            <span className="text-[15px] text-white/45 mr-1">To:</span>
            {to.map((e) => (
              <span key={e} className="inline-flex items-center gap-1 rounded-full bg-[#0A84FF]/20 pl-2.5 pr-1 py-0.5 text-[13.5px] text-[#64B5FF]">
                {e}
                <button aria-label={`Remove ${e}`} onClick={() => setTo((t) => t.filter((x) => x !== e))} className="rounded-full p-0.5 hover:bg-white/10"><X size={12} /></button>
              </span>
            ))}
            <input value={extra} onChange={(e) => setExtra(e.target.value)} onBlur={() => extra.trim() && addExtra()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addExtra(); } }}
              inputMode="email" placeholder={to.length ? '' : 'name@college.edu'} aria-label="Add recipient"
              className="min-w-[140px] flex-1 bg-transparent py-1 text-[15px] text-white placeholder:text-white/25 focus:outline-none" />
          </div>
          <p className="py-1.5 text-[11.5px] text-white/35">All addresses get the same email. Replies come to mail@cyberhx.com and to you.</p>
          {/* Subject */}
          <div className="flex items-center gap-2 border-b border-white/[0.07] py-2.5">
            <span className="text-[15px] text-white/45">Subject:</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 200))} aria-label="Subject"
              className="flex-1 bg-transparent text-[15px] text-white focus:outline-none" />
          </div>
          {/* Body */}
          <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value.slice(0, 8000))} aria-label="Message" rows={14}
            className="mt-3 w-full resize-y bg-transparent text-[15px] leading-relaxed text-white/90 focus:outline-none" />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {link ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#30D158]/15 px-3 py-1.5 text-[13px] text-[#30D158]"><Check size={14} />Booking link added</span>
            ) : (
              <button onClick={addBookingLink} disabled={linkBusy} className={`inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/[0.08] px-3 py-1.5 text-[13px] text-white/85 hover:bg-white/[0.12] ${ring}`}>
                {linkBusy ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} className="text-[#0A84FF]" />}
                Add a link to book a call
              </button>
            )}
            <span className="text-[11.5px] text-white/35">Uses your Call hours. Valid 14 days.</span>
          </div>
          {err && <p role="alert" className="mt-3 rounded-xl bg-[#FF453A]/15 px-3 py-2 text-[14px] text-[#FF9F9A]">{err}</p>}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   Conversation with one lead (inside an opened lead): what we sent + what they replied
============================================================= */
export function MailTimeline({ mails, replies = [], onReply, onRead }: {
  mails: OutMail[]; replies?: Reply[]; onReply?: (r: Reply) => void; onRead?: (r: Reply) => void;
}) {
  const status = useMailStatus(mails.map((m) => m.message_ids[0]).filter(Boolean));
  const [openId, setOpenId] = useState<string | null>(null);
  type Item = { kind: 'out'; at: string; m: OutMail } | { kind: 'in'; at: string; r: Reply };
  const items: Item[] = [
    ...mails.map((m) => ({ kind: 'out' as const, at: m.sent_at, m })),
    ...replies.map((r) => ({ kind: 'in' as const, at: r.received_at, r })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-white/40">Conversation · {items.length}</p>
      <ul className="space-y-2">
        {items.map((it) => {
          const id = it.kind === 'out' ? it.m.id : it.r.id;
          const isOpen = openId === id || (it.kind === 'in' && !openId && it === items[items.length - 1]);
          if (it.kind === 'out') {
            const m = it.m;
            return (
              <li key={id} className="flex justify-end">
                <button onClick={() => setOpenId(openId === id ? null : id)} aria-expanded={isOpen}
                  className={`max-w-[88%] rounded-2xl rounded-br-md bg-[#0A84FF]/20 border border-[#0A84FF]/25 px-3.5 py-2.5 text-left ${ring}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13.5px] font-medium text-white">{m.subject}</span>
                    <StateBadge s={status(m.message_ids[0])} />
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-white/45">You · {when(m.sent_at)} · to {m.to_emails.join(', ')}</p>
                  {isOpen && <pre className="mt-2 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-white/80">{m.body}</pre>}
                </button>
              </li>
            );
          }
          const r = it.r;
          return (
            <li key={id} className="flex justify-start">
              <div className={`max-w-[88%] rounded-2xl rounded-bl-md bg-white/[0.07] border border-white/[0.08] px-3.5 py-2.5 ${!r.read_at ? 'ring-1 ring-[#0A84FF]/60' : ''}`}>
                <button onClick={() => { setOpenId(openId === id ? null : id); if (!r.read_at) onRead?.(r); }} aria-expanded={isOpen} className={`w-full text-left ${ring}`}>
                  <div className="flex items-center gap-2">
                    {!r.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-[#0A84FF]" aria-label="Unread" />}
                    <span className="truncate text-[13.5px] font-medium text-white">{r.from_name || r.from_email}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-white/45">{when(r.received_at)} · {r.from_email}</p>
                  {isOpen && <pre className="mt-2 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-white/85">{r.body || '(no text)'}</pre>}
                </button>
                {isOpen && onReply && <button onClick={() => onReply(r)} className="mt-2 text-[13.5px] font-medium text-[#0A84FF]">Reply</button>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* =============================================================
   Inbox: replies from organisers (to mail@cyberhx.com), newest first
============================================================= */
export function InboxList({ replies, leads, onReply, onRead, onOpenLead, onMakeLead }: {
  replies: Reply[]; leads: Map<string, LeadLite>;
  onReply: (r: Reply) => void; onRead: (r: Reply) => void; onOpenLead: (id: string) => void; onMakeLead?: (r: Reply) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [only, setOnly] = useState<'all' | 'leads'>('all');
  const hasOther = replies.some((r) => !r.lead_id);
  const list = only === 'leads' ? replies.filter((r) => r.lead_id) : replies;
  if (!replies.length) {
    return <Empty title="No mail yet" text="Email sent to mail@cyberhx.com shows up here. Replies from leads also move the lead to Replied." />;
  }
  return (
    <>
    {hasOther && (
      <div className="mb-3 inline-flex rounded-[11px] bg-white/[0.07] p-[3px] border border-white/[0.06]" role="radiogroup" aria-label="Which mail">
        {([['all', 'All mail'], ['leads', 'From leads']] as const).map(([v, t]) => (
          <button key={v} role="radio" aria-checked={only === v} onClick={() => setOnly(v)}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] ${only === v ? 'bg-white/[0.16] text-white' : 'text-white/55'}`}>{t}</button>
        ))}
      </div>
    )}
    <ul className={`${glass} rounded-[22px] overflow-hidden divide-y divide-white/[0.06]`}>
      {list.map((r) => {
        const lead = r.lead_id ? leads.get(r.lead_id) : undefined;
        const open = openId === r.id;
        return (
          <li key={r.id}>
            <button onClick={() => { setOpenId(open ? null : r.id); if (!r.read_at) onRead(r); }} aria-expanded={open}
              className={`w-full flex gap-3 px-4 sm:px-5 py-3 text-left hover:bg-white/[0.03] ${ring}`}>
              <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${r.read_at ? 'bg-transparent' : 'bg-[#0A84FF]'}`} aria-label={r.read_at ? undefined : 'Unread'} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={`truncate text-[15px] ${r.read_at ? 'text-white/85' : 'font-semibold text-white'}`}>{r.from_name || r.from_email}</span>
                  <span className="shrink-0 text-[12px] text-white/40">{when(r.received_at)}</span>
                </span>
                <span className="block truncate text-[13.5px] text-white/75">{lead ? `${lead.event} · ` : ''}{r.subject || '(no subject)'}</span>
                {!open && <span className="block truncate text-[13px] text-white/40">{r.body.replace(/\s+/g, ' ').slice(0, 140)}</span>}
              </span>
            </button>
            {open && (
              <div className="px-4 sm:px-5 pb-4 sm:pl-[52px]">
                <pre className="whitespace-pre-wrap rounded-xl bg-white/[0.04] p-3 font-sans text-[14px] leading-relaxed text-white/85">{r.body || '(no text)'}</pre>
                <div className="mt-2 flex gap-4">
                  <button onClick={() => onReply(r)} className="text-[14px] font-medium text-[#0A84FF]">Reply</button>
                  {lead
                    ? <button onClick={() => onOpenLead(lead.id)} className="text-[14px] text-[#0A84FF]">Open lead</button>
                    : onMakeLead && <button onClick={() => onMakeLead(r)} className="text-[14px] text-[#0A84FF]">Add as lead</button>}
                  <span className="ml-auto text-[12px] text-white/35">{r.from_email}</span>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
    </>
  );
}

/* =============================================================
   Sent: every outreach email, newest first
============================================================= */
export function SentList({ mails, leads, onOpenLead }: { mails: OutMail[]; leads: Map<string, LeadLite>; onOpenLead: (id: string) => void }) {
  const [limit, setLimit] = useState(30);
  const shown = mails.slice(0, limit);
  const status = useMailStatus(shown.map((m) => m.message_ids[0]).filter(Boolean));
  const [openId, setOpenId] = useState<string | null>(null);
  if (!mails.length) return <Empty title="No emails sent yet" text="Open a lead and tap Email to send the first pitch." />;
  return (
    <>
      <ul className={`${glass} rounded-[22px] overflow-hidden divide-y divide-white/[0.06]`}>
        {shown.map((m) => {
          const lead = m.lead_id ? leads.get(m.lead_id) : undefined;
          return (
            <li key={m.id}>
              <button onClick={() => setOpenId(openId === m.id ? null : m.id)} aria-expanded={openId === m.id} className={`w-full px-4 sm:px-5 py-3 text-left hover:bg-white/[0.03] ${ring}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-semibold text-white">{lead?.event || m.to_emails[0]}</span>
                  <span className="shrink-0 text-[12px] text-white/40">{when(m.sent_at)}</span>
                </div>
                <p className="truncate text-[14px] text-white/80">{m.subject}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] text-white/40">to {m.to_emails.join(', ')}{m.sent_by ? ` · by ${m.sent_by}` : ''}</span>
                  <StateBadge s={status(m.message_ids[0])} />
                </div>
              </button>
              {openId === m.id && (
                <div className="px-4 sm:px-5 pb-4">
                  <pre className="whitespace-pre-wrap rounded-xl bg-white/[0.04] p-3 font-sans text-[13.5px] leading-relaxed text-white/75">{m.body}</pre>
                  {lead && <button onClick={() => onOpenLead(lead.id)} className="mt-2 text-[14px] text-[#0A84FF]">Open lead</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {mails.length > limit && <button onClick={() => setLimit((n) => n + 30)} className="mt-3 w-full text-center text-[14px] text-[#0A84FF]">Show more</button>}
      <p className="mt-3 px-1 text-[12px] text-white/35">Opened shows only when the email service tracks opens. Replies arrive in mail@cyberhx.com and the sender's own inbox.</p>
    </>
  );
}

/* =============================================================
   Calls: CTF hosting calls booked through Outreach links, plus links not booked yet
============================================================= */
interface Booking { eventId: string; name: string; email: string; start: string; end: string; meetLink: string | null; attendees: { email: string; status: string }[] }
interface Pending { code: string; link: string; name: string; email: string; guests: string[]; expiresAt: string; createdAt: string }

export function CallsView({ onToast }: { onToast: (m: string) => void }) {
  const [data, setData] = useState<{ items: Booking[]; pending: Pending[] } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setErr('');
    try {
      const d = await api<{ items: (Booking & { kind?: string })[]; pending: (Pending & { kind?: string })[] }>('/api/interview?admin=list');
      setData({ items: d.items.filter((i) => !i.kind || i.kind === 'ctf'), pending: d.pending.filter((p) => !p.kind || p.kind === 'ctf') });
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load calls.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (code: string) => {
    if (!confirm('Delete this booking link? It will stop working.')) return;
    setBusy(code);
    try { await api('/api/interview', { action: 'delete-link', code }); setData((d) => d && { ...d, pending: d.pending.filter((p) => p.code !== code) }); onToast('Link deleted'); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete.'); }
    setBusy(null);
  };
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); onToast('Link copied'); } catch { onToast('Copy failed'); } };

  if (err) return <p role="alert" className="rounded-2xl bg-[#FF453A]/15 border border-[#FF453A]/30 px-4 py-3 text-[14px] text-[#FF9F9A]">{err}</p>;
  if (!data) return <div className={`${glass} rounded-[22px] p-10 flex justify-center`}><Loader2 className="animate-spin text-white/60" /></div>;

  const now = Date.now();
  const upcoming = data.items.filter((i) => Date.parse(i.end) >= now);
  const past = data.items.filter((i) => Date.parse(i.end) < now).reverse();

  return (
    <div className="space-y-5">
      <Group title={`Upcoming calls · ${upcoming.length}`}>
        {upcoming.length ? upcoming.map((b) => <CallRow key={b.eventId} b={b} />) : <p className="px-4 py-4 text-[14px] text-white/45">No calls booked yet. Add a booking link when you email a lead.</p>}
      </Group>
      <Group title={`Links sent, not booked yet · ${data.pending.length}`}>
        {data.pending.length ? data.pending.map((p) => (
          <div key={p.code} className="flex items-center gap-3 px-4 py-3">
            <Link2 size={16} className="shrink-0 text-white/40" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] text-white">{p.name}</p>
              <p className="truncate text-[12px] text-white/40">{(p.guests || [p.email]).join(', ')} · expires {when(p.expiresAt)}</p>
            </div>
            <button onClick={() => copy(p.link)} aria-label="Copy link" className="rounded-full p-2 text-[#0A84FF] hover:bg-white/5"><Copy size={16} /></button>
            <button onClick={() => del(p.code)} disabled={busy === p.code} aria-label="Delete link" className="rounded-full p-2 text-[#FF453A] hover:bg-white/5 disabled:opacity-40">
              {busy === p.code ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          </div>
        )) : <p className="px-4 py-4 text-[14px] text-white/45">None.</p>}
      </Group>
      {past.length > 0 && <Group title={`Past calls · ${past.length}`}>{past.slice(0, 20).map((b) => <CallRow key={b.eventId} b={b} past />)}</Group>}
      <p className="px-1 text-[12px] text-white/35">Booked calls go on the CyberHx Google Calendar with a Meet link, and both sides get the invite. Set when you're free in Call hours.</p>
    </div>
  );
}

function CallRow({ b, past }: { b: Booking; past?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${past ? 'opacity-55' : ''}`}>
      <div className="w-14 shrink-0 text-center">
        <p className="text-[11px] uppercase text-[#FF453A]">{new Date(b.start).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' })}</p>
        <p className="text-[22px] font-semibold leading-none text-white">{new Date(b.start).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' })}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] text-white">{b.name}</p>
        <p className="truncate text-[12.5px] text-white/45">{whenLong(b.start)} IST · {(b.attendees || []).map((a) => a.email).join(', ') || b.email}</p>
      </div>
      {b.meetLink && !past && (
        <a href={b.meetLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#30D158] px-3 py-1.5 text-[13px] font-semibold text-black">
          <Video size={14} />Join
        </a>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-[12px] font-medium uppercase tracking-wide text-white/40">{title}</h3>
      <div className={`${glass} rounded-[22px] overflow-hidden divide-y divide-white/[0.06]`}>{children}</div>
    </section>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className={`${glass} rounded-[22px] px-6 py-12 text-center`}>
      <p className="text-white font-medium">{title}</p>
      <p className="mt-1 text-[13px] text-white/50">{text}</p>
    </div>
  );
}
