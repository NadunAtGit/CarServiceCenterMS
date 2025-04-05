import React, { useState, useEffect } from 'react';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import { FaUserCircle, FaClipboardList, FaPaperPlane } from 'react-icons/fa';
import { MdOutlineEventNote } from 'react-icons/md';
import UserData from '../../components/UserData';
import axiosInstance from '../../utils/AxiosInstance';
import { Link, Outlet, useNavigate } from 'react-router-dom';

const ServiceAdvisorHome = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [userInfo, setUserInfo] = useState({});
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  useEffect(() => {
    getUserInfo();
  }, []);

  // Sidebar Toggle Function
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const onLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Sidebar Menu Items (Only Appointments & Job Card)
  const menuItems = [
    { title: "Appointments", icon: <MdOutlineEventNote size={26} />, path: "/serviceadvisor/appointments" },
    { title: "Job Card", icon: <FaClipboardList size={26} />, path: "/serviceadvisor/jobcards" },
  ];

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#D8D8D8]">
        {/* Sidebar */}
        <div
          className={`${
            isOpen ? 'w-82' : 'w-25'
          } fixed bg-gradient-to-br from-white/80 via-white/60 to-white/80 min-h-screen h-full p-5 pt-8 relative flex flex-col transition-all duration-200 overflow-hidden backdrop-blur-xl border-r border-[#944EF8]/20 shadow-lg`}
        >
          {/* Sidebar Toggle Button */}
          <FiMenu
            size={25}
            className={`text-[#944EF8] absolute cursor-pointer transition-all duration-300 hover:text-[#7a3fd0] ${
              isOpen ? 'right-5' : 'right-1/2 transform translate-x-1/2'
            }`}
            onClick={toggleSidebar}
          />

          {/* User Info */}
          {isOpen ? (
            <UserData 
              username={userInfo?.username || "N/A"} 
              role={userInfo?.role || "N/A"} 
              imgUrl={userInfo?.imageUrl || "https://via.placeholder.com/150"}
            />
          ) : (
            <div className="flex items-center justify-center mt-10">
              <FaUserCircle size={40} className="text-[#944EF8]" />
            </div>
          )}
          
          {isOpen && (
            <div className="flex justify-center items-center mb-2">
              <Link to={'/employee-dashboard'} className="text-decoration-none">
                <button className="bg-gradient-to-r from-[#944EF8]/80 to-[#944EF8]/60 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md transition-all transform hover:scale-95 focus:outline-none hover:from-[#944EF8]/90 hover:to-[#944EF8]/70 border border-[#944EF8]/30 shadow-md">
                  <FaPaperPlane className="text-xl" />
                  Your Dashboard
                </button>
              </Link>
            </div>
          )}

          {/* Menu Items */}
          <nav className="mt-1">
            {menuItems.map((item, index) => (
              <Link to={item.path} key={index} className="block">
                <div
                  className={`flex items-center text-gray-700 p-3 rounded-lg transition-all duration-200 hover:bg-[#944EF8]/10 hover:text-[#944EF8] my-3 border border-transparent hover:border-[#944EF8]/20 ${
                    isOpen ? 'justify-start gap-4' : 'justify-center'
                  }`}
                >
                  {item.icon}
                  {isOpen && <span className="font-medium">{item.title}</span>}
                </div>
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="mt-auto">
            <div
              className={`flex items-center text-gray-700 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#944EF8]/10 hover:text-[#944EF8] border border-transparent hover:border-[#944EF8]/20 ${
                isOpen ? 'justify-start gap-4' : 'justify-center'
              }`}
              onClick={onLogout}
            >
              <FiLogOut size={26} />
              {isOpen && <span className="font-medium">Logout</span>}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-grow p-5 transition-all duration-200 h-screen overflow-y-auto w-full bg-[#D8D8D8]`}>
          {error && <p className="text-red-500">{error}</p>}
          <div className="bg-white/70 rounded-2xl p-6 backdrop-blur-xl border border-[#944EF8]/10 shadow-lg">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
};

export default ServiceAdvisorHome;