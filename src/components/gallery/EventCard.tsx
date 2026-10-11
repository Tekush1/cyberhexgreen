import { useRef, type PointerEvent } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight, BadgeCheck, ListOrdered, MapPin } from 'lucide-react';
import type { Event } from '../../data/events';
import { CountUp } from '../shared/CountUp';
import { SiteIcon } from '../shared/SiteIcon';
import { STATUS, durationShort, pad2, parseCount, prizeShort } from './eventStyle';

const ease = [0.16, 1, 0.3, 1] as const;
const spring = { stiffness: 160, damping: 18, mass: 0.6 };

const tagList = { hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.25 } } };
const tagItem = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease } },
};

/** One event: a white card, poster on a light stage with a subtle 3D tilt,
    details and actions beside it. White / grey / lime. */
export function EventCard({ event, index, onOpen }: { event: Event; index: number; onOpen: () => void }) {
  const reduce = !!useReducedMotion();
  const s = STATUS[event.status];

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [5.5, -5.5]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), spring);
  const glare = useTransform(px, [-0.5, 0.5], ['100% 0%', '0% 0%']);

  const posterRef = useRef<HTMLDivElement>(null);
  const onPosterMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onPosterLeave = () => {
    px.set(0);
    py.set(0);
  };

  const players = parseCount(event.participants);
  const tags = event.tags.slice(0, 6);
  const more = event.tags.length - tags.length;

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.8, ease }}
      className="group relative grid overflow-hidden rounded-[30px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_70px_-34px_rgba(16,24,40,0.3)] lg:grid-cols-[1.05fr_1fr]"
    >
      {/* ── Poster stage ── */}
      <div
        ref={posterRef}
        onPointerMove={onPosterMove}
        onPointerLeave={onPosterLeave}
        className="relative flex min-h-[15rem] items-center justify-center overflow-hidden bg-[#f1f3ee] p-6 [perspective:1100px] sm:p-10 lg:min-h-[24rem]"
      >
        <div aria-hidden="true" className="ev-floor-light absolute inset-x-[-40%] bottom-0 h-[72%]" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 right-4 select-none font-display text-[6.5rem] leading-none text-black/[0.05] sm:-bottom-9 sm:text-[10rem]"
        >
          {pad2(index + 1)}
        </span>

        <span className={`absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] ${s.chip}`}>
          <span className="relative flex h-1.5 w-1.5">
            {event.status !== 'completed' && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: s.dot }} />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
          </span>
          {s.label}
        </span>
        <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/55 ring-1 ring-black/[0.06] backdrop-blur-sm">
          <MapPin size={11} aria-hidden="true" />
          {event.location}
        </span>

        <motion.button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${event.title}`}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className="relative w-full max-w-[34rem] overflow-hidden rounded-2xl bg-white shadow-[0_26px_50px_-24px_rgba(16,24,40,0.5)] ring-1 ring-black/[0.08]"
        >
          <div className="relative aspect-[2/1] w-full overflow-hidden bg-[#0b0f1a]">
            <img src={event.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl" />
            <img
              src={event.image}
              alt={event.title}
              loading="lazy"
              className="relative h-full w-full object-contain transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
            />
            <motion.span
              aria-hidden="true"
              style={{ backgroundPosition: glare }}
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 [background-image:linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.55)_50%,transparent_60%)] [background-size:250%_100%] group-hover:opacity-100"
            />
          </div>
        </motion.button>
      </div>

      {/* ── Details ── */}
      <div className="flex flex-col p-6 sm:p-9">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/45">
          <span className="text-[#7a9a00]">Event {pad2(index + 1)}</span>
        </p>
        <h3 className="font-display mt-3 text-[1.9rem] leading-[1] text-ink sm:text-[2.4rem]">{event.title}</h3>
        <p className="mt-3 max-w-md leading-7 text-ink/55">{event.subtitle}</p>

        <dl className="mt-7 grid grid-cols-2 overflow-hidden rounded-2xl border border-black/[0.07] bg-[#fafbf8]">
          <div className="border-r border-black/[0.07] px-4 py-3.5">
            <dt className="text-[11px] uppercase tracking-[0.12em] text-ink/40">Players</dt>
            <dd className="font-display mt-1.5 text-2xl text-ink">
              {players ? <CountUp to={players.to} decimals={players.decimals} suffix={players.suffix} /> : event.participants}
            </dd>
          </div>
          <div className="px-4 py-3.5">
            <dt className="text-[11px] uppercase tracking-[0.12em] text-ink/40">Duration</dt>
            <dd className="font-display mt-1.5 text-2xl text-ink">{durationShort(event.duration)}</dd>
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3 border-t border-black/[0.07] bg-lime/10 px-4 py-3.5">
            <div className="min-w-0">
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#6f8a00]">Prize pool</dt>
              <dd className="font-display mt-1.5 text-[1.7rem] leading-none text-ink sm:text-3xl">{prizeShort(event.prize)}</dd>
            </div>
            <SiteIcon name="trophy" size={46} alt="" className="shrink-0 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" />
          </div>
        </dl>

        <motion.ul
          variants={tagList}
          initial={reduce ? false : 'hidden'}
          whileInView="show"
          viewport={{ once: true }}
          className="mt-6 flex flex-wrap gap-1.5"
          aria-label="Categories"
        >
          {tags.map((t) => (
            <motion.li
              key={t}
              variants={tagItem}
              className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-medium text-ink/65"
            >
              {t}
            </motion.li>
          ))}
          {more > 0 && (
            <motion.li variants={tagItem} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] text-ink/45">
              +{more}
            </motion.li>
          )}
        </motion.ul>

        <div className="mt-auto flex flex-wrap items-center gap-2.5 border-t border-black/[0.06] pt-6">
          <button
            type="button"
            onClick={onOpen}
            className="group/btn inline-flex min-h-[48px] items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(16,24,40,0.6)] transition-transform duration-300 hover:-translate-y-0.5"
          >
            Open event
            <ArrowUpRight size={17} className="transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </button>
          {event.social?.leaderboard && (
            <a href={event.social.leaderboard} target="_blank" rel="noopener noreferrer" className="ev-chip-light">
              <ListOrdered size={15} aria-hidden="true" /> Leaderboard
            </a>
          )}
          {event.social?.certificates && (
            <a href={event.social.certificates} target="_blank" rel="noopener noreferrer" className="ev-chip-light">
              <BadgeCheck size={15} aria-hidden="true" /> Certificates
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default EventCard;
