import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Loader2, Pencil, Plus, X } from 'lucide-react';
import { sbInsert, sbRows, sbRpc, sbWrite } from './mailingApi';
import { device, place, type SignIn } from './SignInActivity';

/* =============================================================
   Admin → Outreach → Team (owners only)
   One card per outreach person (their numbers, address, last sign-in), a month calendar of
   when each of them signed in, and "Add person".
   Data: outreach_team() (supabase/outreach_team.sql), staff_logins (supabase/staff_logins.sql).
============================================================= */

export interface Person { user_id: string; name: string; send_as: string; login_email?: string; last_sign_in?: string | null }
const COLORS = ['#0A84FF', '#FF9F0A', '#30D158', '#BF5AF2', '#FF375F', '#64D2FF', '#FFD60A'];
export const colorOf = (people: Person[], id?: string | null) => COLORS[Math.max(0, people.findIndex((p) => p.user_id === id)) % COLORS.length];

const glass = 'bg-white/[0.045] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_40px_-12px_rgba(0,0,0,0.6)]';
const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80';
const field = `w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-[15px] text-white placeholder:text-white/30 ${ring}`;

const istKey = (d: string | number) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const istTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
const ago = (d?: string | null) => {
  if (!d) return 'Never';
  const s = Math.round((Date.now() - Date.parse(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 2) return 'yesterday';
  return `${Math.round(s / 86400)} days ago`;
};
const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type LeadLite = { owner_id?: string | null; status: string };
type MailLite = { sent_by_id?: string | null; sent_at: string };

export function TeamView({ people, leads, mails, onReload, onOpen, onHours, onToast }: {
  people: Person[]; leads: LeadLite[]; mails: MailLite[];
  onReload: () => void; onOpen: (id: string) => void; onHours: (id: string) => void; onToast: (m: string) => void;
}) {
  const [logins, setLogins] = useState<SignIn[] | null>(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [only, setOnly] = useState('');
  const today = istKey(Date.now());
  const [month, setMonth] = useState(today.slice(0, 7)); // YYYY-MM
  const [day, setDay] = useState(today);

  const loadLogins = useCallback(async () => {
    if (!people.length) { setLogins([]); return; }
    setErr('');
    const ids = people.map((p) => p.user_id).join(',');
    const emails = people.map((p) => p.login_email).filter(Boolean).map((e) => `"${e}"`).join(',');
    const or = encodeURIComponent(`(user_id.in.(${ids})${emails ? `,email.in.(${emails})` : ''})`);
    try { setLogins((await sbRows<SignIn>(`staff_logins?select=*&or=${or}&order=at.desc&limit=3000`)).rows); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not load sign-ins.'); setLogins([]); }
  }, [people]);
  useEffect(() => { loadLogins(); }, [loadLogins]);

  const personOf = useCallback((r: SignIn) => people.find((p) => p.user_id === r.user_id || (!!p.login_email && p.login_email === r.email.toLowerCase())), [people]);

  // day -> sign-ins (already filtered by "only")
  const byDay = useMemo(() => {
    const m = new Map<string, SignIn[]>();
    (logins || []).forEach((r) => {
      const p = personOf(r);
      if (!p || (only && p.user_id !== only)) return;
      const k = istKey(r.at);
      m.set(k, [...(m.get(k) || []), r]);
    });
    return m;
  }, [logins, personOf, only]);
  const mailsByDay = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    mails.forEach((x) => {
      if (!x.sent_by_id) return;
      const k = istKey(x.sent_at);
      const inner = m.get(k) || new Map<string, number>();
      inner.set(x.sent_by_id, (inner.get(x.sent_by_id) || 0) + 1);
      m.set(k, inner);
    });
    return m;
  }, [mails]);

  const cells = useMemo(() => {
    const [y, mo] = month.split('-').map(Number);
    const lead = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`)] as (string | null)[];
  }, [month]);
  const shiftMonth = (n: number) => {
    const [y, mo] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, mo - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const stats = (id: string) => {
    const ls = leads.filter((l) => l.owner_id === id);
    const ms = mails.filter((m) => m.sent_by_id === id);
    const week = Date.now() - 7 * 864e5;
    const signIns7 = (logins || []).filter((r) => r.ok && personOf(r)?.user_id === id && Date.parse(r.at) > week).length;
    return {
      leads: ls.length,
      contacted: ls.filter((l) => l.status !== 'todo').length,
      talks: ls.filter((l) => l.status === 'replied' || l.status === 'meeting').length,
      won: ls.filter((l) => l.status === 'won').length,
      mails: ms.length,
      mails7: ms.filter((m) => Date.parse(m.sent_at) > week).length,
      signIns7,
    };
  };
  const lastPlace = (id: string) => (logins || []).find((r) => r.ok && personOf(r)?.user_id === id);

  const dayRows = byDay.get(day) || [];
  const dayGroups = people
    .filter((p) => !only || p.user_id === only)
    .map((p) => ({ p, rows: dayRows.filter((r) => personOf(r)?.user_id === p.user_id).sort((a, b) => a.at.localeCompare(b.at)), sent: mailsByDay.get(day)?.get(p.user_id) || 0 }))
    .filter((g) => g.rows.length || g.sent);
  const dayLabel = new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <div className="space-y-6">
      {/* People */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-[20px] font-semibold text-white tracking-tight">People</h3>
          <button onClick={() => setAdding(true)} className={`h-9 rounded-full bg-white/[0.08] border border-white/[0.1] px-3.5 text-[14px] text-white flex items-center gap-1.5 hover:bg-white/[0.12] ${ring}`}>
            <Plus size={15} />Add person
          </button>
        </div>
        {!people.length ? (
          <div className={`${glass} rounded-[22px] px-6 py-10 text-center text-white/60 text-[14px]`}>No outreach people yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {people.map((p) => {
              const s = stats(p.user_id);
              const lp = lastPlace(p.user_id);
              const c = colorOf(people, p.user_id);
              return (
                <article key={p.user_id} className={`${glass} rounded-[22px] p-4 sm:p-5`}>
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[17px] font-semibold text-white" style={{ background: c }}>{p.name.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[17px] font-semibold text-white">
                        {p.name}
                        <button onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} className="rounded-full p-1 text-white/40 hover:text-white"><Pencil size={13} /></button>
                      </p>
                      <p className="truncate text-[13px] text-white/55">Sends as <span className="text-white/80">{p.send_as}</span></p>
                      <p className="truncate text-[12px] text-white/40">Signs in with {p.login_email || '—'}</p>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {([['Leads', s.leads], ['Contacted', s.contacted], ['In talks', s.talks], ['Won', s.won]] as const).map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-white/[0.04] py-2">
                        <dd className="text-[20px] font-semibold text-white tabular-nums leading-none">{v}</dd>
                        <dt className="mt-1 text-[11px] text-white/45">{k}</dt>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[12.5px] text-white/55">
                    {s.mails} email{s.mails === 1 ? '' : 's'} sent ({s.mails7} this week) · {s.signIns7} sign-in{s.signIns7 === 1 ? '' : 's'} this week
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-white/45">
                    Last signed in {ago(lp?.at || p.last_sign_in)}{lp ? ` · ${place(lp) || 'unknown place'} · ${device(lp.user_agent)}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => onOpen(p.user_id)} className={`h-9 rounded-full bg-[#0A84FF] px-4 text-[14px] font-semibold text-white ${ring}`}>Open dashboard</button>
                    <button onClick={() => onHours(p.user_id)} className={`h-9 rounded-full bg-white/[0.08] border border-white/[0.1] px-3.5 text-[14px] text-white flex items-center gap-1.5 ${ring}`}><Clock size={14} />Call hours</button>
                    <button onClick={() => { setOnly(p.user_id); document.getElementById('signin-cal')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`h-9 rounded-full bg-white/[0.08] border border-white/[0.1] px-3.5 text-[14px] text-white ${ring}`}>Sign-ins</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Sign-in calendar */}
      <section id="signin-cal" className={`${glass} rounded-[22px] p-4 sm:p-5 scroll-mt-40`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold text-white tracking-tight">Sign-ins</h3>
            <p className="text-[12.5px] text-white/45">When each person signed in to the admin panel (IST). Tap a day for times and places.</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className={`h-9 w-9 rounded-full flex items-center justify-center text-white/70 hover:bg-white/[0.08] ${ring}`}><ChevronLeft size={18} /></button>
            <span className="min-w-[130px] text-center text-[15px] font-medium text-white">{monthLabel}</span>
            <button onClick={() => shiftMonth(1)} aria-label="Next month" className={`h-9 w-9 rounded-full flex items-center justify-center text-white/70 hover:bg-white/[0.08] ${ring}`}><ChevronRight size={18} /></button>
            {month !== today.slice(0, 7) && <button onClick={() => { setMonth(today.slice(0, 7)); setDay(today); }} className="ml-1 text-[13px] text-[#0A84FF]">Today</button>}
          </div>
        </div>

        {/* legend / filter */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button onClick={() => setOnly('')} aria-pressed={!only} className={`rounded-full px-3 py-1 text-[12.5px] border ${!only ? 'bg-white/[0.16] text-white border-transparent' : 'text-white/60 border-white/[0.08]'}`}>Everyone</button>
          {people.map((p) => (
            <button key={p.user_id} onClick={() => setOnly(only === p.user_id ? '' : p.user_id)} aria-pressed={only === p.user_id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] border ${only === p.user_id ? 'bg-white/[0.16] text-white border-transparent' : 'text-white/60 border-white/[0.08]'}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: colorOf(people, p.user_id) }} />{p.name}
            </button>
          ))}
        </div>

        {err && <p role="alert" className="mt-3 rounded-xl bg-[#FF453A]/15 px-3 py-2 text-[13px] text-[#FF9F9A]">{err}</p>}

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => <div key={w} className="pb-1 text-[11px] font-medium uppercase tracking-wide text-white/35">{w}</div>)}
          {cells.map((k, i) => {
            if (!k) return <div key={`b${i}`} />;
            const rows = byDay.get(k) || [];
            const who = people.filter((p) => rows.some((r) => r.ok && personOf(r)?.user_id === p.user_id));
            const failed = rows.some((r) => !r.ok);
            const on = k === day;
            const future = k > today;
            return (
              <button key={k} onClick={() => setDay(k)} aria-pressed={on} disabled={future}
                aria-label={`${k}: ${who.map((p) => p.name).join(', ') || 'no sign-ins'}${failed ? ', failed attempts' : ''}`}
                className={`relative flex aspect-square sm:aspect-auto sm:h-[68px] flex-col items-center justify-start rounded-xl pt-1.5 sm:pt-2 transition ${ring}
                  ${on ? 'bg-[#0A84FF]/25 ring-1 ring-[#0A84FF]/70' : rows.length ? 'bg-white/[0.06] hover:bg-white/[0.1]' : 'hover:bg-white/[0.04]'} ${future ? 'opacity-30' : ''}`}>
                <span className={`text-[13px] tabular-nums ${k === today ? 'flex h-6 w-6 items-center justify-center rounded-full bg-[#FF453A] font-semibold text-white' : 'text-white/80'}`}>{Number(k.slice(8))}</span>
                <span className="mt-1 flex flex-wrap justify-center gap-[3px] px-1">
                  {who.slice(0, 4).map((p) => <span key={p.user_id} className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full" style={{ background: colorOf(people, p.user_id) }} />)}
                  {failed && <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full border border-[#FF453A]" />}
                </span>
                {rows.filter((r) => r.ok).length > 1 && <span className="hidden sm:block mt-0.5 text-[10px] text-white/35">{rows.filter((r) => r.ok).length}×</span>}
              </button>
            );
          })}
        </div>

        {/* chosen day */}
        <div className="mt-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3.5 sm:p-4">
          <p className="text-[14px] font-semibold text-white">{dayLabel}</p>
          {logins === null ? <Loader2 className="mt-2 animate-spin text-white/50" size={18} />
            : !dayGroups.length ? <p className="mt-1 text-[13px] text-white/45">Nobody signed in this day.</p>
            : (
              <ul className="mt-2 space-y-3">
                {dayGroups.map(({ p, rows, sent }) => (
                  <li key={p.user_id}>
                    <p className="flex items-center gap-2 text-[14px] font-medium text-white">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(people, p.user_id) }} />{p.name}
                      <span className="text-[12px] font-normal text-white/40">{rows.filter((r) => r.ok).length} sign-in{rows.filter((r) => r.ok).length === 1 ? '' : 's'}{sent ? ` · ${sent} email${sent === 1 ? '' : 's'} sent` : ''}</span>
                    </p>
                    <ul className="mt-1 space-y-1 pl-[18px]">
                      {rows.map((r) => (
                        <li key={r.id} className={`flex flex-wrap items-baseline gap-x-2 text-[13px] ${r.ok ? 'text-white/75' : 'text-[#FF9F9A]'}`}>
                          <span className="tabular-nums font-medium">{istTime(r.at)}</span>
                          {!r.ok && <span className="inline-flex items-center gap-1"><AlertTriangle size={12} />Wrong password</span>}
                          <span className="text-white/45">{place(r) || 'Unknown place'} · {device(r.user_agent)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </section>

      {adding && <PersonSheet onClose={() => setAdding(false)} onDone={() => { setAdding(false); onReload(); onToast('Person added'); }} />}
      {editing && <PersonSheet person={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); onReload(); onToast('Saved'); }} />}
    </div>
  );
}

/* Add or edit an outreach person: name, the login they already have, and the @cyberhx.com address they send as. */
function PersonSheet({ person, onClose, onDone }: { person?: Person; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(person?.name || '');
  const [login, setLogin] = useState(person?.login_email || '');
  const [local, setLocal] = useState(person?.send_as.split('@')[0] || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    const send_as = `${local.trim().toLowerCase()}@cyberhx.com`;
    if (!name.trim()) return setErr('Name is needed.');
    if (!/^[a-z0-9._+-]+$/.test(local.trim().toLowerCase())) return setErr('Address: letters, numbers, dot or dash only.');
    if (send_as === 'mail@cyberhx.com') return setErr('mail@cyberhx.com is the shared inbox. Pick a personal address.');
    setBusy(true); setErr('');
    try {
      if (person) {
        await sbWrite('PATCH', `outreach_people?user_id=eq.${person.user_id}`, { name: name.trim(), send_as });
      } else {
        const e = login.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setBusy(false); return setErr('Enter the email they sign in with.'); }
        const r = await sbRpc<{ user_id: string }>('staff_set', { p_email: e, p_role: 'outreach' });
        await sbInsert('outreach_people', { user_id: r.user_id, name: name.trim(), send_as });
      }
      onDone();
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Could not save.';
      setErr(/duplicate|unique/i.test(m) ? 'That address or person is already on the team.' : m);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="person-h">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className={`relative w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] ${glass} bg-[#1c1c1e]/90 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}>
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onClose} className="text-[16px] text-[#0A84FF]">Cancel</button>
          <h3 id="person-h" className="text-[17px] font-semibold text-white">{person ? 'Edit person' : 'Add person'}</h3>
          <button onClick={submit} disabled={busy} className="text-[16px] font-semibold text-[#0A84FF] disabled:opacity-40 flex items-center gap-1">
            {busy && <Loader2 size={14} className="animate-spin" />}{person ? 'Save' : 'Add'}
          </button>
        </div>
        <div className="space-y-3">
          <label className="block"><span className="mb-1 block text-[12.5px] text-white/50">Name (used in the From line and signature)</span>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="e.g. Yashika" className={field} /></label>
          {!person && (
            <label className="block"><span className="mb-1 block text-[12.5px] text-white/50">Their admin login email</span>
              <input value={login} onChange={(e) => setLogin(e.target.value)} inputMode="email" placeholder="name@gmail.com" className={field} />
              <span className="mt-1 block text-[11.5px] text-white/35">The login must exist already (Supabase → Authentication → Add user). They get the Outreach role.</span></label>
          )}
          <label className="block"><span className="mb-1 block text-[12.5px] text-white/50">Sends emails as</span>
            <div className="flex items-center gap-1.5">
              <input value={local} onChange={(e) => setLocal(e.target.value.replace(/\s/g, ''))} placeholder="yashika" className={field} />
              <span className="shrink-0 text-[15px] text-white/60">@cyberhx.com</span>
            </div></label>
        </div>
        {err && <p role="alert" className="mt-3 flex items-start gap-2 text-[14px] text-[#FF453A]"><X size={15} className="mt-0.5 shrink-0" />{err}</p>}
      </div>
    </div>
  );
}
