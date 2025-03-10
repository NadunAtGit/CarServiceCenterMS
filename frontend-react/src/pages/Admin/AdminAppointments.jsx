import React, { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";
import axiosInstance from "../../utils/AxiosInstance";
import AppointmentCard from "../../components/Cards/AppointmentCard";
import Slider from "react-slick"; // Import react-slick
import "slick-carousel/slick/slick.css"; // Import slick styles
import "slick-carousel/slick/slick-theme.css";

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const[notConfirmed,setNotConfirmed]=useState([]);

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

  const searchEmployees = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a search term");
      return;
    }

    setIsLoading(true);
    try {
      // Update the API endpoint to match the correct route
      const response = await axiosInstance.get(`api/appointments/search-appointment?query=${searchQuery}`);

      if (response.data.success) {
        setAllEmployees(response.data.results); // Update the state with search results
      } else {
        console.error("Search failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error searching employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAppointment = async (id) => {
    console.log("Delete function called with ID:", id); // Debug log
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this appointment? This action cannot be undone."
    );
  
    if (!confirmDelete) return;
  
    setIsLoading(true);
  
    try {
      const response = await axiosInstance.delete(`api/appointments/delete-appointment/${id}`);
      console.log("Response:", response); // Log the response
  
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
    infinite: notConfirmed.length > 1, // Enable infinite scroll if more than one appointment
    speed: 500,
    slidesToShow: Math.min(notConfirmed.length, 3), // Show up to 3 slides
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    centerMode: true, // Center the active slide
    centerPadding: "0px", // Ensure full-width centering
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
    <div className="mx-auto">
      <div className="w-full flex justify-center flex-col">
        <h1 className="text-xl font-bold mb-3 ">Unapproved Appointments</h1>

        {isLoading ? (
          <p>Loading appointments...</p>
        ) : notConfirmed.length === 0 ? (
          <p className="text-xl font-bold mb-3 text-center">No unconfirmed appointments available.</p>
        ) : (
          <div className="flex justify-center w-full">
  <Slider {...settings} className="mb-10 w-4/5">
    {notConfirmed.map((appointment) => (
      <div key={appointment.AppointmentID} className="px-2">
        <AppointmentCard appointment={appointment} recallCarousel={fetchNotConfirmed} recallTable={fetchAppointments}/>
      </div>
    ))}
  </Slider>
</div>


        )}

        <div className="w-full flex flex-row gap-3 my-5">
          <input
            type="text"
            placeholder="Search by appointment ID, customer ID, or date"
            className="w-full outline-none border-b-2 border-gray-400 py-2 px-4"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="flex items-center gap-2 border-blue-300 border-3 p-2 rounded-2xl text-white bg-blue-500 " onClick={searchEmployees}>
            <FiSearch size={22} />
            Search
            
          </button>
        </div>

        <h1 className="text-xl font-bold mb-3">Appointment Data</h1>

        <div className="overflow-x-scroll md:overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-lg">
            <thead>
              <tr className="bg-[#5b7ad2] text-white">
                <th className="py-3 px-4 text-left">Appointment ID</th>
                <th className="py-3 px-4 text-left">Customer ID</th>
                <th className="py-3 px-4 text-left">Vehicle</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Time</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Made at</th>
                <th className="py-3 px-4 text-left">Operations</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">Loading...</td>
                </tr>
              ) : appointments.length > 0 ? (
                appointments.map((appointment) => (
                  <tr key={appointment.AppointmentID} className="border-b">
                    <td className="py-3 px-4">{appointment.AppointmentID}</td>
                    <td className="py-3 px-4">{appointment.CustomerID}</td>
                    <td className="py-3 px-4">{appointment.VehicleID}</td>
                    <td className="py-3 px-4">{appointment.Date}</td>
                    <td className="py-3 px-4">{appointment.Time}</td>
                    <td className="py-3 px-4">{appointment.Status}</td>
                    <td className="py-3 px-4">{appointment.AppointmentMadeDate}</td>
                    <td className="py-3 px-4">
                      <button className="text-red-500" onClick={()=>deleteAppointment(appointment.AppointmentID)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAppointments;
