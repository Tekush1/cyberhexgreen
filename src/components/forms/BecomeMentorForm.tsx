import React, { useState } from 'react';
import { Loader } from 'lucide-react';

interface BecomeMentorFormProps {
  onClose: () => void;
}

export const BecomeMentorForm: React.FC<BecomeMentorFormProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    background: '',
    expertise: [] as string[],
    availability: [] as string[],
    motivation: ''
  });

  const expertiseAreas = [
    'Web Development',
    'Mobile Development',
    'Machine Learning',
    'Data Science',
    'DevOps',
    'Cybersecurity',
    'UI/UX Design',
    'Cloud Computing'
  ];

  const availabilityOptions = [
    'Weekday Mornings',
    'Weekday Afternoons',
    'Weekday Evenings',
    'Weekend Mornings',
    'Weekend Afternoons',
    'Weekend Evenings'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExpertiseChange = (area: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(area)
        ? prev.expertise.filter(a => a !== area)
        : [...prev.expertise, area]
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');
    
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: 'ae826816-f65e-4d6f-8491-3362df582e13',
          subject: 'New Mentor Application',
          ...formData,
          expertise: formData.expertise.join(', '),
          availability: formData.availability.join(', ')
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setTimeout(() => onClose(), 1500);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="background" className="block text-sm font-medium text-gray-300 mb-2">
          Professional Background
        </label>
        <textarea
          id="background"
          name="background"
          value={formData.background}
          onChange={handleChange}
          rows={4}
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
          placeholder="Tell us about your professional experience..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Areas of Expertise
        </label>
        <div className="grid grid-cols-2 gap-4">
          {expertiseAreas.map(area => (
            <label key={area} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.expertise.includes(area)}
                onChange={() => handleExpertiseChange(area)}
                className="form-checkbox bg-dark-100 border-gray-700 rounded text-primary focus:ring-primary focus:ring-offset-dark-200"
              />
              <span className="text-gray-300">{area}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="availability" className="block text-sm font-medium text-gray-300 mb-2">
          Availability
        </label>
        <select
          id="availability"
          name="availability"
          multiple
          value={formData.availability}
          onChange={(e) => {
            const values = Array.from(e.target.selectedOptions, option => option.value);
            setFormData(prev => ({ ...prev, availability: values }));
          }}
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
          size={4}
        >
          {availabilityOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <p className="text-sm text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple options</p>
      </div>

      <div>
        <label htmlFor="motivation" className="block text-sm font-medium text-gray-300 mb-2">
          Why do you want to mentor?
        </label>
        <textarea
          id="motivation"
          name="motivation"
          value={formData.motivation}
          onChange={handleChange}
          rows={4}
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
          placeholder="Share your motivation for becoming a mentor..."
        />
      </div>

      {status === 'error' && (
        <p className="text-red-500">Something went wrong. Please try again.</p>
      )}
      
      {status === 'success' && (
        <p className="text-green-500">Application submitted successfully!</p>
      )}

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary text-dark-300 px-6 py-2 rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin mr-2" size={18} />
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </button>
      </div>
    </form>
  );
};