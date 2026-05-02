import React from 'react';
import { Terminal, Flag, BookOpen, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Terminal size={22} />,
      title: 'Pentest Lab',
      description: 'Real-world hacking labs with tools like Nmap, Gobuster, Metasploit and full MITRE ATT&CK coverage.',
      link: 'https://pentestlab.cyberhx.com',
      label: 'Open Lab →',
    },
    {
      icon: <Flag size={22} />,
      title: 'CTF Platform',
      description: 'Live Capture The Flag competitions with scoreboards, hints, and challenges from beginner to advanced.',
      link: 'https://ctf.cyberhx.com',
      label: 'Play CTF →',
    },
    {
      icon: <BookOpen size={22} />,
      title: 'Blog & Resources',
      description: 'In-depth write-ups, tutorials, and cybersecurity news written by the CyberHx community.',
      link: '/blog',
      label: 'Read Blog →',
    },
    {
      icon: <Shield size={22} />,
      title: 'Scam Reporter',
      description: 'Report suspicious accounts and online fraud. Our team investigates and alerts the community.',
      link: '/contact',
      label: 'Report Now →',
    },
  ];

  return (
    <div className="bg-dark-200 py-20">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-3"
          >
            Everything you need to grow in cybersecurity
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-base max-w-xl mx-auto"
          >
            Built by security professionals. Designed for learners at every level.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="bg-dark-100 border border-gray-800 rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="text-primary mb-4 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{feature.description}</p>
              <a
                href={feature.link}
                className="text-primary text-sm font-medium hover:underline group-hover:translate-x-1 inline-block transition-transform duration-200"
              >
                {feature.label}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
