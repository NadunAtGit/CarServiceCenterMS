import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import AddServiceModal from '../../components/Modals/AddServiceModal';
import EditServiceModal from '../../components/Modals/EditServiceModal';

const CashierServices = () => {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosInstance.get('api/cashier/services');
      
      if (response.data.services) {
        setServices(response.data.services);
      } else {
        setError("Failed to fetch services: " + (response.data.message || "Unknown error"));
        console.error("Failed to fetch services:", response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch services";
      setError(errorMessage);
      console.error("Error fetching services:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm(`Are you sure you want to delete service #${serviceId}?`)) {
      return;
    }
    
    try {
      const response = await axiosInstance.delete(`api/cashier/services/${serviceId}`);
      
      if (response.status === 200) {
        // Refresh services list
        fetchServices();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete service";
      alert(`Error: ${errorMessage}`);
      console.error("Error deleting service:", error);
    }
  };

  const openAddServiceModal = () => {
    setShowAddServiceModal(true);
  };

  const openEditServiceModal = (service) => {
    setSelectedService(service);
    setShowEditServiceModal(true);
  };

  const handleServiceAdded = () => {
    fetchServices();
    setShowAddServiceModal(false);
  };

  const handleServiceUpdated = () => {
    fetchServices();
    setShowEditServiceModal(false);
  };

  // Format currency helper function
  const formatCurrency = (value) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (numValue !== null && numValue !== undefined && !isNaN(numValue)) {
      return `$${numValue.toFixed(2)}`;
    }
    return '$0.00';
  };

  // Filter services based on search term
  const filteredServices = services.filter(service => 
    service.ServiceID.toString().includes(searchTerm) || 
    (service.ServiceName && service.ServiceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (service.TypeService && service.TypeService.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6 text-black">Services Management</h1>
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-[#9A67EA]">Services</h2>
          <button 
            className="bg-[#7A40C2] hover:bg-[#6b38b3] text-white px-4 py-2 rounded-full transition-colors flex items-center"
            onClick={openAddServiceModal}
          >
            <svg className="w-4 h-4 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 4v16m8-8H4"></path>
            </svg>
            Add New Service
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
            placeholder="Search by service ID, name, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {/* Services Table */}
        <div className="rounded-3xl shadow-xl p-4 bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] border border-white/40 h-[600px] overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto h-full">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#9A67EA]"></div>
              </div>
            ) : filteredServices.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white/50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Service ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Duration (min)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Operations</th>
                  </tr>
                </thead>
                <tbody className="bg-white/30 divide-y divide-gray-200">
                  {filteredServices.map((service) => (
                    <tr key={service.ServiceID} className="hover:bg-white/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{service.ServiceID}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{service.ServiceName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {service.Description ? (
                          <div className="max-w-xs truncate" title={service.Description}>
                            {service.Description}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">No description</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatCurrency(service.Price)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{service.TypeService}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{service.Duration}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditServiceModal(service)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteService(service.ServiceID)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-600">No services found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddServiceModal && (
        <AddServiceModal
          onClose={() => setShowAddServiceModal(false)}
          onServiceAdded={handleServiceAdded}
        />
      )}

      {showEditServiceModal && (
        <EditServiceModal
          service={selectedService}
          onClose={() => setShowEditServiceModal(false)}
          onServiceUpdated={handleServiceUpdated}
        />
      )}
    </div>
  );
};

export default CashierServices;