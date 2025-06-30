import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Shield, Code,Heart, Blocks, Leaf, Cpu, Sparkles, BookOpen, ArrowRight, Star, Users, Target, Search, Filter, Car, ShoppingBag, ShoppingCart, MessageCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Theme {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  examples: string[];
  techStack: string[];
  path: string;
  internshipOpportunity?: boolean;
  points?: number;
}

export const ThemesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const navigate = useNavigate();

  const themes: Theme[] = [
     {
      title: "Internship",
      description: "Exclusive problem statements for internship opportunities.",
      icon: <MessageCircle className="w-8 h-8" />,
      color: "from-[#9B59B6] to-[#8E44AD]",
      examples: [
        "Safe ride",
        "Magic talk",
        "Voice Recognition",
        "Smart Responses"
      ],
      techStack: ["React", "WebRTC", "TensorFlow", "Socket.IO"],
      path: "/themes/magic-talk",
      internshipOpportunity: true,
      points: 120
    },
    {
      title: "AI & Machine Learning",
      description: "Build smart applications that learn and make intelligent decisions.",
      icon: <Brain className="w-8 h-8" />,
      color: "from-[#FF6B6B] to-[#FF8E8E]",
      examples: [
        "Intelligent Chatbots",
        "Predictive Analytics",
        "Computer Vision",
        "NLP"
      ],
      techStack: ["TensorFlow", "PyTorch", "Scikit-learn", "OpenAI API"],
      path: "/themes/ai",
      points: 100
    },
  {
      title: "Healthcare Innovations",
      description: "Build secure solutions for the healthcare industry",
      icon: <Heart className="w-8 h-8" />,
      color: "from-[#FF6B6B] to-[#FF8E8E]",
      examples: [
        "Privacy-Preserving Analytics",
        "Early Diagnosis",
        "Secure Image Sharing",
        "Health Data Security"
      ],
      techStack: ["Homomorphic Encryption", "ML/AI", "Blockchain", "DICOM"],
      path: "/themes/HealthcarePage",
      points: 100
    },
    {
      title: "Blockchain",
      description: "Decentralized apps, smart contracts, and Web3 innovations.",
      icon: <Blocks className="w-8 h-8" />,
      color: "from-[#4ECDC4] to-[#45B7AF]",
      examples: [
        "DeFi Applications",
        "Smart Contracts",
        "NFT Marketplaces",
        "Decentralized Identity"
      ],
      techStack: ["Ethereum", "Solidity", "Web3.js", "IPFS"],
      path: "/themes/blockchain",
      points: 100
    },
    {
      title: "Cybersecurity",
      description: "Secure the digital world with privacy and protection tools.",
      icon: <Shield className="w-8 h-8" />,
      color: "from-[#00ff41] to-[#008f11]",
      examples: [
        "Vulnerability Scanners",
        "Encryption Tools",
        "Security Monitoring",
        "Privacy Solutions"
      ],
      techStack: ["Python", "Rust", "Go", "Cryptography"],
      path: "/themes/cybersecurity",
      points: 100
    },
    {
      title: "EdTech",
      description: "Create solutions that make learning smarter and accessible.",
      icon: <BookOpen className="w-8 h-8" />,
      color: "from-[#FFD93D] to-[#FFB800]",
      examples: [
        "Interactive Learning",
        "Virtual Classrooms",
        "Educational Games",
        "Learning Analytics"
      ],
      techStack: ["React", "Node.js", "WebRTC", "Three.js"],
      path: "/themes/edtech",
      points: 100
    },
    {
      title: "Sustainability",
      description: "Develop projects focused on environmental protection.",
      icon: <Leaf className="w-8 h-8" />,
      color: "from-[#6BCB77] to-[#4FA83D]",
      examples: [
        "Carbon Footprint",
        "Waste Management",
        "Renewable Energy",
        "Climate Solutions"
      ],
      techStack: ["IoT", "Data Analytics", "Cloud Computing", "Mobile"],
      path: "/themes/sustainability",
      points: 100
    },
    {
      title: "Internet of Things",
      description: "Connect devices and build smart ecosystems.",
      icon: <Cpu className="w-8 h-8" />,
      color: "from-[#9B59B6] to-[#8E44AD]",
      examples: [
        "Smart Home Systems",
        "Health Monitoring",
        "Industrial IoT",
        "Connected Cities"
      ],
      techStack: ["Arduino", "Raspberry Pi", "MQTT", "Edge Computing"],
      path: "/themes/iot",
      points: 100
    },
    {
      title: "Open Innovation",
      description: "Think outside the box with innovative solutions.",
      icon: <Sparkles className="w-8 h-8" />,
      color: "from-[#FF8008] to-[#FFA03D]",
      examples: [
        "Mixed Reality",
        "Quantum Computing",
        "Bio-Technology",
        "Space Tech"
      ],
      techStack: ["Any Technology", "Cross-Platform", "Experimental", "Innovative"],
      path: "/themes/open-innovation",
      points: 100
    }
  ];

  const categories = [
    { id: 'all', label: 'All Themes', icon: <Filter /> },
    { id: 'internship', label: 'Internship', icon: <Star /> },
    { id: 'tech', label: 'Tech', icon: <Code /> },
    { id: 'business', label: 'Business', icon: <Users /> }
  ];

  const filteredThemes = themes.filter(theme => {
    const matchesCategory = 
      selectedCategory === 'all' || 
      (selectedCategory === 'internship' && theme.internshipOpportunity) ||
      (selectedCategory === 'tech' && !theme.internshipOpportunity) ||
      (selectedCategory === 'business' && theme.internshipOpportunity);

    const matchesSearch = 
      theme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.techStack.some(tech => tech.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const handleThemeSelect = (theme: Theme) => {
    navigate(theme.path);
  };

  return (
    <div className="min-h-screen bg-dark-300 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium"
          >
            36 + 7 Problem Statements
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold gradient-text mb-6"
          >
            Choose Your Challenge
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Select from our curated themes or combine them to create unique solutions
          </motion.p>
        </div>

        <div className="mb-12 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search themes, technologies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-100 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    selectedCategory === category.id
                      ? 'bg-primary text-dark-300'
                      : 'bg-dark-100 text-gray-300 hover:bg-dark-200'
                  }`}
                >
                  {category.icon}
                  <span className="ml-2">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-gray-400">
              Showing {filteredThemes.length} themes
            </p>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="flex items-center text-primary hover:text-secondary transition-colors"
            >
              <Info size={20} className="mr-2" />
              <span>How it works</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="glass-effect rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">How to Participate</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center text-primary">
                      <Star className="w-5 h-5 mr-2" />
                      <span className="font-medium">Points System</span>
                    </div>
                    <p className="text-gray-400">Each theme has base points. Internship themes offer 20% bonus.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-primary">
                      <Users className="w-5 h-5 mr-2" />
                      <span className="font-medium">Team Size</span>
                    </div>
                    <p className="text-gray-400">Form teams of 2-4 members. Cross-college teams welcome.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-primary">
                      <Target className="w-5 h-5 mr-2" />
                      <span className="font-medium">Evaluation</span>
                    </div>
                    <p className="text-gray-400">Projects judged on innovation, technical complexity, and impact.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredThemes.map((theme) => (
            <motion.div
              key={theme.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              className="relative"
              onMouseEnter={() => setHoveredTheme(theme.title)}
              onMouseLeave={() => setHoveredTheme(null)}
            >
              <div 
                className="glass-effect rounded-xl overflow-hidden cursor-pointer relative"
                onClick={() => handleThemeSelect(theme)}
              >
                {theme.internshipOpportunity && (
                  <div className="absolute top-4 right-4 z-10">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-primary text-dark-300 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      +20% Points & Internship
                    </motion.div>
                  </div>
                )}
                
                <div className="p-6">
                  <motion.div
                    className={`bg-gradient-to-br ${theme.color} p-4 rounded-lg inline-block mb-4`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {theme.icon}
                  </motion.div>

                  <h3 className="text-2xl font-bold text-white mb-3">{theme.title}</h3>
                  <p className="text-gray-400 mb-4">{theme.description}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-primary mb-2">Example Projects</h4>
                      <div className="flex flex-wrap gap-2">
                        {theme.examples.map((example, i) => (
                          <span
                            key={i}
                            className="text-xs bg-dark-100 text-gray-300 px-2 py-1 rounded-full"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-primary mb-2">Tech Stack</h4>
                      <div className="flex flex-wrap gap-2">
                        {theme.techStack.map((tech, i) => (
                          <span
                            key={i}
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-700 flex justify-between items-center">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-primary mr-2" />
                        <span className="text-white font-medium">{theme.points} Points</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center text-primary hover:text-secondary"
                      >
                        View Details
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 text-center"
        >
          <a
            href="https://unstop.com/o/qRej6iS?lb=OsFfmSw"
            className="inline-flex items-center bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors"
          >
            Register Now
            <ArrowRight className="ml-2" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default ThemesPage;