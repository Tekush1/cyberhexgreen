import { runKey, fill, squash, HAS_LETTER } from './runs';
import { localize, splitLang, splitPathSuffix, type Lang } from './locales';

/* Translates a rendered page in place, in the browser and in the build-time prerender alike.

   The components stay English. After React renders, every run of neighbouring text nodes is looked up in the
   language's dictionary (numbers inside a run are placeholders, so "$89" and "₹7,499" share one entry), and the
   translation is written into the first node of the run. The English each node had is remembered, so when React
   later changes a node (a price after currency detection, a FAQ opening) the run is translated again from the
   new English, and switching back to English restores it exactly.

   Never touched: scripts, styles, code, form fields' values, <select> options, SVG, anything marked
   data-no-translate. Only visible text and a few attributes change, so no behaviour (payments, forms, links'
   targets other than the language prefix) changes. */

export type Dict = Record<string, string>;

const SKIP = 'script,style,code,pre,textarea,select,svg,noscript,[data-no-translate]';
const ATTRS = ['placeholder', 'alt', 'aria-label', 'title'];
const META = new Set(['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description']);

const TEXT = 3;
const ELEMENT = 1;

// What each node said in English, and what we last wrote into it.
const origText = new WeakMap<Node, string>();
const wroteText = new WeakMap<Node, string>();
const origAttr = new WeakMap<Element, Record<string, string>>();
const wroteAttr = new WeakMap<Element, Record<string, string>>();

const english = (n: Node) => {
  const v = n.nodeValue ?? '';
  if (wroteText.get(n) !== v) origText.set(n, v);
  return origText.get(n) ?? v;
};

const write = (n: Node, v: string) => {
  if (n.nodeValue !== v) n.nodeValue = v;
  wroteText.set(n, v);
};

function translateRun(nodes: Node[], dict: Dict | null) {
  const parts = nodes.map(english);
  const { key, slots } = runKey(parts);
  const hit = dict && key && HAS_LETTER.test(key) ? dict[key] : undefined;
  if (hit == null) {
    nodes.forEach((n, i) => write(n, parts[i]));
    return;
  }
  const joined = parts.join('');
  const lead = /^\s*/.exec(joined)![0];
  const trail = /\s*$/.exec(joined)![0];
  const text = lead + fill(hit, parts, slots) + trail;
  nodes.forEach((n, i) => write(n, i === 0 ? text : ''));
}

function attr(el: Element, name: string, translate: (v: string) => string | null) {
  const v = el.getAttribute(name);
  if (v == null) return;
  const o = origAttr.get(el) ?? {};
  const w = wroteAttr.get(el) ?? {};
  if (w[name] !== v) o[name] = v;
  const en = o[name] ?? v;
  const next = translate(en) ?? en;
  if (next !== v) el.setAttribute(name, next);
  w[name] = next;
  origAttr.set(el, o);
  wroteAttr.set(el, w);
}

function translateAttrs(el: Element, dict: Dict | null, lang: Lang | null) {
  const look = (v: string) => (dict ? dict[squash(v).trim()] ?? null : null);
  for (const a of ATTRS) if (el.hasAttribute(a)) attr(el, a, look);
  const tag = el.tagName;
  if (tag === 'META') {
    const k = el.getAttribute('name') || el.getAttribute('property') || '';
    if (META.has(k)) attr(el, 'content', look);
  } else if (tag === 'A' && el.hasAttribute('href')) {
    // Internal links to translated pages stay in the language; links to anything else go to the English page.
    attr(el, 'href', (v) => {
      if (!v.startsWith('/') || v.startsWith('//')) return null;
      const [p, rest] = splitPathSuffix(v);
      const base = splitLang(p).path;
      return localize(base + rest, lang);
    });
  }
}

/** Translate one element's own text runs and attributes (not its children's). */
export function translateElement(el: Element, dict: Dict | null, lang: Lang | null) {
  if (el.closest(SKIP)) return;
  translateAttrs(el, dict, lang);
  let run: Node[] = [];
  const flush = () => {
    if (run.length) translateRun(run, dict);
    run = [];
  };
  for (let c = el.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === TEXT) {
      // Same grouping as the extraction that built the dictionaries: a run starts at the first non-blank node.
      if (run.length || english(c).trim()) run.push(c);
    } else flush();
  }
  flush();
}

/** Translate an element and everything inside it. */
export function translateTree(root: Element, dict: Dict | null, lang: Lang | null) {
  translateElement(root, dict, lang);
  const all = root.querySelectorAll('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (el.nodeType === ELEMENT) translateElement(el, dict, lang);
  }
}
