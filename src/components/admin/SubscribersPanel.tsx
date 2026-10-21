import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Download, Loader2, RefreshCw, Search, SlidersHorizontal, Trash2, Upload, UserMinus, UserPlus, Users } from 'lucide-react';
import { AudienceFilter, describeFilter, filterToQs, isEmptyFilter, type AudFilter } from './AudienceFilter';
import { timeAgo } from './adminApi';

/** Exact time in IST, e.g. "18 Oct 2026, 5:42 pm IST". */
const istStamp = (d: string) =>
  `${new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} IST`;
import { cleanTag, downloadCsv, parsePeople, sbRows, sbRpc, sbWrite } from './mailingApi';

interface Contact {
  id: string;
  email: string;
  name: string;
  tags: string[];
  subscribed: boolean;
  source: string;
  created_at: string;
  unsubscribed_at: string | null;
  gender: string;
  college: string;
  city: string;
  state: string;
  country: string;
}

type Status = 'all' | 'subscribers' | 'unsubscribed';
const PAGE = 200;

const input = 'bg-[#05080f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';

/** Admin -> Subscribers: everyone on the mailing list, imports, tags, export. */
export const SubscribersPanel: React.FC = () => {
  const [rows, setRows] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [tag, setTag] = useState('');
  const [stats, setStats] = useState({ all: 0, subs: 0, unsub: 0, week: 0 });
  const [tags, setTags] = useState<[string, number][]>([]);
  const [showImport, setShowImport] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [aud, setAud] = useState<AudFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const audKey = JSON.stringify(aud);

  const filterQs = useCallback(() => {
    const p: string[] = [];
    if (status === 'subscribers') p.push('subscribed=eq.true', 'tags=cs.{subscriber}');
    if (status === 'unsubscribed') p.push('subscribed=eq.false');
    if (tag) p.push(`tags=cs.{${encodeURIComponent(`"${tag}"`)}}`);
    p.push(...filterToQs(aud));
    const s = q.trim().replace(/[,()*]/g, ' ').trim();
    if (s) p.push(`or=(email.ilike.*${encodeURIComponent(s)}*,name.ilike.*${encodeURIComponent(s)}*)`);
    return p.join('&');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tag, q, audKey]);

  const load = useCallback(async (more = false) => {
    setLoading(true);
    setError('');
    try {
      const from = more ? rows.length : 0;
      const f = filterQs();
      const r = await sbRows<Contact>(`mail_contacts?select=*&order=created_at.desc${f ? `&${f}` : ''}`, { from, to: from + PAGE - 1 });
      setRows(more ? [...rows, ...r.rows] : r.rows);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, [filterQs, rows]);

  const loadStats = useCallback(async () => {
    try {
      const week = new Date(Date.now() - 7 * 864e5).toISOString();
      const [a, s, u, w, t] = await Promise.all([
        sbRows('mail_contacts?select=id', { from: 0, to: 0 }),
        sbRows('mail_contacts?select=id&subscribed=eq.true&tags=cs.{subscriber}', { from: 0, to: 0 }),
        sbRows('mail_contacts?select=id&subscribed=eq.false', { from: 0, to: 0 }),
        sbRows(`mail_contacts?select=id&created_at=gte.${week}`, { from: 0, to: 0 }),
        sbRows<{ tags: string[] }>('mail_contacts?select=tags&tags=neq.{}', { from: 0, to: 9999 }),
      ]);
      setStats({ all: a.total, subs: s.total, unsub: u.total, week: w.total });
      const counts = new Map<string, number>();
      t.rows.forEach((r) => r.tags.forEach((x) => counts.set(x, (counts.get(x) || 0) + 1)));
      setTags([...counts.entries()].sort((x, y) => y[1] - x[1]));
    } catch { /* load() shows the error */ }
  }, []);

  // reload when filters change (search is debounced)
  useEffect(() => {
    const t = setTimeout(() => load(false), q ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tag, q, audKey]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const refresh = () => { load(false); loadStats(); };

  const toggle = async (c: Contact) => {
    setBusyId(c.id);
    try {
      const sub = !c.subscribed;
      await sbWrite('PATCH', `mail_contacts?id=eq.${c.id}`, {
        subscribed: sub,
        unsubscribed_at: sub ? null : new Date().toISOString(),
        ...(sub && !c.tags.includes('subscriber') ? { tags: [...c.tags, 'subscriber'] } : {}),
      });
      setRows((r) => r.map((x) => (x.id === c.id ? { ...x, subscribed: sub, tags: sub && !x.tags.includes('subscriber') ? [...x.tags, 'subscriber'] : x.tags } : x)));
      loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (c: Contact) => {
    if (!confirm(`Delete ${c.email} from the list? (To stop emails but keep the record, use Unsubscribe instead.)`)) return;
    setBusyId(c.id);
    try {
      await sbWrite('DELETE', `mail_contacts?id=eq.${c.id}`);
      setRows((r) => r.filter((x) => x.id !== c.id));
      setTotal((t) => t - 1);
      loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.');
    } finally {
      setBusyId('');
    }
  };

  const exportCsv = async () => {
    try {
      const f = filterQs();
      const all: Contact[] = [];
      for (let from = 0; ; from += 1000) {
        const r = await sbRows<Contact>(`mail_contacts?select=*&order=created_at.desc${f ? `&${f}` : ''}`, { from, to: from + 999 });
        all.push(...r.rows);
        if (r.rows.length < 1000) break;
      }
      downloadCsv(`cyberhx-contacts-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['email', 'name', 'gender', 'college', 'city', 'state', 'country', 'status', 'tags', 'source', 'subscribed_on_ist'],
        ...all.map((c) => [c.email, c.name, c.gender, c.college, c.city, c.state, c.country, c.subscribed ? 'subscribed' : 'unsubscribed', c.tags.join(' '), c.source, istStamp(c.created_at)]),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Subscribers', value: stats.subs, cls: 'text-[#a3e635]', hint: 'Get newsletters and event blasts' },
          { label: 'All contacts', value: stats.all, cls: 'text-white', hint: 'Including imported event lists' },
          { label: 'Unsubscribed', value: stats.unsub, cls: stats.unsub ? 'text-amber-300' : 'text-gray-500', hint: 'Never get promotional emails' },
          { label: 'New this week', value: stats.week, cls: 'text-sky-300', hint: 'Added in the last 7 days' },
        ].map((s) => (
          <div key={s.label} className="bg-[#0a0f1a] border border-white/8 rounded-xl p-3.5" title={s.hint}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${s.cls}`}>{s.value.toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>

      {/* Import */}
      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-white font-medium flex items-center gap-2"><Upload size={16} className="text-[#a3e635]" /> Import people</h3>
            <p className="text-gray-500 text-xs mt-1">Paste a list or upload a CSV / Excel export (saved as .csv). Existing people are updated, never duplicated.</p>
          </div>
          <button onClick={() => setShowImport((v) => !v)} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white">
            {showImport ? 'Hide' : 'Import a list'}
          </button>
        </div>
        {showImport && <ImportBox tags={tags.map(([t]) => t)} onDone={() => { refresh(); }} />}
      </div>

      {/* Filters: gender, country, state, college */}
      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl">
        <button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
          <span className="flex items-center gap-3 min-w-0">
            <SlidersHorizontal size={17} className="text-[#a3e635] shrink-0" />
            <span className="min-w-0">
              <span className="block text-white font-medium">Filter by gender, country, state, college</span>
              <span className="block text-xs text-gray-500 truncate">{isEmptyFilter(aud) ? 'Showing everyone' : describeFilter(aud)}</span>
            </span>
          </span>
          <span className="flex items-center gap-3 shrink-0">
            {!isEmptyFilter(aud) && !showFilters && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setAud({}); }} onKeyDown={(e) => e.key === 'Enter' && setAud({})} className="text-[14px] text-[#0A84FF]">Clear</span>}
            <ChevronDown size={18} className={`text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {showFilters && (
          <div className="border-t border-white/[0.06] px-5 pb-5 pt-4">
            <AudienceFilter value={aud} onChange={setAud} title="Subscribed people matching" />
          </div>
        )}
      </div>

      {/* List */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {([['all', 'Everyone'], ['subscribers', 'Subscribers'], ['unsubscribed', 'Unsubscribed']] as [Status, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setStatus(id)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${status === id ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635] font-medium' : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
          <label className="sr-only" htmlFor="sub-tag">Tag</label>
          <select id="sub-tag" value={tag} onChange={(e) => setTag(e.target.value)} className={`${input} !py-1 text-xs`}>
            <option value="">All tags</option>
            {tags.map(([t, n]) => <option key={t} value={t}>{t} ({n})</option>)}
          </select>
          <label className="relative ml-auto">
            <span className="sr-only">Search contacts</span>
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className={`${input} !py-1.5 pl-8 text-xs w-56`} />
          </label>
          <button onClick={exportCsv} className="px-2.5 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5"><Download size={13} /> Export CSV</button>
          <button onClick={refresh} className="text-gray-500 hover:text-white p-1.5" title="Refresh"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>

        {error && <p className="text-red-400 text-sm flex items-start gap-1.5 mb-3"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}</p>}

        <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-white/8">
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Subscribed on</th>
                  <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 max-w-[18rem]">
                      <p className="text-gray-200 truncate">{c.email}</p>
                      {c.name && <p className="text-gray-500 text-xs truncate">{c.name}</p>}
                    </td>
                    <td className="px-4 py-3 max-w-[16rem]">
                      {c.college && <p className="text-gray-300 text-xs truncate" title={c.college}>{c.college}</p>}
                      <p className="text-gray-500 text-[11px] truncate">{[c.gender && c.gender[0].toUpperCase() + c.gender.slice(1), [c.city, c.state, c.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[16rem]">
                        {c.tags.map((t) => (
                          <button key={t} onClick={() => setTag(t)} className={`text-[11px] px-1.5 py-0.5 rounded border ${t === 'subscriber' ? 'border-[#a3e635]/40 text-[#a3e635]' : 'border-white/10 text-gray-400 hover:text-white'}`}>{t}</button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.subscribed
                        ? <span className="text-[11px] px-2 py-0.5 rounded-full border border-[#a3e635]/40 text-[#a3e635] bg-[#a3e635]/10 whitespace-nowrap">Subscribed</span>
                        : <>
                            <span className="text-[11px] px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-300 bg-amber-500/10 whitespace-nowrap">Unsubscribed</span>
                            {c.unsubscribed_at && <span className="block mt-1 text-[11px] text-gray-500 whitespace-nowrap">{istStamp(c.unsubscribed_at)}</span>}
                          </>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <time dateTime={c.created_at} className="text-gray-300 tabular-nums">{istStamp(c.created_at)}</time>
                      <span className="block text-[11px] text-gray-500">{timeAgo(c.created_at)} · {c.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => toggle(c)} disabled={busyId === c.id} title={c.subscribed ? 'Unsubscribe' : 'Subscribe again'}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-40">
                          {c.subscribed ? <UserMinus size={15} /> : <UserPlus size={15} />}
                        </button>
                        <button onClick={() => remove(c)} disabled={busyId === c.id} title="Delete" className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/5 disabled:opacity-40">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && !rows.length && <p className="px-4 py-6 text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
          {!loading && !error && !rows.length && (
            <div className="px-4 py-10 text-center">
              <Users size={22} className="mx-auto text-gray-600" />
              <p className="text-gray-400 text-sm mt-2">Nobody here yet.</p>
              <p className="text-gray-600 text-xs mt-1">People who subscribe on the website appear here. You can also import a list above.</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <span>Showing {rows.length.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}</span>
          {rows.length < total && (
            <button onClick={() => load(true)} disabled={loading} className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white disabled:opacity-50">Load more</button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Paste / upload → preview → import with a tag. */
function ImportBox({ tags, onDone }: { tags: string[]; onDone: () => void }) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState('');
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parsePeople(text), [text]);

  const onFile = async (f?: File) => {
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) { setErr('Excel files: in Excel choose File → Save As → CSV, then upload the .csv.'); return; }
    setErr('');
    setText(await f.text());
  };

  const run = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const t = [cleanTag(tag), consent ? 'subscriber' : ''].filter(Boolean);
      let added = 0;
      let updated = 0;
      for (let i = 0; i < parsed.people.length; i += 1000) {
        const r = await sbRpc<{ added: number; updated: number }>('mail_import', { p_rows: parsed.people.slice(i, i + 1000), p_tags: t, p_source: 'import' });
        added += r.added;
        updated += r.updated;
      }
      setMsg(`Imported: ${added} new, ${updated} already on the list (updated).`);
      setText('');
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <label htmlFor="imp-text" className="text-xs text-gray-400">People: one per line (Name, email), or paste columns from a sheet</label>
        <textarea id="imp-text" value={text} onChange={(e) => setText(e.target.value)} rows={8} spellCheck={false}
          placeholder={'Aman Verma, aman@gmail.com\nRiya <riya@college.edu>\nneha@gmail.com'}
          className={`${input} mt-1.5 w-full font-mono text-[13px] leading-6`} />
        <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
          <button onClick={() => file.current?.click()} className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5"><Upload size={13} /> Upload CSV</button>
          <input ref={file} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          {text && (
            <span className="text-gray-400">
              <b className="text-white">{parsed.people.length}</b> people found
              {parsed.dupes ? ` · ${parsed.dupes} duplicates removed` : ''}
              {parsed.bad ? <span className="text-amber-300"> · {parsed.bad} lines without an email skipped</span> : ''}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="imp-tag" className="text-xs text-gray-400">Tag (optional): to email just this group later</label>
          <input id="imp-tag" list="imp-tags" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. ctf-oct-2026" className={`${input} mt-1.5 w-full`} />
          <datalist id="imp-tags">{tags.filter((t) => t !== 'subscriber').map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-[#a3e635]" />
          <span>Add them to <b className="text-white">Subscribers</b><span className="block text-xs text-gray-500">Only tick this if they agreed to get CyberHx updates. Unticked: they are saved with the tag only (good for event registrants).</span></span>
        </label>
        <button onClick={run} disabled={busy || !parsed.people.length}
          className="w-full px-4 py-2.5 rounded-xl bg-[#a3e635] text-[#05080f] font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import {parsed.people.length || ''} {parsed.people.length === 1 ? 'person' : 'people'}
        </button>
        {msg && <p className="text-sm text-[#a3e635] flex items-center gap-1.5"><Check size={14} /> {msg}</p>}
        {err && <p className="text-sm text-red-400 flex items-start gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {err}</p>}
        <p className="text-[11px] text-gray-600">People who unsubscribed stay unsubscribed, even if you import them again.</p>
      </div>
    </div>
  );
}

export default SubscribersPanel;
