// Per-seat pricing for colleges and companies, shown on /pricing, /universities and /companies.
// Colleges: a seat is one student on the CyberHx Academy for twelve months (daily labs, practice challenges, the
// college's classes, exams, syllabus, schedule and reports for their teachers). Teacher seats are free.
// Companies: a seat is one person on the Pentest Lab for twelve months with the CAPT and CPPT courses and exams.
// The more seats, the less each costs. Two price lists: India (rupees, set for Indian budgets) and global (USD).
// No GST is charged at the moment: the price shown is the total. Research behind these numbers:
// "CyberHx-Academic-Seat-Pricing.pdf" and "CyberHx-Company-Seat-Pricing.pdf".

export type SeatAudience = 'academic' | 'company';

export interface Slab {
  name: string;
  min: number;
  max: number;
  usd: number;
  inr: number;
  /** Who it suits, in a few words. */
  fits: string;
  /** What the slab adds on top of the seats. */
  adds: string[];
  /** Hosted CTFs a year included. */
  ctfs: number;
  recommended?: boolean;
}

export interface SeatList {
  /** What one seat is, in one line. */
  seat: string;
  min: number;
  max: number;
  /** Above max: a quote, never below this per seat. */
  floor: { usd: number; inr: number };
  slabs: Slab[];
  /** Free seats for the people running it: one per `per` seats, at least 1, at most `cap`. */
  freeSeats: { label: string; per: number; cap: number };
  /** An optional add-on per seat, priced; or a line of text when it is quoted. */
  upgrade: { label: string; usd: number; inr: number } | { label: string; text: string };
  /** What an included CTF is called and what it would cost on its own. */
  ctf: { one: string; many: string; usd: number; inr: number };
  /** Short promises shown under the calculator. */
  terms: string[];
}

export const seatLists: Record<SeatAudience, SeatList> = {
  academic: {
    seat: 'One student on the CyberHx Academy for twelve months: daily labs, the practice challenge library, and your college\'s classes, exams, syllabus and schedule. Teachers get the dashboard and reports.',
    min: 10,
    max: 500,
    floor: { usd: 15, inr: 1199 },
    freeSeats: { label: 'teacher', per: 25, cap: 10 },
    upgrade: { label: 'Pentest Lab and the CAPT certification for your students', text: 'at an academic price, ask us' },
    ctf: { one: 'hosted campus CTF', many: 'hosted campus CTFs', usd: 89, inr: 7999 },
    terms: ['Inactive seats replaced free in the first 30 days', 'A 10–24 seat pilot is credited in full if you move to 50+ seats within 60 days'],
    slabs: [
      { name: 'Starter', min: 10, max: 24, usd: 59, inr: 4999, ctfs: 0, fits: 'A pilot for a club or one section', adds: ['Teacher dashboard, exams, syllabus and reports'] },
      { name: 'Section', min: 25, max: 49, usd: 49, inr: 3999, ctfs: 0, fits: 'One class section', adds: ['Teacher dashboard, exams, syllabus and reports'] },
      { name: 'Department', min: 50, max: 99, usd: 39, inr: 2999, ctfs: 1, fits: 'One batch of 60–64 students', adds: ['Teacher dashboard, exams, syllabus and reports', 'One hosted campus CTF a year'], recommended: true },
      { name: 'School', min: 100, max: 199, usd: 29, inr: 2499, ctfs: 2, fits: 'Two to three batches', adds: ['Everything for teachers, plus your college logo', 'Two CTFs a year', 'One online workshop', 'Reports ready for NAAC/NBA files'] },
      { name: 'Campus', min: 200, max: 349, usd: 24, inr: 1999, ctfs: 4, fits: 'A whole department, all years', adds: ['A head of department who runs the teachers', 'A CTF every quarter', 'Campus ambassadors onboarded'] },
      { name: 'University', min: 350, max: 500, usd: 19, inr: 1499, ctfs: 6, fits: 'Several departments', adds: ['Six CTFs a year', 'A quarterly review', 'A named account manager'] },
    ],
  },
  company: {
    seat: 'One person, twelve months of the Pentest Lab, the CAPT and CPPT courses, both exams and verifiable certificates, with a skills report for the manager.',
    min: 5,
    max: 500,
    floor: { usd: 69, inr: 5999 },
    freeSeats: { label: 'manager', per: 20, cap: 10 },
    upgrade: { label: 'Add a private team CTF', usd: 99, inr: 8999 },
    ctf: { one: 'private team CTF', many: 'private team CTFs', usd: 99, inr: 8999 },
    terms: ['30-day money-back on your first order', 'Seats move to a new person when someone leaves', '20% off hiring CTFs from 25 seats'],
    slabs: [
      { name: 'Team', min: 5, max: 9, usd: 199, inr: 16999, ctfs: 0, fits: 'A small security team', adds: ['Skills report per person'] },
      { name: 'Squad', min: 10, max: 24, usd: 179, inr: 14999, ctfs: 0, fits: 'A security team and its new hires', adds: ['Skills report per person', 'Manager dashboard'] },
      { name: 'Department', min: 25, max: 49, usd: 149, inr: 12499, ctfs: 1, fits: 'Security plus the engineers who ship code', adds: ['One private team CTF a year'], recommended: true },
      { name: 'Business', min: 50, max: 99, usd: 129, inr: 10999, ctfs: 2, fits: 'Several teams', adds: ['Two private CTFs a year', 'A quarterly skills review'] },
      { name: 'Enterprise', min: 100, max: 249, usd: 109, inr: 8999, ctfs: 4, fits: 'Security, engineering and IT', adds: ['A private CTF every quarter', 'Custom challenges on your stack', 'A named account manager'] },
      { name: 'Global', min: 250, max: 500, usd: 89, inr: 7499, ctfs: 6, fits: 'Several offices or a whole company', adds: ['Six private CTFs a year', 'Purchase orders and NDAs', 'Priority support'] },
    ],
  },
};

export interface SeatQuote {
  people: number;
  /** Seats billed: more than `people` when the next slab costs the same or less. */
  seats: number;
  slab: Slab;
  perSeat: number;
  total: number;
  perPersonMonth: number;
  freeSeats: number;
  buyUp: boolean;
}

/** Price `people` seats in a currency, moving to the next slab when it costs the same or less (the buy-up rule). */
export function quoteSeats(list: SeatList, people: number, cur: 'usd' | 'inr'): SeatQuote | null {
  if (people < list.min || people > list.max) return null;
  const slab = list.slabs.find((s) => people >= s.min && people <= s.max)!;
  let best = { seats: people, slab, total: people * slab[cur] };
  for (const s of list.slabs) {
    if (s.min > people && s.min * s[cur] <= best.total) {
      best = { seats: s.min, slab: s, total: s.min * s[cur] };
      break;
    }
  }
  const free = Math.min(list.freeSeats.cap, Math.max(1, Math.floor(best.seats / list.freeSeats.per)));
  return {
    people,
    seats: best.seats,
    slab: best.slab,
    perSeat: best.slab[cur],
    total: best.total,
    perPersonMonth: Math.round(best.total / people / 12),
    freeSeats: free,
    buyUp: best.seats > people,
  };
}
