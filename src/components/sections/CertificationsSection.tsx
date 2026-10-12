import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { certifications, type Cert } from '../../data/pentest';
import { Local } from '../shared/Local';

const ease = [0.2, 0.8, 0.2, 1] as const;

type ScreenCopy = {
  kicker: string;
  heading: [string, string];
  fullName: string;
  meta: string[];
  body: string;
  steps: { title: string; text: string }[];
  ghost: string;
  cta: string;
  long?: boolean;
};

const copy: Record<Cert['code'], ScreenCopy> = {
  CPPT: {
    kicker: 'THE FLAGSHIP · SPIRIT OF THE FALCON',
    heading: ['Break In Like', 'a Professional.'],
    fullName: 'Certified Professional Penetration Tester',
    meta: ['Professional · Level 02', 'Difficulty: Medium–Hard'],
    body: 'CPPT is a professional penetration-testing certification focused on independent security assessment, vulnerability validation, and practical exploitation.',
    steps: [
      { title: 'Advanced Recon & Enumeration', text: 'Map the attack surface and identify potential entry points.' },
      { title: 'Advanced Web & API Security', text: 'Investigate vulnerabilities, authorization flaws, and attack paths.' },
      { title: 'Privilege Escalation & Attack Chaining', text: 'Validate impact and document findings professionally.' },
    ],
    ghost: 'PRO',
    cta: 'Get CPPT',
  },
  CAPT: {
    kicker: 'THE FLAGSHIP · SPIRIT OF THE WOLF',
    heading: ['Master the Fundamentals.', 'Hunt the Weakness.'],
    fullName: 'Certified Associate Penetration Tester',
    meta: ['Associate · Level 01'],
    body: 'CAPT is an associate-level penetration-testing certification focused on building practical skills in reconnaissance, vulnerability assessment, web security, network testing, and exploitation fundamentals.',
    steps: [
      { title: 'Recon & Enumeration', text: 'Discover assets, map services, and identify potential weaknesses.' },
      { title: 'Web & Network Security', text: 'Investigate common vulnerabilities and validate findings in authorized labs.' },
      { title: 'Exploitation Fundamentals', text: 'Learn controlled testing, evidence collection, and professional reporting.' },
    ],
    ghost: 'WOLF',
    cta: 'Get CAPT',
    long: true,
  },
};

// Rising sparks: [left %, top %, delay s]
const sparks: [number, number, number][] = [[6, 80, 0], [18, 92, -2], [34, 70, -4], [52, 88, -1], [66, 76, -5], [78, 95, -3], [90, 72, -6]];

