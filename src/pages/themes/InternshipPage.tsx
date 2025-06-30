import React from 'react';
import { motion } from 'framer-motion';
import { Car, Book, ShoppingCart, MessageCircle, School, Wallet, CreditCard, ArrowRight, Code, Users, Database, Star, Target } from 'lucide-react';

export const InternshipPage = () => {
  const projects = [
    {
      id: 1,
      title: "Safe Ride Platform",
      description: "Build a comprehensive ride-hailing solution with user and admin applications.",
      icon: <Car className="w-8 h-8" />,
      color: "#00ff41",
      modules: ["User App", "Admin Dashboard", "Driver App"],
      features: [
        "Real-time tracking",
        "Payment integration",
        "Driver management",
        "Analytics dashboard"
      ],
      techStack: ["React Native", "Node.js", "MongoDB", "Socket.IO"],
      difficulty: "Intermediate",
      impact: "Transportation"
    },
    {
      id: 2,
      title: "Book E-commerce Platform",
      description: "Create a full-featured online bookstore with advanced admin capabilities.",
      icon: <Book className="w-8 h-8" />,
      color: "#0ff",
      modules: ["User Interface", "Admin Panel", "Inventory System"],
      features: [
        "Book catalog",
        "Order management",
        "User profiles",
        "Analytics tools"
      ],
      techStack: ["React", "Next.js", "Node.js", "PostgreSQL"],
      difficulty: "Intermediate",
      impact: "E-commerce"
    },
    {
      id: 3,
      title: "Grocery Delivery System",
      description: "Develop an end-to-end grocery ordering and delivery platform.",
      icon: <ShoppingCart className="w-8 h-8" />,
      color: "#ff3e3e",
      modules: ["Customer App", "Admin Dashboard", "Delivery Tracking"],
      features: [
        "Product search",
        "Order tracking",
        "Inventory management",
        "Delivery optimization"
      ],
      techStack: ["React Native", "Node.js", "MongoDB", "Redis"],
      difficulty: "Advanced",
      impact: "Retail"
    },
    {
      id: 4,
      title: "Magic Talk Platform",
      description: "Build a spiritual consultation platform with real-time communication.",
      icon: <MessageCircle className="w-8 h-8" />,
      color: "#9B59B6",
      modules: ["User Portal", "Expert Dashboard", "Admin Panel"],
      features: [
        "Video consultations",
        "Wallet system",
        "Booking management",
        "Expert profiles"
      ],
      techStack: ["React", "WebRTC", "Node.js", "PostgreSQL"],
      difficulty: "Advanced",
      impact: "Wellness"
    },
    {
      id: 5,
      title: "School ERP System",
      description: "Create a comprehensive school management platform.",
      icon: <School className="w-8 h-8" />,
      color: "#F1C40F",
      modules: ["Admin Dashboard", "Teacher Portal", "Parent App"],
      features: [
        "Attendance tracking",
        "Grade management",
        "Fee processing",
        "Communication tools"
      ],
      techStack: ["React", "Node.js", "MySQL", "Socket.IO"],
      difficulty: "Advanced",
      impact: "Education"
    },
    {
      id: 6,
      title: "Payment Platform",
      description: "Develop a UPI-based payment and banking application.",
      icon: <Wallet className="w-8 h-8" />,
      color: "#2ECC71",
      modules: ["Mobile App", "Transaction System", "Admin Panel"],
      features: [
        "UPI payments",
        "Bill payments",
        "Transaction history",
        "Bank integration"
      ],
      techStack: ["React Native", "Node.js", "PostgreSQL", "Redis"],
      difficulty: "Expert",
      impact: "Fintech"
    },
    {
      id: 7,
      title: "Student Loan Platform",
      description: "Build an education loan management and processing system.",
      icon: <CreditCard className="w-8 h-8" />,
      color: "#3498DB",
      modules: ["Student Portal", "Admin Dashboard", "Document System"],
      features: [
        "Loan applications",
        "Document verification",
        "EMI calculator",
        "Payment tracking"
      ],
      techStack: ["React", "Node.js", "MongoDB", "AWS"],
      difficulty: "Advanced",
      impact: "Finance"
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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium"
          >
            Internship Opportunities
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold gradient-text mb-4"
          >
            Build Real-World Projects
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Showcase your skills and gain industry experience through our internship projects
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {projects.map((project) => (
            <motion.div
              key={project.id}
              variants={itemVariants}
              className="glass-effect rounded-xl p-6 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-6">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${project.color}20` }}
                >
                  {project.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{project.title}</h3>
                  <p className="text-gray-400">{project.description}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">Project Modules</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.modules.map((module, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                      >
                        {module}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">Key Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {project.features.map((feature, index) => (
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

                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map((tech, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-dark-100 text-gray-300 rounded-full text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-300">{project.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-300">{project.impact}</span>
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
          <Users className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Join Our Internship Program</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Get hands-on experience building production-ready applications with guidance from industry experts.
          </p>
          <a
            href="https://unstop.com/o/qRej6iS?lb=OsFfmSw"
            className="inline-flex items-center bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors"
          >
            Apply Now
            <ArrowRight className="ml-2" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};