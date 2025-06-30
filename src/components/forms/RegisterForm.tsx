import React, { useState } from 'react';
import { Loader } from 'lucide-react';

interface RegisterFormProps {
  onClose: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStatus('success');
      setTimeout(() => onClose(), 1500);
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
          required
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="program" className="block text-sm font-medium text-gray-300 mb-2">
          Preferred Program
        </label>
        <select
          id="program"
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        >
          <option value="">Select a program</option>
          <option value="web">Web Development</option>
          <option value="mobile">Mobile Development</option>
          <option value="ml">Machine Learning</option>
          <option value="cyber">Cybersecurity</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
          Brief Message
        </label>
        <textarea
          id="message"
          rows={4}
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        />
      </div>

      {status === 'error' && (
        <p className="text-red-500">Something went wrong. Please try again.</p>
      )}
      
      {status === 'success' && (
        <p className="text-green-500">Registration successful!</p>
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
            'Register'
          )}
        </button>
      </div>
    </form>
  );
};