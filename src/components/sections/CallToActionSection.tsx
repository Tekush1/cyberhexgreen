import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, AlertTriangle, Users, BookOpen } from 'lucide-react';
import { ParticleBackground } from '../ParticleBackground';

export const CallToActionSection = () => {
  return (
    <div className="py-24 bg-dark-300 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <ParticleBackground />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <motion.div
                whileHover={{ 
                  scale: 1.1,
                  y: -5
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15
                }}
              >
                <Shield className="relative w-20 h-20 text-primary mx-auto" />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold gradient-text mb-6"
          >
            Secure Your Digital Future
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto"
          >
            Join CyberHx and become part of a community making the digital world safer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
          >
            <div className="glass-effect rounded-xl p-6">
              <motion.div
                whileHover={{ scale: 1.1, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">Learn & Master</h3>
              <p className="text-gray-400">
                Access cybersecurity courses and hands-on labs
              </p>
            </div>
            
            <div className="glass-effect rounded-xl p-6">
              <motion.div
                whileHover={{ scale: 1.1, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <AlertTriangle className="w-12 h-12 text-primary mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">Detect & Report</h3>
              <p className="text-gray-400">
                Use Mithayadarpan to identify and report scams
              </p>
            </div>
            
            <div className="glass-effect rounded-xl p-6">
              <motion.div
                whileHover={{ scale: 1.1, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">Protect & Share</h3>
              <p className="text-gray-400">
                Help protect the community by sharing knowledge
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href="https://tranquil-truffle-15401f.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10">Access CyberHx Platform</span>
              <ArrowRight className="relative z-10 ml-2" />
            </a>
            
            <button className="inline-flex items-center border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors">
              Launch Mithayadarpan
              <AlertTriangle className="ml-2" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-gray-400"
          >
            <p className="text-sm">
              Join thousands of users who trust CyberHx for digital security
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};