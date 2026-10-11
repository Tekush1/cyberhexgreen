import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import { submitForm } from '../../lib/forms';

interface BookSessionFormProps {
  onClose: () => void;
}

export const BookSessionForm: React.FC<BookSessionFormProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    date: '',
    time: '',
    sessionType: '',
    notes: ''
  });

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM',
    '02:00 PM', '03:00 PM', '04:00 PM'
  ];

  const sessionTypes = [
    'One-on-One Mentoring',
    'Code Review',
    'Career Guidance',
    'Technical Interview Prep'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');
    
    try {
      // Emails the team AND saves to Supabase (Admin → Inbox).
      const result = await submitForm({
        subject: 'New Session Booking',
        table: 'form_submissions',
        replyTo: formData.email,
        row: {
          form: 'session',
          name: formData.name,
          email: formData.email,
          subject: formData.sessionType ? `Session: ${formData.sessionType}` : 'Session booking',
          message: formData.notes,
          page: window.location.pathname,
          data: { date: formData.date, time: formData.time, session_type: formData.sessionType },
        },
        email: formData,
      });

      if (result.ok) {
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
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
          Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
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
        <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-2">
          Preferred Date *
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          min={new Date().toISOString().split('T')[0]}
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="time" className="block text-sm font-medium text-gray-300 mb-2">
          Preferred Time *
        </label>
        <select
          id="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          required
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        >
          <option value="">Select a time slot</option>
          {timeSlots.map(slot => (
            <option key={slot} value={slot}>{slot}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sessionType" className="block text-sm font-medium text-gray-300 mb-2">
          Session Type *
        </label>
        <select
          id="sessionType"
          name="sessionType"
          value={formData.sessionType}
          onChange={handleChange}
          required
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        >
          <option value="">Select session type</option>
          {sessionTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
          Additional Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
          className="w-full bg-dark-100 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
        />
      </div>

      {status === 'error' && (
        <p className="text-red-500">Something went wrong. Please try again.</p>
      )}
      
      {status === 'success' && (
        <p className="text-green-500">Session booked successfully!</p>
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
              Booking...
            </>
          ) : (
            'Book Session'
          )}
        </button>
      </div>
    </form>
  );
};