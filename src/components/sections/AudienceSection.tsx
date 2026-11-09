import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/* Home: "Who is CyberHx for?" Three doors, one per audience, so a visitor finds their page in one click.
   The same three live under Solutions in the navigation. */

const AUDIENCES: { who: string; title: string; text: string; points: string[]; to: string; cta: string }[] = [
  {
    who: 'For students and players',
    title: 'Play, learn, get hired.',
    text: 'Free CTFs with players from 90+ countries, hands-on labs, and certifications companies can verify.',
    points: ['Play our next CTF', 'Train on the Pentest Lab', 'Earn CAPT or CPPT'],
    to: '/events',
    cta: 'See upcoming CTFs',
  },
  {
    who: 'For colleges and universities',
    title: 'A campus program, run for you.',
    text: 'CTFs we build and host under your name, labs for a whole batch, and a report for your department after every event.',
    points: ['Campus CTFs from $89', 'Academic pricing, Razorpay invoices', 'The CyberHx Campus League'],
    to: '/universities',
    cta: 'CyberHx for Universities',
  },
  {
    who: 'For companies',
    title: 'Hire and train by skill.',
    text: 'Branded hiring CTFs, a shortlist backed by real results, and private training for your security team.',
    points: ['Hiring CTFs under your brand', 'Verified, ranked candidates', 'Team training and certification'],
    to: '/companies',
    cta: 'CyberHx for Companies',
  },
];

export const AudienceSection = () => (
  <section aria-labelledby="audience-h" className="border-t border-white/[0.06] bg-ink py-20 sm:py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="audience-h" className="font-display text-[2.1rem] leading-[1.05] text-white sm:text-5xl">
          Who is CyberHx for?
        </h2>
        <p className="max-w-md text-[15px] leading-7 text-white/50">Pick your door. Everything on this site is built for one of these three.</p>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {AUDIENCES.map((a, i) => (
          <Link
            key={a.to}
            to={a.to}
            className={`sticker lift group flex flex-col p-6 sm:p-7 ${i === 1 ? 'sticker-lime' : ''}`}
          >
            <p className="text-[15px] font-medium text-white/50">{a.who}</p>
            <h3 className="font-display mt-3 text-[1.9rem] leading-[1.1] text-white">{a.title}</h3>
            <p className="mt-3 leading-7 text-muted">{a.text}</p>
            <ul className="mt-5 space-y-2 text-[15px] text-white/80">
              {a.points.map((p) => (
                <li key={p} className="flex items-start gap-3"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />{p}</li>
              ))}
            </ul>
            <span className="mt-auto inline-flex items-center gap-2 pt-7 font-semibold text-white">
              {a.cta} <ArrowRight size={17} className="text-lime transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default AudienceSection;
