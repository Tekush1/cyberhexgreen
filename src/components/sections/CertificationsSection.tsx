import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { certifications, type Cert } from '../../data/pentest';
import { Local } from '../shared/Local';

const ease = [0.2, 0.8, 0.2, 1] as const;

const highlights: Record<Cert['code'], string[]> = {
  CAPT: ['Core methodology, recon to exploitation', 'Guided machines on the Pentest Lab'],
  CPPT: ['Targets mapped to MITRE ATT&CK', 'Privilege escalation and attack chaining'],
};

const perks = [
  {
    title: 'Hands-on exam',
    text: 'Real machines, no MCQs',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="m7 9 3 2.5L7 14M12 14h5M9 20h6" />
      </>
    ),
  },
  {
    title: 'Verifiable',
    text: 'creds.cyberhx.com',
    icon: (
      <>
        <path d="M12 3 20 6v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6Z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </>
    ),
  },
  {
    title: 'Shareable',
    text: 'LinkedIn and CV ready',
    icon: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </>
    ),
  },
  {
    title: 'Pay once',
    text: 'No subscription',
    icon: (
      <>
        <path d="M18.2 8.5a5 5 0 1 0 0 7c-2-2-4.4-7-6.2-7" />
        <path d="M5.8 15.5a5 5 0 1 0 0-7c2 2 4.4 7 6.2 7" />
      </>
    ),
  },
];

// Rising sparks: [left %, top %, delay s, side]
const sparks: [number, number, number, 'c' | 'l'][] = [
  [8, 42, 0, 'c'], [20, 78, -2, 'c'], [32, 60, -4, 'c'], [42, 88, -6, 'c'], [14, 95, -3, 'c'],
  [58, 70, -1, 'l'], [70, 50, -3, 'l'], [82, 86, -5, 'l'], [92, 62, -7, 'l'], [64, 96, -2.5, 'l'],
];

function SpiritColumn({ cert, side, index }: { cert: Cert; side: 'a' | 'b'; index: number }) {
  const reduce = useReducedMotion();
  const lime = side === 'b';
  return (
    <motion.a
      href={cert.href}
      target="_blank"
      rel="noopener noreferrer"
      initial={reduce ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, delay: 0.1 + index * 0.15, ease }}
      className={`cx-col cx-c${side} group relative z-[2] flex flex-col items-center px-5 text-center text-white`}
    >
      <img
        src={cert.badge}
        alt={`CyberHx ${cert.code} — ${cert.title} badge`}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="cx-badge w-[13rem] select-none sm:w-[16rem] lg:w-[18rem]"
        style={{ animationDelay: `${index * -3}s` }}
      />
      <div className="cx-plat" aria-hidden="true" />
      <p className={`mt-6 font-mono text-[11px] tracking-[0.14em] sm:text-xs sm:tracking-[0.24em] ${lime ? 'text-lime' : 'text-glow'}`}>
        LEVEL 0{index + 1} · {cert.level.toUpperCase()}
        {cert.featured ? ' · MOST POPULAR' : ''}
      </p>
      <p className="mt-2.5 text-lg font-bold sm:text-[1.35rem]">{cert.title}</p>
      <p className={`font-display mt-3 text-7xl leading-none tracking-[-0.03em] sm:text-[4.75rem] ${lime ? 'text-lime' : 'text-white'}`}>
        ${cert.usd}
      </p>
      <Local usd={cert.usd} className="mt-2 block text-sm text-white/45" />
      <ul className="mt-5 flex flex-col gap-2">
        {highlights[cert.code].map((h) => (
          <li key={h} className="flex items-center justify-center gap-2.5 text-[15px] text-white/75">
            <Check size={16} strokeWidth={2.6} className={lime ? 'text-lime' : 'text-glow'} />
            {h}
          </li>
        ))}
      </ul>
      <span className={`cx-cta mt-7 ${lime ? 'cx-cta-l' : 'cx-cta-c'}`}>
        Become the {lime ? 'Falcon' : 'Wolf'}
        <ArrowRight size={18} strokeWidth={2.6} />
      </span>
    </motion.a>
  );
}

/** "Spirit duel": wolf (CAPT) and falcon (CPPT) realms split by a glowing seam. */
export const CertificationsSection = () => {
  const reduce = useReducedMotion();
  const capt = certifications.find((c) => c.code === 'CAPT')!;
  const cppt = certifications.find((c) => c.code === 'CPPT')!;

  return (
    <section id="certifications" className="cx-duel relative scroll-mt-20 overflow-hidden border-t border-white/[0.06]">
      <div className="relative">
        {/* Realms */}
        <div className="cx-layer cx-la" aria-hidden="true">
          <img src={capt.mascot} alt="" draggable={false} className="cx-spirit cx-sa" />
        </div>
        <div className="cx-layer cx-lb" aria-hidden="true">
          <img src={cppt.mascot} alt="" draggable={false} className="cx-spirit cx-sb" />
        </div>

        {sparks.map(([l, t, d, s], i) => (
          <span
            key={i}
            className={`cx-spark ${s === 'c' ? 'cx-spark-c' : ''}`}
            style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${d}s` }}
            aria-hidden="true"
          />
        ))}

        <div className="cx-seam" aria-hidden="true">
          <span className="cx-bolt" />
        </div>

        {/* Header */}
        <div className="relative z-[2] px-5 pt-20 text-center sm:pt-24">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="font-mono text-xs tracking-[0.34em] text-white/60 sm:text-[13px]"
          >
            CHOOSE YOUR SPIRIT
          </motion.p>
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.08, ease }}
            className="font-display mt-4 text-[2.6rem] leading-none tracking-[-0.035em] sm:text-6xl lg:text-[4.5rem]"
          >
            The Wolf <span className="text-white/35">or</span> <span className="text-lime">the Falcon.</span>
          </motion.h2>
        </div>

        {/* Columns */}
        <div className="relative mx-auto grid max-w-6xl gap-24 pb-24 pt-16 lg:grid-cols-2 lg:gap-16 lg:pb-28 lg:pt-14">
          <SpiritColumn cert={capt} side="a" index={0} />
          <SpiritColumn cert={cppt} side="b" index={1} />
          <div className="cx-vs" aria-hidden="true">LVL</div>
        </div>
      </div>

      {/* Perks */}
      <div className="relative z-[2] mx-auto max-w-6xl px-5 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-px overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((p) => (
            <div key={p.title} className="cx-perk group flex items-center gap-3.5 px-5 py-5">
              <span className="cx-ic">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c6f135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {p.icon}
                </svg>
              </span>
              <div>
                <p className="font-bold text-white">{p.title}</p>
                <p className="mt-0.5 text-sm text-muted">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CertificationsSection;
