import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { Local } from '../components/shared/Local';
import { TrustedBySection } from '../components/sections/TrustedBySection';
import { plans, builderPricing as P, builderCategories } from '../data/hosting';
import { certifications, pentestLabUrl } from '../data/pentest';
import { plans as programs, annualUsd, annualPerMonthUsd, annualSavingPct, type Plan, type PlanAudience } from '../data/plans';

/* /pricing: every price on one page, split by who is buying.
   Companies · Institutions · Learners. For companies and institutions: three yearly plans first (monthly or
   annual, annual by default with two months free and an extra CTF), then the per-event packages for a one-off.
   Learners: play free, pay per year for a credential. Prices come from data/hosting.ts, data/pentest.ts and
   data/plans.ts so they stay in step with checkout. Typography only: no icons, no badges. */

type Audience = 'companies' | 'institutions' | 'learners';
const AUDIENCES: { key: Audience; label: string; lead: string }[] = [
  { key: 'companies', label: 'Companies', lead: 'Hire by skill, train by doing. A plan for the year, or one event at a time.' },
  { key: 'institutions', label: 'Institutions', lead: 'A campus program for less than a textbook per student. Academic pricing on everything.' },
  { key: 'learners', label: 'Learners', lead: 'Every CTF is free. Pay for a year of the Lab when you are ready for a credential.' },
];

interface Tier {
  name: string;
  promise: string;
  price: { usd: number; unit: string } | { custom: string };
  includes: string[];
  cta: { label: string; to: string };
  recommended?: boolean;
  note?: string;
}

const beginner = plans.find((p) => p.id === 'beginner')!;
const pro = plans.find((p) => p.id === 'pro')!;
const capt = certifications.find((c) => c.code === 'CAPT')!;
const cppt = certifications.find((c) => c.code === 'CPPT')!;
const cheapestChallenge = Math.min(...builderCategories.flatMap((c) => c.tiers.map((t) => t.usd)));
const players = P.hosting.players.toLocaleString('en-US');

const TIERS: Record<Audience, Tier[]> = {
  companies: [
    {
      name: 'Team CTF',
      promise: 'A private CTF for your security team. Ready in a week.',
      price: { usd: beginner.usd, unit: 'per event' },
      includes: [`Hosting for ${P.hosting.hours} hours, up to ${players} players`, '25 challenges, easy to medium', 'Live scoreboard and certificates', 'Your name and logo on the event'],
      cta: { label: 'Book a Team CTF', to: '/host-your-ctf#packages' },
    },
    {
      name: 'Hiring CTF',
      promise: 'Your brand. Our challenges. A ranked shortlist by Monday.',
      price: { usd: pro.usd, unit: 'per event' },
      includes: ['40 challenges, medium to hard, with the chained challenge', 'Ranked shortlist of candidates with their write-ups', `Hosting for ${P.hosting.hours} hours, up to ${players} players`, 'Your branding on the platform', 'Our team live during the event'],
      cta: { label: 'Plan a Hiring CTF', to: '/companies#apply' },
      recommended: true,
      note: 'Add challenges built around your role from $' + cheapestChallenge + ' each.',
    },
    {
      name: 'Build your own',
      promise: 'Start with hosting and add exactly what you need.',
      price: { usd: P.hosting.usd, unit: `per ${P.hosting.hours}-hour round` },
      includes: [`${players} players included, more at $${P.extraPlayersUsd} per ${P.playerBlock.toLocaleString('en-US')}`, `Challenges from $${cheapestChallenge} each, by category and difficulty`, `Extra hours at $${P.extraHourUsd} each`, `A 3D event website for $${P.website3dUsd}`],
      cta: { label: 'Open the builder', to: '/host-your-ctf#build' },
    },
  ],
  institutions: [
    {
      name: 'Campus CTF',
      promise: 'Your first campus CTF, built and run for you.',
      price: { usd: beginner.usd, unit: 'per event' },
      includes: [`Hosting for ${P.hosting.hours} hours, up to ${players} players`, '25 challenges, easy to medium', 'Certificates for every player', 'A report for your department'],
      cta: { label: 'Book a Campus CTF', to: '/host-your-ctf#packages' },
    },
    {
      name: 'Campus CTF Pro',
      promise: 'For fests and departments that want a real fight.',
      price: { usd: pro.usd, unit: 'per event' },
      includes: ['40 challenges, medium to hard, with the chained challenge', `Hosting for ${P.hosting.hours} hours, up to ${players} players`, 'Your university\'s name and logo on the event', 'A report for your department', 'Points on the CyberHx Campus League'],
      cta: { label: 'Book Campus CTF Pro', to: '/host-your-ctf#packages' },
      recommended: true,
      note: 'Academic pricing applies. Ask for your quote.',
    },
    {
      name: 'Build your own',
      promise: 'Start with hosting and add exactly what you need.',
      price: { usd: P.hosting.usd, unit: `per ${P.hosting.hours}-hour round` },
      includes: [`${players} players included, more at $${P.extraPlayersUsd} per ${P.playerBlock.toLocaleString('en-US')}`, `Challenges from $${cheapestChallenge} each, by category and difficulty`, `Extra hours at $${P.extraHourUsd} each`, `A 3D event website for $${P.website3dUsd}`],
      cta: { label: 'Open the builder', to: '/host-your-ctf#build' },
    },
  ],
  learners: [
    {
      name: 'Play',
      promise: 'Every CyberHx CTF. Open to everyone, everywhere.',
      price: { usd: 0, unit: 'forever' },
      includes: ['Every public CTF we run', 'A global scoreboard, players from 90+ countries', 'A certificate for every event you play', 'The CyberHx community'],
      cta: { label: 'See upcoming CTFs', to: '/events' },
    },
    {
      name: capt.code,
      promise: capt.tagline,
      price: { usd: capt.usd, unit: 'per year' },
      includes: capt.includes,
      cta: { label: `Start ${capt.code}`, to: pentestLabUrl },
    },
    {
      name: cppt.code,
      promise: cppt.tagline,
      price: { usd: cppt.usd, unit: 'per year' },
      includes: cppt.includes,
      cta: { label: `Start ${cppt.code}`, to: pentestLabUrl },
      recommended: true,
      note: 'One year of the course, the Lab and the exam. Verifiable by anyone.',
    },
  ],
};

