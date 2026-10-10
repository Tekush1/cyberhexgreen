import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Mascot } from '../shared/Mascot';
import { SiteIcon } from '../shared/SiteIcon';
import { CountUp } from '../shared/CountUp';
import { builderPricing } from '../../data/hosting';
import { stats } from '../../data/stats';


const ease = [0.2, 0.8, 0.2, 1] as const;

export const HeroSection = () => {
  const reduce = useReducedMotion();
  const up = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } };

  return (
    <section className="relative overflow-hidden bg-ink pt-24 sm:pt-28">
      <div className="grid-drift pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="orb left-[-10rem] top-20 h-96 w-96 bg-glow/15" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-0 lg:px-8">
        <div className="relative z-10 order-2 pb-4 lg:order-1 lg:pb-16">
          <h1 className="font-display text-[2.6rem] text-white sm:text-6xl lg:text-[4.2rem]">
            <span className="block overflow-hidden pb-1">
              <motion.span className="block" {...up(0.05)}>
                Hack our CTFs.
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-2">
              <motion.span className="block text-glow" {...up(0.18)}>
                Host your own.
              </motion.span>
            </span>
          </h1>

          <motion.p {...up(0.3)} className="mt-5 max-w-lg text-lg leading-8 text-muted">
            CyberHx runs capture-the-flag events for India's security crowd, and builds them for colleges and companies,
            from ${builderPricing.hosting.usd} a round.
          </motion.p>

          <motion.div {...up(0.4)} className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link to="/host-your-ctf#build" className="btn btn-red">
              Build your CTF
            </Link>
            <Link to="/gallery" className="btn btn-ghost">
              Play our CTFs
            </Link>
          </motion.div>

          <motion.dl {...up(0.5)} className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl text-white">
                  <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                </dt>
                <dd className="text-xs leading-4 text-muted">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 110, damping: 15, delay: 0.1 }}
          className="relative order-1 mx-auto h-[20rem] w-full max-w-[24rem] sm:h-[26rem] sm:max-w-[30rem] lg:order-2 lg:h-[32rem] lg:max-w-none"
        >
          <div className="absolute bottom-4 left-1/2 aspect-square w-[76%] -translate-x-1/2 rounded-full border-[3px] border-glow bg-panel shadow-[8px_8px_0_0_#0b3a4a]" />
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <Mascot pose="flag" alt="CyberHx mascot holding a CTF flag" eager className="float-y h-[19rem] w-auto sm:h-[25rem] lg:h-[30rem]" />
          </div>
          <SiteIcon name="trophy" size={64} alt="" className="float-y absolute left-[6%] top-[20%] hidden sm:block [--r:-10deg]" />
          <SiteIcon name="bug" size={52} alt="" className="float-y absolute bottom-[14%] right-[4%] [--r:12deg] [animation-delay:-2s]" />
        </motion.div>
      </div>

    </section>
  );
};

export default HeroSection;
