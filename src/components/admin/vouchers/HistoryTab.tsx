import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Loader2, Pause, Play, RefreshCw, RotateCcw, Search, Send, Trash2, X } from 'lucide-react';
import { renderEmail, type EmailVars } from '../../../../shared/emailTemplates';
import { downloadCsv, sbRows, sbRpc } from '../mailingApi';
import {
  MailPreview, Notice, Progress, Section, StatusPill, btn, btnDanger, card, duration, input, plural, viaShort, when,
  type BatchStat, type Provider, type QueueRecord, type Rest,
} from './shared';

/* Admin -> Vouchers -> History: every voucher email ever queued or sent, grouped by send (batch).
   Stop, resume, retry, send again, delete — per record, for a selection, or for a whole batch. */

const PAGE = 50;
const COLS = 'id,batch_id,event_id,event_name,kind,email,name,vars,shared,via,status,attempts,last_error,provider,not_before,sent_at,created_at,copy';
type StatusFilter = '' | 'waiting' | 'sent' | 'failed' | 'cancelled';
const KIND: Record<string, string> = { rank: 'Leaderboard', one: 'One team', special: 'Special discount', imported: 'Sent before the queue' };

export const HistoryTab: React.FC<{ providers: Provider[]; rests: Rest[]; focusBatches: string[]; onClearFocus: () => void; refreshRests: () => void }> = ({ providers, rests, focusBatches, onClearFocus, refreshRests }) => {
  const [batches, setBatches] = useState<BatchStat[]>([]);
  const [loadingB, setLoadingB] = useState(true);
  const [records, setRecords] = useState<QueueRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingR, setLoadingR] = useState(true);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [qLive, setQLive] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [eventName, setEventName] = useState('');
  const [batch, setBatch] = useState<string>(focusBatches.length === 1 ? focusBatches[0] : '');
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showAllBatches, setShowAllBatches] = useState(false);

  useEffect(() => { if (focusBatches.length === 1) { setBatch(focusBatches[0]); setPage(0); } }, [focusBatches]);
  useEffect(() => { const t = setTimeout(() => { setQLive(q.trim()); setPage(0); }, 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setSel(new Set()); setOpen(null); }, [page, qLive, status, eventName, batch]);

  const loadBatches = useCallback(async () => {
    try { const { rows } = await sbRows<BatchStat>('voucher_batch_stats?select=*&order=created_at.desc&limit=500'); setBatches(rows); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load sends.' }); }
    finally { setLoadingB(false); }
  }, []);

  const filterPath = useMemo(() => {
    const f: string[] = [];
    if (status === 'waiting') f.push('status=in.(pending,sending)');
    else if (status) f.push(`status=eq.${status}`);
    if (batch) f.push(`batch_id=eq.${batch}`);
    if (eventName) f.push(`event_name=eq.${encodeURIComponent(eventName)}`);
    const s = qLive.replace(/[(),*\\"]/g, ' ').trim();
    if (s) { const v = encodeURIComponent(`*${s}*`); f.push(`or=(email.ilike.${v},name.ilike.${v},vars->>code.ilike.${v})`); }
    return f.join('&');
  }, [status, batch, eventName, qLive]);

  const loadRecords = useCallback(async () => {
    setLoadingR(true);
    try {
      const { rows, total: t } = await sbRows<QueueRecord>(`voucher_queue?select=${COLS}&order=id.desc${filterPath ? `&${filterPath}` : ''}`, { from: page * PAGE, to: page * PAGE + PAGE - 1 });
      setRecords(rows); setTotal(t);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load records.' }); }
    finally { setLoadingR(false); }
  }, [filterPath, page]);

  const reload = useCallback(async () => { await Promise.all([loadBatches(), loadRecords()]); refreshRests(); }, [loadBatches, loadRecords, refreshRests]);
  useEffect(() => { loadBatches(); }, [loadBatches]);
  useEffect(() => { loadRecords(); }, [loadRecords]);
  // While anything is waiting, refresh every 20 seconds.
  const anyWaiting = batches.some((b) => b.waiting > 0);
  useEffect(() => { if (!anyWaiting) return; const t = setInterval(reload, 20_000); return () => clearInterval(t); }, [anyWaiting, reload]);

  const totals = useMemo(() => batches.reduce((a, b) => ({ sent: a.sent + b.sent, waiting: a.waiting + b.waiting, failed: a.failed + b.failed, stopped: a.stopped + b.stopped }), { sent: 0, waiting: 0, failed: 0, stopped: 0 }), [batches]);
  const eventNames = useMemo(() => [...new Set(batches.map((b) => b.event_name).filter(Boolean))].sort(), [batches]);
  const batchLabel = (id: string | null) => { const b = batches.find((x) => x.id === id); return b ? `${b.label || KIND[b.kind]} · ${when(b.created_at)}` : '—'; };

  /* ----- Actions ----- */
  const act = async (action: 'stop' | 'retry' | 'delete', target: { ids?: number[]; batch?: string }, what: string) => {
    const text = action === 'delete'
      ? `Delete ${what}?\n\nWaiting emails in it will not be sent. Emails already sent stay delivered; only their records are removed. This cannot be undone.`
      : action === 'stop' ? `Stop ${what}? Emails still waiting will not be sent until you resume them.` : `Send ${what} again? Failed and stopped emails go back in the queue.`;
    if (!confirm(text)) return;
    setBusy(`${action}:${target.batch || 'sel'}`); setMsg(null);
    try {
      const r = await sbRpc<{ changed: number; skipped: number }>('voucher_records_action', { p_action: action, p_ids: target.ids || null, p_batch: target.batch || null });
      const verb = action === 'delete' ? 'deleted' : action === 'stop' ? 'stopped' : 'back in the queue';
      const why = action === 'retry' ? 'already sent or waiting elsewhere' : action === 'stop' ? 'not waiting' : 'being sent right now';
      setMsg({ ok: true, text: `${plural(r.changed, 'email')} ${verb}.${r.skipped ? ` ${r.skipped} left as they were (${why}).` : ''}` });
      setSel(new Set());
      if (action === 'delete' && target.batch === batch) setBatch('');
      await reload();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not do that.' }); }
    finally { setBusy(''); }
  };

  /** A fresh copy to people who already got the email (same code, same content). */
  const sendAgain = async (recs: QueueRecord[]) => {
    const ok = recs.filter((r) => r.shared && Object.keys(r.shared).length > 0);
    const old = recs.length - ok.length;
    if (!ok.length) { setMsg({ ok: false, text: 'These are imported records from before the queue. Send them again from the Send tab.' }); return; }
    if (!confirm(`Send the same email again to ${plural(ok.length, 'person', 'people')}?${old ? `\n\n${old} imported record${old === 1 ? '' : 's'} from before the queue will be left out.` : ''}`)) return;
    setBusy('again'); setMsg(null);
    try {
      const groups = new Map<string, QueueRecord[]>();
      ok.forEach((r) => { const k = `${r.event_id}|${r.event_name}|${r.via}|${r.kind}`; groups.set(k, [...(groups.get(k) || []), r]); });
      let added = 0;
      for (const list of groups.values()) {
        const f = list[0];
        const r = await sbRpc<{ added: number }>('voucher_send_create', {
          p_batch: { event_id: f.event_id, event_name: f.event_name, kind: f.kind === 'special' ? 'special' : 'one', label: `Sent again · ${plural(list.length, 'email')}`, via: f.via.startsWith('resend') ? 'auto' : f.via, again: true },
          p_rows: list.map((x) => ({ email: x.email, name: x.name, kind: x.kind, vars: x.vars, shared: x.shared })),
        });
        added += r.added;
      }
      setMsg({ ok: true, text: `${plural(added, 'email')} queued again. They go out over ${duration(added)}.` });
      setSel(new Set());
      await reload();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not queue them again.' }); }
    finally { setBusy(''); }
  };

  const exportCsv = async (onlyBatch?: string) => {
    setBusy('export');
    try {
      const path = `voucher_queue?select=${COLS}&order=id.asc${onlyBatch ? `&batch_id=eq.${onlyBatch}` : filterPath ? `&${filterPath}` : ''}`;
      const all: QueueRecord[] = [];
      for (let from = 0; from < 100_000; from += 1000) {
        const { rows } = await sbRows<QueueRecord>(path, { from, to: from + 999 });
        all.push(...rows);
        if (rows.length < 1000) break;
      }
      downloadCsv(`voucher-records-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['Email', 'Name', 'Code', 'Event', 'Send', 'Status', 'Service', 'Sent at', 'Queued at', 'Error'],
        ...all.map((r) => [r.email, r.name, String(r.vars?.code ?? ''), r.event_name, batchLabel(r.batch_id), statusWord(r.status), r.provider, r.sent_at || '', r.created_at, r.last_error]),
      ]);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not export.' }); }
    finally { setBusy(''); }
  };

  const selected = records.filter((r) => sel.has(r.id));
  const allOnPage = records.length > 0 && records.every((r) => sel.has(r.id));
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const shownBatches = showAllBatches ? batches : batches.slice(0, 8);
  const openRec = records.find((r) => r.id === open);

  return (
    <div className="space-y-5">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ['Sent', totals.sent, 'text-[#30d158]', 'sent'],
          ['Waiting', totals.waiting, 'text-amber-200', 'waiting'],
          ['Failed', totals.failed, 'text-red-300', 'failed'],
          ['Stopped', totals.stopped, 'text-white/60', 'cancelled'],
        ] as const).map(([k, v, c, f]) => (
          <button key={k} onClick={() => { setStatus(status === f ? '' : f); setPage(0); }}
            className={`rounded-[18px] border px-5 py-4 text-left transition ${status === f ? 'border-white/30 bg-white/[0.06]' : 'border-white/[0.08] bg-[#0b0f19] hover:border-white/20'}`}>
            <p className={`text-[26px] font-semibold tabular-nums ${c}`}>{v.toLocaleString('en-IN')}</p>
            <p className="text-[12px] text-white/45">{k} emails</p>
          </button>
        ))}
      </div>
      {rests.length > 0 && (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-3 text-[12.5px] text-amber-100/80">
          At their limit, skipped for now: {rests.map((r) => `${r.provider} until ${when(r.until)}`).join(' · ')}.
        </p>
      )}

      {/* Batches */}
      <Section title="Sends" sub="Each time you queue emails, it becomes one send here."
        right={<button onClick={reload} className={btn}><RefreshCw size={13} /> Refresh</button>}>
        {loadingB && !batches.length ? <Loader2 size={18} className="animate-spin text-white/40" /> : !batches.length ? <p className="text-sm text-white/45">Nothing sent yet.</p> : (
          <div className="space-y-2.5">
            {shownBatches.map((b) => {
              const paused = b.waiting > 0 && b.next_try && new Date(b.next_try).getTime() > Date.now() + 120_000;
              const focused = focusBatches.includes(b.id) || batch === b.id;
              return (
                <div key={b.id} className={`rounded-2xl border p-4 ${focused ? 'border-[#0A84FF]/50 bg-[#0A84FF]/[0.05]' : 'border-white/[0.07] bg-black/20'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button onClick={() => { setBatch(batch === b.id ? '' : b.id); setPage(0); onClearFocus(); }} className="min-w-0 text-left">
                      <p className="truncate text-[14px] font-semibold text-white">{b.label || KIND[b.kind]}</p>
                      <p className="mt-0.5 text-[12px] text-white/45">
                        {b.event_name || '—'} · {KIND[b.kind]} · {when(b.created_at)}{b.created_by ? ` · ${b.created_by}` : ''}{b.via ? ` · ${viaShort(b.via, providers)}` : ''}
                      </p>
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {b.waiting > 0 && <button onClick={() => act('stop', { batch: b.id }, `the ${plural(b.waiting, 'waiting email')} of this send`)} disabled={!!busy} className={btn}><Pause size={12} /> Stop</button>}
                      {b.stopped + b.failed > 0 && <button onClick={() => act('retry', { batch: b.id }, `${plural(b.stopped + b.failed, 'stopped or failed email')}`)} disabled={!!busy} className={btn}><Play size={12} /> {b.failed && !b.stopped ? 'Retry failed' : 'Resume'}</button>}
                      <button onClick={() => exportCsv(b.id)} disabled={!!busy} className={btn} aria-label="Export this send"><Download size={12} /></button>
                      <button onClick={() => act('delete', { batch: b.id }, `this send and its ${plural(b.total, 'record')}`)} disabled={!!busy} className={btnDanger} aria-label="Delete this send"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="mt-3"><Progress b={b} /></div>
                  <p className="mt-2 text-[12px] text-white/50">
                    <span className="text-[#30d158]">{b.sent.toLocaleString('en-IN')} sent</span>
                    {b.waiting > 0 && <> · <span className="text-amber-200">{b.waiting.toLocaleString('en-IN')} waiting</span></>}
                    {b.failed > 0 && <> · <span className="text-red-300">{b.failed} failed</span></>}
                    {b.stopped > 0 && <> · {b.stopped.toLocaleString('en-IN')} stopped</>}
                    {' '}of {b.total.toLocaleString('en-IN')}
                    {b.waiting > 0 && <span className="text-white/35"> · {paused ? `paused by a limit, next try ${when(b.next_try)}` : `done in ${duration(b.waiting)}`}</span>}
                    {!b.waiting && b.last_sent_at && <span className="text-white/35"> · last sent {when(b.last_sent_at)}</span>}
                  </p>
                </div>
              );
            })}
            {batches.length > shownBatches.length && <button onClick={() => setShowAllBatches(true)} className={btn}>Show all {batches.length} sends</button>}
          </div>
        )}
      </Section>

      {/* Records */}
      <div className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-white">Records</p>
            <p className="mt-1 text-[13px] text-white/45">{loadingR ? 'Loading…' : `${total.toLocaleString('en-IN')} email${total === 1 ? '' : 's'}${filterPath ? ' match' : ' in total'}`}</p>
          </div>
          <button onClick={() => exportCsv()} disabled={!!busy || !total} className={btn}>{busy === 'export' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Export {filterPath ? 'these' : 'all'} as CSV</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, name or code" aria-label="Search records" className={`${input} pl-9`} />
          </div>
          <select aria-label="Status" className={input} value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(0); }}>
            <option value="">Any status</option><option value="waiting">Waiting</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="cancelled">Stopped</option>
          </select>
          <select aria-label="Event" className={input} value={eventName} onChange={(e) => { setEventName(e.target.value); setPage(0); }}>
            <option value="">Every event</option>{eventNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select aria-label="Send" className={input} value={batch} onChange={(e) => { setBatch(e.target.value); setPage(0); onClearFocus(); }}>
            <option value="">Every send</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.label || KIND[b.kind]} · {when(b.created_at)}</option>)}
          </select>
        </div>
        {(filterPath) && (
          <button onClick={() => { setQ(''); setStatus(''); setEventName(''); setBatch(''); setPage(0); onClearFocus(); }} className="mt-2 inline-flex items-center gap-1 text-[12px] text-white/45 hover:text-white"><X size={12} /> Clear filters</button>
        )}

        {selected.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#0A84FF]/30 bg-[#0A84FF]/[0.06] px-3 py-2.5 text-[12.5px] text-white">
            <span className="mr-1 font-medium">{selected.length} selected</span>
            <button onClick={() => act('stop', { ids: selected.map((r) => r.id) }, plural(selected.length, 'selected email'))} disabled={!!busy} className={btn}><Pause size={12} /> Stop</button>
            <button onClick={() => act('retry', { ids: selected.map((r) => r.id) }, plural(selected.length, 'selected email'))} disabled={!!busy} className={btn}><RotateCcw size={12} /> Retry</button>
            <button onClick={() => sendAgain(selected.filter((r) => r.status === 'sent'))} disabled={!!busy || !selected.some((r) => r.status === 'sent')} className={btn}><Send size={12} /> Send again</button>
            <button onClick={() => act('delete', { ids: selected.map((r) => r.id) }, plural(selected.length, 'record'))} disabled={!!busy} className={btnDanger}><Trash2 size={12} /> Delete</button>
            <button onClick={() => setSel(new Set())} className="ml-auto text-white/50 hover:text-white">Clear</button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="bg-[#10151f]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="w-9 px-3 py-2.5"><input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={() => setSel(allOnPage ? new Set() : new Set(records.map((r) => r.id)))} className="h-4 w-4 accent-[#0A84FF]" /></th>
                <th className="px-3 py-2.5 font-medium">Email</th>
                <th className="px-3 py-2.5 font-medium">Code</th>
                <th className="px-3 py-2.5 font-medium">Event</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">When</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {loadingR && !records.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-white/40"><Loader2 size={16} className="inline animate-spin" /></td></tr>}
              {!loadingR && !records.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-white/40">No records match.</td></tr>}
              {records.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className={`border-t border-white/5 ${sel.has(r.id) ? 'bg-[#0A84FF]/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                    <td className="px-3 py-2.5"><input type="checkbox" aria-label={`Select ${r.email}`} checked={sel.has(r.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} className="h-4 w-4 accent-[#0A84FF]" /></td>
                    <td className="max-w-[16rem] px-3 py-2.5">
                      <button onClick={() => setOpen(open === r.id ? null : r.id)} className="flex max-w-full items-center gap-1.5 text-left">
                        {open === r.id ? <ChevronDown size={13} className="shrink-0 text-white/40" /> : <ChevronRight size={13} className="shrink-0 text-white/40" />}
                        <span className="min-w-0"><span className="block truncate text-white">{r.email}</span><span className="block truncate text-[12px] text-white/40">{r.name || '—'}{r.copy > 0 ? ` · copy ${r.copy + 1}` : ''}</span></span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-white/75">{String(r.vars?.code ?? '—')}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2.5 text-white/60">{r.event_name || '—'}</td>
                    <td className="px-3 py-2.5"><StatusPill s={r.status} title={r.last_error || undefined} />{r.status === 'failed' && r.last_error && <span className="mt-1 block max-w-[16rem] truncate text-[11px] text-red-300/80" title={r.last_error}>{r.last_error}</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-white/50">
                      {r.status === 'sent' ? <>{when(r.sent_at)}{r.provider && <span className="text-white/30"> · {r.provider}</span>}</>
                        : r.status === 'pending' ? (new Date(r.not_before).getTime() > Date.now() + 60_000 ? `next try ${when(r.not_before)}` : 'in line')
                        : when(r.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      {r.status === 'pending' && <button onClick={() => act('stop', { ids: [r.id] }, r.email)} disabled={!!busy} className="rounded-md px-1.5 py-1 text-white/45 hover:text-white" aria-label="Stop" title="Stop"><Pause size={13} /></button>}
                      {(r.status === 'failed' || r.status === 'cancelled') && <button onClick={() => act('retry', { ids: [r.id] }, r.email)} disabled={!!busy} className="rounded-md px-1.5 py-1 text-white/45 hover:text-white" aria-label="Retry" title="Retry"><RotateCcw size={13} /></button>}
                      {r.status === 'sent' && <button onClick={() => sendAgain([r])} disabled={!!busy} className="rounded-md px-1.5 py-1 text-white/45 hover:text-white" aria-label="Send again" title="Send again"><Send size={13} /></button>}
                      <button onClick={() => act('delete', { ids: [r.id] }, `the record for ${r.email}`)} disabled={!!busy || r.status === 'sending'} className="rounded-md px-1.5 py-1 text-white/35 hover:text-red-300" aria-label="Delete" title="Delete"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                  {open === r.id && openRec && (
                    <tr className="border-t border-white/5 bg-black/30">
                      <td colSpan={7} className="px-4 py-4"><RecordDetails r={openRec} send={batchLabel(r.batch_id)} providers={providers} /></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="mt-3 flex items-center justify-between text-[12.5px] text-white/55">
            <span>Page {page + 1} of {pages.toLocaleString('en-IN')}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loadingR} className={btn}>Previous</button>
              <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1 || loadingR} className={btn}>Next</button>
            </div>
          </div>
        )}
      </div>

      <Notice msg={msg} onClose={() => setMsg(null)} />
    </div>
  );
};

const statusWord = (s: string) => ({ pending: 'Waiting', sending: 'Sending', sent: 'Sent', failed: 'Failed', cancelled: 'Stopped' } as Record<string, string>)[s] || s;

/** Everything about one email: what it said, where it went, what went wrong. */
const RecordDetails: React.FC<{ r: QueueRecord; send: string; providers: Provider[] }> = ({ r, send, providers }) => {
  const [show, setShow] = useState(false);
  const full = r.shared && Object.keys(r.shared).length > 0;
  const mail = useMemo(() => (show && full ? renderEmail('team_voucher', { ...r.shared, ...r.vars } as unknown as EmailVars) : null), [show, full, r]);
  const v = r.vars || {};
  const prize = v.prize ? String(v.prize) : v.discount ? `${v.discount}% voucher` : '—';
  const items: [string, React.ReactNode][] = [
    ['Name in the email', String(v.team ?? r.name ?? '—')],
    ['Code', <span className="font-mono">{String(v.code ?? '—')}</span>],
    ['Prize', prize],
    ['Send', send],
    ['Mail service', `${viaShort(r.via, providers)}${r.provider ? ` → sent by ${r.provider}` : ''}`],
    ['Tries', String(r.attempts)],
    ['Queued', when(r.created_at)],
    ['Sent', r.sent_at ? when(r.sent_at) : '—'],
  ];
  return (
    <div>
      <dl className="grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-4">
        {items.map(([k, val]) => (
          <div key={k}><dt className="text-white/40">{k}</dt><dd className="text-white/85">{val}</dd></div>
        ))}
      </dl>
      {r.last_error && <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-2.5 text-[12px] text-red-200/90">Last error: {r.last_error}</p>}
      {full ? (
        <button onClick={() => setShow((s) => !s)} className={`${btn} mt-3`}>{show ? 'Hide the email' : 'Show the email'}</button>
      ) : <p className="mt-3 text-[12px] text-white/35">Imported from the mail log (sent before the queue existed), so the full email is not stored here.</p>}
      {mail && <div className="mt-3"><MailPreview html={mail.html} subject={mail.subject} who={r.email} /></div>}
    </div>
  );
};
