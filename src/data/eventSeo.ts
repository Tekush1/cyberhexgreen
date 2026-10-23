// Search-engine copy and structured data for an event page. Shared by the React page (/events/:slug)
// and the server-rendered copy crawlers get (api/event-page.ts), so both always say the same thing.
import type { Event } from './events.js';

export const SITE = 'https://cyberhx.com';
export const eventUrl = (e: Event) => `${SITE}/events/${e.slug}`;
export const absImage = (src: string) => (/^https?:\/\//.test(src) ? src : `${SITE}${src.startsWith('/') ? '' : '/'}${src}`);

const year = (e: Event) => (e.startDate.match(/^\d{4}/) || [''])[0];
const isPrivate = (e: Event) => e.entry === 'Private';

/** "Pinaka CTF 2026 · NFSU Chennai | CyberHx" — event name first, so a search for the name matches. */
export function eventTitle(e: Event) {
  const y = year(e);
  const name = y && !e.title.includes(y) ? `${e.title} ${y}` : e.title;
  return `${name}: ${e.status === 'completed' ? 'results, leaderboard & certificates' : isPrivate(e) ? 'private CTF' : 'dates, registration & details'} | CyberHx`;
}

export function eventDescription(e: Event) {
  const when = e.date;
  const bits = [
    `${e.title}${year(e) && !e.title.includes(year(e)) ? ` ${year(e)}` : ''}: ${e.subtitle.replace(/\.$/, '')}.`,
    `${e.status === 'completed' ? 'Held' : 'On'} ${when}${e.duration ? `, ${e.duration.toLowerCase()}` : ''}.`,
    e.status === 'completed' ? `${e.participants.replace(/\s*hackers?/i, '')} players.` : isPrivate(e) ? 'Private event, invite only.' : e.entry ? `${e.entry} entry, registrations open.` : '',
    e.prize ? `${e.prize.replace(/\s*rewards?$/i, '')} in prizes.` : '',
    'Hosted on CyberHx.',
  ];
  return bits.filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 300);
}

export function eventKeywords(e: Event) {
  return [...(e.searchTerms || []), e.title, `${e.title} ${year(e)}`, 'CTF', 'capture the flag', 'CyberHx', ...e.tags].join(', ');
}

export function eventJsonLd(e: Event) {
  const online = /online/i.test(e.location);
  const venue = e.venue;
  const mode = online && venue ? 'MixedEventAttendanceMode' : venue ? 'OfflineEventAttendanceMode' : 'OnlineEventAttendanceMode';
  const virtual = { '@type': 'VirtualLocation', url: e.link || e.social?.website || eventUrl(e) };
  const place = venue ? { '@type': 'Place', name: venue, address: { '@type': 'PostalAddress', addressLocality: e.venueCity || '', addressCountry: 'IN' } } : null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    alternateName: e.searchTerms?.slice(0, 3),
    description: e.description,
    url: eventUrl(e),
    image: [absImage(e.image)],
    startDate: e.startDate,
    ...(e.endDate ? { endDate: e.endDate } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: `https://schema.org/${mode}`,
    location: place ? (online ? [virtual, place] : place) : virtual,
    organizer: (e.organizers || [{ name: 'CyberHx', url: SITE }]).map((o) => ({ '@type': 'Organization', name: o.name, ...(o.url ? { url: o.url } : {}) })),
    ...(e.status !== 'completed' && e.register && !isPrivate(e)
      ? { offers: { '@type': 'Offer', url: e.register, availability: 'https://schema.org/InStock', validFrom: '2026-09-01' } }
      : {}),
    keywords: eventKeywords(e),
  };
}

export function eventBreadcrumb(e: Event) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Events', item: `${SITE}/events` },
      { '@type': 'ListItem', position: 3, name: e.title, item: eventUrl(e) },
    ],
  };
}
