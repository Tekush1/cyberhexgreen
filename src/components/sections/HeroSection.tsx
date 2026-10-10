import { Link } from 'react-router-dom';
import { Calendar, Users } from 'lucide-react';
import { Mascot } from '../shared/Mascot';
import { events } from '../../data/events';
import { plans } from '../../data/hosting';

const startingPrice = Math.min(...plans.map((p) => p.usd));

export const HeroSection = () => {
  // Latest event leads: live/upcoming first, otherwise the most recent one.
  const featured = events.find((e) => e.status !== 'completed') ?? events[0];

  return (
    <section className="relative overflow-hidden bg-ink pt-24 sm:pt-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-8 lg:pb-24">
        {/* Copy */}
        <div className="relative z-10">
          {featured && (
            <Link
              to="/gallery"
              className="inline-flex max-w-full items-center gap-2.5 rounded-full border-2 border-line bg-panel py-1.5 pl-1.5 pr-4 text-sm text-white/80 transition-colors hover:border-glow"
            >
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  featured.status === 'live'
                    ? 'bg-red-500 text-white'
                    : featured.status === 'upcoming'
                    ? 'bg-lime text-ink'
                    : 'bg-glow text-ink'
                }`}
              >
                {featured.status === 'live' ? 'Live now' : featured.status === 'upcoming' ? 'Coming up' : 'Just wrapped'}
              </span>
              <span className="truncate">
                {featured.title}, {featured.participants.replace(' Hackers', '')} hackers
              </span>
            </Link>
          )}

          <h1 className="font-display mt-7 text-[2.9rem] text-white sm:text-7xl lg:text-[5.4rem]">
            Play our CTFs.
            <span className="mt-1 block text-glow">Or let us host yours.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-muted">
            CyberHx runs capture-the-flag events for India's security crowd. We also build the challenges and host
            the whole CTF for colleges, clubs and companies, starting at ${startingPrice}.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link to="/gallery" className="btn btn-lime">
              Browse events
            </Link>
            <Link to="/host-your-ctf#plans" className="btn btn-ghost">
              See hosting prices
            </Link>
          </div>
        </div>

        {/* Event ticket with the flag-bearer standing on it */}
        {featured && (
          <div className="relative mx-auto w-full max-w-md pt-56 sm:pt-64 lg:max-w-none lg:pl-10 lg:pt-52">
            <Mascot
              pose="flag"
              alt="CyberHx mascot holding a CTF flag"
              eager
              className="mascot-pop absolute -top-2 right-0 z-10 w-[17rem] sm:w-[20rem] lg:-top-6 lg:right-2 lg:w-[23rem]"
            />

            <Link to="/gallery" className="sticker sticker-glow group relative z-20 block overflow-hidden">
              <div className="relative aspect-[16/8] overflow-hidden border-b-2 border-line">
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="eager"
                />
              </div>
              <div className="p-5 sm:p-6">
                <h2 className="font-display text-2xl text-white sm:text-3xl">{featured.title}</h2>
                <p className="mt-1.5 text-muted">{featured.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={15} className="text-glow" />
                    {featured.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={15} className="text-glow" />
                    {featured.participants}
                  </span>
                  <span className="font-bold text-sun">{featured.prize}</span>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
