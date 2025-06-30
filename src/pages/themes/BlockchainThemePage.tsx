import React from 'react';
import { motion } from 'framer-motion';
import { Blocks, Code, Shield, ArrowRight, Wallet, Database, Link } from 'lucide-react';

export const BlockchainThemePage = () => {
  const problemStatements = [
    {
      id: 1,
      title: "Blockchain for Digital Evidence Chain-of-Custody",
      description: "Develop a blockchain-based system to store the chain-of-custody records for digital evidence in cybercrime investigations.",
      techStack: ["Hyperledger", "IPFS", "QR Code", "React"],
      difficulty: "Advanced",
      impact: "Legal Tech",
      features: [
        "Legal admissibility",
        "Immutable logs",
        "Metadata tracking",
        "Evidence verification"
      ]
    },
    {
      id: 2,
      title: "Smart Contract Auditing AI",
      description: "AI-powered tool for detecting vulnerabilities in Solidity smart contracts using AST analysis and LLM reasoning.",
      techStack: ["Python", "GPT-3.5", "Solidity", "Streamlit"],
      difficulty: "Advanced",
      impact: "Security",
      features: [
        "Vulnerability detection",
        "GPT-based explanations",
        "Risk assessment",
        "Code fixes"
      ]
    },
    {
      id: 3,
      title: "Blockchain-Integrated SIEM System",
      description: "Enhance log integrity by hashing and anchoring SIEM logs onto a blockchain for forensic traceability.",
      techStack: ["Ethereum", "ELK Stack", "Web3.py", "React"],
      difficulty: "Intermediate",
      impact: "Security Ops",
      features: [
        "Real-time log hashing",
        "On-chain timestamping",
        "Log verification",
        "Tamper detection"
      ]
    },
    {
      id: 4,
      title: "Decentralized Voting System",
      description: "Secure e-voting system with anonymity, double-vote prevention, and auditable results using zkRollups.",
      techStack: ["zkSync", "Solidity", "React", "ElGamal"],
      difficulty: "Advanced",
      impact: "Governance",
      features: [
        "Anonymous voting",
        "ZKP verification",
        "Transparent counting",
        "Vote proofs"
      ]
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
            Blockchain Development Track
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Build innovative decentralized solutions using blockchain technology
          </motion.p>
        </div>

        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16"
        >
          {problemStatements.map((problem) => (
            <motion.div
              key={problem.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className="glass-effect rounded-xl p-6 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Blocks className="w-6 h-6 text-primary" />
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
                        <Shield className="w-4 h-4 text-primary mr-2" />
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
                    <Wallet className="w-4 h-4 text-primary" />
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
            Start Building on Blockchain
            <ArrowRight className="ml-2" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};