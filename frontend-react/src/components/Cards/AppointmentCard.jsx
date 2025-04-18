import { FaCalendarAlt, FaClock, FaUser, FaCar } from "react-icons/fa";
import { useState } from "react";
import axiosInstance from "../../utils/AxiosInstance";

const AppointmentCard = ({ appointment, recallTable, recallCarousel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Available time slots
  const timeSlots = ["08:00:00", "09:30:00", "11:00:00", "12:30:00", "14:00:00", "15:30:00"];

  // Format time for display (removes seconds)
  const formatTimeForDisplay = (timeStr) => {
    return timeStr.substring(0, 5);
  };

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

  const handleRescheduleAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select both date and time for rescheduling.");
      return;
    }

    setRescheduleLoading(true);
    try {
      const response = await axiosInstance.put(
        `/api/appointments/reschedule-appointment/${appointment.AppointmentID}`,
        {
          Date: selectedDate,
          Time: selectedTime,
          VehicleNo: appointment.VehicleID,
        }
      );

      if (response.data.success) {
        console.log("Appointment rescheduled successfully!");
        setShowRescheduleModal(false);
        recallCarousel();
        recallTable();
      } else {
        console.error("Failed to reschedule appointment:", response.data.message);
        alert(`Failed to reschedule: ${response.data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      alert(`Error: ${error.response?.data?.error || error.message || "Unknown error"}`);
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Calculate minimum date (tomorrow)
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Calculate maximum date (60 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <>
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
          
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              className="w-full px-3 py-2 bg-gradient-to-r from-[#944EF8]/80 to-[#944EF8]/60 text-white rounded-lg shadow-md hover:from-[#944EF8]/90 hover:to-[#944EF8]/70 disabled:opacity-50 font-medium text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50"
              onClick={ConfirmAppointment}
              disabled={isLoading}
            >
              {isLoading ? "..." : "Confirm"}
            </button>
            {/* <button
              className="w-full px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 font-medium text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
              onClick={NotConfirmAppointment}
              disabled={isLoading}
            >
              {isLoading ? "..." : "Decline"}
            </button> */}
            <button
              className="w-full px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 disabled:opacity-50 font-medium text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={() => setShowRescheduleModal(true)}
              disabled={isLoading}
            >
              Reschedule
            </button>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Reschedule Appointment</h3>
            
            <div className="space-y-4">
              {/* Date Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select New Date</label>
                <input 
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#944EF8] focus:border-[#944EF8] transition-all duration-300"
                  min={getTomorrowDate()}
                  max={getMaxDate()}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>
              
              {/* Time Slots */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select New Time</label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`py-2 px-2 text-sm rounded-lg border ${
                        selectedTime === slot
                          ? 'bg-[#944EF8] text-white border-[#944EF8]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } transition-all duration-300`}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {formatTimeForDisplay(slot)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-300"
                onClick={() => setShowRescheduleModal(false)}
                disabled={rescheduleLoading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-gradient-to-r from-[#944EF8] to-[#944EF8]/80 text-white rounded-lg shadow-md hover:from-[#944EF8]/90 hover:to-[#944EF8]/70 transition-all duration-300 flex items-center space-x-1 disabled:opacity-70"
                onClick={handleRescheduleAppointment}
                disabled={!selectedDate || !selectedTime || rescheduleLoading}
              >
                {rescheduleLoading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Reschedule</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentCard;