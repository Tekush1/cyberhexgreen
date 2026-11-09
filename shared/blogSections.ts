// The blog's sections: each one is a page of its own (/blog/<slug>) that gathers one or more post categories.
// Shared by the site (src/features/blog), the crawler pages (api/prerender.ts) and the sitemap (api/sitemap.ts).

export interface BlogSection {
  slug: string;
  name: string;
  /** Post categories (blog_posts.category) that belong to this section. */
  categories: string[];
  title: string;
  description: string;
  /** One line under the heading on the section page. */
  lead: string;
}

export const BLOG_SECTIONS: BlogSection[] = [
  {
    slug: 'news',
    name: 'News',
    categories: ['News & Updates'],
    title: 'CyberHx News — Announcements, Events and Results',
    description: 'What is new at CyberHx: upcoming CTFs, results, partnerships, platform updates and program announcements.',
    lead: 'What is new at CyberHx: events, results, partnerships and updates.',
  },
  {
    slug: 'writeups',
    name: 'Write-ups',
    categories: ['CTF Writeups'],
    title: 'CTF Write-ups — Solutions from CyberHx Events',
    description: 'How players solved CyberHx CTF challenges: write-ups by event, by writer and by difficulty, from web and crypto to forensics and reverse engineering.',
    lead: 'How the challenges were solved, by the people who solved them.',
  },
  {
    slug: 'tutorials',
    name: 'Tutorials',
    categories: ['Tutorials'],
    title: 'Cybersecurity Tutorials — Step-by-step Guides from CyberHx',
    description: 'Hands-on, step-by-step security tutorials: tools, techniques and methodology for CTF players and aspiring penetration testers.',
    lead: 'Step-by-step guides you can follow today.',
  },
  {
    slug: 'scam-alerts',
    name: 'Scam alerts',
    categories: ['Scam Alert', 'Fraud Investigation', 'Social Engineering', 'Email Security'],
    title: 'Scam Alerts — Fraud, Phishing and Social Engineering Breakdowns',
    description: 'Current scams taken apart: how they work, who they target and how to stay safe. Fraud investigations, phishing and social engineering from the CyberHx community.',
    lead: 'Current scams, taken apart so you can spot the next one.',
  },
  {
    slug: 'research',
    name: 'Research',
    categories: ['Web Security', 'Malware Analysis', 'Mobile Security', 'Blockchain & Web3'],
    title: 'Security Research — Web, Malware, Mobile and Web3 from CyberHx',
    description: 'Deep dives from the CyberHx community: web vulnerabilities, malware analysis, mobile security and attacks on blockchain and web3.',
    lead: 'Deep dives into web, malware, mobile and web3 security.',
  },
];

export const blogSection = (slug: string) => BLOG_SECTIONS.find((s) => s.slug === slug) || null;
export const sectionForCategory = (category: string) => BLOG_SECTIONS.find((s) => s.categories.includes(category)) || null;
