import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Seo } from '../seo/Seo';
import { isEmail, submitForm } from '../../lib/forms';

/* /blog/feedback: readers tell us what they think of the blog.
   Saved to form_submissions (form = 'feedback'), so it lands in Admin → Inbox, and emailed to the team.
   /blog/feedback?post=<slug> opens it about one post (linked from the end of every post). */

const TOPICS = [
  { id: 'overall', label: 'The blog overall' },
  { id: 'post', label: 'A specific post' },
  { id: 'idea', label: 'An idea for a post' },
  { id: 'bug', label: 'Something is broken' },
  { id: 'other', label: 'Something else' },
] as const;
type Topic = (typeof TOPICS)[number]['id'];

const RATINGS = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Fair' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Great' },
  { value: 5, label: 'Excellent' },
];

const MAX = 5000;
const SLUG = /^[a-z0-9][a-z0-9-]{0,159}$/;

const field =
  'w-full rounded-xl border border-white/[0.1] bg-[#070b16] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-glow focus:ring-4 focus:ring-glow/10 aria-[invalid=true]:border-red-400/70';
const labelCls = 'mb-2 block text-sm font-medium text-white/80';

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} {hint && <span className="font-normal text-white/35">{hint}</span>}
      </label>
      {children}
      {error && <p id={`${id}-err`} className="mt-1.5 text-sm text-red-300">{error}</p>}
    </div>
  );
}

