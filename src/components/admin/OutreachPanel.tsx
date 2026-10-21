import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { CalendarClock, Check, Copy, ExternalLink, Loader2, Mail, Phone, Plus, RefreshCw, Search, Target, X } from 'lucide-react';
import { sbInsert, sbRows, sbWrite } from './mailingApi';

/* =============================================================
   Admin → Outreach: CTF organisers to pitch Cyber HX hosting to.
   Data: supabase/outreach.sql (table outreach_leads). Visible to owners and the 'outreach' role only.
============================================================= */

type Status = 'todo' | 'contacted' | 'replied' | 'meeting' | 'won' | 'lost' | 'skip';
interface Lead {
  id: string; event: string; organizer: string; event_date: string; sort_date: string | null; emails: string; phones: string;
  link: string; platform: string; priority: 'target' | 'maybe'; status: Status; notes: string; next_followup: string | null;
  last_contacted_at: string | null; updated_by: string | null; updated_at: string;
}

const STATUS: Record<Status, { label: string; cls: string }> = {
  todo: { label: 'To contact', cls: 'border-white/15 text-gray-300' },
  contacted: { label: 'Contacted', cls: 'border-sky-400/40 text-sky-300 bg-sky-400/10' },
  replied: { label: 'Replied', cls: 'border-yellow-400/40 text-yellow-300 bg-yellow-400/10' },
  meeting: { label: 'Meeting set', cls: 'border-purple-400/40 text-purple-300 bg-purple-400/10' },
  won: { label: 'Won 🎉', cls: 'border-[#a3e635]/50 text-[#a3e635] bg-[#a3e635]/10' },
  lost: { label: 'Not interested', cls: 'border-red-400/30 text-red-300 bg-red-400/10' },
  skip: { label: 'Skip', cls: 'border-white/10 text-gray-500' },
};
const ORDER: Status[] = ['todo', 'contacted', 'replied', 'meeting', 'won', 'lost', 'skip'];
const input = 'w-full bg-[#05080f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';
const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white hover:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a3e635]/70';

const todayIst = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const daysTo = (d: string | null) => (d ? Math.round((new Date(`${d}T00:00:00+05:30`).getTime() - new Date(`${todayIst()}T00:00:00+05:30`).getTime()) / 864e5) : null);
const when = (d: string | null) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const emailsOf = (s: string) => s.split(/[,;\s]+/).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

