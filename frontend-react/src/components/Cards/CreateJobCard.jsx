import React from 'react';
import { FiPlus } from "react-icons/fi";

const CreateJobCard = ({ appointment, recallCarousel, recallTable, onCreateJobCard }) => {
  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format time helper function
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Extract necessary information from appointment
  const {
    AppointmentID,
    CustomerID,
    VehicleID,
    Date: appointmentDate,
    Time: appointmentTime,
    Status = "Scheduled", // Default value
    AppointmentMadeDate,
    // Extended details that might come from API
    CustomerName = CustomerID, // Fallback to CustomerID if name not available
    CustomerPhone,
    VehicleModel = VehicleID, // Fallback to VehicleID if model not available
    VehicleType,
    CurrentMileage,
    NextServiceMileage,
    Description = "No description provided" // Default value
  } = appointment;

  // Determine status color
  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <div className="bg-white/80 rounded-lg shadow-md overflow-hidden backdrop-blur-sm border border-[#944EF8]/10 h-full flex flex-col">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#944EF8]/80 to-[#944EF8]/60 p-3 text-white">
        <div className="flex justify-between items-center">
          <h3 className="font-bold truncate">{AppointmentID || 'N/A'}</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(Status)}`}>
            {Status || 'Scheduled'}
          </span>
        </div>
      </div>
      
      {/* Body */}
      <div className="p-4 flex-grow flex flex-col">
        <div className="mb-3">
          <p className="text-sm text-gray-500">Customer</p>
          <p className="font-medium text-gray-800">
            {CustomerName || `Customer ${CustomerID}`}
            {CustomerPhone && (
              <span className="block text-sm text-gray-600 mt-1">{CustomerPhone}</span>
            )}
          </p>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-gray-500">Vehicle</p>
          <p className="font-medium text-gray-800">
            {VehicleModel || `Vehicle ${VehicleID}`}
            {VehicleType && (
              <span className="block text-sm text-gray-600 mt-1">{VehicleType}</span>
            )}
            {(CurrentMileage || NextServiceMileage) && (
              <span className="block text-sm text-gray-600 mt-1">
                {CurrentMileage ? `${CurrentMileage}km` : ''}
                {NextServiceMileage ? ` → ${NextServiceMileage}km` : ''}
              </span>
            )}
          </p>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-gray-500">Date & Time</p>
          <p className="font-medium text-gray-800">
            {formatDate(appointmentDate)}
            {appointmentTime && (
              <span className="block text-sm text-gray-600 mt-1">
                {formatTime(appointmentTime)}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex-grow">
          <p className="text-sm text-gray-500">Description</p>
          <p className="text-gray-700 text-sm line-clamp-2">{Description}</p>
        </div>

        {AppointmentMadeDate && (
          <div className="mt-2 text-xs text-gray-500">
            Created: {formatDate(AppointmentMadeDate)}
          </div>
        )}
      </div>
      
      {/* Footer with create job card button */}
      <div className="bg-gray-50 p-3 border-t border-gray-100">
        <button
          onClick={() => onCreateJobCard(appointment)}
          className="w-full bg-[#944EF8] hover:bg-[#7a3dd0] text-white py-2 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <FiPlus size={18} />
          Create Job Card
        </button>
      </div>
    </div>
  );
};

export default CreateJobCard;