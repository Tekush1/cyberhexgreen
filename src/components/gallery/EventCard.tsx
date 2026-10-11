import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight, BadgeCheck, ListOrdered, MapPin } from 'lucide-react';
import type { Event } from '../../data/events';
import { CountUp } from '../shared/CountUp';
import { SiteIcon } from '../shared/SiteIcon';
import { STATUS, accentFor, durationShort, pad2, parseCount, prizeShort, tagTone } from './eventStyle';

const ease = [0.16, 1, 0.3, 1] as const;
const spring = { stiffness: 160, damping: 18, mass: 0.6 };

const tagList = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } },
};
const tagItem = {
  hidden: { opacity: 0, y: 10, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease } },
};

/** One event in the archive: a tilting poster with ambient light on one
    side, the numbers and actions on the other. */
export function EventCard({ event, index, onOpen }: { event: Event; index: number; onOpen: () => void }) {
  const reduce = !!useReducedMotion();
  const a = accentFor(index);
  const s = STATUS[event.status];
  const cardRef = useRef<HTMLElement>(null);

  // poster tilt
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), spring);
  const glare = useTransform(px, [-0.5, 0.5], ['100% 0%', '0% 0%']);

  const onCardMove = (e: PointerEvent<HTMLElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
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
      ref={cardRef}
      onPointerMove={onCardMove}
      initial={reduce ? false : { opacity: 0, y: 70, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1, ease }}
      style={
        {
          '--a1': a.from,
          '--a2': a.to,
          background: `linear-gradient(140deg, ${a.from}aa 0%, rgba(255,255,255,0.09) 30%, rgba(255,255,255,0.04) 70%, ${a.to}88 100%)`,
        } as CSSProperties
      }
      className="group relative isolate rounded-[28px] p-px"
    >
      {/* bloom behind the card on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 -z-10 rounded-[36px] opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-50"
        style={{ background: `linear-gradient(140deg, ${a.from}, transparent 45%, ${a.to})` }}
      />

      <div className="relative overflow-hidden rounded-[27px] bg-[#070b16]">
        {/* cursor spotlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(560px circle at var(--mx, 50%) var(--my, 50%), ${a.from}1f, transparent 45%)` }}
        />
        {/* ── Stage with the poster ── */}
        <div
          onPointerMove={onPosterMove}
          onPointerLeave={onPosterLeave}
          className="relative z-[1] flex justify-center overflow-hidden px-4 pb-8 pt-12 [perspective:1100px] sm:px-8 sm:pb-12 sm:pt-14"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-[#060914]">
            <div className="ev-ambient absolute inset-0" style={{ background: `radial-gradient(55% 75% at 50% 55%, ${a.from}40, transparent 70%)` }} />
            <div className="absolute inset-0" style={{ background: `radial-gradient(40% 60% at 88% 10%, ${a.to}33, transparent 70%), radial-gradient(35% 55% at 8% 90%, ${a.to}22, transparent 70%)` }} />
            <div className="ev-floor absolute inset-x-[-50%] bottom-0 h-[70%]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070b16] to-transparent" />
          </div>
          <span
            aria-hidden="true"
            className="ev-outline pointer-events-none absolute -bottom-6 right-3 select-none font-display text-[7rem] leading-none sm:-bottom-10 sm:right-6 sm:text-[11rem]"
          >
            {pad2(index + 1)}
          </span>

          <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#04060d]/80 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] backdrop-blur-md sm:left-6 sm:top-5">
            <span className="relative flex h-1.5 w-1.5">
              {event.status !== 'completed' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: s.dot }} />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
            </span>
            <span style={{ color: s.text }}>{s.label}</span>
          </span>
          <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#04060d]/80 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/65 backdrop-blur-md sm:right-6 sm:top-5">
            <MapPin size={11} aria-hidden="true" />
            {event.location}
          </span>

          <motion.button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${event.title}`}
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d', boxShadow: `0 40px 80px -30px rgba(0,0,0,0.95), 0 0 70px -20px ${a.from}99` }}
            className="relative w-full max-w-[38rem] overflow-hidden rounded-2xl ring-1 ring-white/15"
          >
            <div className="relative aspect-[2/1] w-full overflow-hidden bg-black">
              <img src={event.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl" />
              <img
                src={event.image}
                alt={event.title}
                loading="lazy"
                className="relative h-full w-full object-contain transition-transform duration-[900ms] ease-out group-hover:scale-[1.045]"
              />
              <motion.span
                aria-hidden="true"
                style={{ backgroundPosition: glare }}
                className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-500 [background-image:linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.7)_50%,transparent_62%)] [background-size:250%_100%] group-hover:opacity-100"
              />
            </div>
          </motion.button>
        </div>

        {/* ── Details ── */}
        <div className="relative z-[1] grid gap-x-10 gap-y-7 px-5 pb-6 pt-2 sm:px-8 sm:pb-8 md:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: a.from }}>
              Event {pad2(index + 1)}
            </p>
            <h3 className="font-display mt-2.5 text-[2rem] leading-[1] text-white sm:text-[2.5rem]">{event.title}</h3>
            <p className="mt-3 max-w-md text-[15px] leading-7 text-muted">{event.subtitle}</p>

            <motion.ul
              variants={tagList}
              initial={reduce ? false : 'hidden'}
              whileInView="show"
              viewport={{ once: true }}
              className="mt-5 flex flex-wrap gap-1.5"
              aria-label="Categories"
            >
              {tags.map((t) => (
                <motion.li
                  key={t}
                  variants={tagItem}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium"
                  style={{ color: tagTone(t), borderColor: `${tagTone(t)}33`, background: `${tagTone(t)}0d` }}
                >
                  <span className="h-1 w-1 rounded-full" style={{ background: tagTone(t) }} />
                  {t}
                </motion.li>
              ))}
              {more > 0 && (
                <motion.li variants={tagItem} className="rounded-full border border-white/10 px-2.5 py-1 text-[12px] text-white/50">
                  +{more}
                </motion.li>
              )}
            </motion.ul>
          </div>

          <dl className="grid grid-cols-2 self-start overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="border-r border-white/10 px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-white/45">Players</dt>
              <dd className="font-display mt-1.5 text-2xl text-white">
                {players ? <CountUp to={players.to} decimals={players.decimals} suffix={players.suffix} /> : event.participants}
              </dd>
            </div>
            <div className="px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-white/45">Duration</dt>
              <dd className="font-display mt-1.5 text-2xl text-white">{durationShort(event.duration)}</dd>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-3 border-t border-white/10 bg-gradient-to-r from-[#ffcf6b]/[0.09] to-transparent px-4 py-3.5">
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-[0.14em] text-[#ffd98a]/70">Prize pool</dt>
                <dd className="ev-gold font-display mt-1.5 text-[1.7rem] leading-none sm:text-3xl">{prizeShort(event.prize)}</dd>
              </div>
              <SiteIcon name="trophy" size={46} alt="" className="shrink-0 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" />
            </div>
          </dl>

            <div className="flex flex-wrap items-center gap-2.5 border-t border-white/[0.08] pt-6 md:col-span-2">
              <button
                type="button"
                onClick={onOpen}
                className="ev-sheen relative inline-flex min-h-[48px] items-center gap-2 overflow-hidden rounded-full px-6 text-[15px] font-bold text-[#04060d] shadow-[0_10px_30px_-10px_var(--a1)] transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: `linear-gradient(120deg, ${a.from}, ${a.to})` }}
              >
                Open event
                <ArrowUpRight size={17} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              {event.social?.leaderboard && (
                <a href={event.social.leaderboard} target="_blank" rel="noopener noreferrer" className="ev-chip">
                  <ListOrdered size={15} aria-hidden="true" /> Leaderboard
                </a>
              )}
              {event.social?.certificates && (
                <a href={event.social.certificates} target="_blank" rel="noopener noreferrer" className="ev-chip">
                  <BadgeCheck size={15} aria-hidden="true" /> Certificates
                </a>
              )}
            </div>
        </div>
      </div>
    </motion.article>
  );
}

export default EventCard;
