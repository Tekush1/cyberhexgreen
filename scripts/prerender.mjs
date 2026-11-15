// Writes a real HTML page for each public route into dist/, using the server render in
// dist-ssr/entry-server.js. Crawlers get the content; browsers start the app as usual
// (createRoot replaces the prerendered markup). Unknown routes fall back to
// dist/app-shell.html (see vercel.json). A page that fails to render is skipped, never
// failing the build: it simply keeps the empty app shell.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = path.resolve('dist');
const SITE = 'https://cyberhx.com';
// Language alternates are added per page below; drop any left from an earlier run of this script.
const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').replace(/\s*<link rel="alternate" hreflang="(?!en"|x-default")[^"]*" href="[^"]*"\s*\/?>/g, '');
fs.writeFileSync(path.join(DIST, 'app-shell.html'), shell);

const { render, events, translateTree, LANGS, TRANSLATED_PAGES, LANG_TAGS, OG_LOCALES, RTL, localize } = await import(pathToFileURL(path.resolve('dist-ssr/entry-server.js')).href);
const { parseHTML } = await import('linkedom');
const dicts = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(fs.readFileSync(path.resolve(`src/i18n/dict/${l}.json`), 'utf8'))]));
const TRANSLATED = new Set(TRANSLATED_PAGES);

// Not /blog or its sections: their content comes from Supabase at request time, so crawlers get them from
// api/prerender.ts (vercel.json rewrites) instead of a build-time snapshot with empty lists.
const routes = [
  '/', '/events', '/host-your-ctf', '/pricing', '/academy', '/certifications', '/universities', '/companies', '/ambassadors', '/about', '/contact',
  '/reviews', '/collaborations', '/hall-of-fame', '/responsible-disclosure', '/privacy', '/terms',
  ...events.map((e) => `/events/${e.slug}`),
  // The translated marketing pages (src/i18n): /es, /es/pricing, …
  ...LANGS.flatMap((l) => TRANSLATED_PAGES.map((p) => localize(p, l))),
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const setMeta = (html, attr, key, value) => {
  const re = new RegExp(`<meta ${attr}="${key.replace(/[:.]/g, (c) => '\\' + c)}" content="[^"]*"\\s*/?>`);
  const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n  </head>`);
};

let ok = 0;
const langOf = (route) => LANGS.find((l) => route === `/${l}` || route.startsWith(`/${l}/`)) ?? null;

for (const route of routes) {
  try {
    const lang = langOf(route);
    const { html, seo } = await render(route);
    if (!html || html.length < 500) throw new Error('empty render');
    let page = shell.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
    if (seo) {
      const clean = seo.path === '/' ? '/' : seo.path.replace(/\/$/, '');
      const url = SITE + localize(clean, lang);
      const img = seo.image || `${SITE}/og-cover.png`;
      page = page.replace(/<title>[^<]*<\/title>/, `<title>${esc(seo.title)}</title>`);
      page = page.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`);
      page = page.replace(/(<link rel="alternate" hreflang="(?:en|x-default)" href=")[^"]*(")/g, `$1${SITE + clean}$2`);
      if (TRANSLATED.has(clean)) {
        const alts = LANGS.map((l) => `<link rel="alternate" hreflang="${LANG_TAGS[l]}" href="${SITE + localize(clean, l)}" />`).join('\n    ');
        page = page.replace(/(<link rel="alternate" hreflang="x-default" href="[^"]*"\s*\/?>)/, `$1\n    ${alts}`);
      }
      page = setMeta(page, 'property', 'og:locale', OG_LOCALES[lang ?? 'en']);
      page = setMeta(page, 'name', 'description', seo.description);
      if (seo.noindex) page = setMeta(page, 'name', 'robots', 'noindex, nofollow');
      for (const [k, v] of [['og:title', seo.title], ['og:description', seo.description], ['og:url', url], ['og:image', img], ['og:type', seo.type || 'website']]) page = setMeta(page, 'property', k, v);
      for (const [k, v] of [['twitter:title', seo.title], ['twitter:description', seo.description], ['twitter:image', img]]) page = setMeta(page, 'name', k, v);
      const ld = seo.jsonLd ? (Array.isArray(seo.jsonLd) ? seo.jsonLd : [seo.jsonLd]) : [];
      if (ld.length) page = page.replace('</head>', ld.map((b) => `  <script type="application/ld+json" data-seo-jsonld="true">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>`).join('\n') + '\n  </head>');
    }
    if (lang) {
      // Same page, translated: run the browser's translator over the rendered document.
      const { document } = parseHTML(page);
      translateTree(document.documentElement, dicts[lang], lang);
      document.documentElement.setAttribute('lang', LANG_TAGS[lang]);
      document.documentElement.setAttribute('dir', RTL.has(lang) ? 'rtl' : 'ltr');
      page = document.toString();
      if (!/^<!doctype/i.test(page)) page = '<!doctype html>\n' + page;
    }
    const file = route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route.slice(1), 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, page);
    ok++;
    console.log(`prerender ${route}  ${Math.round(page.length / 1024)} KB  "${seo?.title ?? 'default title'}"`);
  } catch (err) {
    console.warn(`prerender ${route} skipped: ${err?.message || err}`);
  }
}
console.log(`prerendered ${ok}/${routes.length} pages`);
process.exit(0);
