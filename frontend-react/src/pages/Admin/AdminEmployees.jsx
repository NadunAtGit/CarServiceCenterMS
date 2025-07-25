import React, { useState, useEffect } from 'react';
import { FiSearch, FiPlus, FiRefreshCcw } from "react-icons/fi";
import { AiOutlineInfoCircle, AiOutlineDelete } from "react-icons/ai";
import axiosInstance from '../../utils/axiosInstance';
import Modal from "react-modal";
import AddEmployee from '../../components/Modals/AddEmployee';
import EmployeeDataModal from '../../components/Modals/EmployeeDataModal';

// Initialize Modal
Modal.setAppElement('#root');

const AdminEmployees = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);

  // State for managing employee detail modal
  const [employeeDetailModal, setEmployeeDetailModal] = useState({
    isOpen: false,
    employeeId: null
  });

  const [openAddModal, setOpenAddModal] = useState({
    isShown: false,
    data: null,
  });

  const onCloseAdd = () => {
    setOpenAddModal({ isShown: false, data: null });
  };

  // Function to open employee detail modal
  const openEmployeeDetailModal = (employeeId) => {
    setEmployeeDetailModal({
      isOpen: true,
      employeeId: employeeId
    });
  };

  // Function to close employee detail modal
  const closeEmployeeDetailModal = () => {
    setEmployeeDetailModal({
      isOpen: false,
      employeeId: null
    });
  };

  const getEmployeeData = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("api/admin/all-employees");
      if (response.data.success) {
        setAllEmployees(response.data.employees);
      } else {
        console.error("Failed to fetch employees:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
    setIsLoading(false);
  };

  const filterEmployeesByRole = async (role) => {
    setIsLoading(true);
    try {
      const endpoint = role 
        ? `api/admin/filter-employees-by-role?role=${role}`
        : "api/admin/all-employees";
        
      const response = await axiosInstance.get(endpoint);
      
      if (response.data.success) {
        setAllEmployees(response.data.employees);
      } else {
        console.error("Failed to filter employees:", response.data.message);
      }
    } catch (error) {
      console.error("Error filtering employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchEmployees = async (query) => {
    if (!query.trim()) {
      // If search query is empty, show all employees based on selected role
      if (selectedRole) {
        filterEmployeesByRole(selectedRole);
      } else {
        getEmployeeData();
      }
      return;
    }

    setIsLoading(true);
    try {
      let endpoint = `api/admin/search-employee?query=${query}`;
      if (selectedRole) {
        endpoint += `&role=${selectedRole}`;
      }
      
      const response = await axiosInstance.get(endpoint);
      
      if (response.data.success) {
        setAllEmployees(response.data.results || response.data.employees);
      } else {
        console.error("Search failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error searching employees:", error);
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
      searchEmployees(query);
    }, 500); // 500ms delay
    
    setSearchTimeout(timeoutId);
  };

  const deleteEmployee = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this employee? This action cannot be undone."
    );
  
    if (!confirmDelete) return;
  
    setIsLoading(true);
  
    try {
      const response = await axiosInstance.delete(`api/admin/delete-employee/${id}`);
      
      if (response.data.success) {
        setAllEmployees((prevEmployees) =>
          prevEmployees.filter((employee) => employee.EmployeeID !== id)
        );
        alert("Employee deleted successfully!");
      } else {
        alert("Failed to delete the employee: " + response.data.message);
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      
      // Handle the case where employee has references
      if (error.response && error.response.status === 400 && error.response.data.references) {
        const { references } = error.response.data;
        const totalRefs = references.total;
        
        const transferConfirm = window.confirm(
          `This employee has ${totalRefs} references in other tables and cannot be deleted directly. Would you like to transfer these references to another employee?`
        );
        
        if (transferConfirm) {
          const transferId = prompt("Enter the Employee ID to transfer references to:");
          
          if (transferId) {
            try {
              const transferResponse = await axiosInstance.delete(`api/admin/delete-employee/${id}`, {
                data: { transferToEmployeeId: transferId }
              });
              
              if (transferResponse.data.success) {
                setAllEmployees((prevEmployees) =>
                  prevEmployees.filter((employee) => employee.EmployeeID !== id)
                );
                alert("Employee deleted successfully and references transferred!");
              } else {
                alert("Transfer failed: " + transferResponse.data.message);
              }
            } catch (transferError) {
              console.error("Transfer error:", transferError);
              alert("Failed to transfer references. Please try again with a valid employee ID.");
            }
          }
        }
      } else {
        alert("An error occurred while deleting the employee.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role change
  const handleRoleChange = (e) => {
    const role = e.target.value;
    setSelectedRole(role);
    
    if (searchQuery.trim()) {
      // If there's a search query, apply both filters
      searchEmployees(searchQuery);
    } else {
      // Otherwise just filter by role
      filterEmployeesByRole(role);
    }
  };

  useEffect(() => {
    getEmployeeData();
    
    // Clean up timeout on component unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  // Reset filters function
  const resetFilters = () => {
    setSelectedRole("");
    setSearchQuery("");
    getEmployeeData();
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#D8D8D8] min-h-screen">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Employees Data</h1>
        
        {/* Search and Filter Section */}
        <div className="w-full grid md:grid-cols-3 gap-3 mb-6">
          <div className="col-span-full md:col-span-2 flex space-x-2">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search by name, department, or role"
                className="w-full bg-white/50 text-gray-800 outline-none border border-[#944EF8]/20 py-2 px-4 rounded-lg backdrop-blur-xl focus:ring-2 focus:ring-[#944EF8]/50 transition-all duration-300 shadow-sm"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              className="w-full bg-white/50 text-gray-800 border border-[#944EF8]/20 py-2 px-4 rounded-lg backdrop-blur-xl shadow-sm"
              value={selectedRole}
              onChange={handleRoleChange}
            >
              <option value="" className="bg-white">Filter by Role</option>
              <option value="Mechanic" className="bg-white">Mechanics</option>
              <option value="Advisor" className="bg-white">Advisors</option>
              <option value="Admin" className="bg-white">Admins</option>
              <option value="Team Leader" className="bg-white">Team Leaders</option>
              <option value="Cashier" className="bg-white">Cashiers</option>
              <option value="Service Advisor" className="bg-white">Service Advisors</option>
            </select>
            
            {(selectedRole || searchQuery) && (
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

        {/* Employee Table */}
        <div className="overflow-x-auto rounded-xl shadow-xl">
          <table className="w-full bg-white/70 rounded-lg backdrop-blur-xl border border-[#944EF8]/10">
            <thead>
              <tr className="bg-[#944EF8]/10 text-gray-700">
                <th className="py-3 px-4 text-left hidden md:table-cell font-semibold">Employee ID</th>
                <th className="py-3 px-4 text-left font-semibold">Name</th>
                <th className="py-3 px-4 text-left hidden md:table-cell font-semibold">Phone</th>
                <th className="py-3 px-4 text-left font-semibold">Role</th>
                <th className="py-3 px-4 text-left hidden md:table-cell font-semibold">Department</th>
                <th className="py-3 px-4 text-left hidden md:table-cell font-semibold">Rating</th>
                <th className="py-3 px-4 text-left font-semibold">Operations</th>
              </tr>
            </thead>
            <tbody>
              {allEmployees.length > 0 ? (
                allEmployees.map((employee) => (
                  <tr key={employee.EmployeeID} className="border-b border-[#944EF8]/10 hover:bg-[#944EF8]/5 transition-colors">
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{employee.EmployeeID}</td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{employee.Name}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{employee.Phone}</td>
                    <td className="py-3 px-4 text-gray-700">{employee.Role}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{employee.Department || 'N/A'}</td>
                    <td className="py-3 px-4 text-center hidden md:table-cell text-gray-700">{employee.Rating}</td>
                    <td className="py-3 px-4 flex gap-3 items-center">
                      <AiOutlineInfoCircle 
                        className="text-[#944EF8] cursor-pointer hover:text-[#7a3dd0] transition-colors" 
                        size={22}
                        onClick={() => openEmployeeDetailModal(employee.EmployeeID)}
                      />
                      <FiRefreshCcw className="text-amber-500 cursor-pointer hover:text-amber-600 transition-colors" size={22} />
                      <AiOutlineDelete
                        className="text-red-400 cursor-pointer hover:text-red-500 transition-colors"
                        size={22}
                        onClick={() => deleteEmployee(employee.EmployeeID)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-500">
                    No employees found.
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
              Loading employees...
            </div>
          </div>
        )}

        {/* Add Employee Floating Button */}
        <div 
          className="fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-[#944EF8] to-[#944EF8]/80 flex items-center justify-center rounded-full 
           border border-[#944EF8]/30 shadow-lg hover:shadow-xl hover:from-[#944EF8]/90 hover:to-[#944EF8] transition-all duration-300 cursor-pointer z-50"
          onClick={() => setOpenAddModal({ isShown: true, data: null })}
        >
          <FiPlus size={30} color="white"/>
        </div>
      </div>

      {/* Modal for Adding Employee */}
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
          <AddEmployee onClose={onCloseAdd} getEmployees={selectedRole ? () => filterEmployeesByRole(selectedRole) : getEmployeeData} />
        </div>
      </Modal>
      
      {/* Employee Detail Modal */}
      <EmployeeDataModal 
        isOpen={employeeDetailModal.isOpen}
        onClose={closeEmployeeDetailModal}
        employeeId={employeeDetailModal.employeeId}
      />
    </div>
  );
};

export default AdminEmployees;
