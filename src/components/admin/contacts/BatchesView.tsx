import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, Loader2, Pause, Play, RotateCw } from 'lucide-react';
import { sbRpc } from '../mailingApi';
import { btnGlass, fmtDate, glass } from './shared';

interface Batch {
  id: number; name: string; subject: string; body: string; sender: string | null; send_as: string | null; created_at: string;
  total: number; sent: number; pending: number; sending: number; failed: number; cancelled: number; last_sent_at: string | null; next_at: string | null;
}
interface Row { id: number; email: string; name: string; org: string; status: string; attempts: number; last_error: string; not_before: string; sent_at: string | null }

const ROW_STATE: Record<string, { label: string; color: string }> = {
  pending: { label: 'Waiting', color: '#98989D' }, sending: { label: 'Sending', color: '#0A84FF' }, sent: { label: 'Sent', color: '#30D158' },
  failed: { label: 'Failed', color: '#FF453A' }, cancelled: { label: 'Stopped', color: '#636366' },
};

/** Every bulk email: progress, who got it, stop / resume / retry. Refreshes on its own while emails are going out. */
export function BatchesView({ onToast }: { onToast: (m: string) => void }) {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try { setBatches(await sbRpc<Batch[]>('contact_batches', {})); setErr(''); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not load.'); setBatches((b) => b || []); }
  }, []);
  const loadRows = useCallback(async (id: number) => {
    try { setRows(await sbRpc<Row[]>('contact_batch_rows', { p_batch: id })); } catch { setRows([]); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const live = (batches || []).some((b) => b.pending + b.sending > 0);
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => { load(); if (open) loadRows(open); }, 20000);
    return () => window.clearInterval(t);
  }, [live, load, loadRows, open]);

  const toggle = (id: number) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id); setRows(null); loadRows(id);
  };
  const act = async (b: Batch, action: 'stop' | 'resume' | 'retry') => {
    setBusy(`${b.id}${action}`);
    try {
      const n = await sbRpc<number>('contact_batch_action', { p_batch: b.id, p_action: action });
      onToast(action === 'stop' ? `${n} stopped` : action === 'resume' ? `${n} waiting again` : `${n} will be tried again`);
      await load(); if (open === b.id) await loadRows(b.id);
    } catch (e) { onToast(e instanceof Error ? e.message : 'Could not do that.'); }
    setBusy('');
  };

  if (batches === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-white/40" /></div>;
  if (err && !batches.length) return <p className="py-10 text-center text-[14px] text-[#FF453A]">{err}</p>;
  if (!batches.length) return (
    <div className={`${glass} rounded-3xl px-6 py-14 text-center`}>
      <p className="text-[16px] font-medium text-white">No bulk emails yet</p>
      <p className="mt-1 text-[14px] text-white/50">Tick contacts in People, then press "Email" to send one email to all of them.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-white/50">Emails go out 2 a minute from the server, even with this page closed. Replies land in Outreach → Inbox.</p>
        <button onClick={load} className={btnGlass}><RotateCw size={14} />Refresh</button>
      </div>
      {batches.map((b) => {
        const pct = b.total ? Math.round((b.sent / b.total) * 100) : 0;
        const left = b.pending + b.sending;
        return (
          <div key={b.id} className={`${glass} rounded-2xl`}>
            <button onClick={() => toggle(b.id)} aria-expanded={open === b.id} className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-white">{b.name || b.subject}</p>
                <p className="truncate text-[12.5px] text-white/50">{b.sender ? `${b.sender} · ${b.send_as}` : '—'} · {fmtDate(b.created_at)}</p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full bg-[#30D158] transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-[12.5px] text-white/60 tabular-nums">
                  {b.sent} of {b.total} sent
                  {left > 0 && ` · ${left} waiting · done in about ${Math.ceil(left / 2)} min`}
                  {b.failed > 0 && <span className="text-[#FF453A]"> · {b.failed} failed</span>}
                  {b.cancelled > 0 && ` · ${b.cancelled} stopped`}
                </p>
              </div>
              <ChevronDown size={18} className={`mt-1 shrink-0 text-white/40 transition-transform ${open === b.id ? 'rotate-180' : ''}`} />
            </button>
            {open === b.id && (
              <div className="border-t border-white/[0.07] px-4 py-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {b.pending > 0 && <button onClick={() => act(b, 'stop')} disabled={!!busy} className={btnGlass}>{busy === `${b.id}stop` ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}Stop the rest</button>}
                  {b.cancelled > 0 && <button onClick={() => act(b, 'resume')} disabled={!!busy} className={btnGlass}>{busy === `${b.id}resume` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}Resume {b.cancelled}</button>}
                  {b.failed > 0 && <button onClick={() => act(b, 'retry')} disabled={!!busy} className={btnGlass}>{busy === `${b.id}retry` ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}Retry {b.failed} failed</button>}
                </div>
                <details className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                  <summary className="cursor-pointer text-[13px] text-white/70">Message: {b.subject}</summary>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-white/70">{b.body}</p>
                </details>
                {rows === null ? <Loader2 size={16} className="animate-spin text-white/40" /> : (
                  <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-white/[0.04] text-white/50"><tr><th className="px-3 py-2 font-medium">To</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">When</th></tr></thead>
                      <tbody>
                        {rows.map((r) => {
                          const s = ROW_STATE[r.status] || ROW_STATE.pending;
                          return (
                            <Fragment key={r.id}>
                              <tr className="border-t border-white/[0.06] text-white/85">
                                <td className="px-3 py-2 min-w-[200px]"><span className="block truncate">{r.name || r.org || r.email}</span><span className="block truncate text-[12px] text-white/45">{r.email}{r.org && r.name ? ` · ${r.org}` : ''}</span></td>
                                <td className="px-3 py-2 whitespace-nowrap" style={{ color: s.color }}>{s.label}{r.attempts > 1 ? ` (try ${r.attempts})` : ''}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-white/55">{fmtDate(r.sent_at || r.not_before)}</td>
                              </tr>
                              {r.last_error && r.status !== 'sent' && (
                                <tr><td colSpan={3} className="px-3 pb-2 text-[12px] text-[#FF9F0A] break-words">{r.last_error}</td></tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
