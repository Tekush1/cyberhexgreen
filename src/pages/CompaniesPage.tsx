import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { planIntent } from '../lib/planIntent';
import { plans as programs, annualPerMonthUsd } from '../data/plans';
import { plans as ctfPackages, builderPricing, builderCategories } from '../data/hosting';

const beginner = ctfPackages.find((p) => p.id === 'beginner')!;
const pro = ctfPackages.find((p) => p.id === 'pro')!;
const cheapestChallenge = Math.min(...builderCategories.flatMap((c) => c.tiers.map((t) => t.usd)));
const players = builderPricing.hosting.players.toLocaleString('en-US');
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { Mascot } from '../components/shared/Mascot';
import { isEmail, submitForm } from '../lib/forms';

/* /companies: CyberHx for Companies. Short and direct: what we sell, the price, and a Pay button.
   Pay buttons open the existing CTF checkout on /host-your-ctf (?buy=<package>), so payment code lives in one
   place and the price is always worked out on the server. Anything bigger (seats, yearly plans) goes through
   the form below: Supabase form_submissions (form = 'company') -> Admin -> Inbox, plus an email to the team. */

type Buy = { name: string; promise: string; price: string; unit: string; includes: string[]; cta: string; to: string; external?: boolean; featured?: boolean };
const BUY: Buy[] = [
  {
    name: 'Team CTF',
    promise: 'A private CTF for your security team. Ready in a week.',
    price: `$${beginner.usd}`,
    unit: 'per event',
    includes: [`Hosting for ${builderPricing.hosting.hours} hours, up to ${players} players`, '25 challenges, easy to medium', 'Live scoreboard and certificates', 'Your name and logo on the event'],
    cta: `Pay $${beginner.usd}`,
    to: '/host-your-ctf?buy=beginner',
  },
  {
    name: 'Hiring CTF',
    promise: 'Your brand. Our challenges. A ranked shortlist by Monday.',
    price: `$${pro.usd}`,
    unit: 'per event',
    includes: ['40 challenges, medium to hard, with the chained challenge', 'Ranked shortlist of candidates with their write-ups', `Hosting for ${builderPricing.hosting.hours} hours, up to ${players} players`, 'Our team live during the event'],
    cta: `Pay $${pro.usd}`,
    to: '/host-your-ctf?buy=pro',
    featured: true,
  },
  {
    name: 'Build your own',
    promise: 'Start with hosting and add exactly what you need.',
    price: `from $${builderPricing.hosting.usd}`,
    unit: 'per 8-hour round',
    includes: [`Challenges from $${cheapestChallenge} each, by category and difficulty`, 'Dynamic flags: a unique flag for every team', `A 3D event website for $${builderPricing.website3dUsd}`],
    cta: 'Open the builder',
    to: '/host-your-ctf#build',
  },
];

const OFFERS: { id: string; title: string; line: string; body: string; points: string[] }[] = [
  {
    id: 'hiring-ctf',
    title: 'Hiring CTFs',
    line: 'Run a branded challenge. Hire the top performers.',
    body: 'We build a CTF around the skills your role needs and run it under your name. Candidates prove what they can do on live targets, and you get a ranked shortlist. Skill-first, resume-last.',
    points: ['Challenges built around your role', 'Your branding, our platform', 'Ranked shortlist with write-ups'],
  },
  {
    id: 'talent',
    title: 'Talent Placement',
    line: 'Verified, trained candidates, straight to your team.',
    body: 'Our community solves real challenges every week. We surface the people who consistently perform, with their CTF results and CAPT or CPPT credentials, so you interview fewer people and hire better ones.',
    points: ['Profiles backed by real results', 'CAPT and CPPT certified candidates', 'From first role to experienced'],
  },
  {
    id: 'training',
    title: 'Workforce Training',
    line: 'Upskill your security team on real-world scenarios.',
    body: 'Give your team private CTFs and Pentest Lab access, built by practitioners. Track progress, then certify the team with CAPT and CPPT, in bulk.',
    points: ['Private CTFs for your employees', 'Pentest Lab seats for the team', 'CAPT and CPPT certification in bulk'],
  },
];

