import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { certifications } from '../../data/pentest';
import { Local } from '../shared/Local';

const ease = [0.2, 0.8, 0.2, 1] as const;

const cpptSteps = [
  'Recon and enumeration at scale',
  'Exploitation mapped to MITRE ATT&CK',
  'Privilege escalation and attack chaining',
];

/** Editorial certification section: CPPT as the flagship (falcon), CAPT as the entry band (wolf). */
export const CertificationsSection = () => {
  const reduce = useReducedMotion();
  const capt = certifications.find((c) => c.code === 'CAPT')!;
  const cppt = certifications.find((c) => c.code === 'CPPT')!;

  const rise = (delay = 0, y = 28) => ({
    initial: reduce ? false : { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.8, delay, ease },
  });

  return (
    <section id="certifications" className="cx-ed relative scroll-mt-20 overflow-hidden border-t border-white/[0.06]">
      {/* Falcon spirit + ghost word */}
      <img src={cppt.mascot} alt="" aria-hidden="true" draggable={false} className="cx-ed-falcon pointer-events-none absolute select-none" />
      <div className="cx-ed-ghost pointer-events-none absolute select-none" aria-hidden="true">PRO</div>

      {/* Flagship: CPPT */}
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-24 sm:px-6 sm:pt-28 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-8 lg:pb-28 lg:pt-32">
        <motion.div {...rise(0.1, 40)} className="cx-ed-hw relative mx-auto aspect-square w-full max-w-[34rem]">
          <div className="cx-ed-halo absolute inset-[10%] rounded-full" aria-hidden="true" />
          <div className="cx-ed-orbit absolute inset-[4%] rounded-full" aria-hidden="true" />
          <div className="cx-ed-orbit cx-ed-orbit-b absolute -inset-[4%] rounded-full" aria-hidden="true" />
          <img
            src={cppt.badge}
            alt="CyberHx CPPT — Certified Professional Penetration Tester badge"
            loading="lazy"
            decoding="async"
            draggable={false}
            className="cx-ed-hero absolute inset-[13%] h-[74%] w-[74%] select-none object-contain"
          />
        </motion.div>

        <div className="relative min-w-0">
          <motion.p {...rise(0)} className="font-mono text-xs tracking-[0.2em] text-lime sm:text-[13px]">
            THE FLAGSHIP · SPIRIT OF THE FALCON
          </motion.p>
          <motion.h2
            {...rise(0.08)}
            className="font-display mt-5 text-[2.6rem] leading-[0.93] tracking-[-0.04em] text-[#f4f4f0] sm:text-7xl lg:text-[3.5rem] lg:whitespace-nowrap xl:text-[4rem]"
          >
            <span className="block">Break in like</span>
            <span className="block">a professional.</span>
          </motion.h2>
          <motion.p {...rise(0.16)} className="mt-6 max-w-lg text-lg leading-8 text-[#f4f4f0]/60">
            CPPT is a hands-on exam on real machines. No multiple choice: you get a target and you take it.
          </motion.p>

          <div className="mt-7 flex flex-col gap-3.5">
            {cpptSteps.map((s, i) => (
              <motion.div key={s} {...rise(0.22 + i * 0.07, 14)} className="cx-ed-step flex items-baseline gap-5">
                <span className="font-mono text-[13px] text-lime">0{i + 1}</span>
                <span className="text-lg text-[#f4f4f0]/90">{s}</span>
              </motion.div>
            ))}
          </div>

          <motion.div {...rise(0.45)}>
            <div className="my-8 h-px bg-white/[0.12]" />
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-[13px] tracking-[0.2em] text-[#f4f4f0]/45">ONE-TIME</p>
                <p className="font-display mt-1.5 text-7xl leading-none tracking-[-0.035em] text-[#f4f4f0] sm:text-[5rem]">
                  ${cppt.usd}
                </p>
                <Local usd={cppt.usd} className="mt-2 block text-sm text-[#f4f4f0]/45" />
              </div>
              <a href={cppt.href} target="_blank" rel="noopener noreferrer" className="cx-ed-cta group">
                Get CPPT
                <ArrowRight size={19} strokeWidth={2.6} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Entry band: CAPT */}
      <motion.a
        {...rise(0, 20)}
        href={capt.href}
        target="_blank"
        rel="noopener noreferrer"
        className="cx-ed-band group relative block overflow-hidden border-t border-white/10"
      >
        <img src={capt.mascot} alt="" aria-hidden="true" draggable={false} className="cx-ed-wolf pointer-events-none absolute select-none" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-8 px-5 py-14 sm:px-6 md:flex-row md:items-center md:gap-12 lg:px-8 lg:py-16 lg:pl-[22rem]">
          <img
            src={capt.badge}
            alt="CyberHx CAPT — Certified Associate Penetration Tester badge"
            loading="lazy"
            decoding="async"
            draggable={false}
            className="cx-ed-mini w-32 shrink-0 select-none sm:w-40"
          />
          <div className="flex-1">
            <p className="font-mono text-xs tracking-[0.18em] text-glow sm:text-[13px]">NEW TO PENTESTING · SPIRIT OF THE WOLF</p>
            <p className="font-display mt-3 text-4xl leading-none tracking-[-0.03em] text-[#f4f4f0] sm:text-[2.75rem]">Start with CAPT.</p>
            <p className="mt-3 text-[17px] text-[#f4f4f0]/60">
              Certified Associate Penetration Tester · core methodology on guided lab machines.
            </p>
          </div>
          <div className="md:text-right">
            <p className="font-display text-6xl leading-none text-glow">${capt.usd}</p>
            <Local usd={capt.usd} className="mt-1 block text-sm text-[#f4f4f0]/45" />
            <span className="cx-ed-ghostbtn mt-4">
              Get CAPT
              <ArrowRight size={18} strokeWidth={2.6} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </motion.a>
    </section>
  );
};

export default CertificationsSection;
