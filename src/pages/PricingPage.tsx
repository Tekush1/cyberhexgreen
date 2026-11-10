import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useLocalCurrency } from '../lib/currency';
import { Seo } from '../features/seo/Seo';
import { Local } from '../components/shared/Local';
import { plans, builderPricing as P, builderCategories } from '../data/hosting';
import { certifications, pentestLabUrl } from '../data/pentest';
import { plans as programs, annualUsd, annualPerMonthUsd, annualSavingPct, type Plan, type PlanAudience } from '../data/plans';
import { SeatPricing } from '../components/pricing/SeatPricing';
import { seatLists, type SeatAudience } from '../data/seats';

/* /pricing, built as a path of small decisions so a visitor never faces every price at once:
   1. Who are you? (Companies · Institutions · Learners)
   2. What do you need? (train people · CTFs all year · one CTF) — three clear doors, the first chosen for you.
   3. One offer for that answer, with one button. Everything else waits behind a click.
   Proof sits next to the decision, reassurance next to the button, questions are filtered to the visitor.
   Prices come from data/seats.ts, data/plans.ts, data/hosting.ts and data/pentest.ts. */

type Audience = 'companies' | 'institutions' | 'learners';
const AUDIENCES: { key: Audience; label: string; lead: string }[] = [
  { key: 'companies', label: 'Companies', lead: 'Hire by skill, train by doing. A plan for the year, or one event at a time.' },
  { key: 'institutions', label: 'Institutions', lead: 'A campus program for less than a textbook per student. Academic pricing on everything.' },
  { key: 'learners', label: 'Learners', lead: 'Every CTF is free. Pay for a year of the Lab when you are ready for a credential.' },
];

