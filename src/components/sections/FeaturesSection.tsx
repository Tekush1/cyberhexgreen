import React from 'react';
import { Code, Brain, Users, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Code size={24} />,
      title: 'Hands-on Learning',
      description: 'Build real projects with expert guidance'
    },
    {
      icon: <Users size={24} />,
      title: '1-on-1 Mentorship',
      description: 'Personal attention from industry experts'
    },
    {
      icon: <Brain size={24} />,
      title: 'Skill Development',
      description: 'Master in-demand technologies'
    },
    {
      icon: <Rocket size={24} />,
      title: 'Career Growth',
      description: 'Fast-track your tech career'
    }
  ];

  return (
    <div className="bg-dark-200 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-4"
          >
            Why Choose Us?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-gray-400 text-base md:text-lg px-4"
          >
            Comprehensive learning paths for your success
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="glass-effect rounded-xl p-6 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              <div className="text-primary mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};