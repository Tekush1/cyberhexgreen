import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield, Home, Terminal, Code, Users, BookOpen, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { name: 'Home', href: '/', icon: <Home size={18} /> },
    { name: 'Pentest Lab', href: 'https://pentestlab.cyberhx.com', icon: <Terminal size={18} />, external: true },
    { name: 'CTF', href: 'https://ctf.cyberhx.com', icon: <Code size={18} />, external: true },
    { name: 'Blog & News', href: '/blog', icon: <BookOpen size={18} /> },
    { name: 'About Us', href: '/about', icon: <Users size={18} /> },
    { name: 'Contact', href: '/contact', icon: <Mail size={18} /> },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav
      ref={menuRef}
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[#05080f]/95 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/20' : 'bg-transparent'
      }`}
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
            {navItems.map((item) =>
              item.external ? (
                <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer"
                  className="px-3 lg:px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5 flex items-center gap-1.5 transition-all duration-200">
                  {item.icon}<span>{item.name}</span>
                </a>
              ) : (
                <Link key={item.name} to={item.href}
                  className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                    isActive(item.href) ? 'text-[#05080f] bg-[#a3e635]' : 'text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5'
                  }`}>
                  {item.icon}<span>{item.name}</span>
                </Link>
              )
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2.5 rounded-xl text-[#a3e635] hover:bg-[#a3e635]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#a3e635]/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
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
              {navItems.map((item, index) => (
                <motion.div key={item.name} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5 transition-all min-h-[52px]">
                      <span className="text-[#a3e635] flex-shrink-0">{item.icon}</span>
                      <span>{item.name}</span>
                      <span className="ml-auto text-xs text-gray-600">↗</span>
                    </a>
                  ) : (
                    <Link to={item.href} onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all min-h-[52px] ${
                        isActive(item.href) ? 'bg-[#a3e635] text-[#05080f]' : 'text-gray-300 hover:text-[#a3e635] hover:bg-[#a3e635]/5'
                      }`}>
                      <span className={`flex-shrink-0 ${isActive(item.href) ? 'text-[#05080f]' : 'text-[#a3e635]'}`}>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  )}
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
