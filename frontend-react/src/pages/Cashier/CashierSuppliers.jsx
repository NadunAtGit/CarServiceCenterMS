import React, { useState, useEffect } from 'react';
import { FiSearch, FiPlus, FiRefreshCcw } from "react-icons/fi";
import { AiOutlineInfoCircle, AiOutlineDelete } from "react-icons/ai";
import axiosInstance from '../../utils/axiosInstance';
import Modal from "react-modal";
import AddSupplierModal from '../../components/Modals/AddSupplierModal';
import SupplierDataModal from '../../components/Modals/SupplierDataModal';

// Initialize Modal
Modal.setAppElement('#root');

const CashierSuppliers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);

  // State for managing supplier detail modal
  const [supplierDetailModal, setSupplierDetailModal] = useState({
    isOpen: false,
    supplierId: null
  });

  const [openAddModal, setOpenAddModal] = useState({
    isShown: false,
    data: null,
  });

  const onCloseAdd = () => {
    setOpenAddModal({ isShown: false, data: null });
  };

  // Function to open supplier detail modal
  const openSupplierDetailModal = (supplierId) => {
    setSupplierDetailModal({
      isOpen: true,
      supplierId: supplierId
    });
  };

  // Function to close supplier detail modal
  const closeSupplierDetailModal = () => {
    setSupplierDetailModal({
      isOpen: false,
      supplierId: null
    });
  };

  const getSupplierData = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("api/cashier/all-suppliers");
      if (response.data.success) {
        setAllSuppliers(response.data.suppliers);
      } else {
        console.error("Failed to fetch suppliers:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching supplier data:", error);
    }
    setIsLoading(false);
  };

  const searchSuppliers = async (query) => {
    if (!query.trim()) {
      getSupplierData();
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = `api/cashier/search-supplier?query=${query}`;
      const response = await axiosInstance.get(endpoint);
      
      if (response.data.success) {
        setAllSuppliers(response.data.results || response.data.suppliers);
      } else {
        console.error("Search failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error searching suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set a new timeout to delay the search
    const timeoutId = setTimeout(() => {
      searchSuppliers(query);
    }, 500); // 500ms delay
    
    setSearchTimeout(timeoutId);
  };

  const deleteSupplier = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this supplier? This action cannot be undone."
    );
  
    if (!confirmDelete) return;
  
    setIsLoading(true);
  
    try {
      const response = await axiosInstance.delete(`api/cashier/delete-supplier/${id}`);
      
      if (response.data.success) {
        setAllSuppliers((prevSuppliers) =>
          prevSuppliers.filter((supplier) => supplier.SupplierID !== id)
        );
        alert("Supplier deleted successfully!");
      } else {
        // Handle case where supplier has references
        if (response.data.references) {
          const { references } = response.data;
          const totalRefs = references.total;
          
          alert(`Cannot delete supplier: This supplier has ${totalRefs} associated stock records.`);
        } else {
          alert("Failed to delete the supplier: " + response.data.message);
        }
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert("An error occurred while deleting the supplier.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getSupplierData();
    
    // Clean up timeout on component unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  // Reset filters function
  const resetFilters = () => {
    setSearchQuery("");
    getSupplierData();
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#D8D8D8] min-h-screen">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Suppliers Data</h1>
        
        {/* Search Section */}
        <div className="w-full grid md:grid-cols-3 gap-3 mb-6">
          <div className="col-span-full md:col-span-2 flex space-x-2">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search by name, email, or phone"
                className="w-full bg-white/50 text-gray-800 outline-none border border-[#944EF8]/20 py-2 px-4 rounded-lg backdrop-blur-xl focus:ring-2 focus:ring-[#944EF8]/50 transition-all duration-300 shadow-sm"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
          
          <div className="flex gap-2">
            {searchQuery && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors text-gray-700 border border-gray-300"
                title="Reset filters"
              >
                <FiRefreshCcw size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Supplier Table */}
        <div className="overflow-x-auto rounded-xl shadow-xl">
          <table className="w-full bg-white/70 rounded-lg backdrop-blur-xl border border-[#944EF8]/10">
            <thead>
              <tr className="bg-[#944EF8]/10 text-gray-700">
                <th className="py-3 px-4 text-left font-semibold">Supplier ID</th>
                <th className="py-3 px-4 text-left font-semibold">Name</th>
                <th className="py-3 px-4 text-left font-semibold">Email</th>
                <th className="py-3 px-4 text-left font-semibold">Phone</th>
                <th className="py-3 px-4 text-left font-semibold">Address</th>
                <th className="py-3 px-4 text-left font-semibold">Operations</th>
              </tr>
            </thead>
            <tbody>
              {allSuppliers.length > 0 ? (
                allSuppliers.map((supplier) => (
                  <tr key={supplier.SupplierID} className="border-b border-[#944EF8]/10 hover:bg-[#944EF8]/5 transition-colors">
                    <td className="py-3 px-4 text-gray-700">{supplier.SupplierID}</td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{supplier.Name}</td>
                    <td className="py-3 px-4 text-gray-700">{supplier.Email}</td>
                    <td className="py-3 px-4 text-gray-700">{supplier.Telephone}</td>
                    <td className="py-3 px-4 text-gray-700">{supplier.Address}</td>
                    <td className="py-3 px-4 flex gap-3 items-center">
                      <AiOutlineInfoCircle 
                        className="text-[#944EF8] cursor-pointer hover:text-[#7a3dd0] transition-colors" 
                        size={22}
                        onClick={() => openSupplierDetailModal(supplier.SupplierID)}
                      />
                      <AiOutlineDelete
                        className="text-red-400 cursor-pointer hover:text-red-500 transition-colors"
                        size={22}
                        onClick={() => deleteSupplier(supplier.SupplierID)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    {isLoading ? "Loading suppliers..." : "No suppliers found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center mt-4">
            <div className="px-4 py-2 bg-white/80 rounded-lg shadow text-gray-700">
              Loading suppliers...
            </div>
          </div>
        )}

        {/* Add Supplier Floating Button */}
        <div 
          className="fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-[#944EF8] to-[#944EF8]/80 flex items-center justify-center rounded-full 
           border border-[#944EF8]/30 shadow-lg hover:shadow-xl hover:from-[#944EF8]/90 hover:to-[#944EF8] transition-all duration-300 cursor-pointer z-50"
          onClick={() => setOpenAddModal({ isShown: true, data: null })}
        >
          <FiPlus size={30} color="white"/>
        </div>
      </div>

      {/* Modal for Adding Supplier */}
      <Modal
        isOpen={openAddModal.isShown}
        onRequestClose={onCloseAdd}
        style={{
          overlay: {
            backgroundColor: "rgba(0,0,0,0.2)",
            zIndex: 999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          },
          content: {
            position: 'relative',
            top: 'auto',
            left: 'auto',
            right: 'auto',
            bottom: 'auto',
            border: 'none',
            borderRadius: '12px',
            padding: '0',
            maxWidth: '90%',
            width: '500px',
            boxShadow: 'none'
          }
        }}
        className="focus:outline-none"
      >
        <div className="bg-white/90 rounded-2xl backdrop-blur-xl border border-[#944EF8]/20 shadow-2xl">
          <AddSupplierModal onClose={onCloseAdd} getSuppliers={getSupplierData} />
        </div>
      </Modal>
      
      {/* Supplier Detail Modal */}
      <SupplierDataModal 
        isOpen={supplierDetailModal.isOpen}
        onClose={closeSupplierDetailModal}
        supplierId={supplierDetailModal.supplierId}
      />
    </div>
  );
};

export default CashierSuppliers;