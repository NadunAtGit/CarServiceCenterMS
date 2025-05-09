import React, { useState, useEffect } from 'react';
import { FiX, FiUser, FiMail, FiPhone, FiTag, FiAtSign } from "react-icons/fi";
import { FaCar } from "react-icons/fa";
import axiosInstance from '../../utils/AxiosInstance';

const CustomerDetailsModal = ({ isOpen, onClose, customerId, onViewVehicles }) => {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerDetails();
    }
  }, [isOpen, customerId]);

  const fetchCustomerDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`api/admin/getcustomer/${customerId}`);
      if (response.data.message === "Customer fetched successfully") {
        setCustomer(response.data.customer);
      } else {
        setError("Failed to fetch customer details");
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
      setError(error.response?.data?.message || "An error occurred while fetching customer details");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto outline-none">
        <div className="bg-[#944EF8] text-white py-3 px-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-lg font-semibold">Customer Details</h2>
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
          ) : customer ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start">
                    <FiTag className="mt-1 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Customer ID</p>
                      <p className="font-medium">{customer.CustomerID}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <FiAtSign className="mt-1 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Username</p>
                      <p className="font-medium">{customer.Username}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start">
                <FiUser className="mt-1 mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{customer.FirstName} {customer.SecondName}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <FiMail className="mt-1 mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{customer.Email}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <FiPhone className="mt-1 mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{customer.Telephone}</p>
                </div>
              </div>
              
              <button 
                className="w-full py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7b3be0] transition-colors mt-4 flex items-center justify-center"
                onClick={() => {
                  onClose();
                  if (onViewVehicles) onViewVehicles(customer.CustomerID);
                }}
              >
                <FaCar className="mr-2" />
                View Vehicles
              </button>
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">No customer details available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;
