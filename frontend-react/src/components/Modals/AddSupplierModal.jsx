import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import axiosInstance from '../../utils/axiosInstance';

const AddSupplierModal = ({ onClose, getSuppliers }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telephone: '',
    address: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.telephone || !formData.address) {
      setError("All fields are required");
      return false;
    }

    // Simple email validation
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Simple phone validation (at least 10 digits)
    if (!/^\d{10,}$/.test(formData.telephone.replace(/\D/g, ''))) {
      setError("Please enter a valid phone number (at least 10 digits)");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await axiosInstance.post('api/cashier/create-supplier', formData);
      
      if (response.data.error === false) {
        // Success - close modal and refresh supplier list
        getSuppliers();
        onClose();
      } else {
        setError(response.data.message || "Failed to create supplier");
      }
    } catch (err) {
      console.error("Error creating supplier:", err);
      setError(err.response?.data?.message || "An error occurred while creating supplier");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative p-6">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <FiX size={24} />
      </button>
      
      <h2 className="text-2xl font-bold text-[#944EF8] mb-6">Add New Supplier</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Supplier Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[#944EF8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50"
              placeholder="Enter supplier name"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[#944EF8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50"
              placeholder="Enter supplier email"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[#944EF8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50"
              placeholder="Enter phone number"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[#944EF8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50"
              placeholder="Enter supplier address"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7a3dd0] transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Supplier'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSupplierModal;