import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

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
    event: 'CyberHeist (private) · 31 Oct 2026',
    logo: '/events/thapar-logo.webp',
    to: '/events/cyberheist',
  },
];

export const TrustedBySection = ({ compact = false }: { compact?: boolean }) => (
  <section aria-labelledby="trusted-h" className={`border-t border-white/[0.06] bg-ink ${compact ? 'py-14 sm:py-16' : 'py-16 sm:py-20'}`}>
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">Trusted by</p>
      <h2 id="trusted-h" className="font-display mt-3 max-w-[22ch] text-3xl leading-[1.08] text-white sm:text-4xl">
        Universities run their CTFs with us.
      </h2>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {partners.map((p) => {
          const body = (
            <>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white">
                {p.logo
                  ? <img src={p.logo} alt={`${p.short} logo`} loading="lazy" decoding="async" className="h-full w-full object-contain p-1.5" />
                  : <span className="font-display text-lg tracking-tight text-ink">{p.short}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-6 text-white">{p.name}</span>
                <span className="mt-1 block text-sm leading-6 text-muted">{p.note}</span>
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-lime/25 bg-lime/[0.07] px-3 py-1 text-xs font-semibold text-lime">
                  {p.event}
                  {p.to && <ArrowUpRight size={13} />}
                </span>
              </span>
            </>
          );
          const cls = 'sticker flex items-start gap-4 p-5 sm:p-6';
          return (
            <li key={p.short}>
              {p.to ? <Link to={p.to} className={`${cls} lift group`}>{body}</Link> : <div className={cls}>{body}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  </section>
);
