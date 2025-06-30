import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Terminal, Code, Lock, ArrowRight, BookOpen, Star, Users } from 'lucide-react';

export const CybersecurityThemePage = () => {
  const problemStatements = [
    {
      id: 1,
      title: "Autonomous AI Red Team vs. Blue Team Simulator",
      description: "Develop an AI-powered cybersecurity battleground where Red Team (offensive AI) and Blue Team (defensive AI) agents compete in a sandboxed enterprise environment, evolving strategies in real time.",
      techStack: ["OpenAI Gym", "Docker", "Network Emulation", "MITRE ATT&CK"],
      difficulty: "Advanced",
      impact: "Training",
      features: [
        "Realistic simulations",
        "Adaptive AI behaviors",
        "Strategy evolution",
        "Performance analytics"
      ]
    },
    {
      id: 2,
      title: "National-Level Cyber Threat Heatmap",
      description: "Create a real-time cybersecurity threat map of India showing geotagged attack vectors using real or simulated honeypot data.",
      techStack: ["ElasticSearch", "Kibana", "GeoIP", "Kafka"],
      difficulty: "Advanced",
      impact: "Threat Intel",
      features: [
        "Stream ingestion",
        "Anomaly clustering",
        "Visual analytics",
        "Real-time updates"
      ]
    },
    {
      id: 3,
      title: "Zero Trust Network Architecture Simulator",
      description: "A full-stack interactive simulator modeling Zero Trust principles with microsegmentation and continuous identity verification.",
      techStack: ["Node.js/Python", "Kubernetes", "Docker", "React.js"],
      difficulty: "Advanced",
      impact: "Enterprise Security",
      features: [
        "Visualized Zero Trust zones",
        "Role-based access control",
        "AI-driven risk scoring",
        "Real-time policy enforcement"
      ]
    },
    {
      id: 4,
      title: "AI-Based Malware Reverse Engineering Toolkit",
      description: "Toolkit automating malware binary decompilation and classification using AI for faster analysis.",
      techStack: ["Python", "Ghidra", "ML/AI", "Electron"],
      difficulty: "Advanced",
      impact: "Threat Analysis",
      features: [
        "Auto-decompilation",
        "IOC extraction",
        "ML classification",
        "Damage prediction"
      ]
    },
    {
      id: 5,
      title: "Decentralized Threat Intelligence Platform",
      description: "P2P platform for sharing verified IOCs securely using blockchain for integrity.",
      techStack: ["Ethereum", "IPFS", "React.js", "Node.js"],
      difficulty: "Intermediate",
      impact: "Threat Sharing",
      features: [
        "Verified threat reports",
        "Community trust scores",
        "IPFS storage",
        "Smart contracts"
      ]
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
            Cybersecurity Track
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Build cutting-edge solutions to protect digital assets and infrastructure
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16"
        >
          {problemStatements.map((problem) => (
            <motion.div
              key={problem.id}
              variants={itemVariants}
              className="glass-effect rounded-xl p-6 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{problem.title}</h3>
                  <p className="text-gray-400">{problem.description}</p>
                </div>
              </div>

              <div className="space-y-4">
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
                        <Lock className="w-4 h-4 text-primary mr-2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-300">{problem.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
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
            Start Your Security Journey
            <ArrowRight className="ml-2" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};