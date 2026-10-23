// Dynamic XML sitemap: static pages + every published blog post.
// Served at /sitemap.xml via a rewrite in vercel.json. Google reads this to
// discover and re-crawl posts, so new posts show up without any manual step.

const SITE = 'https://cyberhx.com';

const STATIC: { path: string; priority: number; changefreq: string }[] = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/blog', priority: 0.9, changefreq: 'daily' },
  { path: '/host-your-ctf', priority: 0.9, changefreq: 'weekly' },
  { path: '/events', priority: 0.8, changefreq: 'weekly' },
  { path: '/certifications', priority: 0.8, changefreq: 'monthly' },
  { path: '/about', priority: 0.6, changefreq: 'monthly' },
  { path: '/contact', priority: 0.6, changefreq: 'monthly' },
  { path: '/collaborations', priority: 0.5, changefreq: 'monthly' },
  { path: '/hall-of-fame', priority: 0.5, changefreq: 'monthly' },
  { path: '/responsible-disclosure', priority: 0.5, changefreq: 'yearly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
];

const xmlEscape = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));

type Row = { slug: string; published_at: string | null; updated_at: string | null; cover_image: string | null };

async function posts(): Promise<Row[]> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/blog_posts?select=slug,published_at,updated_at,cover_image&status=eq.published&order=published_at.desc&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return [];
    return (await res.json()) as Row[];
  } catch {
    return [];
  }
}

export default async function handler(_req: any, res: any) {
  const rows = await posts();
  const today = new Date().toISOString().slice(0, 10);

  const urls = STATIC.map(
    (p) =>
      `  <url><loc>${SITE}${p.path}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
  );

  for (const p of rows) {
    const lastmod = (p.updated_at || p.published_at || '').slice(0, 10) || today;
    const img =
      p.cover_image && /^https?:\/\//.test(p.cover_image)
        ? `<image:image><image:loc>${xmlEscape(p.cover_image)}</image:loc></image:image>`
        : '';
    urls.push(
      `  <url><loc>${SITE}/blog/${xmlEscape(p.slug)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority>${img}</url>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
