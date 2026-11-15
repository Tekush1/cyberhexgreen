import { translateTree, translateElement, type Dict } from './translate';
import { LANG_TAGS, RTL, type Lang } from './locales';

/* The browser side of the translated site: loads a language's dictionary on demand (one small chunk per
   language, never loaded on English pages) and keeps the page translated while React updates it. */

const loaders = import.meta.glob<{ default: Dict }>('./dict/*.json');
const cache = new Map<Lang, Dict>();

let current: Lang | null = null;
let dict: Dict | null = null;
let observer: MutationObserver | null = null;
let pending: Promise<void> | null = null;

async function load(lang: Lang): Promise<Dict> {
  const hit = cache.get(lang);
  if (hit) return hit;
  const loader = loaders[`./dict/${lang}.json`];
  const d = loader ? (await loader()).default : {};
  cache.set(lang, d);
  return d;
}

function onMutations(records: MutationRecord[]) {
  const seen = new Set<Element>();
  const one = (el: Element | null) => {
    if (el && !seen.has(el)) {
      seen.add(el);
      translateElement(el, dict, current);
    }
  };
  for (const r of records) {
    if (r.type === 'characterData') one(r.target.parentElement);
    else if (r.type === 'attributes') one(r.target as Element);
    else {
      one(r.target as Element);
      r.addedNodes.forEach((n) => {
        if (n.nodeType === 1) {
          const el = n as Element;
          one(el);
          el.querySelectorAll('*').forEach(one);
        } else one(n.parentElement);
      });
    }
  }
}

function setDocLang(lang: Lang | null) {
  const html = document.documentElement;
  html.lang = LANG_TAGS[lang ?? 'en'];
  html.dir = lang && RTL.has(lang) ? 'rtl' : 'ltr';
}

/** Switch the page to a language (null = English). Resolves once the page is translated. */
export function setLanguage(lang: Lang | null): Promise<void> {
  if (lang === current && (lang === null || dict)) return pending ?? Promise.resolve();
  const run = (async () => {
    const d = lang ? await load(lang) : null;
    current = lang;
    dict = d;
    setDocLang(lang);
    if (!lang) {
      observer?.disconnect();
      observer = null;
      translateTree(document.documentElement, null, null); // restore the English
      return;
    }
    if (!observer) {
      observer = new MutationObserver(onMutations);
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'alt', 'aria-label', 'title', 'content', 'href'],
      });
    }
    translateTree(document.documentElement, dict, current);
  })();
  pending = run;
  return run;
}

export const currentLanguage = () => current;
