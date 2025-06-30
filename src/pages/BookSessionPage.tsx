import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Calendar, MessageSquare } from 'lucide-react';
import { BookSessionForm } from '../components/forms/BookSessionForm';

export const BookSessionPage = () => {
  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Expert Mentors",
      description: "Learn from experienced industry professionals"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Flexible Timing",
      description: "Choose from multiple available time slots"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Regular Sessions",
      description: "Schedule recurring mentoring sessions"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Personalized Guidance",
      description: "Get one-on-one attention and feedback"
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
            Book a Mentoring Session
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Schedule a one-on-one session with our expert mentors
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="glass-effect rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Why Book a Session?</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-4"
                  >
                    <div className="bg-primary/10 p-3 rounded-lg text-primary">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="glass-effect rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-4">What to Expect</h2>
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm mr-3 mt-1">
                    01
                  </span>
                  <p>Schedule a session at your preferred time</p>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm mr-3 mt-1">
                    02
                  </span>
                  <p>Receive confirmation and session details</p>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm mr-3 mt-1">
                    03
                  </span>
                  <p>Join the session via provided link</p>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm mr-3 mt-1">
                    04
                  </span>
                  <p>Get personalized guidance and feedback</p>
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-effect rounded-xl p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Book Your Session</h2>
            <BookSessionForm onClose={() => {}} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};