const FAQ = [
  { q: 'Can companies anywhere in the world apply?', a: 'Yes. CyberHx for Companies is open to companies in any country. Everything runs online, and we work across time zones.' },
  { q: 'Do candidates know which company is hiring?', a: 'For a hiring CTF, yes: it runs under your brand, so the right people come to you. For placement, we share profiles with you first and introduce candidates once you are interested.' },
  { q: 'What does it cost?', a: `Yearly plans start at $${annualPerMonthUsd(programs.companies[0])} a month (Team), with Hiring and Enterprise plans for teams that hire every quarter or run a CTF every month. Annual plans get two months free and an extra CTF. A single hiring CTF is $${pro.usd}. Team training seats start at $89 a person a year with 5 seats or more. Everything is on the pricing page, and anything bigger we scope on the intro call.` },
  { q: 'How do I pay?', a: 'Online through Razorpay: UPI, cards and netbanking in rupees, or international cards in US dollars. You get an invoice by email straight away.' },
  { q: 'Can we train our existing team instead of hiring?', a: 'Yes. Workforce Training gives your team private CTFs, Pentest Lab seats and CAPT or CPPT certification, and you can follow their progress.' },
];

const SIZES = ['1–10', '11–50', '51–200', '201–1,000', '1,000+'];

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
  const { search } = useLocation();
  // Arriving from a plan on /pricing opens the message with that plan named.
  const [f, setF] = useState(() => ({ ...empty, message: planIntent(search, 'company') }));
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

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="CyberHx for Companies — Hiring CTFs, Talent & Security Training"
        description="Hire cybersecurity practitioners, not resumes. Run a branded hiring CTF, meet verified CTF talent from a 7,400+ learner community, and train your security team. Open to companies worldwide."
        path="/companies"
        keywords="hiring ctf, cybersecurity hiring, security talent, ctf recruitment, security team training, capt certification"
      />

      {/* Hero */}
      <section className="border-b border-white/[0.06] pb-14 pt-28 sm:pb-16 sm:pt-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h1 className="font-display max-w-3xl text-5xl leading-[1.04] sm:text-6xl">
            Hire practitioners, <span className="text-white/45">not resumes.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">Hiring CTFs, private team CTFs and security training for companies worldwide. Pick a CTF and pay online, or talk to us.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#plans" className="btn btn-lime">Pay for a CTF <ArrowRight size={17} /></a>
            <a href="#apply" className="btn btn-ghost">Talk to us</a>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-3 text-[14px] text-white/45">
            <span className="flex items-center gap-2">
              <img src="/events/nfsu-logo.webp" alt="NFSU logo" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 rounded-lg bg-white object-contain p-1" />
              <img src="/events/thapar-logo.webp" alt="TIET logo" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 rounded-lg bg-white object-contain p-1" />
            </span>
            <span>Trusted by NFSU Chennai and Thapar Institute · 7,400+ players from 90+ countries</span>
          </div>
        </div>
      </section>

      {/* Buy */}
      <section id="plans" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl">Book a CTF and pay online.</h2>
        <p className="mt-3 text-white/55">Pay in ₹ or $ at checkout, with an invoice by email.</p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {BUY.map((b) => (
            <article key={b.name} className={`flex flex-col rounded-2xl border p-7 ${b.featured ? 'border-lime/50 bg-lime/[0.04]' : 'border-white/[0.09] bg-white/[0.02]'}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{b.name}</h3>
                {b.featured && <span className="rounded-full bg-lime px-2.5 py-0.5 text-[12px] font-semibold text-ink">Most chosen</span>}
              </div>
              <p className="mt-2 text-[15px] leading-6 text-white/55">{b.promise}</p>
              <p className="mt-6 font-display text-4xl tabular-nums">{b.price}</p>
              <p className="mt-1 text-[13px] text-white/45">{b.unit}</p>
              <ul className="mt-6 space-y-2.5 border-t border-white/[0.07] pt-6">
                {b.includes.map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-[15px] text-white/75"><Check size={16} className="mt-0.5 shrink-0 text-lime" aria-hidden="true" />{x}</li>
                ))}
              </ul>
              <Link to={b.to} className={`btn mt-auto w-full ${b.featured ? 'btn-lime' : 'btn-ghost'}`} style={{ marginTop: '2rem' }}>{b.cta} <ArrowRight size={16} /></Link>
            </article>
          ))}
        </div>
        <p className="mt-8 text-[15px] leading-7 text-white/55">
          Training your team or hiring all year? Seats from ${89} a person a year, yearly plans from ${annualPerMonthUsd(programs.companies[0])} a month.{' '}
          <Link to="/pricing#companies" className="font-semibold text-white underline-offset-4 hover:underline">See all pricing</Link>
          {' · '}
          <a href="#apply" className="font-semibold text-white underline-offset-4 hover:underline">Talk to us</a>
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl">Questions companies ask</h2>
        <div className="mt-8 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
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
          <h2 className="font-display text-3xl sm:text-4xl">Talk to us</h2>
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
