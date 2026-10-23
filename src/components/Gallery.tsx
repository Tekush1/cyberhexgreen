import { useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { entryLabel, events, hasCount, playersText } from '../data/events';
import { stats } from '../data/stats';
import { builderPricing } from '../data/hosting';
import { Mascot } from './shared/Mascot';
import { CountUp } from './shared/CountUp';
import { EventArchive } from './gallery/EventArchive';
import { EventDialog } from './gallery/EventDialog';
import { allCategories, dateParts, pad2 } from './gallery/eventStyle';

const ease = [0.16, 1, 0.3, 1] as const;

// Sparks rising around the mascot (same look as the home hero).
const SPARKS = [
  { x: '14%', d: '0s', dur: '5.2s', drift: '-14px' },
  { x: '30%', d: '1.7s', dur: '4.6s', drift: '10px', lime: true },
  { x: '46%', d: '3.1s', dur: '5.8s', drift: '-8px' },
  { x: '63%', d: '0.9s', dur: '4.9s', drift: '12px' },
  { x: '78%', d: '2.4s', dur: '5.4s', drift: '-10px', lime: true },
  { x: '88%', d: '4s', dur: '4.4s', drift: '8px' },
];

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

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* ═══ Hero: the arena ═══════════════════════════════════ */}
      <header className="relative isolate overflow-hidden bg-[#05080f] pb-10 pt-28 sm:pt-32 lg:flex lg:min-h-[min(100svh,860px)] lg:flex-col lg:justify-center lg:pb-0">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[62%] top-[34%] h-[36rem] w-[60rem] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(59,211,255,0.20),rgba(59,211,255,0.05)_55%,transparent)]" />
          <div className="absolute -left-40 top-10 h-[30rem] w-[30rem] rounded-full bg-lime/[0.07] blur-[140px]" />
          <motion.div
            initial={reduce ? false : { opacity: 0, rotateX: 78 }}
            animate={{ opacity: 1, rotateX: 64 }}
            transition={{ duration: 1.6, ease }}
            style={{ transformPerspective: 1200 }}
            className="arena-floor absolute -left-1/2 bottom-0 h-[170%] w-[200%] origin-bottom"
          />
          <div className="ev-scan absolute inset-x-0 top-0 h-40" />
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#05080f] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
        </div>

        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-6 lg:px-8">
          <div className="relative z-10">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
              </span>
              Events archive · {pad2(events.length)} CTFs and counting
            </motion.p>

            <h1 className="font-display mt-6 text-[3rem] leading-[0.95] sm:text-7xl lg:text-[5.4rem]">
              <Line delay={0.1} reduce={reduce}>
                Every CTF
              </Line>
              <Line delay={0.22} reduce={reduce}>
                <span className="bg-gradient-to-r from-glow via-[#8ff0ff] to-lime bg-clip-text text-transparent">we've run.</span>
              </Line>
            </h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.42, ease }}
              className="mt-6 max-w-lg text-lg leading-8 text-white/60"
            >
              Leaderboards, certificates and the story of every capture-the-flag we've hosted, from the first flag to the last solve.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.52, ease }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <a href="#archive" className="btn btn-lime group">
                Explore the archive <ArrowDown size={17} className="transition-transform group-hover:translate-y-0.5" />
              </a>
              <Link to="/host-your-ctf#packages" className="btn btn-ghost">
                Host your own CTF
              </Link>
            </motion.div>

            <motion.dl
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.64, ease }}
              className="mt-12 grid max-w-xl grid-cols-3 gap-2.5 sm:gap-3"
            >
              {stats.map((st) => (
                <div key={st.label} className="card-ob rounded-2xl px-3.5 py-3.5 sm:px-4 sm:py-4">
                  <dt className="font-display text-[1.5rem] leading-none sm:text-3xl">
                    <CountUp to={st.to} prefix={st.prefix} suffix={st.suffix} decimals={st.decimals} />
                  </dt>
                  <dd className="mt-2 text-[11.5px] leading-4 text-white/50 sm:text-xs">{st.label}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* stage: mascot on the portal, with the latest events floating around it */}
          <div className="relative mx-auto h-[20rem] w-full max-w-[30rem] sm:h-[28rem] lg:h-[36rem] lg:max-w-none">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 60, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.3, delay: 0.3, ease }}
              className="absolute inset-x-0 bottom-[6%] flex justify-center"
            >
              <div className="relative">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <span className="hero-aura" />
                  <span className="hero-aura hero-aura-lime" />
                  <span className="hero-portal-anchor">
                    <span className="hero-portal" />
                    <span className="hero-portal hero-portal-wave" />
                    <span className="hero-portal hero-portal-wave [animation-delay:1.6s]" />
                  </span>
                  {SPARKS.map((sp, i) => (
                    <span
                      key={i}
                      className={`hero-spark ${sp.lime ? 'is-lime' : ''}`}
                      style={{ '--x': sp.x, '--d': sp.d, '--dur': sp.dur, '--drift': sp.drift } as CSSProperties}
                    />
                  ))}
                </div>
                <div className={reduce ? 'relative' : 'hero-breathe relative'}>
                  <Mascot pose="cheer" still eager alt="CyberHx mascot cheering" className="h-[15rem] w-auto sm:h-[21rem] lg:h-[27rem]" />
                </div>
              </div>
            </motion.div>

            {events.slice(0, 2).map((e, i) => (
              <motion.a
                key={e.id}
                href={`#event-${e.id}`}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.1 + i * 0.18, ease }}
                className={`ev-ticket group absolute hidden sm:flex ${i === 0 ? 'left-0 top-[8%] lg:-left-4' : 'bottom-[22%] right-0 lg:-right-2'}`}
                style={{ animationDelay: `${i * 1.4}s` }}
              >
                <span className={`ev-ticket-art ${i === 0 ? '' : 'is-cyan'}`}>
                  <img src={e.image} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                    {e.status !== 'completed' ? 'Next' : i === 0 ? 'Latest' : 'Previous'} · {dateParts(e.date).month} {dateParts(e.date).year}
                  </span>
                  <span className="mt-0.5 block truncate font-display text-[15px] text-white group-hover:text-lime">{e.title}</span>
                  <span className={`mt-0.5 block font-mono text-xs ${i === 0 ? 'text-lime' : 'text-glow'}`}>{hasCount(e) ? playersText(e) : [entryLabel(e), e.shortDate].filter(Boolean).join(' · ') || 'Registrations open'}</span>
                </span>
              </motion.a>
            ))}
          </div>
        </div>

        {/* category ribbon */}
        <div className="relative mt-10 border-y border-white/[0.07] bg-white/[0.02] py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] sm:py-5 lg:mt-6">
          <div className="marquee" aria-hidden="true">
            {[...categories, ...categories].map((c, i) => (
              <span key={i} className="flex items-center gap-6 whitespace-nowrap px-6 font-display text-2xl text-white/70 sm:text-[2rem]">
                {c}
                <span className="text-base text-lime">✦</span>
              </span>
            ))}
          </div>
          <p className="sr-only">Categories across our events: {categories.join(', ')}.</p>
        </div>
      </header>

      {/* ═══ Archive: scoreboard + glowing timeline (dark band) ═══ */}
      <div id="archive" className="scroll-mt-16">
        <EventArchive events={events} onOpen={setOpen} />
      </div>

      {/* ═══ What's next ══════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-6 sm:pt-28 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease }}
          className="relative grid items-center gap-8 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0b1020] p-6 shadow-sm sm:p-10 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] lg:gap-12"
        >
          <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lime/25 blur-[90px]" />
          <div className="relative mx-auto w-36 sm:w-44">
            <Mascot pose="confused" alt="" className="relative w-full" />
          </div>
          <div className="relative">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-lime">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
              </span>
              Next drop
            </p>
            <h2 className="font-display mt-3 text-4xl leading-none text-white sm:text-5xl">What's next?</h2>
            <p className="mt-4 max-w-md leading-7 text-white/55">
              We're picking the date for our next open CTF. Follow along to hear the moment registrations open.
            </p>
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/70">Date — to be announced</span>
            </div>
          </div>
          <div className="relative flex flex-col gap-3 sm:flex-row md:col-span-2 lg:col-span-1 lg:flex-col">
            <a href="https://instagram.com/nulloriginctf" target="_blank" rel="noopener noreferrer" className="btn btn-lime">
              <Instagram size={17} /> Follow on Instagram
            </a>
            <a href="https://ctf.cyberhx.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
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
                Want one of these for your organization?
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/60">
                Build your own CTF challenge by challenge. Hosting and the live scoreboard start at ${builderPricing.hosting.usd}.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link to="/host-your-ctf#packages" className="btn btn-lime group">
                  Build your CTF <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link to="/host-your-ctf#compare" className="btn btn-ghost">
                  Compare packages
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
