import React from 'react';
import { Shield, Eye, AlertTriangle, Users, BookOpen, Target, ArrowRight, Zap, Lock, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { CountUp } from '../CountUp';
import { ParticleBackground } from '../ParticleBackground';

export const ImpactSection = () => {
  const impactStats = [
    {
      icon: <Shield size={48} />,
      value: 10,
      suffix: '+',
      label: 'Scams Detected',
      description: 'Threats identified'
    },
    {
      icon: <Users size={48} />,
      value: 500,
      suffix: '+',
      label: 'Users Protected',
      description: 'People saved from fraud'
    },
    {
      icon: <BookOpen size={48} />,
      value: 100,
      suffix: '+',
      label: 'Learning Modules',
      description: 'Security courses'
    },
    {
      icon: <Target size={48} />,
      value: 50,
      suffix: '+',
      label: 'CTF Challenges',
      description: 'Interactive challenges'
    }
  ];

  const platformFeatures = [
    {
      icon: <Eye size={32} />,
      value: 'Real-time',
      label: 'Scam Detection',
      description: 'AI-powered threat identification'
    },
    {
      icon: <AlertTriangle size={32} />,
      value: '24/7',
      label: 'Monitoring',
      description: 'Continuous security surveillance'
    },
    {
      icon: <Lock size={32} />,
      value: '99.9%',
      label: 'Accuracy',
      description: 'Precise fraud detection'
    },
    {
      icon: <Search size={32} />,
      value: 'Instant',
      label: 'Analysis',
      description: 'Quick threat assessment'
    }
  ];

  const cardVariants = {
    hidden: { 
      opacity: 0,
      y: 20,
      scale: 0.8
    },
    visible: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    },
    hover: {
      scale: 1.05,
      y: -5,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: 0.95
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-dark-300 via-dark-200 to-dark-300 opacity-50" />
      <ParticleBackground />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold gradient-text mb-4 md:mb-6">
            CyberHx Impact
          </h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Protecting the digital world through advanced cybersecurity education
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 mb-8 md:mb-16"
        >
          {impactStats.map((stat, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              className="glass-effect rounded-xl p-4 md:p-8 text-center transform hover:shadow-2xl hover:shadow-primary/20 cursor-pointer"
              role="article"
              aria-label={`${stat.label} Statistics`}
            >
              <motion.div
                className="relative mb-3 md:mb-6"
                whileHover={{ scale: 1.1, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                <div className="relative text-primary flex justify-center">
                  {stat.icon}
                </div>
              </motion.div>
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2"
              >
                <CountUp end={stat.value} duration={2} suffix={stat.suffix} />
              </motion.div>
              <div className="text-base md:text-xl font-semibold text-primary mb-1 md:mb-2">
                {stat.label}
              </div>
              <p className="text-xs md:text-base text-gray-400 line-clamp-2">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Mithayadarpan Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-effect rounded-2xl p-8 mb-16"
          id="mithayadarpan"
        >
          <div className="text-center mb-8">
            <motion.div
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="inline-block mb-4"
            >
              <AlertTriangle className="w-16 h-16 text-primary" />
            </motion.div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Mithayadarpan - Scam Reporter
            </h3>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Report fake accounts and scams. We investigate and protect the community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <motion.div 
                className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                whileHover={{ scale: 1.1, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Search className="w-8 h-8 text-primary" />
              </motion.div>
              <h4 className="text-xl font-bold text-white mb-2">Report</h4>
              <p className="text-gray-400">
                Report suspicious accounts and fraudulent activities
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <motion.div 
                className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                whileHover={{ scale: 1.1, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Shield className="w-8 h-8 text-primary" />
              </motion.div>
              <h4 className="text-xl font-bold text-white mb-2">Investigate</h4>
              <p className="text-gray-400">
                Our experts analyze and verify reported threats
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <motion.div 
                className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                whileHover={{ scale: 1.1, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Users className="w-8 h-8 text-primary" />
              </motion.div>
              <h4 className="text-xl font-bold text-white mb-2">Protect</h4>
              <p className="text-gray-400">
                Share verified threat intelligence with the community
              </p>
            </motion.div>
          </div>

          <div className="text-center mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors inline-flex items-center"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Launch Mithayadarpan
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.button>
          </div>
        </motion.div>

        <div className="overflow-x-auto pb-6 -mx-4 sm:mx-0 sm:overflow-x-visible">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 px-4 sm:px-0 min-w-max sm:min-w-0"
          >
            {platformFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover="hover"
                whileTap="tap"
                className="w-48 sm:w-auto glass-effect rounded-xl p-4 md:p-6 text-center cursor-pointer"
                role="article"
                aria-label={`${feature.label} Information`}
              >
                <motion.div
                  whileHover={{ scale: 1.1, y: -5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="text-primary mb-2 md:mb-4 flex justify-center"
                >
                  {feature.icon}
                </motion.div>
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2"
                >
                  {feature.value}
                </motion.div>
                <div className="text-sm md:text-lg font-semibold text-primary mb-1 md:mb-2">
                  {feature.label}
                </div>
                <p className="text-xs md:text-base text-gray-400 line-clamp-2">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-8 md:mt-16"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a
              href="https://tranquil-truffle-15401f.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center bg-primary text-dark-300 px-6 md:px-8 py-3 md:py-4 rounded-lg font-semibold text-base md:text-lg hover:bg-secondary transition-all duration-300"
              role="button"
              aria-label="Access CyberHx Learning Platform"
            >
              Start Learning
              <ArrowRight className="ml-2" />
            </motion.a>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center border-2 border-primary text-primary px-6 md:px-8 py-3 md:py-4 rounded-lg font-semibold text-base md:text-lg hover:bg-primary/10 transition-all duration-300"
              role="button"
              aria-label="Report a Scam"
            >
              Report Scam
              <AlertTriangle className="ml-2" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};