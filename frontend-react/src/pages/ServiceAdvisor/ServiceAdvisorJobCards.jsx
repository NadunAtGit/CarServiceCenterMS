import React, { useState, useEffect } from 'react';
import { FiSearch } from "react-icons/fi";
import { AiOutlineInfoCircle, AiOutlineDelete } from "react-icons/ai";
import { FiRefreshCcw } from "react-icons/fi";
import { FiPlus } from "react-icons/fi";
import axiosInstance from '../../utils/AxiosInstance';
import Modal from "react-modal";
import AddJobCard from '../../components/Modals/AddJobCard';
import Slider from "react-slick"; // Import react-slick
import "slick-carousel/slick/slick.css"; // Import slick styles
import "slick-carousel/slick/slick-theme.css";
import CreateJobCard from '../../components/Cards/CreateJobCard';

const ServiceAdvisorJobCards = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allJobCards, setAllJobcards] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openAddModal, setOpenAddModal] = useState({
    isShown: false,
    data: null,
  });

  const onCloseAdd = () => {
    setOpenAddModal({ isShown: false, data: null });
  };

  const getJobCards = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("api/teamleader/get-job-cards");
      if (response.data.success) {
        setAllJobcards(response.data.jobCards);
      } else {
        console.error("Failed to fetch job cards:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching job cards:", error);
    }
    setIsLoading(false);
  };

  const getTodayAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("api/appointments/today");
      if (response.data.success) {
        setTodayAppointments(response.data.appointments);
      } else {
        console.error("Failed to fetch today's appointments:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching today's appointments:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    getJobCards();
    getTodayAppointments();
  }, []);

  const settings = {
    dots: todayAppointments.length > 1, // Show dots only if there is more than 1 appointment
    infinite: todayAppointments.length > 1, // Enable infinite scroll if more than one appointment
    speed: 500,
    slidesToShow: Math.min(todayAppointments.length, 3), // Show up to 3 slides
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    centerMode: true, // Center the active slide
    centerPadding: "0px", // Ensure full-width centering
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(todayAppointments.length, 2),
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
    prevArrow: (
      <button
        type="button"
        className="slick-prev absolute top-1/2 left-4 transform -translate-y-1/2 text-white bg-gray-800 rounded-full p-2 z-10"
      >
        {"<"} {/* Customize with an icon or text */}
      </button>
    ),
    nextArrow: (
      <button
        type="button"
        className="slick-next absolute top-1/2 right-4 transform -translate-y-1/2 text-white bg-gray-800 rounded-full p-2 z-10"
      >
        {">"} {/* Customize with an icon or text */}
      </button>
    ),
  };
  
  

  return (
    <>
      <div className='mx-auto container w-full sm:overflow-hidden'>
        <div className='w-full flex flex-col justify-center'>
          <h1 className="text-xl font-bold mb-3">Today's Appointments</h1>

          {isLoading ? (
            <p>Loading appointments...</p>
          ) : todayAppointments.length === 0 ? (
            <p className="text-xl font-bold mb-3 text-center">No appointments for today.</p>
          ) : (
            <div className="relative flex w-full justify-center mx-auto">
                            <Slider {...settings} className="mb-10 max-w-4xl w-full">
                              {todayAppointments.map((appointment) => (
                                <div key={appointment.AppointmentID} className="px-2">
                                  <CreateJobCard appointment={appointment} recallCarousel={getTodayAppointments} recallTable={getJobCards}/>
                                </div>
                              ))}
                            </Slider>
            </div>

          )}

          <div className="w-full flex flex-row gap-3 my-5">
            <input
              type="text"
              placeholder="Search by vehicle, date, or Type"
              className="w-full outline-none border-b-2 border-gray-400 py-2 px-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className={`flex items-center gap-2 border-blue-300 border-3 p-2 rounded-2xl text-white bg-blue-500 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <FiSearch size={22} />
              {isLoading ? "Loading..." : "Search"}
            </button>
          </div>

          <div className=" flexoverflow-x-scroll md:overflow-x-auto">
                  <table className="max-w-6xl w-full bg-white rounded-lg shadow-lg justify-center">
                  <thead>
              <tr className="bg-[#5b7ad2] text-white">
                <th className="py-3 px-4 text-left">JobCardID ID</th>
                <th className="py-3 px-4 text-left">Service Type</th>
                <th className="py-3 px-4 text-left">AppointmentID</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Service Describe</th>
                <th className="py-3 px-4 text-left">Operations</th>
              </tr>
            </thead>
            <tbody>
            {allJobCards.length > 0 ? (
              allJobCards.map((jobcard) => (
                <tr key={jobcard.JobCardID} className="border-b">
                  <td className="py-3 px-4">{jobcard.JobCardID}</td>
                  <td className="py-3 px-4">{jobcard.Type}</td>
                  <td className="py-3 px-4">{jobcard.AppointmentID}</td>
                  <td className="py-3 px-4">{jobcard.Status}</td>
                  <td className="py-3 px-4">{jobcard.ServiceDetails}</td>
                  <td className="py-3 px-4 flex gap-3">
                    <AiOutlineInfoCircle className="text-blue-500 cursor-pointer" size={22} />
                    <FiRefreshCcw className="text-yellow-500 cursor-pointer" size={22} />
                    <AiOutlineDelete className="text-red-500 cursor-pointer" size={22} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  No Jobcards found.
                </td>
              </tr>
            )}
          </tbody>
                  </table>
          </div>

          

          {/* <div className='fixed bottom-10 right-20 w-16 h-16 bg-blue-500 flex items-center justify-center rounded-full shadow-lg 
            border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white transition-all duration-300 cursor-pointer' 
            onClick={() => setOpenAddModal({ isShown: true, data: null })}
          >
            <FiPlus size={40} color='white'/>
          </div> */}
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
        <AddJobCard onClose={onCloseAdd} getJobCards={getJobCards} />
      </Modal>
    </>
  );
};

export default ServiceAdvisorJobCards;