const pitchFor = (l: Pick<Lead, 'event' | 'organizer'>) => ({
  subject: `Hosting partner for ${l.event}: Cyber HX`,
  body: `Hi ${l.organizer.split(',')[0]} team,

Congrats on putting together ${l.event}. I'm reaching out from Cyber HX (cyberhx.com). We host and run CTFs for colleges and communities, including the platform, challenge hosting, live scoreboard and on-the-day support, so your team can focus on the event itself.

If you're still finalising infrastructure, or are planning your next edition, we'd be glad to help. We can also contribute original challenges.

Pricing and details: https://cyberhx.com/host-your-ctf

Would a quick 15-minute call this week work?

Best,
Cyber HX Team`,
});

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function OutreachPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState<'' | 'open' | Status>('open');
  const [fPri, setFPri] = useState<'' | 'target' | 'maybe'>('');
  const [saving, setSaving] = useState<string | null>(null);
  const [flash, setFlash] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const { rows } = await sbRows<Lead>('outreach_leads?select=*&order=sort_date.asc.nullslast');
      setLeads(rows);
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Could not load.';
      setErr(/missing|does not exist/i.test(m) ? 'Outreach table is missing: run supabase/outreach.sql in Supabase.' : m);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(''), 1800); };

  const save = async (l: Lead, patch: Partial<Lead>) => {
    setSaving(l.id);
    const before = leads;
    setLeads((ls) => ls.map((x) => (x.id === l.id ? { ...x, ...patch } : x)));
    try {
      await sbWrite('PATCH', `outreach_leads?id=eq.${l.id}`, patch);
      note('Saved');
    } catch (e) {
      setLeads(before);
      setErr(e instanceof Error ? e.message : 'Could not save.');
    }
    setSaving(null);
  };

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads
      .filter((l) => !fPri || l.priority === fPri)
      .filter((l) => (fStatus === 'open' ? !['won', 'lost', 'skip'].includes(l.status) : !fStatus || l.status === fStatus))
      .filter((l) => !s || `${l.event} ${l.organizer} ${l.emails} ${l.notes}`.toLowerCase().includes(s))
      .sort((a, b) => {
        // Follow-ups due first, then targets before maybes, then by event date
        const da = daysTo(a.next_followup), db = daysTo(b.next_followup);
        const dueA = da !== null && da <= 0 ? 0 : 1, dueB = db !== null && db <= 0 ? 0 : 1;
        return dueA - dueB || (a.priority === b.priority ? 0 : a.priority === 'target' ? -1 : 1) || (a.sort_date || '9999').localeCompare(b.sort_date || '9999');
      });
  }, [leads, q, fStatus, fPri]);

  const counts = useMemo(() => Object.fromEntries(ORDER.map((s) => [s, leads.filter((l) => l.status === s).length])) as Record<Status, number>, [leads]);
  const due = leads.filter((l) => { const d = daysTo(l.next_followup); return d !== null && d <= 0 && !['won', 'lost', 'skip'].includes(l.status); }).length;

  return (
    <div className="space-y-5">
      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-white font-semibold flex items-center gap-2"><Target size={18} className="text-[#a3e635]" />CTF outreach</h2>
            <p className="mt-1 text-sm text-gray-400 max-w-2xl">Organisers of upcoming CTFs with no challenge platform. Email them the pitch, then set the status and a follow-up date. Everyone with Outreach access sees the same list.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding((a) => !a)} className={btn}><Plus size={13} />Add lead</button>
            <button onClick={load} className={btn} aria-label="Refresh"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {ORDER.map((s) => (
            <button key={s} onClick={() => setFStatus(fStatus === s ? 'open' : s)} className={`px-2.5 py-1 rounded-full border ${STATUS[s].cls} ${fStatus === s ? 'ring-2 ring-[#a3e635]/60' : ''}`}>
              {STATUS[s].label} · {counts[s] || 0}
            </button>
          ))}
          {due > 0 && <span className="px-2.5 py-1 rounded-full border border-orange-400/40 text-orange-300 bg-orange-400/10">⏰ {due} follow-up{due > 1 ? 's' : ''} due</span>}
        </div>
      </div>

      {adding && <AddLead onDone={(l) => { setAdding(false); if (l) { setLeads((ls) => [...ls, l]); note('Lead added'); } }} />}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search event, college, email, notes…" aria-label="Search leads" className={`${input} pl-8`} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} aria-label="Status filter" className={`${input} !w-auto`}>
          <option value="open">Open (not won / lost / skipped)</option>
          <option value="">All statuses</option>
          {ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
        <select value={fPri} onChange={(e) => setFPri(e.target.value as typeof fPri)} aria-label="Priority filter" className={`${input} !w-auto`}>
          <option value="">Targets + maybes</option>
          <option value="target">🎯 Targets only</option>
          <option value="maybe">Maybe (ask first)</option>
        </select>
      </div>

      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      {flash && <p role="status" className="text-xs text-[#a3e635]">{flash}</p>}

      {loading && !leads.length ? (
        <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#a3e635]" /></div>
      ) : !shown.length ? (
        <p className="text-sm text-gray-500 py-6 text-center">No leads match.</p>
      ) : (
        <ul className="grid gap-3">
          {shown.map((l) => <LeadCard key={l.id} l={l} saving={saving === l.id} onSave={(p) => save(l, p)} onCopied={note} />)}
        </ul>
      )}
    </div>
  );
}

