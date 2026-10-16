/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, RefreshCw, Loader2, Trash2, ChevronDown, ChevronUp, Mail, Phone, CalendarClock,
  Briefcase, Flag, Building2, Inbox, AlertTriangle, Save, GraduationCap, ExternalLink, FileText, MessageSquare,
} from 'lucide-react';
import { sbSelect, sbUpdate, sbRemove, timeAgo, fmtDateTime, SUPABASE_URL, SUPABASE_KEY, getAdminToken } from './adminApi';
import type { MeetingKind } from './MeetingsPanel';

type Row = { id: string; status: string; admin_notes: string | null; created_at: string } & Record<string, any>;

interface Field { label: string; key: string; long?: boolean; link?: boolean; file?: string /* storage bucket */ }

interface Config {
  table: string;
  kind: MeetingKind;
  noun: string; // "application" | "request"
  statuses: { value: string; label: string; cls: string }[];
  name: (r: Row) => string;
  tag: (r: Row) => string;
  tagIcon: React.ReactNode;
  tagLabel: string; // "Applied for" | "CTF event"
  subline: (r: Row) => string;
  fields: Field[];
  searchKeys: string[];
  mailSubject: (r: Row) => string;
}

const STATUS_CLS = {
  new: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  good: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  mid: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  done: 'bg-green-500/15 text-green-300 border-green-500/30',
  bad: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const pretty = (s: string) =>
  !s ? '' : /\s/.test(s) || !/[-_]/.test(s) ? s : s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const APPLICATIONS: Config = {
  table: 'job_applications',
  kind: 'interview',
  noun: 'application',
  statuses: [
    { value: 'new', label: 'New', cls: STATUS_CLS.new },
    { value: 'shortlisted', label: 'Shortlisted', cls: STATUS_CLS.good },
    { value: 'interviewed', label: 'Interviewed', cls: STATUS_CLS.mid },
    { value: 'hired', label: 'Hired', cls: STATUS_CLS.done },
    { value: 'rejected', label: 'Rejected', cls: STATUS_CLS.bad },
  ],
  name: (r) => r.full_name,
  tag: (r) => pretty(r.position) || 'Not specified',
  tagIcon: <Briefcase size={13} />,
  tagLabel: 'Applied for',
  subline: (r) => [r.college, r.year && `Year ${r.year}`, r.branch].filter(Boolean).join(' · '),
  fields: [
    { label: 'Email', key: 'email', link: true },
    { label: 'Phone', key: 'phone' },
    { label: 'College', key: 'college' },
    { label: 'Year', key: 'year' },
    { label: 'Branch', key: 'branch' },
    { label: 'CGPA', key: 'cgpa' },
    { label: 'Experience', key: 'experience' },
    { label: 'Availability', key: 'availability' },
    { label: 'Portfolio / links', key: 'portfolio', link: true },
    { label: 'Resume', key: 'resume_path', file: 'applications' },
    { label: 'Resume note', key: 'resume_note' },
    { label: 'Skills', key: 'skills' },
    { label: 'Why CyberHx?', key: 'motivation', long: true },
  ],
  searchKeys: ['full_name', 'email', 'position', 'college', 'phone'],
  mailSubject: (r) => `CyberHx - your application for ${pretty(r.position) || 'an internship'}`,
};

const CTF: Config = {
  table: 'ctf_requests',
  kind: 'ctf',
  noun: 'request',
  statuses: [
    { value: 'new', label: 'New', cls: STATUS_CLS.new },
    { value: 'contacted', label: 'Contacted', cls: STATUS_CLS.mid },
    { value: 'scheduled', label: 'Call scheduled', cls: STATUS_CLS.good },
    { value: 'done', label: 'Done', cls: STATUS_CLS.done },
    { value: 'declined', label: 'Declined', cls: STATUS_CLS.bad },
  ],
  name: (r) => r.name,
  tag: (r) => r.event_name || 'Unnamed event',
  tagIcon: <Flag size={13} />,
  tagLabel: 'Wants to host',
  subline: (r) => [r.organization, r.event_format, r.participants && `${r.participants} participants`].filter(Boolean).join(' · '),
  fields: [
    { label: 'Email', key: 'email', link: true },
    { label: 'Phone', key: 'phone' },
    { label: 'Organization', key: 'organization' },
    { label: 'Organization URL', key: 'organization_url', link: true },
    { label: 'Event name', key: 'event_name' },
    { label: 'Format', key: 'event_format' },
    { label: 'Preferred date', key: 'event_date' },
    { label: 'Participants', key: 'participants' },
    { label: 'Budget', key: 'budget' },
    { label: 'Order ID', key: 'order_id' },
    { label: 'Order total', key: 'order_total' },
    { label: 'Order', key: 'order_items', long: true },
    { label: 'Requirements', key: 'requirements', long: true },
    { label: 'Message', key: 'message', long: true },
  ],
  searchKeys: ['name', 'email', 'organization', 'event_name', 'phone'],
  mailSubject: (r) => `CyberHx - your CTF hosting request${r.event_name ? ` (${r.event_name})` : ''}`,
};

const FORM_LABEL: Record<string, string> = {
  contact: 'Contact message',
  partnership: 'Partnership',
  registration: 'Hackathon registration',
  mentor: 'Mentor application',
  session: 'Session booking',
  other: 'Other',
};

const INBOX: Config = {
  table: 'form_submissions',
  kind: 'other',
  noun: 'message',
  statuses: [
    { value: 'new', label: 'New', cls: STATUS_CLS.new },
    { value: 'read', label: 'Read', cls: STATUS_CLS.mid },
    { value: 'replied', label: 'Replied', cls: STATUS_CLS.done },
    { value: 'archived', label: 'Archived', cls: STATUS_CLS.bad },
  ],
  name: (r) => r.name,
  tag: (r) => r.subject || FORM_LABEL[r.form] || pretty(r.form),
  tagIcon: <MessageSquare size={13} />,
  tagLabel: 'About',
  subline: (r) => [FORM_LABEL[r.form] || pretty(r.form), r.page && `from ${r.page}`].filter(Boolean).join(' · '),
  fields: [
    { label: 'Email', key: 'email', link: true },
    { label: 'Phone', key: 'phone' },
    { label: 'Form', key: 'form' },
    { label: 'Page', key: 'page' },
    { label: 'Message', key: 'message', long: true },
  ],
  searchKeys: ['name', 'email', 'subject', 'message', 'form'],
  mailSubject: (r) => `Re: ${r.subject || 'your message to CyberHx'}`,
};

/** Opens a private file (e.g. a resume) with a link that works for 10 minutes. */
async function openPrivateFile(bucket: string, path: string) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${getAdminToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 600 }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.signedURL) throw new Error(data?.message || 'Could not open the file');
  window.open(`${SUPABASE_URL}/storage/v1${data.signedURL}`, '_blank', 'noopener');
}

