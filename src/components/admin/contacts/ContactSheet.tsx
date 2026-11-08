import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, Mail, Trash2 } from 'lucide-react';
import { sbInsert, sbRows, sbWrite } from '../mailingApi';
import { CATEGORIES, CATEGORY, CSTATUS, CSTATUSES, Sheet, btnBlue, btnGlass, field, fmtDate, type Contact } from './shared';

const EMPTY: Partial<Contact> = { name: '', org: '', role: '', email: '', phone: '', category: 'college', city: '', state: '', country: 'India', website: '', source: '', tags: [], notes: '', status: 'new' };

function L({ t, children }: { t: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1 min-w-0"><span className="text-[12px] text-white/50">{t}</span>{children}</label>;
}

interface Sent { id: string; subject: string; sent_at: string; from_email: string | null; sent_by: string | null }
interface Rep { id: string; subject: string; received_at: string }

/** Add a contact (contact = null) or edit one, with every email sent to them and every reply. */
export function ContactSheet({ contact, onClose, onSaved, onDeleted, onEmail }: {
  contact: Contact | null; onClose: () => void; onSaved: (c: Contact) => void; onDeleted: (id: string) => void; onEmail: (c: Contact) => void;
}) {
  const [f, setF] = useState<Partial<Contact>>(contact ? { ...contact, email: contact.email || '' } : EMPTY);
  const [tags, setTags] = useState((contact?.tags || []).join(', '));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [replies, setReplies] = useState<Rep[]>([]);

  useEffect(() => {
    if (!contact) return;
    sbRows<Sent>(`outreach_mails?contact_id=eq.${contact.id}&select=id,subject,sent_at,from_email,sent_by&order=sent_at.desc&limit=50`)
      .then((r) => setSent(r.rows)).catch(() => setSent([]));
    if (contact.email) {
      sbRows<Rep>(`outreach_replies?from_email=eq.${encodeURIComponent(contact.email)}&select=id,subject,received_at&order=received_at.desc&limit=50`)
        .then((r) => setReplies(r.rows)).catch(() => setReplies([]));
    }
  }, [contact]);

  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    const email = String(f.email || '').trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('That email address does not look right.'); return; }
    if (!email && !String(f.name || '').trim() && !String(f.org || '').trim()) { setErr('Add at least a name, an organisation or an email.'); return; }
    setBusy(true); setErr('');
    const row = {
      name: String(f.name || '').trim(), org: String(f.org || '').trim(), role: String(f.role || '').trim(), email: email || null,
      phone: String(f.phone || '').trim(), category: f.category || 'other', city: String(f.city || '').trim(), state: String(f.state || '').trim(),
      country: String(f.country || '').trim() || 'India', website: String(f.website || '').trim(), source: String(f.source || '').trim(),
      tags: tags.split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean), notes: String(f.notes || '').trim(), status: f.status || 'new',
    };
    try {
      if (contact) {
        await sbWrite('PATCH', `outreach_contacts?id=eq.${contact.id}`, row);
        onSaved({ ...contact, ...row, updated_at: new Date().toISOString() } as Contact);
      } else {
        onSaved(await sbInsert<Contact>('outreach_contacts', row));
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Could not save.';
      setErr(/duplicate|unique/i.test(m) ? 'Someone with this email is already in Contacts. Search for it instead.' : m);
      setBusy(false);
    }
  };

  const del = async () => {
    if (!contact) return;
    setBusy(true);
    try { await sbWrite('DELETE', `outreach_contacts?id=eq.${contact.id}`); onDeleted(contact.id); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete.'); setBusy(false); }
  };

  return (
    <Sheet title={contact ? (contact.name || contact.org || contact.email || 'Contact') : 'New contact'} onClose={onClose} busy={busy}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {contact && !confirmDel && <button onClick={() => setConfirmDel(true)} disabled={busy} className={`${btnGlass} text-[#FF453A]`}><Trash2 size={15} />Delete</button>}
          {confirmDel && (
            <span className="flex items-center gap-2 text-[13px] text-white/70">Delete for good?
              <button onClick={del} disabled={busy} className={`${btnGlass} text-[#FF453A]`}>Yes, delete</button>
              <button onClick={() => setConfirmDel(false)} className={btnGlass}>No</button>
            </span>
          )}
          {contact?.email && !confirmDel && <button onClick={() => onEmail(contact)} className={btnGlass}><Mail size={15} />Email</button>}
          <span className="flex-1" />
          {err && <span className="text-[13px] text-[#FF453A] w-full sm:w-auto">{err}</span>}
          <button onClick={save} disabled={busy} className={btnBlue}>{busy && <Loader2 size={15} className="animate-spin" />}{contact ? 'Save' : 'Add contact'}</button>
        </div>
      }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <L t="Name"><input id="c-name" className={field} value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Dr. Priya Sharma" /></L>
        <L t="Role"><input id="c-role" className={field} value={f.role || ''} onChange={(e) => set('role', e.target.value)} placeholder="Faculty coordinator" /></L>
        <L t="Organisation"><input id="c-org" className={field} value={f.org || ''} onChange={(e) => set('org', e.target.value)} placeholder="IIT Kanpur · Techkriti" /></L>
        <L t="Category">
          <select id="c-cat" className={field} value={f.category} onChange={(e) => set('category', e.target.value as Contact['category'])}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY[c].label}</option>)}
          </select>
        </L>
        <L t="Email"><input id="c-email" type="email" className={field} value={f.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="name@college.ac.in" /></L>
        <L t="Phone"><input id="c-phone" className={field} value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="+91 …" /></L>
        <L t="City"><input id="c-city" className={field} value={f.city || ''} onChange={(e) => set('city', e.target.value)} /></L>
        <L t="State"><input id="c-state" className={field} value={f.state || ''} onChange={(e) => set('state', e.target.value)} /></L>
        <L t="Country"><input id="c-country" className={field} value={f.country || ''} onChange={(e) => set('country', e.target.value)} /></L>
        <L t="Status">
          <select id="c-status" className={field} value={f.status} onChange={(e) => set('status', e.target.value as Contact['status'])}>
            {CSTATUSES.map((s) => <option key={s} value={s}>{CSTATUS[s].label}</option>)}
          </select>
        </L>
        <L t="Website"><input id="c-web" className={field} value={f.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></L>
        <L t="Where we found them"><input id="c-src" className={field} value={f.source || ''} onChange={(e) => set('source', e.target.value)} placeholder="Unstop, LinkedIn, college site…" /></L>
        <div className="sm:col-span-2"><L t="Tags (comma separated)"><input id="c-tags" className={field} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="space-ctf, north, techfest" /></L></div>
        <div className="sm:col-span-2"><L t="Notes"><textarea id="c-notes" rows={3} className={field} value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} /></L></div>
      </div>

      {contact && (
        <div className="mt-5 space-y-2">
          <h4 className="text-[13px] font-semibold text-white/70">Emails · {contact.mail_count} sent{replies.length ? ` · ${replies.length} replies` : ''}</h4>
          {sent === null ? <Loader2 size={16} className="animate-spin text-white/40" /> : !sent.length && !replies.length ? (
            <p className="text-[13px] text-white/40">Nothing sent yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] rounded-xl bg-white/[0.03] border border-white/[0.06]">
              {[...sent.map((m) => ({ k: `s${m.id}`, at: m.sent_at, t: m.subject, who: `Sent by ${m.sent_by || m.from_email || 'team'}`, c: '#0A84FF' })),
                ...replies.map((r) => ({ k: `r${r.id}`, at: r.received_at, t: r.subject, who: 'Reply (in Outreach → Inbox)', c: '#FF9F0A' }))]
                .sort((a, b) => b.at.localeCompare(a.at)).map((x) => (
                  <li key={x.k} className="flex items-start gap-3 px-3 py-2.5">
                    <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: x.c }} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[14px] text-white">{x.t || '(no subject)'}</span>
                      <span className="text-[12px] text-white/45">{x.who} · {fmtDate(x.at)}</span></span>
                  </li>
                ))}
            </ul>
          )}
          <p className="text-[12px] text-white/35">Last change by {contact.updated_by || '—'} · {fmtDate(contact.updated_at)}</p>
        </div>
      )}
    </Sheet>
  );
}