const FAQ = [
  { q: 'Do I get an invoice?', a: 'Yes. Every payment goes through Razorpay and comes with an invoice your accounts team can file. Annual plans can also be paid by bank transfer against a purchase order.' },
  { q: 'Which currency do you charge in?', a: 'Prices are in US dollars. We show an estimate in your currency next to each price; your bank converts at its own rate.' },
  { q: 'What if something goes wrong during our event?', a: 'If there is any downtime from our side during your event, you get 100% of your money back. Our team is live for the whole event.' },
  { q: 'Monthly or annual: what is the difference?', a: 'The same plan, two ways to pay. Monthly is billed every month and you can pause or cancel any time. Annual is twelve months for the price of ten, locks the price for the year, and adds an extra CTF on us. Most departments and teams pick annual because it fits one budget line and one invoice.' },
  { q: 'Can we start monthly and switch?', a: 'Yes. Start monthly, and switch to annual whenever you like: the month you have already paid is credited against the annual price.' },
  { q: 'What if a plan turns out not to be the right fit?', a: 'Tell us after your first event. If it is not working for you, we refund the rest of the year, no questions.' },
  { q: 'What does a Pentest Lab seat include?', a: 'A year of the CyberHx Pentest Lab for one person: the course, the machines and the practice exams. The CAPT or CPPT exam itself is at academic or team price for seat holders.' },
  { q: 'Is there academic pricing?', a: 'Yes. Colleges and universities get an academic discount on every package and batch pricing for labs and certifications. Tell us your numbers and we send a quote.' },
  { q: 'Can we change a package?', a: 'Yes. Add hours, players, challenges or a 3D event site to any package, or build your own from scratch. The builder shows the price as you go.' },
  { q: 'Do learners pay anything to play?', a: 'No. Every public CyberHx CTF is free to enter. You pay only for a certification, which gives you a year of the course, the Pentest Lab and the exam.' },
];

