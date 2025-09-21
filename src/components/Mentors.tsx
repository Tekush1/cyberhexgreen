import React, { useState } from 'react';
import { Github, Linkedin, Mail, Search, Filter, BookOpen, Code, Brain, Star, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Modal } from './shared/Modal';
import { BookSessionForm } from './forms/BookSessionForm';
import { BecomeMentorForm } from './forms/BecomeMentorForm';
import { useNavigate } from 'react-router-dom';

export const Mentors = () => {
  const [selectedExpertise, setSelectedExpertise] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false);
  const navigate = useNavigate();

  const mentors = [
    {
      name: "Kushagra Dwivedi ",
      role: "Founder of cyberhx",
      expertise: ["Cybersecurity", "Ethical Hacking", "DevSecOps"],
      experience: "5+ years",
      availability: "Flexible Hours",
      rating: 5,
      reviews: 156,
      image: "https://i.ibb.co/kscBzpxZ/Whats-App-Image-2025-07-01-at-1-02-59-AM.jpg",
      bio: "Ethical Hacker cybercrime Up Police",
      achievements: ["SIH finalist 2024 as a Team leader", "CTF Nationl player" , "BPS 2022 State winnder"],
      socials: {
        github: "",
        linkedin: "https://www.linkedin.com/in/kushagra-dwivedi-0342062b8/",
        email: "kushdwivedikd@gmail.com"
      }
    },

  ];

  const expertiseCategories = [
    { id: 'all', label: 'All Categories', icon: <Filter /> },
    { id: 'Web Development', label: 'Web Development', icon: <Code /> },
    { id: 'Machine Learning', label: 'Machine Learning', icon: <Brain /> },
    { id: 'Product Management', label: 'Product Management', icon: <BookOpen /> }
  ];

  const filteredMentors = mentors.filter(mentor => {
    const matchesExpertise = selectedExpertise === 'all' || mentor.expertise.includes(selectedExpertise);
    const matchesSearch = mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mentor.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mentor.expertise.some(exp => exp.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesExpertise && matchesSearch;
  });

  const handleBookSession = () => {
    navigate('/book-session');
  };

  return (
    <section className="py-24 bg-dark-300 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold gradient-text mb-6"
          >
            Learn from Industry Experts
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Connect with experienced mentors who are passionate about helping you succeed in your tech journey.
          </motion.p>
        </div>

        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, role, or expertise..."
                className="w-full bg-dark-100 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {expertiseCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedExpertise(category.id)}
                  className={`flex items-center px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    selectedExpertise === category.id
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMentors.map((mentor, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-xl overflow-hidden hover-scale"
            >
              <div className="relative p-6 pb-4">
                <div className="flex items-start gap-4">
                  <img
                    src={mentor.image}
                    alt={mentor.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-white">{mentor.name}</h3>
                    <p className="text-primary">{mentor.role}</p>
                    <div className="flex items-center mt-1">
                      <Star className="w-4 h-4 text-primary fill-current" />
                      <span className="ml-1 text-white">{mentor.rating}</span>
                      <span className="ml-1 text-gray-400">({mentor.reviews} reviews)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  {mentor.expertise.map((exp, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-dark-100 text-primary rounded-full text-sm"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>

              <div className="px-6 pb-4">
                <p className="text-gray-300 text-sm">{mentor.bio}</p>
              </div>

              <div className="px-6 pb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 text-primary mr-2" />
                    <span className="text-gray-300">{mentor.experience}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-primary mr-2" />
                    <span className="text-gray-300">{mentor.availability}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="space-y-2">
                  {mentor.achievements.map((achievement, i) => (
                    <div key={i} className="flex items-center text-sm">
                      <Star className="w-4 h-4 text-primary mr-2" />
                      <span className="text-gray-300">{achievement}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 bg-dark-100 flex items-center justify-between">
                <div className="flex space-x-4">
                  <a href={mentor.socials.github} className="text-gray-400 hover:text-primary">
                    <Github className="w-5 h-5" />
                  </a>
                  <a href={mentor.socials.linkedin} className="text-gray-400 hover:text-primary">
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a href={mentor.socials.email} className="text-gray-400 hover:text-primary">
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
                <button 
                  onClick={handleBookSession}
                  className="bg-primary text-dark-300 px-4 py-2 rounded-lg font-medium hover:bg-secondary transition-colors"
                >
                  Book Session
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isMentorModalOpen}
        onClose={() => setIsMentorModalOpen(false)}
        title="Become a Mentor"
      >
        <BecomeMentorForm onClose={() => setIsMentorModalOpen(false)} />
      </Modal>
    </section>
  );
};