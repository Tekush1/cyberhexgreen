import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BellRing, CalendarDays, Check, ChevronDown, Loader2, Megaphone, Newspaper, Pause, Play, RefreshCw,
  RotateCcw, Send, Server, Upload, Users, X,
} from 'lucide-react';
import {
  CAMPAIGN_TEMPLATES, KIND_INFO, missingField, renderCampaign,
  type CampaignKind, type CampaignTemplateId, type CampaignVars,
} from '../../../shared/campaignTemplates';
import { fmtDateTime, timeAgo } from './adminApi';
import { campaignApi, cleanTag, parsePeople, sbRows, sender } from './mailingApi';

// ---------- types ----------
interface Provider {
  id: string; label: string; configured: boolean; missingEnv: string[]; from: string;
  day: number | null; month: number | null; usedToday: number; usedMonth: number; dashboard: string;
}
interface ProvidersRes { providers: Provider[]; lanes: Record<CampaignKind, string[]>; site: string; tablesMissing?: boolean }
interface Campaign {
  id: string; kind: CampaignKind; name: string; template: CampaignTemplateId; vars: CampaignVars; audience: any;
  status: 'sending' | 'paused' | 'done' | 'cancelled'; total: number; sent: number; failed: number; skipped: number;
  providers: Record<string, number>; note: string; created_at: string; updated_at: string; provider?: string | null;
}

const input = 'w-full bg-[#05080f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50';
const KIND_ICON: Record<CampaignKind, React.ReactNode> = {
  event: <Megaphone size={16} />, newsletter: <Newspaper size={16} />, notification: <BellRing size={16} />,
};
const FIELD: Record<keyof CampaignVars, { label: string; placeholder: string; long?: boolean; hint?: string }> = {
  style: { label: 'Style', placeholder: '' },
  eventName: { label: 'Event name', placeholder: 'CyberHx CTF October 2026' },
  when: { label: 'When', placeholder: 'Saturday 25 Oct, 7:00 PM IST' },
  where: { label: 'Where', placeholder: 'Online · ctf.cyberhx.com' },
  link: { label: 'Button link', placeholder: 'https://cyberhx.com/register', hint: 'Must start with https://' },
  ctaLabel: { label: 'Button text', placeholder: '' },
  image: { label: 'Banner image link (optional)', placeholder: 'https://cyberhx.com/events/banner.png', hint: 'A public https image, about 1120×560' },
  subject: { label: 'Subject', placeholder: 'Leave empty for the default subject' },
  heading: { label: 'Heading (optional)', placeholder: 'Same as subject when empty' },
  body: { label: 'Message', placeholder: 'Write your message. Leave an empty line between paragraphs. {{name}} becomes their first name.', long: true },
  note: { label: 'Highlighted note (optional)', placeholder: 'e.g. Prizes worth ₹50,000 · Certificates for all', long: true },
};
const STATUS: Record<Campaign['status'], { label: string; cls: string }> = {
  sending: { label: 'Sending', cls: 'border-sky-500/40 text-sky-300 bg-sky-500/10' },
  paused: { label: 'Paused', cls: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
  done: { label: 'Done', cls: 'border-[#a3e635]/50 text-[#a3e635] bg-[#a3e635]/10' },
  cancelled: { label: 'Cancelled', cls: 'border-white/15 text-gray-400' },
};

const remainingToday = (p: Provider) => {
  if (!p.configured) return 0;
  const d = p.day === null ? Infinity : Math.max(0, p.day - p.usedToday);
  const m = p.month === null ? Infinity : Math.max(0, p.month - p.usedMonth);
  return Math.min(d, m);
};
const fmtN = (n: number) => (n === Infinity ? '∞' : n.toLocaleString('en-IN'));

function useRerenderOnSender() {
  const [, set] = useState(0);
  useEffect(() => sender.subscribe(() => set((x) => x + 1)), []);
}

// =====================================================================
export const CampaignsPanel: React.FC = () => {
  const [prov, setProv] = useState<ProvidersRes | null>(null);
  const [provErr, setProvErr] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [listErr, setListErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [composerKey, setComposerKey] = useState(0);
  useRerenderOnSender();

  const loadProviders = useCallback(async () => {
    try { setProv(await campaignApi<ProvidersRes>()); setProvErr(''); } catch (e) { setProvErr(e instanceof Error ? e.message : 'Could not load.'); }
  }, []);
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const r = await sbRows<Campaign>('mail_campaigns?select=*&order=created_at.desc&limit=50');
      setCampaigns(r.rows);
      setListErr('');
    } catch (e) { setListErr(e instanceof Error ? e.message : 'Could not load.'); } finally { setLoading(false); }
  }, []);
  const refresh = useCallback(() => { loadProviders(); loadCampaigns(); }, [loadProviders, loadCampaigns]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener('cx-campaign-finished', h);
    return () => window.removeEventListener('cx-campaign-finished', h);
  }, [refresh]);
  // live counters while something is sending
  useEffect(() => {
    if (!sender.running.size) return;
    const t = setInterval(loadProviders, 8000);
    return () => clearInterval(t);
  }, [loadProviders, sender.running.size]);

  const missing = prov?.tablesMissing || /mailing\.sql/.test(listErr);

  return (
    <div className="space-y-8">
      {missing && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-sm text-amber-200 flex gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>One-time setup: open <b>Supabase → SQL Editor</b>, paste the file <code className="text-amber-100">supabase/mailing.sql</code> from the repo and press <b>Run</b>. Then refresh this page.</div>
        </div>
      )}

      <ProvidersCard prov={prov} err={provErr} onRefresh={loadProviders} />

      <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5 sm:p-6">
        <h3 className="text-white font-medium flex items-center gap-2"><Send size={16} className="text-[#a3e635]" /> New campaign</h3>
        <p className="text-gray-500 text-xs mt-1">Event announcements, reminders, newsletters and notifications. Big lists are split across all connected services automatically.</p>
        <Composer key={composerKey} prov={prov} onStarted={() => { setComposerKey((k) => k + 1); refresh(); }} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">Campaigns</h3>
          <button onClick={refresh} className="text-gray-500 hover:text-white p-1.5 flex items-center gap-1.5 text-xs"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </div>
        {listErr && !missing && <p className="text-red-400 text-sm mb-3 flex gap-1.5"><AlertTriangle size={14} className="mt-0.5" /> {listErr}</p>}
        {!loading && !campaigns.length && !listErr && <p className="text-gray-500 text-sm">No campaigns yet. Your first one will show up here with live progress.</p>}
        <div className="space-y-3">
          {campaigns.map((c) => <CampaignRow key={c.id} c={c} prov={prov} onChanged={refresh} />)}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
function ProvidersCard({ prov, err, onRefresh }: { prov: ProvidersRes | null; err: string; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState<Record<string, string>>({});
  const check = async (id: string) => {
    setChecks((c) => ({ ...c, [id]: '…' }));
    try {
      const r = await campaignApi<{ ok: boolean; message: string }>({ action: 'check', provider: id });
      setChecks((c) => ({ ...c, [id]: `${r.ok ? '✓' : '✗'} ${r.message}` }));
    } catch (e) {
      setChecks((c) => ({ ...c, [id]: `✗ ${e instanceof Error ? e.message : 'Check failed'}` }));
    }
  };
  const list = prov?.providers || [];
  const connected = list.filter((p) => p.configured);
  const today = connected.reduce((a, p) => a + remainingToday(p), 0);

  return (
    <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2"><Server size={16} className="text-[#a3e635]" /> Sending power</h3>
          <p className="text-gray-500 text-xs mt-1">
            {prov ? (
              connected.length
                ? <><b className="text-white">{connected.length}</b> of {list.length} services connected · you can still send about <b className="text-[#a3e635]">{fmtN(today)}</b> emails today</>
                : <>No service connected yet. Add API keys in Vercel (see <code>MAILING_SETUP.md</code>).</>
            ) : err || 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onRefresh} className="text-gray-500 hover:text-white p-1.5" title="Refresh"><RefreshCw size={14} /></button>
          <button onClick={() => setOpen((v) => !v)} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1">
            Details <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* compact strip */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {list.map((p) => {
          const left = remainingToday(p);
          const cap = p.day ?? p.month ?? 0;
          const used = p.day !== null ? p.usedToday : p.usedMonth;
          const pct = cap ? Math.min(100, (used / cap) * 100) : 0;
          return (
            <div key={p.id} className={`rounded-xl border p-2.5 ${p.configured ? 'border-white/10 bg-white/[0.02]' : 'border-dashed border-white/8 opacity-60'}`} title={p.configured ? `${p.from}` : `Not connected: add ${p.missingEnv.join(' + ')} in Vercel`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${p.configured ? (left ? 'bg-[#a3e635]' : 'bg-amber-400') : 'bg-gray-600'}`} />
                <span className="text-xs text-white font-medium truncate">{p.label}</span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500 tabular-nums">{p.configured ? `${fmtN(left)} left ${p.day !== null ? 'today' : 'this month'}` : 'Not connected'}</p>
              <div className="mt-1.5 h-1 rounded bg-white/5 overflow-hidden"><div className="h-full bg-[#a3e635]/70" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      {open && prov && (
        <div className="mt-5 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/8">
                <th className="px-3 py-2 font-medium">Service</th><th className="px-3 py-2 font-medium">Sends from</th>
                <th className="px-3 py-2 font-medium">Today</th><th className="px-3 py-2 font-medium">This month</th><th className="px-3 py-2 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 text-white"><a href={p.dashboard} target="_blank" rel="noreferrer" className="hover:text-[#a3e635]">{p.label}</a></td>
                    <td className="px-3 py-2 text-gray-400 font-mono">{p.from}</td>
                    <td className="px-3 py-2 text-gray-300 tabular-nums">{p.usedToday} / {p.day ?? '∞'}</td>
                    <td className="px-3 py-2 text-gray-300 tabular-nums">{p.usedMonth} / {p.month ?? '∞'}</td>
                    <td className="px-3 py-2">
                      {p.configured ? <span className="text-[#a3e635]">Connected</span> : <span className="text-gray-500">Add {p.missingEnv.join(' + ')}</span>}
                      {p.configured && (
                        <button onClick={() => check(p.id)} className="ml-2 px-2 py-0.5 rounded border border-white/10 text-gray-300 hover:text-white">
                          {checks[p.id] === '…' ? 'Checking…' : 'Check'}
                        </button>
                      )}
                      {checks[p.id] && checks[p.id] !== '…' && <span className={`block mt-1 max-w-md whitespace-normal ${checks[p.id].startsWith('✓') ? 'text-[#a3e635]' : 'text-amber-300'}`}>{checks[p.id]}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {(Object.keys(KIND_INFO) as CampaignKind[]).map((k) => (
              <div key={k} className="rounded-xl border border-white/8 p-3">
                <p className="text-xs text-white flex items-center gap-1.5">{KIND_ICON[k]} {KIND_INFO[k].label} order</p>
                <p className="mt-1.5 text-[11px] text-gray-500 leading-5">
                  {prov.lanes[k].map((id) => list.find((p) => p.id === id)).filter(Boolean).map((p, i) => (
                    <span key={p!.id} className={p!.configured ? 'text-gray-300' : 'text-gray-600 line-through'}>{i ? ' → ' : ''}{p!.label}</span>
                  ))}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-600">Limits count from 05:30 IST (midnight UTC). Resend keeps 30 emails a day free for interview emails. Change any limit with an env var like <code>BREVO_DAILY_LIMIT</code>.</p>
        </div>
      )}
    </div>
  );
}

// =====================================================================
type AudType = 'all' | 'tag' | 'list';

function Composer({ prov, onStarted }: { prov: ProvidersRes | null; onStarted: () => void }) {
  const [kind, setKind] = useState<CampaignKind>('event');
  const [tpl, setTpl] = useState<CampaignTemplateId>('event_announce');
  const [vars, setVars] = useState<CampaignVars>({});
  const [aud, setAud] = useState<AudType>('all');
  const [tag, setTag] = useState('');
  const [listText, setListText] = useState('');
  const [listTag, setListTag] = useState('');
  const [name, setName] = useState('');
  const [via, setVia] = useState<string>('auto');
  const [testTo, setTestTo] = useState(() => { try { return localStorage.getItem('cx_test_email') || ''; } catch { return ''; } });
  const [busy, setBusy] = useState<'' | 'test' | 'send'>('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [tags, setTags] = useState<[string, number][]>([]);
  const [subsCount, setSubsCount] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([
          sbRows('mail_contacts?select=id&subscribed=eq.true&tags=cs.{subscriber}', { from: 0, to: 0 }),
          sbRows<{ tags: string[]; subscribed: boolean }>('mail_contacts?select=tags,subscribed&tags=neq.{}', { from: 0, to: 9999 }),
        ]);
        setSubsCount(s.total);
        const m = new Map<string, number>();
        t.rows.forEach((r) => r.tags.forEach((x) => x !== 'subscriber' && m.set(x, (m.get(x) || 0) + 1)));
        setTags([...m.entries()].sort((a, b) => b[1] - a[1]));
      } catch { /* shown elsewhere */ }
    })();
  }, []);

  const info = CAMPAIGN_TEMPLATES.find((t) => t.id === tpl)!;
  const promo = KIND_INFO[kind].promo;
  const parsed = useMemo(() => parsePeople(listText), [listText]);
  const recipients = aud === 'all' ? subsCount ?? 0 : aud === 'tag' ? tags.find(([t]) => t === tag)?.[1] ?? 0 : parsed.people.length;
  const lane = prov?.lanes[kind] || [];
  const connected = (prov?.providers || []).filter((p) => p.configured);
  const viaInfo = via === 'auto' ? null : connected.find((p) => p.id === via) || null;
  const autoOrder = lane.map((id) => connected.find((p) => p.id === id)).filter(Boolean) as Provider[];
  const capacity = viaInfo ? remainingToday(viaInfo) : autoOrder.reduce((a, p) => a + remainingToday(p), 0);
  const miss = missingField(tpl, vars);

  const pickKind = (k: CampaignKind) => {
    setKind(k);
    const first = CAMPAIGN_TEMPLATES.find((t) => t.kind === k);
    if (first && CAMPAIGN_TEMPLATES.find((t) => t.id === tpl)?.kind !== k) setTpl(first.id);
    if (k === 'notification' && aud === 'all') setAud('tag');
  };

  const preview = useMemo(
    () => renderCampaign(tpl, { ...vars, ctaLabel: vars.ctaLabel || '' }, { name: 'Aman Verma', unsubscribeUrl: promo ? 'https://cyberhx.com/unsubscribe?t=preview' : undefined }),
    [tpl, vars, promo],
  );

  const set = (k: keyof CampaignVars, v: string) => setVars((x) => ({ ...x, [k]: v }));

  const sendTest = async () => {
    setBusy('test'); setErr(''); setMsg('');
    try {
      try { localStorage.setItem('cx_test_email', testTo); } catch { /* private mode */ }
      const r = await campaignApi<{ provider: string }>({ action: 'test', kind, template: tpl, vars, to: testTo, name: 'Aman Verma', provider: via });
      setMsg(`Test sent to ${testTo} through ${prov?.providers.find((p) => p.id === r.provider)?.label || r.provider}. Check the inbox (and spam).`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Test failed.'); } finally { setBusy(''); }
  };

  const start = async () => {
    setConfirming(false); setBusy('send'); setErr(''); setMsg('');
    try {
      const audience = aud === 'all' ? { type: 'all' } : aud === 'tag' ? { type: 'tag', tag } : { type: 'list', rows: parsed.people, tag: cleanTag(listTag) || undefined };
      const r = await campaignApi<{ id: string; total: number; skipped: number }>({
        action: 'create', kind, template: tpl, vars, audience, provider: via,
        name: name.trim() || vars.eventName || vars.subject || info.label,
      });
      if (!r.total) { setErr(r.skipped ? `Nobody to send to: all ${r.skipped} people in this list unsubscribed.` : 'Nobody to send to.'); return; }
      sender.run(r.id);
      onStarted();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not start.'); } finally { setBusy(''); }
  };

  const canSend = !miss && recipients > 0 && (aud !== 'tag' || !!tag) && !busy;

  return (
    <div className="mt-5 grid gap-6 xl:grid-cols-[1.05fr_1fr]">
      <div className="space-y-6 min-w-0">
        {/* 1 type */}
        <Step n={1} title="What are you sending?">
          <div className="grid sm:grid-cols-3 gap-2">
            {(Object.keys(KIND_INFO) as CampaignKind[]).map((k) => (
              <button key={k} onClick={() => pickKind(k)}
                className={`text-left p-3 rounded-xl border transition-all ${kind === k ? 'border-[#a3e635] bg-[#a3e635]/[0.06]' : 'border-white/8 hover:border-white/20'}`}>
                <span className={`flex items-center gap-2 text-sm font-medium ${kind === k ? 'text-[#a3e635]' : 'text-white'}`}>{KIND_ICON[k]} {KIND_INFO[k].label}</span>
                <span className="block text-[11px] text-gray-500 mt-1 leading-4">{KIND_INFO[k].hint}</span>
              </button>
            ))}
          </div>
        </Step>

        {/* 2 template */}
        <Step n={2} title="Template">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CAMPAIGN_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => setTpl(t.id)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${tpl === t.id ? 'border-[#a3e635] bg-[#a3e635]/[0.06]' : 'border-white/8 hover:border-white/20'} ${t.kind !== kind && tpl !== t.id ? 'opacity-60' : ''}`}>
                <span className="block text-sm text-white font-medium">{t.label}</span>
                <span className="block text-[11px] text-gray-500 mt-0.5 leading-4">{t.hint}</span>
              </button>
            ))}
          </div>
        </Step>

        {/* 3 content */}
        <Step n={3} title="Content">
          <div className="mb-4 grid sm:grid-cols-2 gap-2">
            {([
              ['plain', 'Simple (Primary inbox)', 'Looks like a normal typed email. No images or big buttons, tracking off. Best chance of landing in Primary.'],
              ['designed', 'Designed', 'Branded dark card with a button and banner. Gmail usually files these under Promotions.'],
            ] as const).map(([id, label, hint]) => {
              const on = (vars.style === 'designed' ? 'designed' : 'plain') === id;
              return (
                <button key={id} onClick={() => set('style', id)}
                  className={`text-left p-3 rounded-xl border transition-all ${on ? 'border-[#a3e635] bg-[#a3e635]/[0.06]' : 'border-white/8 hover:border-white/20'}`}>
                  <span className={`block text-sm font-medium ${on ? 'text-[#a3e635]' : 'text-white'}`}>{label}</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5 leading-4">{hint}</span>
                </button>
              );
            })}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {info.fields.filter((f) => f !== 'image' || vars.style === 'designed').map((f) => {
              const meta = FIELD[f];
              const req = info.required.includes(f);
              const bad = miss === f && !!vars[f];
              return (
                <label key={f} className={`block ${meta.long || f === 'subject' || f === 'link' || f === 'image' ? 'sm:col-span-2' : ''}`}>
                  <span className="text-xs text-gray-400">{meta.label}{req && <span className="text-[#a3e635]"> *</span>}</span>
                  {meta.long ? (
                    <textarea value={vars[f] || ''} onChange={(e) => set(f, e.target.value)} rows={f === 'body' ? 6 : 2} placeholder={meta.placeholder} className={`${input} mt-1`} />
                  ) : (
                    <input value={vars[f] || ''} onChange={(e) => set(f, e.target.value)} placeholder={f === 'ctaLabel' ? info.defaultCta : meta.placeholder}
                      className={`${input} mt-1 ${bad ? '!border-red-500/60' : ''}`} inputMode={f === 'link' || f === 'image' ? 'url' : undefined} />
                  )}
                  {meta.hint && <span className={`block text-[11px] mt-1 ${bad ? 'text-red-400' : 'text-gray-600'}`}>{meta.hint}</span>}
                </label>
              );
            })}
          </div>
        </Step>

        {/* 4 audience */}
        <Step n={4} title="Who gets it?">
          <div className="space-y-2">
            {([
              ['all', 'All subscribers', subsCount === null ? '…' : `${subsCount.toLocaleString('en-IN')} people`],
              ['tag', 'A saved group (tag)', tags.length ? `${tags.length} groups` : 'No groups yet'],
              ['list', 'Paste or upload a list', 'CSV, sheet columns, or one per line'],
            ] as [AudType, string, string][]).map(([id, label, sub]) => (
              <label key={id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${aud === id ? 'border-[#a3e635]/60 bg-[#a3e635]/[0.04]' : 'border-white/8 hover:border-white/15'}`}>
                <input type="radio" name="aud" checked={aud === id} onChange={() => setAud(id)} className="accent-[#a3e635]" />
                <span className="text-sm text-white">{label}</span>
                <span className="ml-auto text-xs text-gray-500">{sub}</span>
              </label>
            ))}
          </div>
          {aud === 'tag' && (
            <select value={tag} onChange={(e) => setTag(e.target.value)} className={`${input} mt-3`} aria-label="Group">
              <option value="">Choose a group…</option>
              {tags.map(([t, n]) => <option key={t} value={t}>{t} · {n} people</option>)}
            </select>
          )}
          {aud === 'list' && (
            <div className="mt-3 space-y-2">
              <textarea value={listText} onChange={(e) => setListText(e.target.value)} rows={6} spellCheck={false} aria-label="People"
                placeholder={'Aman Verma, aman@gmail.com\nRiya <riya@college.edu>\nneha@gmail.com'} className={`${input} font-mono text-[13px] leading-6`} />
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <button onClick={() => file.current?.click()} className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5"><Upload size={13} /> Upload CSV</button>
                <input ref={file} type="file" accept=".csv,.txt,.tsv" className="hidden"
                  onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { if (/\.xlsx?$/i.test(f.name)) setErr('Save the Excel sheet as .csv first.'); else setListText(await f.text()); } }} />
                {listText && <span className="text-gray-400"><b className="text-white">{parsed.people.length}</b> people{parsed.bad ? <span className="text-amber-300"> · {parsed.bad} lines skipped</span> : ''}</span>}
              </div>
              <input value={listTag} onChange={(e) => setListTag(e.target.value)} placeholder="Save this list as a group (optional), e.g. ctf-oct-2026" className={input} aria-label="Group name" />
              <p className="text-[11px] text-gray-600">They are saved to Contacts with this tag (not added to Subscribers), so you can send the reminder and results to the same group later.</p>
            </div>
          )}
          {promo && <p className="mt-2 text-[11px] text-gray-600">People who unsubscribed are skipped automatically, and every email gets an unsubscribe link.</p>}
        </Step>

        {/* 5 send */}
        <Step n={5} title="Send through">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setVia('auto')}
              className={`px-3 py-2 rounded-xl border text-left transition-all ${via === 'auto' ? 'border-[#a3e635] bg-[#a3e635]/[0.06]' : 'border-white/8 hover:border-white/20'}`}>
              <span className={`block text-sm font-medium ${via === 'auto' ? 'text-[#a3e635]' : 'text-white'}`}>Automatic</span>
              <span className="block text-[11px] text-gray-500">Recommended · switches when one is full</span>
            </button>
            {connected.map((p) => {
              const left = remainingToday(p);
              return (
                <button key={p.id} onClick={() => setVia(p.id)} disabled={!left}
                  className={`px-3 py-2 rounded-xl border text-left transition-all disabled:opacity-40 ${via === p.id ? 'border-[#a3e635] bg-[#a3e635]/[0.06]' : 'border-white/8 hover:border-white/20'}`}>
                  <span className={`block text-sm font-medium ${via === p.id ? 'text-[#a3e635]' : 'text-white'}`}>{p.label}</span>
                  <span className="block text-[11px] text-gray-500 tabular-nums">{fmtN(left)} left {p.day !== null ? 'today' : 'this month'}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-gray-500 leading-5">
            {viaInfo
              ? <>Only <b className="text-gray-300">{viaInfo.label}</b> is used (from <span className="font-mono">{viaInfo.from}</span>). When its limit is reached, the campaign pauses until tomorrow.</>
              : autoOrder.length
                ? <>Order for {KIND_INFO[kind].label.toLowerCase()}: {autoOrder.map((p) => p.label).join(' → ')}</>
                : 'No email service is connected yet.'}
          </p>
        </Step>

        {/* 6 send */}
        <Step n={6} title="Test and send">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Campaign name (for you): ${vars.eventName || vars.subject || info.label}`} className={input} aria-label="Campaign name" />
          <div className="mt-3 flex gap-2">
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="your@email.com" type="email" className={input} aria-label="Test email address" />
            <button onClick={sendTest} disabled={!!busy || !!miss || !/\S+@\S+\.\S+/.test(testTo)}
              className="shrink-0 px-4 rounded-lg border border-white/15 text-sm text-gray-200 hover:text-white hover:border-white/30 disabled:opacity-40 flex items-center gap-1.5">
              {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send test
            </button>
          </div>

          {recipients > 0 && prov && (
            <div className={`mt-4 p-3 rounded-xl border text-xs leading-5 ${recipients > capacity ? 'border-amber-500/30 bg-amber-500/5 text-amber-200' : 'border-white/8 text-gray-400'}`}>
              {recipients > capacity
                ? <>About <b>{fmtN(capacity)}</b> of {recipients.toLocaleString('en-IN')} can go out today with the connected services. The rest will wait, and you press <b>Continue</b> tomorrow. Connect more services to send it all today.</>
                : <>Ready: {recipients.toLocaleString('en-IN')} emails, about {fmtN(capacity)} can go out today. Keep this page open while it sends (you can switch admin tabs).</>}
            </div>
          )}

          {!confirming ? (
            <button onClick={() => setConfirming(true)} disabled={!canSend}
              className="mt-4 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#a3e635] text-[#05080f] font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
              {busy === 'send' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send to {recipients.toLocaleString('en-IN')} {recipients === 1 ? 'person' : 'people'}
            </button>
          ) : (
            <div className="mt-4 p-4 rounded-xl border border-[#a3e635]/40 bg-[#a3e635]/[0.04]">
              <p className="text-sm text-white">Send <b>"{preview.subject}"</b> to <b>{recipients.toLocaleString('en-IN')}</b> {recipients === 1 ? 'person' : 'people'}? This can't be undone.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={start} className="px-5 py-2 rounded-lg bg-[#a3e635] text-[#05080f] font-semibold text-sm flex items-center gap-1.5"><Check size={15} /> Yes, send now</button>
                <button onClick={() => setConfirming(false)} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-300">Back</button>
              </div>
            </div>
          )}
          {miss && <p className="mt-2 text-[11px] text-gray-500">Fill in: <span className="text-amber-300">{FIELD[miss as keyof CampaignVars]?.label || miss}</span></p>}
          {msg && <p className="mt-3 text-sm text-[#a3e635] flex items-start gap-1.5"><Check size={14} className="mt-0.5 shrink-0" /> {msg}</p>}
          {err && <p className="mt-3 text-sm text-red-400 flex items-start gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {err}</p>}
        </Step>
      </div>

      {/* preview */}
      <div className="min-w-0 xl:sticky xl:top-4 self-start">
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5"><Check size={13} className="text-[#a3e635]" /> Preview <span className="text-gray-600">· as "Aman Verma" sees it</span></p>
        <div className="rounded-xl border border-white/10 overflow-hidden bg-[#05070c]">
          <p className="px-4 py-2.5 text-xs border-b border-white/8 text-gray-500 truncate">Subject: <span className="text-gray-200">{preview.subject}</span></p>
          <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="w-full h-[640px] bg-[#05070c]" />
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-sm text-white font-medium flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-full bg-[#a3e635]/15 text-[#a3e635] text-[11px] font-bold flex items-center justify-center">{n}</span>{title}
      </h4>
      {children}
    </section>
  );
}

// =====================================================================
function CampaignRow({ c, prov, onChanged }: { c: Campaign; prov: ProvidersRes | null; onChanged: () => void }) {
  useRerenderOnSender();
  const live = sender.running.get(c.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [failures, setFailures] = useState<{ email: string; error: string }[] | null>(null);

  const sent = live?.sent ?? c.sent;
  const failed = live?.failed ?? c.failed;
  const status = (live ? live.status : c.status) as Campaign['status'];
  const note = live?.note ?? c.note;
  const providers = live?.providers ?? c.providers;
  const pct = c.total ? Math.round(((sent + failed) / c.total) * 100) : 100;
  const pending = Math.max(0, c.total - sent - failed);
  const label = (id: string) => prov?.providers.find((p) => p.id === id)?.label || id;

  const act = async (action: string) => {
    setBusy(true); setErr('');
    try {
      if (action === 'continue') {
        await campaignApi({ action: 'resume', id: c.id });
        sender.run(c.id);
      } else if (action === 'pause') {
        sender.stop(c.id);
        await campaignApi({ action: 'pause', id: c.id });
      } else if (action === 'cancel') {
        if (!confirm('Stop this campaign? Emails already sent stay sent; the rest are not sent.')) return;
        sender.stop(c.id);
        await campaignApi({ action: 'cancel', id: c.id });
      } else if (action === 'retry') {
        await campaignApi({ action: 'retry', id: c.id });
        sender.run(c.id);
      }
      onChanged();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed.'); } finally { setBusy(false); }
  };

  const showFailures = async () => {
    if (failures) { setFailures(null); return; }
    try {
      const r = await sbRows<{ email: string; error: string }>(`mail_queue?select=email,error&campaign_id=eq.${c.id}&status=eq.failed&order=id&limit=200`);
      setFailures(r.rows);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load.'); }
  };

  const audienceText = c.audience?.type === 'all' ? 'All subscribers' : c.audience?.type === 'tag' ? `Group: ${c.audience.tag}` : `List of ${c.audience?.count ?? c.total}${c.audience?.tag ? ` · saved as ${c.audience.tag}` : ''}`;

  return (
    <div className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-3 flex-wrap">
        <span className="w-9 h-9 rounded-xl bg-white/[0.04] text-[#a3e635] flex items-center justify-center shrink-0">{KIND_ICON[c.kind]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white text-sm font-medium truncate max-w-[22rem]">{c.name || CAMPAIGN_TEMPLATES.find((t) => t.id === c.template)?.label}</p>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS[status]?.cls}`}>
              {live && status === 'sending' && <Loader2 size={10} className="inline animate-spin mr-1 -mt-0.5" />}{STATUS[status]?.label || status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {KIND_INFO[c.kind].label} · {CAMPAIGN_TEMPLATES.find((t) => t.id === c.template)?.label} · {audienceText} · {c.provider ? `via ${label(c.provider)} only` : 'Automatic'} · <span title={fmtDateTime(c.created_at)}>{timeAgo(c.created_at)}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(status === 'paused' || (status === 'sending' && !live)) && pending > 0 && (
            <button onClick={() => act('continue')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs bg-[#a3e635] text-[#05080f] font-semibold flex items-center gap-1 disabled:opacity-50"><Play size={12} /> Continue</button>
          )}
          {live && <button onClick={() => act('pause')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1"><Pause size={12} /> Pause</button>}
          {failed > 0 && !live && status !== 'cancelled' && (
            <button onClick={() => act('retry')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1"><RotateCcw size={12} /> Retry failed</button>
          )}
          {(status === 'sending' || status === 'paused') && pending > 0 && (
            <button onClick={() => act('cancel')} disabled={busy} title="Cancel" className="p-1.5 rounded-lg text-gray-500 hover:text-red-400"><X size={14} /></button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
          <div className="h-full bg-[#a3e635] transition-all duration-500" style={{ width: `${c.total ? (sent / c.total) * 100 : 0}%` }} />
          <div className="h-full bg-red-500/70 transition-all duration-500" style={{ width: `${c.total ? (failed / c.total) * 100 : 0}%` }} />
        </div>
        <div className="mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs">
          <span className="text-gray-300 tabular-nums"><b className="text-[#a3e635]">{sent.toLocaleString('en-IN')}</b> sent</span>
          {failed > 0 && <button onClick={showFailures} className="text-red-300 tabular-nums hover:underline">{failed} failed</button>}
          {pending > 0 && <span className="text-gray-500 tabular-nums">{pending.toLocaleString('en-IN')} waiting</span>}
          {c.skipped > 0 && <span className="text-gray-600 tabular-nums" title="These people unsubscribed earlier">{c.skipped} skipped (unsubscribed)</span>}
          <span className="text-gray-600">{pct}% of {c.total.toLocaleString('en-IN')}</span>
          {providers && Object.keys(providers).length > 0 && (
            <span className="ml-auto text-gray-500 flex items-center gap-1.5 flex-wrap">
              <Users size={12} /> {Object.entries(providers).map(([p, n]) => `${label(p)} ${n}`).join(' · ')}
            </span>
          )}
        </div>
        {note && status !== 'done' && <p className={`mt-2 text-xs ${status === 'paused' ? 'text-amber-300' : 'text-gray-500'} break-words`}>{note}</p>}
        {live && <p className="mt-2 text-[11px] text-gray-600 flex items-center gap-1.5"><CalendarDays size={11} /> Sending in batches. Keep this browser tab open; switching admin tabs is fine.</p>}
        {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
        {failures && (
          <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-white/8">
            {failures.map((f) => (
              <p key={f.email} className="px-3 py-1.5 text-xs border-b border-white/5 last:border-0"><span className="text-gray-200">{f.email}</span> <span className="text-gray-500">· {f.error}</span></p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignsPanel;
