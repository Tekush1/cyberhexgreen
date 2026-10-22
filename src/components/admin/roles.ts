// Team roles in the admin panel. Must match public.can() in supabase/team_roles.sql
// (the database is what actually enforces this; the tabs just hide what a role can't open).

export type Role = 'owner' | 'hr' | 'campaign' | 'event' | 'outreach';
export type TabId =
  | 'inbox' | 'submissions' | 'posts' | 'meetings' | 'applications' | 'ctf'
  | 'availability' | 'emails' | 'campaigns' | 'subscribers' | 'payments' | 'outreach' | 'team';

export const ROLES: Record<Role, { label: string; short: string; about: string; tabs: TabId[] }> = {
  owner: {
    label: 'Owner',
    short: 'Owner',
    about: 'Everything, plus adding and removing team members.',
    tabs: ['inbox', 'submissions', 'posts', 'meetings', 'applications', 'ctf', 'payments', 'availability', 'emails', 'campaigns', 'subscribers', 'outreach', 'team'],
  },
  hr: {
    label: 'HR',
    short: 'HR',
    about: 'Job applications, interview meetings, availability and emails to candidates.',
    tabs: ['applications', 'meetings', 'availability', 'emails'],
  },
  campaign: {
    label: 'Campaign & newsletter manager',
    short: 'Campaigns',
    about: 'Campaigns, newsletters, the subscriber list and the blog.',
    tabs: ['campaigns', 'subscribers', 'submissions', 'posts'],
  },
  event: {
    label: 'Event manager',
    short: 'Events',
    about: 'CTF requests and payments, the contact inbox, meetings and event campaigns.',
    tabs: ['ctf', 'payments', 'inbox', 'meetings', 'campaigns'],
  },
  outreach: {
    label: 'Outreach',
    short: 'Outreach',
    about: 'Outreach only: CTF organiser leads, pitch emails and their history, CTF-call booking links and the hours for those calls.',
    tabs: ['outreach'], // call hours live inside Outreach now (each person has their own)
  },
};

export const isRole = (r: unknown): r is Role => typeof r === 'string' && r in ROLES;
