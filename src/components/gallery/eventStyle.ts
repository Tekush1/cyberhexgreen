import type { Event } from '../../data/events';

/* Presentation helpers for the events page. They only format what is
   already in src/data/events.ts; nothing here adds or changes data.
   The page uses a single light palette: white / grey / lime. */

export const LIME = '#c6f135';

// Status pill styles for the light theme (soft tint + ring + dot).
export const STATUS = {
  live: { label: 'Live now', dot: '#ef4444', chip: 'bg-red-50 text-red-600 ring-1 ring-red-600/15' },
  completed: { label: 'Completed', dot: '#10b981', chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15' },
  upcoming: { label: 'Upcoming', dot: '#f59e0b', chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15' },
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "18–25 September 2026" -> {days: "18–25", month: "Sep", year: "2026"} */
export function dateParts(s: string) {
  const m = s.match(/^\s*([\d–-]+)?\s*([A-Za-z]+)\s+(\d{4})/);
  if (!m) return { days: '', month: s, year: '' };
  const mon = m[2].slice(0, 3).toLowerCase();
  const idx = MONTHS.findIndex((x) => x.toLowerCase() === mon);
  return { days: m[1] ?? '', month: idx >= 0 ? MONTHS[idx] : m[2], year: m[3] };
}

/** Every distinct challenge category across all events, for the marquee. */
export const allCategories = (list: Event[]) => {
  const seen = new Set<string>();
  for (const e of list) for (const t of e.tags) if (!/^ctf$/i.test(t.trim())) seen.add(t.trim());
  return [...seen];
};
