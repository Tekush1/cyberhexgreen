import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Mascot } from '../shared/Mascot';
import { SiteIcon, type IconName } from '../shared/SiteIcon';
import { CountUp } from '../shared/CountUp';
import { Reveal } from '../shared/Reveal';
import { builderPricing } from '../../data/hosting';
import { cppt } from '../../data/pentest';
import { stats } from '../../data/stats';

const offers: { icon: IconName; title: string; detail: string; to: string; external?: boolean }[] = [
  { icon: 'calendar-fire' as IconName, title: 'Play our CTFs', detail: 'Open events for everyone', to: '/gallery' },
  { icon: 'ctf-green', title: 'Build your CTF', detail: `Hosting from $${builderPricing.hosting.usd}`, to: '/host-your-ctf#build' },
  { icon: 'toolbox', title: 'Pentest Lab + CPPT', detail: `Certification for $${cppt.usd}`, to: cppt.href, external: true },
];

const ticker: { icon: IconName; name: string }[] = [
  { icon: 'code', name: 'Web' },
  { icon: 'lock-key', name: 'Crypto' },
  { icon: 'satellite', name: 'OSINT' },
  { icon: 'bug', name: 'Pwn' },
  { icon: 'gear', name: 'Reverse' },
  { icon: 'eyes', name: 'Forensics' },
  { icon: 'ghost', name: 'Steg' },
  { icon: 'linux', name: 'Boot2Root' },
  { icon: 'network', name: 'Chained' },
];

const ease = [0.2, 0.8, 0.2, 1] as const;

export const HeroSection = () => {
  const reduce = useReducedMotion();
  const up = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 32 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } };

  return (
    <section className="relative overflow-hidden bg-ink pt-24 sm:pt-28">
      {/* Moving background */}
      <div className="grid-drift pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="orb left-[-8rem] top-10 h-80 w-80 bg-glow/20" aria-hidden="true" />
      <div className="orb bottom-0 right-[-6rem] h-96 w-96 bg-lime/10 [animation-delay:-6s]" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-0 lg:px-8">
        {/* Copy */}
        <div className="relative z-10 order-2 lg:order-1">
          <motion.p {...up(0)} className="caret font-mono text-xs uppercase tracking-[0.25em] text-lime sm:text-sm">
            capture the flag · India
          </motion.p>
          <h1 className="font-display mt-4 text-[2.6rem] text-white sm:text-6xl lg:text-[4.4rem]">
            <span className="block overflow-hidden pb-1">
              <motion.span className="block" {...up(0.1)}>
                Hack our CTFs.
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-2">
              <motion.span className="block text-glow" {...up(0.22)}>
                Host your own.
              </motion.span>
            </span>
          </h1>

          <motion.p {...up(0.35)} className="mt-6 max-w-xl text-lg leading-8 text-muted">
            CyberHx runs capture-the-flag events for India's security crowd. Build a complete CTF for your college
            or company from ${builderPricing.hosting.usd}, and train on our Pentest Lab with the ${cppt.usd} CPPT
            certification.
          </motion.p>

          <motion.div {...up(0.45)} className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link to="/host-your-ctf#build" className="btn btn-red">
              Build your CTF
            </Link>
            <Link to="/gallery" className="btn btn-ghost">
              Play our CTFs
            </Link>
          </motion.div>
        </div>

        {/* Mascot on a sticker disc */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.85, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.15 }}
          className="relative order-1 mx-auto h-[22rem] w-full max-w-[26rem] sm:h-[28rem] sm:max-w-[32rem] lg:order-2 lg:h-[34rem] lg:max-w-none"
        >
          <div className="absolute bottom-4 left-1/2 aspect-square w-[78%] -translate-x-1/2 rounded-full border-[3px] border-glow bg-panel shadow-[8px_8px_0_0_#0b3a4a]" />
          <motion.div
            className="absolute bottom-[16%] left-1/2 aspect-square w-[58%] rounded-full border-2 border-dashed border-line"
            style={{ x: '-50%' }}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <Mascot
              pose="flag"
              alt="CyberHx mascot holding a CTF flag"
              eager
              className="float-y h-[21rem] w-auto sm:h-[27rem] lg:h-[32rem]"
            />
          </div>
          <SiteIcon name="trophy" size={72} alt="" className="float-y absolute left-[4%] top-[18%] hidden sm:block [--r:-10deg]" />
          <SiteIcon name="bug" size={56} alt="" className="float-y absolute bottom-[12%] right-[2%] [--r:12deg] [animation-delay:-2s]" />
          <SiteIcon name="shield" size={60} alt="" className="float-y absolute bottom-[30%] left-0 [--r:8deg] [animation-delay:-3.5s]" />
        </motion.div>
      </div>

      {/* Offer strip */}
      <div className="relative mx-auto mt-12 max-w-7xl px-5 sm:px-6 lg:mt-8 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {offers.map((o, i) => {
            const inner = (
              <>
                <SiteIcon name={o.icon} size={60} alt="" className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                <span className="flex-1">
                  <span className="font-display block text-lg text-white">{o.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{o.detail}</span>
                </span>
                <span className="text-xl text-lime transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                  →
                </span>
              </>
            );
            const cls = 'sticker lift shine group flex items-center gap-4 p-5';
            return (
              <Reveal key={o.title} delay={0.5 + i * 0.1}>
                {o.external ? (
                  <a href={o.to} target="_blank" rel="noopener noreferrer" className={cls}>
                    {inner}
                  </a>
                ) : (
                  <Link to={o.to} className={cls}>
                    {inner}
                  </Link>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="relative mx-auto mt-14 max-w-7xl px-5 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-y-8 border-y-2 border-line py-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center md:border-r-2 md:border-line md:last:border-r-0">
              <dt className="font-display text-3xl text-white sm:text-4xl">
                <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
              </dt>
              <dd className="mt-1 text-sm text-muted">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Challenge ticker */}
      <div className="relative mt-12 overflow-hidden border-y-2 border-line bg-panel py-4" aria-hidden="true">
        <div className="marquee">
          {[...ticker, ...ticker, ...ticker, ...ticker].map((t, i) => (
            <span key={i} className="mx-6 flex items-center gap-3 whitespace-nowrap">
              <SiteIcon name={t.icon} size={36} alt="" />
              <span className="font-display text-xl text-white/85">{t.name}</span>
              <span className="ml-6 text-lime">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
