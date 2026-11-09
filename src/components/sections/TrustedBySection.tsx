import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Mascot } from '../shared/Mascot';
import { useReviews } from '../../features/reviews/useReviews';

/* "Trusted by": universities running their CTFs with CyberHx. Shown on the home page and on Host a CTF.
   Add a new partner at the top of the list. `logo` is optional; without it we show the short name. */

interface Partner {
  name: string;
  short: string;
  note: string;
  event: string;
  logo?: string;
  to?: string;
}

export const partners: Partner[] = [
  {
    name: 'National Forensic Sciences University, Chennai Campus',
    short: 'NFSU',
    note: 'Institution of National Importance under the Ministry of Home Affairs, Government of India',
    event: 'Pinaka CTF · 31 Oct 2026',
    logo: '/events/nfsu-logo.webp',
    to: '/events/pinaka-ctf',
  },
  {
    name: 'Thapar Institute of Engineering & Technology',
    short: 'TIET',
    note: 'Deemed to be University · CyberHeist, run by its Backslash society',
    event: 'CyberHeist · 30 Oct 2026',
    logo: '/events/thapar-logo.webp',
    to: '/events/cyberheist',
  },
];

/** Third card: the player rating, the mascot and a way into /reviews. */
const ReviewsCard = () => {
  const { stats } = useReviews();
  return (
    <Link to="/reviews" className="sticker lift group relative flex h-full min-h-[170px] items-center gap-4 overflow-hidden p-5 sm:p-6">
      <span className="relative z-10 min-w-0 flex-1">
        <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Player reviews</span>
        <span className="font-display mt-2 block text-2xl leading-tight text-white">Wanna see our reviews?</span>
        <span className="mt-1.5 block text-sm leading-6 text-muted">
          {stats?.avg ? `${stats.avg}/5 from ${stats.responses.toLocaleString('en-IN')} players${stats.more_pct ? ` · ${stats.more_pct}% want more` : ''}` : 'What players said after our CTFs.'}
        </span>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-lime">
          Read reviews <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
      <Mascot pose="love" alt="" still className="-my-2 w-28 shrink-0 sm:w-32" />
    </Link>
  );
};

export const TrustedBySection = ({ compact = false }: { compact?: boolean }) => (
  <section aria-labelledby="trusted-h" className={`border-t border-white/[0.06] bg-ink ${compact ? 'py-14 sm:py-16' : 'py-16 sm:py-20'}`}>
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">Trusted by</p>
      <h2 id="trusted-h" className="font-display mt-3 max-w-[22ch] text-3xl leading-[1.08] text-white sm:text-4xl">
        Universities run their CTFs with us.
      </h2>
      <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {partners.map((p) => {
          const body = (
            <>
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] sm:h-24 sm:w-24 border border-white/10 bg-white">
                {p.logo
                  ? <img src={p.logo} alt={`${p.short} logo`} loading="lazy" decoding="async" className="h-full w-full object-contain p-2" />
                  : <span className="font-display text-lg tracking-tight text-ink">{p.short}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-6 text-white">{p.name}</span>
                <span className="mt-1 block text-sm leading-6 text-muted">{p.note}</span>
                <span className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-white/80">
                  {p.event}
                  {p.to && <ArrowUpRight size={14} className="text-lime" />}
                </span>
              </span>
            </>
          );
          const cls = 'sticker flex h-full items-start gap-4 p-5 sm:gap-5 sm:p-6';
          return (
            <li key={p.short}>
              {p.to ? <Link to={p.to} className={`${cls} lift group`}>{body}</Link> : <div className={cls}>{body}</div>}
            </li>
          );
        })}
        <li className="md:col-span-2 lg:col-span-1"><ReviewsCard /></li>
      </ul>
    </div>
  </section>
);
