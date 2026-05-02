import React, { useState } from 'react';
import { Github, Linkedin, Mail, Search, Filter, BookOpen, Code, Brain, Star, Calendar, Instagram } from 'lucide-react';
import { motion } from 'framer-motion';
import { Modal } from './shared/Modal';
import { Phone } from 'lucide-react';
import { BookSessionForm } from './forms/BookSessionForm';
import { BecomeMentorForm } from './forms/BecomeMentorForm';
import { useNavigate } from 'react-router-dom';

export const HallOfFame = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false);
  const navigate = useNavigate();

  const team = [
    
    {
      name: "Sejal Tiwari",
      role: "Volunteers",
      expertise: ["Event Coordination", "Technical Operations", "Team Management"],
      email: "tiwarisejal80@gmail.com",
      image: "https://i.ibb.co/0pCqJfQY/Whats-App-Image-2025-04-29-at-8-31-07-PM.jpg",
      socials: {
        github: "https://github.com/Sejalhere",
        linkedin: "https://www.linkedin.com/in/sejaltiwari13",
        instagram: "https://www.instagram.com/sejallllll._.13"
      }
    },
    {
      name: "Satyam Sharma",
      role: "CFO-Cheif Finance Officer",
      expertise: ["Financial Planning & Analysis","Budgeting & Forecasting","Risk Management","Corporate Finance","Strategic Investments"],
      email: "satyam.cfo@cyberhx.com",
      image: "https://i.ibb.co/zWM2CbK1/Whats-App-Image-2025-09-28-at-7-23-39-PM-removebg-preview.png",
      socials: {
        linkedin: "https://www.linkedin.com/in/satyam-sharma-32a507326?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
        instagram: "https://www.instagram.com/satyams0s?igsh=MWwwejNnZTNuMXFleQ=="
      }
    }
  
  ];

  const categories = [
    { id: 'all', label: 'All Members' },
    { id: 'volunteers', label: 'Volunteers' }
  ];

  const filteredTeam = team.filter(member => {
    const matchesCategory = selectedCategory === 'all' || 
                          
                          (selectedCategory === 'volunteers' && member.role === 'Volunteer');
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.expertise.some(exp => exp.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="py-24 bg-dark-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold gradient-text mb-6"
          >
            Our Team
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Meet the dedicated individuals who make our community thrive
          </motion.p>
        </div>

        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search members..."
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
                  <Filter className="w-4 h-4 mr-2" />
                  <span>{category.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTeam.map((member, index) => (
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
                    src={member.image}
                    alt={member.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-white">{member.name}</h3>
                    <p className="text-primary">{member.role}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  {member.expertise.map((exp, i) => (
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
                <div className="space-y-2">
                  <div className="flex items-center text-gray-400">
                    
                    <span>{member.contact}</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <Mail className="w-4 h-4 text-primary mr-2" />
                    <span>{member.email}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-dark-100 flex items-center justify-center space-x-6">
                {member.socials.github && (
                  <a 
                    href={member.socials.github}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {member.socials.linkedin && (
                  <a 
                    href={member.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {member.socials.instagram && (
                  <a 
                    href={member.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isMentorModalOpen}
        onClose={() => setIsMentorModalOpen(false)}
        title="Join Our Team"
      >
        <BecomeMentorForm onClose={() => setIsMentorModalOpen(false)} />
      </Modal>
    </section>
  );
};