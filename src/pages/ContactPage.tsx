import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader, CheckCircle, XCircle, Briefcase, User, GraduationCap, Code, Calendar, FileText, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ContactPage = () => {
  const [activeTab, setActiveTab] = useState<'contact' | 'internship'>('contact');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Contact form state
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  // Internship form state
  const [internshipData, setInternshipData] = useState({
    fullName: '',
    email: '',
    phone: '',
    college: '',
    year: '',
    branch: '',
    cgpa: '',
    skills: [] as string[],
    experience: '',
    portfolio: '',
    availability: '',
    motivation: '',
    resume: null as File | null
  });

  const skillOptions = [
    'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'C++', 'HTML/CSS',
    'MongoDB', 'MySQL', 'Git', 'Docker', 'AWS', 'Machine Learning',
    'Cybersecurity', 'Blockchain', 'Mobile Development', 'UI/UX Design'
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');
    
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: 'ae826816-f65e-4d6f-8491-3362df582e13',
          subject: 'Contact Form Submission',
          ...contactData
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setContactData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInternshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');
    
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: 'ae826816-f65e-4d6f-8491-3362df582e13',
          subject: 'Internship Application',
          ...internshipData,
          skills: internshipData.skills.join(', '),
          resumeNote: internshipData.resume ? `Resume file: ${internshipData.resume.name}` : 'No resume uploaded'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setInternshipData({
          fullName: '',
          email: '',
          phone: '',
          college: '',
          year: '',
          branch: '',
          cgpa: '',
          skills: [],
          experience: '',
          portfolio: '',
          availability: '',
          motivation: '',
          resume: null
        });
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInternshipChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInternshipData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkillToggle = (skill: string) => {
    setInternshipData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInternshipData(prev => ({ ...prev, resume: file }));
    }
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
            Get in Touch
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400"
          >
            Have questions or want to join our team? We'd love to hear from you.
          </motion.p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="glass-effect rounded-xl p-2 inline-flex">
            <button
              onClick={() => setActiveTab('contact')}
              className={`flex items-center px-6 py-3 rounded-lg transition-all ${
                activeTab === 'contact'
                  ? 'bg-primary text-dark-300'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact Us
            </button>
            <button
              onClick={() => setActiveTab('internship')}
              className={`flex items-center px-6 py-3 rounded-lg transition-all ${
                activeTab === 'internship'
                  ? 'bg-primary text-dark-300'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Briefcase className="w-5 h-5 mr-2" />
              Apply for Internship
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'contact' ? (
            <motion.div
              key="contact"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid md:grid-cols-2 gap-12"
            >
              <div className="space-y-8">
                <div className="glass-effect rounded-xl p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Email</h3>
                      <p className="text-gray-400">mackystech@gmail.com</p>
                    </div>
                  </div>
                </div>

                <div className="glass-effect rounded-xl p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Phone</h3>
                      <p className="text-gray-400">+91 8235910315</p>
                    </div>
                  </div>
                </div>

                <div className="glass-effect rounded-xl p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Location</h3>
                      <p className="text-gray-400">Macky's Technology, Bhopal</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <form onSubmit={handleContactSubmit} className="glass-effect rounded-xl p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={contactData.name}
                        onChange={handleContactChange}
                        className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={contactData.email}
                        onChange={handleContactChange}
                        className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={contactData.subject}
                        onChange={handleContactChange}
                        className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Message
                      </label>
                      <textarea
                        name="message"
                        value={contactData.message}
                        onChange={handleContactChange}
                        rows={4}
                        className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    {status === 'success' && (
                      <div className="flex items-center text-green-500">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Message sent successfully!
                      </div>
                    )}

                    {status === 'error' && (
                      <div className="flex items-center text-red-500">
                        <XCircle className="w-5 h-5 mr-2" />
                        Failed to send message. Please try again.
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary text-dark-300 px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader className="animate-spin mr-2" size={18} />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="internship"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="glass-effect rounded-xl p-8">
                <div className="text-center mb-8">
                  <div className="bg-primary/10 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Briefcase className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">Join Our Internship Program</h2>
                  <p className="text-gray-400 max-w-2xl mx-auto">
                    Get hands-on experience with cutting-edge technology projects and work alongside industry experts.
                  </p>
                </div>

                <form onSubmit={handleInternshipSubmit} className="space-y-8">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                      <User className="w-5 h-5 text-primary mr-2" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={internshipData.fullName}
                          onChange={handleInternshipChange}
                          required
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={internshipData.email}
                          onChange={handleInternshipChange}
                          required
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                          placeholder="your.email@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={internshipData.phone}
                          onChange={handleInternshipChange}
                          required
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                          placeholder="+91 1234567890"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Portfolio/GitHub URL
                        </label>
                        <input
                          type="url"
                          name="portfolio"
                          value={internshipData.portfolio}
                          onChange={handleInternshipChange}
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                          placeholder="https://github.com/yourusername"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                      <GraduationCap className="w-5 h-5 text-primary mr-2" />
                      Academic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          College/University *
                        </label>
                        <input
                          type="text"
                          name="college"
                          value={internshipData.college}
                          onChange={handleInternshipChange}
                          required
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                          placeholder="Your institution name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Year of Study *
                        </label>
                        <select
                          name="year"
                          value={internshipData.year}
                          onChange={handleInternshipChange}
                          required
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        >
                          <option value="">Select year</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                          <option value="graduate">Graduate</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Branch/Stream *
                        </label>
                        <input
                          type="text"
                          name="branch"
                          value={internshipData.branch}
                          onChange={handleInternshipChange}
                          required
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                          placeholder="e.g., Computer Science"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          CGPA/Percentage
                        </label>
                        <input
                          type="text"
                          name="cgpa"
                          value={internshipData.cgpa}
                          onChange={handleInternshipChange}
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                          placeholder="e.g., 8.5 CGPA or 85%"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Skills & Experience */}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                      <Code className="w-5 h-5 text-primary mr-2" />
                      Skills & Experience
                    </h3>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-4">
                        Technical Skills
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {skillOptions.map((skill) => (
                          <motion.button
                            key={skill}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSkillToggle(skill)}
                            className={`p-3 rounded-lg text-sm transition-all ${
                              internshipData.skills.includes(skill)
                                ? 'bg-primary text-dark-300'
                                : 'bg-dark-100 text-gray-300 hover:bg-dark-200'
                            }`}
                          >
                            {skill}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Availability
                        </label>
                        <select
                          name="availability"
                          value={internshipData.availability}
                          onChange={handleInternshipChange}
                          required
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        >
                          <option value="">Select availability</option>
                          <option value="immediate">Immediate (within 1 week)</option>
                          <option value="2weeks">Within 2 weeks</option>
                          <option value="1month">Within 1 month</option>
                          <option value="flexible">Flexible</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Resume/CV (PDF)
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-dark-300 file:font-medium hover:file:bg-secondary"
                        />
                        {internshipData.resume && (
                          <p className="text-sm text-gray-400 mt-2">
                            Selected: {internshipData.resume.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Relevant Experience
                      </label>
                      <textarea
                        name="experience"
                        value={internshipData.experience}
                        onChange={handleInternshipChange}
                        rows={4}
                        className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="Describe your relevant experience, projects, or coursework..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Why do you want to join CyberHx? *
                      </label>
                      <textarea
                        name="motivation"
                        value={internshipData.motivation}
                        onChange={handleInternshipChange}
                        required
                        rows={4}
                        className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="Tell us about your motivation and what you hope to achieve..."
                      />
                    </div>
                  </div>

                  {status === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-500">Application submitted successfully! We'll get back to you soon.</span>
                    </motion.div>
                  )}

                  {status === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3"
                    >
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-500">Something went wrong. Please try again.</span>
                    </motion.div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || !internshipData.fullName || !internshipData.email || !internshipData.motivation}
                      className="bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader className="animate-spin mr-2" size={20} />
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          Submit Application
                          <Send className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Benefits Section */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-effect rounded-xl p-6 text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Star className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Real Projects</h3>
                  <p className="text-gray-400">Work on production-ready applications with real impact</p>
                </div>

                <div className="glass-effect rounded-xl p-6 text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Expert Mentorship</h3>
                  <p className="text-gray-400">Learn from industry professionals and experienced developers</p>
                </div>

                <div className="glass-effect rounded-xl p-6 text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Certificate & LOR</h3>
                  <p className="text-gray-400">Receive completion certificate and letter of recommendation</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};