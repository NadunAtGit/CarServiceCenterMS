import React, { useState,useEffect } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaCalendar, FaAddressCard, FaRegMoneyBillAlt, FaStar, FaSignOutAlt, FaClipboardList, FaClock } from 'react-icons/fa';
import LeaveCard from '../components/Cards/LeaveCard';
import axiosInstance from '../utils/AxiosInstance';

const EmployeeDashBoard = () => {
//   const userInfo = {
//     username: 'john_doe',
//     name: 'John Doe',
//     email: 'johndoe@example.com',
//     role: 'Software Engineer',
//     department: 'Development',
//     phone: '+1234567890',
//     salary: '$5000',
//     dateOfJoining: '01-01-2020',
//     rating: 4.5,
//     imageUrl: 'https://via.placeholder.com/150',
//   };

  const appliedLeaves = [
    { leaveDate: '2025-03-10', leaveType: 'Full Day', reason: 'Personal Work' },
    { leaveDate: '2025-03-15', leaveType: 'Half Day', reason: 'Doctor Appointment' },
  ];

  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [userInfo, setUserInfo] = useState({}); 
  const [formError, setFormError] = useState(null);


  const getUserInfo = async () => {
    try {
      const response = await axiosInstance.get("/api/admin/get-info-emp"); // Removed %0A
      console.log("API Response:", response.data); // Debugging

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
      setAttendanceStatus(response.data.message); // Display success or failure message
    } catch (error) {
      console.error('Error marking attendance:', error);
      setAttendanceStatus('Failed to mark attendance.');
    }
  };
  
  const markDeparture = async () => {
    try {
      const response = await axiosInstance.post('api/admin/mark-departure'); // Use correct endpoint
      setAttendanceStatus(response.data.message); // Display success or failure message
    } catch (error) {
      console.error('Error marking departure:', error);
      setAttendanceStatus('Failed to mark departure.');
    }
  };
  

  useEffect(() => {
    getUserInfo();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-500 text-white p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your Dashboard</h1>
        <button className="bg-cyan-600 py-2 px-4 rounded-md hover:bg-red-600 flex items-center cursor-pointer font-bold">
          <FaSignOutAlt className="mr-2" /> Logout
        </button>
      </div>

      <div className="container mx-auto p-6 lg:flex lg:space-x-6">
        <div className="lg:w-1/3 bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border-4 border-blue-600 mb-3 justify-center">
        <img src={userInfo?.imageUrl} alt={userInfo.name} 
                className="w-44 h-44 rounded-full border-2 border-gray-300 mb-4 object-cover" />
          <h2 className="text-xl font-semibold text-gray-800">{userInfo.name}</h2>
          <p className="text-sm text-gray-500">{userInfo.role}</p>
        </div>

        <div className="lg:w-1/3 bg-white rounded-xl shadow-lg p-6 border-blue-600 border-4 flex flex-col justify-center mb-3">
          <div className="space-y-4">
            <div className="flex items-center space-x-2"><FaUser className="text-blue-500" /><span>{userInfo.username}</span></div>
            <div className="flex items-center space-x-2"><FaEnvelope className="text-blue-500" /><span>{userInfo.email}</span></div>
            <div className="flex items-center space-x-2"><FaPhone className="text-blue-500" /><span>{userInfo.phone}</span></div>
            <div className="flex items-center space-x-2"><FaStar className="text-blue-500" /><span>Rating: {userInfo.rating}</span></div>
            <div className="flex items-center space-x-2"><FaAddressCard className="text-blue-500" /><span>Department: {userInfo.role}</span></div>
          </div>
        </div>

        <div className="lg:w-1/3 bg-white rounded-xl shadow-lg p-6 border-blue-600 border-4 mb-3">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Apply for Leave</h2>
          <form  className="space-y-4">
            {formError && <div className="text-red-500">{formError}</div>}
            <div>
              <label htmlFor="leaveDate" className="block text-sm font-medium text-gray-700">Leave Date</label>
              <input
                type="date"
                id="leaveDate"
                name="leaveDate"
                // value={leaveForm.leaveDate}
                // onChange={handleLeaveChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700">Leave Type</label>
              <select
                id="leaveType"
                name="leaveType"
                // value={leaveForm.leaveType}
                // onChange={handleLeaveChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select Leave Type</option>
                <option value="Full Day">Full Day</option>
                <option value="Half Day">Half Day</option>
              </select>
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                id="reason"
                name="reason"
                // value={leaveForm.reason}
                // onChange={handleLeaveChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
              Apply for Leave
            </button>
          </form>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between border-blue-600 border-4">
          <div className="flex items-center space-x-4">
            <FaClock className="text-blue-500" />
            <span className="text-lg font-semibold">{new Date().toLocaleString()}</span>
          </div>
          <div className="space-x-4">
            <button
              onClick={markAttendance}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
            >
              Mark Attendance
            </button>
            <button
              onClick={markDeparture}
              className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
            >
              Mark Departure
            </button>
          </div>
        </div>
        {attendanceStatus && (
          <div className="mt-4 text-center text-lg font-semibold text-gray-700">
            {attendanceStatus}
          </div>
        )}
      </div>

      <div className="container mx-auto p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Applied Leaves</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appliedLeaves.length > 0 ? (
            appliedLeaves.map((leave, index) => <LeaveCard key={index} leave={leave} />)
          ) : (
            <p className="text-gray-500">No applied leaves yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};


export default EmployeeDashBoard;