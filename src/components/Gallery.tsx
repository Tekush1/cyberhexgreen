import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ArrowRight, CheckCircle, ExternalLink, MapPin, Tag, X, Instagram, Linkedin, Globe } from 'lucide-react';
import { Trophy, Users, Radio, Zap, Flag, BarChart3 } from './shared/icons';
import { Link } from 'react-router-dom';
import { events, type Event } from '../data/events';
import { Mascot } from './shared/Mascot';

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
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [selected, setSelected] = useState<Event | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = events.filter((e) => {
    if (activeFilter === 'All') return true;
    return e.category === activeFilter;
  });

  return (
    <div className="min-h-screen bg-ink pt-28 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="relative mb-12 grid items-end gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <h1 className="font-display text-5xl text-white sm:text-7xl">Events</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
              Every CTF CyberHx has run. Tap one for the leaderboard, certificates and photos.
            </p>
          </div>
          <Mascot
            pose="cheer"
            alt=""
            eager
            className="mascot-pop mx-auto w-44 sm:w-52 md:-mb-6 md:w-60"
          />
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-12"
        >
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              aria-pressed={activeFilter === f}
              className={`min-h-[44px] rounded-xl border-2 px-5 text-sm font-semibold transition-colors ${
                activeFilter === f
                  ? 'border-ink bg-lime text-ink shadow-[3px_3px_0_0_#02040a]'
                  : 'border-line text-white/70 hover:border-glow hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((event, i) => {
            const s = statusConfig[event.status];
            return (
              <motion.button
                key={event.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelected(event)}
                className={`sticker ${event.status === 'live' ? 'sticker-lime' : ''} group flex flex-col overflow-hidden text-left`}
              >
                <div className="relative h-52 w-full overflow-hidden border-b-2 border-line bg-black">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider border rounded-full px-2.5 py-1 backdrop-blur-sm ${s.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${event.status === 'live' ? 'animate-pulse' : ''}`} />
                      {s.label}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="text-[11px] font-medium bg-black/40 backdrop-blur-sm text-gray-300 border border-white/10 rounded-full px-2.5 py-1">
                      {event.category}
                    </span>
                  </div>

                </div>
                <div className="flex w-full flex-1 flex-col p-6">
                  <h2 className="font-display text-2xl text-white">{event.title}</h2>
                  <p className="mt-1.5 text-muted">{event.subtitle}</p>
                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                    <span className="flex items-center gap-1.5"><Calendar size={15} className="text-glow" />{event.date}</span>
                    <span className="flex items-center gap-1.5"><Clock size={15} className="text-glow" />{event.duration}</span>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                    <span className="font-display text-xl text-sun">{event.prize}</span>
                    <span className="text-sm font-semibold text-lime group-hover:underline underline-offset-4">Details</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Hosting nudge */}
        <div className="sticker sticker-glow relative mt-40 grid gap-6 p-7 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
          <Mascot pose="point" alt="" className="absolute -top-36 left-4 w-40 sm:-top-40 sm:left-8 sm:w-44" />
          <div className="pt-16">
            <h2 className="font-display text-3xl text-white sm:text-4xl">Want one of these for your college?</h2>
            <p className="mt-3 max-w-xl text-muted">
              We build the challenges and host the scoreboard. Plans start at $89 for an 8-hour event.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Link to="/host-your-ctf#plans" className="btn btn-lime">See hosting prices</Link>
            <Link to="/contact" className="btn btn-ghost">Get event updates</Link>
          </div>
        </div>
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
                {selected.social.certificates && (
  <a
    href={selected.social.certificates}
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