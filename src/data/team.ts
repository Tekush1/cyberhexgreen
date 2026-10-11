/* =============================================================
   TEAM — shown on /about and /hall-of-fame.
   Only the name and the role at CyberHx are shown. To add someone,
   add a line to the right group. Leave `image` empty to show initials.
============================================================= */

export type TeamTier = 'lead' | 'core' | 'mentor' | 'crew';
export type TeamMember = { name: string; role: string; image?: string };

export const teamGroups: { tier: TeamTier; title: string; eyebrow: string; badge: string; members: TeamMember[] }[] = [
  {
    tier: 'lead',
    title: 'Leadership',
    eyebrow: 'Founders',
    badge: 'FOUNDERS',
    members: [
      { name: 'Kushagra Dwivedi', role: 'Founder', image: 'https://i.ibb.co/dw8SKDgt/kush1.jpg' },
      { name: 'Aman Singh Tomar', role: 'Co-founder', image: 'https://i.ibb.co/TDd8BKQW/profile-no-star-aman-tomar.png' },
    ],
  },
  {
    tier: 'core',
    title: 'Core team',
    eyebrow: 'Running CyberHx day to day',
    badge: 'CORE',
    members: [
      { name: 'Kjss Srivatsav', role: 'Trainer & Sales', image: 'https://i.ibb.co/KpRM8cTV/Screenshot-from-2026-06-05-18-45-45.png' },
      { name: 'Charlie', role: 'Management' },
      { name: 'Samit Pal', role: 'Event Lead', image: 'https://i.ibb.co/nsr49BLB/Chat-GPT-Image-Jun-13-2026-01-39-04-AM.png' },
      {
        name: 'Ritesh Ekbote',
        role: 'Security Researcher',
        image:
          'https://media.licdn.com/dms/image/v2/D4E03AQEdGwpoaCumUA/profile-displayphoto-crop_800_800/B4EZlL6wnrIQAI-/0/1757915319542?e=1782345600&v=beta&t=iIYnyypRwUFwNxD46ECHueiwfsgDLNz3Gny1V2JHxfY',
      },
    ],
  },
  {
    tier: 'mentor',
    title: 'Mentors',
    eyebrow: 'Guiding our players',
    badge: 'MENTOR',
    members: [
      { name: 'Prasad Chinchore', role: 'Mentor', image: 'https://i.ibb.co/kg13yFGG/Prasad-Photo-Prasad-Chinchore.jpg' },
      { name: 'Mithun M Achary', role: 'Mentor', image: 'https://i.ibb.co/DgWyfDyg/Whats-App-Image-2026-06-21-at-12-34-09-AM.jpg' },
      { name: 'Sathwika Putrevu', role: 'Mentor', image: 'https://i.ibb.co/MkQzktLz/IMG-3647-Sathwika-Putrevu.jpg' },
    ],
  },
  {
    tier: 'crew',
    title: 'Volunteers',
    eyebrow: 'Making our events happen',
    badge: 'CREW',
    members: [{ name: 'Sejal Tiwari', role: 'Volunteer', image: 'https://i.ibb.co/0pCqJfQY/Whats-App-Image-2025-04-29-at-8-31-07-PM.jpg' }],
  },
];
