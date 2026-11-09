import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { events, hasCount, type Event } from '../data/events';
import { stats } from '../data/stats';
import { builderPricing } from '../data/hosting';
import { Mascot } from '../components/shared/Mascot';
import { SubscribeForm } from '../components/shared/SubscribeForm';
import { dateParts, durationShort, prizeShort } from '../components/gallery/eventStyle';

/* /events — what is next, then every CTF we have run, newest first.
   Typography does the work: one feature for the next event, then a record of past events as hairline rows with
   the figures that matter (players, teams, length, prizes) and links to the event page, leaderboard and write-ups.
   Data: src/data/events.ts. Each event also has its own page at /events/<slug>. */

const withCommas = (s: string) => s.replace(/\d{4,}/g, (n) => Number(n).toLocaleString('en-US'));
const fromHighlights = (e: Event, word: RegExp) => {
  const h = e.highlights?.find((x) => word.test(x));
  return h ? withCommas(h.replace(word, '').trim()) : null;
};
const players = (e: Event) => withCommas(e.participants.replace(/\s*(hackers?|participants?|players?)\s*$/i, '').trim());

/** Up to three figures for an event: players, teams, length, prizes — whichever it has. */
const figures = (e: Event) => {
  const teams = fromHighlights(e, /\s*teams?\s*$/i);
  const list: { v: string; k: string }[] = [];
  if (hasCount(e)) list.push({ v: players(e), k: 'players' });
  if (teams) list.push({ v: teams, k: 'teams' });
  if (e.duration) list.push({ v: durationShort(e.duration).replace(/h$/, ''), k: 'hours' });
  if (e.prize) list.push({ v: prizeShort(e.prize), k: 'in prizes' });
  return list.slice(0, 3);
};

const Figure = ({ v, k, big = false }: { v: string; k: string; big?: boolean }) => (
  <div>
    <p className={`font-display leading-none text-white ${big ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-[1.7rem]'}`}>{v}</p>
    <p className="mt-1.5 text-sm text-white/45">{k}</p>
  </div>
);

const TextLink = ({ to, href, children }: { to?: string; href?: string; children: ReactNode }) =>
  to ? (
    <Link to={to} className="inline-flex items-center gap-1 text-[15px] font-semibold text-white/80 transition hover:text-white">
      {children} <ArrowRight size={15} className="text-lime" />
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[15px] font-semibold text-white/80 transition hover:text-white">
      {children} <ArrowUpRight size={15} className="text-lime" />
    </a>
  );

