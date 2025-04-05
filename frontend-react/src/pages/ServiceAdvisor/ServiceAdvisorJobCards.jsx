import React, { useState, useEffect } from 'react';
import { FiSearch, FiRefreshCcw, FiPlus } from "react-icons/fi";
import { AiOutlineInfoCircle, AiOutlineDelete } from "react-icons/ai";
import axiosInstance from '../../utils/AxiosInstance';
import Modal from "react-modal";
import AddJobCard from '../../components/Modals/AddJobCard';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
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
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");

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
        // Set the first appointment as selected by default if available
        if (response.data.appointments.length > 0 && !selectedAppointment) {
          setSelectedAppointment(response.data.appointments[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
    setIsLoading(false);
  };
  
  useEffect(() => {
    getJobCards();
    getTodayAppointments();
    Modal.setAppElement('#root');
  }, []);

  // Filter job cards based on search query and status filter
  const filteredJobCards = allJobCards.filter(jobCard => {
    const matchesSearch = searchQuery === "" || 
      jobCard.JobCardID.toLowerCase().includes(searchQuery.toLowerCase()) || 
      jobCard.Type.toLowerCase().includes(searchQuery.toLowerCase()) || 
      jobCard.AppointmentID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (jobCard.ServiceDetails && jobCard.ServiceDetails.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterStatus === "" || jobCard.Status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const openAddJobCardModal = (appointment) => {
    setSelectedAppointment(appointment);
    setOpenAddModal({
      isShown: true,
      data: {
        appointmentId: appointment.AppointmentID
      }
    });
  };

  const settings = {
    dots: todayAppointments.length > 1,
    infinite: todayAppointments.length > 1,
    speed: 500,
    slidesToShow: Math.min(todayAppointments.length, 3),
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    centerMode: true,
    centerPadding: "0px",
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
        className="slick-prev absolute top-1/2 left-4 transform -translate-y-1/2 text-white bg-[#944EF8] rounded-full p-2 z-10"
      >
        {"<"}
      </button>
    ),
    nextArrow: (
      <button
        type="button"
        className="slick-next absolute top-1/2 right-4 transform -translate-y-1/2 text-white bg-[#944EF8] rounded-full p-2 z-10"
      >
        {">"}
      </button>
    ),
    afterChange: (current) => {
      // Update the selected appointment when slide changes
      if (todayAppointments.length > 0) {
        setSelectedAppointment(todayAppointments[current]);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#D8D8D8] min-h-screen">
      <div className='w-full'>
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Today's Appointments</h1>

        {isLoading ? (
          <div className="py-10 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8] mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading appointments...</p>
          </div>
        ) : todayAppointments.length === 0 ? (
          <div className="bg-white/80 rounded-lg shadow-md p-8 mb-6 text-center backdrop-blur-sm border border-[#944EF8]/10">
            <p className="text-lg text-gray-600">No appointments scheduled for today.</p>
          </div>
        ) : (
          <div className="relative flex w-full justify-center mx-auto mb-8">
            <Slider {...settings} className="max-w-4xl w-full">
              {todayAppointments.map((appointment) => (
                <div key={appointment.AppointmentID} className="px-2">
                  <CreateJobCard 
                    appointment={appointment} 
                    recallCarousel={getTodayAppointments} 
                    recallTable={getJobCards} 
                    onCreateJobCard={() => openAddJobCardModal(appointment)}
                  />
                </div>
              ))}
            </Slider>
          </div>
        )}

        {/* Selected Appointment Info */}
        {selectedAppointment && (
          <div className="bg-white/80 rounded-lg shadow-md p-4 mb-6 backdrop-blur-sm border border-[#944EF8]/10">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Selected Appointment</h2>
            <p className="text-gray-700">
              <span className="font-medium">Appointment ID:</span> {selectedAppointment.AppointmentID} | 
              <span className="font-medium ml-2">Customer:</span> {selectedAppointment.CustomerName || 'N/A'} | 
              <span className="font-medium ml-2">Vehicle:</span> {selectedAppointment.VehicleModel || 'N/A'}
            </p>
            <button
              className="mt-3 bg-[#944EF8] text-white py-2 px-4 rounded-lg hover:bg-[#7a3dd0] transition-all duration-300 flex items-center gap-2"
              onClick={() => openAddJobCardModal(selectedAppointment)}
            >
              <FiPlus size={18} />
              Create Job Card for This Appointment
            </button>
          </div>
        )}

        {/* Search Section */}
        <div className="w-full grid md:grid-cols-3 gap-3 mb-6">
          <div className="col-span-full md:col-span-2 flex space-x-2">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search by vehicle, date, or Type"
                className="w-full bg-white/50 text-gray-800 outline-none border border-[#944EF8]/20 py-2 px-4 rounded-lg backdrop-blur-xl focus:ring-2 focus:ring-[#944EF8]/50 transition-all duration-300 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#944EF8]/80 to-[#944EF8]/60 text-white border border-[#944EF8]/30 backdrop-blur-xl hover:from-[#944EF8]/90 hover:to-[#944EF8]/70 transition-all duration-300 shadow-md ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
              onClick={() => getJobCards()}
            >
              <FiSearch size={22} />
              {isLoading ? "Loading..." : "Search"}
            </button>
          </div>
          
          <div>
            <select
              className="w-full bg-white/50 text-gray-800 border border-[#944EF8]/20 py-2 px-4 rounded-lg backdrop-blur-xl shadow-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="" className="bg-white">Filter by Status</option>
              <option value="Completed" className="bg-white">Completed</option>
              <option value="In Progress" className="bg-white">In Progress</option>
              <option value="Pending" className="bg-white">Pending</option>
              <option value="Not Started" className="bg-white">Not Started</option>
            </select>
          </div>
        </div>

        {/* Job Cards Table */}
        <div className="overflow-x-auto rounded-xl shadow-xl">
          <table className="w-full bg-white/70 rounded-lg backdrop-blur-xl border border-[#944EF8]/10">
            <thead>
              <tr className="bg-[#944EF8]/10 text-gray-700">
                <th className="py-3 px-4 text-left font-semibold">JobCard ID</th>
                <th className="py-3 px-4 text-left font-semibold">Service Type</th>
                <th className="py-3 px-4 text-left hidden md:table-cell font-semibold">Appointment ID</th>
                <th className="py-3 px-4 text-left font-semibold">Status</th>
                <th className="py-3 px-4 text-left hidden md:table-cell font-semibold">Service Description</th>
                <th className="py-3 px-4 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobCards.length > 0 ? (
                filteredJobCards.map((jobcard) => (
                  <tr key={jobcard.JobCardID} className="border-b border-[#944EF8]/10 hover:bg-[#944EF8]/5 transition-colors">
                    <td className="py-3 px-4 text-gray-800 font-medium">{jobcard.JobCardID}</td>
                    <td className="py-3 px-4 text-gray-700">{jobcard.Type}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{jobcard.AppointmentID}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        jobcard.Status === 'Completed' ? 'bg-green-100 text-green-800' :
                        jobcard.Status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        jobcard.Status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        jobcard.Status === 'Not Started' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {jobcard.Status}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate hidden md:table-cell text-gray-700">{jobcard.ServiceDetails}</td>
                    <td className="py-3 px-4 flex gap-3 items-center">
                      <AiOutlineInfoCircle className="text-[#944EF8] cursor-pointer hover:text-[#7a3dd0] transition-colors" size={22} />
                      <FiRefreshCcw className="text-amber-500 cursor-pointer hover:text-amber-600 transition-colors" size={22} />
                      <AiOutlineDelete className="text-red-400 cursor-pointer hover:text-red-500 transition-colors" size={22} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    No job cards found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Job Card Floating Button */}
        {todayAppointments.length > 0 && (
          <div 
            className="fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-[#944EF8] to-[#944EF8]/80 flex items-center justify-center rounded-full 
             border border-[#944EF8]/30 shadow-lg hover:shadow-xl hover:from-[#944EF8]/90 hover:to-[#944EF8] transition-all duration-300 cursor-pointer z-50"
            onClick={() => {
              if (selectedAppointment) {
                openAddJobCardModal(selectedAppointment);
              } else if (todayAppointments.length > 0) {
                openAddJobCardModal(todayAppointments[0]);
              }
            }}
            title="Add New Job Card"
          >
            <FiPlus size={30} color="white" />
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={openAddModal.isShown}
        onRequestClose={onCloseAdd}
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
            width: '600px',
            boxShadow: 'none'
          }
        }}
        className="focus:outline-none"
      >
        <div className="bg-white/90 rounded-2xl backdrop-blur-xl border border-[#944EF8]/20 shadow-2xl">
          <AddJobCard 
            onClose={onCloseAdd} 
            getJobCards={getJobCards} 
            appointmentId={openAddModal.data?.appointmentId}
            getAppointments={getTodayAppointments}
            recallCarousel={getTodayAppointments}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ServiceAdvisorJobCards;