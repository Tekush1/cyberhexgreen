import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Copy, Flag, Loader2 } from 'lucide-react';
import { Seo } from '../seo/Seo';
import { supabase } from '../../lib/supabase';
import { isEmail } from '../../lib/forms';

/* /blog/feedback: the Pinaka CTF 2026 review.
   Saved by the database function feedback_submit() into form_submissions (form = 'feedback', Admin → Inbox).
   The function returns the feedback flag, so the flag never ships in the site's code. */

const EVENT = { id: 'pinaka-ctf-2026', name: 'Pinaka CTF 2026' };

const CATEGORIES = ['Cryptography', 'Web Exploitation', 'OSINT', 'Digital Forensics', 'Reverse Engineering', 'Something else'];

const RATINGS = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Fair' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Great' },
  { value: 5, label: 'Excellent' },
];

const MORE = [
  { value: 'Yes', label: 'Yes, more' },
  { value: 'Maybe', label: 'Maybe' },
  { value: 'No', label: 'Not for me' },
];

const field =
  'w-full rounded-xl border border-white/[0.1] bg-[#070b16] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-glow focus:ring-4 focus:ring-glow/10 aria-[invalid=true]:border-red-400/70';
const labelCls = 'mb-2 block text-sm font-medium text-white/80';
const optional = <span className="font-normal text-white/35">(optional)</span>;

function Field({ id, label, hint, error, children }: { id: string; label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} {hint}
      </label>
      {children}
      {error && <p id={`${id}-err`} className="mt-1.5 text-sm text-red-300">{error}</p>}
    </div>
  );
}

