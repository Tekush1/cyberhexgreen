// Subscription plans for institutions and companies, shown on /pricing next to the per-event packages.
// Monthly price is the list price; annual is ten months (two free) and locks the price for the year.
// Change a number here and the page, the per-seat maths and the "bought one by one" anchor follow.

export type PlanAudience = 'institutions' | 'companies';

export interface Plan {
  id: string;
  name: string;
  /** Who it is for, in one line. */
  who: string;
  /** USD per month when billed monthly. Annual = monthlyUsd * annualMonths. */
  monthlyUsd: number;
  /** Hosted CTFs included per year. */
  ctfs: number;
  /** Players per CTF. */
  players: number;
  /** Pentest Lab seats included for the year. */
  seats: number;
  includes: string[];
  /** What the annual plan adds on top of the discount; lower-case, it is used mid-sentence too. */
  annualBonus: string;
  /** A sentence that makes the price feel small. */
  framing: string;
  recommended?: boolean;
  cta: { label: string; to: string };
}

/** Months paid on an annual plan: twelve months for the price of ten. */
export const annualMonths = 10;
export const annualUsd = (p: Plan) => p.monthlyUsd * annualMonths;
/** The annual price spread over twelve months, rounded down to a whole dollar. */
export const annualPerMonthUsd = (p: Plan) => Math.floor(annualUsd(p) / 12);
export const annualSavingPct = Math.round((1 - annualMonths / 12) * 100);

export const plans: Record<PlanAudience, Plan[]> = {
  institutions: [
    {
      id: 'club',
      name: 'Club',
      who: 'For one student society or a cyber cell.',
      monthlyUsd: 59,
      ctfs: 2,
      players: 1000,
      seats: 5,
      includes: [
        'Two hosted CTFs a year under your name, up to 1,000 players each',
        'Certificates for every player, a report for your faculty after each event',
        'Five Pentest Lab seats for the organising team',
        'Points on the CyberHx Campus League',
        'A named contact at CyberHx',
      ],
      annualBonus: 'one extra CTF for your fest, on us',
      framing: 'About the price of one textbook a month.',
      cta: { label: 'Start with Club', to: '/universities#plan' },
    },
    {
      id: 'campus',
      name: 'Campus',
      who: 'For a department. One CTF every quarter.',
      monthlyUsd: 149,
      ctfs: 4,
      players: 1000,
      seats: 20,
      includes: [
        'Four hosted CTFs a year, one every quarter, up to 1,000 players each',
        'Twenty Pentest Lab seats, CAPT at academic price for every student',
        'A department report after each event and a yearly summary for your dean',
        'Your campus page on the CyberHx Campus League',
        'Student ambassadors onboarded on your campus',
        'A named contact who knows your calendar',
      ],
      annualBonus: 'one extra CTF for your fest, on us',
      framing: 'Under $5 per student a year, for a department of 300.',
      recommended: true,
      cta: { label: 'Start with Campus', to: '/universities#plan' },
    },
    {
      id: 'university',
      name: 'University',
      who: 'For the whole institution. A CTF every month.',
      monthlyUsd: 399,
      ctfs: 12,
      players: 2000,
      seats: 60,
      includes: [
        'A hosted CTF every month, up to 2,000 players each',
        'Sixty Pentest Lab seats, CAPT and CPPT at academic price',
        'Two practitioner workshops a year, online or on campus',
        'Introductions to companies hiring from the CyberHx community',
        'A quarterly review with your department',
        'Priority support, purchase orders and your paperwork',
      ],
      annualBonus: 'two extra CTFs a year, on us',
      framing: 'Under $2 per student a year, for 2,500 students.',
      cta: { label: 'Plan University', to: '/universities#plan' },
    },
  ],
  companies: [
    {
      id: 'team',
      name: 'Team',
      who: 'For a security team that trains by doing.',
      monthlyUsd: 99,
      ctfs: 4,
      players: 1000,
      seats: 10,
      includes: [
        'Ten Pentest Lab seats for your team',
        'A private team CTF every quarter',
        'A skills report for each person after every event',
        'CPPT for the team at team price',
        'A named contact at CyberHx',
      ],
      annualBonus: 'one extra team CTF, on us',
      framing: 'About $8 per engineer a month.',
      cta: { label: 'Start with Team', to: '/companies#apply' },
    },
    {
      id: 'hiring',
      name: 'Hiring',
      who: 'For teams that hire every quarter.',
      monthlyUsd: 299,
      ctfs: 4,
      players: 1000,
      seats: 25,
      includes: [
        'Four hiring CTFs a year under your brand, up to 1,000 candidates each',
        'A ranked shortlist with verified write-ups within 48 hours of each event',
        'Ten challenges a year built around your roles and stack',
        'Twenty-five Pentest Lab seats for the team you already have',
        'Everything in Team',
      ],
      annualBonus: 'one extra hiring CTF, on us',
      framing: 'Five hiring rounds for less than one agency fee.',
      recommended: true,
      cta: { label: 'Start with Hiring', to: '/companies#apply' },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      who: 'For security hiring and training at scale.',
      monthlyUsd: 799,
      ctfs: 12,
      players: 2000,
      seats: 75,
      includes: [
        'A CTF every month, hiring or team, up to 2,000 players each',
        'Seventy-five Pentest Lab seats, CAPT and CPPT in bulk at team price',
        'Thirty challenges a year on your stack, two private workshops',
        'Priority support and a quarterly review',
        'Purchase orders, NDAs and your security paperwork',
      ],
      annualBonus: 'two extra CTFs a year, on us',
      framing: 'A CTF every month for less than one bad hire.',
      cta: { label: 'Plan Enterprise', to: '/companies#apply' },
    },
  ],
};
