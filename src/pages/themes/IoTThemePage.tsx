import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Shield, Code, Brain, ArrowRight, Zap, Lock, Radio, Network } from 'lucide-react';

export const IoTThemePage = () => {
  const problemStatements = [
    {
      id: 1,
      title: "IoT Honeypot Network",
      description: "Build a deceptive network of simulated smart devices that log attack attempts and identify emerging threats.",
      icon: <Shield className="w-6 h-6" />,
      color: "#00ff41",
      techStack: ["ESP32/Raspberry Pi", "Wireshark/Tshark", "InfluxDB", "Grafana"],
      features: [
        "Device emulation",
        "Traffic monitoring",
        "Attack logging",
        "Real-time visualization"
      ],
      difficulty: "Advanced",
      impact: "Network Security"
    },
    {
      id: 2,
      title: "Secure OTA Update Framework",
      description: "AI-powered secure Over-The-Air update system with blockchain verification and anomaly detection.",
      icon: <Radio className="w-6 h-6" />,
      color: "#0ff",
      techStack: ["MQTT/CoAP", "Hyperledger", "ESP32", "TensorFlow Lite"],
      features: [
        "Blockchain verification",
        "Hash validation",
        "Anomaly detection",
        "Automatic rollback"
      ],
      difficulty: "Expert",
      impact: "Device Security"
    },
    {
      id: 3,
      title: "Rogue Device Detection",
      description: "AI-based system to detect unauthorized IoT devices using network signatures and signal triangulation.",
      icon: <Network className="w-6 h-6" />,
      color: "#ff3e3e",
      techStack: ["Wi-Fi scanning", "RSSI triangulation", "DBSCAN", "Flask/D3.js"],
      features: [
        "Device discovery",
        "Position tracking",
        "Behavior analysis",
        "Threat scoring"
      ],
      difficulty: "Advanced",
      impact: "Threat Detection"
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
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold gradient-text mb-4"
          >
            IoT + Cybersecurity Track
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Build secure and innovative IoT solutions that protect smart environments
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
                        <Lock className="w-4 h-4 text-primary mr-2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-300">{problem.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
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
          className="glass-effect rounded-xl p-8 text-center"
        >
          <Code className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Implementation Guide</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Each solution includes detailed documentation, starter code, and step-by-step tutorials
            to help you build secure IoT systems.
          </p>
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