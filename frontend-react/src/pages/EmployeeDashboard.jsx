import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaCalendar, FaAddressCard, FaRegMoneyBillAlt, FaStar, FaSignOutAlt, FaClipboardList, FaClock } from 'react-icons/fa';
import LeaveCard from '../components/Cards/LeaveCard';
import axiosInstance from '../utils/AxiosInstance';

const EmployeeDashBoard = () => {
  const appliedLeaves = [
    { leaveDate: '2025-03-10', leaveType: 'Full Day', reason: 'Personal Work' },
    { leaveDate: '2025-03-15', leaveType: 'Half Day', reason: 'Doctor Appointment' },
  ];

  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [userInfo, setUserInfo] = useState({}); 
  const [formError, setFormError] = useState(null);

  const getUserInfo = async () => {
    try {
      const response = await axiosInstance.get("/api/admin/get-info-emp");
      console.log("API Response:", response.data);

      if (response.data && response.data.success && response.data.employeeInfo) {
        const employee = response.data.employeeInfo;

        setUserInfo({
          id: employee.EmployeeID,
          username: employee.Username,
          name: employee.Name,
          email: employee.email,
          role: employee.Role,
          phone: employee.Phone,
          rating: employee.Rating,
          imageUrl: employee.ProfilePicUrl,
        });
      } else {
        setError("Failed to retrieve employee information.");
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      } else {
        setError("An error occurred while fetching employee data.");
      }
    }
  };

  const markAttendance = async () => {
    try {
      const response = await axiosInstance.post('api/admin/mark-attendance', { status: 'Present' });
      setAttendanceStatus(response.data.message);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setAttendanceStatus('Failed to mark attendance.');
    }
  };
  
  const markDeparture = async () => {
    try {
      const response = await axiosInstance.post('api/admin/mark-departure');
      setAttendanceStatus(response.data.message);
    } catch (error) {
      console.error('Error marking departure:', error);
      setAttendanceStatus('Failed to mark departure.');
    }
  };

  useEffect(() => {
    getUserInfo();
  }, []);

  return (
    <div className="min-h-screen bg-[#D8D8D8] text-gray-800 relative overflow-hidden">
      {/* Glowing Background Elements */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#944EF8]/20 rounded-full blur-[120px] animate-pulse"></div>

      {/* Navbar */}
      <div className="bg-white/70 backdrop-blur-md text-gray-800 p-4 flex justify-between items-center sticky top-0 z-10 border-b border-purple-200 shadow-sm">
        <h1 className="text-2xl font-bold text-[#944EF8]">Your Dashboard</h1>
        <button className="bg-gradient-to-r from-[#944EF8] to-[#a67dff] hover:from-[#8647e0] hover:to-[#9a71f6] text-white py-2 px-4 rounded-xl backdrop-blur-sm flex items-center cursor-pointer font-bold transition-all duration-300 shadow-md">
          <FaSignOutAlt className="mr-2" /> Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-purple-100 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#944EF8]/5 to-transparent opacity-30"></div>
            <img 
              src={userInfo?.imageUrl || '/default-avatar.png'} 
              alt={userInfo.name} 
              className="w-44 h-44 rounded-full border-4 border-[#944EF8]/20 mb-4 object-cover z-10 relative shadow-lg"
            />
            <h2 className="text-xl font-semibold text-gray-800 z-10">{userInfo.name}</h2>
            <p className="text-sm text-[#944EF8] font-medium z-10">{userInfo.role}</p>
          </div>

          {/* User Details Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-purple-100 p-6 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#944EF8]/5 to-transparent opacity-30"></div>
            <div className="space-y-4 z-10 relative">
              <div className="flex items-center space-x-3"><FaUser className="text-[#944EF8]" /><span className="text-gray-700">{userInfo.username}</span></div>
              <div className="flex items-center space-x-3"><FaEnvelope className="text-[#944EF8]" /><span className="text-gray-700">{userInfo.email}</span></div>
              <div className="flex items-center space-x-3"><FaPhone className="text-[#944EF8]" /><span className="text-gray-700">{userInfo.phone}</span></div>
              <div className="flex items-center space-x-3"><FaStar className="text-[#944EF8]" /><span className="text-gray-700">Rating: {userInfo.rating}</span></div>
              <div className="flex items-center space-x-3"><FaAddressCard className="text-[#944EF8]" /><span className="text-gray-700">Department: {userInfo.role}</span></div>
            </div>
          </div>

          {/* Leave Application Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-purple-100 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#944EF8]/5 to-transparent opacity-30"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 z-10 relative">Apply for Leave</h2>
            <form className="space-y-4 z-10 relative">
              {formError && <div className="text-red-500">{formError}</div>}
              <div>
                <label htmlFor="leaveDate" className="block text-sm font-medium text-gray-700">Leave Date</label>
                <input
                  type="date"
                  id="leaveDate"
                  name="leaveDate"
                  className="mt-1 block w-full p-2 bg-white/50 border border-purple-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-[#944EF8] focus:border-[#944EF8] transition-all duration-300"
                  required
                />
              </div>
              <div>
                <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700">Leave Type</label>
                <select
                  id="leaveType"
                  name="leaveType"
                  className="mt-1 block w-full p-2 bg-white/50 border border-purple-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-[#944EF8] focus:border-[#944EF8] transition-all duration-300"
                  required
                >
                  <option value="" className="bg-white">Select Leave Type</option>
                  <option value="Full Day" className="bg-white">Full Day</option>
                  <option value="Half Day" className="bg-white">Half Day</option>
                </select>
              </div>
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  id="reason"
                  name="reason"
                  className="mt-1 block w-full p-2 bg-white/50 border border-purple-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-[#944EF8] focus:border-[#944EF8] transition-all duration-300"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-[#944EF8] to-[#a67dff] hover:from-[#8647e0] hover:to-[#9a71f6] text-white py-2 rounded-xl backdrop-blur-sm transition-all duration-300 shadow-md"
              >
                Apply for Leave
              </button>
            </form>
          </div>
        </div>

        {/* Attendance Section */}
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-purple-100 p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#944EF8]/5 to-transparent opacity-30"></div>
          <div className="flex items-center space-x-4 z-10 relative">
            <FaClock className="text-[#944EF8]" />
            <span className="text-lg font-semibold text-gray-700">{new Date().toLocaleString()}</span>
          </div>
          <div className="space-x-4 z-10 relative">
            <button
              onClick={markAttendance}
              className="bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white py-2 px-4 rounded-xl backdrop-blur-sm transition-all duration-300 shadow-md"
            >
              Mark Attendance
            </button>
            <button
              onClick={markDeparture}
              className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white py-2 px-4 rounded-xl backdrop-blur-sm transition-all duration-300 shadow-md"
            >
              Mark Departure
            </button>
          </div>
        </div>

        {/* Attendance Status */}
        {attendanceStatus && (
          <div className="text-center text-lg font-semibold text-gray-700 bg-white/60 backdrop-blur-xl rounded-xl p-4 shadow-md border border-purple-100">
            {attendanceStatus}
          </div>
        )}

        {/* Applied Leaves Section */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Applied Leaves</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appliedLeaves.length > 0 ? (
              appliedLeaves.map((leave, index) => (
                <div 
                  key={index} 
                  className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-purple-100 p-4 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#944EF8]/5 to-transparent opacity-30"></div>
                  <div className="z-10 relative">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{leave.leaveType}</h3>
                    <p className="text-gray-700">Date: {leave.leaveDate}</p>
                    <p className="text-gray-700">Reason: {leave.reason}</p>
                    <div className="w-full h-1 bg-gradient-to-r from-[#944EF8] to-[#a67dff] rounded-full mt-3"></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">No applied leaves yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashBoard;