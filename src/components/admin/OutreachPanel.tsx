import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AtSign, Bell, CalendarPlus, Check, ChevronDown, Compass, Copy, Flag, Loader2, Mail, MessageCircle, Phone, Plus, RotateCw, Search, Send, X,
} from 'lucide-react';
import { sbInsert, sbRows, sbWrite } from './mailingApi';
import { CallsView, ComposeSheet, InboxList, MailTimeline, ScheduleSheet, SentList, type OutMail, type Reply } from './OutreachMail';
import { TeamView, colorOf, type Person } from './OutreachTeam';
import { AvailabilityPanel } from './AvailabilityPanel';
import { sbRpc } from './mailingApi';

/* =============================================================
   Admin → Outreach: CTF organisers to pitch Cyber HX hosting to.
   Data: supabase/outreach.sql (table outreach_leads). Visible to owners and the 'outreach' role only.
   Look: Apple-style frosted glass (backdrop blur, hairline borders, glass icon tiles, segmented controls).
============================================================= */

type Status = 'todo' | 'contacted' | 'replied' | 'meeting' | 'won' | 'lost' | 'skip';
interface Lead {
  id: string; event: string; organizer: string; event_date: string; sort_date: string | null; emails: string; phones: string;
  link: string; platform: string; priority: 'target' | 'maybe'; status: Status; notes: string; next_followup: string | null;
  last_contacted_at: string | null; updated_by: string | null; updated_at: string; owner_id?: string | null;
}

// iOS system colours (dark mode)
const STATUS: Record<Status, { label: string; color: string }> = {
  todo: { label: 'To contact', color: '#98989D' },
  contacted: { label: 'Contacted', color: '#0A84FF' },
  replied: { label: 'Replied', color: '#FF9F0A' },
  meeting: { label: 'Meeting set', color: '#BF5AF2' },
  won: { label: 'Won', color: '#30D158' },
  lost: { label: 'Not interested', color: '#FF453A' },
  skip: { label: 'Skip', color: '#636366' },
};
const ORDER: Status[] = ['todo', 'contacted', 'replied', 'meeting', 'won', 'lost', 'skip'];
const CLOSED: Status[] = ['won', 'lost', 'skip'];

/* ---------- glass building blocks ---------- */
const glass = 'bg-white/[0.045] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_40px_-12px_rgba(0,0,0,0.6)]';
const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 focus-visible:ring-offset-0';
const field = `w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/30 ${ring} focus:border-[#0A84FF]/60 transition-colors`;

function Dot({ children, color, size = 36 }: { children: ReactNode; color: string; size?: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full text-white" style={{ width: size, height: size, background: color }}>
      {children}
    </span>
  );
}

/** Contacts-style avatar: grey gradient circle with initials */
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full text-white font-medium"
      style={{ width: size, height: size, fontSize: size * 0.38, background: 'linear-gradient(180deg,#A5A5AA 0%,#78787E 100%)' }}>
      {initials(name)}
    </span>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; t: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[11px] bg-white/[0.07] p-[3px] border border-white/[0.06]">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={`px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] transition-all duration-200 whitespace-nowrap ${ring} ${value === o.v ? 'bg-white/[0.16] text-white shadow-[0_2px_8px_rgba(0,0,0,.35),inset_0_0.5px_0_rgba(255,255,255,.25)]' : 'text-white/55 hover:text-white/85'}`}>
          {o.t}
        </button>
      ))}
    </div>
  );
}

function Action({ icon, label, onClick, href, tint = '#0A84FF', external }: { icon: ReactNode; label: string; onClick?: () => void; href?: string; tint?: string; external?: boolean }) {
  const inner = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,.12)] transition-transform duration-150 group-active:scale-90" style={{ color: tint }}>{icon}</span>
      <span className="text-[11px] text-white/70 whitespace-nowrap">{label}</span>
    </>
  );
  const cls = `group flex w-full sm:w-[72px] flex-col items-center gap-1.5 rounded-xl py-1 ${ring}`;
  return href
    ? <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{inner}</a>
    : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

/* ---------- helpers ---------- */
const todayIst = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const daysTo = (d: string | null) => (d ? Math.round((new Date(`${d}T00:00:00+05:30`).getTime() - new Date(`${todayIst()}T00:00:00+05:30`).getTime()) / 864e5) : null);
const addDays = (n: number) => { const d = new Date(`${todayIst()}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const when = (d: string | null) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const emailsOf = (s: string) => s.split(/[,;\s]+/).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
const firstPhone = (s: string) => (s.match(/\+?\d[\d\s-]{8,}\d/) || [''])[0].replace(/[\s-]/g, '');
const initials = (s: string) => s.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '•';
const isDue = (l: Lead) => { const d = daysTo(l.next_followup); return d !== null && d <= 0 && !CLOSED.includes(l.status); };

let SIGN = 'Cyber HX Team'; // set by the panel: "Yashika\nCyber HX" for an outreach person
const pitchFor = (l: Pick<Lead, 'event' | 'organizer'>) => ({
  subject: `Hosting partner for ${l.event}: Cyber HX`,
  body: `Hi ${l.organizer.split(',')[0]} team,

Congrats on putting together ${l.event}. I'm reaching out from Cyber HX (cyberhx.com). We host and run CTFs for colleges and communities, including the platform, challenge hosting, live scoreboard and on-the-day support, so your team can focus on the event itself.

If you're still finalising infrastructure, or are planning your next edition, we'd be glad to help. We can also contribute original challenges.

Pricing and details: https://cyberhx.com/host-your-ctf

Would a quick 15-minute call this week work?

Best,
${SIGN}`,
});

/** Stand-in "lead" so you can answer a mail@ email from someone who isn't a lead (nothing is saved on a lead). */
const pseudoLead = (r: Reply): Lead => ({
  id: '', event: r.subject || r.from_email, organizer: r.from_name || r.from_email, event_date: '', sort_date: null, emails: r.from_email,
  phones: '', link: '', platform: '', priority: 'maybe', status: 'replied', notes: '', next_followup: null, last_contacted_at: null,
  updated_by: null, updated_at: r.received_at,
});

/** "New email" to anyone: not tied to a lead. */
const BLANK_LEAD: Lead = {
  id: '', event: '', organizer: '', event_date: '', sort_date: null, emails: '', phones: '', link: '', platform: '', priority: 'maybe',
  status: 'todo', notes: '', next_followup: null, last_contacted_at: null, updated_by: null, updated_at: '',
};

/** Answer to an organiser's reply: same thread, short. */
const replyFor = (r: Reply) => ({
  subject: /^re:/i.test(r.subject) ? r.subject : `Re: ${r.subject || 'Cyber HX'}`,
  body: `Hi ${(r.from_name || '').split(/\s+/)[0] || 'there'},

Thanks for getting back to us.



Best,
${SIGN}`,
});

/** Second email, when the first one got no answer. */
const followupFor = (l: Pick<Lead, 'event' | 'organizer'>, first?: OutMail) => ({
  subject: first ? `Re: ${first.subject.replace(/^Re:\s*/i, '')}` : `Following up: ${l.event}`,
  body: `Hi ${l.organizer.split(',')[0]} team,

Just following up on my earlier note about ${l.event}. If you're still deciding how to run the CTF (platform, challenges, scoreboard, support on the day), Cyber HX can take that off your plate.

Details: https://cyberhx.com/host-your-ctf

Would a short call this week or next help?

Best,
${SIGN}`,
});

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try {
      const a = document.createElement('textarea'); a.value = text; a.style.position = 'fixed'; a.style.opacity = '0';
      document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok;
    } catch { return false; }
  }
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded-[4px] bg-[#FFD60A]/30 px-0.5 text-white">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

/* =============================================================
   Panel
============================================================= */
export function OutreachPanel({ role = 'owner' }: { role?: string }) {
  const isOwner = role === 'owner';
  const [people, setPeople] = useState<Person[]>([]);
  /** Owner: whose dashboard is on screen ('' = everyone). Outreach person: always their own. */
  const [who, setWho] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q.trim().toLowerCase());
  const [view, setView] = useState<'open' | 'due' | 'all' | 'won'>('open');
  const [pri, setPri] = useState<'all' | 'target' | 'maybe'>('all');
  const [status, setStatus] = useState<Status | ''>('');
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [adding, setAdding] = useState(false);
  const [section, setSection] = useState<'leads' | 'inbox' | 'sent' | 'calls' | 'hours' | 'team'>('leads');
  const [mails, setMails] = useState<OutMail[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [compose, setCompose] = useState<{ lead: Lead; reply?: Reply; autoLink?: boolean; blank?: boolean } | null>(null);
  const [schedule, setSchedule] = useState<Lead | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastT = useRef<number>();

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [{ rows }, sent, inbox, team] = await Promise.all([
        sbRows<Lead>('outreach_leads?select=*&order=sort_date.asc.nullslast'),
        sbRows<OutMail>('outreach_mails?select=*&order=sent_at.desc&limit=1000').catch(() => ({ rows: [] as OutMail[] })),
        sbRows<Reply>('outreach_replies?select=*&order=received_at.desc&limit=500').catch(() => ({ rows: [] as Reply[] })),
        (isOwner ? sbRpc<Person[]>('outreach_team', {}) : sbRows<Person>('outreach_people?select=user_id,name,send_as').then((r) => r.rows)).catch(() => [] as Person[]),
      ]);
      setPeople(team);
      setLeads(rows);
      setMails(sent.rows);
      setReplies(inbox.rows);
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Could not load.';
      setErr(/missing|does not exist/i.test(m) ? 'Outreach table is missing: run supabase/outreach.sql in Supabase.' : m);
    }
    setLoading(false);
  }, [isOwner]);
  useEffect(() => { load(); }, [load]);

  // Who am I writing as? An outreach person = themselves. Owner = the person whose dashboard is open, else mail@.
  const self = !isOwner ? people[0] : undefined;
  const actor = self || (who ? people.find((p) => p.user_id === who) : undefined);
  const as = isOwner && actor ? actor.user_id : undefined;
  SIGN = actor ? `${actor.name}\nCyber HX` : 'Cyber HX Team';
  const nameOf = useCallback((id?: string | null) => people.find((p) => p.user_id === id)?.name || '', [people]);
  /** Email about a lead goes out as the lead's person (owner) or as yourself (outreach person). */
  const composeAs = (ownerId?: string | null) => {
    if (self) return { fromAddr: self.send_as };
    const p = people.find((x) => x.user_id === (ownerId || who));
    return p ? { as: p.user_id, fromAddr: p.send_as } : {};
  };

  // Owner looking at one person: only that person's leads / mail.
  const myLeads = useMemo(() => (isOwner && who ? leads.filter((l) => l.owner_id === who) : leads), [leads, isOwner, who]);
  const myMails = useMemo(() => (isOwner && who ? mails.filter((m) => m.sent_by_id === who) : mails), [mails, isOwner, who]);
  // The Inbox is shared: everyone on Outreach sees all mail to mail@cyberhx.com (lead links stay per person).
  const myReplies = replies;
  const pickPerson = useCallback((id: string, to: typeof section = 'leads') => { setWho(id); setSection(to); setOpen(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  // ⌘K / Ctrl+K / "/" focuses search (Spotlight-style)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName || '');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const notify = useCallback((m: string) => {
    setToast(m); window.clearTimeout(toastT.current); toastT.current = window.setTimeout(() => setToast(''), 1700);
  }, []);

  const save = useCallback(async (id: string, patch: Partial<Lead>) => {
    let prev: Lead[] = [];
    setSaving(id);
    setLeads((ls) => { prev = ls; return ls.map((x) => (x.id === id ? { ...x, ...patch } : x)); });
    try { await sbWrite('PATCH', `outreach_leads?id=eq.${id}`, patch); notify('Saved'); }
    catch (e) { setLeads(prev); setErr(e instanceof Error ? e.message : 'Could not save.'); }
    setSaving(null);
  }, [notify]);

  // One lowercase search string per lead, built once per data change
  const index = useMemo(() => new Map(myLeads.map((l) => [l.id,
    `${l.event} ${l.organizer} ${l.emails} ${l.phones} ${l.notes} ${l.platform} ${l.event_date} ${STATUS[l.status].label} ${nameOf(l.owner_id)}`.toLowerCase()])), [myLeads, nameOf]);

  const shown = useMemo(() => {
    const words = dq.split(/\s+/).filter(Boolean);
    return myLeads
      .filter((l) => (view === 'open' ? !CLOSED.includes(l.status) : view === 'due' ? isDue(l) : view === 'won' ? l.status === 'won' : true))
      .filter((l) => pri === 'all' || l.priority === pri)
      .filter((l) => !status || l.status === status)
      .filter((l) => !words.length || words.every((w) => index.get(l.id)!.includes(w)))
      .sort((a, b) => Number(isDue(b)) - Number(isDue(a))
        || (a.priority === b.priority ? 0 : a.priority === 'target' ? -1 : 1)
        || (a.sort_date || '9999').localeCompare(b.sort_date || '9999'));
  }, [myLeads, index, dq, view, pri, status]);

  const stats = useMemo(() => {
    const c = Object.fromEntries(ORDER.map((s) => [s, 0])) as Record<Status, number>;
    myLeads.forEach((l) => { c[l.status]++; });
    return { c, due: myLeads.filter(isDue).length };
  }, [myLeads]);

  const mailsByLead = useMemo(() => {
    const m = new Map<string, OutMail[]>();
    myMails.forEach((x) => { if (x.lead_id) m.set(x.lead_id, [...(m.get(x.lead_id) || []), x]); });
    return m;
  }, [myMails]);
  const repliesByLead = useMemo(() => {
    const m = new Map<string, Reply[]>();
    myReplies.forEach((x) => { if (x.lead_id) m.set(x.lead_id, [...(m.get(x.lead_id) || []), x]); });
    return m;
  }, [myReplies]);
  const unread = myReplies.filter((r) => !r.read_at).length;
  const markRead = useCallback((r: Reply) => {
    const at = new Date().toISOString();
    setReplies((rs) => rs.map((x) => (x.id === r.id ? { ...x, read_at: at } : x)));
    sbWrite('PATCH', `outreach_replies?id=eq.${r.id}`, { read_at: at }).catch(() => { /* stays unread next load */ });
  }, []);
  const leadMap = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const openCompose = useCallback((l: Lead, reply?: Reply) => setCompose({ lead: l, reply }), []);
  const openLead = useCallback((id: string) => { setSection('leads'); setQ(''); setView('all'); setStatus(''); setPri('all'); setOpen(id); }, []);
  const onSent = (l: Lead, m: OutMail | null) => {
    setCompose(null);
    if (m) setMails((ms) => [m, ...ms]);
    if (!l.id) { /* reply to someone who isn't a lead */ }
    else if (l.status === 'todo') save(l.id, { status: 'contacted', next_followup: l.next_followup || addDays(4) });
    else if (!l.next_followup) save(l.id, { next_followup: addDays(4) });
    setTimeout(() => notify('Email sent'), 50);
  };

  /** "Add as lead" on an inbox mail from someone new: creates the lead and links the mail to it. */
  const makeLead = useCallback(async (r: Reply) => {
    try {
      const domain = r.from_email.split('@')[1] || '';
      const l = await sbInsert<Lead>('outreach_leads', {
        event: r.subject.replace(/^(re|fwd?):\s*/i, '').slice(0, 120) || `Lead from ${r.from_name || r.from_email}`,
        organizer: r.from_name || domain, emails: r.from_email, platform: 'Came in by email', priority: 'target', status: 'replied',
        ...(isOwner ? { owner_id: r.owner_id || who || null } : {}),
      });
      setLeads((ls) => [...ls, l]);
      setReplies((rs) => rs.map((x) => (x.from_email === r.from_email && !x.lead_id ? { ...x, lead_id: l.id } : x)));
      await sbWrite('PATCH', `outreach_replies?from_email=eq.${encodeURIComponent(r.from_email)}&lead_id=is.null`, { lead_id: l.id });
      notify('Lead added');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add the lead.'); }
  }, [notify, isOwner, who]);

  const filtersOn = !!(dq || status || pri !== 'all' || view !== 'open');

  return (
    <div className="relative">
      {/* Title */}
      <header className="mb-5 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div>
            <h2 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] text-white leading-none">Outreach</h2>
            <p className="mt-1.5 text-[13px] text-white/50">
              {actor ? <>{isOwner ? `${actor.name}'s dashboard` : `Hi ${actor.name}`} · sending as <span className="text-white/75">{actor.send_as}</span> · </> : isOwner ? 'Everyone · ' : ''}
              {myLeads.length} {myLeads.length === 1 ? 'lead' : 'leads'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} aria-label="Refresh" className={`h-10 w-10 rounded-full ${glass} flex items-center justify-center text-white/80 hover:text-white ${ring}`}>
            <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setCompose({ lead: BLANK_LEAD, blank: true })} aria-label="New email"
            className={`h-10 rounded-full ${glass} px-3.5 sm:px-4 text-[14px] font-medium text-white flex items-center gap-1.5 hover:bg-white/[0.1] active:scale-95 transition ${ring}`}>
            <Mail size={16} /><span className="hidden sm:inline">New email</span>
          </button>
          <button onClick={() => setAdding(true)} className={`h-10 rounded-full bg-[#0A84FF] px-4 text-[14px] font-semibold text-white shadow-[0_6px_20px_-6px_#0A84FF,inset_0_1px_0_rgba(255,255,255,.3)] hover:bg-[#409CFF] active:scale-95 transition flex items-center gap-1.5 ${ring}`}>
            <Plus size={17} strokeWidth={2.5} /><span className="hidden sm:inline">Add lead</span>
          </button>
        </div>
      </header>

      {/* Owner: whose dashboard */}
      {isOwner && people.length > 0 && (
        <div className="mb-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="Whose dashboard">
          {[{ user_id: '', name: 'Everyone' } as Pick<Person, 'user_id' | 'name'>, ...people].map((p) => {
            const on = who === p.user_id;
            const n = p.user_id ? leads.filter((l) => l.owner_id === p.user_id).length : leads.length;
            return (
              <button key={p.user_id || 'all'} role="radio" aria-checked={on} onClick={() => { setWho(p.user_id); if (section === 'team' || (section === 'hours' && !p.user_id)) setSection('leads'); setOpen(null); }}
                className={`shrink-0 flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1.5 text-[14px] border transition ${ring} ${on ? 'bg-white/[0.16] text-white border-white/[0.18]' : 'text-white/65 border-white/[0.08] bg-white/[0.04] hover:text-white'}`}>
                <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: p.user_id ? colorOf(people, p.user_id) : '#636366' }}>{p.user_id ? p.name.slice(0, 1) : '∗'}</span>
                {p.name}<span className="tabular-nums text-white/40 text-[12.5px]">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-5 -mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Segmented label="Section" value={section} onChange={setSection}
          options={[
            { v: 'leads', t: 'Leads' }, { v: 'inbox', t: `Inbox${unread ? ` · ${unread}` : ''}` }, { v: 'sent', t: `Sent${myMails.length ? ` · ${myMails.length}` : ''}` }, { v: 'calls', t: 'Calls' },
            ...(actor ? [{ v: 'hours' as const, t: 'Call hours' }] : []),
            ...(isOwner ? [{ v: 'team' as const, t: 'Team' }] : []),
          ]} />
      </div>

      {section === 'inbox' && <InboxList replies={myReplies} leads={leadMap} onRead={markRead} onOpenLead={openLead}
        onReply={(r) => setCompose({ lead: (r.lead_id && leadMap.get(r.lead_id)) || pseudoLead(r), reply: r })}
        onMakeLead={makeLead} />}
      {section === 'sent' && <SentList mails={myMails} leads={leadMap} onOpenLead={openLead} />}
      {section === 'calls' && <CallsView key={who || 'all'} onToast={notify} as={as} />}
      {section === 'hours' && actor && <div className="ios-hours"><AvailabilityPanel key={actor.user_id} person={{ id: actor.user_id, name: actor.name, self: !isOwner }} /></div>}
      {section === 'team' && isOwner && (
        <TeamView people={people} leads={leads} mails={mails} onReload={load} onToast={notify}
          onOpen={(id) => pickPerson(id, 'leads')} onHours={(id) => pickPerson(id, 'hours')} />
      )}

      {section === 'leads' && <>
      {/* Widgets */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { k: 'todo', label: 'To contact', n: stats.c.todo, tint: '#0A84FF', icon: <Send size={17} />, go: () => { setView('open'); setStatus('todo'); } },
          { k: 'due', label: 'Follow-ups due', n: stats.due, tint: '#FF9F0A', icon: <Bell size={17} />, go: () => { setView('due'); setStatus(''); } },
          { k: 'talk', label: 'In talks', n: stats.c.replied + stats.c.meeting, tint: '#BF5AF2', icon: <MessageCircle size={17} />, go: () => { setView('open'); setStatus(stats.c.meeting && !stats.c.replied ? 'meeting' : 'replied'); } },
          { k: 'won', label: 'Won', n: stats.c.won, tint: '#30D158', icon: <Flag size={17} />, go: () => { setView('won'); setStatus(''); } },
        ]).map((w) => (
          <button key={w.k} onClick={w.go} className={`${glass} rounded-[22px] p-3 sm:p-4 text-left flex items-center gap-3 sm:block transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${ring}`}>
            <Dot color={w.tint}>{w.icon}</Dot>
            <span className="block min-w-0">
            <p className="sm:mt-3 text-[24px] sm:text-[28px] font-semibold tracking-tight text-white leading-none tabular-nums">{w.n}</p>
            <p className="mt-0.5 sm:mt-1 text-[12px] sm:text-[12.5px] text-white/55 truncate">{w.label}</p>
            </span>
          </button>
        ))}
      </div>

      {/* Spotlight search + filters (sticky) */}
      <div className="sticky top-2 z-20 mb-4">
        <div className={`${glass} rounded-[22px] p-2.5 sm:p-3 bg-[#0b0f17]/70`}>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45" />
            <input
              ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} type="search" inputMode="search" enterKeyHint="search"
              placeholder="Search events, colleges, emails, notes…" aria-label="Search leads"
              onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }}
              className={`w-full h-12 rounded-[14px] bg-white/[0.08] border border-white/[0.06] pl-11 pr-24 text-[16px] text-white placeholder:text-white/35 ${ring} focus:bg-white/[0.11] transition-colors [&::-webkit-search-cancel-button]:hidden`}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {q ? (
                <button onClick={() => { setQ(''); searchRef.current?.focus(); }} aria-label="Clear search" className="h-7 w-7 rounded-full bg-white/15 text-white/80 flex items-center justify-center hover:bg-white/25"><X size={14} /></button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-white/50 font-sans">⌘K</kbd>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Segmented label="Show" value={view} onChange={(v) => { setView(v); setStatus(''); }}
              options={[{ v: 'open', t: 'Open' }, { v: 'due', t: `Due${stats.due ? ` · ${stats.due}` : ''}` }, { v: 'won', t: 'Won' }, { v: 'all', t: 'All' }]} />
            <Segmented label="Priority" value={pri} onChange={setPri}
              options={[{ v: 'all', t: 'Everyone' }, { v: 'target', t: 'No platform' }, { v: 'maybe', t: 'Maybe' }]} />
          </div>

          <div className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Status">
            {ORDER.map((s) => {
              const on = status === s;
              return (
                <button key={s} onClick={() => { setStatus(on ? '' : s); if (!on && CLOSED.includes(s)) setView('all'); }} aria-pressed={on}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] border transition ${ring} ${on ? 'text-white border-transparent' : 'text-white/65 border-white/[0.08] bg-white/[0.04] hover:text-white'}`}
                  style={on ? { background: `${STATUS[s].color}40`, boxShadow: `inset 0 0 0 1px ${STATUS[s].color}90` } : undefined}>
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS[s].color }} />
                  {STATUS[s].label}<span className="tabular-nums text-white/40">{stats.c[s]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {err && <p role="alert" className="mb-3 rounded-2xl bg-[#FF453A]/15 border border-[#FF453A]/30 px-4 py-3 text-[14px] text-[#FF9F9A]">{err}</p>}

      {/* Results line */}
      <div className="mb-2 flex items-center justify-between px-1 text-[12.5px] text-white/45">
        <span aria-live="polite">{shown.length} {shown.length === 1 ? 'lead' : 'leads'}{dq ? ` for “${q.trim()}”` : ''}</span>
        {filtersOn && <button onClick={() => { setQ(''); setView('open'); setPri('all'); setStatus(''); }} className="text-[#0A84FF] hover:text-[#409CFF]">Reset</button>}
      </div>

      {/* List */}
      {loading && !leads.length ? (
        <div className={`${glass} rounded-[22px] p-10 flex justify-center`}><Loader2 className="animate-spin text-white/60" /></div>
      ) : !shown.length ? (
        <div className={`${glass} rounded-[22px] px-6 py-12 text-center`}>
          <p className="text-white font-medium">No results</p>
          <p className="mt-1 text-[13px] text-white/50">Try another word, or reset the filters.</p>
        </div>
      ) : (
        <ul className={`${glass} rounded-[22px] overflow-hidden divide-y divide-white/[0.06]`}>
          {shown.map((l) => (
            <LeadRow key={l.id} l={l} q={dq.split(/\s+/)[0] || ''} expanded={open === l.id} saving={saving === l.id}
              onToggle={setOpen} onSave={save} onToast={notify} mails={mailsByLead.get(l.id)} replies={repliesByLead.get(l.id)}
              onCompose={openCompose} onRead={markRead} onSchedule={setSchedule}
              owner={isOwner ? { people, showChip: !who } : undefined} />
          ))}
        </ul>
      )}
      </>}

      {schedule && (
        <ScheduleSheet lead={schedule} onClose={() => setSchedule(null)} as={isOwner ? (schedule.owner_id && people.some((p) => p.user_id === schedule.owner_id) ? schedule.owner_id : as) : undefined}
          onLetThemPick={() => { const l = schedule; setSchedule(null); setCompose({ lead: l, autoLink: true }); }}
          onBooked={(bk) => {
            const l = schedule; setSchedule(null);
            const when = new Date(bk.start).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
            const line = `Call booked: ${when} IST with ${bk.to.join(', ')}${bk.meetLink ? ` · ${bk.meetLink}` : ''}`;
            save(l.id, { status: CLOSED.includes(l.status) ? l.status : 'meeting', notes: l.notes ? `${l.notes}\n${line}` : line });
            setTimeout(() => notify(`Call booked for ${when} IST`), 60);
          }} />
      )}
      {compose && (
        <ComposeSheet lead={compose.lead} replyTo={compose.reply} autoLink={compose.autoLink}
          {...composeAs(compose.lead.owner_id || compose.reply?.owner_id)}
          pitch={compose.blank ? { subject: '', body: `Hi,\n\n\n\nBest,\n${SIGN}` } : compose.reply ? replyFor(compose.reply)
            : mailsByLead.get(compose.lead.id)?.length ? followupFor(compose.lead, mailsByLead.get(compose.lead.id)!.slice(-1)[0]) : pitchFor(compose.lead)}
          onClose={() => setCompose(null)} onSent={(m) => onSent(compose.lead, m)} />
      )}

      {adding && <AddLeadSheet owners={isOwner ? people : undefined} defaultOwner={who} onClose={() => setAdding(false)} onAdded={(l) => { setLeads((ls) => [...ls, l]); setAdding(false); setOpen(l.id); notify('Lead added'); }} />}

      {/* iOS-style toast */}
      <div aria-live="polite" className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <span className={`${glass} bg-[#1c1c1e]/80 rounded-full px-4 py-2.5 text-[14px] text-white flex items-center gap-2`}><Check size={16} className="text-[#30D158]" />{toast}</span>
      </div>
    </div>
  );
}

/* =============================================================
   One lead: compact row, tap to expand
============================================================= */
const NO_MAILS: OutMail[] = [];
const NO_REPLIES: Reply[] = [];
type OwnerCtx = { people: Person[]; showChip: boolean };
const LeadRow = memo(function LeadRow({ l, q, expanded, saving, onToggle, onSave, onToast, mails = NO_MAILS, replies = NO_REPLIES, onCompose, onRead, onSchedule, owner }: {
  l: Lead; q: string; expanded: boolean; saving: boolean; owner?: OwnerCtx;
  onToggle: (id: string | null) => void; onSave: (id: string, p: Partial<Lead>) => void; onToast: (m: string) => void;
  mails?: OutMail[]; replies?: Reply[]; onCompose: (l: Lead, reply?: Reply) => void; onRead: (r: Reply) => void; onSchedule: (l: Lead) => void;
}) {
  const newReplies = replies.filter((r) => !r.read_at).length;
  const d = daysTo(l.sort_date);
  const due = isDue(l);
  const st = STATUS[l.status];
  const bodyId = `lead-${l.id}`;

  return (
    <li className={`transition-colors ${expanded ? 'bg-white/[0.035]' : ''} ${l.status === 'skip' || l.status === 'lost' ? 'opacity-55' : ''}`}>
      <button onClick={() => onToggle(expanded ? null : l.id)} aria-expanded={expanded} aria-controls={bodyId}
        className={`w-full flex items-center gap-3 sm:gap-4 px-3.5 sm:px-5 py-3.5 text-left hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors ${ring}`}>
        <Avatar name={l.event} size={42} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[15.5px] font-semibold text-white tracking-[-0.01em]">
            <span className="truncate"><Highlight text={l.event} q={q} /></span>

          </p>
          <p className="truncate text-[13px] text-white/50"><Highlight text={l.organizer} q={q} /></p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-white/40">
            {l.event_date}{l.priority === 'maybe' && <span>· Maybe</span>}
            {d !== null && d >= 0 && d <= 7 && <span className="text-[#FF9F0A]">· {d === 0 ? 'today' : `in ${d}d`}</span>}
            {due && <span className="text-[#FF9F0A]">· Follow up</span>}
            {mails.length > 0 && <span>· {mails.length} email{mails.length > 1 ? 's' : ''} sent</span>}
            {newReplies > 0 && <span className="font-medium text-[#0A84FF]">· New reply</span>}
            {owner?.showChip && (() => {
              const p = owner.people.find((x) => x.user_id === l.owner_id);
              return <span className="inline-flex items-center gap-1">· <span className="h-1.5 w-1.5 rounded-full" style={{ background: p ? colorOf(owner.people, p.user_id) : '#636366' }} />{p ? p.name : 'Not assigned'}</span>;
            })()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin text-white/40" />}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: `${st.color}24`, color: st.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />{st.label}
          </span>
          <span className="sm:hidden h-2.5 w-2.5 rounded-full" style={{ background: st.color }} aria-label={st.label} />
          <ChevronDown size={18} className={`text-white/35 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Smooth expand (grid rows 0fr → 1fr); details only mount when opened */}
      <div id={bodyId} className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">{expanded && <LeadDetails l={l} onSave={onSave} onToast={onToast} mails={mails} replies={replies} onCompose={onCompose} onRead={onRead} onSchedule={onSchedule} owner={owner} />}</div>
      </div>
    </li>
  );
});

function LeadDetails({ l, onSave, onToast, mails: sent, replies, onCompose, onRead, onSchedule, owner }: {
  l: Lead; onSave: (id: string, p: Partial<Lead>) => void; onToast: (m: string) => void; mails: OutMail[]; replies: Reply[]; owner?: OwnerCtx;
  onCompose: (l: Lead, reply?: Reply) => void; onRead: (r: Reply) => void; onSchedule: (l: Lead) => void;
}) {
  const [notes, setNotes] = useState(l.notes);
  useEffect(() => setNotes(l.notes), [l.notes]);
  const mails = emailsOf(l.emails);
  const phone = firstPhone(l.phones);
  const pitch = pitchFor(l);
  const fu = daysTo(l.next_followup);
  const copy = async (t: string, m: string) => onToast((await copyText(t)) ? m : 'Copy failed');

  return (
    <div className="px-3.5 sm:px-5 pb-5 pt-1 sm:pl-[84px] space-y-4">
      {/* Actions */}
      <div className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:-ml-1">
        <Action icon={<Mail size={19} />} label={sent.length ? 'Follow up' : 'Email'} onClick={() => onCompose(l)} />
        <Action icon={<CalendarPlus size={19} />} label="Schedule" onClick={() => onSchedule(l)} />
        <Action icon={<Copy size={18} />} label="Copy pitch" onClick={() => copy(`Subject: ${pitch.subject}\n\n${pitch.body}`, 'Pitch copied')} />
        {mails.length > 0 && <Action icon={<AtSign size={18} />} label="Copy email" onClick={() => copy(mails.join(', '), 'Email copied')} />}
        {phone && <Action icon={<Phone size={18} />} label="Call" href={`tel:${phone}`} />}
        {l.link && /^https?:\/\//i.test(l.link) && <Action icon={<Compass size={18} />} label="Event" href={l.link} external />}
      </div>

      {/* Status */}
      <div>
        <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-white/40">Status</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ORDER.map((s) => {
            const on = l.status === s;
            return (
              <button key={s} onClick={() => !on && onSave(l.id, s === 'contacted' && !l.next_followup ? { status: s, next_followup: addDays(4) } : { status: s })} aria-pressed={on}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium border transition ${ring} ${on ? 'text-white border-transparent' : 'text-white/60 border-white/[0.08] bg-white/[0.04] hover:text-white'}`}
                style={on ? { background: STATUS[s].color, boxShadow: `0 4px 14px -4px ${STATUS[s].color}` } : undefined}>
                {STATUS[s].label}
              </button>
            );
          })}
        </div>
        {l.status === 'todo' && <p className="mt-1.5 text-[12px] text-white/40">Tap <span className="text-[#0A84FF]">Email</span> to send the pitch. After it's sent this changes to Contacted, with a follow-up 4 days later.</p>}
      </div>

      {/* Info group, iOS Settings style */}
      <dl className="rounded-2xl bg-white/[0.04] border border-white/[0.06] divide-y divide-white/[0.06] text-[14px]">
        <Info k="Emails">{mails.length ? <span className="font-mono text-[13px] break-all select-all text-white/85">{mails.join(', ')}</span> : <span className="text-white/35">Not published</span>}</Info>
        {l.phones && <Info k="Phone"><span className="select-all break-all text-white/85">{l.phones}</span></Info>}
        <Info k="Platform"><span className="text-white/70">{l.priority === 'target' ? 'None found · ' : 'Ask first · '}{l.platform || '—'}</span></Info>
        <Info k="Event date"><span className="text-white/70">{l.event_date}</span></Info>
        {owner && (
          <Info k="Handled by">
            <select value={owner.people.some((p) => p.user_id === l.owner_id) ? l.owner_id || '' : ''} onChange={(e) => onSave(l.id, { owner_id: e.target.value || null })}
              aria-label="Handled by" className="rounded-lg bg-white/[0.06] border border-white/[0.08] px-2 py-1 text-[14px] text-white">
              <option value="">Not assigned</option>
              {owner.people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name} ({p.send_as})</option>)}
            </select>
          </Info>
        )}
      </dl>

      <MailTimeline mails={sent} replies={replies} onReply={(r) => onCompose(l, r)} onRead={onRead} />

      {/* Notes + follow-up */}
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-white/40">Notes</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 4000))} onBlur={() => notes !== l.notes && onSave(l.id, { notes })}
            className={`${field} resize-y`} placeholder="Who you spoke to, what they said…" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-white/40">Follow up on</span>
          <div className="relative">
            <input type="date" value={l.next_followup || ''} onChange={(e) => onSave(l.id, { next_followup: e.target.value || null })} className={`${field} [color-scheme:dark]`} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[2, 4, 7].map((n) => (
              <button key={n} type="button" onClick={() => onSave(l.id, { next_followup: addDays(n) })} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] text-white/70 hover:text-white">+{n}d</button>
            ))}
            {l.next_followup && <button type="button" onClick={() => onSave(l.id, { next_followup: null })} className="rounded-full px-2 py-1 text-[12px] text-[#FF453A]">Clear</button>}
          </div>
          {fu !== null && fu <= 0 && !CLOSED.includes(l.status) && <p className="mt-1 text-[12px] text-[#FF9F0A]">{fu === 0 ? 'Due today' : `Overdue by ${-fu} day${fu < -1 ? 's' : ''}`}</p>}
        </label>
      </div>

      {(l.updated_by || l.last_contacted_at) && (
        <p className="text-[11.5px] text-white/30">
          {l.last_contacted_at && <>Contacted {when(l.last_contacted_at)} · </>}
          {l.updated_by && <>Last change by {l.updated_by}, {when(l.updated_at)}</>}
        </p>
      )}
    </div>
  );
}

