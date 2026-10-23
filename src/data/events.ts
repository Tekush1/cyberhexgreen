// Event list shared by the home page and the events page.
// Add a new event at the top of the array; set status to 'upcoming' or 'live' to feature it.

export interface Event {
  id: number;
  /** URL of the event's own page: cyberhx.com/events/<slug>. Never change it once live (search engines index it). */
  slug: string;
  /** ISO dates for search engines (structured data). */
  startDate: string;
  endDate?: string;
  /** Who runs it (shown on the page and in structured data). */
  organizers?: { name: string; url?: string }[];
  /** Extra words people search for, e.g. "nfsu ctf". */
  searchTerms?: string[];
  /** Physical venue, if any (an online-only event has none). */
  venue?: string;
  venueCity?: string;
  title: string;
  subtitle: string;
  description: string;
  date: string;
  duration: string;
  participants: string;
  prize: string;
  tags: string[];
  status: 'live' | 'completed' | 'upcoming';
  category: 'Events' | 'Hacking' | 'Learning' | 'Teams';
  link?: string;
  /** Paid or free to enter (shown on upcoming events). */
  entry?: 'Paid' | 'Free' | 'Private';
  /** Short date for cards and banners, e.g. "31 Oct". */
  shortDate?: string;
  /** Where people register (upcoming events). */
  register?: string;
  highlights?: string[];
  location: string;
  image: string;
  gallery?: string[];
  hostLogos?: { name: string; logo: string }[];
  social?: {
    instagram?: string;
    x?: string;
    linkedin?: string;
    website?: string;
    ctftime?: string;
    leaderboard?: string;
      certificates?: string;
  };
}

/** True when `participants` is a real count ("6000+ Hackers"), not a status like "Registrations open". */
/** "Paid entry", "Free entry" or "Private event". */
export const entryLabel = (e: Event) => (e.entry === 'Private' ? 'Private event' : e.entry ? `${e.entry} entry` : '');
export const hasCount = (e: Event) => /\d/.test(e.participants);
/** "6,000+ players", or for an upcoming event "Paid entry · registrations open". */
export const playersText = (e: Event) =>
  hasCount(e)
    ? `${e.participants.replace(/\s*(hackers?|participants?|players?)\s*$/i, '').trim().replace(/\d{4,}/g, (n) => Number(n).toLocaleString('en-US'))} players`
    : [entryLabel(e), e.participants.toLowerCase()].filter(Boolean).join(' · ');
export const nextEvent = () => events.find((e) => e.status === 'upcoming' || e.status === 'live');

