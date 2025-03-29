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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1a2e] to-[#16213e] text-gray-100 relative overflow-hidden">
      {/* Glowing Background Elements */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px] animate-pulse"></div>

      {/* Navbar */}
      <div className="bg-[#0f1735]/60 backdrop-blur-md text-white p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Your Dashboard</h1>
        <button className="bg-red-600/50 hover:bg-red-700/70 py-2 px-4 rounded-xl backdrop-blur-sm flex items-center cursor-pointer font-bold transition-all duration-300">
          <FaSignOutAlt className="mr-2" /> Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-[#1a1a2e]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-20"></div>
            <img 
              src={userInfo?.imageUrl || '/default-avatar.png'} 
              alt={userInfo.name} 
              className="w-44 h-44 rounded-full border-4 border-white/20 mb-4 object-cover z-10 relative"
            />
            <h2 className="text-xl font-semibold text-white z-10">{userInfo.name}</h2>
            <p className="text-sm text-gray-400 z-10">{userInfo.role}</p>
          </div>

          {/* User Details Card */}
          <div className="bg-[#1a1a2e]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-20"></div>
            <div className="space-y-4 z-10 relative">
              <div className="flex items-center space-x-3"><FaUser className="text-blue-400" /><span>{userInfo.username}</span></div>
              <div className="flex items-center space-x-3"><FaEnvelope className="text-blue-400" /><span>{userInfo.email}</span></div>
              <div className="flex items-center space-x-3"><FaPhone className="text-blue-400" /><span>{userInfo.phone}</span></div>
              <div className="flex items-center space-x-3"><FaStar className="text-blue-400" /><span>Rating: {userInfo.rating}</span></div>
              <div className="flex items-center space-x-3"><FaAddressCard className="text-blue-400" /><span>Department: {userInfo.role}</span></div>
            </div>
          </div>

          {/* Leave Application Card */}
          <div className="bg-[#1a1a2e]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-20"></div>
            <h2 className="text-xl font-semibold text-white mb-4 z-10 relative">Apply for Leave</h2>
            <form className="space-y-4 z-10 relative">
              {formError && <div className="text-red-400">{formError}</div>}
              <div>
                <label htmlFor="leaveDate" className="block text-sm font-medium text-gray-300">Leave Date</label>
                <input
                  type="date"
                  id="leaveDate"
                  name="leaveDate"
                  className="mt-1 block w-full p-2 bg-[#16213e]/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  required
                />
              </div>
              <div>
                <label htmlFor="leaveType" className="block text-sm font-medium text-gray-300">Leave Type</label>
                <select
                  id="leaveType"
                  name="leaveType"
                  className="mt-1 block w-full p-2 bg-[#16213e]/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  required
                >
                  <option value="" className="bg-[#1a1a2e]">Select Leave Type</option>
                  <option value="Full Day" className="bg-[#1a1a2e]">Full Day</option>
                  <option value="Half Day" className="bg-[#1a1a2e]">Half Day</option>
                </select>
              </div>
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-300">Reason</label>
                <textarea
                  id="reason"
                  name="reason"
                  className="mt-1 block w-full p-2 bg-[#16213e]/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600/50 hover:bg-blue-700/70 text-white py-2 rounded-xl backdrop-blur-sm transition-all duration-300"
              >
                Apply for Leave
              </button>
            </form>
          </div>
        </div>

        {/* Attendance Section */}
        <div className="bg-[#1a1a2e]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-20"></div>
          <div className="flex items-center space-x-4 z-10 relative">
            <FaClock className="text-blue-400" />
            <span className="text-lg font-semibold">{new Date().toLocaleString()}</span>
          </div>
          <div className="space-x-4 z-10 relative">
            <button
              onClick={markAttendance}
              className="bg-green-600/50 hover:bg-green-700/70 text-white py-2 px-4 rounded-xl backdrop-blur-sm transition-all duration-300"
            >
              Mark Attendance
            </button>
            <button
              onClick={markDeparture}
              className="bg-red-600/50 hover:bg-red-700/70 text-white py-2 px-4 rounded-xl backdrop-blur-sm transition-all duration-300"
            >
              Mark Departure
            </button>
          </div>
        </div>

        {/* Attendance Status */}
        {attendanceStatus && (
          <div className="text-center text-lg font-semibold text-gray-200 bg-[#1a1a2e]/60 backdrop-blur-xl rounded-xl p-4">
            {attendanceStatus}
          </div>
        )}

        {/* Applied Leaves Section */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">Applied Leaves</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appliedLeaves.length > 0 ? (
              appliedLeaves.map((leave, index) => (
                <div 
                  key={index} 
                  className="bg-[#1a1a2e]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-4 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-20"></div>
                  <div className="z-10 relative">
                    <h3 className="text-lg font-semibold text-white mb-2">{leave.leaveType}</h3>
                    <p className="text-gray-300">Date: {leave.leaveDate}</p>
                    <p className="text-gray-300">Reason: {leave.reason}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No applied leaves yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashBoard;