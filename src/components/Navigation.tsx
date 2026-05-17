import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield, Home, Terminal, Code, Users, BookOpen, Mail, ChevronDown, Layers, Zap, Calendar, Clock, Trophy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  const platforms = [
    { name: 'Pentest Lab', href: 'https://pentestlab.cyberhx.com', icon: <Terminal size={16} />, desc: 'Hands-on penetration testing labs' },
    { name: 'CTF Platform', href: 'https://ctf.cyberhx.com', icon: <Code size={16} />, desc: 'Capture The Flag challenges' },
  ];

  const staticNavItems = [
    { name: 'Home', href: '/', icon: <Home size={18} /> },
    { name: 'Blog & News', href: '/blog', icon: <BookOpen size={18} /> },
    { name: 'About Us', href: '/about', icon: <Users size={18} /> },
    { name: 'Contact', href: '/contact', icon: <Mail size={18} /> },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setIsOpen(false); setPlatformsOpen(false); setEventsOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false); setPlatformsOpen(false); setEventsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav
      ref={menuRef}
      className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#05080f]/95 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/20' : 'bg-transparent'}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">

          {/* Logo */}
          <Link to="/" className="text-xl font-bold flex items-center space-x-2 group flex-shrink-0" aria-label="CyberHx Home">
            <Shield className="w-6 h-6 text-[#a3e635] flex-shrink-0" />
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <span className="text-[#a3e635] font-cyber">Cyber</span>
              <span className="text-white font-cyber">Hx</span>
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">

            {/* Home */}
            <Link to="/" className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${isActive('/') ? 'text-[#05080f] bg-[#a3e635]' : 'text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5'}`}>
              <Home size={18} /><span>Home</span>
            </Link>

            {/* Platforms Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setPlatformsOpen(!platformsOpen); setEventsOpen(false); }}
                className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${platformsOpen ? 'text-[#a3e635] bg-[#a3e635]/10' : 'text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5'}`}
              >
                <Layers size={18} /><span>Platforms</span>
                <motion.div animate={{ rotate: platformsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              <AnimatePresence>
                {platformsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-[#0a0e1a] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                  >
                    <div className="p-1.5">
                      {platforms.map((p) => (
                        <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer"
                          onClick={() => setPlatformsOpen(false)}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[#a3e635]/8 group transition-all duration-150"
                        >
                          <span className="text-[#a3e635] mt-0.5 flex-shrink-0">{p.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-200 group-hover:text-[#a3e635] transition-colors">
                              {p.name}
                              <ExternalLink size={11} className="text-gray-600 group-hover:text-[#a3e635]/60" />
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Events Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setEventsOpen(!eventsOpen); setPlatformsOpen(false); }}
                className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${eventsOpen ? 'text-red-400 bg-red-500/10' : 'text-gray-300 hover:text-red-400 hover:bg-red-500/5'}`}
              >
                <Calendar size={18} /><span>Events</span>
                <motion.div animate={{ rotate: eventsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              <AnimatePresence>
                {eventsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-80 bg-[#0a0e1a] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                  >
                    <div className="p-3">
                      <a
                        href="https://zerodayheist.cyberhx.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setEventsOpen(false)}
                        className="block group"
                      >
                        <div className="relative rounded-xl overflow-hidden border border-red-500/30 hover:border-red-500/60 transition-all duration-200 bg-gradient-to-br from-red-950/40 via-[#0d0a0a] to-[#0a0e1a] p-4">
                          {/* Live badge */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Live Event</span>
                            </div>
                            <ExternalLink size={13} className="text-gray-600 group-hover:text-red-400 transition-colors" />
                          </div>

                          {/* Event Name */}
                          <div className="flex items-center gap-2 mb-1">
                            <Zap size={18} className="text-red-400 flex-shrink-0" />
                            <h3 className="text-base font-bold text-white group-hover:text-red-300 transition-colors">ZeroDay Heist</h3>
                          </div>
                          <p className="text-xs text-gray-400 mb-4 ml-6">
                            India's premier cybersecurity CTF & hacking event by CyberHx
                          </p>

                          {/* Timeline */}
                          <div className="space-y-2.5 mb-4">
                            {[
                              { phase: 'Registration Open', status: 'active', icon: <Trophy size={11} /> },
                              { phase: 'Qualifier Round', status: 'upcoming', icon: <Clock size={11} /> },
                              { phase: 'Grand Finale', status: 'upcoming', icon: <Zap size={11} /> },
                            ].map((step, i, arr) => (
                              <div key={i} className="flex items-center gap-2.5">
                                {/* connector line */}
                                <div className="flex flex-col items-center">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.status === 'active' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                                    {step.icon}
                                  </div>
                                  {i < arr.length - 1 && <div className="w-px h-3 bg-gray-700 mt-0.5" />}
                                </div>
                                <span className={`text-xs ${step.status === 'active' ? 'text-red-300 font-semibold' : 'text-gray-500'}`}>
                                  {step.phase}
                                </span>
                                {step.status === 'active' && (
                                  <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full ml-auto">Now</span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* CTA */}
                          <div className="w-full py-2 bg-red-600 group-hover:bg-red-500 rounded-lg text-center text-sm font-bold text-white transition-colors">
                            Register Now →
                          </div>
                        </div>
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Blog */}
            <Link to="/blog" className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${isActive('/blog') ? 'text-[#05080f] bg-[#a3e635]' : 'text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5'}`}>
              <BookOpen size={18} /><span>Blog</span>
            </Link>
            <Link to="/about" className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${isActive('/about') ? 'text-[#05080f] bg-[#a3e635]' : 'text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5'}`}>
              <Users size={18} /><span>About</span>
            </Link>
            <Link to="/contact" className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${isActive('/contact') ? 'text-[#05080f] bg-[#a3e635]' : 'text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5'}`}>
              <Mail size={18} /><span>Contact</span>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2.5 rounded-xl text-[#a3e635] hover:bg-[#a3e635]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#a3e635]/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={isOpen ? 'close' : 'open'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                {isOpen ? <X size={22} /> : <Menu size={22} />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-t border-white/5 bg-[#05080f]/98 backdrop-blur-md"
          >
            <div className="px-4 py-3 space-y-1 pb-6">

              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.04 }}>
                <Link to="/" onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all min-h-[52px] ${isActive('/') ? 'bg-[#a3e635] text-[#05080f]' : 'text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5'}`}>
                  <span className={`flex-shrink-0 ${isActive('/') ? 'text-[#05080f]' : 'text-[#a3e635]'}`}><Home size={18} /></span>
                  <span>Home</span>
                </Link>
              </motion.div>

              {/* Platforms */}
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.08 }}>
                <div className="px-4 pt-3 pb-1.5">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5"><Layers size={11} /> Platforms</span>
                </div>
                {platforms.map((p) => (
                  <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5 transition-all min-h-[52px]">
                    <span className="text-[#a3e635] flex-shrink-0">{p.icon}</span>
                    <span>{p.name}</span>
                    <span className="ml-auto text-xs text-gray-600">↗</span>
                  </a>
                ))}
              </motion.div>

              {/* Events */}
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.12 }}>
                <div className="px-4 pt-3 pb-1.5">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={11} /> Events</span>
                </div>
                <a href="https://zerodayheist.cyberhx.com" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium text-red-300 hover:text-red-200 hover:bg-red-500/8 transition-all min-h-[52px] border border-red-500/20 hover:border-red-500/40 mt-1">
                  <span className="text-red-400 flex-shrink-0"><Zap size={18} /></span>
                  <div>
                    <div className="flex items-center gap-2">ZeroDay Heist <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /></div>
                    <div className="text-xs text-gray-500 font-normal">Registration Open Now</div>
                  </div>
                  <span className="ml-auto text-xs text-gray-600">↗</span>
                </a>
              </motion.div>

              {staticNavItems.filter(i => i.href !== '/').map((item, index) => (
                <motion.div key={item.name} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.16 + index * 0.04 }}>
                  <Link to={item.href} onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all min-h-[52px] ${isActive(item.href) ? 'bg-[#a3e635] text-[#05080f]' : 'text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5'}`}>
                    <span className={`flex-shrink-0 ${isActive(item.href) ? 'text-[#05080f]' : 'text-[#a3e635]'}`}>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                </motion.div>
              ))}

              <div className="pt-3 border-t border-white/5 mt-1">
                <Link to="/register" onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center w-full py-3.5 px-6 bg-[#a3e635] text-[#05080f] rounded-xl font-bold text-base transition-transform active:scale-[0.98]">
                  Register Now
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};