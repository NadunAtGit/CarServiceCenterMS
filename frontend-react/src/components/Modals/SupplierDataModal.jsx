import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import axiosInstance from '../../utils/axiosInstance';

const SupplierDataModal = ({ isOpen, onClose, supplierId }) => {
  const [supplierData, setSupplierData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !supplierId) return;

    const fetchSupplierDetails = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(`api/cashier/supplier/${supplierId}`);
        if (response.data.success) {
          setSupplierData(response.data.supplier);
        } else {
          setError(response.data.message || "Failed to fetch supplier details");
        }
      } catch (err) {
        console.error("Error fetching supplier details:", err);
        setError("An error occurred while fetching supplier details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupplierDetails();
  }, [isOpen, supplierId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-[#944EF8]">Supplier Details</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#944EF8]"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          ) : supplierData ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-gray-500 text-sm">Supplier ID</h3>
                <p className="text-lg font-medium">{supplierData.SupplierID}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Name</h3>
                <p className="text-lg font-medium">{supplierData.Name}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Email</h3>
                <p className="text-lg font-medium">{supplierData.Email}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Phone</h3>
                <p className="text-lg font-medium">{supplierData.Telephone}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Address</h3>
                <p className="text-lg font-medium">{supplierData.Address}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No supplier data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDataModal;