import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { ArrowUpRight, Trophy, Award, Maximize2 } from 'lucide-react';
import type { Event } from '../../data/events';
import { dateParts, durationShort, pad2, prizeShort } from './eventStyle';

/* Events archive, dark band:
   1. a terminal-style scoreboard listing every event (click a row to jump to it),
   2. a glowing timeline with the full card for each event. */

const ease = [0.16, 1, 0.3, 1] as const;

/** Pull a count like "3500+ Teams" or "48 Challenges" out of the highlights. */
const fromHighlights = (e: Event, word: RegExp) => {
  const h = e.highlights?.find((x) => word.test(x));
  return h ? withCommas(h.replace(word, '').trim()) : null;
};
/** "6000+" -> "6,000+" */
const withCommas = (s: string) => s.replace(/\d{4,}/g, (n) => Number(n).toLocaleString('en-US'));
const playersShort = (e: Event) => withCommas(e.participants.replace(/\s*(hackers?|participants?|players?)\s*$/i, '').trim());
const isOnlineWorld = (e: Event) => /global|worldwide/i.test(e.location);

export const EventArchive = ({ events, onOpen }: { events: Event[]; onOpen: (i: number) => void }) => {
  const reduce = !!useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 75%', 'end 60%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });

  const jump = (id: number) => {
    document.getElementById(`event-${id}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };

  return (
    <section aria-labelledby="archive-title" className="relative isolate overflow-hidden bg-[#05080f] text-white">
      {/* backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-glow/10 blur-[140px]" />
        <div className="absolute -right-40 top-[40%] h-[30rem] w-[30rem] rounded-full bg-lime/[0.07] blur-[140px]" />
        <div className="arc-grid absolute inset-0" />
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease }}
          className="flex items-end justify-between gap-6"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">The archive</p>
            <h2 id="archive-title" className="font-display mt-3 text-4xl leading-[1] sm:text-5xl">
              Newest first.
            </h2>
          </div>
          <p className="pb-1 font-mono text-sm text-white/45">
            <span className="text-white">{pad2(events.length)}</span> events
          </p>
        </motion.div>

        {/* ── 1. Scoreboard ───────────────────────────────── */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease }}
          className="arc-term mt-10 overflow-hidden rounded-[20px] sm:mt-12"
        >
          <div className="flex items-center gap-2 border-b border-glow/[0.12] px-4 py-3 font-mono text-xs text-white/45">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-2 truncate">cyberhx@archive: ~/events</span>
          </div>

          <div role="table" aria-label="All events" className="font-mono">
            <div
              role="row"
              className="arc-row hidden border-b border-glow/10 px-5 py-3 text-[11px] uppercase tracking-[0.14em] text-[#5f7aa0] md:grid"
            >
              <span role="columnheader">#</span>
              <span role="columnheader">Event</span>
              <span role="columnheader">Date</span>
              <span role="columnheader">Players</span>
              <span role="columnheader">Teams</span>
              <span role="columnheader">Length</span>
              <span role="columnheader">Prizes</span>
              <span role="columnheader" className="sr-only">
                Open
              </span>
            </div>
            {events.map((e, i) => {
              const dp = dateParts(e.date);
              const teams = fromHighlights(e, /\s*teams?\s*$/i);
              const top = i === 0;
              return (
                <div
                  key={e.id}
                  role="row"
                  tabIndex={0}
                  onClick={() => jump(e.id)}
                  onKeyDown={(k) => (k.key === 'Enter' || k.key === ' ') && (k.preventDefault(), jump(e.id))}
                  className={`arc-row group grid cursor-pointer items-center gap-x-4 gap-y-1 border-b border-glow/[0.07] px-5 py-5 outline-none transition last:border-0 hover:bg-white/[0.025] focus-visible:bg-white/[0.04] ${
                    top ? 'arc-top' : ''
                  }`}
                >
                  <span role="cell" className="text-xl font-bold text-lime">
                    {pad2(events.length - i)}
                  </span>
                  <span role="cell" className="min-w-0">
                    <span className="block truncate font-display text-base text-white sm:text-xl">{e.title}</span>
                    <span className="mt-1 block truncate text-xs text-white/45">
                      {isOnlineWorld(e) ? 'International · ' : ''}
                      {e.tags.find((t) => /jeopardy/i.test(t)) ? 'Jeopardy · ' : ''}
                      {e.location}
                    </span>
                  </span>
                  <span role="cell" className="hidden text-sm text-white/80 md:block">
                    {dp.month} {dp.year}
                  </span>
                  <span role="cell" className="text-sm text-lime">
                    {playersShort(e)}
                  </span>
                  <span role="cell" className="hidden text-sm text-white/80 md:block">
                    {teams ?? '—'}
                  </span>
                  <span role="cell" className="hidden text-sm text-glow md:block">
                    {durationShort(e.duration)}
                  </span>
                  <span role="cell" className="hidden text-sm text-white/80 md:block">
                    {prizeShort(e.prize)}
                  </span>
                  <span role="cell" className="justify-self-end">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-lime px-3 py-1.5 text-xs font-bold text-ink transition group-hover:shadow-[0_0_20px_-4px_rgba(198,241,53,0.8)]">
                      <span className="hidden sm:inline">VIEW</span> <ArrowUpRight size={13} className="rotate-90" />
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="border-t border-glow/[0.07] px-5 py-4 font-mono text-[13px] text-white/45">
            <span className="text-lime">$</span> next_event --status <span className="text-white">announcing soon</span>
            <span className="arc-cursor" aria-hidden="true" />
          </p>
        </motion.div>

        {/* ── 2. Glowing timeline ─────────────────────────── */}
        <div ref={listRef} className="relative mt-20 sm:mt-24">
          <div aria-hidden="true" className="absolute bottom-2 left-[9px] top-2 w-[2px] bg-white/[0.06] md:left-[9.5rem]" />
          <motion.div
            aria-hidden="true"
            style={{ scaleY: reduce ? 1 : progress }}
            className="arc-rail absolute bottom-2 left-[9px] top-2 w-[2px] origin-top md:left-[9.5rem]"
          />
          <ol className="relative space-y-12 sm:space-y-16">

          {events.map((e, i) => {
            const dp = dateParts(e.date);
            const teams = fromHighlights(e, /\s*teams?\s*$/i);
            const challenges = fromHighlights(e, /\s*challenges?\s*$/i);
            const chips = [
              teams && `${teams} teams`,
              challenges && `${challenges} challenges`,
              durationShort(e.duration),
              prizeShort(e.prize) && `${prizeShort(e.prize)} prizes`,
              e.highlights?.find((h) => /ctftime/i.test(h)),
            ].filter(Boolean) as string[];
            const cyan = i % 2 === 1;
            return (
              <li key={e.id} id={`event-${e.id}`} className="relative scroll-mt-28 pl-10 md:grid md:grid-cols-[9.5rem_1fr] md:pl-0">
                <motion.span
                  aria-hidden="true"
                  initial={reduce ? false : { scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, margin: '-120px' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                  className={`arc-node absolute left-0 top-6 md:left-[calc(9.5rem-9px)] ${cyan ? 'is-cyan' : ''}`}
                />

                <motion.div
                  initial={reduce ? false : { opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.8, ease }}
                  className="mb-4 flex items-baseline gap-2 md:sticky md:top-28 md:mb-0 md:block md:self-start md:pr-10 md:pt-3 md:text-right"
                >
                  <p className="font-display text-2xl uppercase leading-none md:text-[2.2rem]">{dp.month}</p>
                  <p className="font-mono text-xs text-white/45 md:mt-2">
                    {dp.days && <span className="md:block">{dp.days} · </span>}
                    {dp.year}
                  </p>
                </motion.div>

                <motion.article
                  initial={reduce ? false : { opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.8, ease }}
                  className="arc-card group md:ml-10"
                >
                  <button
                    type="button"
                    onClick={() => onOpen(i)}
                    className="relative block aspect-[969/431] w-full self-center overflow-hidden rounded-[14px] bg-black ring-1 ring-white/10"
                    aria-label={`Open ${e.title} details`}
                  >
                    <img
                      src={e.image}
                      alt={`${e.title} artwork`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                    <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/55 text-white/80 opacity-0 backdrop-blur transition group-hover:opacity-100">
                      <Maximize2 size={14} />
                    </span>
                  </button>

                  <div className="min-w-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] ${
                        e.status === 'live'
                          ? 'bg-red-500/10 text-red-300 ring-1 ring-red-400/30'
                          : e.status === 'upcoming'
                            ? 'bg-amber-400/10 text-amber-200 ring-1 ring-amber-300/30'
                            : 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/30'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {e.status === 'live' ? 'Live now' : e.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                    </span>
                    <h3 className="font-display mt-3 text-2xl leading-tight sm:text-[1.9rem]">{e.title}</h3>
                    <p className="mt-1.5 text-sm text-white/55">
                      {e.subtitle} · {e.location}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {chips.map((c) => (
                        <span key={c} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-white/80">
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {e.link && (
                        <a href={e.link} target="_blank" rel="noopener noreferrer" className="btn btn-lime !min-h-[42px] !px-4 !text-sm">
                          Open event <ArrowUpRight size={15} />
                        </a>
                      )}
                      {e.social?.leaderboard && (
                        <a href={e.social.leaderboard} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !min-h-[42px] !px-4 !text-sm">
                          <Trophy size={15} /> Leaderboard
                        </a>
                      )}
                      {e.social?.certificates && (
                        <a href={e.social.certificates} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !min-h-[42px] !px-4 !text-sm">
                          <Award size={15} /> Certificates
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="arc-big">
                    <b className={cyan ? 'text-glow' : 'text-lime'}>{playersShort(e)}</b>
                    <small>Players</small>
                  </div>
                </motion.article>
              </li>
            );
          })}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default EventArchive;
