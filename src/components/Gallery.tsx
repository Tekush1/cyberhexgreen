import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Users, CheckCircle, ExternalLink, MapPin, Tag, X, Instagram, Linkedin, Globe } from 'lucide-react';
import { Trophy, Radio, Zap, Flag, BarChart3 } from './shared/icons';
import { Link } from 'react-router-dom';
import { events, type Event } from '../data/events';
import { Mascot } from './shared/Mascot';
import { Reveal } from './shared/Reveal';
import { CountUp } from './shared/CountUp';
import { stats } from '../data/stats';

const statusConfig = {
  live: {
    label: 'Live',
    color: 'text-red-400',
    border: 'border-red-500/50',
    dot: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-400 border-red-500/40',
    overlayFrom: 'from-red-950/80',
    glow: 'shadow-xl shadow-red-500/10 ring-1 ring-red-500/30',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-400',
    border: 'border-green-500/20',
    dot: 'bg-green-500',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    overlayFrom: 'from-[#050e0a]/80',
    glow: '',
  },
  upcoming: {
    label: 'Upcoming',
    color: 'text-yellow-400',
    border: 'border-yellow-500/20',
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    overlayFrom: 'from-yellow-950/80',
    glow: '',
  },
};

const filters = ['All', 'Events', 'Hacking', 'Learning', 'Teams'] as const;
type Filter = (typeof filters)[number];


