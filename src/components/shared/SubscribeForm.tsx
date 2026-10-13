import { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

/** Newsletter sign-up. Saves to Supabase through /api/subscribe (people can unsubscribe from any email). */
export function SubscribeForm({ source = 'footer' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [trap, setTrap] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    setMsg('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, website: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not subscribe. Try again.');
      setState('done');
    } catch (err) {
      setState('error');
      setMsg(err instanceof Error ? err.message : 'Could not subscribe. Try again.');
    }
  };

  if (state === 'done') {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-lime/30 bg-lime/[0.06] px-4 py-3.5 text-sm text-white/85" role="status">
        <Check size={17} className="shrink-0 text-lime" /> You're in. New events and drops will land in your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <label htmlFor={`sub-${source}`} className="sr-only">Email address</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`sub-${source}`}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white placeholder:text-white/35 outline-none transition-colors focus:border-lime/60"
        />
        {/* Honeypot: hidden from people, bots fill it in. */}
        <input type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} className="hidden" aria-hidden="true" />
        <button
          type="submit"
          disabled={state === 'busy'}
          className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-lime px-5 font-semibold text-[#071003] transition-all hover:shadow-[0_0_28px_rgba(198,241,53,0.45)] disabled:opacity-70"
        >
          {state === 'busy' ? <Loader2 size={17} className="animate-spin" /> : null}
          Subscribe
          {state !== 'busy' && <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />}
        </button>
      </div>
      <p className={`mt-2 text-xs ${state === 'error' ? 'text-red-400' : 'text-white/40'}`} role={state === 'error' ? 'alert' : undefined}>
        {state === 'error' ? msg : 'Event announcements and CTF drops. No spam, unsubscribe anytime.'}
      </p>
    </form>
  );
}

export default SubscribeForm;
