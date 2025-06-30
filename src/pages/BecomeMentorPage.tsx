import React from 'react';
import { motion } from 'framer-motion';
import { Users, Star, BookOpen, Calendar } from 'lucide-react';
import { BecomeMentorForm } from '../components/forms/BecomeMentorForm';

export const BecomeMentorPage = () => {
  const benefits = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Impact Lives",
      description: "Guide and inspire the next generation of developers"
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Build Network",
      description: "Connect with talented individuals and industry experts"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Share Knowledge",
      description: "Share your expertise and learn from others"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Flexible Schedule",
      description: "Mentor at your own pace and convenience"
    }
  ];

  return (
    <div className="min-h-screen bg-dark-300 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold gradient-text mb-4"
          >
            Become a Mentor
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Share your expertise and help shape the future of technology
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="glass-effect rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Why Become a Mentor?</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-4"
                  >
                    <div className="bg-primary/10 p-3 rounded-lg text-primary">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="glass-effect rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-4">What We Look For</h2>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center">
                  <Star className="w-4 h-4 text-primary mr-2" />
                  Technical expertise in relevant areas
                </li>
                <li className="flex items-center">
                  <Star className="w-4 h-4 text-primary mr-2" />
                  Passion for teaching and helping others
                </li>
                <li className="flex items-center">
                  <Star className="w-4 h-4 text-primary mr-2" />
                  Good communication skills
                </li>
                <li className="flex items-center">
                  <Star className="w-4 h-4 text-primary mr-2" />
                  Commitment to regular mentoring sessions
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-effect rounded-xl p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Application Form</h2>
            <BecomeMentorForm onClose={() => {}} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};