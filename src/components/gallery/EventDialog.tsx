import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Globe,
  Instagram,
  Linkedin,
  ListOrdered,
  MapPin,
  Radio,
  Twitter,
  Users,
  X,
} from 'lucide-react';
import type { Event } from '../../data/events';
import { SiteIcon } from '../shared/SiteIcon';
import { STATUS, prizeShort } from './eventStyle';

const ease = [0.16, 1, 0.3, 1] as const;
const list = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } } };

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Full details for one event, light theme. Bottom sheet on phones (drag the
    handle down to close), a centred panel on larger screens. */
export function EventDialog({ event, onClose }: { event: Event; index: number; onClose: () => void }) {
  const reduce = !!useReducedMotion();
  const s = STATUS[event.status];
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drag = useDragControls();
  const photos = event.gallery ?? [];
  const [shot, setShot] = useState<number | null>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shot !== null) {
        if (e.key === 'Escape') setShot(null);
        if (e.key === 'ArrowRight') setShot((v) => ((v ?? 0) + 1) % photos.length);
        if (e.key === 'ArrowLeft') setShot((v) => ((v ?? 0) - 1 + photos.length) % photos.length);
        return;
      }
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const els = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shot, photos.length, onClose]);

  const links: { href?: string; label: string; icon: ReactNode }[] = [
    { href: event.social?.website ?? event.link, label: 'Website', icon: <Globe size={15} /> },
    { href: event.social?.ctftime, label: 'CTFtime', icon: <Flag size={15} /> },
    { href: event.social?.instagram, label: 'Instagram', icon: <Instagram size={15} /> },
    { href: event.social?.x, label: 'X', icon: <Twitter size={15} /> },
    { href: event.social?.linkedin, label: 'LinkedIn', icon: <Linkedin size={15} /> },
    ...(event.status === 'completed'
      ? []
      : [
          { href: event.social?.leaderboard, label: 'Leaderboard', icon: <ListOrdered size={15} /> },
          { href: event.social?.certificates, label: 'Certificates', icon: <BadgeCheck size={15} /> },
        ]),
  ].filter((l) => l.href);

  const facts = [
    { icon: <Calendar size={15} />, label: 'Date', value: event.date },
    { icon: <Clock size={15} />, label: 'Duration', value: event.duration },
    { icon: <Users size={15} />, label: 'Players', value: event.participants },
    { icon: <MapPin size={15} />, label: 'Where', value: event.location },
  ];

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="absolute inset-0 bg-ink/50 backdrop-blur-md"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-dialog-title"
        drag={reduce ? false : 'y'}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 700) onClose();
        }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 90, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 70, scale: 0.98 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="relative flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-30px_90px_rgba(16,24,40,0.3)] sm:max-h-[88vh] sm:rounded-[28px]"
      >
        {/* drag handle (phones) */}
        <div
          onPointerDown={(e) => drag.start(e)}
          className="absolute inset-x-0 top-0 z-20 flex cursor-grab touch-none justify-center pb-3 pt-2.5 active:cursor-grabbing sm:hidden"
        >
          <span className="h-1.5 w-11 rounded-full bg-black/20" />
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-ink/70 ring-1 ring-black/[0.08] backdrop-blur-md transition hover:rotate-90 hover:text-ink sm:right-4 sm:top-4"
        >
          <X size={18} />
        </button>

        <div className="overflow-y-auto overscroll-contain">
          {/* cover: poster on a light stage */}
          <div className="relative overflow-hidden bg-[#f1f3ee] px-5 pb-6 pt-12 sm:px-10 sm:pb-8 sm:pt-14">
            <div aria-hidden="true" className="ev-floor-light absolute inset-x-[-30%] bottom-0 h-[70%]" />
            <motion.div
              initial={reduce ? false : { scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease }}
              className="relative mx-auto aspect-[2/1] w-full max-w-[34rem] overflow-hidden rounded-2xl bg-[#0b0f1a] shadow-[0_26px_60px_-24px_rgba(16,24,40,0.55)] ring-1 ring-black/[0.08]"
            >
              <img src={event.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl" />
              <img src={event.image} alt={event.title} className="relative h-full w-full object-contain" />
            </motion.div>
          </div>

          <div className="px-5 pt-5 sm:px-8">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] ${s.chip}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
              {s.label}
            </span>
            <h2 id="event-dialog-title" className="font-display mt-3 text-3xl leading-none text-ink sm:text-[2.6rem]">
              {event.title}
            </h2>
            <p className="mt-2.5 text-ink/55 sm:text-[15px]">{event.subtitle}</p>
          </div>

          <motion.div variants={list} initial={reduce ? false : 'hidden'} animate="show" className="space-y-7 px-5 pb-8 pt-6 sm:px-8">
            <motion.p variants={item} className="leading-7 text-ink/65">
              {event.description}
            </motion.p>

            <motion.dl variants={item} className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="rounded-2xl border border-black/[0.07] bg-[#fafbf8] p-3.5">
                  <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-ink/40">
                    <span className="text-[#7a9a00]">{f.icon}</span>
                    {f.label}
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold leading-5 text-ink">{f.value}</dd>
                </div>
              ))}
            </motion.dl>

            <motion.div variants={item} className="flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-lime/40 bg-lime/10 px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#6f8a00]">Prize pool</p>
                <p className="font-display mt-1 text-3xl leading-none text-ink sm:text-4xl">{prizeShort(event.prize)}</p>
              </div>
              <SiteIcon name="trophy" size={64} alt="" />
            </motion.div>

            {event.highlights && event.highlights.length > 0 && (
              <motion.div variants={item}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">Highlights</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {event.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-[#fafbf8] px-3 py-2.5 text-sm text-ink/80">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/25 text-[#5f7700]">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            <motion.div variants={item}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">Categories</h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {event.tags.map((t) => (
                  <li key={t} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-medium text-ink/65">
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>

            {photos.length > 0 && (
              <motion.div variants={item}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">Photos</h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {photos.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setShot(i)}
                      aria-label={`Open photo ${i + 1} of ${photos.length}`}
                      className="group/ph relative aspect-square overflow-hidden rounded-xl ring-1 ring-black/[0.07]"
                    >
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover/ph:scale-110" />
                      <span className="absolute inset-0 bg-ink/0 transition-colors group-hover/ph:bg-ink/10" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {links.length > 0 && (
              <motion.div variants={item}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">Links</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {links.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="ev-chip-light">
                      {l.icon}
                      {l.label}
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* actions */}
        <div className="border-t border-black/[0.07] bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
          {event.status === 'live' && event.link ? (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-red-500 font-bold text-white transition hover:bg-red-600"
            >
              Register now <ArrowUpRight size={17} />
            </a>
          ) : event.status === 'completed' ? (
            <div className="grid grid-cols-2 gap-2.5">
              {event.social?.leaderboard ? (
                <a
                  href={event.social.leaderboard}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-ink font-bold text-white transition hover:-translate-y-0.5"
                >
                  <ListOrdered size={17} /> Leaderboard
                </a>
              ) : (
                <span />
              )}
              {event.social?.certificates && (
                <a
                  href={event.social.certificates}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-black/15 font-bold text-ink transition hover:border-black/30 hover:bg-black/[0.03]"
                >
                  <BadgeCheck size={17} /> Certificates
                </a>
              )}
            </div>
          ) : (
            <p className="flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-amber-500/30 bg-amber-50 font-semibold text-amber-700">
              <Radio size={16} /> Coming soon
            </p>
          )}
        </div>
      </motion.div>

      {/* photo viewer */}
      <AnimatePresence>
        {shot !== null && photos[shot] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShot(null)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`Photo ${shot + 1} of ${photos.length}`}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={photos[shot]}
                src={photos[shot]}
                alt={`${event.title} photo ${shot + 1}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </AnimatePresence>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShot((shot - 1 + photos.length) % photos.length);
                  }}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink ring-1 ring-black/10 sm:left-6"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShot((shot + 1) % photos.length);
                  }}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink ring-1 ring-black/10 sm:right-6"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            <button
              type="button"
              aria-label="Close photo"
              onClick={() => setShot(null)}
              className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink ring-1 ring-black/10"
            >
              <X size={20} />
            </button>
            <p className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 font-mono text-xs text-white/80">
              {shot + 1} / {photos.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default EventDialog;
