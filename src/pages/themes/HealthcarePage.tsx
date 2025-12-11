import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Brain, Lock, ArrowRight, Code, Star, Users, Target } from 'lucide-react';

export const HealthcarePage = () => {
  const problemStatements = [
    {
      id: 1,
      title: "Privacy-Preserving Health Analytics",
      description: "Enable multiple hospitals to collaboratively compute analytics over encrypted patient data using homomorphic encryption.",
      icon: <Lock className="w-6 h-6" />,
      color: "#00ff41",
      techStack: ["Microsoft SEAL", "PySEAL", "Python", "Flask"],
      features: [
        "Encrypted data sharing",
        "Secure computations",
        "Privacy preservation",
        "Differential privacy"
      ],
      difficulty: "Advanced",
      impact: "Healthcare Privacy",
      points: 100
    },
    {
      id: 2,
      title: "AI-Powered Early Diagnosis",
      description: "ML-based system monitoring real-time wearable data to detect early signs of cardiac or neurological anomalies.",
      icon: <Brain className="w-6 h-6" />,
      color: "#0ff",
      techStack: ["TensorFlow", "PyTorch", "LSTM", "React Native"],
      features: [
        "Time-series analysis",
        "Anomaly detection",
        "Real-time monitoring",
        "Alert system"
      ],
      difficulty: "Advanced",
      impact: "Early Detection",
      points: 100
    },
    {
      id: 3,
      title: "Secure Medical Image Sharing",
      description: "Blockchain-based medical imaging system with watermarking for authenticity and integrity verification.",
      icon: <Shield className="w-6 h-6" />,
      color: "#ff3e3e",
      techStack: ["Ethereum", "IPFS", "DICOM", "React"],
      features: [
        "Blockchain verification",
        "Image watermarking",
        "Integrity checks",
        "Access control"
      ],
      difficulty: "Advanced",
      impact: "Data Integrity",
      points: 100
    }
  ];

  const benefits = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Real Impact",
      description: "Build solutions that directly improve patient care and healthcare delivery"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Security Focus",
      description: "Learn and implement critical healthcare data security practices"
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Innovation",
      description: "Combine cutting-edge tech with healthcare domain knowledge"
    }
  ];

  return (
    <div className="min-h-screen bg-dark-300 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium"
          >
            Healthcare Innovation Track
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold gradient-text mb-4"
          >
            Healthcare Innovations
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Build secure and innovative solutions for the healthcare industry
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-xl p-6 text-center hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center text-primary">
                {benefit.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
              <p className="text-gray-400">{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white text-center mb-8"
          >
            Problem Statements
          </motion.h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {problemStatements.map((problem, index) => (
              <motion.div
                key={problem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-effect rounded-xl p-6 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-4">
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
                          <Star className="w-4 h-4 text-primary mr-2" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm text-gray-300">{problem.points} Points</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-primary" />
                      <span className="text-sm text-gray-300">{problem.difficulty}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

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

export default HealthcarePage;