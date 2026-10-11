import type { Event } from '../../data/events';

/* Presentation helpers for the events page. They only format what is
   already in src/data/events.ts; nothing here adds or changes data. */

export type Accent = { from: string; to: string };

// Each event card gets its own light. Cycles for future events.
const ACCENTS: Accent[] = [
  { from: '#ff3d6e', to: '#ffb35c' }, // ember
  { from: '#3bd3ff', to: '#8b5cf6' }, // electric
  { from: '#c6f135', to: '#3bd3ff' }, // acid
  { from: '#a78bfa', to: '#ff5ca8' }, // ultraviolet
];
export const accentFor = (index: number) => ACCENTS[index % ACCENTS.length];

export const STATUS = {
  live: { label: 'Live now', dot: '#ff4d4d', text: '#ff8a8a' },
  completed: { label: 'Completed', dot: '#34d399', text: '#6ee7b7' },
  upcoming: { label: 'Upcoming', dot: '#ffc93c', text: '#ffd978' },
} as const;

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** "6000+ Hackers" -> {to: 6000, suffix: "+"}, "1.4K+" -> {to: 1.4, decimals: 1, suffix: "K+"} */
export function parseCount(s: string) {
  const m = s.match(/([\d][\d.,]*)\s*([KkLM]?)\s*(\+?)/);
  if (!m) return null;
  const raw = m[1].replace(/,/g, '');
  const to = parseFloat(raw);
  if (Number.isNaN(to)) return null;
  return { to, decimals: (raw.split('.')[1] || '').length, suffix: `${m[2].toUpperCase()}${m[3]}` };
}

/** "₹10 Lakh+ Rewards" -> "₹10 Lakh+" */
export const prizeShort = (s: string) => s.replace(/\s*(rewards?|prize pool)\s*$/i, '').trim();

/** "24 Hours" -> "24h" */
export const durationShort = (s: string) => s.replace(/\s*hours?\s*$/i, 'h').replace(/\s*minutes?\s*$/i, 'm').trim();

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** "18–25 September 2026" -> {days: "18–25", month: "Sep", year: "2026"} */
export function dateParts(s: string) {
  const m = s.match(/^\s*([\d–-]+)?\s*([A-Za-z]+)\s+(\d{4})/);
  if (!m) return { days: '', month: s, year: '' };
  const mon = m[2].slice(0, 3).toLowerCase();
  return {
    days: m[1] ?? '',
    month: MONTHS.includes(mon) ? mon[0].toUpperCase() + mon.slice(1) : m[2],
    year: m[3],
  };
}

// Colour per challenge category, used on the tag chips.
const TONES: [RegExp, string][] = [
  [/web/i, '#3bd3ff'],
  [/crypt/i, '#a78bfa'],
  [/revers/i, '#ffb35c'],
  [/osint/i, '#c6f135'],
  [/forens/i, '#ff6b9a'],
  [/pwn/i, '#ff5d5d'],
];
export const tagTone = (tag: string) => TONES.find(([re]) => re.test(tag))?.[1] ?? '#9fb0d0';

/** Every distinct challenge category across all events, for the marquee. */
export const allCategories = (list: Event[]) => {
  const seen = new Set<string>();
  for (const e of list) for (const t of e.tags) if (!/^ctf$/i.test(t.trim())) seen.add(t.trim());
  return [...seen];
};
