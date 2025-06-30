import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Book, Package, Users, Star, ArrowRight, Database, Code } from 'lucide-react';

export const BookStorePage = () => {
  const problemStatements = [
    {
      id: 1,
      title: "Book E-commerce Platform",
      description: "Build a full-featured online bookstore with user and admin interfaces, advanced search, and recommendation system.",
      techStack: ["React", "Next.js", "Node.js", "PostgreSQL"],
      difficulty: "Intermediate",
      impact: "E-commerce",
      features: [
        "Book catalog management",
        "Shopping cart system",
        "Payment integration",
        "Order tracking"
      ]
    },
    {
      id: 2,
      title: "Admin Dashboard",
      description: "Create a comprehensive admin panel for managing inventory, orders, users, and analytics.",
      techStack: ["React", "Express", "Redux", "Chart.js"],
      difficulty: "Advanced",
      impact: "Business Management",
      features: [
        "Inventory management",
        "Order processing",
        "User management",
        "Sales analytics"
      ]
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
            +20% Points & Internship Opportunity
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold gradient-text mb-4"
          >
            Book E-commerce Platform
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Create a modern online bookstore with advanced features and admin capabilities
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
                  {problem.id === 1 ? (
                    <ShoppingBag className="w-6 h-6 text-primary" />
                  ) : (
                    <Database className="w-6 h-6 text-primary" />
                  )}
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
            Start Building
            <ArrowRight className="ml-2" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};