import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Target, AlertTriangle, Users, BookOpen, Eye, Lock, Zap } from 'lucide-react';

export const TimelineSection = () => {
  const successStories = [
    {
      year: "2024",
      stories: [
        {
          name: "CyberHx Platform",
          role: "Cybersecurity Learning Hub",
          achievement: "Comprehensive Security Education Platform",
          image: "https://i.ibb.co/rGV3M8yf/Whats-App-Image-2025-06-30-at-1-03-39-AM.jpg",
          description: "Advanced cybersecurity learning platform with interactive CTF challenges, virtual labs, and expert-led courses designed to train the next generation of security professionals.",
          technologies: ["Interactive CTFs", "Virtual Labs", "AI-Powered Learning"],
          impact: "10,000+ students trained in cybersecurity fundamentals"
        },
        {
          name: "Mithayadarpan",
          role: "Scam Detection & Reporting Tool",
          achievement: "Advanced Fraud Detection System",
          image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
          description: "Sophisticated tool that empowers users to report fake accounts and scams. Our expert team investigates reports and helps protect the digital community from fraudulent activities.",
          technologies: ["AI Detection", "Real-time Analysis", "Community Reporting"],
          impact: "5,000+ scams detected and prevented, protecting thousands of users"
        }
      ]
    }
  ];

  const platformFeatures = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Advanced Security Training",
      description: "Comprehensive courses covering ethical hacking, penetration testing, and digital forensics",
      color: "#00ff41"
    },
    {
      icon: <AlertTriangle className="w-8 h-8" />,
      title: "Real-time Scam Detection",
      description: "AI-powered system to identify and report fraudulent activities instantly",
      color: "#ff3e3e"
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "Community Protection",
      description: "Collaborative platform where users help protect each other from digital threats",
      color: "#0ff"
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Expert Knowledge Base",
      description: "Curated content from cybersecurity professionals and industry experts",
      color: "#ffd700"
    }
  ];

  return (
    <div className="py-24 bg-dark-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold gradient-text mb-4">
            Our Digital Protection Ecosystem
          </h2>
          <p className="text-xl text-gray-400">
            Building a safer digital world through education and community-driven security
          </p>
        </motion.div>

        {/* Platform Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {platformFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-xl p-6 text-center hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              <motion.div
                className="text-primary mb-4 flex justify-center"
                whileHover={{ scale: 1.1, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
                style={{ color: feature.color }}
              >
                {feature.icon}
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="relative">
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-primary via-primary to-transparent" />

          <div className="space-y-16 md:space-y-24">
            {successStories.map((yearGroup, yearIndex) => (
              <div key={yearGroup.year} className="relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="relative md:absolute md:left-1/2 md:transform md:-translate-x-1/2 md:-top-8 mb-8 md:mb-0 text-center"
                >
                  <div className="inline-block bg-primary text-dark-300 px-6 py-2 rounded-full font-bold text-lg">
                    {yearGroup.year}
                  </div>
                </motion.div>

                <div className="space-y-8 md:space-y-16">
                  {yearGroup.stories.map((story, storyIndex) => (
                    <motion.div
                      key={story.name}
                      initial={{ opacity: 0, y: 20, x: 0 }}
                      whileInView={{ opacity: 1, y: 0, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: storyIndex * 0.2 }}
                      className={`flex flex-col md:flex-row items-center gap-4 md:gap-8 ${
                        storyIndex % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                      }`}
                    >
                      <div className="w-full md:w-[calc(50%-2rem)]">
                        <div className="glass-effect rounded-xl p-4 md:p-6 hover-scale">
                          <div className="flex items-center gap-4 mb-4">
                            <img
                              src={story.image}
                              alt={story.name}
                              className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-primary"
                            />
                            <div>
                              <h3 className="text-lg md:text-xl font-bold text-white">{story.name}</h3>
                              <p className="text-sm md:text-base text-primary">{story.role}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                              <p className="text-sm md:text-base text-white font-medium">{story.achievement}</p>
                            </div>
                            
                            <p className="text-sm md:text-base text-gray-400">{story.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mt-2 md:mt-3">
                              {story.technologies.map((tech, index) => (
                                <span
                                  key={index}
                                  className="bg-primary/10 text-primary px-2 md:px-3 py-1 rounded-full text-xs md:text-sm"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-3 md:mt-4">
                              <Target className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                              <p className="text-sm md:text-base text-gray-300">{story.impact}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:block w-6 h-6 bg-primary rounded-full relative">
                        <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-25" />
                      </div>

                      <div className="hidden md:block w-[calc(50%-2rem)]" />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="glass-effect rounded-xl p-8 mb-8">
            <motion.div
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-4">Join the Digital Protection Movement</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-6">
              Be part of a community that's actively making the digital world safer. Learn cybersecurity, 
              report scams, and help protect millions of users from digital threats.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://tranquil-truffle-15401f.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors"
            >
              Start Learning
              <BookOpen className="ml-2" />
            </a>
            
            <button className="inline-flex items-center border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors">
              Report Scam
              <AlertTriangle className="ml-2" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};