/** One numbered question card. */
function Question({ n, title, error, children }: { n: number; title: string; error?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
      <h2 className="flex items-baseline gap-3 text-[17px] font-semibold text-white">
        <span className="font-mono text-xs text-lime">0{n}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}

function Scale({ value, onChange, id, label }: { value: number; onChange: (v: number) => void; id: string; label: string }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 rounded-2xl border border-white/[0.06] bg-black/30 p-1.5" role="radiogroup" aria-label={label}>
      {RATINGS.map((r) => {
        const on = value === r.value;
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(r.value)}
            className={`relative flex flex-col items-center rounded-xl px-1 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-glow ${on ? 'text-ink' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}
          >
            {on && <motion.span layoutId={`${id}-pick`} className="absolute inset-0 rounded-xl bg-lime" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <span className="relative font-display text-xl leading-none sm:text-2xl">{r.value}</span>
            <span className="relative mt-1.5 text-[11px] font-medium sm:text-xs">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const blank = { challenge: '', category: '', why: '', ui: 0, uiNotes: '', more: '', message: '', team: '', name: '', email: '' };

export default function FeedbackPage() {
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [flag, setFlag] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  const fade = reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };

  const clearErr = (k: string) => setErrors((p) => {
    if (!(k in p)) return p;
    const { [k]: _gone, ...rest } = p;
    return rest;
  });
  const on = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setF((p) => ({ ...p, [e.target.name]: e.target.value }));
    clearErr(e.target.name);
  };
  const set = (k: keyof typeof blank, v: string | number) => {
    setF((p) => ({ ...p, [k]: v }));
    clearErr(k);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (f.challenge.trim().length < 2) err.challenge = 'Name the challenge you enjoyed most.';
    if (!f.ui) err.ui = 'Rate the platform UI.';
    if (!f.more) err.more = 'Pick one.';
    if (f.name.trim().length < 2) err.name = 'Add your name.';
    if (!isEmail(f.email)) err.email = 'Add a valid email.';
    setErrors(err);
    if (Object.keys(err).length) {
      document.getElementById(`fb-${Object.keys(err)[0]}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    if (honeypot.current?.value) { setFlag(''); return; } // a bot filled the hidden field

    setBusy(true);
    setFailed('');
    const ui = RATINGS.find((r) => r.value === f.ui)!;
    const { data, error } = await supabase.rpc('feedback_submit', {
      p_name: f.name.trim(),
      p_email: f.email.trim(),
      p_message: f.message.trim().slice(0, 5000),
      p_data: {
        event: EVENT.id,
        event_name: EVENT.name,
        favourite_challenge: f.challenge.trim().slice(0, 120),
        category: f.category,
        why_it_was_good: f.why.trim().slice(0, 1000),
        ui: `${ui.value}/5 · ${ui.label}`,
        ui_notes: f.uiNotes.trim().slice(0, 1000),
        more_events: f.more,
        team_or_username: f.team.trim().slice(0, 80),
      },
    });
    setBusy(false);
    if (error || typeof data !== 'string') {
      const msg = String(error?.message || '');
      setFailed(error?.code === 'P0001' && msg ? msg : 'We could not send that. Check your connection and try again.');
      return;
    }
    setFlag(data);
    setF(blank);
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  const copy = async () => {
    if (!flag) return;
    try {
      await navigator.clipboard.writeText(flag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the flag is still on screen */ }
  };

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-white">
      <Seo
        title="Pinaka CTF 2026 Feedback — CyberHx"
        description="24 hours of Pinaka CTF 2026. Tell us which challenge you loved, how the platform felt, and whether you want more events on CyberHx."
        path="/blog/feedback"
      />
      <div className="relative mx-auto max-w-3xl px-5 sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-lime/[0.07] blur-[110px]" />

        <Link to="/blog" className="relative inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white">
          <ArrowLeft size={16} /> Back to the blog
        </Link>

        <header className="relative mt-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0b1020] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            {EVENT.name} · Feedback
          </span>
          <h1 className="font-display mt-5 text-5xl leading-[1.04] text-white sm:text-6xl">
            24 hours.<br /> Your verdict.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/55">
            Tell us which challenge you loved, how the platform felt, and whether you want more. Submit, and a flag is yours.
          </p>
        </header>

        <div className="relative mt-10 rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-4 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] sm:p-7">
          {/* Honeypot: hidden from people, bots fill it */}
          <input ref={honeypot} type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

          <div aria-live="polite">
            <AnimatePresence mode="wait">
              {flag !== null ? (
                <motion.div key="done" {...fade} className="px-2 py-10 text-center sm:py-12">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime/15 ring-1 ring-lime/30">
                    {flag ? <Flag size={24} className="text-lime" /> : <Check size={26} className="text-lime" />}
                  </span>
                  <h2 className="font-display mt-6 text-3xl sm:text-4xl">Thank you. You earned this.</h2>
                  {flag ? (
                    <>
                      <p className="mx-auto mt-3 max-w-md leading-7 text-white/55">Your feedback is with the team. Here is your flag.</p>
                      <div className="mx-auto mt-8 flex max-w-lg flex-col items-stretch gap-2 rounded-2xl border border-lime/30 bg-black/40 p-2 shadow-[0_0_60px_-20px_rgba(198,241,53,0.45)] sm:flex-row sm:items-center">
                        <code className="flex-1 select-all break-all px-3 py-3 text-left font-mono text-[15px] text-lime sm:text-base">{flag}</code>
                        <button type="button" onClick={copy} className="btn btn-lime shrink-0 justify-center">
                          {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy flag</>}
                        </button>
                      </div>
                      <p className="mt-4 text-sm text-white/40">Submit it on the CTF platform for your points.</p>
                    </>
                  ) : (
                    <p className="mx-auto mt-3 max-w-md leading-7 text-white/55">Your feedback is with the team.</p>
                  )}
                  <Link to="/blog" className="btn btn-ghost mt-8">Read the CyberHx blog</Link>
                </motion.div>
              ) : (
                <motion.form key="form" {...fade} onSubmit={send} noValidate className="space-y-4">
                  <Question n={1} title="Which challenge did you enjoy most?" error={errors.challenge}>
                    <input
                      id="fb-challenge"
                      name="challenge"
                      value={f.challenge}
                      onChange={on}
                      maxLength={120}
                      placeholder="Challenge name"
                      aria-label="Challenge name"
                      aria-invalid={!!errors.challenge}
                      className={field}
                    />
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Its category (optional)">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={f.category === c}
                          onClick={() => set('category', f.category === c ? '' : c)}
                          className={`rounded-xl border px-3 py-1.5 text-[13px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-glow ${
                            f.category === c ? 'border-lime/70 bg-lime/10 text-white' : 'border-white/10 text-white/60 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <Field id="fb-why" label="What made it stand out?" hint={optional}>
                      <textarea id="fb-why" name="why" rows={2} maxLength={1000} value={f.why} onChange={on} className={`${field} resize-y leading-7`} placeholder="The twist, the chain, the moment it clicked." />
                    </Field>
                  </Question>

                  <Question n={2} title="How did the platform feel to use?" error={errors.ui}>
                    <div id="fb-ui">
                      <Scale id="ui" label="Platform UI rating" value={f.ui} onChange={(v) => set('ui', v)} />
                    </div>
                    <Field id="fb-uiNotes" label="Anything we should refine?" hint={optional}>
                      <input id="fb-uiNotes" name="uiNotes" maxLength={1000} value={f.uiNotes} onChange={on} className={field} placeholder="Scoreboard, challenge pages, speed, mobile…" />
                    </Field>
                  </Question>

                  <Question n={3} title="Do you want more events hosted on CyberHx?" error={errors.more}>
                    <div id="fb-more" className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/[0.06] bg-black/30 p-1.5" role="radiogroup" aria-label="More events on CyberHx">
                      {MORE.map((m) => {
                        const picked = f.more === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            role="radio"
                            aria-checked={picked}
                            onClick={() => set('more', m.value)}
                            className={`relative rounded-xl px-2 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-glow ${picked ? 'text-ink' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}
                          >
                            {picked && <motion.span layoutId="more-pick" className="absolute inset-0 rounded-xl bg-lime" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                            <span className="relative">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Question>

                  <div className="space-y-5 px-1 pt-4">
                    <Field id="fb-message" label="Anything else on your mind?" hint={optional}>
                      <textarea id="fb-message" name="message" rows={3} maxLength={5000} value={f.message} onChange={on} className={`${field} resize-y leading-7`} placeholder="What you'd keep, what you'd change." />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="fb-name" label="Name" error={errors.name}>
                        <input id="fb-name" name="name" value={f.name} onChange={on} autoComplete="name" maxLength={200} className={field} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'fb-name-err' : undefined} />
                      </Field>
                      <Field id="fb-email" label="Email" error={errors.email}>
                        <input id="fb-email" name="email" type="email" value={f.email} onChange={on} autoComplete="email" maxLength={200} className={field} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'fb-email-err' : undefined} />
                      </Field>
                    </div>
                    <Field id="fb-team" label="Team name or username" hint={optional}>
                      <input id="fb-team" name="team" value={f.team} onChange={on} maxLength={80} className={field} />
                    </Field>
                    <p className="text-xs text-white/35">Only the CyberHx team sees your email.</p>

                    {failed && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{failed}</p>}
                    <button type="submit" disabled={busy} className="btn btn-lime w-full disabled:opacity-60 sm:w-auto">
                      {busy ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : <><Flag size={17} /> Submit and get the flag</>}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
