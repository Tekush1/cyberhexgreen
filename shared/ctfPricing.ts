// What a CTF checkout costs, worked out from the cart alone. The server uses this to price every
// Razorpay order, so the browser can never choose its own amount. Prices live in src/data/hosting.ts.

import { plans, builderCategories, builderPricing as P, booking } from '../src/data/hosting.js';

export type RoundIn = { hours?: unknown; players?: unknown; qty?: Record<string, unknown> };
export type Cart =
  | { kind: 'hosting' }
  | { kind: 'prebuilt'; planId: string }
  | { kind: 'build'; format: 'single' | 'split'; rounds: Partial<Record<'main' | 'qualifier' | 'finale', RoundIn>>; website3d?: boolean; custom?: boolean };

export interface PricedLine { label: string; usd: number | null }
export interface Priced {
  kind: 'hosting' | 'prebuilt' | 'build';
  title: string;
  lines: PricedLine[];
  totalUsd: number;
  /** Has custom challenges with a price we quote later: can't be paid online. */
  quoted: boolean;
  leadDays: number;
  split: boolean;
  hours: number;
  finaleHours: number;
  players: number;
}

const fmtPlayers = (n: number) => n.toLocaleString('en-US');
const roundName = { main: 'Your CTF', qualifier: 'Qualifier', finale: 'Grand finale' } as const;

function cleanRound(r: RoundIn | undefined) {
  const hours = Number(r?.hours);
  const players = Number(r?.players);
  const qty: Record<string, number> = {};
  for (const [k, v] of Object.entries(r?.qty ?? {})) {
    const n = Math.floor(Number(v));
    const [cat, tier] = k.split(':');
    const c = builderCategories.find((x) => x.id === cat);
    if (!c || !c.tiers.some((t) => t.tier === tier) || !Number.isFinite(n) || n <= 0) continue;
    qty[k] = Math.min(P.maxPerTier, Math.max(c.min ?? 1, n));
  }
  return {
    hours: Number.isFinite(hours) ? Math.min(P.maxHours, Math.max(P.hosting.hours, Math.round(hours))) : P.hosting.hours,
    players: Number.isFinite(players) && players > 0 ? Math.max(P.playerBlock, Math.ceil(players / P.playerBlock) * P.playerBlock) : P.hosting.players,
    qty,
  };
}

function roundLines(r: ReturnType<typeof cleanRound>, pre: string): PricedLine[] {
  const xh = Math.max(0, r.hours - P.hosting.hours);
  const xb = Math.max(0, Math.ceil(r.players / P.playerBlock) - 1);
  const lines: PricedLine[] = [
    { label: `${pre}Hosting + scoreboard (${P.hosting.hours}h, ${fmtPlayers(P.hosting.players)} players included)`, usd: P.hosting.usd },
  ];
  if (xh > 0) lines.push({ label: `${pre}Extra hours × ${xh} (${r.hours}h total)`, usd: xh * P.extraHourUsd });
  if (xb > 0) lines.push({ label: `${pre}Extra players: ${fmtPlayers(xb * P.playerBlock)} (${fmtPlayers(r.players)} total)`, usd: xb * P.extraPlayersUsd });
  for (const c of builderCategories) {
    for (const t of c.tiers) {
      const n = r.qty[`${c.id}:${t.tier}`] ?? 0;
      if (n > 0) lines.push({ label: `${pre}${c.name} · ${t.tier} × ${n}`, usd: n * t.usd });
    }
  }
  return lines;
}

/** Prices a cart, or returns null when it isn't something the shop sells. */
export function priceCart(cart: unknown): Priced | null {
  const c = cart as Cart;
  if (!c || typeof c !== 'object') return null;
  if (c.kind === 'hosting') {
    return {
      kind: 'hosting', title: 'Hosting only',
      lines: [{ label: `Hosting + scoreboard (${P.hosting.hours}h, ${fmtPlayers(P.hosting.players)} players included)`, usd: P.hosting.usd }],
      totalUsd: P.hosting.usd, quoted: false, leadDays: booking.leadDays.hosting, split: false,
      hours: P.hosting.hours, finaleHours: 0, players: 0,
    };
  }
  if (c.kind === 'prebuilt') {
    const p = plans.find((x) => x.id === c.planId);
    if (!p) return null;
    return {
      kind: 'prebuilt', title: `${p.name} prebuilt`, lines: [{ label: `${p.name} prebuilt CTF`, usd: p.usd }],
      totalUsd: p.usd, quoted: false, leadDays: p.id === 'max' ? booking.leadDays.custom : booking.leadDays.prebuilt, split: false,
      hours: P.hosting.hours, finaleHours: 0, players: 0,
    };
  }
  if (c.kind === 'build') {
    const split = c.format === 'split';
    const ids = (split ? ['qualifier', 'finale'] : ['main']) as ('main' | 'qualifier' | 'finale')[];
    const rounds = ids.map((id) => ({ id, r: cleanRound(c.rounds?.[id]) }));
    const lines = rounds.flatMap(({ id, r }) => roundLines(r, split ? `${roundName[id]}: ` : ''));
    if (c.website3d) lines.push({ label: '3D event website', usd: P.website3dUsd });
    if (c.custom) lines.push({ label: 'Custom challenges', usd: null });
    return {
      kind: 'build',
      title: split ? 'Custom CTF build: qualifier + grand finale' : 'Custom CTF build',
      lines,
      totalUsd: lines.reduce((s, l) => s + (l.usd ?? 0), 0),
      quoted: !!c.custom,
      leadDays: c.custom || c.website3d ? booking.leadDays.custom : booking.leadDays.prebuilt,
      split,
      hours: rounds[0].r.hours,
      finaleHours: split ? rounds[1].r.hours : 0,
      players: Math.max(...rounds.map(({ r }) => r.players)),
    };
  }
  return null;
}

// ---------- money ----------
export type PayCurrency = 'INR' | 'USD';
export const MIN_MINOR = 100; // Razorpay minimum: ₹1 / $1

/** USD cents → paise at `rate`, rounded up to a whole rupee. */
export const usdToInrMinor = (usdMinor: number, rate: number) => Math.ceil(Math.round(usdMinor * rate) / 100) * 100;

/** Applies a percent-off code; rupees round up to a whole rupee, dollars to the cent; never below the minimum. */
export function applyPercent(listMinor: number, percentOff: number, currency: PayCurrency): number {
  if (percentOff >= 100) return 0;
  const d = (listMinor * (10000 - Math.round(percentOff * 100))) / 10000;
  return Math.max(MIN_MINOR, currency === 'INR' ? Math.ceil(d / 100) * 100 : Math.ceil(d));
}

export const formatMinor = (minor: number, currency: PayCurrency) =>
  currency === 'INR'
    ? `₹${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 })}`
    : `$${(minor / 100).toLocaleString('en-US', { minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