function LeadCard({ l, saving, onSave, onCopied }: { l: Lead; saving: boolean; onSave: (p: Partial<Lead>) => void; onCopied: (m: string) => void }) {
  const [notes, setNotes] = useState(l.notes);
  useEffect(() => setNotes(l.notes), [l.notes]);
  const d = daysTo(l.sort_date);
  const fu = daysTo(l.next_followup);
  const mails = emailsOf(l.emails);
  const pitch = pitchFor(l);
  const mailto = mails.length ? `mailto:${encodeURIComponent(mails[0])}${mails.length > 1 ? `?cc=${encodeURIComponent(mails.slice(1).join(','))}&` : '?'}subject=${encodeURIComponent(pitch.subject)}&body=${encodeURIComponent(pitch.body)}` : '';

  return (
    <li className={`bg-[#0a0f1a] border rounded-2xl p-4 space-y-3 ${fu !== null && fu <= 0 && !['won', 'lost', 'skip'].includes(l.status) ? 'border-orange-400/40' : 'border-white/8'} ${l.status === 'skip' || l.status === 'lost' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-semibold flex flex-wrap items-center gap-2">
            {l.event}
            {l.priority === 'target'
              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/30">🎯 NO PLATFORM</span>
              : <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">MAYBE</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{l.organizer}</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 size={13} className="animate-spin text-gray-500" />}
          <label className="sr-only" htmlFor={`st-${l.id}`}>Status for {l.event}</label>
          <select id={`st-${l.id}`} value={l.status} onChange={(e) => onSave({ status: e.target.value as Status })} className={`text-xs rounded-lg border px-2 py-1.5 bg-[#05080f] ${STATUS[l.status].cls}`}>
            {ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-300 flex items-center gap-1"><CalendarClock size={11} />{l.event_date}</span>
        {d !== null && d >= 0 && d <= 7 && <span className="px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-300">{d === 0 ? 'today' : `in ${d}d`}</span>}
        {d !== null && d < 0 && <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-500">started — pitch next edition</span>}
      </div>

      <p className="text-xs text-gray-400"><span className="text-gray-500">Platform:</span> {l.platform}</p>

      <div className="grid gap-1.5 text-sm">
        {mails.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <Mail size={13} className="text-gray-500" />
            <span className="font-mono text-xs text-gray-200 break-all select-all">{mails.join(', ')}</span>
            <button className={btn} onClick={async () => onCopied((await copy(mails.join(', '))) ? 'Emails copied' : 'Copy failed')}><Copy size={11} />Copy</button>
          </div>
        ) : <p className="text-xs text-gray-500 italic flex items-center gap-2"><Mail size={13} />No email published</p>}
        {l.phones && <p className="text-xs text-gray-300 flex items-center gap-2"><Phone size={13} className="text-gray-500" /><span className="select-all break-all">{l.phones}</span></p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {mailto && <a href={mailto} className={btn}><Mail size={12} />Open email draft</a>}
        <button className={btn} onClick={async () => onCopied((await copy(`Subject: ${pitch.subject}\n\n${pitch.body}`)) ? 'Pitch copied' : 'Copy failed')}><Copy size={12} />Copy pitch</button>
        {l.link && <a href={l.link} target="_blank" rel="noopener noreferrer" className={btn}><ExternalLink size={12} />Event page</a>}
        {l.status === 'todo' && <button className={`${btn} !border-sky-400/40 !text-sky-300`} onClick={() => onSave({ status: 'contacted', next_followup: addDays(4) })}><Check size={12} />Mark emailed (follow up in 4 days)</button>}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-start">
        <label className="text-xs text-gray-500">Notes (who you spoke to, what they said)
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 4000))} onBlur={() => notes !== l.notes && onSave({ notes })}
            className={`${input} mt-1 resize-y`} placeholder="e.g. Spoke to Ankush, they want a quote for 300 teams" />
        </label>
        <label className="text-xs text-gray-500">Follow up on
          <div className="flex items-center gap-1 mt-1">
            <input type="date" value={l.next_followup || ''} onChange={(e) => onSave({ next_followup: e.target.value || null })} className={`${input} !w-auto`} />
            {l.next_followup && <button aria-label="Clear follow-up" className="p-1 text-gray-500 hover:text-white" onClick={() => onSave({ next_followup: null })}><X size={13} /></button>}
          </div>
          {fu !== null && fu <= 0 && <span className="text-orange-300">{fu === 0 ? 'Due today' : `Overdue by ${-fu}d`}</span>}
        </label>
      </div>

      {(l.updated_by || l.last_contacted_at) && (
        <p className="text-[11px] text-gray-600">
          {l.last_contacted_at && <>First contacted {when(l.last_contacted_at)} · </>}
          {l.updated_by && <>Last change by {l.updated_by}, {when(l.updated_at)}</>}
        </p>
      )}
    </li>
  );
}

const addDays = (n: number) => {
  const d = new Date(`${todayIst()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function AddLead({ onDone }: { onDone: (l: Lead | null) => void }) {
  const [f, setF] = useState({ event: '', organizer: '', event_date: '', sort_date: '', emails: '', phones: '', link: '', platform: '', priority: 'target' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    if (!f.event.trim()) { setErr('Event name is needed.'); return; }
    setBusy(true); setErr('');
    try {
      const row = await sbInsert<Lead>('outreach_leads', { ...f, sort_date: f.sort_date || null, event: f.event.trim() });
      onDone(row);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add.'); setBusy(false); }
  };
  const field = (k: keyof typeof f, label: string, ph = '', type = 'text') => (
    <label className="text-xs text-gray-400">{label}<input type={type} value={f[k]} onChange={set(k)} placeholder={ph} className={`${input} mt-1`} /></label>
  );
  return (
    <div className="bg-[#0a0f1a] border border-[#a3e635]/25 rounded-2xl p-5 space-y-3">
      <p className="text-white font-semibold text-sm">Add a lead</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {field('event', 'Event *', 'e.g. XYZ CTF 2026')}
        {field('organizer', 'Organiser / college', 'e.g. Cyber club, ABC College')}
        {field('event_date', 'Event date (as text)', 'e.g. 12–13 Dec 2026')}
        {field('sort_date', 'Event date (for sorting)', '', 'date')}
        {field('emails', 'Emails (comma separated)')}
        {field('phones', 'Phone / other contact')}
        {field('link', 'Event link', 'https://')}
        {field('platform', 'Platform note', 'e.g. no platform named')}
        <label className="text-xs text-gray-400">Priority
          <select value={f.priority} onChange={set('priority')} className={`${input} mt-1`}>
            <option value="target">🎯 Target (no platform)</option>
            <option value="maybe">Maybe (ask first)</option>
          </select>
        </label>
      </div>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="px-4 py-2 bg-[#a3e635] text-[#05080f] text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Add
        </button>
        <button onClick={() => onDone(null)} className={btn}>Cancel</button>
      </div>
    </div>
  );
}
