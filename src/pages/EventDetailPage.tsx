import { Link, useParams } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Award, Calendar, ChevronRight, Clock, Flag, Globe, Instagram, Linkedin, ListOrdered, Lock, MapPin, Trophy, Twitter, Users } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { entryLabel, eventBySlug, events, hasCount, playersText, type Event } from '../data/events';
import { absImage, eventBreadcrumb, eventDescription, eventJsonLd, eventKeywords, eventTitle } from '../data/eventSeo';
import NotFoundPage from './NotFoundPage';
import { postsForEvent, type PostCard as Card } from '../features/blog/api';
import { PostCard } from '../features/blog/PostCard';

/* /events/:slug — one page per CTF, so a search for the event's name lands here.
   Data: src/data/events.ts. Crawlers get a server-rendered copy from api/event-page.ts. */

const statusPill = (e: Event) =>
  e.status === 'live'
    ? { text: 'Live now', cls: 'bg-red-500/10 text-red-300 ring-red-400/30' }
    : e.status === 'upcoming'
      ? { text: e.entry === 'Private' ? 'Upcoming · private' : 'Upcoming', cls: 'bg-amber-400/10 text-amber-200 ring-amber-300/30' }
      : { text: 'Completed', cls: 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/30' };

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted">{icon}{label}</dt>
      <dd className="mt-1.5 font-semibold leading-6 text-white">{value}</dd>
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

  const pill = statusPill(e);
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
    { href: e.social?.website, label: 'Website', icon: <Globe size={15} /> },
    { href: e.social?.leaderboard, label: 'Leaderboard', icon: <ListOrdered size={15} /> },
    { href: e.social?.certificates, label: 'Certificates', icon: <Award size={15} /> },
    { href: e.social?.ctftime, label: 'CTFtime', icon: <Flag size={15} /> },
    { href: e.social?.instagram, label: 'Instagram', icon: <Instagram size={15} /> },
    { href: e.social?.x, label: 'X', icon: <Twitter size={15} /> },
    { href: e.social?.linkedin, label: 'LinkedIn', icon: <Linkedin size={15} /> },
  ].filter((l) => l.href && l.href !== primary?.href);

  const facts = [
    { icon: <Calendar size={13} />, label: 'Date', value: e.date },
    e.duration && { icon: <Clock size={13} />, label: 'Duration', value: e.duration },
    { icon: <Users size={13} />, label: hasCount(e) ? 'Players' : 'Entry', value: hasCount(e) ? playersText(e) : entryLabel(e) || e.participants },
    e.prize && { icon: <Trophy size={13} />, label: 'Prizes', value: e.prize },
    { icon: <MapPin size={13} />, label: 'Where', value: e.location },
  ].filter(Boolean) as { icon: ReactNode; label: string; value: string }[];

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
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ring-1 ${pill.cls}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />{pill.text}
              </span>
              <h1 className="font-display mt-4 text-4xl leading-[1.02] text-white sm:text-6xl">
                {e.title}{year && !e.title.includes(year) ? <span className="text-white/40"> {year}</span> : null}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-8 text-muted">{e.subtitle}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                {primary && (
                  <a href={primary.href} target="_blank" rel="noopener noreferrer" className="btn btn-lime">
                    {primary.label} <ArrowUpRight size={16} />
                  </a>
                )}
                {isPrivate && (
                  <span className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-white/80">
                    <Lock size={15} /> Private event · invite only
                  </span>
                )}
                <Link to="/host-your-ctf" className="btn btn-ghost">Host a CTF like this</Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
              <img src={e.image} alt={`${e.title} artwork`} className="aspect-[969/431] w-full object-cover" />
            </div>
          </header>

          <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
              <h3 className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-muted">Categories</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {e.tags.map((t) => <li key={t} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-xs text-white/80">{t}</li>)}
              </ul>
            </section>

            <aside className="space-y-5">
              {!!e.hostLogos?.length && (
                <div className="sticker p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Organised by</h2>
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
                <div className="sticker p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Links</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {links.map((l) => (
                      <li key={l.label}>
                        <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-sm text-white/85 transition hover:border-white/30 hover:text-white">
                          {l.icon}{l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>

          {/* Write-ups and posts about this event (blog posts tagged with it) */}
          <section aria-labelledby="writeups-h" className="mt-16 border-t border-white/[0.07] pt-10">
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
