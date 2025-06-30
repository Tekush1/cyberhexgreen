import React from 'react';
import { motion } from 'framer-motion';

const technologies = [
  { name: 'React', color: '#61DAFB' },
  { name: 'TypeScript', color: '#3178C6' },
  { name: 'Node.js', color: '#339933' },
  { name: 'Python', color: '#3776AB' },
  { name: 'Docker', color: '#2496ED' },
  { name: 'AWS', color: '#FF9900' },
  { name: 'GraphQL', color: '#E10098' },
  { name: 'MongoDB', color: '#47A248' },
];

export const TechStack = () => {
  return (
    <div className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 gradient-text">
          Technologies We Master
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="glass-effect rounded-xl p-4 md:p-6 text-center cursor-pointer"
              style={{
                boxShadow: `0 0 20px ${tech.color}20`,
                border: `1px solid ${tech.color}40`,
              }}
            >
              <div
                className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${tech.color}20` }}
              >
                <span
                  className="text-xl md:text-2xl font-bold"
                  style={{ color: tech.color }}
                >
                  {tech.name[0]}
                </span>
              </div>
              <h4 className="text-base md:text-lg font-semibold text-white">{tech.name}</h4>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};