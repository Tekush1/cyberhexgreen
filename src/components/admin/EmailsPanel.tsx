import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, AlertTriangle, Check, Search, Mail, Info, Loader2 } from 'lucide-react';
import { TOKEN_KEY, fmtDateTime, timeAgo } from './adminApi';
import { EmailComposer } from './EmailComposer';

interface SentEmail {
  id: string;
  to: string[];
  subject: string;
  createdAt: string | null;
  lastEvent: string;
}

type Bucket = 'all' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'problem';

const EVENT: Record<string, { label: string; cls: string; bucket: Exclude<Bucket, 'all'> }> = {
  queued: { label: 'Queued', cls: 'border-white/15 text-gray-300', bucket: 'sent' },
  scheduled: { label: 'Scheduled', cls: 'border-white/15 text-gray-300', bucket: 'sent' },
  sent: { label: 'Sent', cls: 'border-white/15 text-gray-300', bucket: 'sent' },
  delivered: { label: 'Delivered', cls: 'border-sky-500/40 text-sky-300 bg-sky-500/10', bucket: 'delivered' },
  delivery_delayed: { label: 'Delayed', cls: 'border-amber-500/40 text-amber-300 bg-amber-500/10', bucket: 'sent' },
  opened: { label: 'Opened', cls: 'border-[#a3e635]/50 text-[#a3e635] bg-[#a3e635]/10', bucket: 'opened' },
  clicked: { label: 'Clicked', cls: 'border-violet-500/40 text-violet-300 bg-violet-500/10', bucket: 'clicked' },
  bounced: { label: 'Bounced', cls: 'border-red-500/40 text-red-300 bg-red-500/10', bucket: 'problem' },
  complained: { label: 'Marked spam', cls: 'border-red-500/40 text-red-300 bg-red-500/10', bucket: 'problem' },
  failed: { label: 'Failed', cls: 'border-red-500/40 text-red-300 bg-red-500/10', bucket: 'problem' },
  canceled: { label: 'Canceled', cls: 'border-white/15 text-gray-400', bucket: 'problem' },
};
const ev = (e: string) => EVENT[e] || { label: e || 'Sent', cls: 'border-white/15 text-gray-300', bucket: 'sent' as const };

const FILTERS: { id: Bucket; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sent', label: 'Sent' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'opened', label: 'Opened' },
  { id: 'clicked', label: 'Clicked' },
  { id: 'problem', label: 'Bounced / spam' },
];

