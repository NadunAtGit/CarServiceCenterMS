import React, { useState, useEffect } from 'react';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import { FaUserCircle, FaUserTie, FaRegAddressCard, FaClipboardList,FaPaperPlane } from 'react-icons/fa';
import { MdSpaceDashboard, MdOutlineEventNote } from 'react-icons/md';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import UserData from '../../components/UserData';
import axiosInstance from '../../utils/AxiosInstance';



const MechanicHome = () => {

  const [isOpen, setIsOpen] = useState(true);
  const [userInfo, setUserInfo] = useState({}); // Ensure userInfo is initialized properly
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const menuItems = [
      { title: "Dashboard", icon: <MdSpaceDashboard size={26} />, path: "/mechanic/dashboard" },
      { title: "Appointments", icon: <MdOutlineEventNote size={26} />, path: "/admin/appointments" },
      { title: "Reports", icon: <FaClipboardList size={26} />, path: "/admin/reports" },
     
    ];

    const toggleSidebar = () => {
      setIsOpen(!isOpen);
    };
  
    const onLogout = () => {
      localStorage.clear();
      navigate("/login");
    };
  
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

    useEffect(() => {
        getUserInfo();
      }, []);
  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            isOpen ? 'w-72' : 'w-20'
          } fixed bg-gradient-to-b from-[#ff6b6b] via-[#ff3b3b] to-[#ff1e1e] min-h-screen h-full p-5 pt-8 relative flex flex-col transition-all duration-200 overflow-hidden`}
        >
          {/* Sidebar Toggle Button */}
          <FiMenu
            size={25}
            className={`text-white absolute cursor-pointer transition-all duration-300 ${
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
              <FaUserCircle size={40} className="text-white" />
            </div>
          )}

          {isOpen &&(
                      <div className="flex justify-center items-center mb-2">
                          <Link to={'/employee-dashboard'} className="text-decoration-none">
                            <button className="bg-white/10 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md transition-transform transform hover:scale-95 focus:outline-none">
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
                  className={`flex items-center text-white p-3 rounded-lg transition-all duration-200 border-2 border-white hover:bg-white/20 my-3 ${
                    isOpen ? 'justify-start gap-4' : 'justify-center'
                  }`}
                >
                  {item.icon}
                  {isOpen && <span className="text-white font-medium">{item.title}</span>}
                </div>
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="mt-auto">
            <div
              className={`flex items-center text-white p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/20 ${
                isOpen ? 'justify-start gap-4' : 'justify-center'
              }`}
              onClick={onLogout}
            >
              <FiLogOut size={26} />
              {isOpen && <span className="text-white font-medium">Logout</span>}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="`flex-grow p-5 ml-${isOpen ? '72' : '20'} transition-all duration-200 h-screen overflow-y-auto w-full">
          {error && <p className="text-red-500">{error}</p>}
          <Outlet />
        </div>
      </div>
    </>
  )
}

export default MechanicHome