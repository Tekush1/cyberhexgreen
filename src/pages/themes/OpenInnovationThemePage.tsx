import React from 'react';
import { Sparkles, Lightbulb, Rocket, Target, Brain, Code, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const OpenInnovationThemePage = () => {
  const innovations = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Emerging Technologies",
      description: "Explore cutting-edge tech like quantum computing, biotechnology, or space tech",
      examples: ["Quantum Algorithms", "Bio-informatics", "Space Applications"]
    },
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Cross-Domain Solutions",
      description: "Combine different technologies to create innovative solutions",
      examples: ["AI + Healthcare", "Blockchain + Sustainability", "IoT + Agriculture"]
    },
    {
      icon: <Lightbulb className="w-8 h-8" />,
      title: "Experimental Projects",
      description: "Push boundaries with experimental and unconventional approaches",
      examples: ["Novel Interfaces", "Alternative Computing", "Creative Tech"]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-dark-300 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Open Innovation Track
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Break boundaries and explore uncharted territories in technology
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          {innovations.map((innovation, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="glass-effect rounded-xl p-8 hover-scale"
            >
              <div className="text-primary mb-6">{innovation.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3">{innovation.title}</h3>
              <p className="text-gray-400 mb-6">{innovation.description}</p>
              <div className="space-y-2">
                {innovation.examples.map((example, i) => (
                  <div key={i} className="flex items-center text-gray-300">
                    <Target className="w-4 h-4 text-primary mr-2" />
                    <span>{example}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-xl p-8 mb-16"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Sparkles className="w-6 h-6 text-primary mr-2" />
            Why Choose This Track?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <Code className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Complete Freedom</h3>
                  <p className="text-gray-400">Choose any technology stack or approach</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <Share2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Cross-pollination</h3>
                  <p className="text-gray-400">Combine different domains and technologies</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <Rocket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Future-focused</h3>
                  <p className="text-gray-400">Work on next-generation technologies</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Creative Freedom</h3>
                  <p className="text-gray-400">No limitations on your imagination</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="glass-effect rounded-xl p-8 inline-block">
            <Lightbulb className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Innovate?</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              This track is perfect for those who want to push the boundaries of what's possible
              and create truly groundbreaking solutions.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};