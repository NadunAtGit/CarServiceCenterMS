import React, { useState } from 'react';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import { FaUserCircle } from 'react-icons/fa';
import { MdOutlineEventNote } from 'react-icons/md';
import { FaClipboardList } from 'react-icons/fa';
import { Link, Outlet } from 'react-router-dom';
import UserData from '../../components/UserData';

const ServiceAdvisorHome = () => {
  const [isOpen, setIsOpen] = useState(true);

  // Sidebar Toggle Function
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Sidebar Menu Items (Only Appointments & Job Card)
  const menuItems = [
    { title: "Appointments", icon: <MdOutlineEventNote size={30} className="text-white font-bold" />, path: "/serviceadvisor/appointments" },
    { title: "Job Card", icon: <FaClipboardList size={30} className="text-white font-bold" />, path: "/serviceadvisor/jobcards" },
  ];

  return (
    <>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div
          className={`${
            isOpen ? 'w-72' : 'w-20'
          } bg-gradient-to-b from-[#ff9a9e] via-[#ff6b6b] to-[#ff3b3b] min-h-screen h-full p-5 pt-8 relative flex flex-col transition-all duration-200`}
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
            <UserData />
          ) : (
            <div className="flex items-center justify-center mt-10">
              <FaUserCircle size={40} className="text-white" />
            </div>
          )}

          {/* Menu Items */}
          <nav className="mt-10">
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
            >
              <FiLogOut size={26} />
              {isOpen && <span className="text-white font-medium">Logout</span>}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-grow p-5">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default ServiceAdvisorHome;
