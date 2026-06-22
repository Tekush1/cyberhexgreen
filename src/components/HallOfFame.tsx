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
    role: "Volunteer",
    expertise: [
      "Event Coordination",
      "Technical Operations",
      "Team Management"
    ],
    email: "tiwarisejal80@gmail.com",
    image: "https://i.ibb.co/0pCqJfQY/Whats-App-Image-2025-04-29-at-8-31-07-PM.jpg",
    socials: {
      github: "https://github.com/Sejalhere",
      linkedin: "https://www.linkedin.com/in/sejaltiwari13",
      instagram: "https://www.instagram.com/sejal._.13"
    }
  },

  {
    name: "Rinshi Trivedi",
    role: "Social Media Manager",
    expertise: [
      "Event Coordination",
      "Strategic Planning",
      "Team Management"
    ],
    email: "rinshitrivedi195@gmail.com",
    image: "https://i.ibb.co/5p939Cj/Chat-GPT-Image-Jun-5-2026-02-55-29-PM.png",
    socials: {
      instagram: "https://www.instagram.com/iamrinshitrivedi"
    }
  },

  {
    name: "Ritesh Ekbote",
    role: "Cybersecurity Researcher",
    expertise: [
      "Bug Bounty Hunting",
      "Web Security",
      "CTF Development"
    ],
    email: "babycoder143@gmail.com",
    image: "https://media.licdn.com/dms/image/v2/D4E03AQEdGwpoaCumUA/profile-displayphoto-crop_800_800/B4EZlL6wnrIQAI-/0/1757915319542?e=1782345600&v=beta&t=iIYnyypRwUFwNxD46ECHueiwfsgDLNz3Gny1V2JHxfY",
    socials: {
      github: "https://github.com/riteshekbote",
      linkedin: "https://www.linkedin.com/in/uml0zxnorwtib3rl",
      instagram: "https://www.instagram.com/baby_coder_143/"
    }
  },

  {
    name: "Samit Pal",
    role: "Event Lead",
    expertise: [
      "Event Management",
      "Team Coordination",
      "Leadership",
      "System Design"
    ],
    email: "samitpal.work@gmail.com",
    image: "https://i.ibb.co/nsr49BLB/Chat-GPT-Image-Jun-13-2026-01-39-04-AM.png",
    socials: {
      github: "https://github.com/spam-codes",
      linkedin: "https://www.linkedin.com/in/samit-pal-48a068310",
      instagram: "https://instagram.com/0xSamit"
    }
  },
   {
    name: "Prerna Eshwar",
    role: "Frontend Developer",
   expertise: [
  "User Experience (UX)",
  "User Interface (UI)",
  "Responsive Web Design",
  "Frontend Development",
  "Accessibility"
],
    email: "violettttt@proton.me",
    image: "https://i.ibb.co/dw3kpkqx/Whats-App-Image-2026-06-22-at-9-43-51-AM.jpg",
    socials: {
      github: "https://github.com/Pr-e-rna",
      linkedin: "https://www.linkedin.com/in/prerna-ishwar-a6a118282"
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