function CertScreen({ cert, tone, mirrored, pinned }: { cert: Cert; tone: 'lime' | 'cyan'; mirrored?: boolean; pinned?: boolean }) {
  const reduce = useReducedMotion();
  const c = copy[cert.code];
  const accent = tone === 'lime' ? 'text-lime' : 'text-glow';

  const rise = (delay = 0, y = 28) => ({
    initial: reduce || pinned ? false : { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.8, delay, ease },
  });

  return (
    <div className={`cx-scr cx-scr-${tone} ${mirrored ? 'cx-scr-mirror' : ''} ${pinned ? 'cx-scr-pinned' : ''} relative overflow-hidden`}>
      {/* Realm background + spirit */}
      <div className="cx-ed-realm" aria-hidden="true">
        <img src={cert.mascot} alt="" draggable={false} className="cx-scr-spirit pointer-events-none absolute select-none" />
      </div>
      <div className="cx-ed-ghost pointer-events-none absolute select-none" aria-hidden="true">
        {c.ghost}
      </div>
      {sparks.map(([l, t, d], i) => (
        <span
          key={i}
          className={`cx-spark ${tone === 'cyan' ? 'cx-spark-c' : ''}`}
          style={{ left: `${mirrored ? 100 - l : l}%`, top: `${t}%`, animationDelay: `${d}s` }}
          aria-hidden="true"
        />
      ))}

      <div
        className={`cx-scr-grid relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 sm:px-6 lg:gap-10 lg:px-8 lg:pb-28 ${
          pinned
            ? `cx-scr-pgrid ${mirrored ? 'lg:grid-cols-[1.08fr_0.92fr]' : 'lg:grid-cols-[0.92fr_1.08fr]'}`
            : mirrored
              ? 'pt-[calc(5rem+4vw)] lg:grid-cols-[1.08fr_0.92fr] lg:pt-[calc(7rem+4vw)]'
              : 'pt-24 sm:pt-28 lg:grid-cols-[0.92fr_1.08fr] lg:pt-32'
        }`}
      >
        {/* Badge stage */}
        <motion.div {...rise(0.1, 40)} className={`cx-ed-hw relative mx-auto aspect-square w-full max-w-[34rem] cx-scr-stage ${mirrored ? 'lg:order-2' : ''}`}>
          <div className="cx-ed-halo absolute inset-[10%] rounded-full" aria-hidden="true" />
          <div className="cx-ed-orbit absolute inset-[4%] rounded-full" aria-hidden="true" />
          <div className="cx-ed-orbit cx-ed-orbit-b absolute -inset-[4%] rounded-full" aria-hidden="true" />
          <img
            src={cert.badge}
            alt={`CyberHx ${cert.code} — ${cert.title} badge`}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="cx-ed-hero absolute inset-[13%] h-[74%] w-[74%] select-none object-contain"
          />
        </motion.div>

        {/* Copy */}
        <div className={`relative min-w-0 ${mirrored ? 'lg:order-1' : ''}`}>
          <motion.p {...rise(0)} className={`font-mono text-xs tracking-[0.2em] sm:text-[13px] ${accent}`}>
            {c.kicker}
          </motion.p>
          <motion.p {...rise(0.04, 12)} className="cx-scr-meta mt-2.5 text-sm font-medium text-[#f4f4f0]/55">
            {c.meta.join('  ·  ')}
          </motion.p>
          <motion.h2
            {...rise(0.08)}
            className={`font-display mt-5 leading-[0.93] tracking-[-0.04em] text-[#f4f4f0] ${
              c.long
                ? 'text-[2.15rem] sm:text-6xl lg:whitespace-nowrap lg:text-[2.3rem] xl:text-[2.6rem]'
                : 'text-[2.6rem] sm:text-7xl lg:whitespace-nowrap lg:text-[3.5rem] xl:text-[4rem]'
            }`}
          >
            <span className="block">{c.heading[0]}</span>
            <span className="block">{c.heading[1]}</span>
          </motion.h2>
          <motion.p {...rise(0.12, 14)} className="cx-scr-full mt-3 text-[15px] font-semibold text-[#f4f4f0]/75">
            {c.fullName}
          </motion.p>
          <motion.p {...rise(0.16)} className="cx-scr-body mt-4 max-w-lg text-[17px] leading-7 text-[#f4f4f0]/60">
            {c.body}
          </motion.p>

          <div className="cx-scr-steps mt-6 flex flex-col gap-3.5">
            {c.steps.map((s, i) => (
              <motion.div key={s.title} {...rise(0.22 + i * 0.07, 14)} className="cx-ed-step flex items-baseline gap-5">
                <span className={`font-mono text-[13px] ${accent}`}>0{i + 1}</span>
                <span>
                  <span className="block text-[17px] font-semibold text-[#f4f4f0]/95">{s.title}</span>
                  <span className="cx-scr-stepd block text-[15px] leading-6 text-[#f4f4f0]/55">{s.text}</span>
                </span>
              </motion.div>
            ))}
          </div>

          <motion.div {...rise(0.45)}>
            <div className="cx-scr-rule my-7 h-px bg-white/[0.12]" />
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-[13px] tracking-[0.2em] text-[#f4f4f0]/45">ONE-TIME</p>
                <p className={`font-display mt-1.5 text-7xl leading-none tracking-[-0.035em] sm:text-[5rem] ${tone === 'cyan' ? 'text-glow' : 'text-[#f4f4f0]'}`}>
                  ${cert.usd}
                </p>
                <Local usd={cert.usd} className="mt-2 block text-sm text-[#f4f4f0]/45" />
              </div>
              <a
                href={cert.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`cx-ed-cta group relative overflow-hidden ${tone === 'cyan' ? 'cx-ed-cta-cyan' : ''}`}
              >
                {c.cta}
                <ArrowRight size={19} strokeWidth={2.6} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/** CPPT screen pins; scrolling wipes the CAPT screen up over it along a diagonal edge. */
export const CertificationsSection = () => {
  const reduce = useReducedMotion();
  const capt = certifications.find((c) => c.code === 'CAPT')!;
  const cppt = certifications.find((c) => c.code === 'CPPT')!;
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  const p = useTransform(scrollYProgress, [0.08, 0.92], [0, 1]);
  const clipPath = useTransform(p, (v) => {
    const e = v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
    const y = 100 - e * 112;
    return `polygon(0 ${y + 8}%, 100% ${y}%, 100% 100%, 0 100%)`;
  });
  const backScale = useTransform(p, [0, 1], [1, 0.92]);
  const backFilter = useTransform(p, (v) => `brightness(${1 - 0.55 * v})`);

  if (reduce) {
    return (
      <section id="certifications" className="cx-ed relative scroll-mt-20 overflow-hidden border-t border-white/[0.06]">
        <CertScreen cert={cppt} tone="lime" />
        <CertScreen cert={capt} tone="cyan" mirrored />
      </section>
    );
  }

  return (
    <section id="certifications" className="cx-ed relative scroll-mt-20 border-t border-white/[0.06]">
      <div ref={track} className="cx-wipe relative" style={{ height: '260vh' }}>
        <div className="cx-wipe-sticky sticky top-0 overflow-hidden">
          <motion.div className="absolute inset-0" style={{ scale: backScale, filter: backFilter }}>
            <CertScreen cert={cppt} tone="lime" pinned />
          </motion.div>
          <motion.div className="absolute inset-0" style={{ clipPath }}>
            <CertScreen cert={capt} tone="cyan" mirrored pinned />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CertificationsSection;
