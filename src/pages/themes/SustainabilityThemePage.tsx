import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Recycle, Wind, Zap, ArrowRight, TreePine, Droplets } from 'lucide-react';

export const SustainabilityThemePage = () => {
  const initiatives = [
    {
      title: "Green Energy Solutions",
      description: "Develop applications for renewable energy management",
      icon: <Zap className="w-6 h-6" />,
      areas: ["Solar Power", "Wind Energy", "Energy Storage"]
    },
    {
      title: "Waste Management",
      description: "Create systems for efficient waste tracking and recycling",
      icon: <Recycle className="w-6 h-6" />,
      areas: ["Recycling", "Composting", "Zero Waste"]
    },
    {
      title: "Environmental Monitoring",
      description: "Build solutions for tracking environmental metrics",
      icon: <Wind className="w-6 h-6" />,
      areas: ["Air Quality", "Water Quality", "Emissions"]
    }
  ];

  const projectIdeas = [
    {
      title: "Smart Recycling Assistant",
      description: "AI-powered app for proper waste sorting and recycling guidance",
      difficulty: "Intermediate",
      techStack: ["TensorFlow", "React Native", "Node.js", "MongoDB"]
    },
    {
      title: "Carbon Footprint Tracker",
      description: "Personal and enterprise carbon emission monitoring system",
      difficulty: "Advanced",
      techStack: ["React", "Python", "PostgreSQL", "Data Visualization"]
    },
    {
      title: "Green Energy Marketplace",
      description: "Platform connecting renewable energy producers with consumers",
      difficulty: "Advanced",
      techStack: ["Next.js", "Blockchain", "Smart Contracts", "APIs"]
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
            Sustainability & Green Tech Track
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400"
          >
            Build technology solutions for a sustainable future
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-effect rounded-xl p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Leaf className="w-6 h-6 text-primary mr-2" />
              Key Focus Areas
            </h2>
            <div className="space-y-6">
              {initiatives.map((initiative, index) => (
                <motion.div
                  key={initiative.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start"
                >
                  <div className="bg-primary/10 p-2 rounded-lg mr-4">
                    {initiative.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{initiative.title}</h3>
                    <p className="text-gray-400 mb-2">{initiative.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {initiative.areas.map((area, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-effect rounded-xl p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <TreePine className="w-6 h-6 text-primary mr-2" />
              Environmental Impact
            </h2>
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <Droplets className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Resource Conservation</h3>
                  <p className="text-gray-400">Develop solutions that optimize resource usage</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <Wind className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Clean Energy</h3>
                  <p className="text-gray-400">Promote renewable energy adoption</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <Recycle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Circular Economy</h3>
                  <p className="text-gray-400">Enable sustainable consumption patterns</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Project Ideas</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {projectIdeas.map((project, index) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-effect rounded-xl p-6 hover-scale"
              >
                <h3 className="text-xl font-semibold text-white mb-2">{project.title}</h3>
                <p className="text-gray-400 mb-4">{project.description}</p>
                <div className="space-y-3">
                  <div className="text-primary text-sm">{project.difficulty}</div>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map((tech, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <a
            href="https://unstop.com/o/qRej6iS?lb=OsFfmSw"
            className="inline-flex items-center bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors"
          >
            Start Your Green Tech Journey
            <ArrowRight className="ml-2" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};