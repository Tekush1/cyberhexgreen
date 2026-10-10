import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { SiteIcon } from '../shared/SiteIcon';

/**
 * Keep this in sync with src/pages/CollaborationsPage.tsx.
 * Add a new entry here every time a partnership / MOU is signed.
 */
const collaborations: {
  org: string;
  type: string;
  location: string;
  date: string;
  description: string;
  link?: string;
  logo?: string;
}[] = [
  {
    org: 'E-Cell IIT Indore',
    type: 'Outreach Partner',
    location: 'Indore, India',
    date: 'June 2026',
    description:
      'Officially partnered with the Entrepreneurship Cell of IIT Indore as an outreach partner, with an MOU signed between both organisations.',
    link: 'https://ecell.iiti.ac.in',
    logo: '/ecell-iiti-logo.jpeg',
  },
];

export const CollaborationsSection = () => (
  <section className="border-t-2 border-line bg-ink py-20 sm:py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="flex flex-col items-start gap-5 sm:flex-row">
          <SiteIcon name="hacker-team" size={96} alt="" />
          <div>
            <h2 className="font-display text-4xl text-white sm:text-5xl">Who we work with</h2>
            <p className="mt-4 max-w-md leading-7 text-muted">
              Colleges and communities that partner with us on outreach and events. Want your campus on this list?
            </p>
            <Link to="/collaborations" className="mt-5 inline-block font-semibold text-lime underline underline-offset-4">
              Partner with CyberHx
            </Link>
          </div>
        </div>

        <div className={`grid gap-6 ${collaborations.length > 1 ? "sm:grid-cols-2" : "max-w-xl"}`}>
          {collaborations.map((c) => (
            <div key={c.org} className="sticker flex flex-col p-6">
              <div className="flex items-center gap-4">
                {c.logo && (
                  <img
                    src={c.logo}
                    alt={`${c.org} logo`}
                    className="h-14 w-14 rounded-xl bg-white object-contain p-1"
                    loading="lazy"
                  />
                )}
                <div>
                  <h3 className="font-display text-xl text-white">{c.org}</h3>
                  <p className="text-sm font-semibold text-lime">{c.type}, MOU signed</p>
                </div>
              </div>
              <p className="mt-4 flex-1 leading-7 text-muted">{c.description}</p>
              <p className="mt-4 flex items-center gap-1.5 text-sm text-white/60">
                <MapPin size={14} className="text-glow" />
                {c.location}, {c.date}
              </p>
              {c.link && (
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 font-semibold text-white underline underline-offset-4 hover:text-lime"
                >
                  Visit {c.org}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
