import React, { useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';

const RegisterPartModal = ({ isOpen, onClose, onPartRegistered }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setError('');

    try {
      const response = await axiosInstance.post('/api/cashier/addpart', {
        Name: name,
        Description: description
      });

      if (response.status === 201) {
        setMessage(response.data.message || 'Part added successfully!');
        setName('');
        setDescription('');
        if (onPartRegistered) onPartRegistered(); // Notify parent
        onClose(); // Close modal
      } else {
        setError(response.data.message || 'Failed to add part');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to add part. Please try again.';
      setError(errorMessage);
      console.error('Error adding part:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/50 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4 text-[#7A40C2]">Register New Part</h3>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {message && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 transition-colors bg-white/80"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-[#7A40C2] text-white rounded-full ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#6b38b3]'} transition-colors flex items-center justify-center`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                'Add Part'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPartModal;
