import React, { useState, useEffect } from 'react';
import { FiX,  FiAlertCircle, FiTrendingUp } from "react-icons/fi";
import axiosInstance from '../../utils/AxiosInstance';
import { FaCar } from "react-icons/fa";

const CustomerVehiclesModal = ({ isOpen, onClose, customerId }) => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerVehicles();
    }
  }, [isOpen, customerId]);

  const fetchCustomerVehicles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`api/admin/getcustomer/${customerId}/vehicles`);
      if (response.data.message === "Vehicles fetched successfully") {
        setVehicles(response.data.vehicles);
      } else {
        setError("Failed to fetch customer vehicles");
      }
    } catch (error) {
      console.error("Error fetching customer vehicles:", error);
      if (error.response && error.response.status === 404) {
        // No vehicles found, but still show empty state
        setVehicles([]);
      } else {
        setError(error.response?.data?.message || "An error occurred while fetching vehicles");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-auto outline-none">
        <div className="bg-[#944EF8] text-white py-3 px-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-lg font-semibold">Customer Vehicles</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#944EF8]"></div>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              <p>{error}</p>
            </div>
          ) : vehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map((vehicle) => (
                <div key={vehicle.VehicleNo} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden">
                      {vehicle.VehiclePicUrl ? (
                        <img 
                          src={vehicle.VehiclePicUrl} 
                          alt={vehicle.Model} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/150';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <FaCar size={24} className="text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{vehicle.Model}</h3>
                      <p className="text-sm text-gray-500">{vehicle.Type}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-start">
                      <FaCar className="mt-1 mr-2 text-gray-500" size={14} />
                      <div>
                        <p className="text-gray-500">Vehicle No</p>
                        <p className="font-medium">{vehicle.VehicleNo}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <FiTrendingUp className="mt-1 mr-2 text-gray-500" size={14} />
                      <div>
                        <p className="text-gray-500">Current Mileage</p>
                        <p className="font-medium">{vehicle.CurrentMilleage || 'N/A'} km</p>
                      </div>
                    </div>
                    
                    <div className="col-span-2 flex items-start">
                      <FiAlertCircle className="mt-1 mr-2 text-gray-500" size={14} />
                      <div>
                        <p className="text-gray-500">Next Service Due</p>
                        <p className="font-medium">{vehicle.NextServiceMilleage || 'N/A'} km</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaCar size={48} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No vehicles found for this customer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerVehiclesModal;
