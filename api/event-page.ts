// Server-rendered event pages (/events/:slug) for crawlers and link-preview bots only, via a
// user-agent rewrite in vercel.json (same idea as api/prerender.ts for blog posts). People always
// get the React page. Title, description and Event structured data come from src/data/eventSeo.ts,
// so this copy always matches what the React page says.

import { eventBySlug, events, entryLabel, hasCount, playersText } from '../src/data/events.js';
import { absImage, eventBreadcrumb, eventDescription, eventJsonLd, eventKeywords, eventTitle, eventUrl, SITE } from '../src/data/eventSeo.js';

const esc = (s: string) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c] as string));
const ld = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export default function handler(req: any, res: any) {
  const slug = String(req.query?.slug || '').toLowerCase();
  const e = eventBySlug(slug);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Vary', 'User-Agent');
  if (!e) {
    return res.status(404).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Event not found · CyberHx</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/events"></head><body>Event not found. <a href="${SITE}/events">See all CyberHx events</a>.</body></html>`);
  }
  const title = eventTitle(e);
  const desc = eventDescription(e);
  const url = eventUrl(e);
  const img = absImage(e.image);
  const facts = [
    ['Date', e.date], ['Duration', e.duration], [hasCount(e) ? 'Players' : 'Entry', hasCount(e) ? playersText(e) : entryLabel(e) || e.participants],
    ['Prizes', e.prize], ['Where', e.location],
  ].filter(([, v]) => v);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(eventKeywords(e))}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CyberHx">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${ld(eventJsonLd(e))}</script>
<script type="application/ld+json">${ld(eventBreadcrumb(e))}</script>
</head>
<body>
<article>
<nav><a href="${SITE}/">Home</a> › <a href="${SITE}/events">Events</a> › ${esc(e.title)}</nav>
<h1>${esc(e.title)}</h1>
<p>${esc(e.subtitle)}</p>
<img src="${esc(img)}" alt="${esc(e.title)} artwork" width="969" height="431">
<dl>${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
<h2>About ${esc(e.title)}</h2>
<p>${esc(e.description)}</p>
${e.highlights?.length ? `<ul>${e.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
<p>Categories: ${e.tags.map(esc).join(', ')}</p>
${e.register && e.status !== 'completed' && e.entry !== 'Private' ? `<p><a href="${esc(e.register)}">Register for ${esc(e.title)}</a></p>` : ''}
${e.social?.leaderboard ? `<p><a href="${esc(e.social.leaderboard)}">${esc(e.title)} leaderboard</a></p>` : ''}
<h2>More CTFs by CyberHx</h2>
<ul>${events.filter((x) => x.slug !== e.slug).map((x) => `<li><a href="${SITE}/events/${x.slug}">${esc(x.title)}</a> · ${esc(x.date)}</li>`).join('')}</ul>
<p><a href="${SITE}/host-your-ctf">Host your own CTF with CyberHx</a></p>
</article>
</body>
</html>`;
  return res.status(200).send(html);
}