export default function FeedbackPage() {
  const [params] = useSearchParams();
  const fromPost = SLUG.test(params.get('post') ?? '') ? (params.get('post') as string) : '';
  const blank = { topic: (fromPost ? 'post' : 'overall') as Topic, rating: 0, post: fromPost ? `https://cyberhx.com/blog/${fromPost}` : '', message: '', name: '', email: '' };

  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [done, setDone] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  const fade = reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };

  const on = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [e.target.name]: e.target.value }));
  const topic = TOPICS.find((t) => t.id === f.topic)!;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (f.message.trim().length < 10) err.message = 'Tell us a little more (at least 10 characters).';
    if (f.name.trim().length < 2) err.name = 'Add your name.';
    if (!isEmail(f.email)) err.email = 'Add an email we can reply to.';
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    setFailed('');
    const rating = RATINGS.find((r) => r.value === f.rating);
    const post = f.topic === 'post' ? f.post.trim().slice(0, 300) : '';
    const res = await submitForm({
      subject: `Blog feedback: ${topic.label}${rating ? ` (${rating.value}/5)` : ''} — ${f.name.trim()}`,
      table: 'form_submissions',
      replyTo: f.email,
      honeypot: honeypot.current?.value,
      row: {
        form: 'feedback',
        name: f.name,
        email: f.email,
        subject: `Blog feedback · ${topic.label}`,
        message: f.message.slice(0, MAX),
        page: fromPost ? `/blog/${fromPost}` : '/blog/feedback',
        data: { topic: topic.label, rating: rating ? `${rating.value}/5 · ${rating.label}` : '', post },
      },
      email: { name: f.name, email: f.email, topic: topic.label, rating: rating ? `${rating.value}/5 (${rating.label})` : '', post, message: f.message },
    });
    setBusy(false);
    if (res.ok) {
      setF(blank);
      setDone(true);
    } else setFailed('We could not send that. Check your connection, or email contact@cyberhx.com.');
  };

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-white">
      <Seo
        title="Feedback — CyberHx Blog"
        description="Tell the CyberHx team what you think of the blog: a post you liked, something that's broken, or an idea for what we should write next."
        path="/blog/feedback"
      />
      <div className="relative mx-auto max-w-3xl px-5 sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-lime/[0.07] blur-[110px]" />

        <Link to={fromPost ? `/blog/${fromPost}` : '/blog'} className="relative inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white">
          <ArrowLeft size={16} /> {fromPost ? 'Back to the post' : 'Back to the blog'}
        </Link>

        <header className="relative mt-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0b1020] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            Blog feedback
          </span>
          <h1 className="font-display mt-5 text-5xl leading-[1.04] text-white sm:text-6xl">
            Tell us what<br className="hidden sm:block" /> you think.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/55">
            A post that helped, one that missed, or something you want us to write next. Every note is read by the team behind the blog.
          </p>
        </header>

        <div className="relative mt-10 rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-5 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] sm:p-8">
          {/* Honeypot: hidden from people, bots fill it */}
          <input ref={honeypot} type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

          <div aria-live="polite">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" {...fade} className="py-12 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime/15 ring-1 ring-lime/30">
                    <Check size={26} className="text-lime" />
                  </span>
                  <h2 className="font-display mt-6 text-3xl">Thank you.</h2>
                  <p className="mx-auto mt-3 max-w-md leading-7 text-white/55">
                    Your feedback is with the team. If it needs a reply, we'll write to the email you gave us.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link to="/blog" className="btn btn-lime">Back to the blog</Link>
                    <button type="button" onClick={() => setDone(false)} className="btn btn-ghost">Send more feedback</button>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" {...fade} onSubmit={send} noValidate className="space-y-7">
                  <fieldset>
                    <legend className={labelCls}>What is it about?</legend>
                    <div className="flex flex-wrap gap-2">
                      {TOPICS.map((t) => (
                        <label
                          key={t.id}
                          className={`cursor-pointer rounded-xl border px-3.5 py-2 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-glow ${
                            f.topic === t.id ? 'border-lime/70 bg-lime/10 text-white' : 'border-white/10 text-white/65 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          <input type="radio" name="topic" value={t.id} checked={f.topic === t.id} onChange={on} className="sr-only" />
                          {t.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {f.topic === 'post' && (
                    <Field id="fb-post" label="Which post?" hint="(link or title)">
                      <input id="fb-post" name="post" value={f.post} onChange={on} maxLength={300} placeholder="https://cyberhx.com/blog/…" className={field} />
                    </Field>
                  )}

                  <fieldset>
                    <legend className={labelCls}>
                      How is the blog for you? <span className="font-normal text-white/35">(optional)</span>
                    </legend>
                    <div className="grid grid-cols-5 gap-1.5 rounded-2xl border border-white/[0.06] bg-black/30 p-1.5" role="radiogroup" aria-label="Rating">
                      {RATINGS.map((r) => {
                        const on_ = f.rating === r.value;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            role="radio"
                            aria-checked={on_}
                            onClick={() => setF((p) => ({ ...p, rating: p.rating === r.value ? 0 : r.value }))}
                            className={`relative flex flex-col items-center rounded-xl px-1 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-glow ${on_ ? 'text-ink' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}
                          >
                            {on_ && <motion.span layoutId="fb-rating" className="absolute inset-0 rounded-xl bg-lime" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                            <span className="relative font-display text-xl leading-none sm:text-2xl">{r.value}</span>
                            <span className="relative mt-1.5 text-[11px] font-medium sm:text-xs">{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <Field id="fb-message" label="Your feedback" error={errors.message}>
                    <textarea
                      id="fb-message"
                      name="message"
                      rows={6}
                      maxLength={MAX}
                      value={f.message}
                      onChange={on}
                      className={`${field} resize-y leading-7`}
                      placeholder={f.topic === 'idea' ? 'What should we write about, and why?' : f.topic === 'bug' ? 'What broke, and on which page or device?' : 'What worked, what did not, what you would change.'}
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'fb-message-err' : undefined}
                    />
                    <p className="mt-1.5 text-right text-xs tabular-nums text-white/30">{f.message.length} / {MAX}</p>
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="fb-name" label="Name" error={errors.name}>
                      <input id="fb-name" name="name" value={f.name} onChange={on} autoComplete="name" maxLength={200} className={field} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'fb-name-err' : undefined} />
                    </Field>
                    <Field id="fb-email" label="Email" error={errors.email}>
                      <input id="fb-email" name="email" type="email" value={f.email} onChange={on} autoComplete="email" maxLength={200} className={field} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'fb-email-err' : undefined} />
                    </Field>
                  </div>
                  <p className="-mt-3 text-xs text-white/35">Only the CyberHx team sees your email. We use it just to reply.</p>

                  {failed && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{failed}</p>}
                  <button type="submit" disabled={busy} className="btn btn-lime w-full disabled:opacity-60 sm:w-auto">
                    {busy ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : 'Send feedback'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