export const EventsPage = () => {
  const next = events.filter((e) => e.status !== 'completed');
  const past = events.filter((e) => e.status === 'completed');
  const names = events.map((e) => e.title.replace(/:.*$/, '')).filter((t, i, a) => a.indexOf(t) === i).slice(0, 3);

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-white">
      <Seo
        title={`CTF Events by CyberHx — ${names.join(', ')}`}
        description="What is next and every capture-the-flag CyberHx has run: dates, players, prizes, leaderboards, certificates and write-ups. 7,400+ players from 90+ countries so far."
        path="/events"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'CTF Events by CyberHx',
          url: 'https://cyberhx.com/events',
          hasPart: events.map((e) => ({ '@type': 'Event', name: e.title, url: `https://cyberhx.com/events/${e.slug}`, startDate: e.startDate })),
        }}
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div className="min-w-0">
            <p className="text-[15px] text-white/55">Events</p>
            <h1 className="font-display mt-3 text-5xl leading-[0.95] text-white sm:text-7xl">Every CTF we run.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
              Open competitions for players everywhere, and private ones for a campus or a company. Each one leaves a leaderboard, certificates and the write-ups of the people who played.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link to="/host-your-ctf" className="btn btn-lime">Host a CTF <ArrowRight size={17} /></Link>
            <Link to="/pricing" className="btn btn-ghost">Pricing</Link>
          </div>
        </header>

        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-white/10 py-8 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="font-display text-3xl leading-none text-white sm:text-4xl">
                {s.prefix}{s.decimals ? s.to.toFixed(s.decimals) : s.to.toLocaleString('en-US')}{s.suffix}
              </dt>
              <dd className="mt-2 text-sm text-white/50">{s.label}</dd>
            </div>
          ))}
          <div>
            <dt className="font-display text-3xl leading-none text-white sm:text-4xl">{events.length}</dt>
            <dd className="mt-2 text-sm text-white/50">CTFs hosted or announced</dd>
          </div>
        </dl>

        {/* Next */}
        {next.map((e) => {
          const dp = dateParts(e.date);
          return (
            <section key={e.slug} aria-labelledby={`next-${e.slug}`} className="mt-20 sm:mt-24">
              <p className="text-[15px] text-white/55">
                {e.status === 'live' ? 'Live now' : 'Next'} · {dp.days ? `${dp.days} ` : ''}{dp.month} {dp.year}{e.entry && e.entry !== 'Private' ? ` · ${e.entry} to play` : ''}
              </p>
              <div className="mt-5 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
                <div className="min-w-0">
                  <h2 id={`next-${e.slug}`} className="font-display text-4xl leading-[1.02] text-white sm:text-5xl">
                    <Link to={`/events/${e.slug}`} className="transition hover:text-lime">{e.title}</Link>
                  </h2>
                  <p className="mt-4 text-xl leading-8 text-white/70">{e.subtitle}.</p>
                  <p className="mt-4 max-w-xl leading-7 text-white/55">{e.description}</p>
                  {e.note && <p className="mt-4 text-[15px] font-medium text-white/80">{e.note}</p>}
                  <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                    {e.register && e.entry !== 'Private' ? (
                      <a href={e.register} target="_blank" rel="noopener noreferrer" className="btn btn-lime">Register <ArrowUpRight size={17} /></a>
                    ) : (
                      <Link to={`/events/${e.slug}`} className="btn btn-lime">About the event <ArrowRight size={17} /></Link>
                    )}
                    <TextLink to="/ambassadors">Bring your campus</TextLink>
                  </div>
                  {!e.register && (
                    <div className="mt-8 max-w-md">
                      <p className="mb-3 text-[15px] font-semibold text-white">Hear the moment registrations open.</p>
                      <SubscribeForm source={`events-${e.slug}`} />
                    </div>
                  )}
                </div>
                <Link to={`/events/${e.slug}`} className="block self-center overflow-hidden rounded-2xl ring-1 ring-white/10">
                  <img src={e.image} alt={`${e.title} artwork`} width={969} height={431} className="aspect-[969/431] w-full object-cover" />
                </Link>
              </div>
            </section>
          );
        })}

        {/* The record */}
        <section aria-labelledby="record-h" className="mt-24 sm:mt-28">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="record-h" className="font-display text-3xl text-white sm:text-4xl">The record</h2>
            <p className="text-[15px] text-white/50">{past.length} {past.length === 1 ? 'event' : 'events'}, newest first.</p>
          </div>

          <ol className="mt-8 border-t border-white/10">
            {past.map((e) => {
              const dp = dateParts(e.date);
              const figs = figures(e);
              return (
                <li key={e.slug} className="grid gap-6 border-b border-white/10 py-8 sm:py-10 lg:grid-cols-[8rem_17rem_1fr_auto] lg:gap-10">
                  <div className="order-2 lg:order-none">
                    <p className="font-display whitespace-nowrap text-xl leading-none text-white">{dp.month} {dp.year}</p>
                    <p className="mt-1.5 text-sm text-white/45">{dp.days || e.shortDate || ''}</p>
                  </div>
                  <Link to={`/events/${e.slug}`} className="order-1 block self-start overflow-hidden rounded-xl ring-1 ring-white/10 lg:order-none">
                    <img src={e.image} alt={`${e.title} artwork`} loading="lazy" decoding="async" width={969} height={431} className="aspect-[969/431] w-full object-cover" />
                  </Link>
                  <div className="order-3 min-w-0 lg:order-none">
                    <h3 className="font-display text-2xl leading-tight text-white sm:text-3xl">
                      <Link to={`/events/${e.slug}`} className="transition hover:text-lime">{e.title}</Link>
                    </h3>
                    <p className="mt-2 leading-7 text-white/60">{e.subtitle}. {e.location}.</p>
                    {e.note && <p className="mt-2 text-[15px] leading-7 text-white/45">{e.note}</p>}
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                      <TextLink to={`/events/${e.slug}`}>Event page</TextLink>
                      {e.social?.leaderboard && <TextLink href={e.social.leaderboard}>Leaderboard</TextLink>}
                      {e.social?.certificates && <TextLink href={e.social.certificates}>Certificates</TextLink>}
                      <TextLink to={`/events/${e.slug}#writeups`}>Write-ups</TextLink>
                    </div>
                  </div>
                  <div className="order-4 flex gap-8 lg:order-none lg:min-w-[11rem] lg:flex-col lg:gap-5 lg:text-right">
                    {figs.length ? figs.map((f) => <Figure key={f.k} {...f} />) : <p className="text-sm text-white/45">{e.entry === 'Private' ? 'Private event' : ''}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Host one */}
        <section aria-labelledby="host-h" className="mt-24 grid items-center gap-10 sm:mt-28 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <h2 id="host-h" className="font-display max-w-[16ch] text-4xl leading-[1.02] text-white sm:text-5xl">Want one of these for your organization?</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/60">
              A CTF under your name, built challenge by challenge, with the live scoreboard and our team on the day. Hosting starts at ${builderPricing.hosting.usd}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/host-your-ctf#packages" className="btn btn-lime">Build your CTF <ArrowRight size={17} /></Link>
              <Link to="/universities" className="btn btn-ghost">For universities</Link>
              <Link to="/companies" className="btn btn-ghost">For companies</Link>
            </div>
          </div>
          <Mascot pose="point" alt="" className="mx-auto w-44 sm:w-56" />
        </section>
      </div>
    </div>
  );
};

export default EventsPage;
