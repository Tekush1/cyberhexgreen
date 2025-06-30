import React from 'react';
import { Trophy, Gift, Briefcase, Award, Star, Users, Rocket, Medal, Shield, Terminal, BookOpen, Zap, Lock, GamepadIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface Prize {
  title: string;
  amount: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
}

export const PrizesPage = () => {
  const prizes: Prize[] = [
    {
      title: "Cyber Champion",
      amount: "₹10,000",
      description: "For the most innovative cybersecurity solution",
      icon: <Shield className="w-12 h-12" />,
      benefits: [
        "Free CyberHx Pro membership (1 year)",
        "Direct mentorship from security experts",
        "Featured showcase on platform",
        "Industry internship opportunity"
      ]
    },
    {
      title: "Security Specialist",
      amount: "₹5,000",
      description: "For exceptional technical implementation",
      icon: <Lock className="w-12 h-12" />,
      benefits: [
        "CyberHx Premium access (6 months)",
        "Advanced CTF challenges unlock",
        "Priority lab environment access",
        "Certificate of excellence"
      ]
    },
    {
      title: "Ethical Hacker",
      amount: "₹3,000",
      description: "For outstanding penetration testing skills",
      icon: <Terminal className="w-12 h-12" />,
      benefits: [
        "CyberHx Standard access (3 months)",
        "Exclusive hacking workshops",
        "Security tools and resources",
        "Community recognition badge"
      ]
    }
  ];

  const specialAwards = [
    {
      title: "Best CTF Solution",
      icon: <GamepadIcon className="w-6 h-6" />,
      prize: "CyberHx Lifetime Access",
      description: "Most creative capture-the-flag implementation"
    },
    {
      title: "Innovation in Security",
      icon: <Rocket className="w-6 h-6" />,
      prize: "Security Toolkit Bundle",
      description: "Revolutionary approach to cybersecurity"
    },
    {
      title: "Community Choice",
      icon: <Users className="w-6 h-6" />,
      prize: "Mentorship Program",
      description: "Most voted project by the community"
    },
    {
      title: "Best Learning Tool",
      icon: <BookOpen className="w-6 h-6" />,
      prize: "Educational Partnership",
      description: "Outstanding contribution to cybersecurity education"
    }
  ];

  const learningBenefits = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "CyberHx Platform Access",
      description: "Exclusive access to our comprehensive cybersecurity learning platform",
      features: ["50+ CTF Challenges", "20+ Virtual Labs", "100+ Learning Modules", "AI-Powered Tutoring"]
    },
    {
      icon: <Terminal className="w-8 h-8" />,
      title: "Hands-on Experience",
      description: "Real-world cybersecurity scenarios and practical training",
      features: ["Penetration Testing Labs", "Malware Analysis", "Network Forensics", "Incident Response"]
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Industry Recognition",
      description: "Certificates and credentials recognized by top cybersecurity firms",
      features: ["Industry Certifications", "Skill Badges", "Portfolio Building", "Career Guidance"]
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
            CyberHx Rewards & Recognition
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400"
          >
            Compete for exclusive cybersecurity learning opportunities and cash prizes
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {prizes.map((prize, index) => (
            <motion.div
              key={prize.title}
              variants={itemVariants}
              className="glass-effect rounded-xl overflow-hidden hover-scale"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <motion.div 
                    className="text-primary"
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
                    {prize.icon}
                  </motion.div>
                  <motion.div 
                    className="text-2xl font-bold text-primary"
                    animate={{
                      textShadow: [
                        '0 0 5px #00ff41',
                        '0 0 15px #00ff41',
                        '0 0 5px #00ff41'
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {prize.amount}
                  </motion.div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{prize.title}</h3>
                <p className="text-gray-400 mb-6">{prize.description}</p>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white">Exclusive Benefits:</h4>
                  {prize.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center text-gray-300">
                      <Zap className="w-4 h-4 text-primary mr-2" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Special Recognition Awards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {specialAwards.map((award, index) => (
              <motion.div
                key={award.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-effect rounded-xl p-6 text-center hover:bg-dark-100 transition-colors"
              >
                <motion.div 
                  className="text-primary mb-4 flex justify-center"
                  whileHover={{ 
                    scale: 1.2,
                    y: -5
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 10
                  }}
                >
                  {award.icon}
                </motion.div>
                <h3 className="text-lg font-medium text-white mb-2">{award.title}</h3>
                <p className="text-primary font-semibold mb-2">{award.prize}</p>
                <p className="text-gray-400 text-sm">{award.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CyberHx Learning Benefits */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">CyberHx Learning Platform Benefits</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {learningBenefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="glass-effect rounded-xl p-6"
              >
                <motion.div 
                  className="text-primary mb-4"
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
                  {benefit.icon}
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                <p className="text-gray-400 mb-4">{benefit.description}</p>
                <div className="space-y-2">
                  {benefit.features.map((feature, i) => (
                    <div key={i} className="flex items-center text-gray-300">
                      <Star className="w-4 h-4 text-primary mr-2" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-xl p-8 text-center"
        >
          <motion.div
            whileHover={{ 
              scale: 1.1,
              y: -10
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            <Briefcase className="w-12 h-12 text-primary mx-auto mb-6" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-4">Career Advancement Opportunities</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-6">
            Top performers will receive exclusive access to our industry partner network, 
            including internship opportunities at leading cybersecurity firms and direct 
            pathways to certification programs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  whileHover={{ scale: 1.1, y: -5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
                </motion.div>
                <p className="text-white font-medium">Industry Partnerships</p>
                <p className="text-gray-400 text-sm">Direct connections to top security firms</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  whileHover={{ scale: 1.1, y: -5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <BookOpen className="w-8 h-8 text-primary mx-auto mb-2" />
                </motion.div>
                <p className="text-white font-medium">Certification Prep</p>
                <p className="text-gray-400 text-sm">CISSP, CEH, OSCP preparation</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  whileHover={{ scale: 1.1, y: -5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                </motion.div>
                <p className="text-white font-medium">Mentorship Network</p>
                <p className="text-gray-400 text-sm">Connect with industry experts</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 text-center"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://zippy-blancmange-264ab5.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors"
            >
              Explore CyberHx Platform
              <Shield className="ml-2 w-5 h-5" />
            </a>
            
            <a
              href="https://unstop.com/o/qRej6iS?lb=OsFfmSw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors"
            >
              Register for Competition
              <Trophy className="ml-2 w-5 h-5" />
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrizesPage;