import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { Local } from '../components/shared/Local';
import { TrustedBySection } from '../components/sections/TrustedBySection';
import { plans, builderPricing as P, builderCategories } from '../data/hosting';
import { certifications, pentestLabUrl } from '../data/pentest';

/* /pricing: every price on one page, split by who is buying.
   Companies · Institutions · Learners. Three tiers each, the middle one recommended, the third a
   conversation for anything bigger. Prices come from data/hosting.ts and data/pentest.ts so they
   stay in step with checkout. Typography only: no icons, no badges. */

type Audience = 'companies' | 'institutions' | 'learners';
const AUDIENCES: { key: Audience; label: string; lead: string }[] = [
  { key: 'companies', label: 'Companies', lead: 'Hire by skill, train by doing. Priced per event, not per seat.' },
  { key: 'institutions', label: 'Institutions', lead: 'A campus CTF costs less than the snacks. Academic pricing on everything.' },
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
      name: 'Enterprise',
      promise: 'Training, certification and placement for the whole team.',
      price: { custom: 'Custom' },
      includes: ['Private CTFs on your calendar', 'Pentest Lab seats for the team', 'CAPT and CPPT certification in bulk', 'Talent placement from our community', 'One named contact at CyberHx'],
      cta: { label: 'Talk to us', to: '/companies#apply' },
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
      name: 'Campus Program',
      promise: 'A CTF every semester. Labs for a batch. One person who knows your campus.',
      price: { custom: 'Custom' },
      includes: ['A CTF every semester, under your name', 'Pentest Lab seats and CAPT or CPPT for a batch', 'Workshops from practitioners', 'Student ambassadors on your campus', 'One yearly price, one invoice'],
      cta: { label: 'Plan your program', to: '/universities#plan' },
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
  { q: 'Do I get an invoice?', a: 'Yes. Every payment goes through Razorpay and comes with an invoice your accounts team can file.' },
  { q: 'Which currency do you charge in?', a: 'Prices are in US dollars. We show an estimate in your currency next to each price; your bank converts at its own rate.' },
  { q: 'What if something goes wrong during our event?', a: 'If there is any downtime from our side during your event, you get 100% of your money back. Our team is live for the whole event.' },
  { q: 'Is there academic pricing?', a: 'Yes. Colleges and universities get an academic discount on every package and batch pricing for labs and certifications. Tell us your numbers and we send a quote.' },
  { q: 'Can we change a package?', a: 'Yes. Add hours, players, challenges or a 3D event site to any package, or build your own from scratch. The builder shows the price as you go.' },
  { q: 'Do learners pay anything to play?', a: 'No. Every public CyberHx CTF is free to enter. You pay only for a certification, which gives you a year of the course, the Pentest Lab and the exam.' },
];

export default function PricingPage() {
  const { hash } = useLocation();
  const fromHash = (h: string): Audience | null => (['companies', 'institutions', 'learners'] as Audience[]).find((a) => h === `#${a}`) || null;
  const [aud, setAud] = useState<Audience>(fromHash(hash) || 'companies');
  const [open, setOpen] = useState<number | null>(0);
  useEffect(() => { const a = fromHash(hash); if (a) setAud(a); }, [hash]);

  const current = AUDIENCES.find((a) => a.key === aud)!;

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="Pricing — CyberHx for Companies, Institutions and Learners"
        description={`CTF hosting from $${P.hosting.usd}, ready-made CTF packages from $${beginner.usd}, CAPT $${capt.usd} and CPPT $${cppt.usd}. Clear prices for companies, universities and learners, with Razorpay invoices and a money-back promise on downtime.`}
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

      {/* Tiers */}
      <section id={`panel-${aud}`} role="tabpanel" aria-labelledby={`tab-${aud}`} className="mx-auto max-w-7xl px-5 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {TIERS[aud].map((t) => (
            <article
              key={t.name}
              className={`relative flex flex-col rounded-[28px] border p-7 sm:p-8 ${t.recommended ? 'border-lime/50 bg-gradient-to-b from-lime/[0.07] to-[#080d1a] shadow-[0_40px_80px_-40px_rgba(198,241,53,.35)]' : 'border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a]'}`}
            >
              <p className={`text-[13px] font-medium ${t.recommended ? 'text-lime' : 'text-transparent select-none'}`} aria-hidden={!t.recommended}>Recommended</p>
              <h2 className="font-display mt-2 text-3xl">{t.name}</h2>
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

function Stat({ v, k }: { v: string; k: string }) {
  return (
    <div>
      <p className="font-display text-4xl tabular-nums">{v}</p>
      <p className="mt-1 text-[14px] leading-6 text-white/50">{k}</p>
    </div>
  );
}
