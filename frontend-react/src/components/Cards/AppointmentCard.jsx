import { FaCalendarAlt, FaClock, FaUser, FaCar } from "react-icons/fa";
import { useState } from "react";
import axiosInstance from "../../utils/AxiosInstance";

const AppointmentCard = ({ appointment, recallTable, recallCarousel }) => {
  const [isLoading, setIsLoading] = useState(false);

  const ConfirmAppointment = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.put(`/api/appointments/confirm-appointment/${appointment.AppointmentID}`);

      if (response.data.success) {
        console.log("Appointment confirmed successfully!");
        recallCarousel();
        recallTable();
      } else {
        console.error("Failed to confirm appointment:", response.data.message);
      }
    } catch (error) {
      console.error("Error confirming appointment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const NotConfirmAppointment = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.put(`/api/appointments/not-confirm-appointment/${appointment.AppointmentID}`);
      if (response.data.success) {
        console.log("Appointment marked as not confirmed!");
        recallCarousel();
        recallTable();
      } else {
        console.error("Failed to update appointment status:", response.data.message);
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-[#944EF8]/20 rounded-xl shadow-lg p-5 md:p-6 w-full h-full transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1">
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-[#944EF8]/10 pb-3">
          <h2 className="text-xl font-bold text-gray-800">Appointment</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-[#944EF8]/10 text-[#944EF8] font-medium">
            #{appointment.AppointmentID}
          </span>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-[#944EF8]/10 p-2 rounded-full">
              <FaCalendarAlt className="text-[#944EF8]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-sm font-medium text-gray-700">{appointment.AppointmentMadeDate}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-[#944EF8]/10 p-2 rounded-full">
              <FaClock className="text-[#944EF8]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Time</p>
              <p className="text-sm font-medium text-gray-700">{appointment.Time}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-[#944EF8]/10 p-2 rounded-full">
              <FaUser className="text-[#944EF8]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Customer</p>
              <p className="text-sm font-medium text-gray-700">{appointment.CustomerID}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-[#944EF8]/10 p-2 rounded-full">
              <FaCar className="text-[#944EF8]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Vehicle</p>
              <p className="text-sm font-medium text-gray-700">{appointment.VehicleID}</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            className="w-full px-3 py-2 bg-gradient-to-r from-[#944EF8]/80 to-[#944EF8]/60 text-white rounded-lg shadow-md hover:from-[#944EF8]/90 hover:to-[#944EF8]/70 disabled:opacity-50 font-medium text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50"
            onClick={ConfirmAppointment}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Confirm"}
          </button>
          <button
            className="w-full px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 font-medium text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
            onClick={NotConfirmAppointment}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;