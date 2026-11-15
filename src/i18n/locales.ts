/* The translated site: which languages, which pages, and how their URLs look.
   English stays at the root (/pricing); a translation lives under its language code (/es/pricing).
   Only the main marketing pages are translated. Everything else (the CTF builder, checkout, payments,
   forms on their own pages, the blog, the admin) stays English, and links to it from a translated
   page go to the English page. */

export const LANGS = ['es', 'pt', 'fr', 'de', 'id', 'ja', 'ar'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_NAMES: Record<'en' | Lang, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  id: 'Bahasa Indonesia',
  ja: '日本語',
  ar: 'العربية',
};

/** Language tags for <html lang> and hreflang. */
export const LANG_TAGS: Record<'en' | Lang, string> = { en: 'en', es: 'es', pt: 'pt', fr: 'fr', de: 'de', id: 'id', ja: 'ja', ar: 'ar' };

/** Open Graph locales. */
export const OG_LOCALES: Record<'en' | Lang, string> = { en: 'en_US', es: 'es_ES', pt: 'pt_BR', fr: 'fr_FR', de: 'de_DE', id: 'id_ID', ja: 'ja_JP', ar: 'ar_AR' };

export const RTL: ReadonlySet<string> = new Set(['ar']);

/** English paths that have a translated version. */
export const TRANSLATED_PAGES = ['/', '/pricing', '/events', '/academy', '/universities', '/companies', '/certifications'] as const;
const TRANSLATED: ReadonlySet<string> = new Set(TRANSLATED_PAGES);

export const isLang = (s: string | undefined | null): s is Lang => !!s && (LANGS as readonly string[]).includes(s);
export const isTranslated = (path: string) => TRANSLATED.has(path === '' ? '/' : path);

/** "/es/pricing" -> { lang: 'es', path: '/pricing' }; "/pricing" -> { lang: null, path: '/pricing' }. */
export function splitLang(pathname: string): { lang: Lang | null; path: string } {
  const m = /^\/([a-z]{2})(\/.*)?$/.exec(pathname);
  if (m && isLang(m[1])) {
    const rest = (m[2] || '/').replace(/\/+$/, '') || '/';
    return { lang: m[1], path: rest };
  }
  return { lang: null, path: pathname };
}

/** The URL of an English path in a language: translated pages get the prefix, everything else stays English. */
export function localize(path: string, lang: Lang | null): string {
  if (!lang) return path;
  const [p, rest = ''] = splitPathSuffix(path);
  if (!isTranslated(p)) return path;
  return `/${lang}${p === '/' ? '' : p}${rest}`;
}

/** "/pricing#seats" -> ["/pricing", "#seats"] */
export function splitPathSuffix(href: string): [string, string] {
  const i = href.search(/[?#]/);
  return i < 0 ? [href, ''] : [href.slice(0, i) || '/', href.slice(i)];
}
