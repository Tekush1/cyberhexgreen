import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarCheck, Check, ChevronDown, ChevronUp, CreditCard, ExternalLink, Loader2, Mail, Plus, RefreshCw, ScrollText, Search, Tag, X,
} from 'lucide-react';
import { sbInsert, sbRows, sbWrite } from './mailingApi';
import { SUPABASE_URL } from './adminApi';

/* =============================================================
   Admin → Payments: CTF checkout orders (Razorpay), the payment log and promo codes.
   Data: supabase/payments.sql. Owners and event managers.
============================================================= */

interface Order {
  id: string; ref: string; status: 'created' | 'paid' | 'failed' | 'refunded'; kind: string; title: string;
  items: { label: string; usd: number | null }[]; total_usd: number; currency: 'INR' | 'USD'; list_minor: number; amount_minor: number;
  fx_rate: number | null; promo_code: string | null; percent_off: number | null; razorpay_order_id: string; razorpay_payment_id: string | null;
  payment_method: string | null; failure_reason: string | null; name: string; email: string; phone: string; organization: string;
  event_name: string; event_date: string; finale_date: string; start_time: string; time_zone: string; event_format: string; location: string;
  participants: string; theme: string; message: string; logo_path: string; calendar_event_id: string | null; receipt_provider: string | null;
  receipt_sent_at: string | null; created_at: string; paid_at: string | null;
}
interface LogRow { id: number; at: string; ref: string | null; razorpay_order_id: string | null; event: string; level: 'info' | 'warn' | 'error'; detail: Record<string, unknown> }
interface Promo { id: string; code: string; percent_off: number; max_uses: number | null; uses: number; expires_at: string | null; active: boolean; note: string; created_at: string }

