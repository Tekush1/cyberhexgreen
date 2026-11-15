/*
 * postcss-light-theme
 *
 * The site is designed dark. This plugin gives it a light version for people whose system is set to light,
 * without touching any component: after Tailwind has built the CSS, every declaration that sets a colour is
 * repeated right after its rule inside `@media (prefers-color-scheme: light)`, with the colour remapped.
 *
 *   text      white and greys -> ink and greys of matching weight; lime, cyan, yellow, red -> darker shades
 *             that read on a light page; dark text (on lime buttons) stays dark
 *   surfaces  the near-black page and panels -> off-white page and white panels; white glass tints -> ink tints;
 *             saturated fills (lime buttons, badges) stay as they are
 *   borders   white hairlines -> ink hairlines; dark borders -> light grey
 *   shadows   dark shadows get lighter
 *
 * Each copy sits right after the original rule, so the cascade order between utilities does not change.
 * People on a dark system, and browsers that do not report a preference, keep the dark site exactly as before.
 */

const INK = [17, 21, 32];
const PAGE = [246, 246, 243];
const PANEL = [255, 255, 255];
const RAISED = [236, 238, 242];

const COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\(\s*[^()]*?(?:\([^()]*\)[^()]*?)*\)|\b(?:white|black)\b/g;

function parse(tok) {
  if (tok === 'white') return { r: 255, g: 255, b: 255, a: 1, aRaw: null };
  if (tok === 'black') return { r: 0, g: 0, b: 0, a: 1, aRaw: null };
  if (tok[0] === '#') {
    let h = tok.slice(1);
    if (h.length <= 4) h = h.split('').map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1, aRaw: null };
  }
  const inner = tok.slice(tok.indexOf('(') + 1, -1).trim();
  let parts, aRaw = null;
  if (inner.includes('/')) {
    const [rgb, alpha] = inner.split('/');
    parts = rgb.trim().split(/[\s,]+/);
    aRaw = alpha.trim();
  } else {
    parts = inner.split(/[\s,]+/);
    if (parts.length === 4) aRaw = parts.pop();
  }
  const [r, g, b] = parts.map(Number);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  // An alpha written as a variable (Tailwind's --tw-*-opacity) is kept as it is.
  const a = aRaw == null ? 1 : /^[\d.]+%?$/.test(aRaw) ? (aRaw.endsWith('%') ? parseFloat(aRaw) / 100 : parseFloat(aRaw)) : 1;
  return { r, g, b, a, aRaw };
}

const lum = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const sat = ({ r, g, b }) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

function hue({ r, g, b }) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

function out(rgb, c, alphaScale = 1) {
  const [r, g, b] = rgb;
  let alpha;
  if (c.aRaw != null && !/^[\d.]+%?$/.test(c.aRaw)) alpha = alphaScale === 1 ? c.aRaw : `calc(${c.aRaw} * ${alphaScale})`;
  else alpha = +(c.a * alphaScale).toFixed(3);
  return alpha === 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha})`;
}

/** A darker shade of a saturated colour, for text or lines on a light page. */
function deepen(c) {
  const h = hue(c);
  if (h >= 60 && h < 100) return [77, 124, 15];      // lime -> dark lime
  if (h >= 100 && h < 165) return [21, 128, 61];     // green
  if (h >= 165 && h < 200) return [14, 116, 144];    // cyan
  if (h >= 200 && h < 250) return [29, 78, 216];     // blue
  if (h >= 250 && h < 300) return [109, 40, 217];    // violet
  if (h >= 30 && h < 60) return [161, 98, 7];        // yellow / amber
  if (h >= 300 || h < 15) return [220, 38, 38];      // red / pink
  return [194, 65, 12];                               // orange
}

function mapFg(c) {
  if (sat(c) > 0.35 && lum(c) > 0.35) return out(deepen(c), c);
  if (lum(c) < 0.3) return null;                      // dark text stays dark (it sits on lime or white)
  // Neutral light text: the lighter it was, the darker it becomes.
  const v = Math.round(INK[0] + (1 - lum(c)) * 0.9 * 255);
  return out(lum(c) > 0.97 ? INK : [v, v + 4, v + 12].map((x) => Math.min(255, x)), c);
}

function mapBg(c) {
  if (sat(c) > 0.35 && lum(c) > 0.3) return null;     // lime buttons, badges, coloured fills stay
  const L = lum(c);
  if (L < 0.32) {
    if (c.r === 0 && c.g === 0 && c.b === 0 && c.a < 1) return out(INK, c, 0.35); // scrims and shadows
    return out(L < 0.05 ? PAGE : L < 0.12 ? PANEL : RAISED, c);
  }
  if (L > 0.8 && c.a < 0.5) return out(INK, c, 0.9);  // white glass -> ink tint
  return null;                                       // opaque white stays white
}

function mapBorder(c) {
  if (sat(c) > 0.35 && lum(c) > 0.35) return c.a < 1 ? null : out(deepen(c), c);
  if (lum(c) > 0.6) return out(INK, c, c.a < 0.09 ? 1.6 : 1);
  if (lum(c) < 0.32) return out([224, 226, 232], c);
  return null;
}

function mapShadow(c) {
  if (lum(c) < 0.2) return out(INK, c, 0.3);
  return null;
}

const KIND = (prop) => {
  if (/^--tw-gradient-(from|to|via|stops)$/.test(prop)) return mapBg;
  if (/^--tw-(ring|ring-offset)-color$/.test(prop)) return mapBorder;
  if (prop === '--tw-shadow-color' || prop === '--tw-shadow' || prop === 'box-shadow' || prop === 'text-shadow' || prop === '--tw-drop-shadow' || prop === 'filter') return mapShadow;
  if (prop.startsWith('--tw-')) return null;
  if (prop.startsWith('--')) {
    if (/text|muted|fg|foreground/i.test(prop)) return mapFg;
    if (/border|line|stroke/i.test(prop)) return mapBorder;
    if (/lime|primary|secondary|glow|sun|accent/i.test(prop)) return null;
    return mapBg;
  }
  if (prop === '-webkit-text-stroke' || prop === '-webkit-text-stroke-color') return mapFg;
  if (prop === 'color' || prop === 'fill' || prop === 'stroke' || prop === 'caret-color' || prop === 'text-decoration-color' || prop === '-webkit-text-fill-color') return mapFg;
  if (prop === 'background' || prop === 'background-color' || prop === 'background-image') return mapBg;
  if (/^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?$/.test(prop) || prop === 'outline-color' || prop === 'outline' || prop === 'column-rule-color') return mapBorder;
  return null;
};

function remap(value, fn) {
  let changed = false;
  const next = value.replace(COLOR_RE, (tok) => {
    const c = parse(tok);
    if (!c) return tok;
    const m = fn(c);
    if (m == null) return tok;
    changed = true;
    return m;
  });
  return changed ? next : null;
}

module.exports = () => ({
  postcssPlugin: 'postcss-light-theme',
  OnceExit(root, { AtRule, Rule }) {
    const rules = [];
    root.walkRules((rule) => {
      // Skip keyframe steps and rules already inside a colour-scheme query.
      let p = rule.parent;
      while (p && p.type !== 'root') {
        if (p.type === 'atrule' && (/keyframes$/.test(p.name) || /prefers-color-scheme/.test(p.params))) return;
        p = p.parent;
      }
      rules.push(rule);
    });
    for (const rule of rules) {
      const decls = [];
      rule.each((d) => {
        if (d.type !== 'decl') return;
        const fn = KIND(d.prop);
        if (!fn) return;
        const v = remap(d.value, fn);
        if (v != null) decls.push(d.clone({ value: v }));
      });
      if (!decls.length) continue;
      const media = new AtRule({ name: 'media', params: '(prefers-color-scheme: light)' });
      const copy = new Rule({ selector: rule.selector });
      decls.forEach((d) => copy.append(d));
      media.append(copy);
      rule.after(media);
    }
  },
});
module.exports.postcss = true;
