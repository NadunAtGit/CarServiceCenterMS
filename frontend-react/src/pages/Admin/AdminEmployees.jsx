import React, { useState, useEffect } from 'react';
import { FiSearch } from "react-icons/fi";
import { AiOutlineInfoCircle, AiOutlineDelete } from "react-icons/ai";
import { FiRefreshCcw } from "react-icons/fi";
import {FiPlus } from "react-icons/fi";
import axiosInstance from '../../utils/AxiosInstance';
import Modal from "react-modal";
import AddEmployee from '../../components/Modals/AddEmployee';

const AdminEmployees = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState(""); // To track the selected role for filtering

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
      // Update the API endpoint to match the correct route
      const response = await axiosInstance.get(`api/admin/search-employee?query=${searchQuery}`);

      if (response.data.success) {
        setAllEmployees(response.data.results); // Update the state with search results
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
      console.log("Response:", response); // Log the response
  
      if (response.data.success) {
        setAllEmployees((prevEmployees) =>
          prevEmployees.filter((employee) => employee.EmployeeID !== id)
        );
        alert("Employee deleted successfully!");
      } else {
        alert("Failed to delete the employee: " + response.data.message);
      }
    } catch (error) {
      console.error("Error deleting employee:", error); // Log the error
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
    <>
        <div className="container mx-auto sm:overflow-hidden">
      <div className="w-full flex justify-center flex-col">
        <h1 className="text-xl font-bold mb-3">Employees Data</h1>
        

        <div className="w-full flex flex-row gap-3 my-5">
          <input
            type="text"
            placeholder="Search by username, department, or role"
            className="w-full outline-none border-b-2 border-gray-400 py-2 px-4"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className={`flex items-center gap-2 border-blue-300 border-3 p-2 rounded-2xl text-white bg-blue-500 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={searchEmployees}
          >
            <FiSearch size={22} />
            {isLoading ? "Loading..." : "Search"}
          </button>

          <select
            className="border-b-2 border-gray-400 py-2 px-4 bg-white"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">Filter by Role</option>
            <option value="Mechanics">Mechanics</option>
            <option value="Advisors">Advisors</option>
            <option value="Admins">Admins</option>
            <option value="Team Leaders">Team Leaders</option>
          </select>
        </div>

        {/* Employee Table */}
        <div className="overflow-x-scroll md:overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-lg">
            <thead>
              <tr className="bg-[#5b7ad2] text-white">
                <th className="py-3 px-4 text-left">Employee ID</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Phone</th>
                <th className="py-3 px-4 text-left">Role</th>
                <th className="py-3 px-4 text-left">Rating</th>
                <th className="py-3 px-4 text-left">Operations</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.EmployeeID} className="border-b">
                    <td className="py-3 px-4">{employee.EmployeeID}</td>
                    <td className="py-3 px-4">{employee.Name}</td>
                    <td className="py-3 px-4">{employee.Phone}</td>
                    <td className="py-3 px-4">{employee.Role}</td>
                    <td className="py-3 px-4 text-center">{employee.Rating}</td>
                    <td className="py-3 px-4 flex gap-3">
                      <AiOutlineInfoCircle className="text-blue-500 cursor-pointer" size={22} />
                      <FiRefreshCcw className="text-yellow-500 cursor-pointer" size={22} />
                      <AiOutlineDelete
                        className="text-red-500 cursor-pointer"
                        size={22}
                        onClick={() => deleteEmployee(employee.EmployeeID)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className='fixed bottom-10 right-20 w-16 h-16 bg-blue-500 flex items-center justify-center rounded-full   shadow-lg 
             border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white transition-all duration-300 cursor-pointer' 
             onClick={() => setOpenAddModal({ isShown: true, data: null })}
          >
                  <FiPlus size={40} color='white'/>
          </div>
        </div>
      </div>
      </div>

      <Modal
        isOpen={openAddModal.isShown}
        onRequestClose={onCloseAdd}
        style={{
          overlay: {
            backgroundColor: "rgba(0,0,0,0.2)",
            zIndex: 999,
          },
        }}
        className="model-box"
      >
        <AddEmployee onClose={onCloseAdd} getEmployees={getEmployeeData} />
      </Modal>
    </>
    

   ) 
};

export default AdminEmployees;
