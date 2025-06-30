import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield, Home, Terminal, Code, Users, Calendar, Trophy, Image, Mail, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Home', href: '/', icon: <Home size={20} /> },
    { name: 'Timeline', href: '/timeline', icon: <Calendar size={20} /> },
    { name: 'Blog & News', href: '/blog', icon: <BookOpen size={20} /> },
    { name: 'About Us', href: '/about', icon: <Users size={20} /> },
    { name: 'Contact', href: '/contact', icon: <Mail size={20} /> },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const isActive = (href: string) => {
    if (href === '/about#terminal') {
      return location.pathname === '/about' && location.hash === '#terminal';
    }
    return location.pathname === href;
  };

  const handleTerminalClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/about') {
      e.preventDefault();
      document.querySelector('#terminal')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-dark-200/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link 
            to="/" 
            className="text-xl font-bold flex items-center space-x-2 group"
          >
            <Shield className="w-6 h-6 text-cyberblue" />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <span className="hidden sm:inline-block text-cyberblue font-cyber relative">
                Cyber
                <span className="" />
              </span>
              <span className="hidden sm:inline-block text-white font-cyber ml-1">Hx</span>
              <span className="sm:hidden font-cyber">C-x</span>
            </motion.div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={item.name === 'Terminal' ? handleTerminalClick : undefined}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden ${
                  isActive(item.href)
                    ? 'text-dark-300 bg-primary'
                    : 'text-gray-300 hover:text-primary'
                }`}
              >
                <span className="relative z-10 flex items-center">
                  {item.icon}
                  <span className="ml-2">{item.name}</span>
                </span>
                <motion.div
                  initial={false}
                  animate={{
                    width: isActive(item.href) ? '100%' : '0%'
                  }}
                  className="absolute inset-0 bg-primary opacity-20"
                  layoutId="navbar-indicator"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-2 md:hidden">
            <Link
              to="/"
              className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
              aria-label="Home"
            >
              <Terminal size={24} className="animate-pulse" />
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden"
            >
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-effect rounded-lg mt-2 py-2 px-3 shadow-xl border border-primary/10"
              >
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={item.href}
                      onClick={(e) => {
                        if (item.name === 'Terminal') {
                          handleTerminalClick(e);
                        }
                        setIsOpen(false);
                      }}
                      className={`block px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary text-dark-300'
                          : 'text-gray-300 hover:text-primary hover:bg-primary/5'
                      }`}
                    >
                      <motion.span
                        initial={{ x: -10 }}
                        animate={{ x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center"
                      >
                        {item.icon}
                        <span className="ml-2">{item.name}</span>
                      </motion.span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};