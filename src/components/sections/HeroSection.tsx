import React from 'react';
import { ArrowRight, Terminal, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#05080f]">
      {/* Subtle grid background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-300 via-dark-300/90 to-dark-300" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-32 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          India's Cybersecurity Community
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 tracking-tight"
        >
          Cyber<span className="text-primary">Hx</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="text-xl md:text-2xl text-gray-400 mb-4 max-w-2xl mx-auto font-normal"
        >
          Learn. Practice. Protect.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="text-base text-gray-500 mb-12 max-w-xl mx-auto leading-relaxed"
        >
          Hands-on cybersecurity training through real labs, CTF challenges, and a growing community of security professionals.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <a
            href="https://pentestlab.cyberhx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-primary text-black font-semibold px-8 py-3.5 rounded-lg hover:bg-primary/90 transition-all duration-200 text-sm"
          >
            <Terminal size={18} />
            Open Pentest Lab
            <ArrowRight size={16} />
          </a>
          <a
            href="https://ctf.cyberhx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 font-medium px-8 py-3.5 rounded-lg hover:border-primary/50 hover:text-white transition-all duration-200 text-sm"
          >
            <Cpu size={18} />
            CTF Platform
          </a>
        </motion.div>

        {/* Feature chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {[
            'Pentest Lab',
            'CTF Challenges',
            'MITRE ATT&CK',
            'Scam Reporter',
            'Blog & Resources',
            'Community',
          ].map((chip) => (
            <span
              key={chip}
              className="text-xs text-gray-500 border border-gray-800 px-3 py-1.5 rounded-full bg-dark-100/50"
            >
              {chip}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
