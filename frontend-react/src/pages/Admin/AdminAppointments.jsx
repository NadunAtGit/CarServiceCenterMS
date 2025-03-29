import React, { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";
import axiosInstance from "../../utils/AxiosInstance";
import AppointmentCard from "../../components/Cards/AppointmentCard";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notConfirmed, setNotConfirmed] = useState([]);

  const fetchAppointments = async () => {
    try {
      const response = await axiosInstance.get("api/appointments/get-all");
      if (response.data.success) {
        setAppointments(response.data.appointments);
      } else {
        console.error("Failed to fetch appointments:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchAppointments = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a search term");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`api/appointments/search-appointment?query=${searchQuery}`);

      if (response.data.success) {
        setAppointments(response.data.results);
      } else {
        console.error("Search failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error searching appointments:", error);
    } finally {
      setIsLoading(false);
    }
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
        setAppointments((prevAppointments) =>
          prevAppointments.filter((appointment) => appointment.AppointmentID !== id)
        );
        alert("Appointment deleted successfully!");
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

  useEffect(() => {
    fetchAppointments();
    fetchNotConfirmed();
  }, []);

  const settings = {
    dots: true,
    infinite: notConfirmed.length > 1,
    speed: 500,
    slidesToShow: Math.min(notConfirmed.length, 3),
    slidesToScroll: 3,
    autoplay: true,
    autoplaySpeed: 3000,
    dotsClass: "slick-dots custom-dots", // Custom class for dots
    centerMode: true,
    centerPadding: "0px",
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(notConfirmed.length, 2),
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-900 min-h-screen">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-100">Unapproved Appointments</h1>

        {isLoading ? (
          <p className="text-gray-400 text-center">Loading appointments...</p>
        ) : notConfirmed.length === 0 ? (
          <p className="text-xl font-bold mb-3 text-center text-gray-400">
            No unconfirmed appointments available.
          </p>
        ) : (
          <div className="flex justify-center w-full mb-10">
            <Slider 
              {...settings} 
              className="w-full md:w-4/5 custom-slider"
            >
              {notConfirmed.map((appointment) => (
                <div key={appointment.AppointmentID} className="px-2">
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
        <div className="w-full grid md:grid-cols-3 gap-3 mb-6">
          <div className="col-span-full md:col-span-2 flex space-x-2">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search by appointment ID, customer ID, or date"
                className="w-full bg-gray-800/50 text-gray-100 outline-none border border-gray-700/50 py-2 px-4 rounded-lg backdrop-blur-xl focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/50 text-white border border-blue-500/30 backdrop-blur-xl hover:bg-blue-700/50 transition-all duration-300"
              onClick={searchAppointments}
            >
              <FiSearch size={22} />
              Search
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-gray-100">Appointment Data</h1>

        {/* Appointments Table */}
        <div className="overflow-x-auto">
          <table className="w-full bg-gray-800/50 rounded-lg backdrop-blur-xl border border-gray-700/30 shadow-2xl">
            <thead>
              <tr className="bg-gray-700/50 text-gray-200">
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
                  <td colSpan="8" className="text-center py-4 text-gray-400">Loading...</td>
                </tr>
              ) : appointments.length > 0 ? (
                appointments.map((appointment) => (
                  <tr 
                    key={appointment.AppointmentID} 
                    className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="py-3 px-4 hidden md:table-cell text-gray-300">{appointment.AppointmentID}</td>
                    <td className="py-3 px-4 text-gray-100">{appointment.CustomerID}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-300">{appointment.VehicleID}</td>
                    <td className="py-3 px-4 text-gray-300">{appointment.Date}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-300">{appointment.Time}</td>
                    <td className="py-3 px-4 text-gray-300">{appointment.Status}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-300">{appointment.AppointmentMadeDate}</td>
                    <td className="py-3 px-4">
                      <button 
                        className="text-red-400 hover:text-red-500 transition-colors"
                        onClick={() => deleteAppointment(appointment.AppointmentID)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-400">
                    No appointments found.
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
          bottom: -25px;
        }
        .custom-slider .slick-dots li button:before {
          color: #4B5563;
          opacity: 0.5;
        }
        .custom-slider .slick-dots li.slick-active button:before {
          color: #3B82F6;
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default AdminAppointments;