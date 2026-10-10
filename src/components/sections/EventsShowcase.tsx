import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';
import { Mascot } from '../shared/Mascot';
import { SiteIcon } from '../shared/SiteIcon';
import { events } from '../../data/events';

const statusLabel = { live: 'Live now', upcoming: 'Coming up', completed: 'Completed' } as const;
const statusCls = {
  live: 'bg-red-500 text-white',
  upcoming: 'bg-lime text-ink',
  completed: 'bg-white/10 text-white/80',
} as const;

export const EventsShowcase = () => (
  <section className="border-t-2 border-line bg-dark-200 py-20 sm:py-28">
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <SiteIcon name="calendar-fire" size={84} alt="" />
          <div>
            <h2 className="font-display text-4xl text-white sm:text-5xl">Browse events</h2>
            <p className="mt-2 max-w-lg text-muted">
              Every CTF we have run, with dates, team counts and where to find the leaderboard.
            </p>
          </div>
        </div>
        <Link to="/gallery" className="btn btn-ghost self-start sm:self-auto">
          All events
        </Link>
      </div>

      <div className="mt-14 grid gap-8 md:mt-40 md:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => (
          <Link key={e.id} to="/gallery" className="sticker group flex flex-col overflow-hidden">
            <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-line">
              <img
                src={e.image}
                alt={e.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${statusCls[e.status]}`}>
                {statusLabel[e.status]}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-display text-2xl text-white">{e.title}</h3>
              <p className="mt-2 text-muted">{e.subtitle}</p>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="flex items-center gap-2 text-white/80">
                  <Calendar size={15} className="shrink-0 text-glow" />
                  <dt className="sr-only">Date</dt>
                  <dd>{e.date}</dd>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Clock size={15} className="shrink-0 text-glow" />
                  <dt className="sr-only">Length</dt>
                  <dd>{e.duration}</dd>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Users size={15} className="shrink-0 text-glow" />
                  <dt className="sr-only">Players</dt>
                  <dd>{e.participants}</dd>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin size={15} className="shrink-0 text-glow" />
                  <dt className="sr-only">Where</dt>
                  <dd>{e.location}</dd>
                </div>
              </dl>
              <p className="mt-auto pt-6 font-display text-xl text-sun">{e.prize}</p>
            </div>
          </Link>
        ))}

        {/* Next event teaser */}
        <div className="sticker sticker-sun relative mt-28 flex flex-col p-6 md:mt-0 lg:mt-0">
          <Mascot pose="confused" alt="" className="absolute -top-32 left-1/2 w-44 -translate-x-1/2 sm:w-48 md:-top-28 md:w-40 lg:w-44" />
          <div className="mt-16 md:mt-24">
            <h3 className="font-display text-2xl text-white">What's next?</h3>
            <p className="mt-3 leading-7 text-muted">
              We're picking the date for our next open CTF. Follow along on Instagram to hear the moment
              registrations open.
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <a
              href="https://instagram.com/nulloriginctf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-lime"
            >
              Follow on Instagram
            </a>
            <a href="https://ctf.cyberhx.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              Practice challenges
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default EventsShowcase;
