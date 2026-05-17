import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Shield, Trophy, Clock, Users, Target, Terminal,
  ArrowRight, Calendar, MapPin, Flag, Lock, ChevronRight,
  Skull, Radio, AlertTriangle
} from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay },
});

const timeline = [
  {
    phase: '01',
    title: 'Registration Open',
    date: 'Now Live',
    desc: 'Secure your spot — individual or team registrations welcome. Fill the form and get your confirmation.',
    status: 'active',
    icon: <Flag size={18} />,
  },
  {
    phase: '02',
    title: 'Qualifier Round',
    date: 'Coming Soon',
    desc: 'Online CTF qualifier — Jeopardy style. Top teams advance to the Grand Finale.',
    status: 'upcoming',
    icon: <Terminal size={18} />,
  },
  {
    phase: '03',
    title: 'Grand Finale',
    date: 'TBA',
    desc: 'The final showdown. Attack/Defense format. Prizes, certificates, and glory await.',
    status: 'upcoming',
    icon: <Trophy size={18} />,
  },
];

const categories = [
  { name: 'Web Exploitation', icon: <Target size={20} />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  { name: 'Reverse Engineering', icon: <Skull size={20} />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { name: 'Cryptography', icon: <Lock size={20} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { name: 'OSINT', icon: <Radio size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { name: 'Forensics', icon: <AlertTriangle size={20} />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { name: 'Pwn / Binary', icon: <Zap size={20} />, color: 'text-red-300', bg: 'bg-red-400/10 border-red-400/20' },
];

const stats = [
  { value: '500+', label: 'Expected Participants', icon: <Users size={18} /> },
  { value: '₹50K+', label: 'Prize Pool', icon: <Trophy size={18} /> },
  { value: '24H', label: 'CTF Duration', icon: <Clock size={18} /> },
  { value: '6+', label: 'Challenge Categories', icon: <Target size={18} /> },
];

export default function EventsPage() {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#05080f] text-white overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* Grid bg */}
        <div className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(239,68,68,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Radial glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.12)_0%,transparent_65%)]" />
        {/* Scanlines overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-28 pb-20">

          {/* Live badge */}
          <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 mb-6 bg-red-500/10 border border-red-500/30 px-4 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Registration Open</span>
          </motion.div>

          {/* Event name with glitch */}
          <motion.h1
            {...fadeUp(0.1)}
            className={`text-6xl md:text-8xl font-black uppercase leading-none mb-4 tracking-tight select-none ${glitch ? 'text-red-400' : 'text-white'}`}
            style={{
              textShadow: glitch
                ? '3px 0 #ef4444, -3px 0 #22d3ee'
                : '0 0 40px rgba(239,68,68,0.3)',
              transition: 'text-shadow 0.1s',
            }}
          >
            ZeroDay<br />
            <span className="text-red-500" style={{ textShadow: '0 0 30px rgba(239,68,68,0.6)' }}>Heist</span>
          </motion.h1>

          <motion.div {...fadeUp(0.2)} className="flex items-center justify-center gap-2 mb-4">
            <span className="h-px w-16 bg-red-500/40" />
            <span className="text-xs text-red-400/80 font-mono uppercase tracking-widest">by CyberHx</span>
            <span className="h-px w-16 bg-red-500/40" />
          </motion.div>

          <motion.p {...fadeUp(0.3)} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            India's premier cybersecurity Capture The Flag event. Hack, exploit, and conquer. Only the best make it out.
          </motion.p>

          {/* Stats row */}
          <motion.div {...fadeUp(0.4)} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 max-w-2xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/[0.03] border border-white/8 rounded-xl px-3 py-4 flex flex-col items-center gap-1">
                <span className="text-red-400">{s.icon}</span>
                <span className="text-2xl font-black text-white">{s.value}</span>
                <span className="text-[10px] text-gray-500 text-center leading-tight">{s.label}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div {...fadeUp(0.5)} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://zerodayheist.cyberhx.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-10 py-4 rounded-xl text-base transition-all duration-200 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Zap size={18} className="relative z-10" />
              <span className="relative z-10">Register Now</span>
              <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#timeline"
              className="inline-flex items-center justify-center gap-2 border border-white/10 text-gray-400 hover:text-white hover:border-white/25 font-medium px-10 py-4 rounded-xl text-base transition-all duration-200">
              <Calendar size={18} />
              View Timeline
            </a>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#05080f] to-transparent z-10" />
      </section>

      {/* ── Timeline ── */}
      <section id="timeline" className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono">Event Roadmap</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-2">Timeline</h2>
          </motion.div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-red-500/60 via-red-500/20 to-transparent md:-translate-x-px" />

            <div className="space-y-10">
              {timeline.map((item, i) => (
                <motion.div key={i} {...fadeUp(i * 0.1)}
                  className={`relative flex gap-6 md:gap-0 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:pr-14 md:text-right' : 'md:pl-14'} pl-16 md:pl-0`}>
                    <div className={`inline-block bg-white/[0.03] border ${item.status === 'active' ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-white/8'} rounded-2xl p-5 text-left max-w-sm`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-mono font-bold ${item.status === 'active' ? 'text-red-400' : 'text-gray-600'}`}>PHASE {item.phase}</span>
                        {item.status === 'active' && (
                          <span className="flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
                          </span>
                        )}
                      </div>
                      <h3 className={`text-xl font-bold mb-1 ${item.status === 'active' ? 'text-white' : 'text-gray-300'}`}>{item.title}</h3>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Clock size={12} className={item.status === 'active' ? 'text-red-400' : 'text-gray-600'} />
                        <span className={`text-xs font-medium ${item.status === 'active' ? 'text-red-300' : 'text-gray-500'}`}>{item.date}</span>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 top-6 z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${item.status === 'active' ? 'bg-red-600 border-red-400 shadow-[0_0_16px_rgba(239,68,68,0.5)]' : 'bg-[#0a0e1a] border-gray-700'}`}>
                      <span className={item.status === 'active' ? 'text-white' : 'text-gray-600'}>{item.icon}</span>
                    </div>
                  </div>

                  {/* Spacer for opposite side */}
                  <div className="hidden md:block flex-1" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Challenge Categories ── */}
      <section className="py-24 px-6 bg-[#070b14]">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono">What to Expect</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-2">Challenge Categories</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Challenges spanning across all domains of offensive security. Beginner to expert level.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat, i) => (
              <motion.div key={i} {...fadeUp(i * 0.07)}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${cat.bg} group hover:scale-[1.02] transition-transform duration-200 cursor-default`}
              >
                <span className={cat.color}>{cat.icon}</span>
                <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{cat.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Can Join ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono">Eligibility</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-2">Who Can Participate?</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Users size={24} />, title: 'Students', desc: 'College & school students passionate about cybersecurity and ethical hacking.' },
              { icon: <Shield size={24} />, title: 'Professionals', desc: 'Working security professionals and bug bounty hunters looking to compete.' },
              { icon: <Terminal size={24} />, title: 'Beginners', desc: 'Anyone curious about hacking — beginner-friendly challenges included.' },
            ].map((item, i) => (
              <motion.div key={i} {...fadeUp(i * 0.1)}
                className="bg-white/[0.02] border border-white/8 rounded-2xl p-6 hover:border-red-500/20 hover:bg-red-500/[0.03] transition-all duration-300"
              >
                <span className="text-red-400 mb-4 block">{item.icon}</span>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp(0)}>
            <Zap size={40} className="text-red-500 mx-auto mb-6" style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.6))' }} />
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4">Ready to Heist?</h2>
            <p className="text-gray-400 text-lg mb-10">Registrations are open now. Don't miss your shot.</p>
            <a
              href="https://zerodayheist.cyberhx.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold px-12 py-5 rounded-2xl text-lg transition-all duration-200 shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:shadow-[0_0_60px_rgba(239,68,68,0.5)]"
            >
              <Zap size={20} />
              Register on ZeroDay Heist
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <p className="text-xs text-gray-600 mt-5 font-mono">zerodayheist.cyberhx.com</p>
          </motion.div>
        </div>
      </section>

    </div>
  );
}