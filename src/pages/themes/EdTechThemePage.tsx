import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Code, Shield, BookOpen, ArrowRight, Target, Star, Users, Eye, FileCode, Database } from 'lucide-react';

export const EdTechThemePage = () => {
  const problemStatements = [
    {
      id: 1,
      title: "AI-Powered Code Evaluation System",
      description: "Build a comprehensive proctoring and code evaluation platform that combines plagiarism detection with behavioral monitoring.",
      icon: <Eye className="w-6 h-6" />,
      color: "#00ff41",
      techStack: ["OpenCV", "GPT-4", "MOSS", "WebRTC", "React"],
      features: [
        "Code plagiarism detection",
        "Behavioral monitoring",
        "Auto-grading",
        "Real-time proctoring"
      ],
      difficulty: "Advanced",
      impact: "Academic Integrity"
    },
    {
      id: 2,
      title: "Smart Adaptive Learning Paths",
      description: "Create an AI-driven adaptive learning system using knowledge graphs and reinforcement learning for personalized education.",
      icon: <Brain className="w-6 h-6" />,
      color: "#0ff",
      techStack: ["Neo4j", "TensorFlow", "React", "Node.js"],
      features: [
        "Knowledge graphs",
        "RL-based paths",
        "Progress tracking",
        "Mastery analysis"
      ],
      difficulty: "Advanced",
      impact: "Personalized Learning"
    },
    {
      id: 3,
      title: "Deepfake Threat Training Platform",
      description: "Develop a cybersecurity training platform using AI-generated content to simulate and educate about modern digital threats.",
      icon: <Shield className="w-6 h-6" />,
      color: "#ff3e3e",
      techStack: ["DeepFaceLab", "PyTorch", "GPT", "React"],
      features: [
        "Deepfake generation",
        "Phishing simulation",
        "Behavior tracking",
        "Security training"
      ],
      difficulty: "Expert",
      impact: "Security Education"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold gradient-text mb-4"
          >
            Educational Technology Track
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Transform education through innovative technology solutions
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16"
        >
          {problemStatements.map((problem) => (
            <motion.div
              key={problem.id}
              variants={itemVariants}
              className="glass-effect rounded-xl p-6 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-6">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${problem.color}20` }}
                >
                  {problem.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{problem.title}</h3>
                  <p className="text-gray-400">{problem.description}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {problem.techStack.map((tech, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">Key Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {problem.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center text-gray-300 text-sm"
                      >
                        <Star className="w-4 h-4 text-primary mr-2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-300">{problem.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-300">{problem.impact}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
            Start Building
            <ArrowRight className="ml-2" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default EdTechThemePage;