import React, { useEffect, useState } from 'react';
import { AlertTriangle, Copy, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { MAX_FIELD } from '../../../../shared/emailTemplates';
import { sbInsert, sbWrite } from '../mailingApi';
import {
  NEW_EVENT, Notice, SWATCHES, Section, card, eventProblems, input, label, rangeLabel, senderOptions, uid,
  type EventDraft, type Provider, type Tier, type VoucherEvent,
} from './shared';

/** Admin -> Vouchers -> Events: each CTF's look, product, redeem link, date, prize tiers and default mail service. */
export const EventsTab: React.FC<{
  events: VoucherEvent[]; loading: boolean; error: string; selId: string; providers: Provider[];
  onSelect: (id: string) => void; reload: (select?: string) => Promise<void>; onDirty: (d: boolean) => void;
}> = ({ events, loading, error, selId, providers, onSelect, reload, onDirty }) => {
  const saved = events.find((e) => e.id === selId);
  const [draft, setDraft] = useState<EventDraft>(() => (saved ? clone(saved) : NEW_EVENT()));
  const [creating, setCreating] = useState(!saved);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Follow the selected event (unless a new one is being written).
  useEffect(() => { if (!creating) setDraft(saved ? clone(saved) : NEW_EVENT()); }, [saved, creating]);

  const base = creating ? null : saved;
  const dirty = !base || JSON.stringify(strip(base)) !== JSON.stringify(strip(draft));
  useEffect(() => onDirty(dirty && (!!base || !!draft.name.trim())), [dirty, base, draft.name, onDirty]);
  const problems = eventProblems(draft);
  const opts = senderOptions(providers);

  const guard = () => !dirty || !draft.name.trim() || confirm('Discard unsaved changes to this event?');
  const pick = (id: string) => { if (!guard()) return; setCreating(false); onSelect(id); setMsg(null); };
  const startNew = () => { if (!guard()) return; setCreating(true); setDraft(NEW_EVENT()); setMsg(null); };
  const duplicate = () => { setCreating(true); setDraft({ ...draft, id: undefined, name: `${draft.name} (copy)`.slice(0, 80), tiers: draft.tiers.map((t) => ({ ...t, id: uid() })) }); setMsg(null); };

  const saveEvent = async () => {
    if (problems.length) { setMsg({ ok: false, text: problems[0] }); return; }
    if (events.some((e) => e.name.trim().toLowerCase() === draft.name.trim().toLowerCase() && e.id !== base?.id)) {
      setMsg({ ok: false, text: 'Another event already has this name.' }); return;
    }
    setSaving(true); setMsg(null);
    const row = {
      name: draft.name.trim(), color: draft.color, product: draft.product.trim() || 'CAPT certification', redeem_url: draft.redeem_url.trim(),
      expires: draft.expires || null, style: draft.style, sender: draft.sender, signer: draft.signer.trim(), note: draft.note.trim(),
      tiers: [...draft.tiers].sort((a, b) => a.from - b.from).map((t) => ({ ...t, label: t.label.trim() || rangeLabel(t), prize: t.prize.trim() })),
      updated_at: new Date().toISOString(),
    };
    try {
      if (base) { await sbWrite('PATCH', `voucher_events?id=eq.${base.id}`, row); setCreating(false); await reload(base.id); }
      else { const r = await sbInsert<VoucherEvent>('voucher_events', row); setCreating(false); await reload(r.id); }
      setMsg({ ok: true, text: `Saved ${row.name}.` });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not save.' }); }
    finally { setSaving(false); }
  };
  const deleteEvent = async () => {
    if (!base || !confirm(`Delete the event "${base.name}"?\n\nIts settings and prize tiers are removed. Records of emails already sent stay in History.`)) return;
    try { await sbWrite('DELETE', `voucher_events?id=eq.${base.id}`); setCreating(false); await reload(''); setMsg({ ok: true, text: `Deleted ${base.name}.` }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not delete.' }); }
  };
  const setTier = (id: string, patch: Partial<Tier>) => setDraft((d) => ({ ...d, tiers: d.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const addTier = () => setDraft((d) => {
    const last = Math.max(0, ...d.tiers.map((t) => t.to));
    return { ...d, tiers: [...d.tiers, { id: uid(), label: '', from: last + 1, to: last + 10, type: 'percent', percent: 50, prize: '', members: 0 }] };
  });

  return (
    <div className="space-y-5">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-white">Events</p>
            <p className="mt-1 text-[13px] text-white/45">Each CTF keeps its own look, prize tiers and mail service.</p>
          </div>
          <button onClick={startNew} className="flex items-center gap-1.5 rounded-xl bg-[#0A84FF] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#2b95ff]"><Plus size={15} /> New event</button>
        </div>
        {error && <p className="mt-4 flex items-center gap-1.5 text-sm text-red-300"><AlertTriangle size={14} />{error}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {loading && !events.length && <Loader2 size={18} className="animate-spin text-white/40" />}
          {events.map((e) => {
            const on = !creating && e.id === selId;
            return (
              <button key={e.id} onClick={() => pick(e.id)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] transition ${on ? 'border-white/30 bg-white/[0.1] text-white' : 'border-white/10 text-white/60 hover:text-white'}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />{e.name}
              </button>
            );
          })}
          {creating && <span className="flex items-center gap-2 rounded-full border border-dashed border-white/25 px-3.5 py-1.5 text-[13.5px] text-white"><span className="h-2.5 w-2.5 rounded-full" style={{ background: draft.color }} />{draft.name.trim() || 'New event'}</span>}
        </div>
      </div>

      <Section
        title={base ? 'Event settings' : 'New event'}
        sub={dirty ? <span className="text-amber-200/80">Unsaved changes</span> : 'Saved'}
        right={
          <div className="flex flex-wrap gap-2">
            {base && <button onClick={duplicate} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white"><Copy size={13} /> Duplicate</button>}
            {base && <button onClick={deleteEvent} className="flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"><Trash2 size={13} /> Delete</button>}
            {creating && events.length > 0 && <button onClick={() => { setCreating(false); setMsg(null); }} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white">Cancel</button>}
            <button onClick={saveEvent} disabled={saving || !dirty} className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-white/90 disabled:opacity-40">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save event
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className={label} htmlFor="ve-name">CTF name</label>
            <input id="ve-name" className={`${input} text-[15px] font-medium`} value={draft.name} maxLength={MAX_FIELD.event} placeholder="e.g. CyberHeist 2026" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <p className={label}>Colour</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {SWATCHES.map((c) => (
                <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setDraft({ ...draft, color: c })}
                  className={`h-8 w-8 rounded-full border-2 transition ${draft.color.toLowerCase() === c ? 'border-white' : 'border-transparent hover:border-white/40'}`} style={{ background: c }} />
              ))}
              <input type="color" aria-label="Custom colour" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="h-8 w-8 cursor-pointer rounded-full border border-white/20 bg-transparent" />
            </div>
          </div>
          <div><label className={label} htmlFor="ve-product">Voucher for</label><input id="ve-product" className={input} value={draft.product} maxLength={MAX_FIELD.product} onChange={(e) => setDraft({ ...draft, product: e.target.value })} /></div>
          <div><label className={label} htmlFor="ve-url">Redeem link</label><input id="ve-url" className={input} value={draft.redeem_url} maxLength={300} onChange={(e) => setDraft({ ...draft, redeem_url: e.target.value })} /></div>
          <div><label className={label} htmlFor="ve-exp">Apply before <span className="text-white/30">(optional)</span></label><input id="ve-exp" type="date" className={`${input} [color-scheme:dark]`} value={draft.expires || ''} onChange={(e) => setDraft({ ...draft, expires: e.target.value || null })} /></div>
        </div>

        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Prize tiers</p>
              <p className="mt-0.5 text-[12.5px] text-white/45">Each rank range gets its own prize. A team's rank picks its tier automatically.</p>
            </div>
            <button onClick={addTier} className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/5"><Plus size={13} /> Add tier</button>
          </div>
          <div className="mt-4 space-y-2.5">
            {draft.tiers.map((t) => (
              <div key={t.id} className="grid items-end gap-2.5 rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:grid-cols-[1.2fr_0.55fr_0.55fr_1fr_1.4fr_0.8fr_auto]">
                <div><label className="mb-1 block text-[11px] text-white/45">Tier name</label><input className={input} value={t.label} maxLength={40} placeholder="e.g. Winner" onChange={(e) => setTier(t.id, { label: e.target.value })} /></div>
                <div><label className="mb-1 block text-[11px] text-white/45">From rank</label><input type="number" min={1} className={input} value={t.from} onChange={(e) => setTier(t.id, { from: Math.max(1, Math.round(Number(e.target.value) || 1)) })} /></div>
                <div><label className="mb-1 block text-[11px] text-white/45">To rank</label><input type="number" min={1} className={input} value={t.to} onChange={(e) => setTier(t.id, { to: Math.max(1, Math.round(Number(e.target.value) || 1)) })} /></div>
                <div>
                  <label className="mb-1 block text-[11px] text-white/45">Prize type</label>
                  <select className={input} value={t.type} onChange={(e) => setTier(t.id, { type: e.target.value as Tier['type'] })}>
                    <option value="percent">% voucher</option>
                    <option value="custom">Custom prize</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-white/45">{t.type === 'percent' ? 'Voucher %' : 'Prize'}</label>
                  {t.type === 'percent' ? (
                    <div className="relative"><input type="number" min={1} max={100} className={`${input} pr-8`} value={t.percent} onChange={(e) => setTier(t.id, { percent: Math.min(100, Math.max(1, Math.round(Number(e.target.value) || 1))) })} /><span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">%</span></div>
                  ) : (
                    <input className={input} value={t.prize} maxLength={120} placeholder="e.g. CAPT voucher + CyberHx hoodie" onChange={(e) => setTier(t.id, { prize: e.target.value })} />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-white/45">Members who can use it</label>
                  <select className={input} value={t.members} onChange={(e) => setTier(t.id, { members: Number(e.target.value) })}>
                    <option value={0}>Team only</option>
                    {[2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>Up to {n}</option>)}
                  </select>
                </div>
                <button type="button" aria-label="Remove tier" onClick={() => setDraft({ ...draft, tiers: draft.tiers.filter((x) => x.id !== t.id) })} className="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-red-300"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-white/[0.06] pt-5 lg:grid-cols-2">
          <div>
            <p className={label}>Email style</p>
            <div role="radiogroup" aria-label="Email style" className="grid gap-2 sm:grid-cols-2">
              {([
                { v: 'plain', title: 'Simple letter', sub: 'Best for Gmail Primary. Plain text, code in bold.' },
                { v: 'designed', title: 'Designed', sub: 'Coloured card and button. Often filed in Promotions.' },
              ] as const).map((o) => {
                const on = draft.style === o.v;
                return (
                  <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => setDraft({ ...draft, style: o.v })}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${on ? 'border-[#0A84FF] bg-[#0A84FF]/10' : 'border-white/10 hover:border-white/25'}`}>
                    <span className="text-sm font-semibold text-white">{o.title}</span>
                    <span className="mt-0.5 block text-[12px] text-white/45">{o.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="ve-sender">Default mail service</label>
              <select id="ve-sender" className={input} value={draft.sender} onChange={(e) => setDraft({ ...draft, sender: e.target.value })}>
                {!opts.some((o) => o.id === draft.sender) && <option value={draft.sender}>{draft.sender}</option>}
                {opts.map((o) => <option key={o.id} value={o.id} disabled={!o.ok}>{o.label}{o.ok ? '' : ' (not connected)'}</option>)}
              </select>
              <p className="mt-1.5 text-[11.5px] text-white/35">{opts.find((o) => o.id === draft.sender)?.note} You can change it for each send.</p>
            </div>
            <div><label className={label} htmlFor="ve-signer">Signed by <span className="text-white/30">(optional)</span></label><input id="ve-signer" className={input} value={draft.signer} maxLength={MAX_FIELD.name} placeholder="Your name" onChange={(e) => setDraft({ ...draft, signer: e.target.value })} /></div>
            <div><label className={label} htmlFor="ve-note">Extra line <span className="text-white/30">(optional)</span></label><input id="ve-note" className={input} value={draft.note} maxLength={300} placeholder="Shown near the end" onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></div>
          </div>
        </div>

        {problems.length > 0 && (
          <ul className="mt-5 space-y-1 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3.5 text-[13px] text-amber-200">
            {problems.map((p) => <li key={p}>• {p}</li>)}
          </ul>
        )}
      </Section>
      <Notice msg={msg} onClose={() => setMsg(null)} />
    </div>
  );
};

const clone = (e: VoucherEvent): EventDraft => ({ ...e, tiers: e.tiers.map((t) => ({ ...t })) });
const strip = (e: EventDraft) => ({ ...e, id: undefined, created_at: undefined, updated_at: undefined } as Record<string, unknown>);
