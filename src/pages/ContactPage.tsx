import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, FileText, Loader2, Mail, MapPin, Upload, X } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { Mascot } from '../components/shared/Mascot';
import { isEmail, submitForm, uploadResume } from '../lib/forms';

/* Contact page: one place to send a message or apply to join.
   Messages  → email + Supabase form_submissions  (Admin → Inbox)
   Applying  → email + Supabase job_applications  (Admin → Applications), resume in a private bucket */

type Mode = 'message' | 'apply';

const TOPICS = [
  { id: 'general', label: 'General question' },
  { id: 'partnership', label: 'Partnership or sponsorship' },
  { id: 'ctf', label: 'Hosting a CTF' },
  { id: 'training', label: 'Training or workshop' },
  { id: 'media', label: 'Media or press' },
  { id: 'other', label: 'Something else' },
] as const;
type Topic = (typeof TOPICS)[number]['id'];

const ROLES = [
  { id: 'sales-relationship', label: 'Sales and relationship' },
  { id: 'content-design', label: 'Content and design' },
  { id: 'security-research', label: 'Security research' },
  { id: 'development', label: 'Development' },
  { id: 'other', label: 'Other' },
];

const DIRECT = [
  { label: 'General', email: 'contact@cyberhx.com' },
  { label: 'Support', email: 'support@cyberhx.com' },
  { label: 'Careers', email: 'hr@cyberhx.com' },
];

const emptyMsg = { name: '', email: '', phone: '', topic: 'general' as Topic, message: '' };
const emptyApp = {
  full_name: '',
  email: '',
  phone: '',
  position: 'sales-relationship',
  college: '',
  year: '',
  portfolio: '',
  availability: '',
  experience: '',
  motivation: '',
};

const field =
  'w-full rounded-xl border border-white/[0.1] bg-[#070b16] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-glow focus:ring-4 focus:ring-glow/10 aria-[invalid=true]:border-red-400/70';
const labelCls = 'mb-2 block text-sm font-medium text-white/80';

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} {hint && <span className="font-normal text-muted">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export const ContactPage = () => {
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(() => (params.has('apply') ? 'apply' : 'message'));
  const [msg, setMsg] = useState(emptyMsg);
  const [app, setApp] = useState(emptyApp);
  const [resume, setResume] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [done, setDone] = useState<null | Mode>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onMsg = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setMsg((m) => ({ ...m, [e.target.name]: e.target.value }));
  const onApp = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setApp((a) => ({ ...a, [e.target.name]: e.target.value }));

  const pickFile = (f?: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, resume: 'The resume must be under 5 MB.' }));
      return;
    }
    setErrors(({ resume: _r, ...rest }) => rest);
    setResume(f);
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (msg.name.trim().length < 2) err.name = 'Add your name.';
    if (!isEmail(msg.email)) err.email = 'Add an email we can reply to.';
    if (msg.message.trim().length < 10) err.message = 'Tell us a little more (at least 10 characters).';
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    setFailed('');
    const topic = TOPICS.find((t) => t.id === msg.topic)!;
    const res = await submitForm({
      subject: `Contact: ${topic.label} — ${msg.name}`,
      table: 'form_submissions',
      replyTo: msg.email,
      honeypot: honeypot.current?.value,
      row: {
        form: msg.topic === 'partnership' ? 'partnership' : 'contact',
        name: msg.name,
        email: msg.email,
        phone: msg.phone,
        subject: topic.label,
        message: msg.message,
        page: '/contact',
        data: { topic: topic.label },
      },
      email: { name: msg.name, email: msg.email, phone: msg.phone, topic: topic.label, message: msg.message },
    });
    setBusy(false);
    if (res.ok) {
      setMsg(emptyMsg);
      setDone('message');
    } else setFailed('We could not send that. Check your connection, or email contact@cyberhx.com.');
  };

  const sendApplication = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (app.full_name.trim().length < 2) err.full_name = 'Add your full name.';
    if (!isEmail(app.email)) err.email = 'Add an email we can reach you on.';
    if (app.phone.replace(/\D/g, '').length < 8) err.phone = 'Add a phone number.';
    if (app.motivation.trim().length < 20) err.motivation = 'Tell us why in a few lines (at least 20 characters).';
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    setFailed('');
    let resume_path = '';
    if (resume) {
      try {
        resume_path = await uploadResume(resume);
      } catch (x) {
        setBusy(false);
        setErrors({ resume: (x as Error).message });
        return;
      }
    }
    const role = ROLES.find((r) => r.id === app.position)?.label ?? app.position;
    const res = await submitForm({
      subject: `Application: ${role} — ${app.full_name}`,
      table: 'job_applications',
      replyTo: app.email,
      honeypot: honeypot.current?.value,
      row: {
        ...app,
        resume_path,
        resume_note: resume ? `${resume.name} (in Admin → Applications)` : 'No resume attached',
        source: 'contact-page',
      },
      email: { ...app, role, resume: resume ? `${resume.name} — download it from Admin → Applications` : 'Not attached' },
    });
    setBusy(false);
    if (res.ok) {
      setApp(emptyApp);
      setResume(null);
      setDone('apply');
    } else setFailed('We could not send your application. Check your connection, or email hr@cyberhx.com.');
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setFailed('');
    setDone(null);
  };

  const fade = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="Contact CyberHx — Questions, Partnerships & Careers"
        description="Talk to the CyberHx team about hosting a CTF, partnerships, training, or join us in sales and relationship roles. We reply by email."
        path="/contact"
      />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 sm:pt-32">
        <div className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-glow/[0.08] blur-[120px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-end gap-8 px-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div className="pb-12 sm:pb-16">
            <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">Let's talk.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              Hosting a CTF, partnering with us, or want to join the team? Send a note and a real person will reply by email.
            </p>
          </div>
          <Mascot pose="love" alt="CyberHx mascot holding a heart" eager className="mx-auto -mb-2 w-44 sm:w-52 lg:w-60" />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_22rem] lg:gap-14 lg:px-8">
        {/* Form card */}
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-5 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] sm:p-8">
          {/* Mode switch */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.06] bg-black/30 p-1.5" role="tablist" aria-label="What do you want to do?">
            {(
              [
                ['message', 'Send a message'],
                ['apply', 'Apply to join'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`relative rounded-xl px-3 py-2.5 text-sm font-semibold transition ${mode === m ? 'text-ink' : 'text-white/60 hover:text-white'}`}
              >
                {mode === m && (
                  <motion.span layoutId="contact-tab" className="absolute inset-0 rounded-xl bg-lime" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>

          {/* Honeypot: hidden from people, bots fill it */}
          <input ref={honeypot} type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

          <div aria-live="polite">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" {...fade} className="py-12 text-center">
                  <Mascot pose={done === 'apply' ? 'thumbs' : 'cheer'} alt="" className="mx-auto w-36" />
                  <h2 className="font-display mt-5 text-3xl">{done === 'apply' ? 'Application received.' : 'Message sent.'}</h2>
                  <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
                    {done === 'apply'
                      ? 'Thanks for applying. We read every application and email shortlisted people to set up a call.'
                      : 'Thanks for writing in. We will reply to the email you gave us.'}
                  </p>
                  <button type="button" onClick={() => setDone(null)} className="btn btn-ghost mt-7">
                    {done === 'apply' ? 'Submit another application' : 'Send another message'}
                  </button>
                </motion.div>
              ) : mode === 'message' ? (
                <motion.form key="message" {...fade} onSubmit={sendMessage} noValidate className="mt-7 space-y-6">
                  <fieldset>
                    <legend className={labelCls}>What is it about?</legend>
                    <div className="flex flex-wrap gap-2">
                      {TOPICS.map((t) => (
                        <label
                          key={t.id}
                          className={`cursor-pointer rounded-xl border px-3.5 py-2 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-glow ${
                            msg.topic === t.id ? 'border-glow bg-glow/10 text-white' : 'border-white/10 text-white/65 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          <input type="radio" name="topic" value={t.id} checked={msg.topic === t.id} onChange={onMsg} className="sr-only" />
                          {t.label}
                        </label>
                      ))}
                    </div>
                    {msg.topic === 'ctf' && (
                      <p className="mt-3 rounded-xl border border-lime/25 bg-lime/[0.06] px-4 py-3 text-sm text-white/80">
                        Know what you want? <Link to="/host-your-ctf#build" className="font-semibold text-lime underline-offset-4 hover:underline">Build and price your CTF</Link> in a couple of minutes.
                      </p>
                    )}
                  </fieldset>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="c-name" label="Name" error={errors.name}>
                      <input id="c-name" name="name" value={msg.name} onChange={onMsg} autoComplete="name" className={field} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'c-name-err' : undefined} />
                    </Field>
                    <Field id="c-email" label="Email" error={errors.email}>
                      <input id="c-email" name="email" type="email" value={msg.email} onChange={onMsg} autoComplete="email" className={field} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'c-email-err' : undefined} />
                    </Field>
                  </div>
                  <Field id="c-phone" label="Phone" hint="(optional)">
                    <input id="c-phone" name="phone" type="tel" value={msg.phone} onChange={onMsg} autoComplete="tel" placeholder="With country code" className={field} />
                  </Field>
                  <Field id="c-message" label="Message" error={errors.message}>
                    <textarea id="c-message" name="message" rows={6} value={msg.message} onChange={onMsg} className={`${field} resize-y leading-7`} placeholder="A few lines about what you need." aria-invalid={!!errors.message} aria-describedby={errors.message ? 'c-message-err' : undefined} />
                  </Field>

                  {failed && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{failed}</p>}
                  <button type="submit" disabled={busy} className="btn btn-lime w-full disabled:opacity-60 sm:w-auto">
                    {busy ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : 'Send message'}
                  </button>
                </motion.form>
              ) : (
                <motion.form key="apply" {...fade} onSubmit={sendApplication} noValidate className="mt-7 space-y-6">
                  <p className="rounded-xl border border-glow/25 bg-glow/[0.06] px-4 py-3 text-sm leading-6 text-white/80">
                    We're hiring for <strong className="text-white">sales and relationship</strong> roles right now. You can apply for other roles too.
                  </p>

                  <Field id="a-role" label="Role">
                    <select id="a-role" name="position" value={app.position} onChange={onApp} className={field}>
                      {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="a-name" label="Full name" error={errors.full_name}>
                      <input id="a-name" name="full_name" value={app.full_name} onChange={onApp} autoComplete="name" className={field} aria-invalid={!!errors.full_name} aria-describedby={errors.full_name ? 'a-name-err' : undefined} />
                    </Field>
                    <Field id="a-email" label="Email" error={errors.email}>
                      <input id="a-email" name="email" type="email" value={app.email} onChange={onApp} autoComplete="email" className={field} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'a-email-err' : undefined} />
                    </Field>
                    <Field id="a-phone" label="Phone" error={errors.phone}>
                      <input id="a-phone" name="phone" type="tel" value={app.phone} onChange={onApp} autoComplete="tel" placeholder="With country code" className={field} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'a-phone-err' : undefined} />
                    </Field>
                    <Field id="a-college" label="College or company" hint="(optional)">
                      <input id="a-college" name="college" value={app.college} onChange={onApp} autoComplete="organization" className={field} />
                    </Field>
                    <Field id="a-year" label="Year or experience" hint="(optional)">
                      <input id="a-year" name="year" value={app.year} onChange={onApp} placeholder="3rd year, or 2 years in sales" className={field} />
                    </Field>
                    <Field id="a-availability" label="When can you start?" hint="(optional)">
                      <select id="a-availability" name="availability" value={app.availability} onChange={onApp} className={field}>
                        <option value="">Choose one</option>
                        <option value="immediately">Right away</option>
                        <option value="2-weeks">Within 2 weeks</option>
                        <option value="1-month">Within a month</option>
                        <option value="flexible">Flexible</option>
                      </select>
                    </Field>
                  </div>
                  <Field id="a-portfolio" label="LinkedIn or portfolio" hint="(optional)">
                    <input id="a-portfolio" name="portfolio" type="url" value={app.portfolio} onChange={onApp} placeholder="https://" className={field} />
                  </Field>
                  <Field id="a-motivation" label="Why CyberHx?" error={errors.motivation}>
                    <textarea id="a-motivation" name="motivation" rows={5} value={app.motivation} onChange={onApp} className={`${field} resize-y leading-7`} placeholder="What you'd bring, and what you want to learn." aria-invalid={!!errors.motivation} aria-describedby={errors.motivation ? 'a-motivation-err' : undefined} />
                  </Field>

                  {/* Resume */}
                  <div>
                    <p className={labelCls}>
                      Resume <span className="font-normal text-muted">(optional, PDF or Word, up to 5 MB)</span>
                    </p>
                    {resume ? (
                      <div className="flex items-center gap-3 rounded-xl border border-lime/30 bg-lime/[0.05] px-4 py-3">
                        <FileText size={20} className="shrink-0 text-lime" />
                        <span className="min-w-0 flex-1 truncate text-sm">{resume.name}</span>
                        <button type="button" onClick={() => setResume(null)} aria-label="Remove resume" className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        onDragOver={(e: DragEvent) => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={(e: DragEvent) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
                        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${drag ? 'border-glow bg-glow/[0.06]' : 'border-white/12 hover:border-white/25'}`}
                      >
                        <Upload size={22} className="text-glow" />
                        <span className="text-sm font-semibold">Drop your resume here or click to choose</span>
                      </button>
                    )}
                    <input ref={fileInput} type="file" hidden accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                    {errors.resume && <p className="mt-1.5 text-sm text-red-300">{errors.resume}</p>}
                  </div>

                  {failed && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{failed}</p>}
                  <button type="submit" disabled={busy} className="btn btn-lime w-full disabled:opacity-60 sm:w-auto">
                    {busy ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : 'Send application'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Side info */}
        <aside className="space-y-5 lg:pt-2">
          <div className="rounded-3xl border border-white/[0.08] bg-[#080d1a] p-6">
            <h2 className="font-semibold">Email us directly</h2>
            <ul className="mt-4 space-y-3">
              {DIRECT.map((d) => (
                <li key={d.email}>
                  <a href={`mailto:${d.email}`} className="group flex items-center gap-3 rounded-xl px-1 py-1 transition hover:text-glow">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-glow"><Mail size={16} /></span>
                    <span className="min-w-0">
                      <span className="block text-xs text-muted">{d.label}</span>
                      <span className="block truncate text-sm font-medium">{d.email}</span>
                    </span>
                  </a>
                </li>
              ))}
              <li className="flex items-center gap-3 px-1 py-1">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-glow"><MapPin size={16} /></span>
                <span>
                  <span className="block text-xs text-muted">Where we work</span>
                  <span className="block text-sm font-medium">Worldwide, fully remote</span>
                </span>
              </li>
            </ul>
          </div>

          <Link to="/host-your-ctf#build" className="group block rounded-3xl border border-lime/25 bg-lime/[0.04] p-6 transition hover:border-lime/50">
            <p className="font-semibold">Planning a CTF?</p>
            <p className="mt-1.5 text-sm leading-6 text-muted">Build it part by part and see the price before you talk to us.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lime">
              Open the builder <ArrowUpRight size={15} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link to="/responsible-disclosure" className="group block rounded-3xl border border-white/[0.08] bg-[#080d1a] p-6 transition hover:border-white/20">
            <p className="font-semibold">Found a security bug?</p>
            <p className="mt-1.5 text-sm leading-6 text-muted">Please report it privately through our disclosure policy.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-glow">
              Report a bug <ArrowUpRight size={15} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </Link>

          <p className="flex items-start gap-2 px-1 text-xs leading-5 text-muted">
            <Check size={14} className="mt-0.5 shrink-0 text-lime" />
            <span>
              Your details are only used to reply to you. See our{' '}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-white">privacy policy</Link>.
            </span>
          </p>
        </aside>
      </section>
    </div>
  );
};

export default ContactPage;
