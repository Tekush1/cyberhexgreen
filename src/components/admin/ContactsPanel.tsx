import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, Loader2, Mail, Plus, Search, Tag, Trash2, Upload, X } from 'lucide-react';
import { downloadCsv, sbRows, sbRpc, sbWrite } from './mailingApi';
import type { Person } from './OutreachTeam';
import { ContactSheet } from './contacts/ContactSheet';
import { ImportSheet } from './contacts/ImportSheet';
import { BulkSheet } from './contacts/BulkSheet';
import { BatchesView } from './contacts/BatchesView';
import {
  CATEGORIES, CATEGORY, CSTATUS, CSTATUSES, Pill, btnBlue, btnGlass, field, fmtDate, glass, initials, ring,
  type CStatus, type Category, type Contact,
} from './contacts/shared';

/* =============================================================
   Admin → Contacts (next to Outreach): an address book of colleges, fests, space centres, sponsors, govt programs…
   Tick any number of them and send one email to all, slowly, from the server, as an outreach person.
   Data: supabase/outreach_contacts.sql. Owners and the Outreach role.
============================================================= */

const PAGE = 1000;
const SHOW = 150;

export function ContactsPanel({ role }: { role: string }) {
  const isOwner = role === 'owner';
  const [view, setView] = useState<'people' | 'bulk'>('people');
  const [all, setAll] = useState<Contact[] | null>(null);
  const [err, setErr] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [myEmail, setMyEmail] = useState('');

  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const [cat, setCat] = useState<Category | ''>('');
  const [st, setSt] = useState<CStatus | ''>('');
  const [tag, setTag] = useState('');
  const [hasEmail, setHasEmail] = useState(false);
  const [limit, setLimit] = useState(SHOW);

  const [sel, setSel] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<Contact | null | 'new'>(null);
  const [importing, setImporting] = useState(false);
  const [bulk, setBulk] = useState<Contact[] | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState('');
  const [tagInput, setTagInput] = useState<string | null>(null);

  const [toast, setToast] = useState('');
  const toastT = useRef<number>();
  const notify = useCallback((m: string) => {
    setToast(m); window.clearTimeout(toastT.current); toastT.current = window.setTimeout(() => setToast(''), 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      const out: Contact[] = [];
      for (let from = 0; ; from += PAGE) {
        const { rows, total } = await sbRows<Contact>('outreach_contacts?select=*&order=org.asc,name.asc,id.asc', { from, to: from + PAGE - 1 });
        out.push(...rows);
        if (out.length >= total || rows.length < PAGE) break;
      }
      setAll(out); setErr('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load contacts.'); setAll((a) => a || []); }
  }, []);

  useEffect(() => {
    load();
    (isOwner ? sbRpc<Person[]>('outreach_team', {}) : sbRows<Person>('outreach_people?select=user_id,name,send_as').then((r) => r.rows))
      .then(setPeople).catch(() => setPeople([]));
    sbRpc<{ email?: string }>('staff_me', {}).then((m) => setMyEmail(String(m?.email || ''))).catch(() => {});
  }, [load, isOwner]);

  const tags = useMemo(() => [...new Set((all || []).flatMap((c) => c.tags))].sort(), [all]);
  const known = useMemo(() => new Set((all || []).map((c) => c.email || '').filter(Boolean)), [all]);
  const catCount = useMemo(() => {
    const m: Partial<Record<Category, number>> = {};
    (all || []).forEach((c) => { m[c.category] = (m[c.category] || 0) + 1; });
    return m;
  }, [all]);

  const shown = useMemo(() => {
    const words = dq.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (all || []).filter((c) => (!cat || c.category === cat) && (!st || c.status === st) && (!tag || c.tags.includes(tag)) && (!hasEmail || !!c.email)
      && (!words.length || words.every((w) => `${c.name} ${c.org} ${c.role} ${c.email || ''} ${c.city} ${c.state} ${c.country} ${c.tags.join(' ')} ${c.notes}`.toLowerCase().includes(w))));
  }, [all, dq, cat, st, tag, hasEmail]);
  useEffect(() => setLimit(SHOW), [dq, cat, st, tag, hasEmail]);

  const selected = useMemo(() => (all || []).filter((c) => sel.has(c.id)), [all, sel]);
  const allShownSelected = shown.length > 0 && shown.every((c) => sel.has(c.id));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectShown = () => setSel((s) => { const n = new Set(s); if (allShownSelected) shown.forEach((c) => n.delete(c.id)); else shown.forEach((c) => n.add(c.id)); return n; });

  const ids = (list: Contact[]) => list.map((c) => c.id);
  const chunked = async (list: string[], fn: (part: string[]) => Promise<void>) => { for (let i = 0; i < list.length; i += 100) await fn(list.slice(i, i + 100)); };

  const setStatus = async (s: CStatus) => {
    setBusy('status');
    try {
      await chunked(ids(selected), (part) => sbWrite('PATCH', `outreach_contacts?id=in.(${part.join(',')})`, { status: s }));
      setAll((a) => (a || []).map((c) => (sel.has(c.id) ? { ...c, status: s } : c)));
      notify(`${selected.length} marked ${CSTATUS[s].label}`);
    } catch (e) { notify(e instanceof Error ? e.message : 'Could not update.'); }
    setBusy('');
  };
  const addTag = async (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (!t) { setTagInput(null); return; }
    setBusy('tag');
    try {
      const todo = selected.filter((c) => !c.tags.includes(t));
      for (let i = 0; i < todo.length; i += 8) {
        await Promise.all(todo.slice(i, i + 8).map((c) => sbWrite('PATCH', `outreach_contacts?id=eq.${c.id}`, { tags: [...c.tags, t] })));
      }
      setAll((a) => (a || []).map((c) => (sel.has(c.id) && !c.tags.includes(t) ? { ...c, tags: [...c.tags, t] } : c)));
      notify(`Tag "${t}" added to ${todo.length}`);
    } catch (e) { notify(e instanceof Error ? e.message : 'Could not add the tag.'); }
    setBusy(''); setTagInput(null);
  };
  const delSelected = async () => {
    setBusy('del');
    try {
      await chunked(ids(selected), (part) => sbWrite('DELETE', `outreach_contacts?id=in.(${part.join(',')})`));
      setAll((a) => (a || []).filter((c) => !sel.has(c.id)));
      notify(`${selected.length} deleted`); setSel(new Set());
    } catch (e) { notify(e instanceof Error ? e.message : 'Could not delete.'); }
    setBusy(''); setConfirmDel(false);
  };
  const exportCsv = () => {
    const list = selected.length ? selected : shown;
    downloadCsv(`cyberhx-contacts-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['name', 'org', 'role', 'email', 'phone', 'category', 'city', 'state', 'country', 'website', 'tags', 'status', 'emails_sent', 'last_emailed', 'notes', 'source'],
      ...list.map((c) => [c.name, c.org, c.role, c.email || '', c.phone, c.category, c.city, c.state, c.country, c.website, c.tags.join('; '), c.status,
        c.mail_count, c.last_mailed_at || '', c.notes, c.source]),
    ]);
  };

  const chip = (on: boolean) => `shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] border transition-colors ${ring} ${on ? 'bg-white/[0.16] border-white/[0.2] text-white' : 'bg-white/[0.05] border-white/[0.08] text-white/65 hover:text-white'}`;

  return (
    <div className="space-y-5 pb-28">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-white">Contacts</h2>
          <p className="text-[14px] text-white/50">
            {all ? `${all.length} contacts · ${known.size} with email · ${(all || []).filter((c) => c.status === 'replied' || c.status === 'interested').length} replied or interested` : 'Loading…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div role="radiogroup" aria-label="View" className="inline-flex rounded-[11px] bg-white/[0.07] p-[3px] border border-white/[0.06]">
            {([['people', 'People'], ['bulk', 'Bulk emails']] as const).map(([v, t]) => (
              <button key={v} role="radio" aria-checked={view === v} onClick={() => setView(v)}
                className={`px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] transition-all ${ring} ${view === v ? 'bg-white/[0.16] text-white shadow-[0_2px_8px_rgba(0,0,0,.35)]' : 'text-white/55 hover:text-white/85'}`}>{t}</button>
            ))}
          </div>
          {view === 'people' && <>
            <button onClick={() => setImporting(true)} className={btnGlass}><Upload size={15} />Import</button>
            <button onClick={exportCsv} disabled={!shown.length} className={btnGlass}><Download size={15} />Export{selected.length ? ` ${selected.length}` : ''}</button>
            <button onClick={() => setEdit('new')} className={btnBlue}><Plus size={15} />Add</button>
          </>}
        </div>
      </div>

      {view === 'bulk' ? <BatchesView onToast={notify} /> : (
        <>
          {/* category chips */}
          <div className="ios-noscroll flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setCat('')} className={chip(!cat)}>All <span className="text-white/45 tabular-nums">{all?.length || 0}</span></button>
            {CATEGORIES.filter((c) => catCount[c]).map((c) => (
              <button key={c} onClick={() => setCat(cat === c ? '' : c)} className={chip(cat === c)}>
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: CATEGORY[c].color }} />{CATEGORY[c].label}
                <span className="text-white/45 tabular-nums">{catCount[c]}</span>
              </button>
            ))}
          </div>

          {/* filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
              <input id="ct-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, college, email, city, tag…" className={`${field} pl-10`} />
            </div>
            <select id="ct-status" aria-label="Status" value={st} onChange={(e) => setSt(e.target.value as CStatus | '')} className={`${field} sm:w-44`}>
              <option value="">Any status</option>
              {CSTATUSES.map((s) => <option key={s} value={s}>{CSTATUS[s].label}</option>)}
            </select>
            <select id="ct-tag" aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} className={`${field} sm:w-44`}>
              <option value="">Any tag</option>
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-2 whitespace-nowrap px-1 text-[14px] text-white/75">
              <input id="ct-hasemail" type="checkbox" checked={hasEmail} onChange={(e) => setHasEmail(e.target.checked)} className="h-4 w-4 accent-[#0A84FF]" />Has email
            </label>
          </div>

          {err && <p className="text-[14px] text-[#FF453A]">{err}</p>}

          {/* list */}
          {all === null ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white/40" /></div> : !all.length ? (
            <div className={`${glass} rounded-3xl px-6 py-14 text-center`}>
              <p className="text-[17px] font-medium text-white">No contacts yet</p>
              <p className="mx-auto mt-1 max-w-md text-[14px] text-white/50">Add colleges, fest teams, space centres and sponsors one by one, or import a CSV / paste rows from a sheet. Then tick them and send one email to all.</p>
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={() => setImporting(true)} className={btnGlass}><Upload size={15} />Import</button>
                <button onClick={() => setEdit('new')} className={btnBlue}><Plus size={15} />Add contact</button>
              </div>
            </div>
          ) : (
            <div className={`${glass} overflow-hidden rounded-3xl`}>
              <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-2.5 text-[13px] text-white/55">
                <input id="ct-all" type="checkbox" aria-label="Select everyone shown" checked={allShownSelected} onChange={selectShown} className="h-4 w-4 accent-[#0A84FF]" />
                <span>{shown.length === all.length ? `${all.length} contacts` : `${shown.length} of ${all.length} shown`}</span>
                {shown.length > 0 && !allShownSelected && <button onClick={selectShown} className="text-[#0A84FF]">Select all {shown.length}</button>}
              </div>
              {!shown.length && <p className="px-4 py-10 text-center text-[14px] text-white/45">Nobody matches. Clear a filter or the search.</p>}
              <ul className="divide-y divide-white/[0.06]">
                {shown.slice(0, limit).map((c) => {
                  const cc = CATEGORY[c.category] || CATEGORY.other;
                  const s = CSTATUS[c.status] || CSTATUS.new;
                  return (
                    <li key={c.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${sel.has(c.id) ? 'bg-[#0A84FF]/[0.08]' : 'hover:bg-white/[0.03]'}`}>
                      <input type="checkbox" aria-label={`Select ${c.name || c.org || c.email}`} checked={sel.has(c.id)} onChange={() => toggle(c.id)} className="mt-3 h-4 w-4 shrink-0 accent-[#0A84FF]" />
                      <button onClick={() => setEdit(c)} className={`flex min-w-0 flex-1 items-start gap-3 text-left rounded-xl ${ring}`}>
                        <span aria-hidden className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white" style={{ background: `${cc.color}cc` }}>
                          {initials(c.name || c.org || c.email || '?')}
                        </span>
                        <span className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_11.5rem]">
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold text-white">{c.name || c.org || c.email}</span>
                            <span className="block truncate text-[13px] text-white/55">{[c.role, c.name ? c.org : '', c.city].filter(Boolean).join(' · ') || cc.label}</span>
                          </span>
                          <span className="min-w-0 text-[13px]">
                            <span className={`block truncate ${c.email ? 'text-white/80' : 'text-white/35 italic'}`}>{c.email || 'no email yet'}</span>
                            <span className="block truncate text-white/45">{c.phone || (c.tags.length ? c.tags.map((t) => `#${t}`).join(' ') : '')}</span>
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5 md:flex-col md:items-end">
                            <Pill color={s.color}>{s.label}</Pill>
                            <span className="text-[11.5px] text-white/40 whitespace-nowrap">{c.last_mailed_at ? `Emailed ${fmtDate(c.last_mailed_at)}${c.mail_count > 1 ? ` · ${c.mail_count}×` : ''}` : cc.label}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {shown.length > limit && (
                <button onClick={() => setLimit((l) => l + SHOW * 2)} className="w-full border-t border-white/[0.07] py-3 text-[14px] text-[#0A84FF]">Show more ({shown.length - limit} left)</button>
              )}
            </div>
          )}
        </>
      )}

      {/* selection bar */}
      {view === 'people' && selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className={`${glass} bg-[#1c1c1e]/90 flex max-w-full flex-wrap items-center gap-2 rounded-[22px] px-3 py-2`}>
            <button aria-label="Clear selection" onClick={() => { setSel(new Set()); setConfirmDel(false); }} className="rounded-full p-1.5 text-white/60 hover:text-white"><X size={16} /></button>
            <span className="text-[14px] font-medium text-white tabular-nums">{selected.length} selected</span>
            {confirmDel ? (
              <>
                <span className="text-[13px] text-white/70">Delete {selected.length} for good?</span>
                <button onClick={delSelected} disabled={!!busy} className={`${btnGlass} text-[#FF453A]`}>{busy === 'del' && <Loader2 size={14} className="animate-spin" />}Delete</button>
                <button onClick={() => setConfirmDel(false)} className={btnGlass}>Cancel</button>
              </>
            ) : tagInput !== null ? (
              <form onSubmit={(e) => { e.preventDefault(); addTag(tagInput); }} className="flex items-center gap-2">
                <input id="ct-newtag" autoFocus value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="tag name" list="ct-tags" className="w-36 rounded-full bg-white/[0.08] border border-white/[0.1] px-3 py-1.5 text-[13.5px] text-white" />
                <datalist id="ct-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist>
                <button type="submit" disabled={!!busy} className={btnGlass}>{busy === 'tag' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Add</button>
                <button type="button" onClick={() => setTagInput(null)} className={btnGlass}>Cancel</button>
              </form>
            ) : (
              <>
                <button onClick={() => setBulk(selected)} className={btnBlue}><Mail size={15} />Email</button>
                <select aria-label="Set status" value="" disabled={!!busy} onChange={(e) => e.target.value && setStatus(e.target.value as CStatus)}
                  className="rounded-full bg-white/[0.08] border border-white/[0.1] px-3 py-2 text-[13.5px] text-white/85">
                  <option value="">Set status…</option>
                  {CSTATUSES.map((s) => <option key={s} value={s}>{CSTATUS[s].label}</option>)}
                </select>
                <button onClick={() => setTagInput('')} className={btnGlass}><Tag size={14} />Tag</button>
                <button onClick={() => setConfirmDel(true)} className={`${btnGlass} text-[#FF453A]`}><Trash2 size={14} />Delete</button>
              </>
            )}
          </div>
        </div>
      )}

      {edit && (
        <ContactSheet contact={edit === 'new' ? null : edit} onClose={() => setEdit(null)}
          onSaved={(c) => { setAll((a) => { const l = a || []; return l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [c, ...l]; }); setEdit(null); notify('Saved'); }}
          onDeleted={(id) => { setAll((a) => (a || []).filter((x) => x.id !== id)); setSel((s) => { const n = new Set(s); n.delete(id); return n; }); setEdit(null); notify('Deleted'); }}
          onEmail={(c) => { setEdit(null); setBulk([c]); }} />
      )}
      {importing && <ImportSheet known={known} onClose={() => setImporting(false)} onDone={(m) => { setImporting(false); notify(m); load(); }} />}
      {bulk && (
        <BulkSheet contacts={bulk} people={people} isOwner={isOwner} myEmail={myEmail} onClose={() => setBulk(null)}
          onQueued={(m) => { setBulk(null); setSel(new Set()); notify(m); setView('bulk'); }} />
      )}

      <div aria-live="polite" className={`pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <span className={`${glass} bg-[#1c1c1e]/90 max-w-xl rounded-2xl px-4 py-2.5 text-[14px] text-white flex items-center gap-2`}><Check size={16} className="shrink-0 text-[#30D158]" />{toast}</span>
      </div>
    </div>
  );
}