interface Tier {
  name: string;
  promise: string;
  price: { usd: number; unit: string } | { custom: string } | { text: string; unit: string; sub?: string };
  includes: string[];
  cta: { label: string; to: string; onSelect?: () => void };
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

type FaqItem = { q: string; a: string; for: Audience[] };
const ORG: Audience[] = ['companies', 'institutions'];
const ALL: Audience[] = ['companies', 'institutions', 'learners'];
const FAQ: FaqItem[] = [
  { q: 'What is a seat?', for: ORG, a: 'One named person for twelve months, from the day they activate it. A college seat is a student on the CyberHx Academy: daily labs, practice challenges, and the college\'s classes, exams, syllabus and schedule, with the teacher dashboard and reports for staff (teachers are free). The Academy + CAPT seat adds a year of the Pentest Lab and the CAPT exam and certificate. A company seat is a person on the Pentest Lab with the CAPT and CPPT courses, both exams and a skills report for the manager.' },
  { q: 'How does the price per seat work?', for: ORG, a: `The more seats, the less each costs. Students start at ${seatLists.academic.min} seats and teams at ${seatLists.company.min}. If the next step up costs the same or less, we bill that step and the extra seats are yours, free. Colleges get free faculty seats and companies get free manager seats.` },
  { q: 'Do you charge GST or other taxes?', for: ALL, a: 'No. The price you see is the total you pay.' },
  { q: 'Which seat orders include free CTFs?', for: ORG, a: 'Colleges get a hosted campus CTF from 50 student seats, two from 100, four from 200 and six from 350. Companies get a private team CTF from 25 seats, two from 50, four from 100 and six from 250. Each is a full CTF under your name, run by our team.' },
  { q: 'What if seats go unused or people leave?', for: ORG, a: "Colleges: inactive seats are replaced free in the first 30 days. Companies: a seat moves to a new person when someone leaves, and your first order has a 30-day money-back. Every seat's year starts when it is activated, not when you pay." },
  { q: 'Is there academic pricing?', for: ['institutions'], a: 'Yes. Student seats are priced for colleges, from ₹1,499 a seat in India, and every CTF package carries an academic discount. Tell us your numbers and we send a quote.' },
  { q: 'Monthly or annual: what is the difference?', for: ORG, a: 'The same plan, two ways to pay. Monthly is billed every month and you can pause or cancel any time. Annual is twelve months for the price of ten, locks the price for the year, and adds an extra CTF on us.' },
  { q: 'Can we start monthly and switch?', for: ORG, a: 'Yes. Start monthly and switch to annual whenever you like: the month you have already paid is credited against the annual price.' },
  { q: 'What if a plan turns out not to be the right fit?', for: ORG, a: 'Tell us after your first event. If it is not working for you, we refund the rest of the year, no questions.' },
  { q: 'What if something goes wrong during our event?', for: ORG, a: 'If there is any downtime from our side during your event, you get 100% of your money back. Our team is live for the whole event.' },
  { q: 'Can we change a package?', for: ORG, a: 'Yes. Add hours, players, challenges or a 3D event site to any package, or build your own from scratch. The builder shows the price as you go.' },
  { q: 'Do learners pay anything to play?', for: ['learners'], a: 'No. Every public CyberHx CTF is free to enter. You pay only for a certification, which gives you a year of the course, the Pentest Lab and the exam.' },
  { q: 'What do I get with CAPT or CPPT?', for: ['learners'], a: 'A year of the course, the Pentest Lab and the exam, and a verifiable certificate anyone can check. CAPT is the associate level, CPPT the professional one.' },
  { q: 'Do I get an invoice?', for: ALL, a: 'Yes. Every payment goes through Razorpay and comes with an invoice or receipt. Larger orders can also be paid by bank transfer against a purchase order.' },
  { q: 'Which currency do you charge in?', for: ALL, a: 'Visitors in India see and pay rupee prices for seats; everyone else sees US dollars. Next to dollar prices we show an estimate in your currency; your bank converts at its own rate.' },
];

type Need = 'train' | 'plan' | 'event';
const NEED_KEYS: Need[] = ['train', 'plan', 'event'];

const inrFmt = (n: number) => '₹' + n.toLocaleString('en-IN');

export default function PricingPage() {
  const { hash, search } = useLocation();
  const { code } = useLocalCurrency();
  const inIndia = code === 'INR';
  const fromHash = (h: string): Audience | null => (['companies', 'institutions', 'learners'] as Audience[]).find((a) => h === `#${a}`) || null;
  const fromSearch = (q: string): Need | null => NEED_KEYS.find((n) => new URLSearchParams(q).get('need') === n) || null;
  const [aud, setAud] = useState<Audience>(fromHash(hash) || 'companies');
  const [need, setNeed] = useState<Need>(fromSearch(search) || 'train');
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');
  const [open, setOpen] = useState<number | null>(0);
  const [allFaq, setAllFaq] = useState(false);
  const [pkg, setPkg] = useState<SeatAudience>('academicCapt');
  useEffect(() => { const a = fromHash(hash); if (a) setAud(a); }, [hash]);

  const go = (a: Audience, n: Need = need) => {
    setAud(a);
    setNeed(n);
    setOpen(0);
    setAllFaq(false);
    history.replaceState(null, '', `${n === 'train' ? '' : `?need=${n}`}#${a}`);
  };

  const current = AUDIENCES.find((a) => a.key === aud)!;
  const seatList = seatLists[aud === 'institutions' ? 'academic' : 'company'];
  const cheapestSeat = seatList.slabs[seatList.slabs.length - 1];
  const seatFrom = inIndia ? inrFmt(cheapestSeat.inr) : `$${cheapestSeat.usd}`;
  const planFrom = annualPerMonthUsd(programs[aud === 'institutions' ? 'institutions' : 'companies'][0]);

  const doors: Record<Need, { label: string; sub: string; head: string; lead: string }> =
    aud === 'institutions'
      ? {
          train: { label: 'Academy for my college', sub: `From ${seatFrom} a student a year`, head: 'The CyberHx Academy for your college.', lead: 'Teach all year on the Academy, and add the CAPT certification so every student leaves with a credential. Teachers free.' },
          plan: { label: 'CTFs all year', sub: `Plans from $${planFrom} a month`, head: 'A plan for your club, cell or department.', lead: 'CTFs on the calendar, Lab seats for the organisers, a report after every event. One budget line.' },
          event: { label: 'Run one CTF', sub: `From $${beginner.usd} per event`, head: 'One CTF, built and run for you.', lead: 'Pick a package. Every package is yours to change in the builder.' },
        }
      : {
          train: { label: 'Train my team', sub: `Seats from ${seatFrom} a person a year`, head: 'Seats for your team.', lead: 'A year of the Lab, the CAPT and CPPT courses and both exams for each person, with a skills report for the manager.' },
          plan: { label: 'Hire security talent', sub: `Plans from $${planFrom} a month`, head: 'Hire by skill, all year.', lead: 'Hiring CTFs on the calendar, a ranked shortlist after every round, Lab seats for the team you already have.' },
          event: { label: 'Run one CTF', sub: `From $${beginner.usd} per event`, head: 'One CTF, for your team or your hiring.', lead: 'Pick a package. Every package is yours to change in the builder.' },
        };

  const faqs = FAQ.filter((f) => f.for.includes(aud));
  const shownFaqs = allFaq ? faqs : faqs.slice(0, 5);
  const closeTo = aud === 'companies' ? '/companies#apply' : aud === 'institutions' ? '/universities#plan' : '/events';

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="Pricing — CyberHx for Companies, Institutions and Learners"
        description={`Student seats from ₹1,499 ($19) and team seats from ₹7,499 ($89) a year, yearly plans, single CTFs from $${beginner.usd}, CAPT $${capt.usd} and CPPT $${cppt.usd} per year. No GST, no extra fees, money back on downtime.`}
        path="/pricing"
        keywords="ctf hosting price, cybersecurity training price per seat, academic cybersecurity lab pricing, capt certification price, cppt price, hiring ctf cost"
      />

      {/* 1 · Who are you? */}
      <section className="relative overflow-hidden pb-8 pt-28 sm:pt-36">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[48rem] -translate-x-1/2 rounded-full bg-lime/[0.06] blur-[120px]" />
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
          <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
            Clear prices. <span className="text-white/45">No surprises.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/60">Tell us who you are and what you need. You get one answer and one price.</p>

          <div role="tablist" aria-label="Who is this for" className="mx-auto mt-9 inline-flex max-w-full rounded-2xl border border-white/[0.09] bg-white/[0.04] p-1.5">
            {AUDIENCES.map((a) => (
              <button
                key={a.key}
                role="tab"
                id={`tab-${a.key}`}
                aria-selected={aud === a.key}
                aria-controls={`panel-${a.key}`}
                onClick={() => go(a.key, 'train')}
                className={`rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors sm:px-6 ${aud === a.key ? 'bg-white text-ink shadow-[0_8px_24px_-12px_rgba(0,0,0,.8)]' : 'text-white/65 hover:text-white'}`}
              >
                For {a.label}
              </button>
            ))}
          </div>
          <p className="mt-5 text-[14px] text-white/45">Trusted by NFSU Chennai and Thapar Institute · 7,400+ players from 90+ countries</p>
        </div>
      </section>

      <section id={`panel-${aud}`} role="tabpanel" aria-labelledby={`tab-${aud}`} className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 lg:px-8">
        {aud !== 'learners' ? (
          <>
            {/* 2 · What do you need? */}
            <h2 className="text-center text-[15px] font-semibold text-white/55">What do you need?</h2>
            <div role="radiogroup" aria-label="What do you need" className="mx-auto mt-4 grid max-w-4xl gap-2 sm:grid-cols-3">
              {NEED_KEYS.map((k) => {
                const on = need === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => go(aud, k)}
                    className={`rounded-2xl border px-5 py-4 text-left transition-colors ${on ? 'border-lime bg-lime/[0.1]' : 'border-white/[0.09] bg-white/[0.03] hover:border-white/25'}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-[17px] font-semibold text-white">{doors[k].label}</span>
                      <span aria-hidden="true" className={`h-4 w-4 shrink-0 rounded-full border-2 ${on ? 'border-lime bg-lime' : 'border-white/30'}`} />
                    </span>
                    <span className="mt-1 block text-[14px] text-white/55">{doors[k].sub}</span>
                  </button>
                );
              })}
            </div>

            {/* 3 · One offer */}
            <div className="mt-14 text-center">
              <h2 className="font-display text-3xl sm:text-5xl">{doors[need].head}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-white/60">{doors[need].lead}</p>
            </div>

            <div className="mt-10">
              {need === 'train' && aud === 'institutions' && (
                <>
                  <div className="grid gap-5 lg:grid-cols-3">
                    {academyCards(inIndia, (p) => setPkg(p)).map((t) => <TierCard key={t.name} t={t} />)}
                  </div>
                  <div id="seats" className="mt-14 scroll-mt-24 text-center">
                    <h3 className="font-display text-3xl sm:text-4xl">Price your batch.</h3>
                    <p className="mx-auto mt-2 max-w-xl text-white/60">Pick the package, set the number of students. The bigger the batch, the less each seat costs.</p>
                  </div>
                  <div className="mt-8"><SeatPricing audience={pkg} packages={['academic', 'academicCapt']} onPackage={setPkg} /></div>
                </>
              )}
              {need === 'train' && aud === 'companies' && <SeatPricing audience="company" />}
              {need === 'train' && aud === 'institutions' && (
                <p className="mt-6 text-center text-[15px] text-white/50">
                  Teacher dashboard, exams, syllabus, schedule, reports and college leaderboards in every plan.{' '}
                  <Link to="/academy" className="font-semibold text-white hover:text-lime">See the Academy →</Link>
                </p>
              )}

              {need === 'plan' && (
                <>
                  <div className="flex justify-center">
                    <div role="group" aria-label="Billing" className="inline-flex rounded-2xl border border-white/[0.09] bg-white/[0.04] p-1.5">
                      {(['annual', 'monthly'] as const).map((b) => (
                        <button key={b} type="button" aria-pressed={billing === b} onClick={() => setBilling(b)}
                          className={`rounded-xl px-4 py-2 text-[15px] font-semibold transition-colors ${billing === b ? 'bg-white text-ink' : 'text-white/65 hover:text-white'}`}>
                          {b === 'annual' ? 'Annual · 2 months free' : 'Monthly'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 grid gap-5 lg:grid-cols-3">
                    {programs[aud as PlanAudience].map((p) => <PlanCard key={p.id} plan={p} billing={billing} />)}
                  </div>
                  <p className="mt-6 text-center text-[15px] text-white/50">
                    {billing === 'annual' ? `Annual: ${annualSavingPct}% less than monthly, an extra CTF on us, price locked for 12 months.` : 'Monthly: pause or cancel any time. Switch to annual later and the month you paid is credited.'}
                  </p>
                </>
              )}

              {need === 'event' && (
                <>
                  <div className="grid gap-5 lg:grid-cols-3">
                    {TIERS[aud].map((t) => <TierCard key={t.name} t={t} />)}
                  </div>
                  <p className="mt-6 text-center text-[15px] text-white/50">
                    Hosting only from ${P.hosting.usd} per {P.hosting.hours}-hour round, challenges from ${cheapestChallenge} each.{' '}
                    <Link to="/host-your-ctf#build" className="font-semibold text-white hover:text-lime">Price it in the builder →</Link>
                  </p>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-lg text-white/70">{current.lead}</p>
            <h2 className="sr-only">Plans for learners</h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {TIERS.learners.map((t) => <TierCard key={t.name} t={t} />)}
            </div>
          </>
        )}

        {/* Reassurance, next to the decision */}
        <ul className="mx-auto mt-14 grid max-w-5xl gap-6 border-y border-white/[0.07] py-8 text-center sm:grid-cols-3">
          {(aud === 'learners'
            ? [['Free', 'to play every CTF we run'], ['1 year', 'of course, Lab and exam in every certification'], ['Verifiable', 'certificates anyone can check']]
            : [['No GST', 'the price you see is the total'], ['100% back', 'if downtime during your event is from our side'], ['2 days', 'for a reply from a real person, with a plan and a price']]
          ).map(([v, k]) => (
            <li key={v}>
              <p className="font-display text-2xl">{v}</p>
              <p className="mt-1 text-[14px] text-white/50">{k}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Questions, filtered to this visitor */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl">Questions</h2>
        <div className="mt-6 divide-y divide-white/[0.07] rounded-[24px] border border-white/[0.08] bg-white/[0.02]">
          {shownFaqs.map((x, i) => (
            <div key={x.q}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
                <span className="text-[16px] font-semibold">{x.q}</span>
                <span className={`text-xl text-lime transition-transform ${open === i ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
              </button>
              {open === i && <p className="-mt-1 px-6 pb-5 leading-7 text-white/60">{x.a}</p>}
            </div>
          ))}
        </div>
        {faqs.length > 5 && (
          <button type="button" onClick={() => setAllFaq(!allFaq)} className="mt-4 text-[15px] font-semibold text-white/70 hover:text-white">
            {allFaq ? 'Show fewer questions' : `Show all ${faqs.length} questions`}
          </button>
        )}
      </section>

      {/* Close */}
      <section className="mx-auto max-w-4xl px-5 pb-28 text-center sm:px-6">
        <h2 className="font-display text-4xl sm:text-5xl">Still deciding?</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-white/60">Tell us your numbers. We reply within two working days with a plan and a price, and no pressure.</p>
        <Link to={closeTo} className="btn btn-lime mt-8">{aud === 'learners' ? 'See upcoming CTFs' : 'Talk to us'} <ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A short list with the rest one click away, so cards stay calm. */
function Includes({ items, extra }: { items: string[]; extra?: React.ReactNode }) {
  const [more, setMore] = useState(false);
  const shown = more ? items : items.slice(0, 3);
  return (
    <>
      <ul className="mt-6 space-y-3">
        {shown.map((x) => (
          <li key={x} className="flex items-start gap-3 text-[15px] leading-6 text-white/85"><Check size={17} className="mt-0.5 shrink-0 text-lime" />{x}</li>
        ))}
        {extra}
      </ul>
      {items.length > 3 && (
        <button type="button" onClick={() => setMore(!more)} className="mt-3 text-left text-[14px] font-semibold text-white/55 hover:text-white">
          {more ? 'Show less' : `+ ${items.length - 3} more included`}
        </button>
      )}
    </>
  );
}

/** The two college packages and the custom one, in the same friendly cards as everything else. */
function academyCards(inIndia: boolean, pick: (p: SeatAudience) => void): Tier[] {
  const from = (l: SeatAudience) => {
    const sl = seatLists[l].slabs;
    const low = sl[sl.length - 1];
    const fmt = (x: { inr: number; usd: number }) => (inIndia ? `₹${x.inr.toLocaleString('en-IN')}` : `$${x.usd}`);
    return { text: fmt(low), sub: `per student from ${low.min} students · ${fmt(sl[0])} for a pilot of ${sl[0].min}` };
  };
  const a = from('academic');
  const c = from('academicCapt');
  return [
    {
      name: 'Academy',
      promise: 'Teach cybersecurity all year on the CyberHx Academy.',
      price: { text: a.text, unit: 'a year', sub: a.sub },
      includes: ['Teacher dashboard, exams, syllabus and reports', 'Daily labs and practice challenges for every student', 'Class, college and global leaderboards', 'Teacher seats free', 'Schedule, college challenges and CSV exports'],
      cta: { label: 'Price your batch', to: '#seats', onSelect: () => pick('academic') },
    },
    {
      name: 'Academy + CAPT',
      promise: 'Teach all year, and every student leaves certified.',
      price: { text: c.text, unit: 'a year', sub: c.sub },
      includes: ['Everything in Academy', 'A year of the Pentest Lab for every student', 'The CAPT course and exam, with a verifiable certificate', 'One free retake per student'],
      cta: { label: 'Price your batch', to: '#seats', onSelect: () => pick('academicCapt') },
      recommended: true,
      note: `On their own, CAPT is $${capt.usd} a person.`,
    },
    {
      name: 'University-wide',
      promise: 'More than 500 students, or several campuses.',
      price: { custom: 'Custom' },
      includes: ['Academy + CAPT for every department', 'A CTF every month', 'A named account manager', 'Purchase orders and one yearly invoice'],
      cta: { label: 'Talk to us', to: '/universities#plan' },
    },
  ];
}

function TierCard({ t }: { t: Tier }) {
  return (
    <article className={`relative flex flex-col rounded-[28px] border p-7 sm:p-8 ${t.recommended ? 'order-first border-lime/50 bg-gradient-to-b from-lime/[0.07] to-[#080d1a] lg:order-none' : 'border-white/[0.08] bg-[#0a1020]'}`}>
      {t.recommended && <p className="text-[13px] font-medium text-lime">Most chosen</p>}
      <h3 className={`font-display text-3xl ${t.recommended ? 'mt-2' : 'mt-[1.625rem]'}`}>{t.name}</h3>
      <p className="mt-2 leading-7 text-white/60">{t.promise}</p>
      <div className="mt-6 flex items-end gap-2">
        {'text' in t.price ? (
          <>
            <span className="font-display text-5xl tabular-nums">{t.price.text}</span>
            <span className="pb-1.5 text-[15px] text-white/50">{t.price.unit}</span>
          </>
        ) : 'custom' in t.price ? (
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
      <p className="mt-1 min-h-[1.25rem] text-[13px] leading-5 text-white/45">
        {'text' in t.price ? t.price.sub : 'custom' in t.price ? 'Priced for your scope' : t.price.usd === 0 ? 'No card, no catch' : <Local usd={t.price.usd} className="text-white/45" />}
      </p>
      <Includes items={t.includes} />
      <div className="mt-auto pt-8">
        {t.cta.onSelect ? (
          <a href={t.cta.to} onClick={(e) => { e.preventDefault(); t.cta.onSelect!(); document.querySelector(t.cta.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`btn w-full ${t.recommended ? 'btn-lime' : 'btn-ghost'}`}>{t.cta.label} <ArrowRight size={16} /></a>
        ) : t.cta.to.startsWith('http') ? (
          <a href={t.cta.to} target="_blank" rel="noopener noreferrer" className={`btn w-full ${t.recommended ? 'btn-lime' : 'btn-ghost'}`}>{t.cta.label} <ArrowRight size={16} /></a>
        ) : (
          <Link to={t.cta.to} className={`btn w-full ${t.recommended ? 'btn-lime' : 'btn-ghost'}`}>{t.cta.label} <ArrowRight size={16} /></Link>
        )}
        {t.note && <p className="mt-3 text-center text-[13px] text-white/45">{t.note}</p>}
      </div>
    </article>
  );
}

/** One yearly plan. Annual by default: the monthly-equivalent price leads, the yearly total follows. */
function PlanCard({ plan: p, billing }: { plan: Plan; billing: 'annual' | 'monthly' }) {
  const annual = billing === 'annual';
  const perMonth = annual ? annualPerMonthUsd(p) : p.monthlyUsd;
  const yearly = annual ? annualUsd(p) : p.monthlyUsd * 12;
  // What the same CTFs and Lab seats cost one by one, at list price.
  const oneByOne = Math.round((p.ctfs * pro.usd + p.seats * capt.usd) / 100) * 100;
  return (
    <article className={`relative flex flex-col rounded-[28px] border p-7 sm:p-8 ${p.recommended ? 'order-first border-lime/50 bg-gradient-to-b from-lime/[0.07] to-[#080d1a] lg:order-none' : 'border-white/[0.08] bg-[#0a1020]'}`}>
      {p.recommended && <p className="text-[13px] font-medium text-lime">Most chosen</p>}
      <h3 className={`font-display text-3xl ${p.recommended ? 'mt-2' : 'mt-[1.625rem]'}`}>{p.name}</h3>
      <p className="mt-2 leading-7 text-white/60">{p.who}</p>
      <div className="mt-6 flex items-end gap-2">
        <span className="font-display text-5xl tabular-nums">${perMonth}</span>
        <span className="pb-1.5 text-[15px] text-white/50">per month</span>
      </div>
      <p className="mt-1 text-[13px] text-white/45">
        {annual ? `Billed $${yearly.toLocaleString('en-US')} a year` : 'Billed monthly'} · worth about ${oneByOne.toLocaleString('en-US')} one by one
      </p>
      <Includes
        items={p.includes}
        extra={
          <li className={`flex items-start gap-3 text-[15px] leading-6 ${annual ? 'text-white' : 'text-white/40'}`}>
            <Check size={17} className={`mt-0.5 shrink-0 ${annual ? 'text-lime' : 'text-white/25'}`} />
            {annual ? `${cap(p.annualBonus)}.` : `Annual adds ${p.annualBonus}.`}
          </li>
        }
      />
      <div className="mt-auto pt-8">
        <Link to={p.cta.to.replace('#', `?plan=${p.id}&billing=${billing}#`)} className={`btn w-full ${p.recommended ? 'btn-lime' : 'btn-ghost'}`}>{p.cta.label} <ArrowRight size={16} /></Link>
        <p className="mt-3 text-center text-[13px] text-white/45">{p.framing}</p>
      </div>
    </article>
  );
}
