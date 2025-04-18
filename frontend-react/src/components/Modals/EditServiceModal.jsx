import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';

const EditServiceModal = ({ service, onClose, onServiceUpdated }) => {
  const [formData, setFormData] = useState({
    ServiceName: '',
    Description: '',
    Price: '',
    TypeService: '',
    Duration: ''
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        ServiceName: service.ServiceName || '',
        Description: service.Description || '',
        Price: service.Price || '',
        TypeService: service.TypeService || 'Repair',
        Duration: service.Duration || ''
      });
    }
  }, [service]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.ServiceName || !formData.Price || !formData.TypeService || !formData.Duration) {
      setError('All fields except Description are required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await axiosInstance.put(`api/cashier/services/${service.ServiceID}`, formData);
      
      if (response.status === 200) {
        onServiceUpdated();
      } else {
        setError(response.data.message || 'Failed to update service');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update service';
      setError(errorMessage);
      console.error('Error updating service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!service) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#7A40C2]">Edit Service #{service.ServiceID}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="ServiceName"
              value={formData.ServiceName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA]"
              placeholder="Enter service name"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Description
            </label>
            <textarea
              name="Description"
              value={formData.Description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA]"
              placeholder="Enter service description"
              rows="3"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="Price"
              value={formData.Price}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA]"
              placeholder="Enter service price"
              step="0.01"
              min="0"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              name="TypeService"
              value={formData.TypeService}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white"
              required
            >
              <option value="Repair">Repair</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inspection">Inspection</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="Duration"
              value={formData.Duration}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA]"
              placeholder="Enter duration in minutes"
              min="1"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#7A40C2] hover:bg-[#6b38b3] text-white rounded-lg transition-colors flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : 'Update Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditServiceModal;