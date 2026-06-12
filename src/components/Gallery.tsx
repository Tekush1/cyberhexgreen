import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Trophy, Users, ArrowRight, CheckCircle, Radio, ExternalLink, Zap, MapPin, Tag } from 'lucide-react';
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
  link?: string;
  highlights?: string[];
  location: string;
  image: string;
  gallery?: string[];
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
    link: 'https://zerodayheist.cyberhx.com',
    highlights: ['Registration Open Now', 'Qualifier Round', 'Grand Finale'],
    location: 'Online',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=400&q=70',
    ],
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
    highlights: ['200+ Teams Participated', '50+ Challenges', 'Top 3 Rewarded'],
    location: 'Online',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=70',
    ],
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
    highlights: ['80 Attendees', 'Hands-on Labs', 'Industry Mentors'],
    location: 'Bhopal, India',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=70',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=400&q=70',
    ],
  },
];

const statusConfig = {
  live: {
    label: 'Live',
    color: 'text-red-400',
    border: 'border-red-500/40',
    dot: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-400 border-red-500/40',
    overlayFrom: 'from-red-950/80',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-400',
    border: 'border-green-500/20',
    dot: 'bg-green-500',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    overlayFrom: 'from-[#050e0a]/80',
  },
  upcoming: {
    label: 'Upcoming',
    color: 'text-yellow-400',
    border: 'border-yellow-500/20',
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    overlayFrom: 'from-yellow-950/80',
  },
};

const filters = ['All', 'Live', 'Completed', 'Upcoming'] as const;
type Filter = (typeof filters)[number];

export const Gallery = () => {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = events.filter((e) => {
    if (activeFilter === 'All') return true;
    return e.status === activeFilter.toLowerCase();
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

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-2 justify-center mb-10"
        >
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                activeFilter === f
                  ? 'bg-primary text-black border-primary'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {/* Events */}
        <div className="space-y-10">
          {filtered.map((event, i) => {
            const s = statusConfig[event.status];
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                className={`rounded-2xl border bg-[#0a0f1a] overflow-hidden ${s.border} ${event.status === 'live' ? 'shadow-xl shadow-red-500/5' : ''}`}
              >
                {/* Cover Image */}
                <div className="relative h-52 sm:h-64 overflow-hidden">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${s.overlayFrom} via-[#0a0f1a]/40 to-transparent`} />

                  <div className="absolute top-4 left-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider border rounded-full px-3 py-1 backdrop-blur-sm ${s.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${event.status === 'live' ? 'animate-pulse' : ''}`} />
                      {s.label}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-gray-300 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                    <MapPin size={11} />
                    {event.location}
                  </div>

                  <div className="absolute bottom-4 left-5 right-5">
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">{event.title}</h2>
                    <p className={`text-sm font-medium mt-0.5 ${s.color}`}>{event.subtitle}</p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                      <p className="text-sm text-gray-400 leading-relaxed">{event.description}</p>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { icon: <Calendar size={14} />, label: 'Date', value: event.date },
                          { icon: <Clock size={14} />, label: 'Duration', value: event.duration },
                          { icon: <Users size={14} />, label: 'Participants', value: event.participants },
                        ].map((stat, idx) => (
                          <div key={idx} className="flex flex-col gap-1 bg-white/[0.03] rounded-xl p-3 border border-white/5">
                            <span className="text-primary">{stat.icon}</span>
                            <span className="text-[11px] text-gray-500 uppercase tracking-wide">{stat.label}</span>
                            <span className="text-sm font-semibold text-white">{stat.value}</span>
                          </div>
                        ))}
                      </div>

                      {event.highlights && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {event.highlights.map((h, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-400">
                              <CheckCircle size={12} className={event.status === 'completed' ? 'text-green-400' : 'text-primary'} />
                              {h}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {event.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 text-[11px] border border-gray-700 text-gray-500 px-2.5 py-0.5 rounded-full">
                            <Tag size={9} /> {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
                        <Trophy size={16} className="text-primary flex-shrink-0" />
                        <div>
                          <span className="text-base font-bold text-primary">{event.prize}</span>
                          <p className="text-[11px] text-gray-500">Prize Pool</p>
                        </div>
                      </div>

                      {event.gallery && event.gallery.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Photos</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {event.gallery.map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() => setLightbox(img)}
                                className="relative aspect-square rounded-lg overflow-hidden group border border-white/5 hover:border-primary/30 transition-all"
                              >
                                <img
                                  src={img}
                                  alt={`${event.title} photo ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {event.status === 'live' && event.link ? (
                        <a
                          href={event.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all duration-200 mt-auto"
                        >
                          <Zap size={15} /> Register Now <ExternalLink size={13} />
                        </a>
                      ) : event.status === 'completed' ? (
                        <div className="flex items-center justify-center gap-2 w-full py-3 bg-white/[0.04] text-gray-500 font-medium rounded-xl text-sm border border-white/5 cursor-not-allowed mt-auto">
                          <CheckCircle size={14} /> Event Completed
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-500/10 text-yellow-400 font-medium rounded-xl text-sm border border-yellow-500/20 mt-auto">
                          <Radio size={14} /> Coming Soon
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
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

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
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
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;