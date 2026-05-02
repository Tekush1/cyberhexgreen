import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Book, Code, Brain, Loader, Check, ArrowRight } from 'lucide-react';

export const RegistrationPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    year: '',
    branch: '',
    interests: [] as string[],
    experience: '',
    expectations: ''
  });

  const tracks = [
    {
      icon: <Code className="w-6 h-6" />,
      name: 'Web Development',
      description: 'Master modern web technologies and frameworks'
    },
    {
      icon: <Brain className="w-6 h-6" />,
      name: 'Machine Learning',
      description: 'Dive into AI, ML, and data science'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      name: 'Cybersecurity',
      description: 'Learn ethical hacking and security practices'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          subject: 'New Hackathon Registration',
          ...formData
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          college: '',
          year: '',
          branch: '',
          interests: [],
          experience: '',
          expectations: ''
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

  return (
    <div className="min-h-screen bg-dark-300 py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold gradient-text mb-4"
          >
            Join FutureHack 2.0
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400"
          >
            Register now to be part of India's largest student hackathon
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-effect rounded-xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-dark-100 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-dark-100 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-dark-100 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary"
                    placeholder="+91 1234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  College/University *
                </label>
                <div className="relative">
                  <Book className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-dark-100 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary"
                    placeholder="Your Institution"
                  />
                </div>
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
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
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
              <label className="block text-sm font-medium text-gray-300 mb-4">
                Areas of Interest
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tracks.map((track) => (
                  <motion.div
                    key={track.name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl cursor-pointer ${
                      formData.interests.includes(track.name)
                        ? 'bg-primary/20 border-2 border-primary'
                        : 'bg-dark-100 hover:bg-dark-200'
                    }`}
                    onClick={() => handleInterestToggle(track.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-primary">{track.icon}</div>
                      <div>
                        <h3 className="font-medium text-white">{track.name}</h3>
                        <p className="text-sm text-gray-400">{track.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prior Experience
              </label>
              <textarea
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                placeholder="Tell us about your experience in these areas..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What do you hope to achieve?
              </label>
              <textarea
                name="expectations"
                value={formData.expectations}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                placeholder="Share your goals and expectations..."
              />
            </div>

            {status === 'error' && (
              <div className="text-red-500 text-center">
                Something went wrong. Please try again.
              </div>
            )}

            {status === 'success' && (
              <div className="text-green-500 text-center">
                Registration successful! We'll be in touch soon.
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="animate-spin mr-2" size={20} />
                    Submitting...
                  </>
                ) : status === 'success' ? (
                  <>
                    <Check className="mr-2" size={20} />
                    Registered
                  </>
                ) : (
                  <>
                    Register Now
                    <ArrowRight className="ml-2" size={20} />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default RegistrationPage;