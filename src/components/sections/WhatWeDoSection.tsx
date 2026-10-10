import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Local } from '../shared/Local';
import { plans, builderCategories, builderPricing as P } from '../../data/hosting';
import { events } from '../../data/events';

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

const latest = events[0];

export const WhatWeDoSection = () => {
  const reduce = useReducedMotion();

  return (
    <section className="bg-ink py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <h2 className="font-display max-w-2xl text-4xl text-white sm:text-5xl">Play one. Build one. Get certified.</h2>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* Build your CTF */}
          <Link
            to="/host-your-ctf#build"
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

          {/* Play our CTFs */}
          <Link to="/gallery" className="sticker lift group relative grid overflow-hidden sm:grid-cols-[11rem_1fr]">
            <div className="relative h-40 overflow-hidden border-b-2 border-line bg-black sm:h-full sm:border-b-0 sm:border-r-2">
              <img
                src={latest.image}
                alt={latest.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col p-6">
              <h3 className="font-display text-2xl text-white">Play our CTFs</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Latest: {latest.title}, {latest.participants.toLowerCase()} over {latest.duration.toLowerCase()}.
              </p>
              <p className="font-display mt-3 text-xl text-sun">{latest.prize}</p>
              <span className="mt-auto pt-4 text-sm font-semibold text-lime">See all events</span>
            </div>
          </Link>

        </div>
      </div>
    </section>
  );
};

export default WhatWeDoSection;
