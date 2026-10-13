// Server-rendered HTML for blog posts, served ONLY to crawlers and link-preview
// bots (Google, Bing, WhatsApp, Twitter, LinkedIn, Slack, Facebook, …) via a
// user-agent rewrite in vercel.json. Humans always get the normal React app.
//
// Why: those bots don't run JavaScript, so without this they'd see an empty
// shell. This returns the real title, description, cover image, Article
// structured data and the post text, so posts get indexed and share cards work.

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
      .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, a, u) => (/^https?:\/\//.test(u) ? `<img src="${u}" alt="${a}" loading="lazy">` : ''))
      .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_m, a, u) => (/^https?:\/\/|^\//.test(u) ? `<a href="${u}" rel="nofollow">${a}</a>` : a))
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>');

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
  updated_at: string | null; read_time: number;
};

async function getPost(slug: string): Promise<Post | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/blog_posts?select=title,slug,excerpt,content,cover_image,category,tags,author_name,published_at,updated_at,read_time&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Post[];
    return rows[0] || null;
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  const slug = String(req.query?.slug || '').replace(/[^a-z0-9-]/gi, '');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=86400');

  const post = await getPost(slug);
  const canonical = `${SITE}/blog/${slug}`;

  if (!post) {
    // Unknown slug: give the crawler a valid page that points at the canonical URL.
    res.status(404).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Post not found · CyberHx Blog</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/blog"></head><body>Post not found. <a href="${SITE}/blog">Visit the CyberHx blog</a>.</body></html>`);
    return;
  }

  const img = post.cover_image && /^https?:\/\//.test(post.cover_image) ? post.cover_image : `${SITE}/og-image.png`;
  const desc = (post.excerpt || `${post.title} — a ${post.category} post on the CyberHx cybersecurity blog.`).slice(0, 300);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: [img],
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: { '@type': 'Person', name: post.author_name },
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
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
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
<nav><a href="${SITE}/">Home</a> › <a href="${SITE}/blog">Blog</a> › <a href="${SITE}/blog?category=${encodeURIComponent(post.category)}">${esc(post.category)}</a></nav>
<h1>${esc(post.title)}</h1>
<p>By ${esc(post.author_name)} · ${Number(post.read_time) || 1} min read</p>
${post.excerpt ? `<p>${esc(post.excerpt)}</p>` : ''}
<img src="${esc(img)}" alt="${esc(post.title)}" width="1200">
${mdToHtml(post.content)}
<p><a href="${canonical}">Read this post on CyberHx →</a></p>
</article>
</body>
</html>`;

  res.setHeader('Vary', 'User-Agent');
  res.status(200).send(html);
}
