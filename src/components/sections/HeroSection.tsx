import { type CSSProperties, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Mascot } from '../shared/Mascot';
import { CountUp } from '../shared/CountUp';
import { builderPricing } from '../../data/hosting';
import { stats } from '../../data/stats';
import { events } from '../../data/events';

/* ─────────────────────────────────────────────────────────────
   The Arena: a CTF stage. A perspective grid floor runs to a
   glowing horizon and the mascot plants its flag on it. The two
   floating cards show our real events, pulled from the events data.
   ───────────────────────────────────────────────────────────── */

// Sparks that drift up around the mascot. x = start position, d = delay, drift = sideways sway.
const SPARKS = [
  { x: '14%', d: '0s', dur: '5.2s', drift: '-14px' },
  { x: '28%', d: '1.7s', dur: '4.6s', drift: '10px', lime: true },
  { x: '42%', d: '3.1s', dur: '5.8s', drift: '-8px' },
  { x: '61%', d: '0.9s', dur: '4.9s', drift: '12px' },
  { x: '74%', d: '2.4s', dur: '5.4s', drift: '-10px', lime: true },
  { x: '86%', d: '4s', dur: '4.4s', drift: '8px' },
  { x: '50%', d: '4.6s', dur: '6s', drift: '-6px', lime: true },
];

const ease = [0.16, 1, 0.3, 1] as const;

export const HeroSection = () => {
  const reduce = !!useReducedMotion();
  const latest = events[0];

  /* pointer parallax */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const mascotX = useTransform(sx, (v) => v * -14);
  const mascotY = useTransform(sy, (v) => v * -8);
  const nearX = useTransform(sx, (v) => v * 22);
  const glowX = useTransform(sx, (v) => v * 30);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const rise = (delay: number, y = 26) =>
    reduce ? {} : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease } };

  return (
    <section
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative isolate overflow-hidden bg-ink pb-16 pt-24 sm:pb-20 sm:pt-28 lg:flex lg:min-h-[min(100svh,820px)] lg:flex-col lg:justify-center lg:pb-8"
    >
      {/* ── Backdrop ───────────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {/* horizon light */}
        <motion.div
          style={{ x: glowX }}
          className="absolute left-1/2 top-[38%] h-[34rem] w-[62rem] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(59,211,255,0.22),rgba(59,211,255,0.06)_55%,transparent)] lg:left-[64%]"
        />
        <div className="absolute left-[64%] top-[52%] hidden h-40 w-[40rem] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(198,241,53,0.12),transparent)] lg:block" />
        {/* perspective floor */}
        <motion.div
          initial={reduce ? false : { opacity: 0, rotateX: 78 }}
          animate={{ opacity: 1, rotateX: 64 }}
          transition={{ duration: 1.6, ease }}
          style={{ transformPerspective: 1200 }}
          className="arena-floor absolute -left-1/2 bottom-0 h-[180%] w-[200%] origin-bottom"
        />
        {/* top vignette + fine noise */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-ink to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-4 px-5 sm:gap-12 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-4 lg:px-8">
        {/* ── Copy ─────────────────────────────────────────── */}
        <div className="relative z-10">
          {latest && (
            <motion.div {...rise(0.05, 12)}>
              <Link
                to="/gallery"
                className="group inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/[0.1] bg-white/[0.04] py-1.5 pl-1.5 pr-4 text-sm text-white/80 backdrop-blur transition hover:border-white/25 hover:text-white"
              >
                <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-ink">New</span>
                <span className="truncate">
                  {latest.title}: {latest.participants.toLowerCase()} over {latest.duration.toLowerCase()}
                </span>
                <ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          )}

          <h1 className="font-display mt-7 text-[clamp(2.1rem,10.6vw,2.6rem)] leading-[0.98] tracking-[-0.01em] text-white sm:text-6xl lg:text-[3.7rem] xl:text-[4.25rem] lg:[&>span]:whitespace-nowrap">
            <span className="block overflow-hidden pb-1">
              <motion.span className="block" {...rise(0.15, 60)}>
                Hack our CTFs.
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-2">
              <motion.span
                className="block bg-gradient-to-r from-glow via-[#8ff0ff] to-lime bg-clip-text text-transparent"
                {...rise(0.27, 60)}
              >
                Host your own.
              </motion.span>
            </span>
          </h1>

          <motion.p {...rise(0.4)} className="mt-6 max-w-[34rem] text-lg leading-8 text-muted">
            CyberHx runs capture-the-flag events for the global security community, and builds them for universities and companies worldwide
            from ${builderPricing.hosting.usd} a round.
          </motion.p>

          <motion.div {...rise(0.5)} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link to="/host-your-ctf#packages" className="btn btn-red group">
              Build your CTF <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/gallery" className="btn btn-ghost">
              Play our CTFs
            </Link>
          </motion.div>

          <motion.dl {...rise(0.62)} className="mt-12 flex max-w-lg divide-x divide-white/[0.08] border-t border-white/[0.08] pt-6">
            {stats.map((s) => (
              <div key={s.label} className="flex-1 px-4 first:pl-0 last:pr-0">
                <dt className="font-display text-2xl text-white sm:text-[1.7rem]">
                  <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                </dt>
                <dd className="mt-1 text-xs leading-4 text-muted">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* ── Stage ────────────────────────────────────────── */}
        <div className="relative order-first mx-auto -mt-6 h-[17rem] w-full max-w-[30rem] sm:order-none sm:mt-0 sm:h-[30rem] sm:max-w-[34rem] lg:h-[38rem] lg:max-w-none">
          {/* ground shadow */}
          <motion.div
            aria-hidden="true"
            initial={reduce ? false : { opacity: 0, scaleX: 0.4 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 1.2, delay: 0.5, ease }}
            className="absolute bottom-[5%] left-1/2 h-10 w-[58%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(59,211,255,0.55),rgba(59,211,255,0.12)_60%,transparent)] blur-[2px]"
          />

          {/* mascot */}
          <motion.div style={{ x: mascotX, y: mascotY }} className="absolute inset-x-0 bottom-[7%] flex justify-center">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 70, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.3, delay: 0.35, ease }}
              className="relative"
            >
              {/* energy around the mascot: aura, spawn ring at the feet, rising sparks */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <span className="hero-aura" />
                <span className="hero-aura hero-aura-lime" />
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
                <Mascot pose="flag" still eager alt="CyberHx mascot planting a CTF flag" className="h-[16.5rem] w-auto sm:h-[23rem] lg:h-[31rem]" />
              </div>
            </motion.div>
          </motion.div>

          {/* build price chip */}
          <motion.div
            style={{ x: nearX }}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.2, ease }}
            className="absolute right-[4%] top-[4%] hidden sm:block lg:right-[6%] lg:top-[8%]"
          >
            <Link to="/host-your-ctf#packages" className="glass-card group flex items-center gap-3 px-3.5 py-2.5 transition hover:border-white/25">
              <span className="font-mono text-[11px] leading-4 text-white/55">
                your CTF
                <span className="block font-display text-lg leading-6 text-white">from ${builderPricing.hosting.usd}</span>
              </span>
              <ArrowUpRight size={16} className="text-lime transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
