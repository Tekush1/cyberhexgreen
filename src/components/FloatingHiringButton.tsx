import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Sparkles } from 'lucide-react';

export const FloatingHiringButton: React.FC = () => {
  const handleClick = () => {
    window.open('https://www.youtube.com', '_blank'); // Opens in new tab
    // window.location.href = 'https://www.youtube.com'; // Use this if you want same-tab redirect
  };

  return (
    <motion.button
      onClick={handleClick}
      className="fixed bottom-6 left-6 z-40 bg-primary text-dark-300 p-4 rounded-full shadow-2xl hover:bg-secondary transition-colors"
      whileHover={{ 
        scale: 1.1,
        boxShadow: "0 0 30px rgba(0, 255, 65, 0.5)"
      }}
      whileTap={{ scale: 0.9 }}
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <div className="relative">
        <Briefcase className="w-6 h-6" />
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="w-3 h-3 text-yellow-400" />
        </motion.div>
      </div>
    </motion.button>
  );
};
