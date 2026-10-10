import type { IconName } from '../components/shared/SiteIcon';

/* =============================================================
   HOSTING STORE DATA — edit prices / copy here.
   Used by the home page pricing strip and the Host Your CTF page.
   Prices are in USD with an approximate INR value.
============================================================= */

export type Plan = {
  id: string;
  name: string;
  icon: IconName;
  usd: number;
  inr: string;
  blurb: string;
  features: string[];
  featured?: boolean;
  accent: 'white' | 'lime' | 'cyan';
};

export const plans: Plan[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    icon: 'ctf-green',
    usd: 89,
    inr: '₹8,850',
    blurb: 'Hosting plus the 25-challenge starter pack. A good first event for a college club or a class.',
    features: ['Hosting for 8 hours', '25 challenges, easy to medium', 'Web, Steg, Forensics, OSINT and Crypto'],
    accent: 'white',
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: 'trophy',
    usd: 148,
    inr: '₹14,800',
    blurb: 'Hosting plus the 40-challenge advanced pack, including our chained challenge experience.',
    features: [
      'Hosting for 8 hours',
      '40 challenges, medium to hard',
      'Pwn, Web and Boot2Root',
      'CyberHX chained challenge: OSINT, Forensics and Crypto in one run',
    ],
    featured: true,
    accent: 'lime',
  },
  {
    id: 'max',
    name: 'Max',
    icon: 'hexagon',
    usd: 199,
    inr: '₹19,900',
    blurb: 'Everything in Pro, with an event website designed in 3D to match your theme.',
    features: [
      'Hosting for 8 hours',
      '40 challenges, medium to hard, with the chained challenge',
      'A 3D event website made for your choice of look',
      'Custom challenges built around what you ask for',
    ],
    accent: 'cyan',
  },
];

export const pickAndChoose: {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  usd: string;
  inr: string;
}[] = [
  {
    id: 'hosting-only',
    icon: 'cloud',
    title: 'Hosting only',
    description: 'You bring the challenges. We host the platform and scoreboard for an 8-hour event.',
    usd: '$49',
    inr: '₹4,900',
  },
  {
    id: 'starter-pack',
    icon: 'code',
    title: 'Starter pack: 25 challenges',
    description: 'Easy to medium. Web, Steg, Forensics, OSINT and Crypto, custom built for your event.',
    usd: '$40',
    inr: '₹3,950, charges included',
  },
  {
    id: 'advanced-pack',
    icon: 'target',
    title: 'Advanced pack: 40 challenges',
    description:
      'Medium to hard. Pwn, Web and Boot2Root, plus the CyberHX chained challenge that links OSINT, Forensics and Crypto.',
    usd: '$99',
    inr: 'about ₹9,900',
  },
];

/* =============================================================
   CTF BUILDER — "build your CTF like a PC".
   Price per challenge in USD. Hosting is always included.
============================================================= */

export type Tier = 'easy' | 'medium' | 'hard' | 'insane';

export type BuilderCategory = {
  id: string;
  name: string;
  icon: IconName;
  blurb: string;
  tiers: { tier: Tier; usd: number }[];
  min?: number; // minimum quantity once you add this category
};

export const builderCategories: BuilderCategory[] = [
  { id: 'web', name: 'Web', icon: 'code', blurb: 'SQLi, XSS, SSRF, auth bypass and logic bugs.', tiers: [{ tier: 'medium', usd: 4 }], min: 5 },
  { id: 'osint', name: 'OSINT', icon: 'satellite', blurb: 'Track people, places and leaks from open sources.', tiers: [{ tier: 'medium', usd: 2 }] },
  { id: 'crypto', name: 'Crypto', icon: 'lock-key', blurb: 'Classic ciphers up to broken RSA and custom schemes.', tiers: [{ tier: 'medium', usd: 2 }, { tier: 'hard', usd: 4 }] },
  { id: 'reverse', name: 'Reverse', icon: 'gear', blurb: 'Crack binaries, unpack and patch your way to the flag.', tiers: [{ tier: 'hard', usd: 3 }, { tier: 'insane', usd: 4 }] },
  { id: 'boot2root', name: 'Boot2Root', icon: 'linux', blurb: 'A full machine: foothold, then escalate to root.', tiers: [{ tier: 'hard', usd: 6 }] },
  { id: 'mobile', name: 'Mobile', icon: 'bell-dot', blurb: 'Android apps with hidden secrets and weak storage.', tiers: [{ tier: 'easy', usd: 2 }, { tier: 'medium', usd: 3 }, { tier: 'hard', usd: 4 }] },
  { id: 'steg', name: 'Steg', icon: 'ghost', blurb: 'Flags hidden in images, audio and files.', tiers: [{ tier: 'easy', usd: 2 }, { tier: 'hard', usd: 3 }] },
];

export const builderPricing = {
  hosting: { usd: 49, hours: 8, players: 1000 }, // always in every build (per round)
  extraHourUsd: 2,
  maxHours: 72,
  extraPlayersUsd: 19, // per extra block of 1,000 players
  playerBlock: 1000,
  maxPlayers: 50000,
  maxPerTier: 50,
  website3dUsd: 40,
};
