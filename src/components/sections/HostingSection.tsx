import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Mascot } from '../shared/Mascot';
import { SiteIcon } from '../shared/SiteIcon';
import { plans, pickAndChoose } from '../../data/hosting';

const cheapestPart = pickAndChoose.reduce((a, b) => (parseFloat(a.usd.slice(1)) <= parseFloat(b.usd.slice(1)) ? a : b));

export const HostingSection = () => (
  <section className="relative border-t-2 border-line bg-ink py-20 sm:py-28">
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="flex flex-col items-start gap-5 sm:flex-row">
          <img src="/mascots/store.webp" alt="" className="mt-1 h-20 w-auto sm:h-24" loading="lazy" />
          <div>
            <h2 className="font-display text-4xl text-white sm:text-6xl">We host CTFs too.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Running a CTF for your college fest or team? Pick a plan. We write the challenges, run the platform
              and the live scoreboard, and you hand out the prizes.
            </p>
          </div>
        </div>
        <Link to="/host-your-ctf" className="btn btn-ghost self-start lg:self-auto">
          Compare everything
        </Link>
      </div>

      <div className="mt-16 grid items-end gap-8 lg:mt-48 lg:grid-cols-3 lg:gap-6">
        {plans.map((plan) => {
          const top = plan.featured;
          return (
            <div
              key={plan.id}
              className={`sticker relative flex flex-col p-7 ${
                top ? 'sticker-lime mt-28 lg:mt-0 lg:-translate-y-6 lg:pb-10' : plan.accent === 'cyan' ? 'sticker-glow' : ''
              }`}
            >
              {top && (
                <>
                  <Mascot
                    pose="thumbs"
                    alt=""
                    className="absolute -top-40 right-4 w-32 sm:w-36 lg:-top-44 lg:w-40"
                  />
                  <span className="absolute -top-4 left-6 rounded-full border-2 border-ink bg-lime px-3 py-1 text-xs font-bold text-ink">
                    Most picked
                  </span>
                </>
              )}
              <SiteIcon name={plan.icon} size={80} alt="" className="-ml-1" />
              <h3 className="font-display mt-4 text-2xl text-white">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`font-display text-6xl ${top ? 'text-lime' : plan.accent === 'cyan' ? 'text-glow' : 'text-white'}`}>
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
              <Link
                to="/host-your-ctf#get-started"
                className={`btn mt-8 w-full ${top ? 'btn-lime' : 'btn-ghost'}`}
              >
                Start with {plan.name}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-muted">
        Only need one part? {cheapestPart.title} costs {cheapestPart.usd}, and hosting alone is{' '}
        {pickAndChoose.find((p) => p.id === 'hosting-only')?.usd}.{' '}
        <Link to="/host-your-ctf#pick-and-choose" className="font-semibold text-lime underline underline-offset-4">
          See single parts
        </Link>
      </p>
    </div>
  </section>
);

export default HostingSection;
