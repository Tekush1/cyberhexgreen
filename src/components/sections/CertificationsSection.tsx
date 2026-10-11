import { useRef, type PointerEvent } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowRight, BadgeCheck, Check, Crown, FlaskConical, Infinity as InfinityIcon, Share2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { certifications, type Cert } from '../../data/pentest';
import { Local } from '../shared/Local';
import { Mascot } from '../shared/Mascot';

const ease = [0.2, 0.8, 0.2, 1] as const;

/** Two concentric hexagon rings that slowly counter-rotate behind a badge. */
const HexRings = ({ featured }: { featured?: boolean }) => (
  <svg viewBox="0 0 200 200" className="cert-rings pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
    <defs>
      <linearGradient id={`ring-${featured ? 'f' : 'n'}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c6f135" stopOpacity="0.9" />
        <stop offset="0.5" stopColor="#c6f135" stopOpacity="0.05" />
        <stop offset="1" stopColor={featured ? '#3bd3ff' : '#c6f135'} stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <g className="cert-ring-a" style={{ transformOrigin: '100px 100px' }}>
      <path d="M100 8 180 54v92l-80 46-80-46V54Z" fill="none" stroke={`url(#ring-${featured ? 'f' : 'n'})`} strokeWidth="1" strokeDasharray="4 6" />
    </g>
    <g className="cert-ring-b" style={{ transformOrigin: '100px 100px' }}>
      <path d="M100 24 166 62v76l-66 38-66-38V62Z" fill="none" stroke={`url(#ring-${featured ? 'f' : 'n'})`} strokeWidth="0.8" opacity="0.6" />
    </g>
  </svg>
);

function CertCard({ cert, index }: { cert: Cert; index: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 150, damping: 18 });
  const sy = useSpring(py, { stiffness: 150, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-7, 7]);
  const rotateX = useTransform(sy, [0, 1], [6, -6]);
  const badgeX = useTransform(sx, [0, 1], [-14, 14]);
  const badgeY = useTransform(sy, [0, 1], [-10, 10]);
  const gx = useTransform(sx, (v) => `${v * 100}%`);
  const gy = useTransform(sy, (v) => `${v * 100}%`);
  const spot = useMotionTemplate`radial-gradient(520px circle at ${gx} ${gy}, rgba(198,241,53,0.13), transparent 45%)`;

  const onMove = (e: PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const f = cert.featured;

  return (
    <motion.div
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{
        hidden: { opacity: 0, y: 50 },
        show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: index * 0.15, ease, staggerChildren: 0.08, delayChildren: 0.35 + index * 0.15 } },
      }}
      className="relative h-full"
      style={{ perspective: 1400 }}
    >
      {f && (
        <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2">
          <span className="cert-ribbon inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink">
            <Crown size={14} strokeWidth={2.5} /> Most popular
          </span>
        </div>
      )}

      <motion.div
        ref={ref}
        onPointerMove={reduce ? undefined : onMove}
        onPointerLeave={reduce ? undefined : onLeave}
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className={`group cert-card ${f ? 'cert-card-featured' : ''} relative h-full rounded-[28px]`}
      >
        <div className="cert-card-inner relative flex h-full flex-col overflow-hidden rounded-[27px] p-6 sm:p-8">
          {/* Pointer spotlight */}
          {!reduce && (
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: spot }}
            />
          )}
          {/* Fine hex texture */}
          <div className="cert-hex-texture pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden="true" />
          {/* Shine sweep */}
          <div className="cert-sweep pointer-events-none absolute inset-0" aria-hidden="true" />

          {/* Top row */}
          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/[0.07] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-lime">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
              </span>
              {cert.level}
            </span>
            <span className="font-mono text-xs text-white/35">CHX-{cert.code}</span>
          </div>

          {/* Badge stage */}
          <div className="relative mx-auto mt-6 aspect-square w-full max-w-[19rem]" style={{ transform: 'translateZ(40px)' }}>
            {/* Mascot watermark */}
            <img
              src={cert.mascot}
              alt=""
              aria-hidden="true"
              className="cert-mascot-ghost pointer-events-none absolute inset-0 m-auto w-[95%] select-none opacity-[0.08] blur-[1px] transition-all duration-700 group-hover:scale-110 group-hover:opacity-[0.16]"
              draggable={false}
            />
            <div className="cert-glow pointer-events-none absolute inset-[18%] rounded-full" aria-hidden="true" />
            <HexRings featured={f} />
            {/* Orbiting sparks */}
            <div className="cert-orbit pointer-events-none absolute inset-[4%]" aria-hidden="true">
              <span className="cert-spark" />
            </div>
            <div className="cert-orbit cert-orbit-rev pointer-events-none absolute inset-[12%]" aria-hidden="true">
              <span className="cert-spark cert-spark-cyan" />
            </div>
            <motion.img
              src={cert.badge}
              alt={`CyberHx ${cert.code} — ${cert.title} badge`}
              loading="lazy"
              decoding="async"
              draggable={false}
              style={reduce ? undefined : { x: badgeX, y: badgeY }}
              className="relative z-10 mx-auto h-full w-[78%] select-none object-contain"
            />
            <div className="cert-badge-shadow pointer-events-none absolute -bottom-2 left-1/2 h-6 w-1/2 -translate-x-1/2 rounded-full" aria-hidden="true" />
          </div>

          {/* Title */}
          <div className="relative mt-8">
            <h3 className="font-display text-5xl text-white sm:text-6xl">
              <span className="cert-code-text">{cert.code}</span>
            </h3>
            <p className="mt-3 text-lg font-semibold text-white/90">{cert.title}</p>
            <p className="mt-1 text-muted">{cert.tagline}</p>
          </div>

          {/* Price */}
          <div className="relative mt-7 flex items-end justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
            <div>
              <div className="flex items-start">
                <span className="mt-2 font-display text-2xl text-lime">$</span>
                <span className="cert-price font-display text-7xl leading-none text-white">
                  {cert.usd}
                </span>
              </div>
              <Local usd={cert.usd} className="mt-2 block text-sm text-muted" />
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-white/85">One-time</p>
              <p className="text-white/40">No subscription</p>
            </div>
          </div>

          {/* Includes */}
          <ul className="relative mt-7 flex-1 space-y-3.5">
            {cert.includes.map((item) => (
              <motion.li
                key={item}
                variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0, transition: { duration: 0.45, ease } } }}
                className="flex items-start gap-3 text-white/80"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/15 ring-1 ring-lime/40 transition-transform duration-300 group-hover:scale-110">
                  <Check size={12} strokeWidth={3.2} className="text-lime" />
                </span>
                {item}
              </motion.li>
            ))}
          </ul>

          {/* CTA */}
          <a
            href={cert.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`cert-cta group/cta relative mt-9 inline-flex min-h-[58px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-6 text-[1.02rem] font-bold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${
              f ? 'cert-cta-lime text-ink' : 'cert-cta-ghost text-white'
            }`}
          >
            <span className="relative z-10">Get {cert.code} for ${cert.usd}</span>
            <ArrowRight size={19} strokeWidth={2.6} className="relative z-10 transition-transform duration-300 group-hover/cta:translate-x-1.5" />
          </a>
          <p className="relative mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40">
            <BadgeCheck size={14} className="text-lime/70" /> Verify anytime at <span className="text-white/60">creds.cyberhx.com</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

const perks = [
  { icon: FlaskConical, title: 'Hands-on labs', text: 'Learn on real machines, not slides.' },
  { icon: ShieldCheck, title: 'Verifiable', text: 'Every credential checks out online.' },
  { icon: Share2, title: 'Shareable', text: 'Show it on LinkedIn and your CV.' },
  { icon: InfinityIcon, title: 'Pay once', text: 'One price. No renewals.' },
];

export const CertificationsSection = () => {
  const reduce = useReducedMotion();
  const [capt, cppt] = certifications;

  return (
    <section id="certifications" className="relative scroll-mt-20 overflow-hidden border-t border-white/[0.06] bg-ink py-24 sm:py-32">
      {/* Atmosphere */}
      <div className="cert-bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="orb left-[-12rem] top-20 h-[34rem] w-[34rem] bg-lime/[0.09]" aria-hidden="true" />
      <div className="orb right-[-14rem] bottom-0 h-[36rem] w-[36rem] bg-glow/[0.08]" style={{ animationDelay: '-6s' }} aria-hidden="true" />

      {/* Floating mascot marks at the edges */}
      <img src="/certs/wolf.webp" alt="" aria-hidden="true" draggable={false}
        className="cert-float-slow pointer-events-none absolute -left-10 top-[38%] hidden w-56 select-none opacity-[0.12] xl:block" />
      <img src="/certs/falcon.webp" alt="" aria-hidden="true" draggable={false}
        className="cert-float-slow pointer-events-none absolute -right-12 top-[18%] hidden w-64 select-none opacity-[0.12] xl:block"
        style={{ animationDelay: '-4s' }} />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="relative mx-auto max-w-3xl text-center">
          <Mascot
            pose="trophy"
            alt="CyberHx mascot holding a trophy"
            className="float-y absolute -top-6 right-[-1rem] hidden w-36 md:block lg:right-[-6rem] lg:w-44"
          />
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/[0.06] px-4 py-1.5 text-sm font-semibold text-lime shadow-[0_0_30px_-8px_rgba(198,241,53,0.5)]"
          >
            <Sparkles size={15} /> CyberHx Certifications
          </motion.span>
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
            className="font-display mt-6 text-4xl leading-[1.02] text-white sm:text-6xl"
          >
            Earn the badge.
            <span className="cert-headline-grad block">Own the skill.</span>
          </motion.h2>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.16, ease }}
            className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted"
          >
            Two hands-on penetration testing certifications, trained on the CyberHx Pentest Lab. Start at Associate,
            level up to Professional.
          </motion.p>
        </div>

        {/* Cards */}
        <div className="relative mt-20 grid items-stretch gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
          <CertCard cert={capt} index={0} />

          {/* Level-up connector */}
          <div className="pointer-events-none absolute left-1/2 top-[38%] z-30 hidden -translate-x-1/2 -translate-y-1/2 md:block" aria-hidden="true">
            <div className="cert-levelup flex h-14 w-14 items-center justify-center rounded-full border border-lime/40 bg-ink">
              <Zap size={22} className="fill-lime text-lime" />
            </div>
          </div>

          <CertCard cert={cppt} index={1} />
        </div>

        {/* Perks */}
        <motion.div
          initial={reduce ? false : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {perks.map((p) => (
            <motion.div
              key={p.title}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }}
              className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-lime/30 hover:bg-lime/[0.04]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime/10 ring-1 ring-lime/25 transition-all duration-300 group-hover:rotate-[8deg] group-hover:scale-110 group-hover:bg-lime group-hover:text-ink">
                <p.icon size={20} className="text-lime transition-colors group-hover:text-ink" />
              </span>
              <div>
                <p className="font-semibold text-white">{p.title}</p>
                <p className="text-sm text-muted">{p.text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default CertificationsSection;
