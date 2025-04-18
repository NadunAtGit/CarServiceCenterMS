import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance'; // Adjust the import path as necessary

const AddStockModal = ({ onClose, onStockAdded }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [newStock, setNewStock] = useState({
    SupplierID: ''
  });

  const fetchSuppliers = async () => {
    try {
      setIsLoadingSuppliers(true);
      const response = await axiosInstance.get('api/admin/getsuppliers');
      
      if (response.data.suppliers) {
        setSuppliers(response.data.suppliers);
      } else {
        console.error("Failed to fetch suppliers:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axiosInstance.post('api/cashier/stocks/add', newStock);
      
      if (response.status === 201) {
        // Notify parent component of success
        onStockAdded();
      }
    } catch (error) {
      console.error("Error adding new stock:", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/50 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4 text-[#7A40C2]">Add New Stock</h3>

        <form onSubmit={handleAddStock}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Supplier</label>
            {isLoadingSuppliers ? (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#9A67EA]"></div>
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
                value={newStock.SupplierID}
                onChange={(e) => setNewStock({ ...newStock, SupplierID: e.target.value })}
                required
              >
                <option value="">-- Select a supplier --</option>
                {suppliers.map(supplier => (
                  <option key={supplier.SupplierID} value={supplier.SupplierID}>
                    {supplier.SupplierID} - {supplier.Name || 'Unknown Supplier'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              A new stock will be created with today's date.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 transition-colors bg-white/80"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#7A40C2] text-white rounded-full hover:bg-[#6b38b3] transition-colors"
            >
              Create Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;