export const events: Event[] = [
  {
    id: 3,
    slug: 'pinaka-ctf',
    startDate: '2026-10-31T10:00:00+05:30',
    endDate: '2026-11-01T10:00:00+05:30',
    organizers: [{ name: 'National Forensic Sciences University, Chennai Campus' }, { name: 'CyberHx', url: 'https://cyberhx.com' }],
    searchTerms: ['pinaka ctf', 'pinaka ctf 2026', 'nfsu ctf', 'nfsu chennai ctf', 'national ctf india 2026'],
    venue: 'National Forensic Sciences University, Chennai Campus (final)',
    venueCity: 'Chennai',

    title: 'Pinaka CTF',

    subtitle: 'National-Level 24-Hour Capture The Flag Challenge',

    description:
      'Pinaka CTF is a national-level Capture The Flag competition hosted by the National Forensic Sciences University (NFSU), Chennai Campus — an Institution of National Importance under the Ministry of Home Affairs, Government of India. The 24-hour online qualifier runs on ctf.cyberhx.com, with CyberHX powering the platform, and top teams advancing to an offline final at NFSU Chennai.',

    date: '31 October 2026, 10:00 IST',

    duration: '24 Hours',

    participants: 'Registrations open',

    entry: 'Paid',

    shortDate: '31 Oct',

    register: 'https://pinakactf.com',

    prize: '₹1 Cr+',

    tags: [
      'National CTF',
      'Web Exploitation',
      'Reverse Engineering',
      'Cryptography',
      'OSINT',
      'Digital Forensics',
      'Pwn',
      'Jeopardy CTF',
    ],

    status: 'upcoming',

    category: 'Hacking',

    link: 'https://ctf.cyberhx.com',

    highlights: [
      '24-Hour Online Qualifier',
      '₹1 Crore+ Prize Pool',
      'Hosted by NFSU Chennai Campus',
      'Under the Ministry of Home Affairs, Govt. of India',
      'Offline Final at NFSU Chennai',
      'Powered by CyberHX',
    ],

    location: 'Online (Qualifier) — NFSU Chennai Campus (Final)',

    image: '/events/pinaka-ctf.webp',

    hostLogos: [
      { name: 'National Forensic Sciences University', logo: '/events/nfsu-logo.webp' },
      { name: 'Ministry of Home Affairs, Government of India', logo: '/events/mha-logo.webp' },
    ],

    social: {
      website: 'https://pinakactf.com',
      leaderboard: 'https://ctf.cyberhx.com/leaderboard',
    },
  },
  {
    id: 4,
    slug: 'cyberheist',
    startDate: '2026-10-31',
    organizers: [{ name: 'Backslash, Thapar Institute of Engineering & Technology' }, { name: 'CyberHx', url: 'https://cyberhx.com' }],
    searchTerms: ['cyberheist ctf', 'cyberheist thapar', 'backslash thapar ctf', 'tiet ctf 2026'],
    venue: 'Thapar Institute of Engineering & Technology',
    venueCity: 'Patiala',
    title: 'CyberHeist',
    subtitle: 'CTF by Backslash, the security society at TIET',
    description:
      'CyberHeist is a private capture-the-flag competition organised by Backslash at Thapar Institute of Engineering & Technology (Deemed to be University) for its students, with CyberHx hosting the platform and running the event on the day. It is not open for public registration.',
    date: '31 October 2026',
    duration: '',
    participants: 'Invite only',
    entry: 'Private',
    shortDate: '31 Oct',
    prize: '',
    tags: ['CTF', 'Jeopardy CTF', 'Thapar Institute'],
    status: 'upcoming',
    category: 'Hacking',
    highlights: ['Private event for TIET', 'Organised by Backslash, TIET', 'Hosted by CyberHx'],
    location: 'Thapar Institute of Engineering & Technology',
    image: '/events/cyberheist.webp',
    hostLogos: [
      { name: 'Thapar Institute of Engineering & Technology', logo: '/events/thapar-logo.webp' },
      { name: 'Backslash, TIET', logo: '/events/backslash-logo.webp' },
    ],
  },
  {
    id: 2,
    slug: 'null-origin-ctf',
    startDate: '2026-09-18',
    endDate: '2026-09-25',
    organizers: [{ name: 'CyberHx', url: 'https://cyberhx.com' }],
    searchTerms: ['null origin ctf', 'null origin ctf 2026', 'nullorigin ctf', 'international ctf 2026'],
  
    title: 'Null Origin CTF',
  
    subtitle: 'International 24-Hour Capture The Flag Challenge',
  
    description:
      'Null Origin CTF 2026 was an international 24-hour Jeopardy-style Capture The Flag competition organized by CyberHX. The event brought together cybersecurity enthusiasts, students, ethical hackers, researchers and CTF teams from around the world. Participants competed across Web Exploitation, Cryptography, Reverse Engineering, Digital Forensics, OSINT and Pwn, with challenges ranging from beginner-friendly to expert-level difficulty.',
  
    date: '18–25 September 2026',
  
    duration: '24 Hours',
  
    participants: '6000+ Hackers',
  
    prize: '₹10 Lakh+ Rewards',
  
    tags: [
      'International CTF',
      'Web Exploitation',
      'Reverse Engineering',
      'Cryptography',
      'OSINT',
      'Digital Forensics',
      'Pwn',
      'Jeopardy CTF',
    ],
  
    status: 'completed',
  
    category: 'Hacking',
  
    link: 'https://nullorigin.cyberhx.com',
  
    highlights: [
      '6000+ Hackers',
      '3500+ Teams',
      '24-Hour CTF',
      '₹10 Lakh+ Rewards',
      'International Participation',
      'chained challneges',
    ],
  
    location: 'Online — Globally',
  
    image:
      '/events/null-origin.png',
  
    social: {
      instagram: 'https://instagram.com/nulloriginctf',
  
      website: 'https://nullorigin.cyberhx.com',
  
      ctftime: 'https://ctftime.org/event/3346',
  
      leaderboard: 'https://ctf.cyberhx.com/leaderboard',
  
      certificates: 'https://creds.cyberhx.com',
    },
  },
  {
    id: 1,
    slug: 'zeroday-heist',
    startDate: '2026-06',
    organizers: [{ name: 'CyberHx', url: 'https://cyberhx.com' }],
    searchTerms: ['zeroday heist', 'zeroday heist ctf', 'zero day heist ctf'],
    title: 'ZeroDay Heist',
    subtitle: "A Large-Scale Community-Driven Cybersecurity CTF",

    description:
      'ZeroDay Heist brought together 1.4K+ cybersecurity enthusiasts for an intense 6-hour Capture The Flag competition. Participants tackled challenges across Web Exploitation, Reverse Engineering, Cryptography, OSINT, Forensics and Pwn while competing for a ₹250K+ prize pool.',

    date: 'June 2026',
    duration: '6 Hours',
    participants: '1.4K+',
    prize: '₹250K+',

    tags: [
      'CTF',
      'Web Exploitation',
      'Reverse Engineering',
      'Cryptography',
      'OSINT',
      'Forensics',
      'Pwn'
    ],

    status: 'completed',
    category: 'Hacking',

    link: 'https://zerodayheist.cyberhx.com',

    highlights: [
      '1.4K+ Participants',
      '48 Challenges',
      '₹250K+ Prize Pool',
      'Certificates Available',
      'CTFtime Ranked Event'
    ],

    location: 'Online',

    image:
      'https://i.ibb.co/r2N3WnGJ/zerodayheistlogo.jpg',

    gallery: [
      'https://i.ibb.co/1JvxSgRG/kanak-grand-numbers.png',
      'https://i.ibb.co/6RjyB4VV/thanking-post-zerodayheist.png',
      'https://i.ibb.co/r2N3WnGJ/zerodayheistlogo.jpg',
    ],

    social: {
      instagram: 'https://instagram.com/zerodayheist',
      x: 'https://x.com/zerodayheist',
      linkedin: 'https://www.linkedin.com/company/110549481',
      website: 'https://zerodayheist.cyberhx.com',
      ctftime: 'https://ctftime.org/event/3308',
      leaderboard: 'https://zerodayheist.cyberhx.com/leaderboard',
      certificates: 'https://creds.cyberhx.com',
    },
  },
];

export const eventBySlug = (slug: string) => events.find((e) => e.slug === slug);
