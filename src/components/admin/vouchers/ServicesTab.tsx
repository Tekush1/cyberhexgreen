import React, { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { sbWrite } from '../mailingApi';
import { CHAIN, Notice, PER_MINUTE, Section, btn, when, type Provider, type Rest } from './shared';

/** Admin -> Vouchers -> Mail services: which services are connected, how much they sent today, which are at their limit. */
export const ServicesTab: React.FC<{ providers: Provider[]; rests: Rest[]; loading: boolean; reload: () => void }> = ({ providers, rests, loading, reload }) => {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const list = providers.filter((p) => !p.id.startsWith('resend'));
  const lift = async (p: string) => {
    if (!confirm(`Let the queue try ${p} again now? If it is still at its limit it will be skipped again.`)) return;
    setBusy(p);
    try { await sbWrite('DELETE', `mail_provider_rest?provider=eq.${encodeURIComponent(p)}`); setMsg({ ok: true, text: `${p} will be tried again on the next minute.` }); reload(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not change that.' }); }
    finally { setBusy(''); }
  };
  return (
    <div className="space-y-5">
      <Section title="How emails go out"
        sub={`The queue sends about ${PER_MINUTE} emails a minute, one by one, around the clock. Each send starts with the service you pick; when a service says it is at its limit, it is skipped until its limit resets and the next one in line sends: ${CHAIN.join(' → ')}. "mail@cyberhx.com only" never switches. Resend is never used for vouchers.`}
        right={<button onClick={reload} className={btn}>{loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh</button>}>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="bg-[#10151f]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-3 py-2.5 font-medium">Service</th>
                <th className="px-3 py-2.5 font-medium">Sends from</th>
                <th className="px-3 py-2.5 font-medium">Today</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {!list.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-white/40">{loading ? 'Loading…' : 'Could not load the services.'}</td></tr>}
              {list.map((p) => {
                const rest = rests.find((r) => r.provider === p.id);
                return (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="px-3 py-2.5 font-medium text-white">{p.label}</td>
                    <td className="px-3 py-2.5 text-white/55">{p.from.replace(/^.*<|>$/g, '')}</td>
                    <td className="px-3 py-2.5 tabular-nums text-white/70">{(p.usedToday ?? 0).toLocaleString('en-IN')}{p.day ? <span className="text-white/35"> / {p.day.toLocaleString('en-IN')}</span> : ''}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {!p.configured ? <span className="text-white/35">Not connected</span>
                        : rest ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-amber-200" title={rest.reason}>At its limit until {when(rest.until)}</span>
                            <button onClick={() => lift(p.id)} disabled={!!busy} className={btn}>{busy === p.id ? <Loader2 size={12} className="animate-spin" /> : null}Try it again now</button>
                          </span>
                        ) : <span className="text-[#30d158]">Ready</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rests.some((r) => r.reason) && (
          <ul className="mt-3 space-y-1 text-[12px] text-white/40">
            {rests.map((r) => <li key={r.provider}><span className="text-white/60">{r.provider}:</span> {r.reason}</li>)}
          </ul>
        )}
      </Section>
      <Notice msg={msg} onClose={() => setMsg(null)} />
    </div>
  );
};