async function call(query: string) {
  const res = await fetch(`/api/email${query}`, { headers: { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` } });
  const raw = await res.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch { /* non-JSON */ }
  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.reload();
    throw new Error('Session expired.');
  }
  if (!res.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
  return data as { items: SentEmail[]; hasMore: boolean };
}

/** Admin -> Emails: write a one-off email and see who got what, and who opened it. */
export const EmailsPanel: React.FC = () => {
  const [items, setItems] = useState<SentEmail[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [filter, setFilter] = useState<Bucket>('all');
  const [q, setQ] = useState('');
  const [composerKey, setComposerKey] = useState(0);
  const [showCompose, setShowCompose] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await call('?admin=log');
      setItems(d.items || []);
      setHasMore(!!d.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load emails.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    const last = items[items.length - 1];
    if (!last) return;
    setMoreLoading(true);
    try {
      const d = await call(`?admin=log&after=${encodeURIComponent(last.id)}`);
      setItems((prev) => [...prev, ...(d.items || [])]);
      setHasMore(!!d.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more.');
    } finally {
      setMoreLoading(false);
    }
  };

  const counts = useMemo(() => {
    const c = { all: items.length, sent: 0, delivered: 0, opened: 0, clicked: 0, problem: 0 } as Record<Bucket, number>;
    items.forEach((i) => { c[ev(i.lastEvent).bucket]++; });
    return c;
  }, [items]);
  // "opened" in the summary also counts people who clicked (a click means they opened it)
  const openedTotal = counts.opened + counts.clicked;

  const shown = items.filter((i) => {
    if (filter !== 'all' && ev(i.lastEvent).bucket !== filter) return false;
    const s = q.trim().toLowerCase();
    return !s || i.subject.toLowerCase().includes(s) || i.to.some((t) => t.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-8">
      {/* New email */}
      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-white font-medium flex items-center gap-2"><Mail size={16} className="text-[#a3e635]" /> New email</h3>
            <p className="text-gray-500 text-xs mt-1">Pick any template, type the name and email, and send. Not tied to a meeting.</p>
          </div>
          <button onClick={() => setShowCompose((v) => !v)} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white">
            {showCompose ? 'Hide' : 'Write an email'}
          </button>
        </div>
        {okMsg && (
          <p className="mt-4 p-3 rounded-xl bg-[#a3e635]/5 border border-[#a3e635]/30 text-sm text-[#a3e635] flex items-center gap-2">
            <Check size={14} /> {okMsg}
          </p>
        )}
        {showCompose && (
          <div className="mt-2">
            <EmailComposer
              key={composerKey}
              editable
              heading=""
              initialTemplate="custom"
              target={{ name: '', emails: [], title: 'interview' }}
              onSent={(msg) => { setOkMsg(msg); setComposerKey((k) => k + 1); setTimeout(load, 1500); }}
            />
          </div>
        )}
      </div>

      {/* Sent log */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-white font-medium">Sent emails</h3>
          <button onClick={load} className="text-gray-500 hover:text-white p-1.5 flex items-center gap-1.5 text-xs" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Sent', value: counts.all, cls: 'text-white' },
            { label: 'Delivered', value: counts.delivered + openedTotal, cls: 'text-sky-300' },
            { label: 'Opened', value: openedTotal, cls: 'text-[#a3e635]' },
            { label: 'Clicked', value: counts.clicked, cls: 'text-violet-300' },
            { label: 'Bounced / spam', value: counts.problem, cls: counts.problem ? 'text-red-300' : 'text-gray-500' },
          ].map((s) => (
            <div key={s.label} className="bg-[#0a0f1a] border border-white/8 rounded-xl p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                filter === f.id ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635] font-medium' : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}{f.id !== 'all' && counts[f.id] ? ` · ${counts[f.id]}` : ''}
            </button>
          ))}
          <label className="ml-auto relative">
            <span className="sr-only">Search sent emails</span>
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email or subject"
              className="bg-[#05080f] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50 w-60"
            />
          </label>
        </div>

        {error && (
          <p className="text-red-400 text-sm flex items-start gap-1.5 mb-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        {!loading && !error && shown.length === 0 && <p className="text-gray-500 text-sm">No emails yet.</p>}

        <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-white/8">
                  <th className="px-4 py-3 font-medium">To</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Sent</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => {
                  const e = ev(m.lastEvent);
                  return (
                    <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-gray-200 max-w-[16rem] truncate" title={m.to.join(', ')}>{m.to.join(', ')}</td>
                      <td className="px-4 py-3 text-gray-300 max-w-[22rem] truncate" title={m.subject}>{m.subject}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap" title={m.createdAt ? fmtDateTime(m.createdAt) : ''}>
                        {m.createdAt ? timeAgo(m.createdAt) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${e.cls}`}>{e.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {loading && !items.length && (
            <p className="px-4 py-6 text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</p>
          )}
        </div>

        {hasMore && (
          <button onClick={loadMore} disabled={moreLoading} className="mt-3 px-4 py-2 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white disabled:opacity-50 flex items-center gap-1.5">
            {moreLoading && <Loader2 size={12} className="animate-spin" />} Load older emails
          </button>
        )}

        <p className="mt-4 text-[11px] text-gray-600 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" />
          Status shows the latest event for each email. "Opened" and "Clicked" appear only when open and click tracking are turned on in Resend
          (Domains → mail.cyberhx.com → Configuration). Some mail apps block tracking, so an email can be read without showing as opened.
        </p>
      </div>
    </div>
  );
};

export default EmailsPanel;
