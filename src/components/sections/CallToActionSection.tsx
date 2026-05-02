import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Terminal, Cpu } from 'lucide-react';

export const CallToActionSection = () => {
  return (
    <div className="py-24 bg-dark-300 border-t border-gray-900">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-white mb-4"
        >
          Ready to start hacking?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-gray-500 text-base mb-10 max-w-lg mx-auto"
        >
          Join CyberHx — practice in our pentest labs, compete in CTFs, and level up with a community that takes security seriously.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
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

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-gray-600 text-xs"
        >
          Questions? Reach us at{' '}
          <a href="mailto:support@cyberhx.com" className="text-primary hover:underline">
            support@cyberhx.com
          </a>
        </motion.p>
      </div>
    </div>
  );
};
