import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Globe2, GraduationCap, Loader2, Swords, UserCheck } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { isEmail, submitForm } from '../lib/forms';

/* /companies: CyberHx for Companies. Open to companies anywhere in the world.
   Applications go to Supabase form_submissions (form = 'company') -> Admin -> Inbox, plus an email to the team. */

const OFFERS = [
  {
    id: 'hiring-ctf',
    icon: Swords,
    title: 'Hiring CTFs',
    line: 'Run a branded challenge. Hire the top performers.',
    body: 'We build a CTF around the skills your role needs and run it under your brand. Candidates prove what they can do on live targets, and you get a ranked shortlist. Skill-first, resume-last.',
    points: ['Challenges built for your role', 'Your branding, our platform', 'Ranked shortlist with write-ups'],
  },
  {
    id: 'talent',
    icon: UserCheck,
    title: 'Talent Placement',
    line: 'Verified, trained candidates, straight to your team.',
    body: 'Our community solves real challenges every week. We surface the people who consistently perform, with their CTF results and CAPT or CPPT credentials, so you interview fewer people and hire better ones.',
    points: ['Profiles backed by real results', 'CAPT / CPPT certified candidates', 'Intern, junior and mid-level roles'],
  },
  {
    id: 'training',
    icon: GraduationCap,
    title: 'Workforce Training',
    line: 'Upskill your security team on real-world scenarios.',
    body: 'Give your team private CTFs and Pentest Lab access, built by practitioners. Track progress, then certify the team with CAPT and CPPT, in bulk.',
    points: ['Private CTFs for your employees', 'Pentest Lab seats for the team', 'CAPT / CPPT certification in bulk'],
  },
] as const;

const SIZES = ['1–10', '11–50', '51–200', '201–1,000', '1,000+'];
const STEPS = [
  { n: '01', title: 'Apply', text: 'Tell us who you are and what you need. It takes two minutes.' },
  { n: '02', title: 'Intro call', text: 'We reply by email within two working days and set up a short call in your time zone.' },
  { n: '03', title: 'Launch', text: 'We scope it, build it and run it with you: a hiring CTF, a shortlist, or a training plan.' },
];

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

const empty = { company: '', website: '', country: '', size: '', name: '', email: '', role: '', interests: [] as string[], message: '' };

