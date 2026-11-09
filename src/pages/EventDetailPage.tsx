import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { SubscribeForm } from '../components/shared/SubscribeForm';
import { entryLabel, eventBySlug, events, hasCount, playersText, type Event } from '../data/events';
import { absImage, eventBreadcrumb, eventDescription, eventJsonLd, eventKeywords, eventTitle } from '../data/eventSeo';
import NotFoundPage from './NotFoundPage';
import { postsForEvent, type PostCard as Card } from '../features/blog/api';
import { PostCard } from '../features/blog/PostCard';

/* /events/:slug — one page per CTF, so a search for the event's name lands here.
   Data: src/data/events.ts. Crawlers get a server-rendered copy from api/event-page.ts. */

/** "Completed · 31 October 2026", "Next · February 2027 · Free to play", "Live now". */
const statusLine = (e: Event) =>
  e.status === 'live'
    ? 'Live now'
    : e.status === 'upcoming'
      ? ['Next', e.date, e.entry === 'Private' ? 'Private event' : e.entry ? `${e.entry} to play` : ''].filter(Boolean).join(' · ')
      : `Completed · ${e.date}`;

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <dt className="text-sm text-white/45">{label}</dt>
      <dd className="mt-1 font-semibold leading-6 text-white">{value}</dd>
    </div>
  );
}

