import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Trophy, Users, ArrowRight, CheckCircle, Radio,
  ExternalLink, Zap, MapPin, Tag, X, Instagram, Linkedin, Globe, Flag, BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Event {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  date: string;
  duration: string;
  participants: string;
  prize: string;
  tags: string[];
  status: 'live' | 'completed' | 'upcoming';
  category: 'Events' | 'Hacking' | 'Learning' | 'Teams';
  link?: string;
  highlights?: string[];
  location: string;
  image: string;
  gallery?: string[];
  social?: {
    instagram?: string;
    x?: string;
    linkedin?: string;
    website?: string;
    ctftime?: string;
    leaderboard?: string;
  };
}

const events: Event[] = [
  {
    id: 1,
    title: 'ZeroDay Heist',
    subtitle: "India's Premier Cybersecurity CTF",
    description:
      'A high-stakes 6-hour Capture The Flag challenge featuring Web Exploitation, Reverse Engineering, Cryptography, OSINT, Forensics and Pwn. Open to all skill levels.',
    date: 'June 2026',
    duration: '6 Hours',
    participants: '500+',
    prize: '₹50,000+',
    tags: ['CTF', 'Web Exploitation', 'Reverse Engineering', 'Cryptography', 'OSINT'],
    status: 'live',
    category: 'Hacking',
    link: 'https://zerodayheist.cyberhx.com',
    highlights: ['Registration Open Now', 'Qualifier Round', 'Grand Finale'],
    location: 'Online',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=400&q=70',
    ],
    social: {
      instagram: 'https://instagram.com/cyberhx',
      x: 'https://x.com/cyberhx',
      linkedin: 'https://linkedin.com/company/cyberhx',
      website: 'https://zerodayheist.cyberhx.com',
      ctftime: 'https://ctftime.org/event/0000',
      leaderboard: 'https://zerodayheist.cyberhx.com/leaderboard',
    },
  },
  {
    id: 2,
    title: 'CyberHx CTF Season 1',
    subtitle: 'Community Capture The Flag',
    description:
      'Our inaugural community CTF event bringing together cybersecurity enthusiasts from across India. Jeopardy-style challenges across multiple categories.',
    date: 'March 2025',
    duration: '24 Hours',
    participants: '300+',
    prize: '₹20,000',
    tags: ['CTF', 'Forensics', 'Pwn', 'Web'],
    status: 'completed',
    category: 'Hacking',
    highlights: ['200+ Teams Participated', '50+ Challenges', 'Top 3 Rewarded'],
    location: 'Online',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=70',
    ],
    social: {
      instagram: 'https://instagram.com/cyberhx',
      x: 'https://x.com/cyberhx',
      linkedin: 'https://linkedin.com/company/cyberhx',
      ctftime: 'https://ctftime.org/event/0001',
      leaderboard: 'https://cyberhx.com/ctf-s1/leaderboard',
    },
  },
  {
    id: 3,
    title: 'Pentest Workshop — Bhopal',
    subtitle: 'Hands-on Penetration Testing',
    description:
      'An offline hands-on workshop covering real-world penetration testing methodologies, tools like Burp Suite, Metasploit, and Nmap, guided by industry experts.',
    date: 'January 2025',
    duration: '2 Days',
    participants: '80',
    prize: 'Certificate',
    tags: ['Workshop', 'Pentesting', 'Offline', 'Beginner Friendly'],
    status: 'completed',
    category: 'Learning',
    highlights: ['80 Attendees', 'Hands-on Labs', 'Industry Mentors'],
    location: 'Bhopal, India',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=400&q=70',
    ],
    social: {
      instagram: 'https://instagram.com/cyberhx',
      linkedin: 'https://linkedin.com/company/cyberhx',
    },
  },
];

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

const filterIcons: Record<Filter, React.ReactNode> = {
  All: <Tag size={14} />,
  Events: <Zap size={14} />,
  Hacking: <Trophy size={14} />,
  Learning: <Calendar size={14} />,
  Teams: <Users size={14} />,
};

export const Gallery = () => {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [selected, setSelected] = useState<Event | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = events.filter((e) => {
    if (activeFilter === 'All') return true;
    return e.category === activeFilter;
  });

  return (
    <div className="min-h-screen bg-[#05080f] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Events by CyberHx
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            All <span className="text-primary">Events</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            CTFs, workshops, and competitions — live, upcoming, and past events from CyberHx.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search by title, description, or team..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-4 pr-4 py-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 justify-center mb-10"
        >
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                activeFilter === f
                  ? 'bg-primary text-black border-primary'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {filterIcons[f]} {f}
            </button>
          ))}
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((event, i) => {
            const s = statusConfig[event.status];
            return (
              <motion.button
                key={event.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelected(event)}
                className={`relative rounded-2xl border bg-[#0a0f1a] overflow-hidden text-left group ${s.border} ${
                  event.status === 'live' ? s.glow : ''
                } hover:border-primary/40 transition-all duration-200`}
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${s.overlayFrom} via-[#0a0f1a]/40 to-transparent`} />

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

                  <div className="absolute bottom-3 left-4 right-4">
                    <h2 className="text-lg font-bold text-white drop-shadow-lg leading-tight">{event.title}</h2>
                    <p className={`text-xs font-medium mt-0.5 ${s.color}`}>{event.subtitle}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-gray-500 text-sm mb-4">Want to be notified about upcoming events?</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 border border-gray-700 text-gray-300 font-medium px-6 py-3 rounded-lg hover:border-primary/50 hover:text-white transition-all duration-200 text-sm"
          >
            Get Notified <ArrowRight size={15} />
          </Link>
        </motion.div>
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
              className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-[#0a0f1a] ${statusConfig[selected.status].border} ${
                selected.status === 'live' ? statusConfig[selected.status].glow : ''
              }`}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-all"
              >
                <X size={18} />
              </button>

              {/* Cover */}
              <div className="relative h-56 sm:h-64 overflow-hidden">
                <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
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
                  <div className="flex items-center justify-center gap-2 w-full py-3 bg-white/[0.04] text-gray-500 font-medium rounded-xl text-sm border border-white/5 cursor-not-allowed">
                    <CheckCircle size={14} /> Event Completed
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
              className="absolute top-5 right-5 text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;