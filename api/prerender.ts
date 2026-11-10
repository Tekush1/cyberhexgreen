// Server-rendered HTML for the blog, served ONLY to crawlers and link-preview
// bots (Google, Bing, WhatsApp, Twitter, LinkedIn, Slack, Facebook, …) via a
// user-agent rewrite in vercel.json. Humans always get the normal React app.
//
// Why: those bots don't run JavaScript, so without this they'd see an empty
// shell. This returns the real title, description, cover image, structured
// data and the text, so every page gets indexed and share cards work:
//   ?slug=<post>        one post                      (/blog/<slug>)
//   ?slug=<section>     a section listing             (/blog/news, /blog/writeups, …)
//   ?slug=writers       every writer                  (/blog/writers)
//   ?page=blog          the blog hub                  (/blog)
//   ?author=<slug>      one writer and their posts    (/blog/author/<slug>)

import { BLOG_SECTIONS, blogSection, sectionForCategory, type BlogSection } from '../shared/blogSections.js';
import { events } from '../src/data/events.js';

const eventTitle = (slug: string) => events.find((e) => e.slug === slug)?.title || slug.replace(/-/g, ' ');

const SITE = 'https://cyberhx.com';

const esc = (s: string) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c] as string));

// Minimal, safe markdown -> HTML for crawlers. Everything is escaped first, so
// any HTML/script a writer pasted is shown as text, never executed.
/** JSON for a <script> block: escape '<' so field values can't close the tag. */
const ld = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function mdToHtml(md: string): string {
  const lines = esc(md).replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inCode = false;
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  const inline = (t: string) =>
    t
      // Images and links in ONE pass (generated HTML is never scanned again), and URLs can't contain
      // quotes, brackets or escaped quotes, so nothing can break out of the src/href attribute.
      .replace(/(!?)\[([^\]]*)\]\(([^\s()[\]<>"']+)[^)]*\)/g, (_m, bang, a, u) => {
        if (/&(quot|#39|lt|gt);/.test(u)) return bang ? '' : a;
        if (bang) return /^https?:\/\//.test(u) ? `<img src="${u}" alt="${a}" loading="lazy">` : '';
        return /^https?:\/\/|^\//.test(u) && a ? `<a href="${u}" rel="nofollow">${a}</a>` : a;
      })
      // Bold/italic/code only in the text between tags, never inside a generated src/href.
      .split(/(<[^>]+>)/)
      .map((part) => (part.startsWith('<') ? part : part
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')))
      .join('');

  for (const raw of lines) {
    const line = raw;
    if (/^```/.test(line.trim())) {
      closeList();
      if (!inCode) { out.push('<pre><code>'); inCode = true; } else { out.push('</code></pre>'); inCode = false; }
      continue;
    }
    if (inCode) { out.push(line); continue; }
    if (!line.trim()) { closeList(); continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { closeList(); const n = Math.min(Math.max(h[1].length, 2), 4); out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
    if (/^>\s?/.test(line)) { closeList(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); continue; }
    if (/^[-*]\s+/.test(line)) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`); continue; }
    if (/^\d+\.\s+/.test(line)) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`); continue; }
    if (/^(---|\*\*\*)\s*$/.test(line)) { closeList(); out.push('<hr>'); continue; }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inCode) out.push('</code></pre>');
  closeList();
  return out.join('\n');
}

type Post = {
  title: string; slug: string; excerpt: string; content: string; cover_image: string;
  category: string; tags: string[]; author_name: string; published_at: string | null;
  updated_at: string | null; read_time: number; author_slug?: string | null; event_slug?: string | null;
  first_image?: string | null; views?: number;
};

const norm = (t: string) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isAnon = (n: string) => !n || /^(anon|anonymous|unknown)$/i.test(n.trim());
/** Drop a first line that only repeats the title (the page already has it as the <h1>). */
const stripTitle = (md: string, title: string) => {
  const m = /^\s*(?:#{1,2}\s+)?([^\n]+)\n+/.exec(md);
  return m && norm(m[1]) === norm(title) ? md.slice(m[0].length) : md;
};
const firstParagraph = (md: string) =>
  (md.replace(/```[\s\S]*?```/g, '').split(/\n{2,}/).map((x) => x.trim()).find((x) => x && !/^(#|!\[|>|-|\*|\d+\.)/.test(x)) || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '').replace(/\s+/g, ' ').trim().slice(0, 280);

/** One REST read from Supabase as the public (anon) role; null when unreachable. */
async function sb<T>(path: string): Promise<T | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getPost(slug: string): Promise<Post | null> {
  const rows = await sb<Post[]>(`blog_posts?select=*&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`);
  return rows?.[0] || null;
}

type Card = Pick<Post, 'title' | 'slug' | 'excerpt' | 'category' | 'author_name' | 'author_slug' | 'published_at' | 'read_time' | 'event_slug' | 'cover_image' | 'first_image' | 'views'> & { difficulty: string | null };
const CARD = 'title,slug,excerpt,category,author_name,author_slug,published_at,read_time,event_slug,cover_image,first_image,views,difficulty';
/** The picture for a post: its cover, else the first image in its text (absolute URLs only). */
const imageOf = (p: { cover_image?: string; first_image?: string | null }) => [p.cover_image, p.first_image].find((u) => u && /^https?:\/\//.test(u)) || undefined;
const inList = (xs: string[]) => `in.(${xs.map((x) => `"${x.replace(/"/g, '')}"`).join(',')})`;

const listCards = (filter: string, limit = 120, order = 'published_at.desc') =>
  sb<Card[]>(`blog_posts?select=${CARD}&status=eq.published&${filter}&order=${order}&limit=${limit}`);

type Writer = { slug: string; name: string; role: string | null; bio: string | null; url: string | null; avatar: string | null; posts: number; views: number; likes: number };
const listWriters = (filter = '', limit = 300) =>
  sb<Writer[]>(`blog_authors?select=slug,name,role,bio,url,avatar,posts,views,likes${filter ? `&${filter}` : ''}&order=posts.desc,likes.desc&limit=${limit}`);

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const authorLink = (c: Pick<Card, 'author_name' | 'author_slug'>) =>
  c.author_slug && !isAnon(c.author_name) ? `<a href="${SITE}/blog/author/${esc(c.author_slug)}">${esc(c.author_name)}</a>` : esc(isAnon(c.author_name) ? 'Anonymous contributor' : c.author_name);
const cardLd = (c: Card) => ({
  '@type': 'BlogPosting',
  headline: c.title,
  url: `${SITE}/blog/${c.slug}`,
  datePublished: c.published_at || undefined,
  author: { '@type': 'Person', name: isAnon(c.author_name) ? 'Anonymous contributor' : c.author_name },
  image: imageOf(c),
  articleSection: c.category,
});

/** A list of posts as plain, crawlable HTML. */
const cardsHtml = (cards: Card[]) =>
  cards.length
    ? `<ol>${cards
        .map(
          (c) => `<li><article><h3><a href="${SITE}/blog/${esc(c.slug)}">${esc(c.title)}</a></h3>${
            c.excerpt && norm(c.excerpt) !== norm(c.title) ? `<p>${esc(c.excerpt)}</p>` : ''
          }<p>By ${authorLink(c)}${c.published_at ? ` · ${fmtDate(c.published_at)}` : ''} · ${Number(c.read_time) || 1} min read · ${esc(c.category)}${
            c.difficulty ? ` · ${esc(c.difficulty)}` : ''
          }</p></article></li>`,
        )
        .join('')}</ol>`
    : '<p>Nothing published here yet.</p>';

const sectionsNav = (current?: string) =>
  `<nav aria-label="Blog sections"><ul><li>${current ? `<a href="${SITE}/blog">All posts</a>` : '<strong>All posts</strong>'}</li>${BLOG_SECTIONS.map(
    (s) => `<li>${s.slug === current ? `<strong>${esc(s.name)}</strong>` : `<a href="${SITE}/blog/${s.slug}">${esc(s.name)}</a>`}</li>`,
  ).join('')}<li>${current === 'writers' ? '<strong>Writers</strong>' : `<a href="${SITE}/blog/writers">Writers</a>`}</li></ul></nav>`;

const head = (o: { title: string; desc: string; canonical: string; ld: unknown[]; image?: string; type?: string }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${o.canonical}">
<meta property="og:type" content="${o.type || 'website'}">
<meta property="og:site_name" content="CyberHx">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${o.canonical}">
<meta property="og:image" content="${esc(o.image || `${SITE}/og-image.png`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
<meta name="twitter:image" content="${esc(o.image || `${SITE}/og-image.png`)}">
${o.ld.map((x) => `<script type="application/ld+json">${ld(x)}</script>`).join('\n')}
</head>
<body>`;

const crumbs = (items: { name: string; url: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
});
const crumbsHtml = (items: { name: string; url: string }[]) =>
  `<nav aria-label="Breadcrumb">${items.map((it, i) => (i === items.length - 1 ? esc(it.name) : `<a href="${it.url}">${esc(it.name)}</a>`)).join(' › ')}</nav>`;

/** Group cards by a key, biggest group first. */
const group = (cards: Card[], key: (c: Card) => string | null) => {
  const m = new Map<string, Card[]>();
  for (const c of cards) {
    const k = key(c);
    if (k) m.set(k, [...(m.get(k) || []), c]);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};

/** /blog — the hub: the newest posts, every section, the top writers. */
async function hubPage(): Promise<string> {
  const [cards, writers] = await Promise.all([listCards('', 60), listWriters('', 12)]);
  const canonical = `${SITE}/blog`;
  const title = 'CyberHx Blog — CTF Write-ups, News, Tutorials and Security Research';
  const desc = 'Write-ups, news, tutorials, scam alerts and research from the CyberHx community in 90+ countries. Learn, practice and stay ahead.';
  const blogLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'CyberHx Blog',
    url: canonical,
    description: desc,
    publisher: { '@type': 'Organization', name: 'CyberHx', url: SITE },
    blogPost: (cards || []).slice(0, 30).map(cardLd),
  };
  return `${head({ title, desc, canonical, ld: [blogLd, crumbs([{ name: 'Home', url: SITE + '/' }, { name: 'Blog', url: canonical }])] })}
<main>
${crumbsHtml([{ name: 'Home', url: SITE + '/' }, { name: 'Blog', url: canonical }])}
<h1>CyberHx Blog</h1>
<p>${esc(desc)}</p>
${sectionsNav()}
<h2>Sections</h2>
<ul>${BLOG_SECTIONS.map((s) => `<li><a href="${SITE}/blog/${s.slug}">${esc(s.name)}</a> — ${esc(s.lead)}</li>`).join('')}</ul>
<h2>Latest posts</h2>
${cardsHtml(cards || [])}
${writers?.length ? `<h2>Top writers</h2><ul>${writers.map((w) => `<li><a href="${SITE}/blog/author/${esc(w.slug)}">${esc(w.name)}</a>${w.role ? ` — ${esc(w.role)}` : ''} · ${w.posts} ${w.posts === 1 ? 'post' : 'posts'}</li>`).join('')}</ul><p><a href="${SITE}/blog/writers">All writers</a></p>` : ''}
<p><a href="${SITE}/blog/write">Write for CyberHx</a></p>
</main>
</body>
</html>`;
}

/** /blog/<section> — one section's posts; write-ups also grouped by event and by writer. */
async function sectionPage(s: BlogSection): Promise<string> {
  // Write-ups list the most read first, like the page itself.
  const cards = (await listCards(`category=${inList(s.categories)}`, 200, s.slug === 'writeups' ? 'views.desc,published_at.desc' : 'published_at.desc')) || [];
  const canonical = `${SITE}/blog/${s.slug}`;
  const ldList = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${s.name} · CyberHx Blog`,
    url: canonical,
    description: s.description,
    isPartOf: { '@type': 'Blog', name: 'CyberHx Blog', url: `${SITE}/blog` },
    hasPart: cards.slice(0, 50).map(cardLd),
  };
  const path = [{ name: 'Home', url: SITE + '/' }, { name: 'Blog', url: `${SITE}/blog` }, { name: s.name, url: canonical }];
  let grouped = '';
  if (s.slug === 'writeups' && cards.length) {
    const byEvent = group(cards, (c) => c.event_slug || null);
    const byWriter = group(cards, (c) => (c.author_slug && !isAnon(c.author_name) ? c.author_slug : null));
    const li = (c: Card) => `<li><a href="${SITE}/blog/${esc(c.slug)}">${esc(c.title)}</a>${c.difficulty ? ` · ${esc(c.difficulty)}` : ''}</li>`;
    if (byEvent.length)
      grouped += `<h2>Write-ups by event</h2>${byEvent
        .map(([ev, list]) => `<h3><a href="${SITE}/events/${esc(ev)}">${esc(eventTitle(ev))}</a> · ${list.length} ${list.length === 1 ? 'write-up' : 'write-ups'}</h3><ul>${list.map(li).join('')}</ul>`)
        .join('')}`;
    if (byWriter.length)
      grouped += `<h2>Write-ups by writer</h2>${byWriter
        .map(([slug, list]) => `<h3><a href="${SITE}/blog/author/${esc(slug)}">${esc(list[0].author_name)}</a> · ${list.length} ${list.length === 1 ? 'write-up' : 'write-ups'}</h3><ul>${list.map(li).join('')}</ul>`)
        .join('')}`;
  }
  return `${head({ title: s.title, desc: s.description, canonical, ld: [ldList, crumbs(path)] })}
<main>
${crumbsHtml(path)}
<h1>${esc(s.name)}</h1>
<p>${esc(s.lead)}</p>
${sectionsNav(s.slug)}
<h2>Latest ${esc(s.name.toLowerCase())}</h2>
${cardsHtml(cards)}
${grouped}
<p><a href="${SITE}/blog/write">Write for CyberHx</a> · <a href="${SITE}/blog">All posts</a></p>
</main>
</body>
</html>`;
}

/** /blog/writers — everyone who has published. */
async function writersPage(): Promise<string> {
  const writers = (await listWriters()) || [];
  const canonical = `${SITE}/blog/writers`;
  const title = 'Writers — CyberHx Blog';
  const desc = 'The people writing for the CyberHx blog: CTF players, researchers and students from around the world, with every write-up and article they have published.';
  const path = [{ name: 'Home', url: SITE + '/' }, { name: 'Blog', url: `${SITE}/blog` }, { name: 'Writers', url: canonical }];
  const pageLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Writers · CyberHx Blog',
    url: canonical,
    description: desc,
    hasPart: writers.slice(0, 100).map((w) => ({ '@type': 'ProfilePage', name: w.name, url: `${SITE}/blog/author/${w.slug}` })),
  };
  return `${head({ title, desc, canonical, ld: [pageLd, crumbs(path)] })}
<main>
${crumbsHtml(path)}
<h1>Writers</h1>
<p>${esc(desc)}</p>
${sectionsNav('writers')}
${writers.length ? `<ul>${writers.map((w) => `<li><a href="${SITE}/blog/author/${esc(w.slug)}">${esc(w.name)}</a>${w.role ? ` — ${esc(w.role)}` : ''} · ${w.posts} ${w.posts === 1 ? 'post' : 'posts'}</li>`).join('')}</ul>` : '<p>No writers yet.</p>'}
<p><a href="${SITE}/blog/write">Write for CyberHx</a></p>
</main>
</body>
</html>`;
}

/** /blog/author/<slug> — one writer and everything they have published. */
async function authorPage(slug: string, res: any): Promise<string> {
  const [writers, cards] = await Promise.all([listWriters(`slug=eq.${encodeURIComponent(slug)}`, 1), listCards(`author_slug=eq.${encodeURIComponent(slug)}`, 200)]);
  const w = writers?.[0];
  if (!w) {
    res.status(404);
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Writer not found · CyberHx Blog</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/blog/writers"></head><body>Writer not found. <a href="${SITE}/blog/writers">See all writers</a>.</body></html>`;
  }
  const canonical = `${SITE}/blog/author/${esc(w.slug)}`;
  const title = `${w.name} — Writer at CyberHx`;
  const desc = (w.bio || `${w.name}${w.role ? `, ${w.role}` : ''} has published ${w.posts} ${w.posts === 1 ? 'post' : 'posts'} on the CyberHx blog.`).slice(0, 300);
  const path = [{ name: 'Home', url: SITE + '/' }, { name: 'Blog', url: `${SITE}/blog` }, { name: 'Writers', url: `${SITE}/blog/writers` }, { name: w.name, url: canonical }];
  const profileLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: canonical,
    mainEntity: {
      '@type': 'Person',
      name: w.name,
      ...(w.role ? { jobTitle: w.role } : {}),
      ...(w.bio ? { description: w.bio } : {}),
      ...(w.avatar && /^https?:\/\//.test(w.avatar) ? { image: w.avatar } : {}),
      ...(w.url ? { sameAs: [w.url] } : {}),
      url: canonical,
    },
    hasPart: (cards || []).slice(0, 50).map(cardLd),
  };
  return `${head({ title, desc, canonical, ld: [profileLd, crumbs(path)], image: w.avatar && /^https?:\/\//.test(w.avatar) ? w.avatar : undefined, type: 'profile' })}
<main>
${crumbsHtml(path)}
<h1>${esc(w.name)}</h1>
${w.role ? `<p>${esc(w.role)}</p>` : ''}
${w.bio ? `<p>${esc(w.bio)}</p>` : ''}
<p>${w.posts} ${w.posts === 1 ? 'post' : 'posts'} · ${w.views} reads · ${w.likes} likes${w.url ? ` · <a href="${esc(w.url)}" rel="nofollow noopener">${esc(w.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''}</p>
<h2>Posts by ${esc(w.name)}</h2>
${cardsHtml(cards || [])}
<p><a href="${SITE}/blog/writers">All writers</a> · <a href="${SITE}/blog">All posts</a></p>
</main>
</body>
</html>`;
}

export default async function handler(req: any, res: any) {
  const slug = String(req.query?.slug || '').replace(/[^a-z0-9-]/gi, '');
  const page = String(req.query?.page || '').replace(/[^a-z]/gi, '');
  const author = String(req.query?.author || '').replace(/[^a-z0-9-]/gi, '');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=86400');
  res.setHeader('Vary', 'User-Agent');

  // Listing pages: the hub, a section, every writer, one writer.
  if (page === 'blog') { res.status(200).send(await hubPage()); return; }
  if (author) { res.send(await authorPage(author, res)); return; }
  const section = blogSection(slug);
  if (section) { res.status(200).send(await sectionPage(section)); return; }
  if (slug === 'writers') { res.status(200).send(await writersPage()); return; }

  // /blog/feedback is a page, not a post: give link previews its own title instead of "Post not found".
  if (slug === 'feedback') {
    const t = 'Pinaka CTF 2026 Feedback — CyberHx';
    const d = '24 hours of Pinaka CTF 2026. Tell us which challenge you loved, how the platform felt, and whether you want more events on CyberHx.';
    res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${t}</title><meta name="description" content="${d}"><link rel="canonical" href="${SITE}/blog/feedback"><meta property="og:type" content="website"><meta property="og:site_name" content="CyberHx"><meta property="og:title" content="${t}"><meta property="og:description" content="${d}"><meta property="og:url" content="${SITE}/blog/feedback"><meta property="og:image" content="${SITE}/og-image.png"><meta name="twitter:card" content="summary_large_image"></head><body><h1>24 hours. Your verdict.</h1><p>${d}</p><p><a href="${SITE}/blog">Visit the CyberHx blog</a></p></body></html>`);
    return;
  }

  const post = await getPost(slug);
  const canonical = `${SITE}/blog/${slug}`;

  if (!post) {
    // Unknown slug: give the crawler a valid page that points at the canonical URL.
    res.status(404).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Post not found · CyberHx Blog</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/blog"></head><body>Post not found. <a href="${SITE}/blog">Visit the CyberHx blog</a>.</body></html>`);
    return;
  }

  const img = imageOf(post) || `${SITE}/og-image.png`;
  post.content = stripTitle(post.content, post.title);
  if (!post.excerpt || norm(post.excerpt) === norm(post.title)) post.excerpt = firstParagraph(post.content);
  const desc = (post.excerpt || `${post.title} — a ${post.category} post on the CyberHx cybersecurity blog.`).slice(0, 300);
  const authorName = isAnon(post.author_name) ? 'Anonymous contributor' : post.author_name;
  const authorUrl = post.author_slug && !isAnon(post.author_name) ? `${SITE}/blog/author/${post.author_slug}` : '';
  const home = sectionForCategory(post.category);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: [img],
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: { '@type': 'Person', name: authorName, ...(authorUrl ? { url: authorUrl } : {}) },
    publisher: { '@type': 'Organization', name: 'CyberHx', logo: { '@type': 'ImageObject', url: `${SITE}/og-image.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    articleSection: post.category,
    keywords: (post.tags || []).join(', ') || undefined,
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog' },
      ...(home ? [{ '@type': 'ListItem', position: 3, name: home.name, item: `${SITE}/blog/${home.slug}` }] : []),
      { '@type': 'ListItem', position: home ? 4 : 3, name: post.title, item: canonical },
    ],
  };

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(post.title)} · CyberHx Blog</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="CyberHx">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${esc(img)}">
<meta property="article:section" content="${esc(post.category)}">
${post.published_at ? `<meta property="article:published_time" content="${esc(post.published_at)}">` : ''}
${(post.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('')}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(post.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${ld(jsonLd)}</script>
<script type="application/ld+json">${ld(breadcrumb)}</script>
</head>
<body>
<article>
<nav><a href="${SITE}/">Home</a> › <a href="${SITE}/blog">Blog</a> › ${home ? `<a href="${SITE}/blog/${home.slug}">${esc(home.name)}</a>` : esc(post.category)}</nav>
<h1>${esc(post.title)}</h1>
<p>By ${authorUrl ? `<a href="${authorUrl}">${esc(authorName)}</a>` : esc(authorName)} · ${Number(post.read_time) || 1} min read</p>
${post.event_slug && /^[a-z0-9-]+$/.test(post.event_slug) ? `<p>About the CTF: <a href="${SITE}/events/${post.event_slug}">${esc(eventTitle(post.event_slug))}</a></p>` : ''}
${post.excerpt ? `<p>${esc(post.excerpt)}</p>` : ''}
<img src="${esc(img)}" alt="${esc(post.title)}" width="1200">
${mdToHtml(post.content)}
<p><a href="${canonical}">Read this post on CyberHx →</a></p>
</article>
</body>
</html>`;

  res.status(200).send(html);
}
