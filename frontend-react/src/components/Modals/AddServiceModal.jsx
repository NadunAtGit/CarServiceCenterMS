import React, { useState } from 'react';
import axiosInstance from '../../utils/AxiosInstance';

const AddServiceModal = ({ onClose, onServiceAdded }) => {
  const [formData, setFormData] = useState({
    ServiceName: '',
    Description: '',
    Price: '',
    TypeService: 'Repair', // Default selection
    Duration: ''
  });
  
  const [errors, setErrors] = useState({
    ServiceName: '',
    Description: '',
    Price: '',
    TypeService: '',
    Duration: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      ServiceName: !formData.ServiceName ? 'Service name is required' : 
                 formData.ServiceName.length > 100 ? 'Service name cannot exceed 100 characters' : '',
      Description: formData.Description.length > 500 ? 'Description cannot exceed 500 characters' : '',
      Price: !formData.Price ? 'Price is required' : 
            isNaN(formData.Price) || parseFloat(formData.Price) <= 0 ? 
            'Price must be a positive number' : '',
      TypeService: !formData.TypeService ? 'Service type is required' : '',
      Duration: !formData.Duration ? 'Duration is required' : 
               isNaN(formData.Duration) || parseInt(formData.Duration) <= 0 ? 
               'Duration must be a positive whole number (minutes)' : ''
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await axiosInstance.post('api/cashier/services/add', {
        ...formData,
        Price: parseFloat(formData.Price),
        Duration: parseInt(formData.Duration)
      });
      
      if (response.status === 201) {
        onServiceAdded();
        onClose();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add service';
      setErrors(prev => ({ ...prev, form: errorMessage }));
      console.error('Error adding service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-200 bg-opacity-30 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#7A40C2]">Add New Service</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {errors.form && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{errors.form}</span>
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
              className={`w-full px-3 py-2 border ${errors.ServiceName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA]`}
              placeholder="Enter service name"
              maxLength="100"
            />
            {errors.ServiceName && <p className="mt-1 text-sm text-red-600">{errors.ServiceName}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Description
            </label>
            <textarea
              name="Description"
              value={formData.Description}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.Description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA]`}
              placeholder="Enter service description"
              rows="3"
              maxLength="500"
            />
            {errors.Description && <p className="mt-1 text-sm text-red-600">{errors.Description}</p>}
            <p className="text-xs text-gray-500 mt-1">{formData.Description.length}/500 characters</p>
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
              className={`w-full px-3 py-2 border ${errors.Price ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA]`}
              placeholder="Enter service price"
              step="0.01"
              min="0"
            />
            {errors.Price && <p className="mt-1 text-sm text-red-600">{errors.Price}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              name="TypeService"
              value={formData.TypeService}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.TypeService ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white`}
            >
              <option value="Repair">Repair</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inspection">Inspection</option>
            </select>
            {errors.TypeService && <p className="mt-1 text-sm text-red-600">{errors.TypeService}</p>}
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
              className={`w-full px-3 py-2 border ${errors.Duration ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA]`}
              placeholder="Enter duration in minutes"
              min="1"
            />
            {errors.Duration && <p className="mt-1 text-sm text-red-600">{errors.Duration}</p>}
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
                  Adding...
                </>
              ) : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddServiceModal;