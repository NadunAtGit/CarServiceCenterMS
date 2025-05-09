import React, { useEffect, useState, useCallback } from "react";
import { FiSearch, FiCalendar, FiX, FiRefreshCw } from "react-icons/fi";
import axiosInstance from "../../utils/AxiosInstance";
import AppointmentCard from "../../components/Cards/AppointmentCard";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notConfirmed, setNotConfirmed] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Format date to YYYY-MM-DD format for API requests and consistent comparison
  const formatDateForAPI = (date) => {
    if (!date) return null;
    return date.toISOString().split('T')[0];
  };

  // Format date for display in UI
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const fetchAppointments = async () => {
    try {
      const response = await axiosInstance.get("api/appointments/get-all");
      if (response.data.success) {
        setAppointments(response.data.appointments);
        setFilteredAppointments(response.data.appointments);
      } else {
        console.error("Failed to fetch appointments:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotConfirmed = async () => {
    try {
      const response = await axiosInstance.get("api/appointments/get-not-confirmed");
      if (response.data.success) {
        setNotConfirmed(response.data.appointments);
      } else {
        console.error("Failed to fetch appointments:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply both filters independently
  const applyFilters = useCallback((query, date) => {
    setIsLoading(true);
    
    try {
      let results = [...appointments];
      
      // Apply search query filter if it exists
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        results = results.filter(appointment => 
          (appointment.AppointmentID && appointment.AppointmentID.toString().toLowerCase().includes(searchTerm)) ||
          (appointment.CustomerID && appointment.CustomerID.toString().toLowerCase().includes(searchTerm)) ||
          (appointment.VehicleID && appointment.VehicleID.toLowerCase().includes(searchTerm)) ||
          (appointment.Status && appointment.Status.toLowerCase().includes(searchTerm))
        );
      }

      // Apply date filter independently if it exists
      if (date) {
        const filterDate = formatDateForAPI(date);
        results = results.filter(appointment => {
          const appointmentDate = appointment.Date ? appointment.Date.split('T')[0] : null;
          return appointmentDate === filterDate;
        });
      }
      
      setFilteredAppointments(results);
    } catch (error) {
      console.error("Error filtering appointments:", error);
      setFilteredAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [appointments]);

  // Handle search input with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set a new timeout to delay the search
    const timeoutId = setTimeout(() => {
      applyFilters(query, selectedDate);
    }, 500); // 500ms delay
    
    setSearchTimeout(timeoutId);
  };

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    applyFilters(searchQuery, date);
  };

  const deleteAppointment = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this appointment? This action cannot be undone."
    );
  
    if (!confirmDelete) return;
  
    setIsLoading(true);
  
    try {
      const response = await axiosInstance.delete(`api/appointments/delete-appointment/${id}`);
  
      if (response.data.success) {
        setAppointments(prev => prev.filter(a => a.AppointmentID !== id));
        setFilteredAppointments(prev => prev.filter(a => a.AppointmentID !== id));
        alert("Appointment deleted successfully!");
        
        // Also refresh not confirmed list if needed
        fetchNotConfirmed();
      } else {
        alert("Failed to delete the appointment: " + response.data.message);
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      alert("An error occurred while deleting the appointment.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDate(null);
    setFilteredAppointments(appointments);
  };

  // Handle clicks outside datepicker to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (showDatePicker && !event.target.closest(".date-picker-container")) {
        setShowDatePicker(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDatePicker]);

  useEffect(() => {
    fetchAppointments();
    fetchNotConfirmed();
    
    // Clean up timeout on component unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  const settings = {
    dots: true,
    infinite: notConfirmed.length > 1,
    speed: 500,
    slidesToShow: Math.min(notConfirmed.length, 3),
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    dotsClass: "slick-dots custom-dots", 
    centerMode: true,
    centerPadding: "0px",
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(notConfirmed.length, 2),
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#D8D8D8] min-h-screen">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Unapproved Appointments</h1>

        {isLoading ? (
          <p className="text-gray-600 text-center">Loading appointments...</p>
        ) : notConfirmed.length === 0 ? (
          <p className="text-xl font-bold mb-3 text-center text-gray-600">
            No unconfirmed appointments available.
          </p>
        ) : (
          <div className="flex justify-center w-full mb-10">
            <Slider 
              {...settings} 
              className="w-full md:w-4/5 custom-slider"
            >
              {notConfirmed.map((appointment) => (
                <div key={appointment.AppointmentID} className="px-3 py-2">
                  <AppointmentCard 
                    appointment={appointment} 
                    recallCarousel={fetchNotConfirmed} 
                    recallTable={fetchAppointments}
                  />
                </div>
              ))}
            </Slider>
          </div>
        )}

        {/* Search Section */}
        <div className="w-full grid md:grid-cols-4 gap-3 mb-6">
          <div className="col-span-full md:col-span-3 flex space-x-2 flex-wrap md:flex-nowrap gap-2">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search by ID, customer, vehicle, or status"
                className="w-full bg-white/70 text-gray-800 outline-none border border-[#944EF8]/20 py-2 px-4 rounded-lg backdrop-blur-xl focus:ring-2 focus:ring-[#944EF8]/30 transition-all duration-300"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            
            {/* Date Filter */}
            <div className="relative date-picker-container">
              <button
                className="flex items-center gap-2 px-4 py-2 h-full rounded-lg bg-white/70 text-gray-800 border border-[#944EF8]/20 hover:bg-[#944EF8]/10 transition-all duration-300"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <FiCalendar size={20} />
                {selectedDate ? formatDateForDisplay(selectedDate) : "Filter by date"}
                {selectedDate && (
                  <FiX 
                    size={16} 
                    className="ml-2 text-gray-500 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(null);
                      applyFilters(searchQuery, null); // Apply filters without date
                    }}
                  />
                )}
              </button>
              
              {showDatePicker && (
                <div className="absolute z-10 mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                  <DatePicker
                    selected={selectedDate}
                    onChange={handleDateChange}
                    inline
                    className="border-none"
                  />
                </div>
              )}
            </div>
          </div>
          
          <button
            className="col-span-full md:col-span-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
            onClick={clearFilters}
          >
            <FiRefreshCw size={16} />
            Clear Filters
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-gray-800">Appointment Data</h1>

        {/* Appointments Table */}
        <div className="overflow-x-auto rounded-xl shadow-lg">
          <table className="w-full bg-white/70 rounded-lg backdrop-blur-xl border border-[#944EF8]/10 shadow-md">
            <thead>
              <tr className="bg-[#944EF8]/10 text-gray-800">
                <th className="py-3 px-4 text-left hidden md:table-cell">Appointment ID</th>
                <th className="py-3 px-4 text-left">Customer ID</th>
                <th className="py-3 px-4 text-left hidden md:table-cell">Vehicle</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left hidden md:table-cell">Time</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left hidden md:table-cell">Made at</th>
                <th className="py-3 px-4 text-left">Operations</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-500">Loading...</td>
                </tr>
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment) => (
                  <tr 
                    key={appointment.AppointmentID} 
                    className="border-b border-[#944EF8]/10 hover:bg-[#944EF8]/5 transition-colors"
                  >
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{appointment.AppointmentID}</td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{appointment.CustomerID}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{appointment.VehicleID}</td>
                    <td className="py-3 px-4 text-gray-700">{formatDateForDisplay(appointment.Date)}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{appointment.Time}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        appointment.Status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                        appointment.Status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.Status === 'Canceled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.Status}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{formatDateForDisplay(appointment.AppointmentMadeDate)}</td>
                    <td className="py-3 px-4">
                      <button 
                        className="text-red-500 hover:text-red-600 transition-colors"
                        onClick={() => deleteAppointment(appointment.AppointmentID)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-500">
                    No appointments found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom CSS for Slick Carousel */}
      <style jsx global>{`
        .custom-slider .slick-dots {
          bottom: -30px;
        }
        .custom-slider .slick-dots li button:before {
          color: #6B7280;
          opacity: 0.5;
        }
        .custom-slider .slick-dots li.slick-active button:before {
          color: #944EF8;
          opacity: 1;
        }
        .custom-slider .slick-prev:before,
        .custom-slider .slick-next:before {
          color: #944EF8;
        }
      `}</style>
    </div>
  );
};

export default AdminAppointments;
