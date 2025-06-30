import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Eye, 
  MessageCircle, 
  Heart, 
  Share2, 
  BookOpen, 
  AlertTriangle, 
  Shield, 
  TrendingUp,
  Clock,
  Tag,
  Plus,
  ChevronRight,
  ExternalLink,
  X,
  ArrowUp,
  Bookmark,
  ThumbsUp,
  Send
} from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  category: string;
  tags: string[];
  publishedAt: string;
  readTime: number;
  views: number;
  likes: number;
  comments: number;
  featured: boolean;
  image: string;
}

export const BlogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<number>>(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const blogPosts: BlogPost[] = [
    {
      id: 1,
      title: "New WhatsApp Scam: Fake OTP Verification Links",
      excerpt: "Discovered a sophisticated phishing campaign targeting WhatsApp users with fake OTP verification messages. Here's how to identify and protect yourself from these evolving threats.",
      content: "Recently, I encountered a new type of scam that's becoming increasingly common across India. Scammers are now using sophisticated WhatsApp messages that appear to be from legitimate services, asking users to verify their accounts through fake OTP links. These messages often contain urgent language and official-looking branding to create a sense of urgency. The attack vector involves social engineering techniques combined with technical deception, making it particularly dangerous for unsuspecting users. In this detailed analysis, I'll break down the attack methodology, show you real examples I've collected, and provide actionable steps to protect yourself and your loved ones from falling victim to these scams.",
      author: {
        name: "Kushagra Dwivedi",
        avatar: "https://i.ibb.co/kscBzpxZ/Whats-App-Image-2025-07-01-at-1-02-59-AM.jpg",
        role: "Security Researcher"
      },
      category: "Scam Alert",
      tags: ["WhatsApp", "Phishing", "OTP", "Social Engineering"],
      publishedAt: "2025-01-15",
      readTime: 5,
      views: 1247,
      likes: 89,
      comments: 23,
      featured: true,
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80"
    },
    {
      id: 2,
      title: "Banking Trojan Analysis: Zeus Variant Targeting Indian Banks",
      excerpt: "Deep dive into a new Zeus banking trojan variant specifically designed to target major Indian banking institutions with advanced evasion techniques.",
      content: "During my malware analysis research, I discovered a sophisticated banking trojan that represents a significant evolution in financial cybercrime. This Zeus variant specifically targets Indian banking customers with localized attack vectors and advanced anti-detection mechanisms. The malware employs multiple layers of obfuscation and uses legitimate-looking certificates to bypass security systems. What makes this particularly concerning is its ability to intercept SMS-based OTPs and perform real-time transaction manipulation. Through reverse engineering and dynamic analysis, I've uncovered the complete attack chain and identified several indicators of compromise that security teams should monitor.",
      author: {
        name: "Pankaj Kumar",
        avatar: "https://media.licdn.com/dms/image/v2/D4D03AQEoIIJDEgVOKQ/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1722410387895?e=1751500800&v=beta&t=xiMbJncd3nXFMUpl1-k2kX2qRheifvjKTwhVPM9qqOQ",
        role: "Malware Analyst"
      },
      category: "Malware Analysis",
      tags: ["Banking Trojan", "Zeus", "Malware", "Financial Security"],
      publishedAt: "2025-01-12",
      readTime: 8,
      views: 892,
      likes: 67,
      comments: 15,
      featured: false,
      image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80"
    },
    {
      id: 3,
      title: "Cryptocurrency Scam: Fake Investment Platform Exposed",
      excerpt: "Investigation reveals how scammers are using fake cryptocurrency investment platforms to steal millions from unsuspecting investors through sophisticated social engineering.",
      content: "After receiving multiple reports from victims, I investigated a fake crypto platform that has stolen over ₹50 crores from Indian investors. The scam operates through a combination of fake trading platforms, manipulated profit displays, and aggressive social media marketing. What makes this particularly insidious is the use of deepfake technology to create fake testimonials from celebrities and financial experts. The investigation revealed a complex network of shell companies and cryptocurrency wallets used to launder the stolen funds. I'll share the complete technical analysis, including blockchain forensics and the social engineering tactics used to build trust with victims.",
      author: {
        name: "Shreya Shristi",
        avatar: "https://i.ibb.co/609FPPt3/IMG-20250430-WA0002-1.jpg",
        role: "Fraud Investigator"
      },
      category: "Fraud Investigation",
      tags: ["Cryptocurrency", "Investment Scam", "Fraud", "Bitcoin"],
      publishedAt: "2025-01-10",
      readTime: 6,
      views: 1456,
      likes: 112,
      comments: 34,
      featured: true,
      image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80"
    },
    {
      id: 4,
      title: "Social Media Account Takeover: New Attack Vector",
      excerpt: "Discovered a new method attackers are using to take over social media accounts through session hijacking and cookie manipulation techniques.",
      content: "While researching social media security, I found a concerning new attack method that bypasses traditional two-factor authentication. Attackers are exploiting vulnerabilities in session management to hijack active user sessions without requiring password credentials. This technique involves sophisticated cookie manipulation and session token theft through malicious browser extensions and compromised WiFi networks. The attack is particularly effective because it leaves no obvious traces and can persist even after password changes. I'll demonstrate how this attack works, show real-world examples, and provide comprehensive mitigation strategies for both users and platform developers.",
      author: {
        name: "Sejal Tiwari",
        avatar: "https://i.ibb.co/0pCqJfQY/Whats-App-Image-2025-04-29-at-8-31-07-PM.jpg",
        role: "Security Analyst"
      },
      category: "Social Engineering",
      tags: ["Social Media", "Account Takeover", "Session Hijacking", "Privacy"],
      publishedAt: "2025-01-08",
      readTime: 4,
      views: 743,
      likes: 45,
      comments: 12,
      featured: false,
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80"
    },
    {
      id: 5,
      title: "Email Spoofing Campaign Targeting Corporate Executives",
      excerpt: "Analysis of a sophisticated email spoofing campaign that successfully compromised several high-profile corporate accounts using advanced impersonation techniques.",
      content: "During a recent security audit, we uncovered an advanced email spoofing campaign targeting C-level executives across multiple industries. The attackers used sophisticated domain spoofing techniques combined with detailed social engineering research to create highly convincing phishing emails. What sets this campaign apart is the use of legitimate email infrastructure and carefully crafted business contexts that made detection extremely difficult. The attack resulted in several successful business email compromises leading to significant financial losses. This analysis includes technical details of the spoofing methods, social engineering tactics, and comprehensive prevention strategies for organizations.",
      author: {
        name: "Pragati Yadav",
        avatar: "https://media.licdn.com/dms/image/v2/D5603AQG9nMfjIl9GSg/profile-displayphoto-shrink_200_200/B56ZOaIY1HHYAc-/0/1733457712693?e=1751500800&v=beta&t=8CWnHj83KU3IXH1E_T6yLeJxfcU0fPOIXdode9ZZPQ8",
        role: "Email Security Expert"
      },
      category: "Email Security",
      tags: ["Email Spoofing", "Corporate Security", "Phishing", "Executive Protection"],
      publishedAt: "2025-01-05",
      readTime: 7,
      views: 634,
      likes: 38,
      comments: 9,
      featured: false,
      image: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80"
    }
  ];

  const categories = [
    { id: 'all', label: 'All Posts', icon: <BookOpen />, count: blogPosts.length },
    { id: 'Scam Alert', label: 'Scam Alerts', icon: <AlertTriangle />, count: blogPosts.filter(p => p.category === 'Scam Alert').length },
    { id: 'Malware Analysis', label: 'Malware Analysis', icon: <Shield />, count: blogPosts.filter(p => p.category === 'Malware Analysis').length },
    { id: 'Fraud Investigation', label: 'Fraud Investigation', icon: <Search />, count: blogPosts.filter(p => p.category === 'Fraud Investigation').length },
    { id: 'Social Engineering', label: 'Social Engineering', icon: <User />, count: blogPosts.filter(p => p.category === 'Social Engineering').length },
    { id: 'Email Security', label: 'Email Security', icon: <MessageCircle />, count: blogPosts.filter(p => p.category === 'Email Security').length }
  ];

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      post.author.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPosts = blogPosts.filter(post => post.featured);
  const trendingTags = ['Phishing', 'Malware', 'Cryptocurrency', 'Social Engineering', 'Banking Trojan', 'Fraud'];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLike = (postId: number) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleBookmark = (postId: number) => {
    setBookmarkedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-dark-300 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <Shield className="relative w-16 h-16 text-primary mx-auto" />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold gradient-text mb-6"
          >
            CyberHx Security Blog
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed"
          >
            Community-driven insights on the latest scams, threats, and cybersecurity discoveries. 
            Join our mission to make the digital world safer for everyone.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-400"
          >
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              {blogPosts.reduce((sum, post) => sum + post.views, 0).toLocaleString()} total views
            </span>
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              {blogPosts.length} articles published
            </span>
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {new Set(blogPosts.map(p => p.author.name)).size} expert contributors
            </span>
          </motion.div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="mb-12 space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search posts, tags, authors, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-100 border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-primary text-dark-300 px-6 py-4 rounded-xl font-medium hover:bg-secondary transition-colors flex items-center shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Submit Finding</span>
                <span className="sm:hidden">Submit</span>
              </motion.button>
              
              <div className="flex bg-dark-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-dark-300' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <BookOpen size={20} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-dark-300' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Filter size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Category Filters */}
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center px-6 py-3 rounded-xl whitespace-nowrap transition-all font-medium ${
                  selectedCategory === category.id
                    ? 'bg-primary text-dark-300 shadow-lg'
                    : 'bg-dark-100 text-gray-300 hover:bg-dark-200 border border-gray-700'
                }`}
              >
                {category.icon}
                <span className="ml-2">{category.label}</span>
                <span className="ml-2 bg-black/20 px-2 py-1 rounded-full text-xs">
                  {category.count}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-100 rounded-xl p-4 border border-gray-700"
            >
              <p className="text-gray-300">
                Found <span className="text-primary font-semibold">{filteredPosts.length}</span> results for 
                <span className="text-white font-semibold"> "{searchQuery}"</span>
              </p>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3">
            {/* Featured Posts Section */}
            {selectedCategory === 'all' && !searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-white flex items-center">
                    <TrendingUp className="w-8 h-8 text-primary mr-3" />
                    Featured Posts
                  </h2>
                  <div className="text-sm text-gray-400">
                    {featuredPosts.length} featured articles
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {featuredPosts.slice(0, 2).map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group glass-effect rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute top-4 left-4">
                          <span className="bg-primary text-dark-300 px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                            ⭐ Featured
                          </span>
                        </div>
                        <div className="absolute top-4 right-4">
                          <span className="bg-dark-300/80 backdrop-blur-sm text-primary px-3 py-2 rounded-full text-sm font-medium">
                            {post.category}
                          </span>
                        </div>
                        <div className="absolute bottom-4 right-4 flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(post.id);
                            }}
                            className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                              likedPosts.has(post.id) 
                                ? 'bg-red-500 text-white' 
                                : 'bg-dark-300/80 text-gray-300 hover:text-red-400'
                            }`}
                          >
                            <Heart size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookmark(post.id);
                            }}
                            className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                              bookmarkedPosts.has(post.id) 
                                ? 'bg-primary text-dark-300' 
                                : 'bg-dark-300/80 text-gray-300 hover:text-primary'
                            }`}
                          >
                            <Bookmark size={16} />
                          </motion.button>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={post.author.avatar}
                              alt={post.author.name}
                              className="w-10 h-10 rounded-full border-2 border-primary/20"
                            />
                            <div>
                              <p className="text-white text-sm font-medium">{post.author.name}</p>
                              <p className="text-gray-400 text-xs">{post.author.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-gray-400 text-sm">
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {post.views.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {post.readTime}m
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* All Posts Section */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white">
                  {selectedCategory === 'all' ? 'Latest Posts' : `${selectedCategory} Posts`}
                </h2>
                <div className="text-sm text-gray-400">
                  {filteredPosts.length} articles found
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="space-y-8">
                  {filteredPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group glass-effect rounded-2xl p-6 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="lg:w-1/3">
                          <div className="relative overflow-hidden rounded-xl">
                            <img
                              src={post.image}
                              alt={post.title}
                              className="w-full h-48 lg:h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            <div className="absolute top-3 left-3">
                              <span className="bg-primary/90 text-dark-300 px-3 py-1 rounded-full text-xs font-bold">
                                {post.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="lg:w-2/3">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="flex items-center gap-1 text-gray-400 text-sm">
                              <Clock className="w-4 h-4" />
                              {post.readTime} min read
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400 text-sm">{formatDate(post.publishedAt)}</span>
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.slice(0, 4).map((tag, i) => (
                              <span
                                key={i}
                                className="bg-dark-100 text-gray-300 px-3 py-1 rounded-full text-xs hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={post.author.avatar}
                                alt={post.author.name}
                                className="w-10 h-10 rounded-full border-2 border-primary/20"
                              />
                              <div>
                                <p className="text-white text-sm font-medium">{post.author.name}</p>
                                <p className="text-gray-400 text-xs">{post.author.role}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-gray-400 text-sm">
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {post.views.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-4 h-4" />
                                {post.comments}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-4 h-4" />
                                {post.likes}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group glass-effect rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className="bg-primary/90 text-dark-300 px-3 py-1 rounded-full text-xs font-bold">
                            {post.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-400 mb-4 line-clamp-3 text-sm leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={post.author.avatar}
                              alt={post.author.name}
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="text-gray-300 text-sm">{post.author.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-400 text-sm">
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {post.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {post.readTime}m
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {filteredPosts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-400 mb-2">No posts found</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-8">
            {/* Trending Tags */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-effect rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Tag className="w-5 h-5 text-primary mr-2" />
                Trending Tags
              </h3>
              <div className="flex flex-wrap gap-3">
                {trendingTags.map((tag, index) => (
                  <motion.button
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm hover:bg-primary/20 transition-colors border border-primary/20"
                  >
                    #{tag}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Community Guidelines */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-effect rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Shield className="w-5 h-5 text-primary mr-2" />
                Community Guidelines
              </h3>
              <div className="space-y-4 text-gray-400 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Share verified scam findings with evidence</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Include screenshots and technical details</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Protect victim privacy and personal data</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Follow responsible disclosure practices</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Help educate and protect the community</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 w-full bg-primary/10 text-primary py-3 rounded-xl hover:bg-primary/20 transition-colors border border-primary/20"
              >
                Read Full Guidelines
              </motion.button>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-effect rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-6">Quick Links</h3>
              <div className="space-y-4">
                <a
                  href="https://tranquil-truffle-15401f.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-dark-100 text-gray-300 hover:text-primary hover:bg-primary/10 transition-all group"
                >
                  <span>CyberHx Learning Platform</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <button className="flex items-center justify-between p-3 rounded-xl bg-dark-100 text-gray-300 hover:text-primary hover:bg-primary/10 transition-all group w-full">
                  <span>Report a Scam</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="flex items-center justify-between p-3 rounded-xl bg-dark-100 text-gray-300 hover:text-primary hover:bg-primary/10 transition-all group w-full">
                  <span>Security Tools</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="flex items-center justify-between p-3 rounded-xl bg-dark-100 text-gray-300 hover:text-primary hover:bg-primary/10 transition-all group w-full">
                  <span>Community Forum</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>

            {/* Newsletter Signup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-effect rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-4">Stay Updated</h3>
              <p className="text-gray-400 text-sm mb-4">
                Get the latest security alerts and insights delivered to your inbox.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 bg-dark-100 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-primary text-dark-300 px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <Send size={16} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Post Modal */}
        <AnimatePresence>
          {selectedPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedPost(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-dark-200 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <img
                    src={selectedPost.image}
                    alt={selectedPost.title}
                    className="w-full h-80 object-cover rounded-t-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-t-2xl" />
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="absolute top-6 right-6 bg-dark-300/80 backdrop-blur-sm text-white p-3 rounded-full hover:bg-dark-300 transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="absolute bottom-6 left-6 right-6">
                    <span className="bg-primary text-dark-300 px-4 py-2 rounded-full text-sm font-bold">
                      {selectedPost.category}
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {selectedPost.readTime} min read
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400 text-sm">
                      {formatDate(selectedPost.publishedAt)}
                    </span>
                  </div>
                  <h1 className="text-4xl font-bold text-white mb-6 leading-tight">{selectedPost.title}</h1>
                  <div className="flex items-center gap-4 mb-8">
                    <img
                      src={selectedPost.author.avatar}
                      alt={selectedPost.author.name}
                      className="w-16 h-16 rounded-full border-2 border-primary/20"
                    />
                    <div>
                      <p className="text-white font-bold text-lg">{selectedPost.author.name}</p>
                      <p className="text-gray-400">{selectedPost.author.role}</p>
                    </div>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 leading-relaxed text-lg">{selectedPost.content}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-8">
                    {selectedPost.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="bg-dark-100 text-gray-300 px-4 py-2 rounded-full text-sm border border-gray-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-700">
                    <div className="flex items-center gap-6">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleLike(selectedPost.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                          likedPosts.has(selectedPost.id)
                            ? 'bg-red-500 text-white'
                            : 'bg-dark-100 text-gray-400 hover:text-red-400'
                        }`}
                      >
                        <Heart size={20} />
                        <span>{selectedPost.likes + (likedPosts.has(selectedPost.id) ? 1 : 0)}</span>
                      </motion.button>
                      <button className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors">
                        <MessageCircle size={20} />
                        <span>{selectedPost.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors">
                        <Share2 size={20} />
                        <span>Share</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Eye size={20} />
                      <span>{selectedPost.views.toLocaleString()} views</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll to Top Button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 bg-primary text-dark-300 p-4 rounded-full shadow-lg hover:bg-secondary transition-colors z-40"
            >
              <ArrowUp size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BlogPage;