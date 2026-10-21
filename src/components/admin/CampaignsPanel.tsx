import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BellRing, CalendarDays, Check, ChevronDown, Loader2, Megaphone, Newspaper, Pause, Play, RefreshCw,
  RotateCcw, Send, Server, Upload, Users, X, Save, FilePlus, Trash2, Eye, Repeat,
} from 'lucide-react';
import {
  CAMPAIGN_TEMPLATES, KIND_INFO, missingField, renderCampaign, SENDERS, DEFAULT_SENDER, senderName, BRAND_SENDERS,
  type CampaignKind, type CampaignTemplateId, type CampaignVars,
} from '../../../shared/campaignTemplates';
import { fmtDateTime, timeAgo } from './adminApi';
import { campaignApi, cleanTag, parsePeople, sbInsert, sbRows, sbWrite, sender } from './mailingApi';
import { AudienceFilter, describeFilter, type AudFilter } from './AudienceFilter';

// ---------- types ----------
interface Provider {
  id: string; label: string; configured: boolean; missingEnv: string[]; from: string;
  day: number | null; month: number | null; usedToday: number; usedMonth: number; dashboard: string;
}
interface ProvidersRes { providers: Provider[]; lanes: Record<CampaignKind, string[]>; primaryLane?: string[]; site: string; tablesMissing?: boolean }
/** Services that add tracking / marketing markup we can't turn off: Gmail tends to file their mail under Promotions. */
const PROMO_PRONE = ['brevo', 'sender'];
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
  sender: { label: 'From', placeholder: '' },
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
  const [preset, setPreset] = useState<Preset | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const reuseCampaign = (c: Campaign) => {
    setPreset({ name: `${c.name} (copy)`, kind: c.kind, template: c.template, vars: c.vars || {}, audience: c.audience?.type === 'filter' ? { type: 'filter', filter: c.audience.filter || {} } : c.audience?.tag ? { type: 'filter', filter: { tag: c.audience.tag } } : { type: c.audience?.type === 'all' ? 'filter' : 'list' }, provider: c.provider || 'auto' });
    setComposerKey((k) => k + 1);
    setTimeout(() => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
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
  const [composerOpen, setComposerOpen] = useState(() => !!readAutosave());
  const [showPower, setShowPower] = useState(false);
  const todayLeft = (prov?.providers || []).filter((p) => p.configured).reduce((x, p) => x + remainingToday(p), 0);
  useEffect(() => { if (preset) setComposerOpen(true); }, [preset]);

  return (
    <div className="space-y-6">
      {missing && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-sm text-amber-200 flex gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>One-time setup: open <b>Supabase → SQL Editor</b>, paste the file <code className="text-amber-100">supabase/mailing.sql</code> from the repo and press <b>Run</b>. Then refresh this page.</div>
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[28px] sm:text-[32px] font-semibold leading-none tracking-[-0.02em] text-white">Campaigns</h2>
          <p className="mt-1.5 text-[13px] text-gray-500">
            {prov ? <>About <b className="text-gray-200 tabular-nums">{fmtN(todayLeft)}</b> emails can go out today · </> : null}
            <button onClick={() => setShowPower((v) => !v)} className="text-[#0A84FF]">{showPower ? 'Hide sending power' : 'Sending power'}</button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} aria-label="Refresh" className="h-10 w-10 rounded-full bg-[#0a0f1a] border border-white/10 text-gray-300 hover:text-white flex items-center justify-center">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setComposerOpen((v) => !v)} aria-expanded={composerOpen}
            className="h-10 rounded-full bg-[#a3e635] text-[#05080f] px-4 text-[14px] font-semibold flex items-center gap-1.5 hover:bg-[#bef264]">
            {composerOpen ? <X size={17} /> : <Send size={16} />}<span className="hidden sm:inline">{composerOpen ? 'Close' : 'New campaign'}</span>
          </button>
        </div>
      </div>

      {showPower && <ProvidersCard prov={prov} err={provErr} onRefresh={loadProviders} />}

      {composerOpen && (
        <div ref={composerRef} className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-4 sm:p-6 scroll-mt-24">
          <Composer key={composerKey} prov={prov} preset={preset} onStarted={() => { setPreset(null); setComposerKey((k) => k + 1); setComposerOpen(false); refresh(); }} />
        </div>
      )}

      <div>
        <h3 className="mb-2 px-1 text-[12px] font-medium uppercase tracking-wide text-gray-500">Sent campaigns</h3>
        {listErr && !missing && <p className="text-red-400 text-sm mb-3 flex gap-1.5"><AlertTriangle size={14} className="mt-0.5" /> {listErr}</p>}
        {!loading && !campaigns.length && !listErr && <p className="text-gray-500 text-sm">No campaigns yet. Your first one will show up here with live progress.</p>}
        <div className="space-y-3">
          {campaigns.map((c) => <CampaignRow key={c.id} c={c} prov={prov} onChanged={refresh} onUseAgain={() => reuseCampaign(c)} />)}
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
                      {checks[p.id] && checks[p.id] !== '…' && <span className={`block mt-1 max-w-xl whitespace-pre-line break-words ${checks[p.id].startsWith('✓') ? 'text-[#a3e635]' : 'text-amber-300'}`}>{checks[p.id]}</span>}
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
type AudType = 'filter' | 'list';

/** Everything the composer needs to fill itself: from a saved draft, a past campaign, or the autosave. */
export interface Preset {
  draftId?: string;
  draftName?: string;
  name?: string;
  kind: CampaignKind;
  template: CampaignTemplateId;
  vars: CampaignVars;
  audience?: { type?: AudType | 'all' | 'tag'; tag?: string; filter?: AudFilter; listText?: string; listTag?: string };
  provider?: string | null;
}
interface Draft { id: string; name: string; kind: CampaignKind; template: CampaignTemplateId; vars: CampaignVars; audience: Preset['audience']; provider: string | null; updated_at: string }

const AUTOSAVE_KEY = 'cx_campaign_autosave';
const readAutosave = (): Preset | null => { try { const v = localStorage.getItem(AUTOSAVE_KEY); return v ? JSON.parse(v) : null; } catch { return null; } };

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a3e635] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1a]';
function Composer({ prov, onStarted, preset }: { prov: ProvidersRes | null; onStarted: () => void; preset?: Preset | null }) {
  const start0 = preset || readAutosave();
  const uid = useId();
  const [kind, setKind] = useState<CampaignKind>(start0?.kind || 'event');
  const [tpl, setTpl] = useState<CampaignTemplateId>(start0?.template || 'event_announce');
  const [vars, setVars] = useState<CampaignVars>(start0?.vars || {});
  const toAud = (a?: Preset['audience']): AudType => (a?.type === 'list' ? 'list' : 'filter');
  const toFilter = (a?: Preset['audience']): AudFilter => a?.filter || (a?.type === 'tag' && a.tag ? { tag: a.tag } : {});
  const [aud, setAud] = useState<AudType>(toAud(start0?.audience));
  const [filter, setFilter] = useState<AudFilter>(toFilter(start0?.audience));
  const [filterTotal, setFilterTotal] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPreview, setShowPreview] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [listText, setListText] = useState(start0?.audience?.listText || '');
  const [listTag, setListTag] = useState(start0?.audience?.listTag || '');
  const [name, setName] = useState(start0?.name || '');
  const [via, setVia] = useState<string>(start0?.provider || 'auto');
  const [draftId, setDraftId] = useState<string | undefined>(start0?.draftId);
  const [draftName, setDraftName] = useState(start0?.draftName || '');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [testTo, setTestTo] = useState(() => { try { return localStorage.getItem('cx_test_email') || ''; } catch { return ''; } });
  const [busy, setBusy] = useState<'' | 'test' | 'send' | 'save'>('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [confirming, setConfirming] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const loadDrafts = useCallback(async () => {
    try { setDrafts((await sbRows<Draft>('mail_drafts?select=*&order=updated_at.desc&limit=100')).rows); } catch { /* table may be missing */ }
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // Autosave what you're typing (this browser only), so a refresh or tab switch never loses work.
  const snapshot = (): Preset => ({ draftId, draftName, name, kind, template: tpl, vars, audience: { type: aud, filter, listText, listTag }, provider: via });
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot())); } catch { /* storage full or blocked */ } }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, draftName, name, kind, tpl, vars, aud, filter, listText, listTag, via]);

  const apply = (p: Preset) => {
    setKind(p.kind); setTpl(p.template); setVars(p.vars || {});
    setAud(toAud(p.audience)); setFilter(toFilter(p.audience)); setListText(p.audience?.listText || ''); setListTag(p.audience?.listTag || '');
    setVia(p.provider || 'auto'); setName(p.name || ''); setDraftId(p.draftId); setDraftName(p.draftName || '');
    setConfirming(false); setErr(''); setStep(1);
  };

  const info = CAMPAIGN_TEMPLATES.find((t) => t.id === tpl)!;
  const promo = KIND_INFO[kind].promo;
  const parsed = useMemo(() => parsePeople(listText), [listText]);
  const recipients = aud === 'filter' ? filterTotal ?? 0 : parsed.people.length;
  const plain = vars.style !== 'designed';
  const lane = (plain && prov?.primaryLane) || prov?.lanes[kind] || [];
  const connected = (prov?.providers || []).filter((p) => p.configured);
  const brandSender = BRAND_SENDERS[String(vars.sender ?? '')];
  const effVia = brandSender ? brandSender.provider : via;
  const brandInfo = brandSender ? (prov?.providers || []).find((p) => p.id === brandSender.provider) || null : null;
  const viaInfo = effVia === 'auto' ? null : connected.find((p) => p.id === effVia) || null;
  const autoOrder = lane.map((id) => connected.find((p) => p.id === id)).filter(Boolean) as Provider[];
  const capacity = viaInfo ? remainingToday(viaInfo) : autoOrder.reduce((a, p) => a + remainingToday(p), 0);
  const miss = missingField(tpl, vars);

  const pickKind = (k: CampaignKind) => {
    setKind(k);
    const first = CAMPAIGN_TEMPLATES.find((t) => t.kind === k);
    if (first && CAMPAIGN_TEMPLATES.find((t) => t.id === tpl)?.kind !== k) setTpl(first.id);
  };

  const preview = useMemo(
    () => renderCampaign(tpl, { ...vars, ctaLabel: vars.ctaLabel || '' }, { name: 'Aman Verma', unsubscribeUrl: promo ? 'https://cyberhx.com/unsubscribe?t=preview' : undefined }),
    [tpl, vars, promo],
  );

  const set = (k: keyof CampaignVars, v: string) => setVars((x) => ({ ...x, [k]: v }));
  const say = (m: string) => { setErr(''); setMsg(m); };

  // ---- drafts ----
  const saveDraft = async (asNew: boolean) => {
    const nm = (draftName || name || vars.eventName || vars.subject || info.label).trim().slice(0, 120);
    setBusy('save'); setErr(''); setMsg('');
    try {
      const row = { name: nm, kind, template: tpl, vars, audience: { type: aud, filter, listText: listText.slice(0, 300000), listTag }, provider: via === 'auto' ? null : via, updated_at: new Date().toISOString() };
      if (draftId && !asNew) {
        await sbWrite('PATCH', `mail_drafts?id=eq.${draftId}`, row);
      } else {
        const res = await sbInsert<Draft>('mail_drafts', row);
        setDraftId(res.id);
      }
      setDraftName(nm);
      say(`Saved as "${nm}". Pick it from Saved campaigns any time.`);
      loadDrafts();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.'); } finally { setBusy(''); }
  };
  const openDraft = (id: string) => {
    const d = drafts.find((x) => x.id === id);
    if (!d) return;
    apply({ draftId: d.id, draftName: d.name, kind: d.kind, template: d.template, vars: d.vars, audience: d.audience || {}, provider: d.provider });
    say(`Opened "${d.name}".`);
  };
  const deleteDraft = async () => {
    if (!draftId || !confirm(`Delete the saved campaign "${draftName}"?`)) return;
    try { await sbWrite('DELETE', `mail_drafts?id=eq.${draftId}`); setDraftId(undefined); say('Saved campaign deleted. What you typed is still here.'); loadDrafts(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete.'); }
  };
  const startFresh = () => {
    if (!confirm('Clear the form and start a new campaign?')) return;
    apply({ kind: 'event', template: 'event_announce', vars: {}, audience: { type: 'filter', filter: {} }, provider: 'auto' });
    say('Started a new campaign.');
  };

  const sendTest = async () => {
    setBusy('test'); setErr(''); setMsg('');
    try {
      try { localStorage.setItem('cx_test_email', testTo); } catch { /* private mode */ }
      const r = await campaignApi<{ provider: string }>({ action: 'test', kind, template: tpl, vars, to: testTo, name: 'Aman Verma', provider: effVia });
      say(`Test sent to ${testTo} through ${prov?.providers.find((p) => p.id === r.provider)?.label || r.provider}. Check the inbox (and Spam / Promotions).`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Test failed.'); } finally { setBusy(''); }
  };

  const start = async () => {
    setConfirming(false); setBusy('send'); setErr(''); setMsg('');
    try {
      const audience = aud === 'filter' ? { type: 'filter', filter } : { type: 'list', rows: parsed.people, tag: cleanTag(listTag) || undefined };
      const r = await campaignApi<{ id: string; total: number; skipped: number }>({
        action: 'create', kind, template: tpl, vars, audience, provider: effVia,
        name: name.trim() || draftName || vars.eventName || vars.subject || info.label,
      });
      if (!r.total) { setErr(r.skipped ? `Nobody to send to: all ${r.skipped} people in this list unsubscribed.` : 'Nobody to send to.'); return; }
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
      sender.run(r.id);
      onStarted();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not start.'); } finally { setBusy(''); }
  };

  const canSend = !miss && recipients > 0 && !busy;
  const id = (k: string) => `${uid}-${k}`;

  const segBtn = (on: boolean) => `px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] whitespace-nowrap transition ${on ? 'bg-white/[0.16] text-white shadow-[0_2px_8px_rgba(0,0,0,.35)]' : 'text-white/55 hover:text-white/85'}`;
  const seg = 'inline-flex rounded-[11px] bg-white/[0.07] p-[3px] border border-white/[0.06]';
  const STEPS: [1 | 2 | 3, string][] = [[1, 'Who'], [2, 'Message'], [3, 'Send']];
  const next = (n: 1 | 2 | 3) => { setStep(n); setConfirming(false); };
  const fromKeys = [...Object.keys(SENDERS), '', ...Object.keys(BRAND_SENDERS)];
  const fromLabel = (key: string) => (BRAND_SENDERS[key] ? BRAND_SENDERS[key].label : key ? `${SENDERS[key]} from CyberHx` : 'CyberHx');
  const curSender = vars.sender === undefined ? DEFAULT_SENDER : vars.sender;

  const previewBox = (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-[#05070c]">
      <p className="px-4 py-2.5 text-xs border-b border-white/10 text-gray-400 truncate">From: <span className="text-gray-100">{senderName(vars)}</span> · Subject: <span className="text-gray-100">{preview.subject}</span></p>
      <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="w-full h-[560px] bg-white" />
    </div>
  );

  return (
    <div>
      {/* Top: steps + drafts */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Steps" className={seg}>
          {STEPS.map(([n, label]) => (
            <button key={n} role="tab" aria-selected={step === n} onClick={() => next(n)} className={segBtn(step === n)}>
              <span className="tabular-nums opacity-60 mr-1">{n}</span>{label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={id('open')} className="sr-only">Saved campaigns</label>
          <select id={id('open')} value={draftId || ''} onChange={(e) => e.target.value && openDraft(e.target.value)} className={`${input} !w-auto max-w-[12rem] !py-1.5 text-[13px]`}>
            <option value="">{drafts.length ? `Drafts (${drafts.length})` : 'No drafts'}</option>
            {drafts.map((d) => <option key={d.id} value={d.id}>{d.name} · {timeAgo(d.updated_at)}</option>)}
          </select>
          <button onClick={() => saveDraft(false)} disabled={busy === 'save'} className="px-3 py-1.5 rounded-lg text-[13px] text-[#0A84FF] hover:bg-white/5 disabled:opacity-50 flex items-center gap-1.5">
            {busy === 'save' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {draftId ? 'Save' : 'Save draft'}
          </button>
          {draftId && <button onClick={deleteDraft} aria-label="Delete this draft" className="p-1.5 rounded-lg text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>}
          <button onClick={startFresh} aria-label="Start over" title="Start over" className="p-1.5 rounded-lg text-gray-500 hover:text-white"><FilePlus size={15} /></button>
        </div>
      </div>

      <div className="mt-6">
        {/* ---------------- 1. WHO ---------------- */}
        {step === 1 && (
          <section aria-label="Who gets it" className="space-y-5">
            <div className={seg} role="radiogroup" aria-label="Audience">
              <button role="radio" aria-checked={aud === 'filter'} onClick={() => setAud('filter')} className={segBtn(aud === 'filter')}>Subscribers</button>
              <button role="radio" aria-checked={aud === 'list'} onClick={() => setAud('list')} className={segBtn(aud === 'list')}>Paste a list</button>
            </div>
            {aud === 'filter' ? (
              <AudienceFilter value={filter} onChange={setFilter} onTotal={setFilterTotal} title="This campaign goes to"
                note={promo ? 'unsubscribed people are skipped' : undefined} />
            ) : (
              <div className="space-y-2">
                <label htmlFor={id('list')} className="text-xs text-gray-300">People (Name, email per line)</label>
                <textarea id={id('list')} value={listText} onChange={(e) => setListText(e.target.value)} rows={7} spellCheck={false}
                  placeholder={'Aman Verma, aman@gmail.com\nRiya <riya@college.edu>\nneha@gmail.com'} className={`${input} font-mono text-[13px] leading-6 ${focusRing}`} />
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <button onClick={() => file.current?.click()} className={`px-3 py-1.5 rounded-lg border border-white/10 text-gray-200 hover:text-white flex items-center gap-1.5 ${focusRing}`}><Upload size={13} aria-hidden="true" /> Upload CSV</button>
                  <input ref={file} type="file" accept=".csv,.txt,.tsv" className="hidden" aria-hidden="true" tabIndex={-1}
                    onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { if (/\.xlsx?$/i.test(f.name)) setErr('Save the Excel sheet as .csv first.'); else setListText(await f.text()); } }} />
                  {listText && <span className="text-gray-300" aria-live="polite"><b className="text-white">{parsed.people.length}</b> people{parsed.bad ? <span className="text-amber-300"> · {parsed.bad} lines skipped</span> : ''}</span>}
                </div>
                <label htmlFor={id('ltag')} className="text-xs text-gray-300 block pt-1">Save this list as a group (optional)</label>
                <input id={id('ltag')} value={listTag} onChange={(e) => setListTag(e.target.value)} placeholder="e.g. ctf-oct-2026" className={`${input} ${focusRing}`} />
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => next(2)} disabled={!recipients} className="px-5 py-2.5 rounded-xl bg-[#a3e635] text-[#05080f] text-[15px] font-semibold disabled:opacity-40">
                Next: write the message
              </button>
            </div>
          </section>
        )}

        {/* ---------------- 2. MESSAGE ---------------- */}
        {step === 2 && (
          <section aria-label="Message" className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-5 min-w-0">
              <div className="flex flex-wrap gap-3">
                <div className={seg} role="radiogroup" aria-label="Type">
                  {(Object.keys(KIND_INFO) as CampaignKind[]).map((k) => (
                    <button key={k} role="radio" aria-checked={kind === k} onClick={() => pickKind(k)} className={segBtn(kind === k)}>{KIND_INFO[k].label}</button>
                  ))}
                </div>
                <div className={seg} role="radiogroup" aria-label="Look">
                  <button role="radio" aria-checked={plain} onClick={() => set('style', 'plain')} className={segBtn(plain)}>Simple</button>
                  <button role="radio" aria-checked={!plain} onClick={() => set('style', 'designed')} className={segBtn(!plain)}>Designed</button>
                </div>
              </div>
              <p className="-mt-2 text-[12.5px] text-gray-500">{plain ? 'Simple looks like a normal typed email and usually lands in the main inbox.' : 'Designed has a banner and button; Gmail usually puts it in Promotions.'}</p>

              <div>
                <label htmlFor={id('tpl')} className="text-xs text-gray-300">Template</label>
                <select id={id('tpl')} value={tpl} onChange={(e) => setTpl(e.target.value as CampaignTemplateId)} className={`${input} mt-1 ${focusRing}`}>
                  {CAMPAIGN_TEMPLATES.filter((t) => t.kind === kind).map((t) => <option key={t.id} value={t.id}>{t.label} · {t.hint}</option>)}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {info.fields.filter((f) => f !== 'image' || vars.style === 'designed').map((f) => {
                  const meta = FIELD[f];
                  const req = info.required.includes(f);
                  const bad = miss === f && !!vars[f];
                  const fid = id(`f-${f}`);
                  return (
                    <div key={f} className={meta.long || f === 'subject' || f === 'link' || f === 'image' ? 'sm:col-span-2' : ''}>
                      <label htmlFor={fid} className="text-xs text-gray-300">{meta.label}{req && <span className="text-[#a3e635]" aria-hidden="true"> *</span>}</label>
                      {meta.long ? (
                        <textarea id={fid} value={vars[f] || ''} onChange={(e) => set(f, e.target.value)} rows={f === 'body' ? 7 : 2} placeholder={meta.placeholder} className={`${input} mt-1 ${focusRing}`} />
                      ) : (
                        <input id={fid} value={vars[f] || ''} onChange={(e) => set(f, e.target.value)} placeholder={f === 'ctaLabel' ? info.defaultCta : meta.placeholder}
                          aria-invalid={bad || undefined} required={req}
                          className={`${input} mt-1 ${focusRing} ${bad ? '!border-red-500/70' : ''}`} inputMode={f === 'link' || f === 'image' ? 'url' : undefined} />
                      )}
                      {meta.hint && <span className={`block text-xs mt-1 ${bad ? 'text-red-400' : 'text-gray-500'}`}>{meta.hint}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button onClick={() => next(1)} className="text-[15px] text-[#0A84FF]">Back</button>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowPreview((v) => !v)} className="xl:hidden text-[15px] text-[#0A84FF] flex items-center gap-1.5"><Eye size={15} /> {showPreview ? 'Hide preview' : 'Preview'}</button>
                  <button onClick={() => next(3)} disabled={!!miss} className="px-5 py-2.5 rounded-xl bg-[#a3e635] text-[#05080f] text-[15px] font-semibold disabled:opacity-40">Next: review</button>
                </div>
              </div>
              {miss && <p className="text-xs text-gray-400">Still needed: <span className="text-amber-300">{FIELD[miss as keyof CampaignVars]?.label || miss}</span></p>}
              {showPreview && <div className="xl:hidden">{previewBox}</div>}
            </div>
            <div className="hidden xl:block min-w-0 xl:sticky xl:top-28 self-start">{previewBox}</div>
          </section>
        )}

        {/* ---------------- 3. SEND ---------------- */}
        {step === 3 && (
          <section aria-label="Review and send" className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-5 min-w-0">
              <dl className="rounded-2xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.06] text-[14px]">
                {[
                  ['To', <>{recipients.toLocaleString('en-IN')} {recipients === 1 ? 'person' : 'people'} <span className="text-gray-500">· {aud === 'filter' ? describeFilter(filter) : `pasted list${listTag ? ` (saved as ${cleanTag(listTag)})` : ''}`}</span></>, 1],
                  ['Subject', preview.subject, 2],
                  ['Type', `${KIND_INFO[kind].label} · ${info.label} · ${plain ? 'Simple' : 'Designed'}`, 2],
                ].map(([k, v, s2]) => (
                  <div key={String(k)} className="flex items-start gap-4 px-4 py-3">
                    <dt className="w-16 shrink-0 text-gray-500">{k}</dt>
                    <dd className="min-w-0 flex-1 text-white/90 break-words">{v}</dd>
                    <button onClick={() => next(s2 as 1 | 2)} className="text-[13px] text-[#0A84FF]">Edit</button>
                  </div>
                ))}
                <div className="flex items-center gap-4 px-4 py-3">
                  <dt className="w-16 shrink-0 text-gray-500"><label htmlFor={id('from')}>From</label></dt>
                  <dd className="min-w-0 flex-1">
                    <select id={id('from')} value={curSender} onChange={(e) => set('sender', e.target.value)} className={`${input} !py-1.5`}>
                      {fromKeys.map((k) => <option key={k || 'team'} value={k}>{fromLabel(k)}</option>)}
                    </select>
                  </dd>
                </div>
              </dl>
              {brandSender && !brandInfo?.configured && (
                <p className="text-xs leading-5 p-3 rounded-xl border border-amber-500/40 bg-amber-500/5 text-amber-200">{brandSender.label} is not connected yet: add <b>{brandInfo?.missingEnv.join(' + ') || 'its API key'}</b> in Vercel, then redeploy.</p>
              )}

              {/* Test */}
              <div>
                <label htmlFor={id('test')} className="text-xs text-gray-300">Send yourself a test first</label>
                <div className="mt-1 flex gap-2">
                  <input id={id('test')} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="your@email.com" type="email" autoComplete="email" className={`${input} ${focusRing}`} />
                  <button onClick={sendTest} disabled={!!busy || !!miss || !/\S+@\S+\.\S+/.test(testTo)}
                    className={`shrink-0 px-4 rounded-lg border border-white/20 text-sm text-gray-100 hover:text-white disabled:opacity-40 flex items-center gap-1.5 ${focusRing}`}>
                    {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Test
                  </button>
                </div>
              </div>

              {/* Advanced */}
              <div className="rounded-2xl border border-white/[0.08]">
                <button onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced} className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <span className="text-[14px] text-white/85">More options <span className="text-gray-500 text-[12.5px]">· name, sending service</span></span>
                  <ChevronDown size={16} className={`text-gray-500 transition-transform ${advanced ? 'rotate-180' : ''}`} />
                </button>
                {advanced && (
                  <div className="space-y-4 border-t border-white/[0.06] px-4 pb-4 pt-3">
                    <div>
                      <label htmlFor={id('cname')} className="text-xs text-gray-300">Campaign name (only you see it)</label>
                      <input id={id('cname')} value={name} onChange={(e) => setName(e.target.value)} placeholder={draftName || vars.eventName || vars.subject || info.label} className={`${input} mt-1 ${focusRing}`} />
                    </div>
                    {!brandSender && (
                      <div>
                        <label htmlFor={id('via')} className="text-xs text-gray-300">Send through</label>
                        <select id={id('via')} value={via} onChange={(e) => setVia(e.target.value)} className={`${input} mt-1 ${focusRing}`}>
                          <option value="auto">Automatic (recommended, switches when one is full)</option>
                          {connected.filter((p) => p.id !== 'resend2').map((p) => {
                            const left = remainingToday(p);
                            return <option key={p.id} value={p.id} disabled={!left}>{p.label} · {fmtN(left)} left{PROMO_PRONE.includes(p.id) ? ' · often Promotions' : ''}</option>;
                          })}
                        </select>
                        <p className="mt-1 text-[12px] text-gray-500">{viaInfo ? `Only ${viaInfo.label} is used; when it is full the campaign pauses until tomorrow.` : autoOrder.length ? `Order: ${autoOrder.map((p) => p.label).join(' → ')}` : 'No email service is connected yet.'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {recipients > 0 && prov && (
                <p className={`text-[13px] leading-5 ${recipients > capacity ? 'text-amber-300' : 'text-gray-400'}`}>
                  {recipients > capacity
                    ? <>About {fmtN(capacity)} of {recipients.toLocaleString('en-IN')} can go out today; the rest wait and you press Continue tomorrow.</>
                    : <>All {recipients.toLocaleString('en-IN')} can go out today. Keep this tab open while it sends.</>}
                </p>
              )}

              <div className="flex items-center justify-between gap-3">
                <button onClick={() => next(2)} className="text-[15px] text-[#0A84FF]">Back</button>
                {!confirming ? (
                  <button onClick={() => setConfirming(true)} disabled={!canSend}
                    className="px-6 py-3 rounded-xl bg-[#a3e635] text-[#05080f] font-semibold text-[15px] disabled:opacity-40 flex items-center gap-2">
                    {busy === 'send' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Send to {recipients.toLocaleString('en-IN')}
                  </button>
                ) : (
                  <div role="alertdialog" aria-label="Confirm send" className="flex items-center gap-2">
                    <span className="text-[13px] text-gray-300 hidden sm:inline">Sure? This can't be undone.</span>
                    <button onClick={() => setConfirming(false)} className="px-4 py-2.5 rounded-xl border border-white/15 text-sm text-gray-200">Cancel</button>
                    <button autoFocus onClick={start} className="px-5 py-2.5 rounded-xl bg-[#FF453A] text-white font-semibold text-sm flex items-center gap-1.5"><Check size={15} /> Yes, send</button>
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0 xl:sticky xl:top-28 self-start">{previewBox}</div>
          </section>
        )}

        <div aria-live="polite" className="mt-4">
          {msg && <p role="status" className="text-sm text-[#a3e635] flex items-start gap-1.5"><Check size={14} className="mt-0.5 shrink-0" /> {msg}</p>}
          {err && <p role="alert" className="text-sm text-red-400 flex items-start gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {err}</p>}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
function CampaignRow({ c, prov, onChanged, onUseAgain }: { c: Campaign; prov: ProvidersRes | null; onChanged: () => void; onUseAgain: () => void }) {
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

  const audienceText = c.audience?.type === 'filter' ? describeFilter(c.audience.filter || {}) : c.audience?.type === 'all' ? 'All subscribers' : c.audience?.type === 'tag' ? `Group: ${c.audience.tag}` : `List of ${c.audience?.count ?? c.total}${c.audience?.tag ? ` · saved as ${c.audience.tag}` : ''}`;

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
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={onUseAgain} className="px-3 py-1.5 rounded-lg text-xs border border-white/15 text-gray-200 hover:text-white flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a3e635]" title="Copy this campaign into the form to send again">
            <Repeat size={12} aria-hidden="true" /> Use again
          </button>
          {(status === 'paused' || (status === 'sending' && !live)) && pending > 0 && (
            <button onClick={() => act('continue')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs bg-[#a3e635] text-[#05080f] font-semibold flex items-center gap-1 disabled:opacity-50"><Play size={12} /> Continue</button>
          )}
          {live && <button onClick={() => act('pause')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1"><Pause size={12} /> Pause</button>}
          {failed > 0 && !live && status !== 'cancelled' && (
            <button onClick={() => act('retry')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1"><RotateCcw size={12} /> Retry failed</button>
          )}
          {(status === 'sending' || status === 'paused') && pending > 0 && (
            <button onClick={() => act('cancel')} disabled={busy} title="Cancel" aria-label="Cancel this campaign" className="p-1.5 rounded-lg text-gray-400 hover:text-red-400"><X size={14} /></button>
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