export default function EventDetailPage() {
  const { slug = '' } = useParams();
  const e = eventBySlug(slug);
  const [writeups, setWriteups] = useState<Card[]>([]);
  useEffect(() => {
    let alive = true;
    setWriteups([]);
    if (e) postsForEvent(e.slug).then((p) => alive && setWriteups(p)).catch(() => undefined);
    return () => { alive = false; };
  }, [e]);
  if (!e) return <NotFoundPage />;

  const year = (e.startDate.match(/^\d{4}/) || [''])[0];
  const others = events.filter((x) => x.slug !== e.slug);
  const isPrivate = e.entry === 'Private';

  const primary =
    e.status !== 'completed' && e.register && !isPrivate
      ? { href: e.register, label: `Register${e.entry === 'Paid' ? ' · paid entry' : ''}` }
      : e.status === 'completed' && e.social?.leaderboard
        ? { href: e.social.leaderboard, label: 'See the leaderboard' }
        : e.link && !isPrivate
          ? { href: e.link, label: 'Open event' }
          : null;

  const links = [
    { href: e.social?.website, label: 'Website' },
    { href: e.social?.leaderboard, label: 'Leaderboard' },
    { href: e.social?.certificates, label: 'Certificates' },
    { href: e.social?.ctftime, label: 'CTFtime' },
    { href: e.social?.instagram, label: 'Instagram' },
    { href: e.social?.x, label: 'X' },
    { href: e.social?.linkedin, label: 'LinkedIn' },
  ].filter((l) => l.href && l.href !== primary?.href) as { href: string; label: string }[];

  const facts = [
    { label: 'Date', value: e.date },
    e.duration && { label: 'Duration', value: e.duration },
    (hasCount(e) || entryLabel(e) || e.participants) && { label: hasCount(e) ? 'Players' : 'Entry', value: hasCount(e) ? playersText(e) : entryLabel(e) || e.participants },
    e.prize && { label: 'Prizes', value: e.prize },
    { label: 'Where', value: e.location },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <Seo
        title={eventTitle(e)}
        description={eventDescription(e)}
        path={`/events/${e.slug}`}
        image={absImage(e.image)}
        keywords={eventKeywords(e)}
        jsonLd={[eventJsonLd(e), eventBreadcrumb(e)]}
      />
      <article className="bg-ink pb-20 pt-24 sm:pt-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <Link to="/" className="hover:text-white">Home</Link><ChevronRight size={14} />
            <Link to="/events" className="hover:text-white">Events</Link><ChevronRight size={14} />
            <span className="text-white/80">{e.title}</span>
          </nav>

          <header className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-[15px] text-white/55">{statusLine(e)}</p>
              <h1 className="font-display mt-4 text-4xl leading-[1.02] text-white sm:text-6xl">
                {e.title}{year && !e.title.includes(year) ? <span className="text-white/40"> {year}</span> : null}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-8 text-muted">{e.subtitle}</p>
              {e.note && <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/80">{e.note}</p>}
              {e.status !== 'completed' && !e.register && !isPrivate && (
                <div className="mt-7 max-w-md">
                  <p className="mb-3 text-[15px] font-semibold text-white">Hear the moment registrations open.</p>
                  <SubscribeForm source={`event-${e.slug}`} />
                </div>
              )}
              <div className="mt-7 flex flex-wrap gap-3">
                {primary && (
                  <a href={primary.href} target="_blank" rel="noopener noreferrer" className="btn btn-lime">
                    {primary.label} <ArrowUpRight size={16} />
                  </a>
                )}
                {e.status !== 'completed' && !isPrivate && <Link to="/ambassadors" className={primary ? 'btn btn-ghost' : 'btn btn-lime'}>Bring your campus</Link>}
                <Link to="/host-your-ctf" className="btn btn-ghost">Host a CTF like this</Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
              <img src={e.image} alt={`${e.title} artwork`} className="aspect-[969/431] w-full object-cover" />
            </div>
          </header>

          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {facts.map((f) => <Fact key={f.label} {...f} />)}
          </dl>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <section aria-labelledby="about-h">
              <h2 id="about-h" className="font-display text-2xl text-white sm:text-3xl">About {e.title}</h2>
              <p className="mt-4 leading-8 text-white/75">{e.description}</p>
              {!!e.highlights?.length && (
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {e.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-white/85"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />{h}</li>
                  ))}
                </ul>
              )}
              <h3 className="mt-10 text-sm text-white/45">Categories</h3>
              <p className="mt-2 leading-7 text-white/80">{e.tags.join(' · ')}</p>
            </section>

            <aside className="space-y-5">
              {!!e.hostLogos?.length && (
                <div className="border-t border-white/10 pt-5">
                  <h2 className="text-sm text-white/45">Organised by</h2>
                  <ul className="mt-4 space-y-3">
                    {e.hostLogos.map((h) => (
                      <li key={h.name} className="flex items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"><img src={h.logo} alt="" className="h-full w-full object-contain p-1" /></span>
                        <span className="text-sm font-medium text-white">{h.name}</span>
                      </li>
                    ))}
                    <li className="flex items-center gap-3 text-sm text-muted">Platform and on-the-day support by <span className="font-semibold text-lime">CyberHx</span></li>
                  </ul>
                </div>
              )}
              {!!links.length && (
                <div className="border-t border-white/10 pt-5">
                  <h2 className="text-sm text-white/45">Links</h2>
                  <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                    {links.map((l) => (
                      <li key={l.label}>
                        <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[15px] font-semibold text-white/80 transition hover:text-white">
                          {l.label} <ArrowUpRight size={15} className="text-lime" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>

          {/* Write-ups and posts about this event (blog posts tagged with it) */}
          <section id="writeups" aria-labelledby="writeups-h" className="mt-16 scroll-mt-28 border-t border-white/[0.07] pt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="writeups-h" className="font-display text-2xl text-white">{e.title} write-ups</h2>
                <p className="mt-1 text-white/50">
                  {writeups.length
                    ? 'How players solved the challenges, from the CyberHx blog.'
                    : e.status === 'completed'
                      ? `No write-ups yet. Played ${e.title}? Be the first to share how you solved a challenge.`
                      : isPrivate
                        ? 'Write-ups from players will show here after the event.'
                        : 'After the CTF, players can share how they solved each challenge. They will show up here.'}
                </p>
              </div>
              <Link to={`/blog/write?event=${e.slug}`} className="btn btn-ghost">Write a {e.title} write-up</Link>
            </div>
            {writeups.length > 0 && (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {writeups.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            )}
          </section>

          <section aria-labelledby="more-h" className="mt-16 border-t border-white/[0.07] pt-10">
            <div className="flex items-end justify-between gap-4">
              <h2 id="more-h" className="font-display text-2xl text-white">More CTFs by CyberHx</h2>
              <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white"><ArrowLeft size={15} /> All events</Link>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link to={`/events/${o.slug}`} className="sticker lift group block overflow-hidden">
                    <img src={o.image} alt="" loading="lazy" className="aspect-[969/431] w-full object-cover" />
                    <span className="block p-4">
                      <span className="block font-semibold text-white group-hover:text-lime">{o.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{o.date}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </>
  );
}
