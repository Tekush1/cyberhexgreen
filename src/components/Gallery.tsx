import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { ArrowRight, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { events } from '../data/events';
import { stats } from '../data/stats';
import { builderPricing } from '../data/hosting';
import { Mascot } from './shared/Mascot';
import { CountUp } from './shared/CountUp';
import { EventCard } from './gallery/EventCard';
import { EventDialog } from './gallery/EventDialog';
import { allCategories, dateParts, pad2 } from './gallery/eventStyle';

const ease = [0.16, 1, 0.3, 1] as const;

const SPARKS = [
  { x: '16%', d: '0s', dur: '5s', drift: '-12px' },
  { x: '34%', d: '1.6s', dur: '4.6s', drift: '10px', lime: true },
  { x: '58%', d: '0.8s', dur: '5.4s', drift: '-8px' },
  { x: '76%', d: '2.6s', dur: '4.8s', drift: '12px', lime: true },
  { x: '88%', d: '3.8s', dur: '5.6s', drift: '-6px' },
];

/** A headline line that slides up from behind a mask. */
const Line = ({ children, delay, reduce }: { children: ReactNode; delay: number; reduce: boolean }) => (
  <span className="block overflow-hidden pb-[0.1em]">
    <motion.span
      className="block"
      initial={reduce ? false : { y: '110%' }}
      animate={{ y: '0%' }}
      transition={{ duration: 1.05, delay, ease }}
    >
      {children}
    </motion.span>
  </span>
);

/** Flickering digits for a date nobody knows yet. */
function UnknownDate({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [d, setD] = useState(['?', '?', '?', '?', '?', '?']);
  useEffect(() => {
    if (reduce || !inView) return;
    const t = setInterval(() => setD((p) => p.map(() => String(Math.floor(Math.random() * 10)))), 120);
    return () => clearInterval(t);
  }, [reduce, inView]);
  const groups = [
    { v: d.slice(0, 2), l: 'days' },
    { v: d.slice(2, 4), l: 'hrs' },
    { v: d.slice(4, 6), l: 'min' },
  ];
  return (
    <div ref={ref} className="mt-6">
      <span className="sr-only">Date to be announced.</span>
      <div aria-hidden="true" className="flex items-end gap-2">
        {groups.map((g, i) => (
          <div key={g.l} className="flex items-end gap-2">
            <div>
              <div className="flex gap-1">
                {g.v.map((ch, j) => (
                  <span
                    key={j}
                    className="flex h-11 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] font-mono text-lg tabular-nums text-white/80 sm:h-12 sm:w-9 sm:text-xl"
                  >
                    {ch}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">{g.l}</p>
            </div>
            {i < 2 && <span className="mb-7 font-mono text-white/30">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export const Gallery = () => {
  const reduce = !!useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);
  const categories = allCategories(events);

  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 75%', 'end 60%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060d] text-white">
      {/* ═══ Header ═══════════════════════════════════════════ */}
      <header className="relative isolate pt-28 sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="ev-beam left-[6%]" />
          <div className="ev-beam ev-beam-alt right-[0%]" />
          <div className="ev-drift absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-[#3bd3ff]/[0.13] blur-[120px]" />
          <div className="ev-drift absolute -right-40 top-24 h-[32rem] w-[32rem] rounded-full bg-[#8b5cf6]/[0.14] blur-[120px] [animation-delay:-6s]" />
          <div className="ev-drift absolute bottom-[-10rem] left-1/3 h-[22rem] w-[40rem] rounded-full bg-[#ff3d6e]/[0.08] blur-[120px] [animation-delay:-3s]" />
          <div className="ev-dots absolute inset-0" />
          <div className="ev-noise absolute inset-0" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:gap-10 lg:px-8">
          <div>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/70 backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
              </span>
              Events archive
            </motion.p>

            <h1 className="font-display mt-6 text-[3.2rem] leading-[0.92] text-white sm:text-7xl lg:text-[5.6rem]">
              <Line delay={0.1} reduce={reduce}>
                Every CTF
              </Line>
              <Line delay={0.22} reduce={reduce}>
                <span className="ev-aurora">we've run.</span>
              </Line>
            </h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease }}
              className="mt-6 max-w-lg text-lg leading-8 text-muted"
            >
              Leaderboards, certificates and photos from each event. Tap any one to open it.
            </motion.p>

            <motion.dl
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease }}
              className="mt-9 grid max-w-xl grid-cols-3 gap-2.5 sm:gap-3"
            >
              {stats.map((st, i) => (
                <div key={st.label} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3.5 backdrop-blur sm:px-4 sm:py-4">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${['#3bd3ff', '#8b5cf6', '#c6f135'][i % 3]}, transparent)` }}
                  />
                  <dt className="font-display text-[1.45rem] leading-none text-white sm:text-3xl">
                    <CountUp to={st.to} prefix={st.prefix} suffix={st.suffix} decimals={st.decimals} />
                  </dt>
                  <dd className="mt-2 text-[11.5px] leading-4 text-muted sm:text-xs">{st.label}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* mascot on a lit pedestal */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease }}
            className="relative mx-auto flex h-[17rem] w-full max-w-xs items-end justify-center sm:h-[22rem] lg:h-[27rem]"
          >
            <div className="relative">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <span className="hero-aura" />
                <span className="hero-portal-anchor">
                  <span className="hero-portal" />
                  <span className="hero-portal hero-portal-wave" />
                  <span className="hero-portal hero-portal-wave [animation-delay:1.6s]" />
                </span>
                {SPARKS.map((s, i) => (
                  <span
                    key={i}
                    className={`hero-spark ${s.lime ? 'is-lime' : ''}`}
                    style={{ '--x': s.x, '--d': s.d, '--dur': s.dur, '--drift': s.drift } as CSSProperties}
                  />
                ))}
              </div>
              <div className={reduce ? 'relative' : 'hero-breathe relative'}>
                <Mascot pose="cheer" still eager alt="CyberHx mascot cheering" className="h-[15rem] w-auto sm:h-[20rem] lg:h-[24rem]" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* category ribbon */}
        <div className="relative mt-14 border-y border-white/[0.07] bg-white/[0.015] py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] sm:mt-20 sm:py-5">
          <div className="marquee" aria-hidden="true">
            {[...categories, ...categories].map((c, i) => (
              <span key={i} className="flex items-center gap-6 whitespace-nowrap px-6 font-display text-2xl sm:text-[2rem]">
                <span className={i % 2 ? 'ev-outline-strong' : 'text-white/85'}>{c}</span>
                <span className="text-base text-[#3bd3ff]">✦</span>
              </span>
            ))}
          </div>
          <p className="sr-only">Categories across our events: {categories.join(', ')}.</p>
        </div>
      </header>

      {/* ═══ Archive timeline ═════════════════════════════════ */}
      <section className="relative mx-auto max-w-6xl px-5 pt-20 sm:px-6 sm:pt-28 lg:px-8" aria-labelledby="archive-title">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease }}
          className="flex items-end justify-between gap-6"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#3bd3ff]">The archive</p>
            <h2 id="archive-title" className="font-display mt-3 text-4xl leading-[1] text-white sm:text-5xl">
              Newest first.
            </h2>
          </div>
          <p className="hidden pb-1 font-mono text-sm text-white/45 sm:block">
            <span className="text-white">{pad2(events.length)}</span> events
          </p>
        </motion.div>

        <div ref={listRef} className="relative mt-12 sm:mt-16">
          {/* rail + scroll progress */}
          <div aria-hidden="true" className="absolute bottom-0 left-[7px] top-2 w-px bg-white/10 md:left-[9rem]" />
          <motion.div
            aria-hidden="true"
            style={{ scaleY: reduce ? 1 : progress }}
            className="absolute bottom-0 left-[7px] top-2 w-px origin-top bg-gradient-to-b from-[#ff3d6e] via-[#8b5cf6] to-[#3bd3ff] shadow-[0_0_12px_rgba(139,92,246,0.8)] md:left-[9rem]"
          />

          <ol className="space-y-14 sm:space-y-20">
            {events.map((e, i) => {
              const dp = dateParts(e.date);
              return (
                <li key={e.id} className="relative grid pl-9 md:grid-cols-[9rem_1fr] md:pl-0">
                  {/* node */}
                  <motion.span
                    aria-hidden="true"
                    initial={reduce ? false : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: '-120px' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                    className="absolute left-0 top-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-full border border-white/30 bg-[#04060d] md:left-[calc(9rem-7px)]"
                  >
                    <span className="h-[7px] w-[7px] rounded-full bg-white shadow-[0_0_10px_3px_rgba(139,92,246,0.9)]" />
                  </motion.span>

                  {/* date */}
                  <motion.div
                    initial={reduce ? false : { opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8, ease }}
                    className="mb-4 flex items-baseline gap-2 md:sticky md:top-28 md:mb-0 md:block md:self-start md:pr-9 md:text-right"
                  >
                    <p className="font-display text-2xl leading-none text-white md:text-[2.1rem]">{dp.month}</p>
                    <p className="font-mono text-xs text-white/45 md:mt-2">
                      {dp.days && <span className="md:block">{dp.days} · </span>}
                      {dp.year}
                    </p>
                  </motion.div>

                  <div className="md:pl-10">
                    <EventCard event={e} index={i} onOpen={() => setOpen(i)} />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ═══ What's next ══════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-5 pt-24 sm:px-6 sm:pt-32 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease }}
          className="relative overflow-hidden rounded-[28px] p-px"
        >
          {/* light running around the border */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 animate-[spin_7s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,#3bd3ff_300deg,#c6f135_335deg,transparent_360deg)] motion-reduce:animate-none"
          />
          <div className="relative grid items-center gap-8 overflow-hidden rounded-[27px] bg-[#070b16] p-6 sm:p-10 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] lg:gap-12">
            <div aria-hidden="true" className="ev-dots pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative mx-auto w-36 sm:w-44">
              <span aria-hidden="true" className="hero-aura" />
              <Mascot pose="confused" alt="" className="relative w-full" />
            </div>
            <div className="relative">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-lime">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
                </span>
                Next drop
              </p>
              <h2 className="font-display mt-3 text-4xl leading-none text-white sm:text-5xl">What's next?</h2>
              <p className="mt-4 max-w-md leading-7 text-muted">
                We're picking the date for our next open CTF. Follow along to hear the moment registrations open.
              </p>
              <UnknownDate reduce={reduce} />
            </div>
            <div className="relative flex flex-col gap-3 sm:flex-row md:col-span-2 lg:col-span-1 lg:flex-col">
              <a href="https://instagram.com/nulloriginctf" target="_blank" rel="noopener noreferrer" className="btn btn-lime">
                <Instagram size={17} /> Follow on Instagram
              </a>
              <a href="https://ctf.cyberhx.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Practice challenges
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══ Host one ═════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-24 sm:px-6 sm:pb-32 sm:pt-32 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease }}
          className="relative isolate overflow-hidden rounded-[32px] border border-white/10 bg-[#081022] px-6 pt-12 sm:px-12 sm:pt-16 lg:px-16"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="ev-drift absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lime/[0.16] blur-[110px]" />
            <div className="ev-drift absolute -bottom-32 left-10 h-96 w-[30rem] rounded-full bg-[#3bd3ff]/[0.14] blur-[110px] [animation-delay:-5s]" />
            <div className="ev-grid absolute inset-0" />
          </div>
          <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto] lg:gap-10">
            <div className="pb-2 lg:pb-16">
              <h2 className="font-display max-w-[16ch] text-4xl leading-[1.02] text-white sm:text-5xl">Want one of these for your college?</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
                Build your own CTF challenge by challenge. Hosting and the live scoreboard start at ${builderPricing.hosting.usd}.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link to="/host-your-ctf#build" className="btn btn-lime group">
                  Build your CTF <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link to="/host-your-ctf#prebuilt" className="btn btn-ghost">
                  See prebuilt CTFs
                </Link>
              </div>
            </div>
            <Mascot pose="point" alt="" className="mx-auto -mb-2 w-48 sm:w-56 lg:w-64" />
          </div>
        </motion.div>
      </section>

      <AnimatePresence>
        {open !== null && events[open] && (
          <EventDialog key={events[open].id} event={events[open]} index={open} onClose={() => setOpen(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
