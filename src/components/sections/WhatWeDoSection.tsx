import { Link } from 'react-router-dom';
import { SiteIcon } from '../shared/SiteIcon';
import { motion, useReducedMotion } from 'framer-motion';
import { Local } from '../shared/Local';
import { ArrowUpRight } from 'lucide-react';
import { plans, builderCategories, builderPricing as P } from '../../data/hosting';
import { entryLabel, events, hasCount } from '../../data/events';

// Example build shown as a receipt. Prices come from the builder data, so they stay in sync.
const price = (cat: string, tier: string) =>
  builderCategories.find((c) => c.id === cat)?.tiers.find((t) => t.tier === tier)?.usd ?? 0;
const exampleHours = 12;
const examplePlayers = 2000;
const receipt = [
  { label: `Hosting, ${P.hosting.hours}h`, usd: P.hosting.usd },
  { label: `+${exampleHours - P.hosting.hours} hours`, usd: (exampleHours - P.hosting.hours) * P.extraHourUsd },
  { label: `+${(examplePlayers - P.hosting.players).toLocaleString('en-US')} players`, usd: P.extraPlayersUsd },
  { label: 'Web × 8', usd: 8 * price('web', 'medium') },
  { label: 'Crypto hard × 3', usd: 3 * price('crypto', 'hard') },
  { label: 'Reverse hard × 3', usd: 3 * price('reverse', 'hard') },
  { label: 'Boot2Root × 2', usd: 2 * price('boot2root', 'hard') },
  { label: 'OSINT × 4', usd: 4 * price('osint', 'medium') },
];
const receiptTotal = receipt.reduce((s, r) => s + r.usd, 0);
const cheapestPlan = Math.min(...plans.map((p) => p.usd));

// "6000+ Hackers" -> "6K+", "1.4K+" stays as is.
const compact = (s: string) => {
  const t = s.replace(/\s*hackers?/i, '').trim();
  const m = t.match(/^(\d{4,})\+$/);
  return m ? `${+(Number(m[1]) / 1000).toFixed(1)}K+` : t;
};

export const WhatWeDoSection = () => {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-white/[0.06] bg-ink py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <h2 className="font-display text-[2.1rem] leading-[1.05] text-white sm:text-5xl">
          <span className="block sm:inline">Play one. </span>
          <span className="block sm:inline">Build one. </span>
          <span className="block text-white/45 sm:inline">Get certified.</span>
        </h2>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* Build your CTF */}
          <Link
            to="/host-your-ctf#packages"
            className="sticker sticker-lime lift group relative grid gap-6 overflow-hidden p-6 sm:grid-cols-[1fr_15rem] sm:p-8"
          >
            <div className="flex flex-col">
              <h3 className="font-display text-3xl text-white sm:text-4xl">Build your own CTF</h3>
              <p className="mt-3 max-w-sm leading-7 text-muted">
                Pick challenges like PC parts: category, difficulty, hours and players. Run one round, or a qualifier
                and a grand finale.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-white/85">
                <li>Hosting from ${P.hosting.usd} a round, {P.hosting.hours}h included</li>
                <li>Challenges from ${Math.min(...builderCategories.flatMap((c) => c.tiers.map((t) => t.usd)))} each</li>
                <li>Prebuilt events from ${cheapestPlan}</li>
              </ul>
              <span className="btn btn-lime mt-auto self-start">Open the builder</span>
            </div>

            {/* Receipt */}
            <div className="relative self-start rounded-xl bg-[#f4f6ee] p-4 font-mono text-[12px] text-ink shadow-[6px_6px_0_0_#02040a] sm:rotate-2 sm:transition-transform sm:duration-500 sm:group-hover:rotate-0">
              <p className="border-b border-dashed border-ink/30 pb-2 text-center font-bold">CYBERHX · YOUR CTF</p>
              <ul className="mt-2 space-y-1">
                {receipt.map((r, i) => (
                  <motion.li
                    key={r.label}
                    className="flex justify-between gap-2"
                    initial={reduce ? false : { opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.12, duration: 0.3 }}
                  >
                    <span>{r.label}</span>
                    <span>${r.usd}</span>
                  </motion.li>
                ))}
              </ul>
              <motion.div
                className="mt-2 border-t border-dashed border-ink/30 pt-2"
                initial={reduce ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 + receipt.length * 0.12 }}
              >
                <div className="flex justify-between text-sm font-bold">
                  <span>TOTAL</span>
                  <span>${receiptTotal}</span>
                </div>
                <Local usd={receiptTotal} className="mt-0.5 block text-right text-ink/60" />
              </motion.div>
            </div>

          </Link>

          {/* View our CTFs */}
          <Link to="/events" className="sticker lift group relative flex flex-col overflow-hidden p-6 sm:p-8">
            <SiteIcon
              name="ctf-green"
              size={150}
              alt=""
              className="pointer-events-none absolute -right-6 -top-6 origin-top-right rotate-12 scale-[0.62] opacity-90 transition-transform duration-500 group-hover:rotate-[4deg] sm:-right-5 sm:-top-4 sm:scale-100 sm:opacity-100"
            />
            <h3 className="font-display max-w-[11ch] text-3xl text-white sm:text-4xl">View our CTFs</h3>
            <p className="mt-3 max-w-[26ch] leading-7 text-muted">What's coming up, and what we've run so far.</p>

            <ul className="mt-7 space-y-3">
              {events.slice(0, 2).map((e) => (
                <li key={e.id} className="flex items-stretch rounded-xl border border-white/[0.08] bg-white/[0.025] transition-colors group-hover:border-white/15">
                  <div className="min-w-0 flex-1 px-4 py-3">
                    <p className="truncate font-semibold text-white">{e.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {e.date}, {e.duration.toLowerCase()}
                    </p>
                  </div>
                  {/* Ticket perforation */}
                  <div className="relative w-0 border-l border-dashed border-white/15" aria-hidden="true">
                    <span className="absolute -left-[9px] -top-[9px] h-4 w-4 rounded-full border border-white/[0.08] bg-[#0a0f1d] [clip-path:inset(50%_0_0_0)]" />
                    <span className="absolute -bottom-[9px] -left-[9px] h-4 w-4 rounded-full border border-white/[0.08] bg-[#0a0f1d] [clip-path:inset(0_0_50%_0)]" />
                  </div>
                  <div className="w-24 shrink-0 px-4 py-3 text-right">
                    {hasCount(e) ? (
                      <>
                        <p className="font-display text-lg leading-6 text-lime">{compact(e.participants)}</p>
                        <p className="text-xs text-muted">players</p>
                      </>
                    ) : (
                      <>
                        <p className="whitespace-nowrap font-display text-lg leading-6 text-lime">{e.shortDate || 'Soon'}</p>
                        <p className="text-xs text-muted">{entryLabel(e) || 'Upcoming'}</p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-semibold text-white">
              See all events
              <ArrowUpRight size={17} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </Link>

        </div>
      </div>
    </section>
  );
};

export default WhatWeDoSection;
