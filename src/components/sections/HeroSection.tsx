import React from 'react';
import { ArrowRight, Terminal, Cpu, Zap } from 'lucide-react';
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
          className="flex flex-col sm:flex-row gap-4 justify-center mb-6"
        >
          {/* ZeroDay Heist — Red event button (primary) */}
          <a
            href="https://zerodayheist.cyberhx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-8 py-3.5 rounded-lg transition-all duration-200 text-sm overflow-hidden group"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-lg ring-2 ring-red-500/40 animate-pulse" />
            <Zap size={18} className="relative z-10" />
            <span className="relative z-10">ZeroDay Heist</span>
            <span className="relative z-10 text-xs bg-white/20 px-1.5 py-0.5 rounded-full font-normal">Live</span>
            <ArrowRight size={16} className="relative z-10 group-hover:translate-x-0.5 transition-transform" />
          </a>

          {/* CTF Platform — secondary */}
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

        {/* ZeroDay subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="text-xs text-gray-600 mb-10"
        >
          🔴 Registration for ZeroDay Heist is now open —{' '}
          <a href="https://zerodayheist.cyberhx.com" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">
            secure your spot
          </a>
        </motion.p>

        {/* Feature chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.8 }}
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