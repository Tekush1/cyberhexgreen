import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Loader2, MailX } from 'lucide-react';
import { SubscribeForm } from '../components/shared/SubscribeForm';

/** /unsubscribe?t=<token>: one button, so link scanners in mail apps can't unsubscribe people by accident. */
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const go = async () => {
    setState('busy');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unsubscribe', token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Something went wrong.');
      setEmail(data.email || '');
      setState('done');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Something went wrong.');
      setState('error');
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-5 py-28">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 sm:p-9">
        {state === 'done' ? (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime/10 text-lime"><Check size={24} /></span>
            <h1 className="font-display mt-5 text-3xl text-white">You're unsubscribed.</h1>
            <p className="mt-3 leading-7 text-muted">
              {email ? <><span className="text-white/80">{email}</span> won't get </> : "You won't get "}
              CyberHx event and newsletter emails any more. Emails about something you signed up for (like an event you registered for) can still reach you.
            </p>
            <p className="mt-6 text-sm text-white/45">Changed your mind? Subscribe again:</p>
            <div className="mt-3"><SubscribeForm source="resubscribe" /></div>
          </>
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-white/70"><MailX size={24} /></span>
            <h1 className="font-display mt-5 text-3xl text-white">Unsubscribe from CyberHx emails?</h1>
            <p className="mt-3 leading-7 text-muted">You'll stop getting event announcements and newsletters from us.</p>
            {!token ? (
              <p className="mt-6 text-red-400">This link is incomplete. Please use the unsubscribe link from the email.</p>
            ) : (
              <button
                onClick={go}
                disabled={state === 'busy'}
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-lime px-6 font-semibold text-[#071003] transition-shadow hover:shadow-[0_0_28px_rgba(198,241,53,0.45)] disabled:opacity-70"
              >
                {state === 'busy' && <Loader2 size={17} className="animate-spin" />}
                Yes, unsubscribe me
              </button>
            )}
            {state === 'error' && <p className="mt-4 text-sm text-red-400" role="alert">{msg}</p>}
            <p className="mt-8 text-sm text-white/40"><Link to="/" className="hover:text-white">Back to cyberhx.com</Link></p>
          </>
        )}
      </div>
    </section>
  );
}
