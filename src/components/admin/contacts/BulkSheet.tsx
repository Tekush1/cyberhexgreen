import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react';
import { sbRpc } from '../mailingApi';
import { TOKEN_KEY } from '../adminApi';
import type { Person } from '../OutreachTeam';
import { FIELDS, NO_MAIL, Sheet, TEMPLATES, btnBlue, btnGlass, field, fill, type Contact } from './shared';

const PER_MINUTE = 2; // outreach_queue pace (api/voucher-queue.ts -> sendOutreach)
const eta = (n: number) => {
  const m = Math.ceil(n / PER_MINUTE);
  return m < 60 ? `about ${m} min` : `about ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
};

/** One email to many contacts, sent slowly from the server as an outreach person (CC + reply-to mail@cyberhx.com). */
export function BulkSheet({ contacts, people, isOwner, myEmail, onClose, onQueued }: {
  contacts: Contact[]; people: Person[]; isOwner: boolean; myEmail: string; onClose: () => void; onQueued: (msg: string) => void;
}) {
  const [tpl, setTpl] = useState(TEMPLATES[0].id);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [name, setName] = useState('');
  const [as, setAs] = useState(people.length === 1 ? people[0].user_id : '');
  const [skipMailed, setSkipMailed] = useState(true);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState<'' | 'test' | 'queue'>('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const sender = people.find((p) => p.user_id === as) || (!isOwner ? people[0] : undefined);
  const groups = useMemo(() => {
    const noEmail = contacts.filter((c) => !c.email);
    const opted = contacts.filter((c) => c.email && NO_MAIL.includes(c.status));
    const mailed = contacts.filter((c) => c.email && !NO_MAIL.includes(c.status) && skipMailed && c.mail_count > 0);
    const go = contacts.filter((c) => c.email && !NO_MAIL.includes(c.status) && !(skipMailed && c.mail_count > 0));
    return { noEmail, opted, mailed, go };
  }, [contacts, skipMailed]);
  const sample = groups.go[Math.min(i, Math.max(0, groups.go.length - 1))];
  const sName = sender?.name || 'Cyber HX';
  const finalSubject = subject.split('{sender}').join(sName);
  const finalBody = body.split('{sender}').join(sName);

  const pick = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTpl(id); setSubject(t.subject); setBody(t.body);
  };
  const insert = (tok: string) => {
    const el = bodyRef.current;
    if (!el) { setBody((b) => b + tok); return; }
    const s = el.selectionStart ?? body.length, e = el.selectionEnd ?? body.length;
    setBody(body.slice(0, s) + tok + body.slice(e));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + tok.length, s + tok.length); });
  };

  const check = () => {
    if (!sender) return 'Choose who the email goes out as.';
    if (!subject.trim()) return 'Write a subject.';
    if (!body.trim()) return 'Write the message.';
    if (/\{(?!first_name\}|name\}|org\}|role\}|city\}|sender\})[a-z_]+\}/i.test(subject + body)) return 'There is a {field} we don\'t know. Use only the ones under the message.';
    return '';
  };

  const test = async () => {
    const bad = check();
    if (bad) { setErr(bad); return; }
    if (!myEmail) { setErr('Could not find your own email address for the test.'); return; }
    setBusy('test'); setErr(''); setNote('');
    try {
      const c = sample || contacts[0];
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', to: [myEmail], subject: `[TEST] ${fill(finalSubject, c, sName)}`, body: fill(finalBody, c, sName), ...(isOwner && sender ? { as: sender.user_id } : {}) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || `Test failed (${res.status}).`);
      setNote(`Test sent to ${myEmail} as ${d.from || sender?.send_as}.`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Test failed.'); }
    setBusy('');
  };

  const queue = async () => {
    const bad = check();
    if (bad) { setErr(bad); return; }
    if (!groups.go.length) { setErr('Nobody in this list can get the email. See the counts above.'); return; }
    setBusy('queue'); setErr('');
    try {
      const r = await sbRpc<{ batch_id: number | null; queued: number; no_email: number; opted_out: number; waiting: number; mailed_before: number }>('contacts_queue_send', {
        p_ids: contacts.map((c) => c.id), p_subject: finalSubject, p_body: finalBody, p_as: isOwner ? sender!.user_id : null,
        p_name: name.trim(), p_skip_mailed: skipMailed,
      });
      const extra = [r.waiting ? `${r.waiting} already waiting in another bulk email` : '', r.no_email ? `${r.no_email} without email` : '',
        r.opted_out ? `${r.opted_out} marked skip / bounced / not interested` : '', r.mailed_before ? `${r.mailed_before} emailed before` : ''].filter(Boolean).join(' · ');
      if (!r.queued) { setErr(`Nothing was queued. ${extra}`); setBusy(''); return; }
      onQueued(`${r.queued} emails queued as ${sender!.send_as}, done in ${eta(r.queued)}${extra ? ` · skipped: ${extra}` : ''}`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not queue the emails.'); setBusy(''); }
  };

  return (
    <Sheet title={`Email ${contacts.length} contact${contacts.length === 1 ? '' : 's'}`} onClose={onClose} busy={busy === 'queue'} wide
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-white/60">{groups.go.length} will get it{groups.go.length ? ` · ${eta(groups.go.length)}` : ''}</span>
          <span className="flex-1" />
          {err && <span className="text-[13px] text-[#FF453A] w-full sm:w-auto">{err}</span>}
          {note && <span className="text-[13px] text-[#30D158] w-full sm:w-auto">{note}</span>}
          <button onClick={test} disabled={!!busy} className={btnGlass}>{busy === 'test' && <Loader2 size={15} className="animate-spin" />}Send me a test</button>
          <button onClick={queue} disabled={!!busy || !groups.go.length} className={btnBlue}>
            {busy === 'queue' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}Queue {groups.go.length} emails
          </button>
        </div>
      }>
      <div className="space-y-4">
        {/* who gets it */}
        <div className="flex flex-wrap gap-2 text-[12.5px]">
          <span className="rounded-full bg-[#30D158]/15 text-[#30D158] px-2.5 py-1">{groups.go.length} will get it</span>
          {groups.noEmail.length > 0 && <span className="rounded-full bg-white/[0.07] text-white/60 px-2.5 py-1">{groups.noEmail.length} no email</span>}
          {groups.opted.length > 0 && <span className="rounded-full bg-white/[0.07] text-white/60 px-2.5 py-1">{groups.opted.length} skip / bounced / not interested</span>}
          {groups.mailed.length > 0 && <span className="rounded-full bg-white/[0.07] text-white/60 px-2.5 py-1">{groups.mailed.length} emailed before</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[12px] text-white/50">Goes out as</span>
            {isOwner ? (
              <select id="bulk-as" className={field} value={as} onChange={(e) => setAs(e.target.value)}>
                <option value="">Choose a person…</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name} · {p.send_as}</option>)}
              </select>
            ) : <div className={`${field} text-white/70`}>{sender ? `${sender.name} · ${sender.send_as}` : 'Your address is not set up yet'}</div>}
          </label>
          <label className="flex flex-col gap-1"><span className="text-[12px] text-white/50">Template</span>
            <select id="bulk-tpl" className={field} value={tpl} onChange={(e) => pick(e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1"><span className="text-[12px] text-white/50">Name for History (optional)</span>
            <input id="bulk-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Space CTF · colleges · Nov" />
          </label>
        </div>
        {isOwner && !people.length && <p className="text-[13px] text-[#FF9F0A]">Nobody has a sending address yet. Add one in Outreach → Team first.</p>}

        <label className="flex flex-col gap-1"><span className="text-[12px] text-white/50">Subject</span>
          <input id="bulk-subject" className={field} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        </label>
        <label className="flex flex-col gap-1"><span className="text-[12px] text-white/50">Message (plain text; links work)</span>
          <textarea id="bulk-body" ref={bodyRef} rows={12} className={`${field} text-[14px] leading-relaxed`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={7500} />
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-white/45 mr-1">Insert:</span>
          {FIELDS.map((t) => <button key={t} type="button" onClick={() => insert(t)} className="rounded-full bg-white/[0.07] border border-white/[0.08] px-2.5 py-1 font-mono text-[12px] text-white/75 hover:bg-white/[0.12]">{t}</button>)}
        </div>
        <label className="flex items-center gap-2 text-[14px] text-white/80">
          <input id="bulk-skip" type="checkbox" checked={skipMailed} onChange={(e) => setSkipMailed(e.target.checked)} className="h-4 w-4 accent-[#0A84FF]" />
          Skip people we've already emailed (untick for a follow-up)
        </label>

        {/* preview */}
        {sample && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <span className="text-[12px] text-white/45">Preview for</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-white">{sample.name || sample.org} · {sample.email}</span>
              <button aria-label="Previous" disabled={i <= 0} onClick={() => setI((x) => Math.max(0, x - 1))} className="rounded-full p-1 text-white/60 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span className="text-[12px] text-white/45 tabular-nums">{Math.min(i, groups.go.length - 1) + 1}/{groups.go.length}</span>
              <button aria-label="Next" disabled={i >= groups.go.length - 1} onClick={() => setI((x) => Math.min(groups.go.length - 1, x + 1))} className="rounded-full p-1 text-white/60 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-[12px] text-white/45">From {sender ? `${sender.name} from CyberHx <${sender.send_as}>` : '—'} · CC and replies to mail@cyberhx.com</p>
              <p className="text-[15px] font-semibold text-white">{fill(finalSubject, sample, sName)}</p>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/80">{fill(finalBody, sample, sName)}</p>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
