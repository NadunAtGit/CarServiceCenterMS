import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaCalendar, FaAddressCard, FaRegMoneyBillAlt, FaStar, FaSignOutAlt, FaClipboardList, FaClock } from 'react-icons/fa';
import LeaveCard from '../components/Cards/LeaveCard';
import axiosInstance from '../utils/AxiosInstance';

const EmployeeDashBoard = () => {
  const appliedLeaves = [
    { leaveDate: '2025-03-10', leaveType: 'Full Day', reason: 'Personal Work', status: 'Pending' },
    { leaveDate: '2025-03-15', leaveType: 'Half Day', reason: 'Doctor Appointment', status: 'Approved' },
  ];

  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [userInfo, setUserInfo] = useState({});
  const [formError, setFormError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [formData, setFormData] = useState({
    leaveDate: '',
    leaveType: '',
    reason: ''
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    // Add form submission logic here
    console.log("Leave application submitted:", formData);
    // Reset form
    setFormData({
      leaveDate: '',
      leaveType: '',
      reason: ''
    });
  };

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
        setFormError("Failed to retrieve employee information.");
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
      if (error.response?.status === 401) {
        localStorage.clear();
        // navigate("/login");
      } else {
        setFormError("An error occurred while fetching employee data.");
      }
    }
  };

  const markAttendance = async () => {
    try {
      const response = await axiosInstance.post('api/admin/mark-attendance', { status: 'Present' });
      setAttendanceStatus(response.data.message || 'Attendance marked successfully');
      setAttendanceMarked(true);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setAttendanceStatus('Failed to mark attendance.');
    }
  };
  
  const markDeparture = async () => {
    try {
      const response = await axiosInstance.post('api/admin/mark-departure');
      setAttendanceStatus(response.data.message || 'Departure marked successfully');
      setAttendanceMarked(false);
    } catch (error) {
      console.error('Error marking departure:', error);
      setAttendanceStatus('Failed to mark departure.');
    }
  };

  useEffect(() => {
    getUserInfo();
    // Update time every minute
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const getStatusColor = () => {
      switch(status) {
        case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
        case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      }
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      {/* Navbar */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold">
              ED
            </div>
            <h1 className="text-xl font-bold text-purple-700">Employee Dashboard</h1>
          </div>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg flex items-center gap-2 transition-all duration-300 text-sm font-medium">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Top Section - Profile & Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center border border-slate-100">
            <div className="relative mb-4">
              <img 
                src={userInfo?.imageUrl || '/default-avatar.png'} 
                alt={userInfo.name} 
                className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
              />
              <div className="absolute bottom-0 right-0 bg-green-500 h-4 w-4 rounded-full border-2 border-white"></div>
            </div>
            <h2 className="text-xl font-semibold text-slate-800">{userInfo.name || 'Employee Name'}</h2>
            <p className="text-sm text-purple-600 font-medium mb-3">{userInfo.role || 'Role'}</p>
            
            <div className="w-full border-t border-slate-100 my-4"></div>
            
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <FaUser className="text-purple-500" />
                  <span className="text-sm">Username</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{userInfo.username || 'username'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <FaEnvelope className="text-purple-500" />
                  <span className="text-sm">Email</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{userInfo.email || 'email@example.com'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <FaPhone className="text-purple-500" />
                  <span className="text-sm">Phone</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{userInfo.phone || '123-456-7890'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <FaStar className="text-purple-500" />
                  <span className="text-sm">Rating</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{userInfo.rating || '4.5'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <FaAddressCard className="text-purple-500" />
                  <span className="text-sm">Department</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{userInfo.role || 'Engineering'}</span>
              </div>
            </div>
          </div>

          {/* Today's Status & Attendance */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Today's Status</h2>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <FaClock className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Current Time</p>
                    <p className="text-base font-medium text-slate-800">{currentTime.toLocaleTimeString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="text-base font-medium text-slate-800">{currentTime.toLocaleDateString()}</p>
                </div>
              </div>
              
              {attendanceStatus && (
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-sm text-purple-700 my-4">
                  {attendanceStatus}
                </div>
              )}
            </div>
            
            <div className="mt-auto">
              {attendanceMarked ? (
                <button
                  onClick={markDeparture}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 font-medium"
                >
                  <FaClock /> Mark Departure
                </button>
              ) : (
                <button
                  onClick={markAttendance}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 font-medium"
                >
                  <FaClock /> Mark Attendance
                </button>
              )}
            </div>
          </div>

          {/* Leave Application Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Apply for Leave</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div className="text-red-500 text-sm">{formError}</div>}
              
              <div>
                <label htmlFor="leaveDate" className="block text-sm font-medium text-slate-700 mb-1">Leave Date</label>
                <input
                  type="date"
                  id="leaveDate"
                  name="leaveDate"
                  value={formData.leaveDate}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="leaveType" className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <select
                  id="leaveType"
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  required
                >
                  <option value="">Select Leave Type</option>
                  <option value="Full Day">Full Day</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 font-medium"
              >
                <FaCalendar /> Apply for Leave
              </button>
            </form>
          </div>
        </div>

        {/* Applied Leaves Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Leave Applications</h2>
            <div className="text-xs font-medium text-slate-500">
              {appliedLeaves.length} Applications
            </div>
          </div>
          
          {appliedLeaves.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appliedLeaves.map((leave, index) => (
                <div 
                  key={index} 
                  className="bg-slate-50 rounded-lg p-4 relative border border-slate-100 transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-semibold text-slate-800">{leave.leaveType}</h3>
                    <StatusBadge status={leave.status} />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FaCalendar className="text-purple-500" />
                      <span className="text-slate-700">{leave.leaveDate}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <FaClipboardList className="text-purple-500 mt-1" />
                      <span className="text-slate-700">{leave.reason}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaClipboardList className="text-slate-400 text-xl" />
              </div>
              <p className="text-slate-500">No leave applications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashBoard;