import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { SiteIcon, type IconName } from '../components/shared/SiteIcon';
import { Mascot } from '../components/shared/Mascot';
import { isEmail, submitForm } from '../lib/forms';

/* /companies: CyberHx for Companies. Open to companies anywhere in the world.
   Two audiences on one page: companies (hire, place, train) and our own learners (what this opens up for them).
   Applications go to Supabase form_submissions (form = 'company') -> Admin -> Inbox, plus an email to the team.
   Artwork: only the site's own icons (/icons/web via SiteIcon) and mascots. */

const OFFERS: { id: string; icon: IconName; title: string; line: string; body: string; points: string[] }[] = [
  {
    id: 'hiring-ctf',
    icon: 'swords',
    title: 'Hiring CTFs',
    line: 'Run a branded challenge. Hire the top performers.',
    body: 'We build a CTF around the skills your role needs and run it under your name. Candidates prove what they can do on live targets, and you get a ranked shortlist. Skill-first, resume-last.',
    points: ['Challenges built around your role', 'Your branding, our platform', 'Ranked shortlist with write-ups'],
  },
  {
    id: 'talent',
    icon: 'hacker-team',
    title: 'Talent Placement',
    line: 'Verified, trained candidates, straight to your team.',
    body: 'Our community solves real challenges every week. We surface the people who consistently perform, with their CTF results and CAPT or CPPT credentials, so you interview fewer people and hire better ones.',
    points: ['Profiles backed by real results', 'CAPT and CPPT certified candidates', 'From first role to experienced'],
  },
  {
    id: 'training',
    icon: 'toolbox',
    title: 'Workforce Training',
    line: 'Upskill your security team on real-world scenarios.',
    body: 'Give your team private CTFs and Pentest Lab access, built by practitioners. Track progress, then certify the team with CAPT and CPPT, in bulk.',
    points: ['Private CTFs for your employees', 'Pentest Lab seats for the team', 'CAPT and CPPT certification in bulk'],
  },
];

/** What a company actually sees about a candidate. */
const SIGNALS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'podium', title: 'CTF results', text: 'Rank, solves and categories across our events, not a self-rated skills list.' },
  { icon: 'target', title: 'Write-ups', text: 'How they think: their published solutions on the CyberHx blog.' },
  { icon: 'padlock', title: 'Verified credentials', text: 'CAPT and CPPT earned in a practical exam, checkable by anyone.' },
  { icon: 'hacker-climb', title: 'Lab progress', text: 'Machines and techniques completed on the Pentest Lab.' },
];

/** Why being part of the CyberHx community now counts for learners. */
const FOR_LEARNERS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'trophy', title: 'Your rank becomes a door', text: 'Strong CTF results are what we bring to hiring partners. Every flag you capture now counts for more than points.' },
  { icon: 'swords', title: 'Get interviewed by skill', text: 'Hiring CTFs judge you on what you solve, not where you studied. Play well and the interview comes to you.' },
  { icon: 'padlock', title: 'Credentials companies trust', text: 'CAPT and CPPT are earned in a practical exam, and companies in our network can verify them in seconds.' },
  { icon: 'network', title: 'A network across 90+ countries', text: 'Learn alongside practitioners worldwide, and get seen by companies that hire from anywhere.' },
];

const STEPS = [
  { n: '01', title: 'Apply', text: 'Tell us who you are and what you need. It takes two minutes.' },
  { n: '02', title: 'Intro call', text: 'We reply by email and set up a short call in your time zone.' },
  { n: '03', title: 'Scope', text: 'Together we define the roles, skills, team size and timeline.' },
  { n: '04', title: 'Launch', text: 'We build and run it with you: a hiring CTF, a shortlist, or a training plan.' },
];

const FAQ = [
  { q: 'Can companies outside India apply?', a: 'Yes. CyberHx for Companies is open to companies in any country. Everything runs online, and we work across time zones.' },
  { q: 'Do candidates know which company is hiring?', a: 'For a hiring CTF, yes: it runs under your brand, so the right people come to you. For placement, we share profiles with you first and introduce candidates once you are interested.' },
  { q: 'What does it cost?', a: 'It depends on what you need: the size of the event, the number of roles, or the size of the team to train. We scope it on the intro call and send a clear quote.' },
  { q: 'Can we train our existing team instead of hiring?', a: 'Yes. Workforce Training gives your team private CTFs, Pentest Lab seats and CAPT or CPPT certification, and you can follow their progress.' },
];