const SETUP = 'Payments are not set up yet: run supabase/payments.sql in Supabase → SQL Editor.';
const niceErr = (e: unknown) => {
  const m = e instanceof Error ? e.message : 'Could not load.';
  return /tables are missing|does not exist|schema cache/i.test(m) ? SETUP : m;
};
const money = (minor: number, cur: 'INR' | 'USD') =>
  cur === 'INR' ? `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : `$${(minor / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const when = (d: string | null) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const logoUrl = (p: string) => (p ? `${SUPABASE_URL}/storage/v1/object/public/ctf-logos/${p}` : '');

const STATUS: Record<Order['status'], { label: string; cls: string }> = {
  paid: { label: 'Paid', cls: 'bg-[#a3e635]/15 text-[#a3e635] border-[#a3e635]/30' },
  created: { label: 'Not paid', cls: 'bg-white/5 text-gray-300 border-white/10' },
  failed: { label: 'Failed', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  refunded: { label: 'Refunded', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
};
const LEVEL: Record<LogRow['level'], string> = { info: 'text-gray-300', warn: 'text-yellow-400', error: 'text-red-400' };
const EVENT_LABEL: Record<string, string> = {
  'order.created': 'Checkout started', 'payment.paid': 'Paid', 'payment.failed': 'Payment failed', 'checkout.closed': 'Closed the payment window',
  'payment.bad_signature': 'Bad signature (rejected)', 'payment.amount_mismatch': 'Amount mismatch (rejected)', 'payment.wrong_order': 'Wrong order (rejected)',
  'payment.not_captured': 'Not captured yet', 'receipt.sent': 'Receipt emailed', 'receipt.failed': 'Receipt NOT sent', 'calendar.created': 'Added to calendar',
  'calendar.failed': 'Calendar failed', 'calendar.skipped': 'Calendar skipped', 'team.notified': 'Team emailed', 'team.notify_failed': 'Team email failed',
  'webhook.bad_signature': 'Webhook with bad signature', 'webhook.error': 'Webhook error',
};
const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a3e635]/70';
const tabCls = (on: boolean) => `px-4 py-2 rounded-xl text-sm font-medium border flex items-center gap-2 ${focusRing} ${on ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635]' : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white'}`;
const inputCls = 'w-full bg-[#05080f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';

export function PaymentsPanel() {
  const [view, setView] = useState<'orders' | 'logs' | 'codes'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, l] = await Promise.all([
        sbRows<Order>('ctf_orders?select=*&order=created_at.desc&limit=300'),
        sbRows<LogRow>('payment_logs?select=*&order=at.desc&limit=400'),
      ]);
      setOrders(o.rows);
      setLogs(l.rows);
      setErr('');
    } catch (e) {
      setErr(niceErr(e));
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status === 'paid');
    const sum = (cur: 'INR' | 'USD') => paid.filter((o) => o.currency === cur).reduce((a, o) => a + o.amount_minor, 0);
    const today = new Date().toDateString();
    return {
      paid: paid.length,
      inr: sum('INR'),
      usd: sum('USD'),
      today: paid.filter((o) => o.paid_at && new Date(o.paid_at).toDateString() === today).length,
      open: orders.filter((o) => o.status !== 'paid').length,
      problems: logs.filter((l) => l.level === 'error' && Date.now() - new Date(l.at).getTime() < 7 * 86_400_000).length,
    };
  }, [orders, logs]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Paid orders', value: String(stats.paid), sub: `${stats.today} today`, cls: 'text-[#a3e635]' },
          { label: 'Collected', value: [stats.inr && money(stats.inr, 'INR'), stats.usd && money(stats.usd, 'USD')].filter(Boolean).join(' + ') || '₹0', sub: 'all time, after codes', cls: 'text-white' },
          { label: 'Not paid / failed', value: String(stats.open), sub: 'checkouts left unpaid', cls: 'text-gray-300' },
          { label: 'Problems (7 days)', value: String(stats.problems), sub: 'errors in the log', cls: stats.problems ? 'text-red-400' : 'text-gray-300' },
        ].map((s) => (
          <div key={s.label} className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Payments" className="flex gap-2">
          <button role="tab" aria-selected={view === 'orders'} onClick={() => setView('orders')} className={tabCls(view === 'orders')}><CreditCard size={15} />Orders</button>
          <button role="tab" aria-selected={view === 'logs'} onClick={() => setView('logs')} className={tabCls(view === 'logs')}><ScrollText size={15} />Logs</button>
          <button role="tab" aria-selected={view === 'codes'} onClick={() => setView('codes')} className={tabCls(view === 'codes')}><Tag size={15} />Promo codes</button>
        </div>
        <button onClick={load} className={`ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0a0f1a] border border-white/8 text-gray-400 hover:text-white text-sm ${focusRing}`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {err && <p role="alert" className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200"><AlertTriangle size={15} />{err}</p>}

      {view === 'orders' && <OrdersView orders={orders} logs={logs} loading={loading} />}
      {view === 'logs' && <LogsView logs={logs} loading={loading} />}
      {view === 'codes' && <PromoView />}
    </div>
  );
}

// ---------- Orders ----------
function OrdersView({ orders, logs, loading }: { orders: Order[]; logs: LogRow[]; loading: boolean }) {
  const [filter, setFilter] = useState<'all' | Order['status']>('paid');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const list = orders.filter((o) => (filter === 'all' || o.status === filter) &&
    (!q || `${o.ref} ${o.name} ${o.email} ${o.event_name} ${o.organization} ${o.razorpay_payment_id || ''}`.toLowerCase().includes(q.toLowerCase())));
  const count = (s: 'all' | Order['status']) => (s === 'all' ? orders.length : orders.filter((o) => o.status === s).length);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
          <label htmlFor="pay-q" className="sr-only">Search orders</label>
          <input id="pay-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, name, email, event, payment ID…" className={`${inputCls} pl-9 py-2.5`} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['paid', 'created', 'failed', 'all'] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s}
              className={`px-3 py-2 rounded-xl text-xs font-medium border ${focusRing} ${filter === s ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635]' : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white'}`}>
              {s === 'all' ? 'All' : STATUS[s].label} <span className="opacity-70">({count(s)})</span>
            </button>
          ))}
        </div>
      </div>

      {loading && !orders.length ? (
        <div className="flex justify-center py-16"><Loader2 size={26} className="text-[#a3e635] animate-spin" /></div>
      ) : !list.length ? (
        <p className="py-14 text-center text-sm text-gray-500">{orders.length ? 'Nothing matches.' : 'No checkouts yet. Paid CTF orders from Host your CTF show up here.'}</p>
      ) : (
        list.map((o) => {
          const isOpen = open === o.id;
          const its = logs.filter((l) => l.razorpay_order_id === o.razorpay_order_id || l.ref === o.ref);
          return (
            <article key={o.id} className="bg-[#0a0f1a] border border-white/8 rounded-2xl overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen} className={`w-full text-left p-4 flex flex-wrap items-center gap-4 ${focusRing}`}>
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#05080f] grid place-items-center">
                  {o.logo_path ? <img src={logoUrl(o.logo_path)} alt="" className="h-full w-full object-contain" loading="lazy" /> : <CreditCard size={18} className="text-gray-600" />}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
                    <span className="font-mono text-xs text-gray-500">{o.ref}</span>
                    {o.promo_code && <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-gray-300 font-mono">{o.promo_code} −{Number(o.percent_off)}%</span>}
                  </div>
                  <h3 className="mt-1 text-white font-semibold truncate">{o.event_name} <span className="font-normal text-gray-500">· {o.organization}</span></h3>
                  <p className="text-xs text-gray-500 truncate">{o.name} · {o.email} · event {o.event_date}{o.finale_date ? ` + ${o.finale_date}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-white">{money(o.amount_minor, o.currency)}</p>
                  <p className="text-xs text-gray-500">{when(o.paid_at || o.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 text-gray-500" aria-hidden>
                  {o.status === 'paid' && (
                    <>
                      <span title={o.receipt_provider ? `Receipt sent via ${o.receipt_provider}` : 'Receipt not sent'}><Mail size={15} className={o.receipt_provider ? 'text-[#a3e635]' : 'text-red-400'} /></span>
                      <span title={o.calendar_event_id ? 'In the calendar' : 'Not in the calendar'}><CalendarCheck size={15} className={o.calendar_event_id ? 'text-[#a3e635]' : 'text-gray-600'} /></span>
                    </>
                  )}
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/5 p-4 grid gap-4 lg:grid-cols-2 text-sm">
                  <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5">
                    {([
                      ['Package', o.title],
                      ['Charged', `${money(o.amount_minor, o.currency)}${o.promo_code ? ` (list ${money(o.list_minor, o.currency)})` : ''} · $${o.total_usd} USD list${o.fx_rate ? ` · rate ${o.fx_rate}` : ''}`],
                      ['Payment', o.razorpay_payment_id ? `${o.razorpay_payment_id}${o.payment_method ? ` · ${o.payment_method}` : ''}` : '—'],
                      ['Razorpay order', o.razorpay_order_id],
                      ...(o.failure_reason ? [['Failure', o.failure_reason]] : []),
                      ['Buyer', `${o.name} · ${o.phone}`],
                      ['Email', o.email],
                      ['When', `${o.event_date} ${o.start_time} (${o.time_zone.replace(/_/g, ' ')})${o.finale_date ? ` · finale ${o.finale_date}` : ''}`],
                      ['Format', `${o.event_format}${o.location ? ` · ${o.location}` : ''} · ${o.participants} players`],
                      ...(o.theme ? [['Theme', o.theme]] : []),
                      ...(o.message ? [['Notes', o.message]] : []),
                      ['Receipt', o.receipt_provider ? `sent via ${o.receipt_provider} · ${when(o.receipt_sent_at)}` : o.status === 'paid' ? 'NOT sent (see log)' : '—'],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd className="text-gray-200 break-words whitespace-pre-wrap">{v}</dd></div>
                    ))}
                  </dl>
                  <div className="space-y-3">
                    <ul className="rounded-xl bg-[#05080f] border border-white/5 p-3 space-y-1">
                      {o.items.map((l) => (
                        <li key={l.label} className="flex justify-between gap-3 text-xs"><span className="text-gray-300">{l.label}</span><span className="font-mono text-gray-500">{l.usd === null ? 'quote' : `$${l.usd}`}</span></li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      {o.logo_path && <a href={logoUrl(o.logo_path)} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:text-white ${focusRing}`}>Logo <ExternalLink size={12} /></a>}
                      <a href={`mailto:${o.email}?subject=${encodeURIComponent(`Your CTF ${o.event_name} (${o.ref})`)}`} className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:text-white ${focusRing}`}>Email buyer <Mail size={12} /></a>
                      {o.razorpay_payment_id && !o.razorpay_payment_id.startsWith('promo:') && (
                        <a href={`https://dashboard.razorpay.com/app/payments/${o.razorpay_payment_id}`} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:text-white ${focusRing}`}>Open in Razorpay <ExternalLink size={12} /></a>
                      )}
                    </div>
                    {its.length > 0 && (
                      <ol className="space-y-1 text-xs" aria-label="What happened">
                        {its.slice().reverse().map((l) => (
                          <li key={l.id} className="flex gap-2"><span className="text-gray-600 tabular-nums shrink-0">{when(l.at)}</span><span className={LEVEL[l.level]}>{EVENT_LABEL[l.event] || l.event}</span></li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}

// ---------- Logs ----------
function LogsView({ logs, loading }: { logs: LogRow[]; loading: boolean }) {
  const [level, setLevel] = useState<'all' | 'warn' | 'error'>('all');
  const list = logs.filter((l) => level === 'all' || (level === 'warn' ? l.level !== 'info' : l.level === 'error'));
  const detail = (d: Record<string, unknown>) => Object.entries(d || {}).filter(([, v]) => v !== null && v !== '').map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ');
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {([['all', 'Everything'], ['warn', 'Warnings + errors'], ['error', 'Errors only']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setLevel(k)} aria-pressed={level === k}
            className={`px-3 py-2 rounded-xl text-xs font-medium border ${focusRing} ${level === k ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635]' : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white'}`}>{label}</button>
        ))}
      </div>
      {loading && !logs.length ? (
        <div className="flex justify-center py-16"><Loader2 size={26} className="text-[#a3e635] animate-spin" /></div>
      ) : !list.length ? (
        <p className="py-14 text-center text-sm text-gray-500">Nothing logged yet.</p>
      ) : (
        <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-gray-500"><tr><th className="p-3 font-medium">Time</th><th className="p-3 font-medium">What</th><th className="p-3 font-medium">Order</th><th className="p-3 font-medium">Details</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {list.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="p-3 text-gray-500 whitespace-nowrap tabular-nums">{when(l.at)}</td>
                  <td className={`p-3 whitespace-nowrap font-medium ${LEVEL[l.level]}`}>{EVENT_LABEL[l.event] || l.event}</td>
                  <td className="p-3 font-mono text-gray-400 whitespace-nowrap">{l.ref || l.razorpay_order_id || '—'}</td>
                  <td className="p-3 text-gray-400 break-all min-w-[240px]">{detail(l.detail)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Promo codes (least priority at checkout: hidden behind "Have a code?") ----------
function PromoView() {
  const [codes, setCodes] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ code: '', percent: '10', maxUses: '', expires: '', note: '' });
  const id = useId();

  const load = useCallback(async () => {
    setLoading(true);
    try { setCodes((await sbRows<Promo>('ctf_promo_codes?select=*&order=created_at.desc')).rows); setErr(''); }
    catch (e) { setErr(niceErr(e)); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = f.code.trim().toUpperCase();
    const pct = Number(f.percent);
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) { setErr('Code: 3 to 40 letters, numbers, - or _.'); return; }
    if (!(pct > 0 && pct <= 100)) { setErr('Discount must be between 1 and 100%.'); return; }
    const max = f.maxUses.trim() ? Math.floor(Number(f.maxUses)) : null;
    if (max !== null && !(max > 0)) { setErr('Max uses must be a positive number, or empty for unlimited.'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await sbInsert('ctf_promo_codes', { code, percent_off: pct, max_uses: max, expires_at: f.expires ? new Date(`${f.expires}T23:59:59`).toISOString() : null, note: f.note.trim() });
      setMsg(`${code} created: ${pct}% off${pct === 100 ? ' (free order, no payment)' : ''}.`);
      setF({ code: '', percent: '10', maxUses: '', expires: '', note: '' });
      await load();
    } catch (x) {
      const m = niceErr(x);
      setErr(/duplicate|unique/i.test(m) ? 'That code already exists.' : m);
    }
    setBusy(false);
  };

  const toggle = async (p: Promo) => {
    try { await sbWrite('PATCH', `ctf_promo_codes?id=eq.${p.id}`, { active: !p.active }); await load(); }
    catch (x) { setErr(niceErr(x)); }
  };

  const state = (p: Promo) =>
    !p.active ? ['Off', 'text-gray-500'] :
    p.expires_at && new Date(p.expires_at) < new Date() ? ['Expired', 'text-yellow-400'] :
    p.max_uses !== null && p.uses >= p.max_uses ? ['Used up', 'text-yellow-400'] : ['Active', 'text-[#a3e635]'];

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-4 space-y-3" aria-labelledby={`${id}-h`}>
        <h3 id={`${id}-h`} className="text-white font-semibold flex items-center gap-2"><Plus size={16} className="text-[#a3e635]" />New promo code</h3>
        <p className="text-xs text-gray-500">Buyers see only a small "Have a code?" link under the Pay button. A 100% code confirms the order without payment.</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2"><label htmlFor={`${id}-c`} className="text-xs text-gray-400 mb-1 block">Code</label>
            <input id={`${id}-c`} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="CTF20" className={`${inputCls} font-mono`} /></div>
          <div><label htmlFor={`${id}-p`} className="text-xs text-gray-400 mb-1 block">% off</label>
            <input id={`${id}-p`} type="number" min={1} max={100} value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} className={inputCls} /></div>
          <div><label htmlFor={`${id}-m`} className="text-xs text-gray-400 mb-1 block">Max uses</label>
            <input id={`${id}-m`} type="number" min={1} value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} placeholder="Unlimited" className={inputCls} /></div>
          <div><label htmlFor={`${id}-e`} className="text-xs text-gray-400 mb-1 block">Valid until</label>
            <input id={`${id}-e`} type="date" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} className={inputCls} /></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1"><label htmlFor={`${id}-n`} className="text-xs text-gray-400 mb-1 block">Note (only you see it)</label>
            <input id={`${id}-n`} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. For IIT club partners" className={inputCls} /></div>
          <button type="submit" disabled={busy} className={`px-5 py-2 rounded-xl bg-[#a3e635] text-[#05080f] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 ${focusRing}`}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create
          </button>
        </div>
        <div aria-live="polite" className="text-sm min-h-[1.25rem]">
          {err && <p className="text-red-400" role="alert">{err}</p>}
          {!err && msg && <p className="text-[#a3e635] flex items-center gap-1.5"><Check size={14} />{msg}</p>}
        </div>
      </form>

      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl overflow-x-auto">
        {loading ? <div className="flex justify-center py-10"><Loader2 size={22} className="text-[#a3e635] animate-spin" /></div> : !codes.length ? (
          <p className="py-10 text-center text-sm text-gray-500">No promo codes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500"><tr><th className="p-3 font-medium">Code</th><th className="p-3 font-medium">Off</th><th className="p-3 font-medium">Used</th><th className="p-3 font-medium">Valid until</th><th className="p-3 font-medium">Status</th><th className="p-3" /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {codes.map((p) => {
                const [label, cls] = state(p);
                return (
                  <tr key={p.id}>
                    <td className="p-3"><span className="font-mono text-white">{p.code}</span>{p.note && <span className="block text-xs text-gray-500">{p.note}</span>}</td>
                    <td className="p-3 tabular-nums text-gray-200">{Number(p.percent_off)}%</td>
                    <td className="p-3 tabular-nums text-gray-300">{p.uses}{p.max_uses !== null ? ` / ${p.max_uses}` : ''}</td>
                    <td className="p-3 text-gray-400">{p.expires_at ? new Date(p.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No end'}</td>
                    <td className={`p-3 font-medium ${cls}`}>{label}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => toggle(p)} className={`inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:text-white ${focusRing}`}>
                        {p.active ? <><X size={12} />Turn off</> : <><Check size={12} />Turn on</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
