import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Mascot } from '../shared/Mascot';
import { SiteIcon, type IconName } from '../shared/SiteIcon';
import { Reveal } from '../shared/Reveal';
import { plans, builderCategories, builderPricing } from '../../data/hosting';

const cheapestChallenge = Math.min(...builderCategories.flatMap((c) => c.tiers.map((t) => t.usd)));

export const HostingSection = () => (
  <section className="relative overflow-hidden border-t-2 border-line bg-ink py-20 sm:py-28">
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <Reveal className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="flex flex-col items-start gap-5 sm:flex-row">
          <img src="/mascots/store.webp" alt="" className="float-y mt-1 h-20 w-auto sm:h-24" loading="lazy" />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">For colleges and companies</p>
            <h2 className="font-display mt-2 text-4xl text-white sm:text-5xl">We host CTFs too.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Running a CTF for your fest or team? Grab a prebuilt event, or build your own challenge by challenge.
              We write the challenges, run the platform and the live scoreboard.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Builder banner */}
      <Reveal delay={0.1} className="mt-12">
        <Link
          to="/host-your-ctf#build"
          className="sticker sticker-glow lift shine group relative grid items-center gap-6 overflow-hidden p-6 sm:p-8 md:grid-cols-[auto_1fr_auto]"
        >
          <div className="flex -space-x-3">
            {(['code', 'lock-key', 'bug', 'linux'] as IconName[]).map((ic, i) => (
              <span
                key={ic}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-line bg-ink transition-transform duration-300 group-hover:-translate-y-2"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <SiteIcon name={ic} size={40} alt="" />
              </span>
            ))}
          </div>
          <div>
            <h3 className="font-display text-2xl text-white sm:text-3xl">Build your own CTF, part by part.</h3>
            <p className="mt-1.5 text-muted">
              Hosting ${builderPricing.hosting.usd}, then challenges from ${cheapestChallenge} each. Pick categories,
              difficulty and hours, like building a PC.
            </p>
          </div>
          <span className="btn btn-lime justify-self-start md:justify-self-end">Open the builder</span>
        </Link>
      </Reveal>

      <Reveal delay={0.05} className="mt-20">
        <h3 className="font-display text-2xl text-white">Or grab a prebuilt</h3>
      </Reveal>

      <div className="mt-10 grid items-end gap-8 lg:mt-40 lg:grid-cols-3 lg:gap-6">
        {plans.map((plan, i) => {
          const top = plan.featured;
          return (
            <Reveal key={plan.id} delay={i * 0.12} className={top ? 'mt-28 lg:mt-0 lg:-translate-y-6' : ''}>
              <div
                className={`sticker lift relative flex flex-col p-7 ${
                  top ? 'sticker-lime lg:pb-10' : plan.accent === 'cyan' ? 'sticker-glow' : ''
                }`}
              >
                {top && (
                  <>
                    <Mascot pose="thumbs" alt="" className="absolute -top-40 right-4 w-32 sm:w-36 lg:-top-44 lg:w-40" />
                    <span className="absolute -top-4 left-6 rounded-full border-2 border-ink bg-lime px-3 py-1 text-xs font-bold text-ink">
                      Most picked
                    </span>
                  </>
                )}
                <SiteIcon name={plan.icon} size={72} alt="" className="-ml-1" />
                <h3 className="font-display mt-4 text-2xl text-white">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`font-display text-5xl ${top ? 'text-lime' : plan.accent === 'cyan' ? 'text-glow' : 'text-white'}`}>
                    ${plan.usd}
                  </span>
                  <span className="text-sm text-muted">about {plan.inr}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-start gap-3 text-white/85">
                      <Check size={18} className={`mt-0.5 shrink-0 ${top ? 'text-lime' : 'text-glow'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/host-your-ctf#prebuilt" className={`btn mt-8 w-full ${top ? 'btn-lime' : 'btn-ghost'}`}>
                  Get {plan.name}
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default HostingSection;