const isUrl = (v: string) => /^https?:\/\//i.test(v);

const RequestCard: React.FC<{
  row: Row;
  cfg: Config;
  onStatus: (s: string) => void;
  onDelete: () => void;
  onSaveNotes: (n: string) => Promise<void>;
  onSchedule: () => void;
}> = ({ row, cfg, onStatus, onDelete, onSaveNotes, onSchedule }) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(row.admin_notes || '');
  const [saving, setSaving] = useState(false);
  const st = cfg.statuses.find((s) => s.value === row.status) || cfg.statuses[0];
  const sub = cfg.subline(row);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0f1a] border border-white/8 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-semibold text-base">{cfg.name(row)}</h3>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${st.cls}`}>{st.label}</span>
            </div>
            {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
          </div>
          <span className="text-gray-600 text-xs whitespace-nowrap" title={fmtDateTime(row.created_at)}>{timeAgo(row.created_at)}</span>
        </div>

        {/* The thing they asked for — this is the key info */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#a3e635]/10 border border-[#a3e635]/25 text-[#a3e635] text-sm mb-3 max-w-full">
          {cfg.tagIcon}
          <span className="text-[#a3e635]/70 text-xs">{cfg.tagLabel}:</span>
          <span className="font-semibold truncate">{cfg.tag(row)}</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400 mb-4">
          {row.email && <span className="flex items-center gap-1.5"><Mail size={12} className="text-gray-600" />{row.email}</span>}
          {row.phone && <span className="flex items-center gap-1.5"><Phone size={12} className="text-gray-600" />{row.phone}</span>}
          {row.college && cfg.kind === 'interview' && <span className="flex items-center gap-1.5"><GraduationCap size={12} className="text-gray-600" />{row.college}</span>}
          {row.organization && cfg.kind === 'ctf' && <span className="flex items-center gap-1.5"><Building2 size={12} className="text-gray-600" />{row.organization}</span>}
        </div>

        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 bg-[#05080f] rounded-xl p-4 border border-white/5 space-y-3">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {cfg.fields.filter((f) => !f.long).map((f) => {
                const raw = row[f.key];
                const val = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '').trim();
                if (!val) return null;
                if (f.file) {
                  return (
                    <div key={f.key} className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-0.5">{f.label}</p>
                      <button
                        type="button"
                        onClick={() => openPrivateFile(f.file!, val).catch((e) => alert(e.message))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#a3e635]/30 bg-[#a3e635]/10 px-3 py-1.5 text-sm text-[#a3e635] hover:bg-[#a3e635]/20"
                      >
                        <FileText size={13} /> Open resume
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={f.key} className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-0.5">{f.label}</p>
                    {f.link && isUrl(val) ? (
                      <a href={val} target="_blank" rel="noreferrer" className="text-sm text-[#a3e635] hover:underline break-all inline-flex items-center gap-1">
                        {val} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <p className="text-sm text-gray-200 break-words">{val}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {row.data && typeof row.data === 'object' && Object.keys(row.data).length > 0 && (
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-white/5 pt-3">
                {Object.entries(row.data as Record<string, unknown>).map(([k, v]) => {
                  const val = Array.isArray(v) ? v.join(', ') : String(v ?? '').trim();
                  if (!val) return null;
                  return (
                    <div key={k} className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-0.5">{pretty(k.replace(/_/g, '-'))}</p>
                      <p className="text-sm text-gray-200 break-words">{val}</p>
                    </div>
                  );
                })}
              </div>
            )}
            {cfg.fields.filter((f) => f.long).map((f) => {
              const val = String(row[f.key] ?? '').trim();
              if (!val) return null;
              return (
                <div key={f.key}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{f.label}</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{val}</p>
                </div>
              );
            })}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">Your private notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Only visible to admins…"
                className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50"
              />
              <button
                disabled={saving || notes === (row.admin_notes || '')}
                onClick={async () => { setSaving(true); await onSaveNotes(notes); setSaving(false); }}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white disabled:opacity-40 flex items-center gap-1.5"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save note
              </button>
            </div>
          </motion.div>
        )}

        {/* Status */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-gray-600 text-xs mr-1">Status:</span>
          {cfg.statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => row.status !== s.value && onStatus(s.value)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${row.status === s.value ? s.cls + ' font-semibold' : 'bg-white/5 border-white/8 text-gray-500 hover:text-white'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onSchedule} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a3e635] text-[#05080f] font-semibold text-sm hover:bg-[#bef264] transition-colors">
            <CalendarClock size={14} /> Schedule {cfg.kind === 'interview' ? 'interview' : 'call'}
          </button>
          <a
            href={`mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(cfg.mailSubject(row))}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            <Mail size={14} /> Reply
          </a>
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm">
            {open ? <><ChevronUp size={14} />Less</> : <><ChevronDown size={14} />Full details</>}
          </button>
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm ml-auto" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const RequestsPanel: React.FC<{
  cfg: Config;
  onSchedule: (name: string, email: string, kind: MeetingKind) => void;
  onChanged?: () => void;
}> = ({ cfg, onSchedule, onChanged }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await sbSelect<Row>(cfg.table, { select: '*', order: 'created_at.desc', limit: '500' });
    if (res.ok && Array.isArray(res.data)) { setRows(res.data); setMissing(false); }
    else { setMissing(res.missingTable); setError(res.error); }
    setLoading(false);
  }, [cfg.table]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    cfg.statuses.forEach((s) => { c[s.value] = rows.filter((r) => r.status === s.value).length; });
    return c;
  }, [rows, cfg.statuses]);

  const shown = rows.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return cfg.searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q));
  });

  const setStatus = async (r: Row, status: string) => {
    const res = await sbUpdate(cfg.table, r.id, { status });
    if (res.ok) { setRows((p) => p.map((x) => (x.id === r.id ? { ...x, status } : x))); onChanged?.(); }
    else flash(`❌ ${res.error}`);
  };
  const saveNotes = async (r: Row, admin_notes: string) => {
    const res = await sbUpdate(cfg.table, r.id, { admin_notes });
    if (res.ok) { setRows((p) => p.map((x) => (x.id === r.id ? { ...x, admin_notes } : x))); flash('Note saved'); }
    else flash(`❌ ${res.error}`);
  };
  const remove = async (r: Row) => {
    if (!confirm(`Delete this ${cfg.noun} from ${cfg.name(r)}? This cannot be undone.`)) return;
    const res = await sbRemove(cfg.table, r.id);
    if (res.ok) { setRows((p) => p.filter((x) => x.id !== r.id)); onChanged?.(); flash('Deleted'); }
    else flash(`❌ ${res.error}`);
  };

  if (missing) {
    return (
      <div className="bg-[#0a0f1a] border border-yellow-500/30 rounded-2xl p-6 text-sm">
        <p className="text-yellow-400 font-medium flex items-center gap-2 mb-2"><AlertTriangle size={16} /> One-time database setup needed</p>
        <p className="text-gray-400">
          Supabase → SQL Editor → paste & run <code className="text-[#a3e635]">supabase/admin_tables.sql</code>, then press refresh.
        </p>
        <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:text-white text-sm flex items-center gap-2"><RefreshCw size={14} />Refresh</button>
      </div>
    );
  }

  return (
    <div>
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#0a0f1a] border border-[#a3e635]/30 text-[#a3e635] px-5 py-2.5 rounded-xl text-sm font-medium z-50 shadow-xl">{toast}</div>}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${cfg.noun}s…`}
            className="w-full bg-[#0a0f1a] border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/40" />
        </div>
        <button onClick={load} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a0f1a] border border-white/8 text-gray-400 hover:text-white text-sm">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {[{ value: 'all', label: 'All' }, ...cfg.statuses].map((s) => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${filter === s.value ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635]' : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white'}`}>
            {s.label} <span className="opacity-60">({counts[s.value] ?? 0})</span>
          </button>
        ))}
      </div>

      {error && !missing && <p className="text-red-400 text-sm flex items-center gap-1.5 mb-4"><AlertTriangle size={14} />{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="text-[#a3e635] animate-spin" /></div>
      ) : shown.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Inbox size={48} className="mx-auto mb-4 text-gray-700" />
          <p className="font-medium">No {filter !== 'all' ? filter : ''} {cfg.noun}s yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((r) => (
            <RequestCard key={r.id} row={r} cfg={cfg}
              onStatus={(s) => setStatus(r, s)}
              onDelete={() => remove(r)}
              onSaveNotes={(n) => saveNotes(r, n)}
              onSchedule={() => onSchedule(cfg.name(r), r.email, cfg.kind)} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ApplicationsPanel: React.FC<{ onSchedule: (n: string, e: string, k: MeetingKind) => void; onChanged?: () => void }> = (p) => (
  <RequestsPanel cfg={APPLICATIONS} {...p} />
);
export const CtfRequestsPanel: React.FC<{ onSchedule: (n: string, e: string, k: MeetingKind) => void; onChanged?: () => void }> = (p) => (
  <RequestsPanel cfg={CTF} {...p} />
);
export const InboxPanel: React.FC<{ onSchedule: (n: string, e: string, k: MeetingKind) => void; onChanged?: () => void }> = (p) => (
  <RequestsPanel cfg={INBOX} {...p} />
);
