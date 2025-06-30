import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, X, Users, ArrowRight, Sparkles } from 'lucide-react';

export const HiringBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('cyberhx-hiring-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('cyberhx-hiring-banner-dismissed', 'true');
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-6 right-6 z-40 max-w-sm"
        >
          <div className="glass-effect rounded-xl p-4 border border-primary/20 shadow-2xl">
            <div className="flex items-start gap-3">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="bg-primary/10 p-2 rounded-lg"
              >
                <Briefcase className="w-6 h-6 text-primary" />
              </motion.div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white">We're Hiring!</h3>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                  </motion.div>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  Join CyberHx as an intern and work on cutting-edge cybersecurity projects
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs text-gray-300">4 positions available</span>
                </div>

                <motion.button
                  onClick={() => window.open('https://forms.gle/K5qSEYwjQ9pcmowz9', '_blank')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-primary text-dark-300 py-2 px-4 rounded-lg font-medium text-sm hover:bg-secondary transition-colors flex items-center justify-center"
                >
                  Apply Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </motion.button>
              </div>

              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
