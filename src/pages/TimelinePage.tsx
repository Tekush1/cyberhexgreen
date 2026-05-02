import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Terminal, Code, Trophy, Target, Users, Calendar, ArrowRight, Zap, GamepadIcon, BookOpen, Award, Cpu, Lock } from 'lucide-react';

export const TimelinePage = () => {
  const events = [
    {
      phase: "Phase 1",
      date: "July 2025",
      icon: <Shield className="w-6 h-6" />,
      title: "CTF Platform Launch",
      description: "Interactive Capture The Flag challenges",
      color: "#00ff41",
      details: [
        "Web security challenges",
        "Cryptography puzzles",
        "Network forensics labs",
        "Real-time leaderboards"
      ]
    },
    {
      phase: "Phase 2",
      date: "October 2025",
      icon: <Terminal className="w-6 h-6" />,
      title: "Virtual Labs Environment",
      description: "Hands-on cybersecurity practice labs",
      color: "#0ff",
      details: [
        "Penetration testing labs",
        "Malware analysis sandbox",
        "Network simulation",
        "Incident response scenarios"
      ]
    },
    {
      phase: "Phase 3",
      date: "November 2025",
      icon: <BookOpen className="w-6 h-6" />,
      title: "Learning Pathways",
      description: "Structured cybersecurity courses",
      color: "#ff3e3e",
      details: [
        "Beginner to advanced tracks",
        "Industry certifications prep",
        "Interactive tutorials",
        "Progress tracking system"
      ]
    },
    {
      phase: "Phase 4",
      date: "April 2026",
      icon: <Trophy className="w-6 h-6" />,
      title: "Community Features",
      description: "Connect with fellow security enthusiasts",
      color: "#ffd700",
      details: [
        "Discussion forums",
        "Team challenges",
        "Mentorship program",
        "Achievement badges"
      ]
    },
    {
      phase: "Phase 5",
      date: "May 2026",
      icon: <Cpu className="w-6 h-6" />,
      title: "AI-Powered Learning",
      description: "Personalized learning with AI assistance",
      color: "#9B59B6",
      details: [
        "Adaptive learning paths",
        "AI tutoring system",
        "Vulnerability assessment tools",
        "Smart recommendations"
      ]
    },
    {
      phase: "Final Launch",
      date: "June 2026",
      icon: <Lock className="w-6 h-6" />,
      title: "Full Platform Release",
      description: "Complete cybersecurity learning ecosystem",
      color: "#FF6B6B",
      details: [
        "Mobile app launch",
        "Enterprise features",
        "Industry partnerships",
        "Global competitions"
      ]
    }
  ];

  const features = [
    {
      icon: <GamepadIcon className="w-8 h-8" />,
      title: "Interactive CTF Games",
      description: "Gamified learning with real-world scenarios",
      color: "#00ff41"
    },
    {
      icon: <Terminal className="w-8 h-8" />,
      title: "Virtual Hacking Labs",
      description: "Safe environment to practice ethical hacking",
      color: "#0ff"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Certification Prep",
      description: "Prepare for industry-standard certifications",
      color: "#ffd700"
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
            CyberHx Learning Platform Roadmap
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400"
          >
            Your journey to cybersecurity mastery starts here
          </motion.p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-xl p-6 text-center hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              <motion.div
                className="text-primary mb-4 flex justify-center"
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
                {feature.icon}
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="relative">
          {/* Vertical timeline line */}
          <div className="hidden lg:block absolute left-1/2 top-0 w-px h-full">
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-primary via-primary to-transparent"
              animate={{
                opacity: [0.2, 1, 0.2],
                boxShadow: [
                  '0 0 10px #00ff41',
                  '0 0 20px #00ff41',
                  '0 0 10px #00ff41'
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          <div className="space-y-24">
            {events.map((event, index) => (
              <div key={event.phase} className="relative">
                <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                  {/* Left Content */}
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`glass-effect rounded-xl p-8 ${
                      index % 2 === 0 ? 'lg:mr-8' : 'lg:order-2 lg:ml-8'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <motion.div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${event.color}20` }}
                        whileHover={{
                          scale: 1.1,
                          boxShadow: `0 0 20px ${event.color}60`
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 15
                        }}
                      >
                        {event.icon}
                      </motion.div>
                      <div>
                        <motion.span
                          className="text-sm font-medium px-3 py-1 rounded-full"
                          style={{
                            backgroundColor: `${event.color}20`,
                            color: event.color
                          }}
                        >
                          {event.phase}
                        </motion.span>
                        <h3 className="text-xl font-bold text-white mt-2 mb-2">{event.title}</h3>
                        <p className="text-gray-400 mb-4">{event.description}</p>
                        <div className="space-y-2">
                          {event.details.map((detail, i) => (
                            <div key={i} className="flex items-center text-gray-300">
                              <Target className="w-4 h-4 text-primary mr-2" />
                              <span>{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Timeline Node */}
                  <div className="hidden lg:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                      className="w-8 h-8 rounded-full relative"
                      style={{ backgroundColor: event.color }}
                      animate={{
                        scale: [1, 1.2, 1],
                        boxShadow: [
                          `0 0 10px ${event.color}`,
                          `0 0 20px ${event.color}`,
                          `0 0 10px ${event.color}`
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <motion.div
                        className="absolute -inset-2 rounded-full"
                        style={{ backgroundColor: event.color }}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.2, 0, 0.2]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </motion.div>
                  </div>

                  {/* Right Content - Date */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`mt-8 lg:mt-0 ${
                      index % 2 === 0 ? 'lg:order-2' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center lg:justify-start h-full">
                      <div className="glass-effect rounded-xl p-6 text-center lg:text-left">
                        <motion.div
                          whileHover={{ scale: 1.1, y: -5 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Calendar className="w-8 h-8 text-primary mx-auto lg:mx-0 mb-4" />
                        </motion.div>
                        <motion.div
                          className="text-2xl font-bold text-white"
                          animate={{
                            textShadow: [
                              `0 0 5px ${event.color}`,
                              `0 0 10px ${event.color}`,
                              `0 0 5px ${event.color}`
                            ]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          {event.date}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-effect rounded-xl p-6 text-center"
          >
            <motion.div
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <GamepadIcon className="w-8 h-8 text-primary mx-auto mb-4" />
            </motion.div>
            <motion.h3
              className="text-2xl font-bold text-white mb-2"
              animate={{
                textShadow: [
                  '0 0 5px #00ff41',
                  '0 0 10px #00ff41',
                  '0 0 5px #00ff41'
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              50+
            </motion.h3>
            <p className="text-gray-400">CTF Challenges</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-effect rounded-xl p-6 text-center"
          >
            <motion.div
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Terminal className="w-8 h-8 text-primary mx-auto mb-4" />
            </motion.div>
            <motion.h3
              className="text-2xl font-bold text-white mb-2"
              animate={{
                textShadow: [
                  '0 0 5px #0ff',
                  '0 0 10px #0ff',
                  '0 0 5px #0ff'
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              20+
            </motion.h3>
            <p className="text-gray-400">Virtual Labs</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="glass-effect rounded-xl p-6 text-center"
          >
            <motion.div
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <BookOpen className="w-8 h-8 text-primary mx-auto mb-4" />
            </motion.div>
            <motion.h3
              className="text-2xl font-bold text-white mb-2"
              animate={{
                textShadow: [
                  '0 0 5px #ffd700',
                  '0 0 10px #ffd700',
                  '0 0 5px #ffd700'
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
            100+
            </motion.h3>
            <p className="text-gray-400">Learning Modules</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="glass-effect rounded-xl p-6 text-center"
          >
            <motion.div
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Users className="w-8 h-8 text-primary mx-auto mb-4" />
            </motion.div>
            <motion.h3
              className="text-2xl font-bold text-white mb-2"
              animate={{
                textShadow: [
                  '0 0 5px #FF6B6B',
                  '0 0 10px #FF6B6B',
                  '0 0 5px #FF6B6B'
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              1000+
            </motion.h3>
            <p className="text-gray-400">Community Members</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 text-center"
        >
          <div className="glass-effect rounded-xl p-8 mb-8">
            <motion.div
              whileHover={{ scale: 1.1, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-4">Join the CyberHx Learning Revolution</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-6">
              Be part of the next generation of cybersecurity professionals. Our platform combines 
              gamification, hands-on labs, and expert mentorship to accelerate your learning journey.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://zippy-blancmange-264ab5.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors"
            >
              Access Learning Platform
              <ArrowRight className="ml-2" />
            </a>
            
            <a
              href="https://chat.whatsapp.com/IdUQPN7FGTb7MYZHnJzlwq"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors"
            >
              Join Community
              <Users className="ml-2" />
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TimelinePage;