import React, { useState, useEffect } from 'react';
import { FiSearch, FiRefreshCw, FiSend } from "react-icons/fi";
import { AiOutlineCar } from "react-icons/ai";
import axiosInstance from '../../utils/AxiosInstance';

import { toast } from 'react-toastify';

const ServiceAdvisorReminders = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicleNo, setSelectedVehicleNo] = useState(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [isSending, setIsSending] = useState({});

  const fetchApproachingVehicles = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/api/advisor/approaching-services");
      if (response.data.success) {
        setVehicles(response.data.vehicles);
      } else {
        toast.error("Failed to fetch vehicles approaching service");
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Error fetching vehicles data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApproachingVehicles();
    
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeoutId = setTimeout(() => {
      // Client-side filtering
    }, 300);
    
    setSearchTimeout(timeoutId);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      vehicle.VehicleNo.toLowerCase().includes(query) ||
      (vehicle.Model && vehicle.Model.toLowerCase().includes(query)) ||
      (vehicle.CustomerID && vehicle.CustomerID.toLowerCase().includes(query)) ||
      (vehicle.FirstName && vehicle.FirstName.toLowerCase().includes(query)) ||
      (vehicle.SecondName && vehicle.SecondName.toLowerCase().includes(query)) ||
      (vehicle.Telephone && vehicle.Telephone.includes(query))
    );
  });

  const handleSendReminder = async (customerId) => {
    setIsSending(prev => ({ ...prev, [customerId]: true }));
    
    try {
      const response = await axiosInstance.post(`/api/advisor/notify-approaching-service/${customerId}`);
      
      if (response.data.success) {
        toast.success(`Reminder sent to ${response.data.notification.customerId}`);
      } else {
        toast.error("Failed to send reminder");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Error sending reminder");
    } finally {
      setIsSending(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const handleViewVehicleDetails = (vehicleNo) => {
    setSelectedVehicleNo(vehicleNo);
    setIsVehicleModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#f5f5f5] min-h-screen">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Service Reminders</h1>
        
        {/* Search Section */}
        <div className="w-full grid md:grid-cols-3 gap-3 mb-6">
          <div className="col-span-full md:col-span-2 flex space-x-2">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search vehicles by number, model, or customer"
                className="w-full bg-white text-gray-800 outline-none border border-[#944EF8]/20 py-2 px-4 rounded-lg focus:ring-2 focus:ring-[#944EF8]/50 transition-all duration-300 shadow-sm"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
          
          <button
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-800 border border-[#944EF8]/20 hover:bg-[#944EF8]/10 transition-all"
            onClick={fetchApproachingVehicles}
          >
            <FiRefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Vehicles Table */}
        <div className="overflow-x-auto rounded-xl shadow-lg">
          <table className="w-full bg-white rounded-lg border border-[#944EF8]/10">
            <thead>
              <tr className="bg-[#944EF8]/10 text-gray-700">
                <th className="py-3 px-4 text-left font-medium">Vehicle No</th>
                <th className="py-3 px-4 text-left font-medium">Model</th>
                <th className="py-3 px-4 text-left font-medium">Current Mileage</th>
                <th className="py-3 px-4 text-left font-medium">Next Service</th>
                <th className="py-3 px-4 text-left font-medium">Gap</th>
                <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Customer</th>
                <th className="py-3 px-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#944EF8]"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.VehicleNo} className="border-b border-[#944EF8]/10 hover:bg-[#944EF8]/5 transition-colors">
                    <td className="py-3 px-4 text-gray-700 font-medium">{vehicle.VehicleNo}</td>
                    <td className="py-3 px-4 text-gray-800">{vehicle.Model}</td>
                    <td className="py-3 px-4 text-gray-700">{vehicle.CurrentMilleage} km</td>
                    <td className="py-3 px-4 text-gray-700">{vehicle.NextServiceMilleage} km</td>
                    <td className={`py-3 px-4 font-medium ${
                      vehicle.MilleageGap <= 50 ? 'text-red-500' : 
                      vehicle.MilleageGap <= 100 ? 'text-orange-500' : 'text-green-500'
                    }`}>
                      {vehicle.MilleageGap} km
                    </td>
                    <td className="py-3 px-4 text-gray-700 hidden md:table-cell">
                      {vehicle.FirstName} {vehicle.SecondName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSendReminder(vehicle.CustomerID)}
                          disabled={isSending[vehicle.CustomerID]}
                          className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm ${
                            isSending[vehicle.CustomerID] 
                              ? 'bg-gray-300 text-gray-600' 
                              : 'bg-[#944EF8]/10 text-[#944EF8] hover:bg-[#944EF8]/20'
                          } transition-colors`}
                        >
                          <FiSend size={16} />
                          {isSending[vehicle.CustomerID] ? 'Sending...' : 'Send Reminder'}
                        </button>
                        {/* <AiOutlineCar 
                          className="text-[#944EF8] cursor-pointer hover:text-[#7a3dd0] transition-colors" 
                          size={20}
                          title="View Vehicle"
                          onClick={() => handleViewVehicleDetails(vehicle.VehicleNo)}
                        /> */}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-500">
                    No vehicles approaching service found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Vehicle Details Modal */}
      
    </div>
  );
};

export default ServiceAdvisorReminders;