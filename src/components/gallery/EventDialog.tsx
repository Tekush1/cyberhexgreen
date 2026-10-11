import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
import { STATUS, accentFor, prizeShort, tagTone } from './eventStyle';

const ease = [0.16, 1, 0.3, 1] as const;
const list = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Full details for one event. A bottom sheet on phones (drag the handle
    down to close), a centred panel on larger screens. */
export function EventDialog({ event, index, onClose }: { event: Event; index: number; onClose: () => void }) {
  const reduce = !!useReducedMotion();
  const a = accentFor(index);
  const s = STATUS[event.status];
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drag = useDragControls();
  const photos = event.gallery ?? [];
  const [shot, setShot] = useState<number | null>(null);

  // lock page scroll, move focus in, restore it on close
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

  // keyboard: Esc closes, Tab stays inside, arrows page through photos
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
    // completed events show these two as the main buttons at the bottom instead
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
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 1 }}
    >
      <motion.div
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="absolute inset-0 bg-[#02040a]/80 backdrop-blur-md"
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
        style={{ '--a1': a.from, '--a2': a.to } as CSSProperties}
        className="relative flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#070b16] shadow-[0_-30px_90px_rgba(0,0,0,0.7)] sm:max-h-[88vh] sm:rounded-[28px]"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 z-30 h-px" style={{ background: `linear-gradient(90deg, transparent, ${a.from}, ${a.to}, transparent)` }} />

        {/* drag handle (phones) */}
        <div
          onPointerDown={(e) => drag.start(e)}
          className="absolute inset-x-0 top-0 z-20 flex cursor-grab touch-none justify-center pb-3 pt-2.5 active:cursor-grabbing sm:hidden"
        >
          <span className="h-1.5 w-11 rounded-full bg-white/35" />
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#04060d]/70 text-white/80 backdrop-blur-md transition hover:rotate-90 hover:text-white sm:right-4 sm:top-4"
        >
          <X size={18} />
        </button>

        <div className="overflow-y-auto overscroll-contain">
          {/* cover: the poster on a lit stage */}
          <div className="relative overflow-hidden px-5 pb-6 pt-12 sm:px-10 sm:pb-8 sm:pt-14">
            <div aria-hidden="true" className="absolute inset-0 bg-[#060914]">
              <div className="absolute inset-0" style={{ background: `radial-gradient(60% 80% at 50% 60%, ${a.from}40, transparent 70%), radial-gradient(40% 60% at 90% 0%, ${a.to}30, transparent 70%)` }} />
              <div className="ev-floor absolute inset-x-[-50%] bottom-0 h-[70%]" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#070b16] to-transparent" />
            </div>
            <motion.div
              initial={reduce ? false : { scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease }}
              className="relative mx-auto aspect-[2/1] w-full max-w-[34rem] overflow-hidden rounded-2xl bg-black ring-1 ring-white/15"
              style={{ boxShadow: `0 30px 70px -25px rgba(0,0,0,0.95), 0 0 70px -20px ${a.from}99` }}
            >
              <img src={event.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl" />
              <img src={event.image} alt={event.title} className="relative h-full w-full object-contain" />
            </motion.div>
          </div>

          <div className="px-5 pt-2 sm:px-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
              <span style={{ color: s.text }}>{s.label}</span>
            </span>
            <h2 id="event-dialog-title" className="font-display mt-3 text-3xl leading-none text-white sm:text-[2.6rem]">
              {event.title}
            </h2>
            <p className="mt-2.5 text-sm text-white/65 sm:text-[15px]">{event.subtitle}</p>
          </div>

          <motion.div variants={list} initial={reduce ? false : 'hidden'} animate="show" className="space-y-7 px-5 pb-8 pt-6 sm:px-8">
            <motion.p variants={item} className="text-[15px] leading-7 text-white/70">
              {event.description}
            </motion.p>

            <motion.dl variants={item} className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                  <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
                    <span style={{ color: a.from }}>{f.icon}</span>
                    {f.label}
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold leading-5 text-white">{f.value}</dd>
                </div>
              ))}
            </motion.dl>

            <motion.div
              variants={item}
              className="relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#ffcf6b]/25 bg-gradient-to-r from-[#ffcf6b]/[0.12] via-[#ffcf6b]/[0.04] to-transparent px-5 py-4"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#ffd98a]/70">Prize pool</p>
                <p className="ev-gold font-display mt-1 text-3xl leading-none sm:text-4xl">{prizeShort(event.prize)}</p>
              </div>
              <SiteIcon name="trophy" size={64} alt="" />
            </motion.div>

            {event.highlights && event.highlights.length > 0 && (
              <motion.div variants={item}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">Highlights</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {event.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-sm text-white/85">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${a.from}22`, color: a.from }}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            <motion.div variants={item}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">Categories</h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {event.tags.map((t) => (
                  <li
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium"
                    style={{ color: tagTone(t), borderColor: `${tagTone(t)}33`, background: `${tagTone(t)}0d` }}
                  >
                    <span className="h-1 w-1 rounded-full" style={{ background: tagTone(t) }} />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>

            {photos.length > 0 && (
              <motion.div variants={item}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">Photos</h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {photos.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setShot(i)}
                      aria-label={`Open photo ${i + 1} of ${photos.length}`}
                      className="group/ph relative aspect-square overflow-hidden rounded-xl border border-white/10"
                    >
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover/ph:scale-110" />
                      <span className="absolute inset-0 bg-black/0 transition-colors group-hover/ph:bg-black/25" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {links.length > 0 && (
              <motion.div variants={item}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">Links</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {links.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="ev-chip">
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
        <div className="border-t border-white/10 bg-[#070b16]/95 px-5 py-4 backdrop-blur sm:px-8">
          {event.status === 'live' && event.link ? (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ev-sheen relative flex min-h-[50px] items-center justify-center gap-2 overflow-hidden rounded-full bg-[#ff4d4d] font-bold text-white"
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
                  className="ev-sheen relative flex min-h-[50px] items-center justify-center gap-2 overflow-hidden rounded-full font-bold text-[#04060d]"
                  style={{ background: `linear-gradient(120deg, ${a.from}, ${a.to})` }}
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
                  className="flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-white/15 font-bold text-white transition hover:border-white/35 hover:bg-white/[0.04]"
                >
                  <BadgeCheck size={17} /> Certificates
                </a>
              )}
            </div>
          ) : (
            <p className="flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-[#ffc93c]/25 bg-[#ffc93c]/10 font-semibold text-[#ffd978]">
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
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
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
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white sm:left-6"
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
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white sm:right-6"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            <button
              type="button"
              aria-label="Close photo"
              onClick={() => setShot(null)}
              className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white"
            >
              <X size={20} />
            </button>
            <p className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 font-mono text-xs text-white/60">
              {shot + 1} / {photos.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default EventDialog;
