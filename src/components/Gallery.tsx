import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Download, Share, Heart, Info, Filter, Search, Code, Brain, Shield, Rocket, Terminal, Eye, AlertTriangle, Lock } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';

interface GalleryImage {
  id: number;
  src: string;
  title: string;
  category: string;
  description: string;
  team?: string[];
  techStack?: string[];
  likes?: number;
  downloads?: number;
  photographer?: string;
}

export const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const images: GalleryImage[] = [
    {
      id: 1,
      src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Advanced Malware Analysis Lab",
      category: "Hacking",
      description: "State-of-the-art malware analysis environment with multiple virtual machines for safe threat investigation",
      team: ["CyberHx Security Team", "Malware Analysts"],
      techStack: ["Virtual Machines", "Sandboxing", "Reverse Engineering", "Dynamic Analysis"],
      likes: 245,
      downloads: 89,
      photographer: "Security Lab Team"
    },
    {
      id: 2,
      src: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Real-time Fraud Detection Dashboard",
      category: "Fraud Detection",
      description: "AI-powered fraud detection system monitoring thousands of transactions in real-time",
      team: ["Fraud Detection Team"],
      techStack: ["Machine Learning", "Real-time Analytics", "Pattern Recognition"],
      likes: 189,
      downloads: 67,
      photographer: "AI Security Team"
    },
    {
      id: 3,
      src: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Network Penetration Testing",
      category: "Hacking",
      description: "Ethical hacking session demonstrating network vulnerability assessment and penetration testing techniques",
      team: ["Penetration Testers", "Network Security"],
      techStack: ["Kali Linux", "Metasploit", "Nmap", "Wireshark"],
      likes: 312,
      downloads: 156,
      photographer: "Ethical Hacking Team"
    },
    {
      id: 4,
      src: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Cybersecurity Command Center",
      category: "Security Operations",
      description: "24/7 Security Operations Center monitoring global cyber threats and coordinating incident response",
      team: ["SOC Analysts", "Incident Response"],
      techStack: ["SIEM", "Threat Intelligence", "Incident Response", "Monitoring"],
      likes: 178,
      downloads: 45,
      photographer: "SOC Team"
    },
    {
      id: 5,
      src: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Dark Web Investigation",
      category: "Investigation",
      description: "Deep web investigation tools and techniques for tracking cybercriminal activities",
      team: ["Digital Forensics", "Cyber Investigators"],
      techStack: ["Tor Browser", "OSINT Tools", "Digital Forensics", "Cryptocurrency Tracking"],
      likes: 267,
      downloads: 98,
      photographer: "Investigation Team"
    },
    {
      id: 6,
      src: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Spam Detection Algorithm",
      category: "Spam Detection",
      description: "Advanced machine learning algorithms detecting and filtering spam messages across multiple platforms",
      team: ["ML Engineers", "Data Scientists"],
      techStack: ["Natural Language Processing", "Machine Learning", "Pattern Analysis"],
      likes: 156,
      downloads: 73,
      photographer: "AI Research Team"
    },
    {
      id: 7,
      src: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Social Engineering Awareness",
      category: "Education",
      description: "Interactive training session on identifying and preventing social engineering attacks",
      team: ["Security Trainers", "Awareness Team"],
      techStack: ["Training Simulations", "Phishing Tests", "Awareness Tools"],
      likes: 134,
      downloads: 52,
      photographer: "Training Team"
    },
    {
      id: 8,
      src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Cryptocurrency Fraud Analysis",
      category: "Fraud Detection",
      description: "Blockchain analysis tools tracking fraudulent cryptocurrency transactions and wallet addresses",
      team: ["Blockchain Analysts", "Financial Crime Unit"],
      techStack: ["Blockchain Analysis", "Cryptocurrency Tracking", "Financial Forensics"],
      likes: 198,
      downloads: 84,
      photographer: "Blockchain Security Team"
    },
    {
      id: 9,
      src: "https://images.unsplash.com/photo-1551808525-51a94da548ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Incident Response War Room",
      category: "Security Operations",
      description: "Emergency response team coordinating during a major cybersecurity incident",
      team: ["Incident Response Team", "Crisis Management"],
      techStack: ["Incident Management", "Crisis Communication", "Forensic Analysis"],
      likes: 223,
      downloads: 91,
      photographer: "Emergency Response Team"
    },
    {
      id: 10,
      src: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Mr. Robot Style Hacking Setup",
      category: "Hacking",
      description: "Elite hacker workstation with multiple monitors displaying code, network maps, and security tools",
      team: ["Elite Hackers", "Security Researchers"],
      techStack: ["Multiple OS", "Custom Scripts", "Network Tools", "Encryption"],
      likes: 445,
      downloads: 187,
      photographer: "Underground Security"
    },
    {
      id: 11,
      src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Phishing Campaign Analysis",
      category: "Investigation",
      description: "Detailed analysis of sophisticated phishing campaigns targeting financial institutions",
      team: ["Threat Hunters", "Email Security"],
      techStack: ["Email Analysis", "URL Scanning", "Threat Intelligence"],
      likes: 167,
      downloads: 63,
      photographer: "Threat Intelligence Team"
    },
    {
      id: 12,
      src: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      title: "Zero-Day Exploit Research",
      category: "Research",
      description: "Advanced vulnerability research lab discovering and analyzing zero-day exploits",
      team: ["Vulnerability Researchers", "Exploit Developers"],
      techStack: ["Fuzzing Tools", "Debuggers", "Exploit Development", "Reverse Engineering"],
      likes: 289,
      downloads: 124,
      photographer: "Research Lab"
    }
  ];

  const categories = [
    { id: 'All', icon: <Filter size={20} />, color: '#00ff41' },
    { id: 'Hacking', icon: <Terminal size={20} />, color: '#ff3e3e' },
    { id: 'Fraud Detection', icon: <Eye size={20} />, color: '#0ff' },
    { id: 'Spam Detection', icon: <AlertTriangle size={20} />, color: '#ffd700' },
    { id: 'Investigation', icon: <Search size={20} />, color: '#9B59B6' },
    { id: 'Security Operations', icon: <Shield size={20} />, color: '#FF6B6B' },
    { id: 'Education', icon: <Brain size={20} />, color: '#4ECDC4' },
    { id: 'Research', icon: <Code size={20} />, color: '#FFD93D' }
  ];

  const filteredImages = activeCategory === 'All' 
    ? images 
    : images.filter(img => img.category === activeCategory);

  const searchedImages = filteredImages.filter(img => 
    img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (img.team && img.team.some(member => member.toLowerCase().includes(searchQuery.toLowerCase()))) ||
    (img.techStack && img.techStack.some(tech => tech.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleDoubleTap = (imageId: number) => {
    const newLiked = new Set(liked);
    if (newLiked.has(imageId)) {
      newLiked.delete(imageId);
    } else {
      newLiked.add(imageId);
    }
    setLiked(newLiked);

    const heart = document.getElementById(`heart-${imageId}`);
    if (heart) {
      heart.style.transform = 'scale(1.5)';
      setTimeout(() => {
        heart.style.transform = 'scale(1)';
      }, 200);
    }
  };

  const handleShare = async (image: GalleryImage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: image.title,
          text: image.description,
          url: image.src
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleDownload = async (image: GalleryImage) => {
    try {
      const response = await fetch(image.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${image.title.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <section id="gallery" className="py-16 bg-dark-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <Lock className="relative w-16 h-16 text-primary mx-auto" />
            </div>
          </motion.div>
          <h2 className="text-3xl font-bold gradient-text mb-3">CyberHx Security Gallery</h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Explore our cybersecurity operations, threat investigations, and advanced security research
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by title, description, team, or technology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-100 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2 hide-scrollbar">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center space-x-2 ${
                  activeCategory === category.id
                    ? 'bg-primary text-dark-300'
                    : 'bg-dark-100 text-gray-300 hover:bg-dark-200'
                }`}
                style={{
                  boxShadow: activeCategory === category.id ? `0 0 20px ${category.color}40` : 'none'
                }}
              >
                <span style={{ color: activeCategory === category.id ? '#000' : category.color }}>
                  {category.icon}
                </span>
                <span>{category.id}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <LayoutGroup>
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {searchedImages.map((image) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden glass-effect cursor-pointer"
                onClick={() => setSelectedImage(image)}
                onDoubleClick={() => handleDoubleTap(image.id)}
              >
                <LazyLoadImage
                  src={image.src}
                  alt={image.title}
                  effect="opacity"
                  threshold={100}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  wrapperClassName="w-full h-full"
                  loading="lazy"
                  decoding="async"
                />
                
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-t from-dark-300 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                  animate={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                >
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-lg font-semibold text-white mb-1">{image.title}</h3>
                    <p className="text-sm text-gray-300 mb-2 line-clamp-2">{image.description}</p>
                    
                    {image.techStack && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {image.techStack.slice(0, 3).map((tech, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                          >
                            {tech}
                          </span>
                        ))}
                        {image.techStack.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded-full">
                            +{image.techStack.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          id={`heart-${image.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDoubleTap(image.id);
                          }}
                          className="text-white hover:text-primary transition-colors"
                        >
                          <Heart
                            className={liked.has(image.id) ? 'fill-primary text-primary' : ''}
                            size={20}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(image);
                          }}
                          className="text-white hover:text-primary transition-colors"
                        >
                          <Share size={20} />
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                        className="text-white hover:text-primary transition-colors"
                      >
                        <Download size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute top-4 right-4 px-3 py-1 bg-primary/80 text-dark-300 rounded-full text-sm font-medium"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {image.category}
                </motion.div>

                {/* Cyberpunk-style overlay effects */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
                  <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent opacity-30" />
                  <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent opacity-30" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </LayoutGroup>

        <AnimatePresence>
          {selectedImage && (
            <Dialog
              as={motion.div}
              static
              open={!!selectedImage}
              onClose={() => setSelectedImage(null)}
              className="fixed inset-0 z-50 flex items-center justify-center"
            >
              <Dialog.Overlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative max-w-5xl w-full mx-4"
              >
                <div className="relative rounded-xl overflow-hidden bg-dark-200">
                  <LazyLoadImage
                    src={selectedImage.src}
                    alt={selectedImage.title}
                    effect="opacity"
                    threshold={100}
                    className="w-full max-h-[80vh] object-contain"
                    wrapperClassName="w-full"
                    loading="eager"
                    decoding="async"
                  />
                  
                  <div className="absolute top-4 right-4 flex space-x-4">
                    <button
                      onClick={() => setShowInfo(!showInfo)}
                      className="p-2 rounded-full bg-dark-300/80 text-white hover:text-primary transition-colors"
                    >
                      <Info size={20} />
                    </button>
                    <button
                      onClick={() => handleDownload(selectedImage)}
                      className="p-2 rounded-full bg-dark-300/80 text-white hover:text-primary transition-colors"
                    >
                      <Download size={20} />
                    </button>
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="p-2 rounded-full bg-dark-300/80 text-white hover:text-primary transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {showInfo && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="p-6"
                      >
                        <h3 className="text-2xl font-bold text-white mb-2">{selectedImage.title}</h3>
                        <p className="text-primary mb-3">{selectedImage.category}</p>
                        <p className="text-gray-400 mb-4">{selectedImage.description}</p>
                        
                        {selectedImage.team && (
                          <div className="mb-4">
                            <h4 className="text-white font-medium mb-2">Team Members</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedImage.team.map((member, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                                >
                                  {member}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedImage.techStack && (
                          <div className="mb-4">
                            <h4 className="text-white font-medium mb-2">Technologies Used</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedImage.techStack.map((tech, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-dark-100 text-gray-300 rounded-full text-sm border border-gray-700"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <span>By {selectedImage.photographer}</span>
                          <div className="flex items-center space-x-4">
                            <span>{selectedImage.likes} likes</span>
                            <span>{selectedImage.downloads} downloads</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </Dialog>
          )}
        </AnimatePresence>

        {searchedImages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No images found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </motion.div>
        )}
      </div>
    </section>
  );
};