export default function CompaniesPage() {
  const reduce = useReducedMotion();
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [done, setDone] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);

  const on = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(({ [e.target.name]: _gone, ...rest }) => rest);
  };
  const toggle = (id: string) => {
    setF((p) => ({ ...p, interests: p.interests.includes(id) ? p.interests.filter((x) => x !== id) : [...p.interests, id] }));
    setErrors(({ interests: _gone, ...rest }) => rest);
  };
  const pick = (id: string) => {
    if (!f.interests.includes(id)) toggle(id);
    document.getElementById('apply')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (f.company.trim().length < 2) err.company = 'Add your company name.';
    if (f.country.trim().length < 2) err.country = 'Add the country you are based in.';
    if (f.name.trim().length < 2) err.name = 'Add your name.';
    if (!isEmail(f.email)) err.email = 'Add a work email we can reply to.';
    if (!f.interests.length) err.interests = 'Pick at least one.';
    setErrors(err);
    if (Object.keys(err).length) {
      document.getElementById(`co-${Object.keys(err)[0]}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    setFailed('');
    const wants = OFFERS.filter((o) => f.interests.includes(o.id)).map((o) => o.title);
    const site = f.website.trim() ? (/^https?:\/\//i.test(f.website.trim()) ? f.website.trim() : `https://${f.website.trim()}`) : '';
    const res = await submitForm({
      subject: `Company: ${f.company.trim()} (${f.country.trim()}) — ${wants.join(', ')}`,
      table: 'form_submissions',
      replyTo: f.email,
      honeypot: honeypot.current?.value,
      row: {
        form: 'company',
        name: f.name,
        email: f.email,
        subject: `${f.company.trim()} · ${wants.join(', ')}`.slice(0, 300),
        message: f.message.slice(0, 5000),
        page: '/companies',
        data: { company: f.company.trim(), website: site.slice(0, 300), country: f.country.trim(), company_size: f.size, role: f.role.trim(), interested_in: wants.join(', ') },
      },
      email: { company: f.company, website: site, country: f.country, size: f.size, name: f.name, role: f.role, email: f.email, interested_in: wants.join(', '), message: f.message },
    });
    setBusy(false);
    if (res.ok) { setF(empty); setDone(true); }
    else setFailed('We could not send that. Check your connection, or email contact@cyberhx.com.');
  };

  const fade = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };
  const rise = (i = 0) => (reduce ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay: i * 0.08 } });

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="CyberHx for Companies — Hiring CTFs, Talent & Security Training"
        description="Hire cybersecurity practitioners, not resumes. Run a branded hiring CTF, get verified CTF talent, and train your security team. Open to companies worldwide."
        path="/companies"
        keywords="hiring ctf, cybersecurity hiring, security talent, ctf recruitment, security team training, capt certification"
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pb-20 pt-32 sm:pb-28 sm:pt-40">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-glow/[0.09] blur-[130px]" />
        <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0b1020] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
            <Globe2 size={13} className="text-lime" /> CyberHx for Companies · Open worldwide
          </span>
          <h1 className="font-display mx-auto mt-6 max-w-4xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
            Hire practitioners,<br className="hidden sm:block" /> <span className="text-white/45">not resumes.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
            CyberHx runs a community of active cybersecurity learners: people solving real CTF challenges, working through hands-on labs, and building skills the way the industry actually demands. Now we're opening that community to companies.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#apply" className="btn btn-lime">Apply as a company <ArrowRight size={17} /></a>
            <a href="#how" className="btn btn-ghost">How it works</a>
          </div>
          <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4 border-t border-white/[0.07] pt-8">
            {[
              ['6,000+', 'players in one CTF'],
              ['90+', 'countries'],
              ['Worldwide', 'companies can apply'],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="sr-only">{k}</dt>
                <dd className="font-display text-3xl text-white sm:text-4xl">{v}</dd>
                <dd className="mt-1 text-[13px] text-white/45">{k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Offers */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-lime">What we do for you</p>
          <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">Not passive learners. <span className="text-white/45">Practitioners.</span></h2>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {OFFERS.map((o, i) => (
            <motion.article key={o.id} {...rise(i)} className="group flex flex-col rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-7 transition hover:border-white/15">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/10 ring-1 ring-lime/25"><o.icon size={22} className="text-lime" /></span>
              <h3 className="font-display mt-6 text-2xl">{o.title}</h3>
              <p className="mt-2 font-medium text-white/85">{o.line}</p>
              <p className="mt-4 leading-7 text-white/55">{o.body}</p>
              <ul className="mt-6 space-y-2.5">
                {o.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[15px] text-white/75"><Check size={16} className="mt-1 shrink-0 text-lime" />{p}</li>
                ))}
              </ul>
              <button type="button" onClick={() => pick(o.id)} className="mt-auto inline-flex items-center gap-1.5 pt-8 text-sm font-semibold text-lime underline-offset-4 hover:underline">
                I'm interested <ArrowRight size={15} />
              </button>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-y border-white/[0.06] bg-[#070b15]">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6">
          <h2 className="font-display text-3xl sm:text-4xl">One ecosystem.</h2>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 sm:gap-4">
            {['Learners', 'CyberHx', 'Companies'].map((x, i) => (
              <div key={x} className="contents">
                {i > 0 && <span aria-hidden="true" className="h-px w-6 bg-gradient-to-r from-white/10 via-lime/60 to-white/10 sm:w-14" />}
                <div className={`rounded-2xl border px-3 py-4 sm:px-6 ${x === 'CyberHx' ? 'border-lime/40 bg-lime/[0.07]' : 'border-white/10 bg-white/[0.03]'}`}>
                  <p className={`text-[15px] font-semibold sm:text-lg ${x === 'CyberHx' ? 'text-lime' : 'text-white'}`}>{x}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-xl leading-7 text-white/55">Learners on one side. Companies on the other. CyberHx in the middle, making sure the right people find each other.</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <h2 className="font-display text-4xl sm:text-5xl">How it works</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div key={s.n} {...rise(i)} className="rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-7">
              <p className="font-mono text-sm text-lime">{s.n}</p>
              <h3 className="font-display mt-4 text-2xl">{s.title}</h3>
              <p className="mt-3 leading-7 text-white/55">{s.text}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 flex items-start gap-2.5 text-[15px] text-white/55"><Globe2 size={18} className="mt-0.5 shrink-0 text-lime" />Any company, any country. Everything runs online, and we work across time zones.</p>
      </section>

      {/* Apply */}
      <section id="apply" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-28 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-4xl sm:text-5xl">Apply as a company</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-white/55">Tell us what you need. A real person replies within two working days.</p>
        </div>

        <div className="mt-10 rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-5 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] sm:p-8">
          <input ref={honeypot} type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <div aria-live="polite">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" {...fade} className="py-12 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime/15 ring-1 ring-lime/30"><Check size={26} className="text-lime" /></span>
                  <h3 className="font-display mt-6 text-3xl">Application received.</h3>
                  <p className="mx-auto mt-3 max-w-md leading-7 text-white/55">Thank you. We'll reply to your email within two working days to set up an intro call.</p>
                  <button type="button" onClick={() => setDone(false)} className="btn btn-ghost mt-8">Send another</button>
                </motion.div>
              ) : (
                <motion.form key="form" {...fade} onSubmit={send} noValidate className="space-y-6">
                  <fieldset id="co-interests">
                    <legend className={labelCls}>What are you looking for?</legend>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {OFFERS.map((o) => {
                        const onIt = f.interests.includes(o.id);
                        return (
                          <button key={o.id} type="button" role="checkbox" aria-checked={onIt} onClick={() => toggle(o.id)}
                            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-glow ${onIt ? 'border-lime/70 bg-lime/10 text-white' : 'border-white/10 text-white/65 hover:border-white/25 hover:text-white'}`}>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${onIt ? 'border-lime bg-lime text-ink' : 'border-white/25'}`}>{onIt && <Check size={13} strokeWidth={3} />}</span>
                            {o.title}
                          </button>
                        );
                      })}
                    </div>
                    {errors.interests && <p className="mt-1.5 text-sm text-red-300">{errors.interests}</p>}
                  </fieldset>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="co-company" label="Company" error={errors.company}>
                      <input id="co-company" name="company" value={f.company} onChange={on} autoComplete="organization" maxLength={150} className={field} aria-invalid={!!errors.company} />
                    </Field>
                    <Field id="co-website" label="Website" hint="(optional)">
                      <input id="co-website" name="website" value={f.website} onChange={on} autoComplete="url" maxLength={200} placeholder="company.com" className={field} />
                    </Field>
                    <Field id="co-country" label="Country" error={errors.country}>
                      <input id="co-country" name="country" value={f.country} onChange={on} autoComplete="country-name" maxLength={80} placeholder="Where you're based" className={field} aria-invalid={!!errors.country} />
                    </Field>
                    <Field id="co-size" label="Company size" hint="(optional)">
                      <select id="co-size" name="size" value={f.size} onChange={on} className={field}>
                        <option value="">Select</option>
                        {SIZES.map((s) => <option key={s} value={s}>{s} people</option>)}
                      </select>
                    </Field>
                    <Field id="co-name" label="Your name" error={errors.name}>
                      <input id="co-name" name="name" value={f.name} onChange={on} autoComplete="name" maxLength={150} className={field} aria-invalid={!!errors.name} />
                    </Field>
                    <Field id="co-role" label="Your role" hint="(optional)">
                      <input id="co-role" name="role" value={f.role} onChange={on} autoComplete="organization-title" maxLength={100} placeholder="Head of Security, HR…" className={field} />
                    </Field>
                  </div>
                  <Field id="co-email" label="Work email" error={errors.email}>
                    <input id="co-email" name="email" type="email" value={f.email} onChange={on} autoComplete="email" maxLength={200} className={field} aria-invalid={!!errors.email} />
                  </Field>
                  <Field id="co-message" label="Anything we should know?" hint="(optional)">
                    <textarea id="co-message" name="message" rows={4} value={f.message} onChange={on} maxLength={5000} placeholder="Roles you're hiring for, team size to train, timelines…" className={`${field} resize-y leading-7`} />
                  </Field>

                  {failed && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{failed}</p>}
                  <button type="submit" disabled={busy} className="btn btn-lime w-full disabled:opacity-60 sm:w-auto">
                    {busy ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : <>Apply <ArrowRight size={17} /></>}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
