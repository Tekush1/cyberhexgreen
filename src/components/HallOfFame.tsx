import React, { useState } from 'react';

import {
  Github,
  Linkedin,
  Mail,
  Search,
  Instagram
} from 'lucide-react';

import { motion } from 'framer-motion';

import { Modal } from './shared/Modal';
import { BecomeMentorForm } from './forms/BecomeMentorForm';

export const HallOfFame = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false);

  const team = [
    // =========================
    // MENTORS
    // =========================

    {
      name: "Kushagra Dwivedi",
      type: "mentor",
      organizer: true,
      role: "Founder of CyberHX | Web & Network Pentester",
      expertise: [
        "Cybersecurity",
        "Ethical Hacking",
        "DevSecOps"
      ],
      email: "kushdwivedikd@gmail.com",
      image:
        "https://i.ibb.co/kscBzpxZ/Whats-App-Image-2025-07-01-at-1-02-59-AM.jpg",
      socials: {
        github: "https://github.com/tekush1",
        linkedin:
          "https://www.linkedin.com/in/kushagra-dwivedi-0342062b/"
      }
    },

    {
      name: "Prasad Chinchore",
      type: "mentor",
      role: "Penetration Tester | Red Teamer | SOC Trainer",
      expertise: [
        "Web Application Pentesting",
        "Cloud Security",
        "VAPT"
      ],
      email: "pdchinchore2005@gmail.com",
      image:
        "https://i.ibb.co/kg13yFGG/Prasad-Photo-Prasad-Chinchore.jpg",
      socials: {
        github: "https://github.com/cybxmonk/",
        linkedin: "https://www.linkedin.com/in/prx02/",
        instagram: "https://www.instagram.com/prx02_"
      }
    },

    {
      name: "Mithun M Achary",
      type: "mentor",
      role: "A.I Security Engineer | Red Teamer | CTF Player",
      expertise: [
        "Web Pentesting",
        "Network Security",
        "AI Security",
        "Threat Intelligence"
      ],
      email: "ccryptonite1@gmail.com",
      image:
        "https://i.ibb.co/DgWyfDyg/Whats-App-Image-2026-06-21-at-12-34-09-AM.jpg",
      socials: {
        github: "https://github.com/mithunmadhukuttan",
        linkedin:
          "https://www.linkedin.com/in/mithun-m-achary",
        instagram:
          "https://www.instagram.com/Ashwamit2199"
      }
    },

    {
      name: "Kjss Srivatsav",
      type: "mentor",
      role: "Full-Stack Security Enthusiast",
      expertise: [
        "Web Development",
        "Ethical Hacking"
      ],
      email: "vatsav.k.2705@gmail.com",
      image:
        "https://i.ibb.co/KpRM8cTV/Screenshot-from-2026-06-05-18-45-45.png",
      socials: {
        github: "https://github.com/KoyyaJnyandeep",
        linkedin:
          "https://www.linkedin.com/in/jnyandeep-koyya-938a87304"
      }
    },

    {
      name: "Aman Singh Tomar",
      type: "mentor",
      organizer: true,
      role: "Cyber Security Engineer | CEH v12 | Security Researcher",
      expertise: [
        "Pentesting",
        "Network Security"
      ],
      email: "amantomar50948@gmail.com",
      image:
        "https://i.ibb.co/TDd8BKQW/profile-no-star-aman-tomar.png",
      socials: {
        github: "https://github.com/Amansinghtomar12",
        linkedin:
          "https://www.linkedin.com/in/aman-singh-tomar"
      }
    },

    {
      name: "Sathwika Putrevu",
      type: "mentor",
      role: "Cybersecurity Intern @ BCSSL | OSINT Specialist",
      expertise: [
        "OSINT",
        "AI Security Testing"
      ],
      email: "sathwikaputrevu5@gmail.com",
      image:
        "https://i.ibb.co/MkQzktLz/IMG-3647-Sathwika-Putrevu.jpg",
      socials: {
        github: "https://github.com/sa7v1x3n",
        linkedin:
          "https://linkedin.com/in/sathwikaputrevu"
      }
    },

    // =========================
    // TEAM MEMBERS
    // =========================

    {
      name: "Ritesh Ekbote",
      type: "team",
      role: "Cybersecurity Researcher",
      expertise: [
        "Bug Bounty Hunting",
        "Web Security",
        "CTF Development"
      ],
      email: "babycoder143@gmail.com",
      image:
        "https://media.licdn.com/dms/image/v2/D4E03AQEdGwpoaCumUA/profile-displayphoto-crop_800_800/B4EZlL6wnrIQAI-/0/1757915319542?e=1782345600&v=beta&t=iIYnyypRwUFwNxD46ECHueiwfsgDLNz3Gny1V2JHxfY",
      socials: {
        github: "https://github.com/riteshekbote",
        linkedin:
          "https://www.linkedin.com/in/uml0zxnorwtib3rl",
        instagram:
          "https://www.instagram.com/baby_coder_143/"
      }
    },

    {
      name: "Samit Pal",
      type: "team",
      role: "Event Lead",
      expertise: [
        "Event Management",
        "Team Coordination",
        "Leadership",
        "System Design"
      ],
      email: "samitpal.work@gmail.com",
      image:
        "https://i.ibb.co/nsr49BLB/Chat-GPT-Image-Jun-13-2026-01-39-04-AM.png",
      socials: {
        github: "https://github.com/spam-codes",
        linkedin:
          "https://www.linkedin.com/in/samit-pal-48a068310",
        instagram:
          "https://instagram.com/0xSamit"
      }
    },

    // =========================
    // VOLUNTEERS
    // =========================

    {
      name: "Sejal Tiwari",
      type: "volunteer",
      role: "Volunteer",
      expertise: [
        "Event Coordination",
        "Technical Operations",
        "Team Management"
      ],
      email: "tiwarisejal80@gmail.com",
      image:
        "https://i.ibb.co/0pCqJfQY/Whats-App-Image-2025-04-29-at-8-31-07-PM.jpg",
      socials: {
        github: "https://github.com/Sejalhere",
        linkedin:
          "https://www.linkedin.com/in/sejaltiwari13",
        instagram:
          "https://www.instagram.com/sejal._.13"
      }
    },

    // =========================
    // PAST INTERNS
    // =========================

    {
      name: "Prerna Ishwar",
      type: "past-intern",
      role: "Frontend Developer",
      expertise: [
        "User Experience (UX)",
        "User Interface",
        "Responsive Web Design",
        "Frontend Development",
        "Accessibility"
      ],
      email: "violettttt@proton.me",
      image:
        "https://i.ibb.co/dw3kpkqx/Whats-App-Image-2026-06-22-at-9-43-51-AM.jpg",
      socials: {
        github: "https://github.com/Pr-e-rna",
        linkedin:
          "https://www.linkedin.com/in/prerna-ishwar-a6a118282"
      }
    }
  ];

  const matchesSearch = (member: typeof team[number]) => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return true;

    return (
      member.name.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      member.expertise.some((exp) =>
        exp.toLowerCase().includes(query)
      )
    );
  };

  const mentors = team.filter(
    (member) => member.type === 'mentor' && matchesSearch(member)
  );

  const teamMembers = team.filter(
    (member) => member.type === 'team' && matchesSearch(member)
  );

  const volunteers = team.filter(
    (member) =>
      member.type === 'volunteer' && matchesSearch(member)
  );

  const pastInterns = team.filter(
    (member) =>
      member.type === 'past-intern' && matchesSearch(member)
  );

  const MemberCard = ({
    member,
    index
  }: {
    member: typeof team[number];
    index: number;
  }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        className="glass-effect rounded-xl overflow-hidden hover-scale"
      >
        {/* Profile */}

        <div className="relative p-6 pb-4">

          <div className="flex items-start gap-4">

            <img
              src={member.image}
              alt={member.name}
              className="w-20 h-20 rounded-full object-cover"
            />

            <div className="flex-1">

              <h3 className="text-xl font-semibold text-white">
                {member.name}
              </h3>

              <p className="text-primary text-sm mt-1">
                {member.role}
              </p>

            </div>

          </div>

        </div>

        {/* Badges */}

        <div className="px-6 pb-3 flex flex-wrap gap-2">

          {member.organizer && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Organizer
            </span>
          )}

          {member.type === 'mentor' && !member.organizer && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Mentor
            </span>
          )}

          {member.type === 'volunteer' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
              Volunteer
            </span>
          )}

          {member.type === 'past-intern' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Past Intern
            </span>
          )}

          {member.type === 'team' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Team Member
            </span>
          )}

        </div>

        {/* Expertise */}

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

        {/* Email */}

        <div className="px-6 pb-4">

          <div className="flex items-center text-gray-400">

            <Mail className="w-4 h-4 text-primary mr-2 flex-shrink-0" />

            <span className="text-sm truncate">
              {member.email}
            </span>

          </div>

        </div>

        {/* Socials */}

        <div className="px-6 py-4 bg-dark-100 flex items-center justify-center space-x-6">

          {member.socials.github && (
            <a
              href={member.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary transition-colors"
              aria-label={`${member.name} GitHub`}
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
              aria-label={`${member.name} LinkedIn`}
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
              aria-label={`${member.name} Instagram`}
            >
              <Instagram className="w-5 h-5" />
            </a>
          )}

        </div>

      </motion.div>
    );
  };

  return (
    <section className="py-24 bg-dark-300">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* =========================
            HEADER
        ========================= */}

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

        {/* =========================
            SEARCH
        ========================= */}

        <div className="mb-16">

          <div className="relative max-w-3xl mx-auto">

            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />

            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="w-full bg-dark-100 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary"
            />

          </div>

        </div>

        {/* =========================
            OUR MENTORS
        ========================= */}

        {mentors.length > 0 && (
          <section className="mb-20">

            <div className="mb-8">

              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Our Mentors
              </h3>

              <p className="text-gray-400 mt-2">
                Learn from experienced cybersecurity professionals and industry experts.
              </p>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

              {mentors.map((member, index) => (
                <MemberCard
                  key={member.name}
                  member={member}
                  index={index}
                />
              ))}

            </div>

          </section>
        )}

        {/* =========================
            OUR TEAM
        ========================= */}

        {teamMembers.length > 0 && (
          <section className="mb-20">

            <div className="mb-8">

              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Our Team
              </h3>

              <p className="text-gray-400 mt-2">
                The people working behind the community.
              </p>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

              {teamMembers.map((member, index) => (
                <MemberCard
                  key={member.name}
                  member={member}
                  index={index}
                />
              ))}

            </div>

          </section>
        )}

        {/* =========================
            VOLUNTEERS
        ========================= */}

        {volunteers.length > 0 && (
          <section className="mb-20">

            <div className="mb-8">

              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Volunteers
              </h3>

              <p className="text-gray-400 mt-2">
                The people who help make our events and community possible.
              </p>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

              {volunteers.map((member, index) => (
                <MemberCard
                  key={member.name}
                  member={member}
                  index={index}
                />
              ))}

            </div>

          </section>
        )}

        {/* =========================
            PAST INTERNS — LAST
        ========================= */}

        {pastInterns.length > 0 && (
          <section>

            <div className="mb-8">

              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Past Interns
              </h3>

              <p className="text-gray-400 mt-2">
                Former interns who contributed to CyberHX and grew with the community.
              </p>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

              {pastInterns.map((member, index) => (
                <MemberCard
                  key={member.name}
                  member={member}
                  index={index}
                />
              ))}

            </div>

          </section>
        )}

        {/* =========================
            NO RESULTS
        ========================= */}

        {mentors.length === 0 &&
          teamMembers.length === 0 &&
          volunteers.length === 0 &&
          pastInterns.length === 0 && (
            <div className="text-center py-16">

              <Search className="w-10 h-10 text-gray-600 mx-auto mb-4" />

              <h3 className="text-xl font-semibold text-white mb-2">
                No members found
              </h3>

              <p className="text-gray-400">
                Try searching with a different name, role, or expertise.
              </p>

            </div>
          )}

      </div>

      {/* =========================
          MENTOR MODAL
      ========================= */}

      <Modal
        isOpen={isMentorModalOpen}
        onClose={() => setIsMentorModalOpen(false)}
        title="Join Our Team"
      >
        <BecomeMentorForm
          onClose={() => setIsMentorModalOpen(false)}
        />
      </Modal>

    </section>
  );
};