export const Gallery = () => {
  const [activeFilter] = useState<Filter>('All');
  const [selected, setSelected] = useState<Event | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = events.filter((e) => {
    if (activeFilter === 'All') return true;
    return e.category === activeFilter;
  });

  const [featured, ...rest] = filtered;

  return (
    <div className="min-h-screen bg-ink pb-24">
      {/* Header */}
      <header className="relative overflow-hidden border-b-2 border-line pt-28">
        <div className="grid-drift pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="orb right-[-6rem] top-0 h-96 w-96 bg-glow/15" aria-hidden="true" />
        <div className="orb bottom-[-8rem] left-[-6rem] h-80 w-80 bg-sun/10 [animation-delay:-5s]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-end gap-6 px-4 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div className="pb-10">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="caret font-mono text-xs uppercase tracking-[0.25em] text-lime sm:text-sm"
            >
              cat /events/log
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.6 }}
              className="font-display mt-3 text-5xl text-white sm:text-7xl"
            >
              Every CTF
              <span className="block text-glow">we've run.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-5 max-w-xl text-lg leading-8 text-muted"
            >
              Leaderboards, certificates and photos from each event. Tap any one to open it.
            </motion.p>
            <dl className="mt-9 grid max-w-xl grid-cols-3 gap-x-6 gap-y-5">
              {stats.map((st) => (
                <div key={st.label} className="border-l-[3px] border-lime pl-3">
                  <dt className="font-display text-2xl text-white">
                    <CountUp to={st.to} prefix={st.prefix} suffix={st.suffix} decimals={st.decimals} />
                  </dt>
                  <dd className="text-xs text-muted">{st.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
          >
            <Mascot pose="cheer" alt="" eager className="float-y mx-auto w-44 sm:w-52 md:w-64" />
          </motion.div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-14 sm:px-6 lg:px-8">
        {/* Featured: latest event */}
        {featured && (
          <Reveal>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">Latest event</p>
            <article className="sticker sticker-sun lift group grid overflow-hidden md:grid-cols-[1.05fr_1fr]">
              <button
                type="button"
                onClick={() => setSelected(featured)}
                className="relative min-h-[16rem] overflow-hidden border-b-2 border-line bg-black md:border-b-0 md:border-r-2"
                aria-label={`Open ${featured.title}`}
              >
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="absolute inset-0 h-full w-full object-contain transition-transform duration-700 group-hover:scale-105"
                />
                <span className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm ${statusConfig[featured.status].badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[featured.status].dot}`} />
                  {statusConfig[featured.status].label}
                </span>
              </button>
              <div className="flex flex-col p-6 sm:p-8">
                <h2 className="font-display text-3xl text-white sm:text-4xl">{featured.title}</h2>
                <p className="mt-1.5 text-muted">{featured.subtitle}</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    [<Calendar size={15} key="c" />, featured.date],
                    [<Clock size={15} key="t" />, featured.duration],
                    [<Users size={15} key="u" />, featured.participants],
                    [<MapPin size={15} key="m" />, featured.location],
                  ].map(([icon, text], i) => (
                    <span key={i} className="flex items-center gap-2 rounded-lg border-2 border-line px-3 py-2 text-sm text-white/85">
                      <span className="text-glow">{icon}</span>
                      {text}
                    </span>
                  ))}
                </div>
                {featured.highlights && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {featured.highlights.slice(0, 4).map((h) => (
                      <span key={h} className="rounded-full bg-lime/10 px-3 py-1 text-xs font-semibold text-lime">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto pt-7">
                  <p className="font-display text-3xl text-sun">{featured.prize}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setSelected(featured)} className="btn btn-lime">
                      See details
                    </button>
                    {featured.social?.leaderboard && (
                      <a href={featured.social.leaderboard} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                        Leaderboard
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </Reveal>
        )}

        {/* The rest + what's next */}
        <Reveal>
          <p className="mb-4 mt-16 font-mono text-xs uppercase tracking-[0.2em] text-muted">Earlier and upcoming</p>
        </Reveal>
        <div className="grid grid-cols-1 items-stretch gap-8 sm:grid-cols-2">
          {rest.map((event, i) => {
            const s = statusConfig[event.status];
            return (
              <Reveal key={event.id} delay={i * 0.1} className="h-full">
                <button
                  onClick={() => setSelected(event)}
                  className={`sticker lift shine group flex h-full w-full flex-col overflow-hidden text-left ${event.status === 'live' ? 'sticker-lime' : ''}`}
                >
                  <div className="relative h-48 w-full overflow-hidden border-b-2 border-line bg-black">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                    />
                    <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm ${s.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${event.status === 'live' ? 'animate-pulse' : ''}`} />
                      {s.label}
                    </span>
                  </div>
                  <div className="flex w-full flex-1 flex-col p-6">
                    <h2 className="font-display text-2xl text-white">{event.title}</h2>
                    <p className="mt-1.5 text-sm text-muted">{event.subtitle}</p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                      <span className="flex items-center gap-1.5"><Calendar size={15} className="text-glow" />{event.date}</span>
                      <span className="flex items-center gap-1.5"><Users size={15} className="text-glow" />{event.participants}</span>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                      <span className="font-display text-xl text-sun">{event.prize}</span>
                      <span className="text-sm font-semibold text-lime transition-transform group-hover:translate-x-1">Open →</span>
                    </div>
                  </div>
                </button>
              </Reveal>
            );
          })}

          <Reveal delay={rest.length * 0.1} className="h-full">
            <div className="relative flex h-full flex-col rounded-[1.25rem] border-2 border-dashed border-line p-6 pt-28">
              <Mascot pose="confused" alt="" className="float-y absolute -top-6 left-1/2 w-32 -translate-x-1/2" />
              <h2 className="font-display text-2xl text-white">What's next?</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                We're picking the date for our next open CTF. Follow along to hear the moment registrations open.
              </p>
              <div className="mt-auto flex flex-col gap-3 pt-6">
                <a href="https://instagram.com/nulloriginctf" target="_blank" rel="noopener noreferrer" className="btn btn-lime">
                  <Instagram size={16} /> Follow on Instagram
                </a>
                <a href="https://ctf.cyberhx.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                  Practice challenges
                </a>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Hosting nudge */}
        <Reveal>
          <div className="sticker sticker-glow relative mt-40 grid gap-6 p-7 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
            <Mascot pose="point" alt="" className="float-y absolute -top-36 left-4 w-40 sm:-top-40 sm:left-8 sm:w-44" />
            <div className="pt-16">
              <h2 className="font-display text-3xl text-white sm:text-4xl">Want one of these for your college?</h2>
              <p className="mt-3 max-w-xl text-muted">
                Build your own CTF challenge by challenge. Hosting and the live scoreboard start at $49.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Link to="/host-your-ctf#build" className="btn btn-lime">Build your CTF</Link>
              <Link to="/host-your-ctf#prebuilt" className="btn btn-ghost">See prebuilt CTFs</Link>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-panel ${statusConfig[selected.status].border} ${
                selected.status === 'live' ? statusConfig[selected.status].glow : ''
              }`}
            >
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="fixed sm:absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-50 text-gray-200 hover:text-white bg-black/60 hover:bg-black/80 rounded-full p-2.5 transition-all touch-manipulation"
              >
                <X size={20} />
              </button>

              {/* Cover */}
              <div className="relative h-56 sm:h-64 overflow-hidden bg-black">
                <img src={selected.image} alt={selected.title} className="w-full h-full object-contain" />
                <div className={`absolute inset-0 bg-gradient-to-t ${statusConfig[selected.status].overlayFrom} via-[#0a0f1a]/40 to-transparent`} />

                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider border rounded-full px-3 py-1 backdrop-blur-sm ${statusConfig[selected.status].badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[selected.status].dot} ${selected.status === 'live' ? 'animate-pulse' : ''}`} />
                    {statusConfig[selected.status].label}
                  </span>
                </div>

                <div className="absolute top-4 right-14 flex items-center gap-1.5 text-xs text-gray-300 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                  <MapPin size={11} />
                  {selected.location}
                </div>

                <div className="absolute bottom-4 left-5 right-5">
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">{selected.title}</h2>
                  <p className={`text-sm font-medium mt-0.5 ${statusConfig[selected.status].color}`}>{selected.subtitle}</p>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 flex flex-col gap-5">
                <p className="text-sm text-gray-400 leading-relaxed">{selected.description}</p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Calendar size={14} />, label: 'Date', value: selected.date },
                    { icon: <Clock size={14} />, label: 'Duration', value: selected.duration },
                    { icon: <Users size={14} />, label: 'Participants', value: selected.participants },
                  ].map((stat, idx) => (
                    <div key={idx} className="flex flex-col gap-1 bg-white/[0.03] rounded-xl p-3 border border-white/5">
                      <span className="text-primary">{stat.icon}</span>
                      <span className="text-[11px] text-gray-500 uppercase tracking-wide">{stat.label}</span>
                      <span className="text-sm font-semibold text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
                  <Trophy size={16} className="text-primary flex-shrink-0" />
                  <div>
                    <span className="text-base font-bold text-primary">{selected.prize}</span>
                    <p className="text-[11px] text-gray-500">Prize Pool</p>
                  </div>
                </div>

                {selected.highlights && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {selected.highlights.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <CheckCircle size={12} className={selected.status === 'completed' ? 'text-green-400' : 'text-primary'} />
                        {h}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-[11px] border border-gray-700 text-gray-500 px-2.5 py-0.5 rounded-full">
                      <Tag size={9} /> {tag}
                    </span>
                  ))}
                </div>

                {/* Social / CTFtime / Leaderboard */}
                {selected.social && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Links</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.social.website && (
                        <a href={selected.social.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 px-3 py-1.5 rounded-full transition-colors">
                          <Globe size={13} /> Website
                        </a>
                      )}
                      {selected.social.instagram && (
                        <a href={selected.social.instagram} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 px-3 py-1.5 rounded-full transition-colors">
                          <Instagram size={13} /> Instagram
                        </a>
                      )}
                      {selected.social.x && (
                        <a href={selected.social.x} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 px-3 py-1.5 rounded-full transition-colors">
                          <X size={13} /> X
                        </a>
                      )}
                      {selected.social.linkedin && (
                        <a href={selected.social.linkedin} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 px-3 py-1.5 rounded-full transition-colors">
                          <Linkedin size={13} /> LinkedIn
                        </a>
                      )}
                      {selected.social.ctftime && (
                        <a href={selected.social.ctftime} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 px-3 py-1.5 rounded-full transition-colors">
                          <Flag size={13} /> CTFtime
                        </a>
                      )}
                      {selected.social.leaderboard && (
                        <a href={selected.social.leaderboard} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary px-3 py-1.5 rounded-full transition-colors">
                          <BarChart3 size={13} /> Leaderboard
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {selected.social?.certificates && (
  <a
    href={selected.social?.certificates}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1.5 text-xs bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-full transition-colors"
  >
    <CheckCircle size={13} />
    Certificates
  </a>
)}

                {/* Gallery */}
                {selected.gallery && selected.gallery.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Photos</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {selected.gallery.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setLightbox(img)}
                          className="relative aspect-square rounded-lg overflow-hidden group border border-white/5 hover:border-primary/30 transition-all"
                        >
                          <img
                            src={img}
                            alt={`${selected.title} photo ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action */}
                {selected.status === 'live' && selected.link ? (
                  <a
                    href={selected.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all duration-200"
                  >
                    <Zap size={15} /> Register Now <ExternalLink size={13} />
                  </a>
               ) : selected.status === 'completed' ? (
  <div className="grid grid-cols-2 gap-3">
    <a
      href={selected.social?.leaderboard}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 py-3 bg-primary/10 border border-primary/20 text-primary rounded-xl hover:bg-primary/20 transition-colors"
    >
      <BarChart3 size={14} />
      Leaderboard
    </a>

    <a
      href={selected.social?.certificates}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 py-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl hover:bg-green-500/20 transition-colors"
    >
      <CheckCircle size={14} />
      Certificates
    </a>
  </div>
) : (
                  <div className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-500/10 text-yellow-400 font-medium rounded-xl text-sm border border-yellow-500/20">
                    <Radio size={14} /> Coming Soon
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightbox}
              alt="Event photo"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="fixed top-[max(1.25rem,env(safe-area-inset-top))] right-[max(1.25rem,env(safe-area-inset-right))] z-[70] text-gray-200 hover:text-white bg-black/60 hover:bg-black/80 rounded-full p-2.5 transition-all touch-manipulation"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;