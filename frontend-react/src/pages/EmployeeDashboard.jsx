import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaSignOutAlt, FaClock, FaCalendarCheck, FaCalendarTimes, FaChartLine, FaIdCard, FaStar, FaBuilding } from 'react-icons/fa';
import axiosInstance from '../utils/AxiosInstance';

const EmployeeDashBoard = () => {
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [userInfo, setUserInfo] = useState({});
  const [formError, setFormError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 18,
    absent: 2,
    late: 3,
    percentage: 90
  });

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
          department: employee.Department || employee.Role
        });
      } else {
        setFormError("Failed to retrieve employee information.");
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
      if (error.response?.status === 401) {
        localStorage.clear();
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

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      {/* Navbar */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold">
              {userInfo.name?.charAt(0) || 'E'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-purple-700">Employee Dashboard</h1>
              <p className="text-xs text-slate-500">{currentTime.toLocaleDateString()} | {currentTime.toLocaleTimeString()}</p>
            </div>
          </div>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg flex items-center gap-2 transition-all duration-300 text-sm font-medium">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Top Section - Attendance Card */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Attendance Status */}
              <div className="flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-2">Today's Attendance</h2>
                  <p className="text-slate-500 mb-4">Mark your attendance for {currentTime.toLocaleDateString()}</p>
                  
                  {attendanceStatus && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-purple-700 my-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <FaCalendarCheck className="text-purple-600" />
                      </div>
                      <span>{attendanceStatus}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  {attendanceMarked ? (
                    <button
                      onClick={markDeparture}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 font-medium"
                    >
                      <FaClock className="text-lg" /> Mark Departure
                    </button>
                  ) : (
                    <button
                      onClick={markAttendance}
                      className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 font-medium"
                    >
                      <FaClock className="text-lg" /> Mark Attendance
                    </button>
                  )}
                </div>
              </div>
              
              {/* Time & Stats */}
              <div className="bg-slate-50 rounded-xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <FaClock className="text-purple-600 text-lg" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Current Time</p>
                      <p className="text-xl font-semibold text-slate-800">{currentTime.toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Monthly Attendance</p>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${attendanceStats.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <FaCalendarCheck className="text-green-500" />
                      <span>Present: {attendanceStats.present}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FaCalendarTimes className="text-red-500" />
                      <span>Absent: {attendanceStats.absent}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FaClock className="text-orange-500" />
                      <span>Late: {attendanceStats.late}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile & Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <img 
                src={userInfo?.imageUrl || '/default-avatar.png'} 
                alt={userInfo.name} 
                className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
              />
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{userInfo.name || 'Employee Name'}</h2>
                <p className="text-sm text-purple-600 font-medium">{userInfo.role || 'Role'}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} className={`text-xs ${i < Math.floor(userInfo.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                  <span className="text-xs text-slate-500 ml-1">{userInfo.rating || '0'}/5</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <FaIdCard className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employee ID</p>
                  <p className="text-sm font-medium text-slate-800">{userInfo.id || 'EMP-001'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <FaEnvelope className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email Address</p>
                  <p className="text-sm font-medium text-slate-800">{userInfo.email || 'email@example.com'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <FaPhone className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone Number</p>
                  <p className="text-sm font-medium text-slate-800">{userInfo.phone || '123-456-7890'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <FaBuilding className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="text-sm font-medium text-slate-800">{userInfo.department || 'Engineering'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance History & Stats */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-800">Attendance History</h2>
                <select className="text-sm border border-slate-200 rounded-lg p-2 bg-slate-50">
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>Last 3 Months</option>
                </select>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3 rounded-tl-lg">Date</th>
                      <th className="px-4 py-3">Check In</th>
                      <th className="px-4 py-3">Check Out</th>
                      <th className="px-4 py-3 rounded-tr-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { date: '2025-05-13', checkIn: '09:00 AM', checkOut: '05:30 PM', status: 'Present' },
                      { date: '2025-05-12', checkIn: '09:15 AM', checkOut: '05:45 PM', status: 'Late' },
                      { date: '2025-05-11', checkIn: '08:55 AM', checkOut: '05:30 PM', status: 'Present' },
                      { date: '2025-05-10', checkIn: '09:00 AM', checkOut: '05:25 PM', status: 'Present' },
                      { date: '2025-05-09', checkIn: '-', checkOut: '-', status: 'Absent' },
                      { date: '2025-05-08', checkIn: '08:50 AM', checkOut: '05:30 PM', status: 'Present' },
                    ].map((record, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-700">{record.date}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{record.checkIn}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{record.checkOut}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                            record.status === 'Absent' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-center mt-6">
                <button className="text-sm text-purple-600 font-medium hover:text-purple-800 transition-colors">
                  View All Records
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashBoard;
