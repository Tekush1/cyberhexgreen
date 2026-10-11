import { useRef, type PointerEvent } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Crown,
  FlaskConical,
  Infinity as InfinityIcon,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { certifications, type Cert } from '../../data/pentest';
import { CertBadge } from '../shared/CertBadge';
import { Local } from '../shared/Local';

const ease = [0.2, 0.8, 0.2, 1] as const;

/* ---------- Badge showcase (top row) ---------- */

function ShowcaseBadge({ cert, index }: { cert: Cert; index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.a
      href="#cert-plans"
      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay: 0.15 + index * 0.15, ease }}
      className={`cb-show cb-${cert.tone} group relative flex flex-col items-center outline-none`}
    >
      <div className="cb-show-float relative" style={{ animationDelay: `${index * -3}s` }}>
        <div className="cb-show-glow pointer-events-none absolute inset-[12%] rounded-full" aria-hidden="true" />
        <CertBadge
          code={cert.code}
          tone={cert.tone}
          emblem={cert.emblem}
          title={`CyberHx ${cert.code} — ${cert.title}`}
          className="cb-show-svg relative w-[9.5rem] sm:w-[12.5rem] lg:w-[14rem]"
        />
      </div>
      <div className="mt-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">{cert.level}</p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-semibold text-white transition-colors group-hover:border-white/25">
          {cert.code}
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span className={cert.tone === 'lime' ? 'text-lime' : 'text-glow'}>${cert.usd}</span>
        </p>
      </div>
    </motion.a>
  );
}

/* ---------- Plan cards ---------- */

function CertCard({ cert, index }: { cert: Cert; index: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 150, damping: 18 });
  const sy = useSpring(py, { stiffness: 150, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-5, 5]);
  const rotateX = useTransform(sy, [0, 1], [4, -4]);
  const gx = useTransform(sx, (v) => `${v * 100}%`);
  const gy = useTransform(sy, (v) => `${v * 100}%`);
  const accent = cert.tone === 'lime' ? '198,241,53' : '59,211,255';
  const spot = useMotionTemplate`radial-gradient(480px circle at ${gx} ${gy}, rgba(${accent},0.12), transparent 45%)`;

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
  const toneText = cert.tone === 'lime' ? 'text-lime' : 'text-glow';

  return (
    <motion.div
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{
        hidden: { opacity: 0, y: 50 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, delay: index * 0.15, ease, staggerChildren: 0.07, delayChildren: 0.3 + index * 0.15 },
        },
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
        className={`group cert-card cb-${cert.tone} ${f ? 'cert-card-featured' : ''} relative h-full rounded-[28px]`}
      >
        <div className="cert-card-inner relative flex h-full flex-col overflow-hidden rounded-[27px] p-6 sm:p-8">
          {!reduce && (
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: spot }}
            />
          )}
          <div className="cert-sweep pointer-events-none absolute inset-0" aria-hidden="true" />

          {/* Header */}
          <div className="relative flex items-start gap-5">
            <CertBadge
              code={cert.code}
              tone={cert.tone}
              emblem={cert.emblem}
              className="cb-card-svg w-[5.5rem] shrink-0 sm:w-24"
            />
            <div className="min-w-0 pt-1">
              <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${toneText}`}>{cert.level}</span>
              <h3 className="font-display mt-2 text-4xl text-white sm:text-[2.6rem]">
                <span className="cert-code-text">{cert.code}</span>
              </h3>
              <p className="mt-2 font-semibold leading-snug text-white/85">{cert.title}</p>
            </div>
          </div>
          <p className="relative mt-5 text-muted">{cert.tagline}</p>

          {/* Price */}
          <div className="relative mt-6 flex items-end justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
            <div>
              <div className="flex items-start">
                <span className={`mt-2 font-display text-2xl ${toneText}`}>$</span>
                <span className="font-display text-7xl leading-none text-white">{cert.usd}</span>
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
                <span className="cb-check mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110">
                  <Check size={12} strokeWidth={3.2} />
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
            <BadgeCheck size={14} className={toneText} /> Verify anytime at <span className="text-white/60">creds.cyberhx.com</span>
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
    <section id="certifications" className="cert-section relative scroll-mt-20 overflow-hidden border-t border-white/[0.06] py-24 sm:py-32">
      <div className="cert-bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="text-sm font-semibold uppercase tracking-[0.24em] text-lime"
          >
            CyberHx Certifications
          </motion.p>
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
            className="font-display mt-5 text-4xl leading-[1.04] text-white sm:text-6xl"
          >
            Hands-on exams.
            <span className="cert-headline-grad block">Real-world proof.</span>
          </motion.h2>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.16, ease }}
            className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted"
          >
            Train on the CyberHx Pentest Lab, then earn a credential anyone can verify. Start at Associate, level up
            to Professional.
          </motion.p>
        </div>

        {/* Badge showcase */}
        <div className="relative mx-auto mt-16 flex max-w-3xl items-start justify-center gap-6 sm:gap-10">
          <ShowcaseBadge cert={capt} index={0} />

          <motion.div
            initial={reduce ? false : { opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
            className="relative mt-[4.6rem] hidden w-36 origin-left sm:mt-[6rem] sm:block lg:mt-[6.8rem] lg:w-56"
            aria-hidden="true"
          >
            <div className="cb-path h-px w-full" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-ink px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/55">
              Level up
            </span>
          </motion.div>

          <ShowcaseBadge cert={cppt} index={1} />
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6, ease }}
          className="mt-12 flex justify-center"
        >
          <a href="#cert-plans" className="cb-pill group inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-[0.95rem] font-semibold text-ink">
            Compare both certifications
            <ChevronDown size={18} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-y-0.5" />
          </a>
        </motion.div>

        {/* Plans */}
        <div id="cert-plans" className="relative mt-24 grid scroll-mt-28 items-stretch gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
          <CertCard cert={capt} index={0} />
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
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime/10 ring-1 ring-lime/25 transition-all duration-300 group-hover:rotate-[8deg] group-hover:scale-110 group-hover:bg-lime">
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
