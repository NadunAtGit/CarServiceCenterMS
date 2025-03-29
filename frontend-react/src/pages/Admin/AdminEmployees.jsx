import React, { useState, useEffect } from 'react';
import { FiSearch, FiPlus, FiRefreshCcw } from "react-icons/fi";
import { AiOutlineInfoCircle, AiOutlineDelete } from "react-icons/ai";
import axiosInstance from '../../utils/AxiosInstance';
import Modal from "react-modal";
import AddEmployee from '../../components/Modals/AddEmployee';

const AdminEmployees = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const [openAddModal, setOpenAddModal] = useState({
    isShown: false,
    data: null,
  });

  const onCloseAdd = () => {
    setOpenAddModal({ isShown: false, data: null });
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

  const searchEmployees = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a search term");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`api/admin/search-employee?query=${searchQuery}`);

      if (response.data.success) {
        setAllEmployees(response.data.results);
      } else {
        console.error("Search failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error searching employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this employee? This action cannot be undone."
    );
  
    if (!confirmDelete) return;
  
    setIsLoading(true);
  
    try {
      const response = await axiosInstance.delete(`api/admin/delete-employee/${id}`);
      console.log("Response:", response);
  
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
      alert("An error occurred while deleting the employee.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getEmployeeData();
  }, []);

  // Filter employees based on search query and selected role
  const filteredEmployees = allEmployees.filter((employee) => {
    const matchesSearchQuery =
      employee.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.EmployeeID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.Role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRoleFilter = selectedRole
      ? employee.Role === selectedRole
      : true;

    return matchesSearchQuery && matchesRoleFilter;
  });

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
                placeholder="Search by username, department, or role"
                className="w-full bg-white/50 text-gray-800 outline-none border border-[#944EF8]/20 py-2 px-4 rounded-lg backdrop-blur-xl focus:ring-2 focus:ring-[#944EF8]/50 transition-all duration-300 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#944EF8]/80 to-[#944EF8]/60 text-white border border-[#944EF8]/30 backdrop-blur-xl hover:from-[#944EF8]/90 hover:to-[#944EF8]/70 transition-all duration-300 shadow-md ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={searchEmployees}
              disabled={isLoading}
            >
              <FiSearch size={22} />
              {isLoading ? "Loading..." : "Search"}
            </button>
          </div>
          
          <div>
            <select
              className="w-full bg-white/50 text-gray-800 border border-[#944EF8]/20 py-2 px-4 rounded-lg backdrop-blur-xl shadow-sm"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="" className="bg-white">Filter by Role</option>
              <option value="Mechanics" className="bg-white">Mechanics</option>
              <option value="Advisors" className="bg-white">Advisors</option>
              <option value="Admins" className="bg-white">Admins</option>
              <option value="Team Leaders" className="bg-white">Team Leaders</option>
            </select>
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
                <th className="py-3 px-4 text-left hidden md:table-cell font-semibold">Rating</th>
                <th className="py-3 px-4 text-left font-semibold">Operations</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.EmployeeID} className="border-b border-[#944EF8]/10 hover:bg-[#944EF8]/5 transition-colors">
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{employee.EmployeeID}</td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{employee.Name}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{employee.Phone}</td>
                    <td className="py-3 px-4 text-gray-700">{employee.Role}</td>
                    <td className="py-3 px-4 text-center hidden md:table-cell text-gray-700">{employee.Rating}</td>
                    <td className="py-3 px-4 flex gap-3 items-center">
                      <AiOutlineInfoCircle className="text-[#944EF8] cursor-pointer hover:text-[#7a3dd0] transition-colors" size={22} />
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
          <AddEmployee onClose={onCloseAdd} getEmployees={getEmployeeData} />
        </div>
      </Modal>
    </div>
  );
};

export default AdminEmployees;