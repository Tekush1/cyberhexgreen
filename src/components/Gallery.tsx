import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { ArrowRight, Instagram, Sparkles } from 'lucide-react';
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

/** A headline line that slides up from behind a mask. */
const Line = ({ children, delay, reduce }: { children: ReactNode; delay: number; reduce: boolean }) => (
  <span className="block overflow-hidden pb-[0.08em]">
    <motion.span
      className="block"
      initial={reduce ? false : { y: '110%' }}
      animate={{ y: '0%' }}
      transition={{ duration: 1, delay, ease }}
    >
      {children}
    </motion.span>
  </span>
);

export const Gallery = () => {
  const reduce = !!useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);
  const categories = allCategories(events);

  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 70%', 'end 70%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });

  return (
    <div className="min-h-screen bg-white text-ink">
      {/* ═══ Header ═══════════════════════════════════════════ */}
      <header className="relative isolate overflow-hidden bg-[#f4f6f1] pt-28 sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-lime/25 blur-[120px]" />
          <div className="absolute -right-24 top-10 h-[26rem] w-[26rem] rounded-full bg-lime/15 blur-[120px]" />
          <div className="ev-dots-light absolute inset-0" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10 lg:px-8">
          <div>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/70 shadow-sm"
            >
              <Sparkles size={13} className="text-[#7a9a00]" />
              Events archive
            </motion.p>

            <h1 className="font-display mt-6 text-[3rem] leading-[0.95] text-ink sm:text-7xl lg:text-[5.2rem]">
              <Line delay={0.1} reduce={reduce}>
                Every CTF
              </Line>
              <Line delay={0.22} reduce={reduce}>
                <span className="relative inline-block">
                  we've run.
                  <span aria-hidden="true" className="absolute -bottom-1 left-0 -z-10 h-[0.42em] w-full -rotate-1 rounded-sm bg-lime/70" />
                </span>
              </Line>
            </h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.42, ease }}
              className="mt-6 max-w-lg text-lg leading-8 text-ink/55"
            >
              Leaderboards, certificates and photos from each event. Tap any one to open it.
            </motion.p>

            <motion.dl
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.56, ease }}
              className="mt-9 grid max-w-xl grid-cols-3 gap-2.5 sm:gap-3"
            >
              {stats.map((st) => (
                <div key={st.label} className="rounded-2xl border border-black/[0.07] bg-white px-3.5 py-3.5 shadow-sm sm:px-4 sm:py-4">
                  <dt className="font-display text-[1.5rem] leading-none text-ink sm:text-3xl">
                    <CountUp to={st.to} prefix={st.prefix} suffix={st.suffix} decimals={st.decimals} />
                  </dt>
                  <dd className="mt-2 text-[11.5px] leading-4 text-ink/50 sm:text-xs">{st.label}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* mascot on a soft lime glow */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.3, ease }}
            className="relative mx-auto flex h-[15rem] w-full max-w-xs items-end justify-center sm:h-[20rem] lg:h-[25rem]"
          >
            <div aria-hidden="true" className="absolute bottom-6 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-lime/40 blur-[70px] sm:h-64 sm:w-64" />
            <div aria-hidden="true" className="absolute bottom-7 left-1/2 h-3 w-40 -translate-x-1/2 rounded-[50%] bg-black/10 blur-md" />
            <div className={reduce ? 'relative' : 'hero-breathe relative'}>
              <Mascot pose="cheer" still eager alt="CyberHx mascot cheering" className="h-[14rem] w-auto sm:h-[19rem] lg:h-[23rem]" />
            </div>
          </motion.div>
        </div>

        {/* category ribbon */}
        <div className="relative mt-14 border-y border-black/[0.07] bg-white/60 py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] sm:mt-20 sm:py-5">
          <div className="marquee" aria-hidden="true">
            {[...categories, ...categories].map((c, i) => (
              <span key={i} className="flex items-center gap-6 whitespace-nowrap px-6 font-display text-2xl text-ink/80 sm:text-[2rem]">
                {c}
                <span className="text-base text-[#7a9a00]">✦</span>
              </span>
            ))}
          </div>
          <p className="sr-only">Categories across our events: {categories.join(', ')}.</p>
        </div>
      </header>

      {/* ═══ Archive ══════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-6xl px-5 pt-20 sm:px-6 sm:pt-28 lg:px-8" aria-labelledby="archive-title">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease }}
          className="flex items-end justify-between gap-6"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7a9a00]">The archive</p>
            <h2 id="archive-title" className="font-display mt-3 text-4xl leading-[1] text-ink sm:text-5xl">
              Newest first.
            </h2>
          </div>
          <p className="pb-1 font-mono text-sm text-ink/45">
            <span className="text-ink">{pad2(events.length)}</span> events
          </p>
        </motion.div>

        <div ref={listRef} className="relative mt-12 sm:mt-16">
          {/* rail + scroll progress */}
          <div aria-hidden="true" className="absolute bottom-0 left-[7px] top-2 w-px bg-black/10 md:left-[9rem]" />
          <motion.div
            aria-hidden="true"
            style={{ scaleY: reduce ? 1 : progress }}
            className="absolute bottom-0 left-[7px] top-2 w-px origin-top bg-lime md:left-[9rem]"
          />

          <ol className="space-y-14 sm:space-y-20">
            {events.map((e, i) => {
              const dp = dateParts(e.date);
              return (
                <li key={e.id} className="relative grid pl-9 md:grid-cols-[9rem_1fr] md:pl-0">
                  <motion.span
                    aria-hidden="true"
                    initial={reduce ? false : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: '-120px' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                    className="absolute left-0 top-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-full bg-white ring-2 ring-lime md:left-[calc(9rem-7px)]"
                  >
                    <span className="h-[7px] w-[7px] rounded-full bg-lime" />
                  </motion.span>

                  <motion.div
                    initial={reduce ? false : { opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8, ease }}
                    className="mb-4 flex items-baseline gap-2 md:sticky md:top-28 md:mb-0 md:block md:self-start md:pr-9 md:text-right"
                  >
                    <p className="font-display text-2xl leading-none text-ink md:text-[2.1rem]">{dp.month}</p>
                    <p className="font-mono text-xs text-ink/45 md:mt-2">
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
          className="relative grid items-center gap-8 overflow-hidden rounded-[28px] border border-black/[0.07] bg-[#f4f6f1] p-6 shadow-sm sm:p-10 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] lg:gap-12"
        >
          <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lime/25 blur-[90px]" />
          <div className="relative mx-auto w-36 sm:w-44">
            <Mascot pose="confused" alt="" className="relative w-full" />
          </div>
          <div className="relative">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#7a9a00]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
              </span>
              Next drop
            </p>
            <h2 className="font-display mt-3 text-4xl leading-none text-ink sm:text-5xl">What's next?</h2>
            <p className="mt-4 max-w-md leading-7 text-ink/55">
              We're picking the date for our next open CTF. Follow along to hear the moment registrations open.
            </p>
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-black/10 bg-white px-4 py-2 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-ink/70">Date — to be announced</span>
            </div>
          </div>
          <div className="relative flex flex-col gap-3 sm:flex-row md:col-span-2 lg:col-span-1 lg:flex-col">
            <a href="https://instagram.com/nulloriginctf" target="_blank" rel="noopener noreferrer" className="btn-light-lime">
              <Instagram size={17} /> Follow on Instagram
            </a>
            <a href="https://ctf.cyberhx.com" target="_blank" rel="noopener noreferrer" className="btn-light-ghost">
              Practice challenges
            </a>
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
          className="relative isolate overflow-hidden rounded-[32px] bg-ink px-6 pt-12 sm:px-12 sm:pt-16 lg:px-16"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lime/20 blur-[110px]" />
            <div className="absolute -bottom-32 left-10 h-96 w-[30rem] rounded-full bg-glow/15 blur-[110px]" />
          </div>
          <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto] lg:gap-10">
            <div className="pb-2 lg:pb-16">
              <h2 className="font-display max-w-[16ch] text-4xl leading-[1.02] text-white sm:text-5xl">
                Want one of these for your college?
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/60">
                Build your own CTF challenge by challenge. Hosting and the live scoreboard start at ${builderPricing.hosting.usd}.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link to="/host-your-ctf#packages" className="btn btn-lime group">
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
