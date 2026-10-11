import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teamGroups, type TeamMember, type TeamTier } from '../data/team';

/* Team as CyberHx access badges: lanyard slot, glowing photo ring, barcode,
   holographic foil that wakes up on hover and a 3D tilt toward the cursor.
   Only the name and the role at CyberHx are shown. */

const initials = (n: string) =>
  n
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** A barcode unique to each name (same name, same bars). */
function barcode(name: string) {
  const bars: number[] = [];
  for (let i = 0; i < 26; i++) bars.push(((name.charCodeAt(i % name.length) * (i + 7)) % 3) + 1);
  return bars;
}

const fine = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
const still = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Badge({ m, id, tier, label, i }: { m: TeamMember; id: number; tier: TeamTier; label: string; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [broken, setBroken] = useState(!m.image);
  const img = useRef<HTMLImageElement>(null);
  // A photo already in the cache can finish before onLoad is attached.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth) el.classList.add('is-in');
  }, []);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !fine() || still()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: Math.min(i, 4) * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
      className="badge-wrap"
    >
      <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`badge badge-${tier}`}>
        <span className="badge-foil" aria-hidden="true" />
        <span className="badge-slot" aria-hidden="true" />
        <div className="badge-top font-mono" aria-hidden="true">
          <span>
            CYBERHX<span className={tier === 'lead' ? '' : 'max-sm:hidden'}> // ACCESS</span>
          </span>
          <span className="text-lime">ID-{String(id).padStart(3, '0')}</span>
        </div>

        <div className="badge-photo">
          {broken ? (
            <span className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(198,241,53,0.22),transparent_65%),linear-gradient(180deg,#121c38,#070a14)] font-display text-[1.6em] text-white/85">
              {initials(m.name)}
            </span>
          ) : (
            <img
              ref={img}
              src={m.image}
              alt={m.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
              onLoad={(e) => e.currentTarget.classList.add('is-in')}
              className="badge-img h-full w-full object-cover object-top"
            />
          )}
        </div>

        <h3 className="badge-name font-display">{m.name}</h3>
        <p className="badge-role font-mono">{m.role}</p>

        <div className="badge-foot" aria-hidden="true">
          <span className="badge-code">
            {barcode(m.name).map((w, k) => (
              <i key={k} style={{ width: w } as CSSProperties} />
            ))}
          </span>
          <span className="font-mono">{label}</span>
        </div>
      </div>
    </motion.div>
  );
}

const grids: Record<TeamTier, string> = {
  lead: 'mx-auto grid max-w-[20rem] gap-6 sm:max-w-3xl sm:grid-cols-2 sm:gap-8',
  core: 'team-row',
  mentor: 'team-row',
  crew: 'team-row',
};

export const TeamSection = ({ heading = true }: { heading?: boolean }) => {
  let id = 0;
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-ink py-24 sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[60rem] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(198,241,53,0.07),transparent)]" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        {heading && (
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-lime">The team</p>
            <h2 className="mt-3 font-display text-4xl text-white sm:text-5xl">Who runs CyberHx</h2>
          </div>
        )}

        {teamGroups.map((g) => (
          <div key={g.tier} className={g.tier === 'lead' ? 'mt-14' : 'mt-20 sm:mt-24'}>
            {g.tier !== 'lead' && (
              <div className="mb-8 flex items-end justify-between gap-4 border-b border-white/[0.07] pb-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">{g.eyebrow}</p>
                  <h3 className="mt-2 font-display text-2xl text-white sm:text-3xl">{g.title}</h3>
                </div>
                <span className="font-mono text-xs text-white/35">{String(g.members.length).padStart(2, '0')}</span>
              </div>
            )}
            <div className={grids[g.tier]}>
              {g.members.map((m, i) => (
                <Badge key={m.name} m={m} id={++id} tier={g.tier} label={g.badge} i={i} />
              ))}
            </div>
          </div>
        ))}

        <div className="team-cta mt-24 sm:mt-28">
          <div>
            <h3 className="font-display text-2xl text-white sm:text-3xl">Want a badge of your own?</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              We're always looking for mentors, trainers and people who love running great events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/become-mentor" className="btn-glow">
              Become a mentor
            </Link>
            <Link to="/contact" className="btn-arrow">
              Work with us
              <span className="btn-arrow-dot" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