export default function PricingPage() {
  const { hash } = useLocation();
  const fromHash = (h: string): Audience | null => (['companies', 'institutions', 'learners'] as Audience[]).find((a) => h === `#${a}`) || null;
  const [aud, setAud] = useState<Audience>(fromHash(hash) || 'companies');
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');
  const [open, setOpen] = useState<number | null>(0);
  useEffect(() => { const a = fromHash(hash); if (a) setAud(a); }, [hash]);

  const current = AUDIENCES.find((a) => a.key === aud)!;

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="Pricing — CyberHx for Companies, Institutions and Learners"
        description={`Yearly plans for universities from $${annualPerMonthUsd(programs.institutions[0])} a month and for companies from $${annualPerMonthUsd(programs.companies[0])} a month, single CTFs from $${beginner.usd}, hosting from $${P.hosting.usd}, CAPT $${capt.usd} and CPPT $${cppt.usd} per year. Clear prices, Razorpay invoices, money back on downtime.`}
        path="/pricing"
        keywords="ctf hosting price, ctf package cost, host a ctf price, capt certification price, cppt price, cybersecurity training pricing"
      />

      {/* Hero */}
      <section className="relative overflow-hidden pb-10 pt-28 sm:pt-36">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[48rem] -translate-x-1/2 rounded-full bg-lime/[0.06] blur-[120px]" />
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
          <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
            Clear prices. <span className="text-white/45">No surprises.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
            Choose who you are. Every price below is the price you pay, in full, with an invoice.
          </p>

          <div role="tablist" aria-label="Who is this for" className="mx-auto mt-10 inline-flex max-w-full rounded-2xl border border-white/[0.09] bg-white/[0.04] p-1.5">
            {AUDIENCES.map((a) => (
              <button
                key={a.key}
                role="tab"
                id={`tab-${a.key}`}
                aria-selected={aud === a.key}
                aria-controls={`panel-${a.key}`}
                onClick={() => { setAud(a.key); history.replaceState(null, '', `#${a.key}`); }}
                className={`rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors sm:px-6 ${aud === a.key ? 'bg-white text-ink shadow-[0_8px_24px_-12px_rgba(0,0,0,.8)]' : 'text-white/65 hover:text-white'}`}
              >
                For {a.label}
              </button>
            ))}
          </div>
          <p className="mt-6 text-[17px] text-white/70">{current.lead}</p>
        </div>
      </section>

      {/* Plans, then per-event packages */}
      <section id={`panel-${aud}`} role="tabpanel" aria-labelledby={`tab-${aud}`} className="mx-auto max-w-7xl px-5 pb-20 sm:px-6 lg:px-8">
        {aud !== 'learners' && (
          <>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl">A plan for the year.</h2>
                <p className="mt-2 max-w-xl leading-7 text-white/60">
                  {aud === 'institutions'
                    ? 'CTFs on the calendar, Lab seats for your students, a report after every event. One budget line.'
                    : 'CTFs on the calendar, Lab seats for your team, a shortlist after every hiring round. One budget line.'}
                </p>
              </div>
              <div role="group" aria-label="Billing" className="inline-flex self-start rounded-2xl border border-white/[0.09] bg-white/[0.04] p-1.5 sm:self-auto">
                {(['annual', 'monthly'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={billing === b}
                    onClick={() => setBilling(b)}
                    className={`rounded-xl px-4 py-2 text-[15px] font-semibold transition-colors ${billing === b ? 'bg-white text-ink' : 'text-white/65 hover:text-white'}`}
                  >
                    {b === 'annual' ? 'Annual · 2 months free' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {programs[aud as PlanAudience].map((p) => <PlanCard key={p.id} plan={p} billing={billing} />)}
            </div>

            <div className="mt-8 grid gap-4 rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 sm:grid-cols-3 sm:p-8">
              {billing === 'annual' ? (
                <>
                  <Stat v="2 months" k="free on every annual plan: twelve months for the price of ten" />
                  <Stat v="+1 CTF" k="on us, every year you stay annual" />
                  <Stat v="12 months" k="price locked. Not the right fit after your first event? We refund the rest of the year." />
                </>
              ) : (
                <>
                  <Stat v="Any time" k="pause or cancel. No notice period, no exit fee." />
                  <Stat v={`${annualSavingPct}%`} k="is what you leave on the table against annual, plus the extra CTF" />
                  <Stat v="Credited" k="switch to annual later and the month you paid comes off the price" />
                </>
              )}
            </div>
            <p className="mt-4 text-[15px] text-white/50">
              Each CTF in a plan is our Pro package: 40 challenges, an {P.hosting.hours}-hour round, our team live.{' '}
              {aud === 'institutions' ? 'More than one campus? ' : 'A bigger scope? '}
              <Link to={aud === 'institutions' ? '/universities#plan' : '/companies#apply'} className="font-semibold text-white hover:text-lime">Ask for a group price →</Link>
            </p>

            <div className="mt-20 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-3xl sm:text-4xl">Just one event?</h2>
              <p className="max-w-md text-[15px] leading-7 text-white/50">Pay per CTF. Every package is yours to change in the builder.</p>
            </div>
          </>
        )}

        {aud === 'learners' && <h2 className="sr-only">Plans for learners</h2>}
        <div className={`grid gap-5 lg:grid-cols-3 ${aud !== 'learners' ? 'mt-8' : ''}`}>
          {TIERS[aud].map((t) => (
            <article
              key={t.name}
              className={`relative flex flex-col rounded-[28px] border p-7 sm:p-8 ${t.recommended ? 'border-lime/50 bg-gradient-to-b from-lime/[0.07] to-[#080d1a] shadow-[0_40px_80px_-40px_rgba(198,241,53,.35)]' : 'border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a]'}`}
            >
              <p className={`text-[13px] font-medium ${t.recommended ? 'text-lime' : 'text-transparent select-none'}`} aria-hidden={!t.recommended}>Recommended</p>
              <h3 className="font-display mt-2 text-3xl">{t.name}</h3>
              <p className="mt-3 min-h-[3.5rem] leading-7 text-white/60">{t.promise}</p>
              <div className="mt-6 flex items-end gap-2">
                {'custom' in t.price ? (
                  <span className="font-display text-5xl">{t.price.custom}</span>
                ) : t.price.usd === 0 ? (
                  <span className="font-display text-5xl">Free</span>
                ) : (
                  <>
                    <span className="font-display text-5xl tabular-nums">${t.price.usd}</span>
                    <span className="pb-1.5 text-[15px] text-white/50">{t.price.unit}</span>
                  </>
                )}
              </div>
              <p className="mt-1 h-5 text-[13px] text-white/45">
                {'custom' in t.price ? 'Priced for your scope, one invoice' : t.price.usd === 0 ? 'No card, no catch' : <Local usd={t.price.usd} className="text-white/45" />}
              </p>
              <ul className="mt-7 space-y-3">
                {t.includes.map((x) => (
                  <li key={x} className="flex items-start gap-3 text-[15px] leading-6 text-white/85"><Check size={17} className="mt-0.5 shrink-0 text-lime" />{x}</li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                {t.cta.to.startsWith('http') ? (
                  <a href={t.cta.to} target="_blank" rel="noopener noreferrer" className={`btn w-full ${t.recommended ? 'btn-lime' : 'btn-ghost'}`}>{t.cta.label} <ArrowRight size={16} /></a>
                ) : (
                  <Link to={t.cta.to} className={`btn w-full ${t.recommended ? 'btn-lime' : 'btn-ghost'}`}>{t.cta.label} <ArrowRight size={16} /></Link>
                )}
                {t.note && <p className="mt-3 text-center text-[13px] text-white/45">{t.note}</p>}
              </div>
            </article>
          ))}
        </div>

        {/* The framing line: why this price is small */}
        <div className="mt-8 grid gap-4 rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 sm:grid-cols-3 sm:p-8">
          {aud === 'learners' ? (
            <>
              <Stat v="Free" k="to play every CTF we run" />
              <Stat v={`$${capt.usd}`} k="for your first verifiable credential" />
              <Stat v="1 year" k="of course, Lab access and the exam, in every certification" />
            </>
          ) : (
            <>
              <Stat v={`$${(beginner.usd / P.hosting.players).toFixed(2)}`} k={`per player on a ${players}-player ${aud === 'companies' ? 'Team' : 'Campus'} CTF`} />
              <Stat v="100%" k="money back if downtime is from our side" />
              <Stat v="0" k="servers, challenge writers or night shifts on your side" />
            </>
          )}
        </div>
      </section>

      <TrustedBySection compact />

      {/* Build your own */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div>
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">Or build it <span className="text-white/45">your way.</span></h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-white/60">Start with hosting, add challenges by category and difficulty, set the hours and the players. The builder shows the total as you go, and every part is priced the same for everyone.</p>
            <Link to="/host-your-ctf#build" className="btn btn-lime mt-8">Open the builder <ArrowRight size={16} /></Link>
          </div>
          <dl className="divide-y divide-white/[0.07] rounded-[24px] border border-white/[0.08] bg-white/[0.02]">
            {[
              ['Hosting', `$${P.hosting.usd} per ${P.hosting.hours}-hour round, ${players} players included`],
              ['Extra hours', `$${P.extraHourUsd} per hour, up to ${P.maxHours} hours`],
              ['Extra players', `$${P.extraPlayersUsd} per ${P.playerBlock.toLocaleString('en-US')} players, no upper limit`],
              ['Challenges', `From $${cheapestChallenge} each: Web, OSINT, Crypto, Reverse, Boot2Root, Mobile, Steg`],
              ['3D event website', `$${P.website3dUsd}, designed to match your theme`],
              ['Qualifier + finale', 'Two rounds, priced as two rounds'],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-1 px-6 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
                <dt className="font-semibold text-white">{k}</dt>
                <dd className="text-[15px] leading-6 text-white/60">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Promise */}
      <section className="border-y border-white/[0.06] bg-[#070b15]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-3 lg:px-8">
          {[
            ['Our promise', 'If any downtime during your event is caused by us, you get 100% of your money back. No forms, no argument.'],
            ['One invoice', 'Pay by card, UPI or net banking through Razorpay. The invoice arrives with the receipt.'],
            ['Real people', 'A person from CyberHx is live for the whole event, and answers your email within two working days before it.'],
          ].map(([h, t]) => (
            <div key={h}>
              <h3 className="font-display text-2xl">{h}</h3>
              <p className="mt-3 leading-7 text-white/60">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-6 sm:py-24">
        <h2 className="font-display text-3xl sm:text-4xl">Questions about pricing</h2>
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

      {/* Close */}
      <section className="mx-auto max-w-4xl px-5 pb-28 text-center sm:px-6">
        <h2 className="font-display text-4xl sm:text-5xl">Still deciding?</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-white/60">Tell us what you are planning. We reply within two working days with a plan and a price, and no pressure.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/host-your-ctf#packages" className="btn btn-lime">Host a CTF <ArrowRight size={16} /></Link>
          <Link to="/contact" className="btn btn-ghost">Talk to us</Link>
        </div>
      </section>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One yearly plan. Annual by default: the monthly-equivalent price leads, the yearly total follows. */
function PlanCard({ plan: p, billing }: { plan: Plan; billing: 'annual' | 'monthly' }) {
  const annual = billing === 'annual';
  const perMonth = annual ? annualPerMonthUsd(p) : p.monthlyUsd;
  const yearly = annual ? annualUsd(p) : p.monthlyUsd * 12;
  // What the same CTFs and Lab seats cost one by one, at list price.
  const oneByOne = Math.round((p.ctfs * pro.usd + p.seats * capt.usd) / 100) * 100;
  return (
    <article className={`relative flex flex-col rounded-[28px] border p-7 sm:p-8 ${p.recommended ? 'order-first border-lime/50 bg-gradient-to-b from-lime/[0.07] to-[#080d1a] shadow-[0_40px_80px_-40px_rgba(198,241,53,.35)] lg:order-none' : 'border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a]'}`}>
      <p className={`text-[13px] font-medium ${p.recommended ? 'text-lime' : 'text-transparent select-none'}`} aria-hidden={!p.recommended}>Recommended</p>
      <h3 className="font-display mt-2 text-3xl">{p.name}</h3>
      <p className="mt-3 min-h-[3.5rem] leading-7 text-white/60">{p.who}</p>
      <div className="mt-6 flex items-end gap-2">
        <span className="font-display text-5xl tabular-nums">${perMonth}</span>
        <span className="pb-1.5 text-[15px] text-white/50">per month</span>
      </div>
      <p className="mt-1 flex flex-wrap gap-x-2 text-[13px] text-white/45">
        <span>{annual ? `Billed $${yearly.toLocaleString('en-US')} a year` : 'Billed monthly, pause or cancel any time'}</span>
        <Local usd={annual ? yearly : p.monthlyUsd} className="text-white/45" />
      </p>
      <p className="mt-1 text-[13px] text-white/45">One by one, the same CTFs and seats cost about ${oneByOne.toLocaleString('en-US')} a year.</p>
      <ul className="mt-7 space-y-3">
        {p.includes.map((x) => (
          <li key={x} className="flex items-start gap-3 text-[15px] leading-6 text-white/85"><Check size={17} className="mt-0.5 shrink-0 text-lime" />{x}</li>
        ))}
        <li className={`flex items-start gap-3 text-[15px] leading-6 ${annual ? 'text-white' : 'text-white/40'}`}>
          <Check size={17} className={`mt-0.5 shrink-0 ${annual ? 'text-lime' : 'text-white/25'}`} />
          {annual ? `${cap(p.annualBonus)}. Price locked for 12 months.` : `On the annual plan: ${p.annualBonus}, and the price locked for 12 months.`}
        </li>
      </ul>
      <div className="mt-auto pt-8">
        <Link to={p.cta.to.replace('#', `?plan=${p.id}&billing=${billing}#`)} className={`btn w-full ${p.recommended ? 'btn-lime' : 'btn-ghost'}`}>{p.cta.label} <ArrowRight size={16} /></Link>
        <p className="mt-3 text-center text-[13px] text-white/45">{p.framing}</p>
      </div>
    </article>
  );
}

function Stat({ v, k }: { v: string; k: string }) {
  return (
    <div>
      <p className="font-display text-4xl tabular-nums">{v}</p>
      <p className="mt-1 text-[14px] leading-6 text-white/50">{k}</p>
    </div>
  );
}