const SIZES = ['1–10', '11–50', '51–200', '201–1,000', '1,000+'];

const field =
  'w-full rounded-xl border border-white/[0.1] bg-[#070b16] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-glow focus:ring-4 focus:ring-glow/10 aria-[invalid=true]:border-red-400/70';
const labelCls = 'mb-2 block text-sm font-medium text-white/80';
const eyebrow = 'font-mono text-[12px] uppercase tracking-[0.2em] text-lime';

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
  const [open, setOpen] = useState<number | null>(0);
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
    if (!f.interests.length) err.interests = 'Pick at least one.';
    if (f.company.trim().length < 2) err.company = 'Add your company name.';
    if (f.country.trim().length < 2) err.country = 'Add the country you are based in.';
    if (f.name.trim().length < 2) err.name = 'Add your name.';
    if (!isEmail(f.email)) err.email = 'Add a work email we can reply to.';
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
        description="Hire cybersecurity practitioners, not resumes. Run a branded hiring CTF, meet verified CTF talent from a 7,400+ learner community, and train your security team. Open to companies worldwide."
        path="/companies"
        keywords="hiring ctf, cybersecurity hiring, security talent, ctf recruitment, security team training, capt certification"
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pb-16 pt-28 sm:pb-24 sm:pt-36">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-glow/[0.09] blur-[130px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0b1020] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" /> CyberHx for Companies · Open worldwide
            </span>
            <h1 className="font-display mt-6 max-w-3xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Hire practitioners, <span className="text-white/45">not resumes.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
              CyberHx runs a community of active cybersecurity learners: people solving real CTF challenges, working through hands-on labs, and building skills the way the industry actually demands. Now we're opening that community to companies, anywhere in the world.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#apply" className="btn btn-lime">Apply as a company <ArrowRight size={17} /></a>
              <a href="#learners" className="btn btn-ghost">I'm a learner</a>
            </div>
          </div>
          <Mascot pose="detective" alt="CyberHx mascot with a magnifying glass" eager className="mx-auto w-52 sm:w-64 lg:w-80" />
        </div>
        <dl className="relative mx-auto mt-14 grid max-w-7xl grid-cols-3 gap-4 px-5 sm:px-6 lg:px-8">
          {[
            ['7,400+', 'learners in the community'],
            ['90+', 'countries'],
            ['Worldwide', 'companies can apply'],
          ].map(([v, k]) => (
            <div key={k} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-5 sm:px-6">
              <dt className="sr-only">{k}</dt>
              <dd className="font-display text-3xl text-white sm:text-4xl">{v}</dd>
              <dd className="mt-1 text-[13px] text-white/45">{k}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Offers */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className={eyebrow}>For companies</p>
          <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">Not passive learners. <span className="text-white/45">Practitioners.</span></h2>
          <p className="mt-4 text-lg leading-8 text-white/55">Three ways to work with the CyberHx community, on their own or together.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {OFFERS.map((o, i) => (
            <motion.article key={o.id} {...rise(i)} className="flex flex-col rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-7 transition hover:border-white/15">
              <SiteIcon name={o.icon} size={72} />
              <h3 className="font-display mt-6 text-2xl">{o.title}</h3>
              <p className="mt-2 font-medium text-white/85">{o.line}</p>
              <p className="mt-4 leading-7 text-white/55">{o.body}</p>
              <ul className="mt-6 space-y-2.5">
                {o.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[15px] text-white/75"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />{p}</li>
                ))}
              </ul>
              <button type="button" onClick={() => pick(o.id)} className="mt-auto inline-flex items-center gap-1.5 pt-8 text-sm font-semibold text-lime underline-offset-4 hover:underline">
                I'm interested <ArrowRight size={15} />
              </button>
            </motion.article>
          ))}
        </div>
      </section>

      {/* What you see about a candidate */}
      <section className="border-y border-white/[0.06] bg-[#070b15]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className={eyebrow}>Proof, not promises</p>
            <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">What you see about every candidate.</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SIGNALS.map((s, i) => (
              <motion.div key={s.title} {...rise(i)} className="rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6">
                <SiteIcon name={s.icon} size={56} />
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 leading-7 text-white/55">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* One ecosystem */}
      <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6 sm:py-24">
        <h2 className="font-display text-3xl sm:text-4xl">One ecosystem.</h2>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {[
            { label: 'Learners', icon: 'user' as IconName },
            { label: 'CyberHx', icon: 'ctf-green' as IconName },
            { label: 'Companies', icon: 'hacker-team' as IconName },
          ].map((x, i) => (
            <div key={x.label} className="contents">
              {i > 0 && <span aria-hidden="true" className="h-px w-6 bg-gradient-to-r from-white/10 via-lime/60 to-white/10 sm:w-14" />}
              <div className={`flex flex-col items-center gap-3 rounded-2xl border px-3 py-5 sm:px-6 ${x.label === 'CyberHx' ? 'border-lime/40 bg-lime/[0.07]' : 'border-white/10 bg-white/[0.03]'}`}>
                <SiteIcon name={x.icon} size={48} />
                <p className={`text-[15px] font-semibold sm:text-lg ${x.label === 'CyberHx' ? 'text-lime' : 'text-white'}`}>{x.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-xl leading-7 text-white/55">Learners on one side. Companies on the other. CyberHx in the middle, making sure the right people find each other.</p>
      </section>

      {/* For learners */}
      <section id="learners" className="scroll-mt-24 border-y border-white/[0.06] bg-gradient-to-b from-[#0a1120] to-[#070b15]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.4fr] lg:px-8">
          <div>
            <p className={eyebrow}>For our learners</p>
            <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">Your skills now open doors.</h2>
            <p className="mt-5 text-lg leading-8 text-white/60">
              If you play our CTFs, practise on the Pentest Lab or hold a CAPT, this is for you too. Companies are coming to CyberHx to find people who can actually do the work, and they start with our community.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/events" className="btn btn-lime">Play the next CTF <ArrowRight size={17} /></Link>
              <Link to="/certifications" className="btn btn-ghost">Get certified</Link>
            </div>
            <Mascot pose="trophy" alt="CyberHx mascot holding a trophy" className="mt-10 hidden w-48 lg:block" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FOR_LEARNERS.map((l, i) => (
              <motion.div key={l.title} {...rise(i)} className="rounded-[24px] border border-white/[0.08] bg-[#0b1020]/70 p-6">
                <SiteIcon name={l.icon} size={56} />
                <h3 className="mt-5 text-lg font-semibold">{l.title}</h3>
                <p className="mt-2 leading-7 text-white/55">{l.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <p className={eyebrow}>For companies</p>
        <h2 className="font-display mt-3 text-4xl sm:text-5xl">How it works</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div key={s.n} {...rise(i)} className="rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6">
              <p className="font-mono text-sm text-lime">{s.n}</p>
              <h3 className="font-display mt-4 text-2xl">{s.title}</h3>
              <p className="mt-3 leading-7 text-white/55">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl">Questions companies ask</h2>
        <div className="mt-8 divide-y divide-white/[0.07] rounded-[24px] border border-white/[0.08] bg-white/[0.02]">
          {FAQ.map((x, i) => (
            <div key={x.q}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
                <span className="text-[16px] font-semibold">{x.q}</span>
                <span className={`text-xl text-lime transition-transform ${open === i ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
              </button>
              {open === i && <p className="-mt-1 px-6 pb-5 leading-7 text-white/60">{x.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-28 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-4xl sm:text-5xl">Apply as a company</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-white/55">Tell us what you need. A real person from CyberHx replies by email.</p>
        </div>

        <div className="mt-10 rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-5 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] sm:p-8">
          <input ref={honeypot} type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <div aria-live="polite">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" {...fade} className="py-10 text-center">
                  <Mascot pose="thumbs" alt="" className="mx-auto w-36" />
                  <h3 className="font-display mt-6 text-3xl">Application received.</h3>
                  <p className="mx-auto mt-3 max-w-md leading-7 text-white/55">Thank you. We'll reply to your email to set up an intro call in your time zone.</p>
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
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-glow ${onIt ? 'border-lime/70 bg-lime/10 text-white' : 'border-white/10 text-white/65 hover:border-white/25 hover:text-white'}`}>
                            <SiteIcon name={o.icon} size={30} />
                            <span className="flex-1">{o.title}</span>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${onIt ? 'border-lime bg-lime text-ink' : 'border-white/25'}`}>{onIt && <Check size={13} strokeWidth={3} />}</span>
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
