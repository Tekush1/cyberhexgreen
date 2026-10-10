import { useEffect } from 'react';

/* Per-route SEO: sets title, meta description, canonical, Open Graph / Twitter,
   robots, and optional JSON-LD. The static tags in index.html are the defaults
   for the home page and for crawlers that don't run JS; this updates them for
   each client-rendered route. */

const SITE = 'https://cyberhx.com';
const DEFAULT_OG = `${SITE}/og-image.png`;

export interface SeoProps {
  title: string;              // full <title>; keep under ~60 chars of the brand part
  description: string;
  path: string;               // e.g. "/blog"
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  keywords?: string;
  jsonLd?: object | object[]; // extra structured data for this page
}

const upsertMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const MANAGED_LD = 'data-seo-jsonld';

export const Seo = ({ title, description, path, image, type = 'website', noindex, keywords, jsonLd }: SeoProps) => {
  useEffect(() => {
    const url = SITE + (path === '/' ? '/' : path.replace(/\/$/, ''));
    const img = image || DEFAULT_OG;

    document.title = title;
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
    if (keywords) upsertMeta('meta[name="keywords"]', 'name', 'keywords', keywords);
    upsertLink('canonical', url);

    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', img);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', img);

    // Replace any page-managed JSON-LD from a previous route.
    document.head.querySelectorAll(`script[${MANAGED_LD}]`).forEach((n) => n.remove());
    const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    blocks.forEach((block) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute(MANAGED_LD, 'true');
      s.textContent = JSON.stringify(block);
      document.head.appendChild(s);
    });

    return () => {
      document.head.querySelectorAll(`script[${MANAGED_LD}]`).forEach((n) => n.remove());
    };
  }, [title, description, path, image, type, noindex, keywords, jsonLd]);

  return null;
};

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: SITE + (it.path === '/' ? '/' : it.path),
  })),
});

export { SITE };
export default Seo;
