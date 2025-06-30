import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Code, Database, Cpu, ArrowRight, BookOpen, Star, Users, Shield, Search, Bone as Drone, Phone, Slice as Police } from 'lucide-react';

export const AIThemePage = () => {
  const problemStatements = [
    {
      id: 1,
      title: "AI Copilot for Secure DevOps",
      description: "Build an LLM-based assistant that reviews DevOps pipelines (CI/CD, IaC, Dockerfiles, GitHub Actions) and suggests security improvements automatically.",
      techStack: ["LangChain", "GitHub API", "Trivy", "OpenAI/Gemini API"],
      difficulty: "Advanced",
      impact: "DevSecOps",
      features: [
        "Pipeline analysis",
        "Security scanning",
        "Smart suggestions",
        "Auto-remediation"
      ]
    },
    {
      id: 2,
      title: "Drone + AI Border Security",
      description: "Build a system using drones and computer vision to detect unauthorized cross-border movement or smuggling activity in real-time.",
      techStack: ["YOLOv8", "DroneKit", "OpenCV", "Satellite APIs"],
      difficulty: "Expert",
      impact: "National Security",
      features: [
        "Night vision detection",
        "Real-time tracking",
        "Movement analysis",
        "Alert system"
      ]
    },
    {
      id: 3,
      title: "AI Scam Call Interceptor",
      description: "Create a smartphone app that uses AI to detect, analyze, and intercept scam calls, with real-time classification and user alerts.",
      techStack: ["Android/Kotlin", "Whisper API", "LLM Classification", "TensorFlow"],
      difficulty: "Advanced",
      impact: "Consumer Protection",
      features: [
        "Real-time detection",
        "Call transcription",
        "Pattern analysis",
        "User alerts"
      ]
    },
    {
      id: 4,
      title: "Crime Pattern Prediction",
      description: "Build a tool for law enforcement that uses historical data to predict crime hotspots and types for strategic deployment.",
      techStack: ["Geo AI", "Time-series ML", "D3.js", "Python"],
      difficulty: "Advanced",
      impact: "Law Enforcement",
      features: [
        "Hotspot mapping",
        "Pattern recognition",
        "Resource optimization",
        "Fair AI practices"
      ]
    },
    {
      id: 5,
      title: "Real-Time Autonomous Threat Hunter",
      description: "An AI-powered agent that autonomously monitors logs, telemetry data, and system/network behavior to detect suspicious activity.",
      techStack: ["ELK Stack", "OpenTelemetry", "LLaMA/GPT-J", "React/Streamlit"],
      difficulty: "Advanced",
      impact: "Enhanced Security",
      features: [
        "Real-time analysis",
        "AI-driven detection",
        "MITRE ATT&CK",
        "Auto-response"
      ]
    },
     {
      id: 6,
      title: "Real-Time Autonomous Threat Hunting Agent",
      description: "An AI-powered agent that autonomously monitors logs, telemetry data, and system/network behavior to detect suspicious activity and respond in real-time.",
      techStack: ["ELK Stack", "OpenTelemetry", "LLaMA/GPT-J", "React/Streamlit"],
      difficulty: "Advanced",
      impact: "Enhanced Security Operations",
      features: [
        "Real-time log and metrics analysis",
        "AI-driven pattern detection",
        "MITRE ATT&CK integration",
        "Automated response suggestions"
      ]
    },
    {
      id: 7,
      title: "Explainable AI for Intrusion Detection",
      description: "A machine learning-based IDS that detects threats and explains classifications using SHAP/LIME with a user-friendly interface.",
      techStack: ["Scikit-learn", "XGBoost", "SHAP", "LIME", "Streamlit"],
      difficulty: "Intermediate",
      impact: "Transparent Security",
      features: [
        "Trainable IDS with explanations",
        "Visual feature importance",
        "Real-time detection",
        "Interactive dashboard"
      ]
    },
    {
      id: 8,
      title: "Federated Learning Platform",
      description: "A collaborative ML training platform for privacy-preserving cybersecurity intelligence sharing.",
      techStack: ["PySyft", "PyTorch", "Flask", "Socket.io"],
      difficulty: "Advanced",
      impact: "Privacy-Preserving ML",
      features: [
        "Secure aggregation",
        "Differential privacy",
        "Encrypted updates",
        "Training visualization"
      ]
    },
    {
      id: 9,
      title: "AI-Driven Cyber Risk Quantification",
      description: "Predictive engine estimating financial impact of security threats based on vulnerabilities and business context.",
      techStack: ["Scikit-learn", "NetworkX", "Dash/Streamlit"],
      difficulty: "Intermediate",
      impact: "Risk Management",
      features: [
        "Financial impact prediction",
        "Risk visualization",
        "What-if analysis",
        "Asset prioritization"
      ]
    },
    {
      id: 10,
      title: "LLM-Powered Red Team Assistant",
      description: "AI assistant generating attack paths, payloads, and social engineering content using security-focused LLMs.",
      techStack: ["LLaMA 2/GPT-J", "MITRE ATT&CK", "Streamlit/React"],
      difficulty: "Advanced",
      impact: "Enhanced Red Teaming",
      features: [
        "Attack chain generation",
        "Custom payload creation",
        "Ethical guidelines",
        "Blue team evaluation"
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
            AI & Machine Learning Track
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Build intelligent solutions that can learn, predict, and enhance cybersecurity
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
                  {problem.id === 1 ? <Shield className="w-6 h-6 text-primary" /> :
                   problem.id === 2 ? <Drone className="w-6 h-6 text-primary" /> :
                   problem.id === 3 ? <Phone className="w-6 h-6 text-primary" /> :
                   problem.id === 4 ? <Police className="w-6 h-6 text-primary" /> :
                   <Brain className="w-6 h-6 text-primary" />}
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
                    <Code className="w-4 h-4 text-primary" />
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
            Start Your AI Journey
            <ArrowRight className="ml-2" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};