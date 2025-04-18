import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/AxiosInstance';

const ServicesDropdown = ({ value, onChange, index, required = false }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/api/cashier/services');
        if (response.status === 200) {
          setServices(response.data.services || []);
          
          // If a value is provided, find the matching service
          if (value) {
            const selected = response.data.services.find(
              service => service.ServiceID === value
            );
            if (selected) {
              setSelectedService(selected);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        setError('Failed to load services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [value]);

  // Filter services based on search term
  const filteredServices = services.filter(service =>
    service.ServiceName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setIsDropdownOpen(false);
    
    // Pass the selected service to the parent component
    if (onChange) {
      // For Description field
      const descriptionEvent = {
        target: {
          name: "Description",
          value: service.ServiceName
        }
      };
      onChange(index, descriptionEvent);
      
      // For ServiceType field
      const serviceTypeEvent = {
        target: {
          name: "ServiceType",
          value: service.TypeService
        }
      };
      onChange(index, serviceTypeEvent);
      
      // For ServiceID (new field)
      const serviceIdEvent = {
        target: {
          name: "ServiceID",
          value: service.ServiceID
        }
      };
      onChange(index, serviceIdEvent);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="relative w-full mb-3">
      {/* Dropdown button */}
      <div 
        className="text-md text-gray-900 border-2 p-2 rounded-xl border-d9baf4 w-full flex justify-between items-center cursor-pointer"
        onClick={toggleDropdown}
      >
        <span className={selectedService ? "text-gray-900" : "text-gray-500"}>
          {selectedService ? selectedService.ServiceName : "Select a service"}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* Search input */}
          <div className="sticky top-0 bg-white p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search services..."
              className="text-md text-gray-900 border-2 p-2 rounded-xl border-d9baf4 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading services...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : filteredServices.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No services found</div>
          ) : (
            <ul>
              {filteredServices.map((service) => (
                <li
                  key={service.ServiceID}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleServiceSelect(service)}
                >
                  <div className="font-medium">{service.ServiceName}</div>
                  <div className="text-sm text-gray-500">
                    Type: {service.TypeService} | Price: ${service.Price} | Duration: {service.Duration} min
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ServicesDropdown;