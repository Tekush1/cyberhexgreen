/*
 * How page text is cut into translatable pieces. Shared by the runtime translator and the build steps.
 *
 * React writes `Hosting from ${price} a round` as several neighbouring text nodes. Translating each node on
 * its own would give broken grammar, so neighbouring text nodes are read as one "run". Parts that are only a
 * number or a price (they change with currency) become placeholders {0}, {1} … in the key, and are put back
 * into the translation untouched.
 */

/** A part that is only digits, prices, units and punctuation: kept as it is, never translated. */
export const NUMERIC = /^[\s\d.,:+\-–—×%$€£¥₹/()#~]*$/;

/** True when the text has a letter (in any script) worth translating. */
export const HAS_LETTER = /\p{L}/u;

export const squash = (s: string) => s.replace(/\s+/g, ' ');

/** Build the dictionary key for a run of text parts, and remember which parts are placeholders. */
export function runKey(parts: string[]): { key: string; slots: number[] } {
  const slots: number[] = [];
  let key = '';
  parts.forEach((p, i) => {
    if (parts.length > 1 && NUMERIC.test(p) && p.trim()) {
      key += `{${slots.length}}`;
      slots.push(i);
    } else key += p;
  });
  return { key: squash(key).trim(), slots };
}

/** Put the run's numeric parts back into a translated key. */
export function fill(translated: string, parts: string[], slots: number[]): string {
  return translated.replace(/\{(\d+)\}/g, (_, n) => (slots[+n] != null ? parts[slots[+n]].trim() : ''));
}
