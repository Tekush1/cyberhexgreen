import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Users, Clock, MapPin, Star, ArrowRight, Shield, Code, Brain, Target, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface HiringPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HiringPopup: React.FC<HiringPopupProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    college: '',
    year: '',
    branch: '',
    position: '',
    experience: '',
    skills: [] as string[],
    portfolio: '',
    availability: '',
    motivation: '',
    resume: null as File | null
  });

  const positions = [
    {
      id: 'cybersecurity-intern',
      title: 'Cybersecurity Intern',
      icon: <Shield className="w-6 h-6" />,
      description: 'Work on security research, vulnerability assessment, and threat analysis',
      requirements: ['Basic knowledge of cybersecurity', 'Familiarity with Linux', 'Interest in ethical hacking'],
      duration: '3-6 months',
      stipend: '₹15,000 - ₹25,000/month'
    },
    {
      id: 'fullstack-intern',
      title: 'Full Stack Developer Intern',
      icon: <Code className="w-6 h-6" />,
      description: 'Develop and maintain web applications for our cybersecurity platform',
      requirements: ['React/Node.js experience', 'Database knowledge', 'API development skills'],
      duration: '3-6 months',
      stipend: '₹12,000 - ₹20,000/month'
    },
    {
      id: 'ai-intern',
      title: 'AI/ML Intern',
      icon: <Brain className="w-6 h-6" />,
      description: 'Build AI models for threat detection and security automation',
      requirements: ['Python/TensorFlow', 'Machine Learning basics', 'Data analysis skills'],
      duration: '3-6 months',
      stipend: '₹18,000 - ₹28,000/month'
    },
    {
      id: 'research-intern',
      title: 'Security Research Intern',
      icon: <Target className="w-6 h-6" />,
      description: 'Conduct research on emerging threats and security technologies',
      requirements: ['Research mindset', 'Technical writing', 'Security fundamentals'],
      duration: '3-6 months',
      stipend: '₹10,000 - ₹18,000/month'
    }
  ];

  const skillOptions = [
    'Python', 'JavaScript', 'React', 'Node.js', 'Cybersecurity', 'Linux', 'Docker',
    'Machine Learning', 'TensorFlow', 'Penetration Testing', 'Network Security',
    'Web Security', 'Blockchain', 'Cloud Computing', 'DevOps', 'SQL', 'MongoDB'
  ];

  const benefits = [
    'Hands-on experience with real projects',
    'Mentorship from industry experts',
    'Certificate of completion',
    'Potential for full-time offer',
    'Flexible working hours',
    'Remote work opportunities'
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, resume: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would send the form data to your backend
      console.log('Form submitted:', formData);
      
      setSubmitStatus('success');
      setTimeout(() => {
        onClose();
        setCurrentStep(1);
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          college: '',
          year: '',
          branch: '',
          position: '',
          experience: '',
          skills: [],
          portfolio: '',
          availability: '',
          motivation: '',
          resume: null
        });
        setSubmitStatus('idle');
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const selectedPosition = positions.find(p => p.id === formData.position);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-dark-200 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-dark-200 border-b border-gray-700 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Briefcase className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Join CyberHx Team</h2>
                    <p className="text-gray-400">Internship Opportunities Available</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-dark-100"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Step {currentStep} of 3</span>
                  <span className="text-sm text-gray-400">{Math.round((currentStep / 3) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-dark-100 rounded-full h-2">
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / 3) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Available Positions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {positions.map((position) => (
                          <motion.div
                            key={position.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`p-4 rounded-xl cursor-pointer transition-all ${
                              formData.position === position.id
                                ? 'bg-primary/20 border-2 border-primary'
                                : 'bg-dark-100 hover:bg-dark-300 border-2 border-transparent'
                            }`}
                            onClick={() => setFormData(prev => ({ ...prev, position: position.id }))}
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-primary">{position.icon}</div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-white mb-1">{position.title}</h4>
                                <p className="text-gray-400 text-sm mb-3">{position.description}</p>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span className="text-sm text-gray-300">{position.duration}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-primary" />
                                    <span className="text-sm text-gray-300">{position.stipend}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Why Join CyberHx?</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                            <span className="text-gray-300">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-white mb-4">Personal Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
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
                          value={formData.email}
                          onChange={handleInputChange}
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
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                          placeholder="+91 1234567890"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          College/University *
                        </label>
                        <input
                          type="text"
                          name="college"
                          value={formData.college}
                          onChange={handleInputChange}
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
                          value={formData.year}
                          onChange={handleInputChange}
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
                          value={formData.branch}
                          onChange={handleInputChange}
                          required
                          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                          placeholder="e.g., Computer Science"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Skills & Technologies
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {skillOptions.map((skill) => (
                          <motion.button
                            key={skill}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSkillToggle(skill)}
                            className={`p-2 rounded-lg text-sm transition-all ${
                              formData.skills.includes(skill)
                                ? 'bg-primary text-dark-300'
                                : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
                            }`}
                          >
                            {skill}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Portfolio/GitHub URL
                      </label>
                      <input
                        type="url"
                        name="portfolio"
                        value={formData.portfolio}
                        onChange={handleInputChange}
                        className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="https://github.com/yourusername"
                      />
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-white mb-4">Additional Details</h3>

                    {selectedPosition && (
                      <div className="bg-dark-100 rounded-xl p-4 mb-6">
                        <h4 className="font-semibold text-white mb-2">Selected Position: {selectedPosition.title}</h4>
                        <p className="text-gray-400 text-sm mb-3">{selectedPosition.description}</p>
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-primary">Requirements:</h5>
                          {selectedPosition.requirements.map((req, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-primary" />
                              <span className="text-gray-300 text-sm">{req}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Relevant Experience
                      </label>
                      <textarea
                        name="experience"
                        value={formData.experience}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="Describe your relevant experience, projects, or coursework..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={formData.availability}
                        onChange={handleInputChange}
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
                        Why do you want to join CyberHx? *
                      </label>
                      <textarea
                        name="motivation"
                        value={formData.motivation}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="Tell us about your motivation and what you hope to achieve..."
                      />
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
                      {formData.resume && (
                        <p className="text-sm text-gray-400 mt-2">
                          Selected: {formData.resume.name}
                        </p>
                      )}
                    </div>

                    {submitStatus === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-500">Application submitted successfully! We'll get back to you soon.</span>
                      </motion.div>
                    )}

                    {submitStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3"
                      >
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-500">Something went wrong. Please try again.</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-dark-200 border-t border-gray-700 p-6 rounded-b-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Remote & Hybrid opportunities available</span>
                </div>
                
                <div className="flex gap-3">
                  {currentStep > 1 && (
                    <button
                      onClick={prevStep}
                      disabled={isSubmitting}
                      className="px-6 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Previous
                    </button>
                  )}
                  
                  {currentStep < 3 ? (
                    <motion.button
                      onClick={nextStep}
                      disabled={!formData.position}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-primary text-dark-300 px-6 py-2 rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      Next Step
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !formData.fullName || !formData.email || !formData.motivation}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-primary text-dark-300 px-6 py-2 rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-dark-300 border-t-transparent rounded-full mr-2"
                          />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Application
                          <Send className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};