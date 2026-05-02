import React from 'react';
import { motion } from 'framer-motion';

export const LoadingSpinner = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        className="w-20 h-20 border-4 border-primary rounded-full"
        animate={{
          rotate: 360,
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
};