function Info({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-white/45 sm:w-24 text-[13px]">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/* =============================================================
   Add lead: bottom sheet on phones, centred card on desktop
============================================================= */
function AddLeadSheet({ onClose, onAdded, owners, defaultOwner = '' }: { onClose: () => void; onAdded: (l: Lead) => void; owners?: Person[]; defaultOwner?: string }) {
  const [f, setF] = useState({ event: '', organizer: '', event_date: '', sort_date: '', emails: '', phones: '', link: '', platform: '', priority: 'target' });
  const [ownerId, setOwnerId] = useState(defaultOwner);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = o; };
  }, [onClose]);

  const submit = async () => {
    if (!f.event.trim()) { setErr('Event name is needed.'); return; }
    setBusy(true); setErr('');
    try { onAdded(await sbInsert<Lead>('outreach_leads', { ...f, event: f.event.trim(), sort_date: f.sort_date || null, ...(owners ? { owner_id: ownerId || null } : {}) })); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not add.'); setBusy(false); }
  };
  const row = (k: keyof typeof f, label: string, ph = '', type = 'text', mode?: 'email' | 'tel' | 'url') => (
    <label className="block">
      <span className="mb-1 block text-[12.5px] text-white/50">{label}</span>
      <input type={type} inputMode={mode} value={f[k]} onChange={set(k)} placeholder={ph} className={`${field} [color-scheme:dark]`} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="add-lead-h">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className={`relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] ${glass} bg-[#1c1c1e]/85 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/25 sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onClose} className="text-[16px] text-[#0A84FF]">Cancel</button>
          <h3 id="add-lead-h" className="text-[17px] font-semibold text-white">New lead</h3>
          <button onClick={submit} disabled={busy} className="text-[16px] font-semibold text-[#0A84FF] disabled:opacity-40 flex items-center gap-1">
            {busy && <Loader2 size={14} className="animate-spin" />}Add
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">{row('event', 'Event *', 'e.g. XYZ CTF 2026')}</div>
          <div className="sm:col-span-2">{row('organizer', 'Organiser / college', 'e.g. Cyber club, ABC College')}</div>
          {row('event_date', 'Event date', 'e.g. 12–13 Dec 2026')}
          {row('sort_date', 'Date (for sorting)', '', 'date')}
          <div className="sm:col-span-2">{row('emails', 'Emails', 'a@college.edu, b@club.in', 'text', 'email')}</div>
          {row('phones', 'Phone / other contact', '+91…', 'text', 'tel')}
          {row('link', 'Event link', 'https://', 'url', 'url')}
          <div className="sm:col-span-2">{row('platform', 'Platform note', 'e.g. no platform named')}</div>
          {owners && owners.length > 0 && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[12.5px] text-white/50">Handled by</span>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={field}>
                <option value="">Not assigned</option>
                {owners.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <div className="sm:col-span-2">
            <span className="mb-1 block text-[12.5px] text-white/50">Priority</span>
            <Segmented label="Priority" value={f.priority as 'target' | 'maybe'} onChange={(v) => setF((p) => ({ ...p, priority: v }))}
              options={[{ v: 'target', t: 'No platform' }, { v: 'maybe', t: 'Maybe' }]} />
          </div>
        </div>
        {err && <p role="alert" className="mt-3 text-[14px] text-[#FF453A]">{err}</p>}
      </div>
    </div>
  );
}
