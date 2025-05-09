import React, { useState, useEffect } from 'react';
import { FiSearch, FiRefreshCw } from "react-icons/fi";
import { AiOutlineCar, AiOutlineUser } from "react-icons/ai";
import axiosInstance from '../../utils/AxiosInstance';
import CustomerDetailsModal from "../../components/Modals/CustomerDetailsModal";
import CustomerVehiclesModal from '../../components/Modals/CustomerVehiclesModal';

const AdminCustomers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isVehiclesModalOpen, setIsVehiclesModalOpen] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("api/customers/getcustomers");
      if (response.data.message === "Customers fetched successfully") {
        setCustomers(response.data.customers);
      } else {
        console.error("Failed to fetch customers");
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    
    // Clean up timeout on component unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  // Handle search input with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set a new timeout to delay the search
    const timeoutId = setTimeout(() => {
      // Just update the filter, no API call needed since we filter client-side
    }, 300); // 300ms delay
    
    setSearchTimeout(timeoutId);
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      customer.CustomerID.toLowerCase().includes(query) ||
      (customer.FirstName && customer.FirstName.toLowerCase().includes(query)) ||
      (customer.SecondName && customer.SecondName.toLowerCase().includes(query)) ||
      (customer.Telephone && customer.Telephone.includes(query)) ||
      (customer.Email && customer.Email.toLowerCase().includes(query)) ||
      (customer.Username && customer.Username.toLowerCase().includes(query))
    );
  });

  const handleViewCustomerDetails = (customerId) => {
    setSelectedCustomerId(customerId);
    setIsDetailsModalOpen(true);
  };

  const handleViewCustomerVehicles = (customerId) => {
    setSelectedCustomerId(customerId);
    setIsVehiclesModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#f5f5f5] min-h-screen">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Customers</h1>
        
        {/* Search Section */}
        <div className="w-full grid md:grid-cols-3 gap-3 mb-6">
          <div className="col-span-full md:col-span-2 flex space-x-2">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search customers by ID, name, phone, or email"
                className="w-full bg-white text-gray-800 outline-none border border-[#944EF8]/20 py-2 px-4 rounded-lg focus:ring-2 focus:ring-[#944EF8]/50 transition-all duration-300 shadow-sm"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
          
          <button
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-800 border border-[#944EF8]/20 hover:bg-[#944EF8]/10 transition-all"
            onClick={fetchCustomers}
          >
            <FiRefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Customers Table */}
        <div className="overflow-x-auto rounded-xl shadow-lg">
          <table className="w-full bg-white rounded-lg border border-[#944EF8]/10">
            <thead>
              <tr className="bg-[#944EF8]/10 text-gray-700">
                <th className="py-3 px-4 text-left font-medium">Customer ID</th>
                <th className="py-3 px-4 text-left font-medium">Name</th>
                <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Phone</th>
                <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Email</th>
                <th className="py-3 px-4 text-left font-medium">Username</th>
                <th className="py-3 px-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#944EF8]"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.CustomerID} className="border-b border-[#944EF8]/10 hover:bg-[#944EF8]/5 transition-colors">
                    <td className="py-3 px-4 text-gray-700 font-medium">{customer.CustomerID}</td>
                    <td className="py-3 px-4 text-gray-800">
                      {customer.FirstName} {customer.SecondName}
                    </td>
                    <td className="py-3 px-4 text-gray-700 hidden md:table-cell">{customer.Telephone}</td>
                    <td className="py-3 px-4 text-gray-700 hidden md:table-cell">{customer.Email}</td>
                    <td className="py-3 px-4 text-gray-700">{customer.Username}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-3">
                        <AiOutlineCar 
                          className="text-[#944EF8] cursor-pointer hover:text-[#7a3dd0] transition-colors" 
                          size={20}
                          title="View Vehicles"
                          onClick={() => handleViewCustomerVehicles(customer.CustomerID)}
                        />
                        <AiOutlineUser
                          className="text-[#944EF8] cursor-pointer hover:text-[#7a3dd0] transition-colors"
                          size={20}
                          title="View Profile"
                          onClick={() => handleViewCustomerDetails(customer.CustomerID)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Customer Details Modal */}
      <CustomerDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        customerId={selectedCustomerId}
        onViewVehicles={(customerId) => {
          setSelectedCustomerId(customerId);
          setIsVehiclesModalOpen(true);
          setIsDetailsModalOpen(false);
        }}
      />
      
      {/* Customer Vehicles Modal */}
      <CustomerVehiclesModal 
        isOpen={isVehiclesModalOpen}
        onClose={() => setIsVehiclesModalOpen(false)}
        customerId={selectedCustomerId}
      />
    </div>
  );
};

export default AdminCustomers;
