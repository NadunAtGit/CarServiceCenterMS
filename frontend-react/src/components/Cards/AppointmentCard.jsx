import { FaCalendarAlt, FaClock, FaUser, FaCar } from "react-icons/fa";
import { useState } from "react";
import axiosInstance from "../../utils/AxiosInstance";

const AppointmentCard = ({ appointment,recallTable,recallCarousel }) => {
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
    <div className="p-7 border-3 border-red-400 rounded-2xl shadow-lg space-y-4 w-1/3 mb-10">
      <h1 className="text-xl font-bold">Appointment</h1>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <FaCalendarAlt className="text-blue-500" />
          <span>{appointment.AppointmentMadeDate}</span>
        </div>
        <div className="flex items-center space-x-2">
          <FaClock className="text-green-500" />
          <span>{appointment.Time}</span>
        </div>
        <div className="flex items-center space-x-2">
          <FaUser className="text-purple-500" />
          <span>{appointment.CustomerID}</span>
        </div>
        <div className="flex items-center space-x-2">
          <FaCar className="text-red-500" />
          <span>{appointment.VehicleID}</span>
        </div>
      </div>
      <div className="flex space-x-4">
        <button
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 disabled:opacity-50"
          onClick={ConfirmAppointment}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Confirm"}
        </button>
        <button
          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 disabled:opacity-50"
          onClick={NotConfirmAppointment}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Not Confirm"}
        </button>
      </div>
    </div>
  );
};

export default AppointmentCard;