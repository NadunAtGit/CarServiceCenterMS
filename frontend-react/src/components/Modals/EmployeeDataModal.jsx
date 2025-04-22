import React, { useState, useEffect } from 'react';
import Modal from "react-modal";
import { FiX, FiPhone, FiMail, FiStar, FiUser, FiBriefcase } from "react-icons/fi";
import axiosInstance from '../../utils/AxiosInstance';

const EmployeeDataModal = ({ isOpen, onClose, employeeId }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchEmployeeData();
    }
  }, [isOpen, employeeId]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.get(`api/admin/get-employee/${employeeId}`);
      
      if (response.data.success) {
        setEmployee(response.data.employee);
      } else {
        setError(response.data.message || "Failed to fetch employee data");
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
      setError("An error occurred while fetching employee data");
    } finally {
      setLoading(false);
    }
  };

  // Generate star rating display
  const renderRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FiStar key={i} className="text-yellow-400 fill-current" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <FiStar className="text-gray-300" />
            <FiStar className="absolute top-0 left-0 text-yellow-400 fill-current overflow-hidden" style={{ clipPath: 'inset(0 50% 0 0)' }} />
          </div>
        );
      } else {
        stars.push(<FiStar key={i} className="text-gray-300" />);
      }
    }
    
    return (
      <div className="flex items-center">
        {stars}
        <span className="ml-2 text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
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
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: 'none'
        }
      }}
      className="focus:outline-none"
    >
      <div className="bg-white/90 rounded-2xl backdrop-blur-xl border border-[#944EF8]/20 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#944EF8] to-[#944EF8]/80 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Employee Details</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-all"
          >
            <FiX size={24} />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#944EF8]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : employee ? (
            <div>
              {/* Employee Header */}
              <div className="flex items-center gap-6 mb-8">
                {employee.ProfilePicUrl ? (
                  <img 
                    src={employee.ProfilePicUrl} 
                    alt={employee.Name} 
                    className="h-28 w-28 rounded-full object-cover shadow-lg border-2 border-[#944EF8]/20"
                  />
                ) : (
                  <div className="h-28 w-28 bg-gradient-to-br from-[#944EF8]/70 to-[#7d43d5] rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      {employee.Name?.split(' ').map(name => name[0]).join('') || 'U'}
                    </span>
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800 mb-1">{employee.Name}</h3>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#944EF8]/10 border border-[#944EF8]/20 text-[#944EF8] font-medium text-sm mb-2">
                    {employee.Role}
                  </div>
                  <div className="mt-2">
                    {employee.Rating !== undefined && renderRating(parseFloat(employee.Rating))}
                  </div>
                </div>
              </div>
              
              {/* Employee Details */}
              <div className="space-y-4">
                {/* Employee ID */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-[#944EF8]/10 flex items-center justify-center text-[#944EF8]">
                    <FiUser size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Employee ID</div>
                    <div className="font-medium">{employee.EmployeeID}</div>
                  </div>
                </div>
                
                {/* Username */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-[#944EF8]/10 flex items-center justify-center text-[#944EF8]">
                    <FiUser size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Username</div>
                    <div className="font-medium">{employee.Username}</div>
                  </div>
                </div>
                
                {/* Phone */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-[#944EF8]/10 flex items-center justify-center text-[#944EF8]">
                    <FiPhone size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Phone</div>
                    <div className="font-medium">{employee.Phone || "Not provided"}</div>
                  </div>
                </div>
                
                {/* Email */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-[#944EF8]/10 flex items-center justify-center text-[#944EF8]">
                    <FiMail size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="font-medium">{employee.email}</div>
                  </div>
                </div>
                
                {/* Role */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-[#944EF8]/10 flex items-center justify-center text-[#944EF8]">
                    <FiBriefcase size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Role</div>
                    <div className="font-medium">{employee.Role}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              No employee data found
            </div>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeDataModal;