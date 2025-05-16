import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/AxiosInstance";
import { FaMapMarkerAlt, FaCar, FaPhoneAlt, FaUser, FaCalendarAlt, FaClipboardCheck, FaTimesCircle } from "react-icons/fa";
import { toast } from "react-toastify";

// Pending Request Card Component
const PendingRequestCard = ({ request, onAccept, onCancel, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const handleCancelClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCancellationReason("");
  };

  const handleCancelRequest = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axiosInstance.put(`api/driver/breakdown/cancel/${request.RequestID}`, {
        reason: cancellationReason
      });

      if (response.data.success) {
        toast.success("Breakdown request cancelled successfully");
        setIsModalOpen(false);
        if (onCancel) onCancel(request.RequestID);
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data.message || "Failed to cancel request");
      }
    } catch (error) {
      console.error("Error cancelling breakdown request:", error);
      toast.error(error.response?.data?.message || "An error occurred while cancelling the request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptRequest = async () => {
    setIsProcessing(true);
    try {
      const response = await axiosInstance.put(`api/driver/breakdown/accept/${request.RequestID}`);

      if (response.data.success) {
        toast.success("Breakdown request accepted successfully");
        if (onAccept) onAccept(request.RequestID);
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data.message || "Failed to accept request");
      }
    } catch (error) {
      console.error("Error accepting breakdown request:", error);
      toast.error(error.response?.data?.message || "An error occurred while accepting the request");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white/80 via-white/60 to-white/80 shadow-lg rounded-2xl p-5 border border-[#944EF8]/20 w-full backdrop-blur-xl transition-all transform hover:scale-105">
      {/* Request ID and Status */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-[#944EF8] flex items-center gap-2">
          <FaCar /> Request #{request.RequestID}
        </h2>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          {request.Status}
        </span>
      </div>

      {/* Customer Details */}
      <div className="text-gray-700 flex items-center gap-2 mb-2">
        <FaUser className="text-gray-500" />
        <span>{request.FirstName} {request.SecondName}</span>
      </div>

      {/* Phone */}
      <div className="text-gray-700 flex items-center gap-2 mb-2">
        <FaPhoneAlt className="text-gray-500" />
        <a href={`tel:${request.CustomerPhone}`} className="text-blue-600 hover:underline">
          {request.CustomerPhone}
        </a>
      </div>

      {/* Vehicle */}
      <div className="text-gray-700 flex items-center gap-2 mb-2">
        <FaCar className="text-gray-500" />
        <span>{request.VehicleNo} {request.VehicleModel ? `(${request.VehicleModel})` : ''}</span>
      </div>

      {/* Request Time */}
      <div className="text-gray-700 flex items-center gap-2 mb-2">
        <FaCalendarAlt className="text-gray-500" />
        <span>{formatDate(request.RequestTime)}</span>
      </div>

      {/* Description with truncation */}
      <div className="mt-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Description:</h3>
        <p className="text-gray-600 text-sm line-clamp-2">{request.Description}</p>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 text-gray-700 mb-4">
        <FaMapMarkerAlt className="text-red-500" />
        <a 
          href={`https://www.google.com/maps?q=${request.Latitude},${request.Longitude}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >
          View on Map
        </a>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-3 mt-4">
        <button
          onClick={handleCancelClick}
          disabled={isProcessing}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <FaTimesCircle /> Cancel
        </button>
        <button
          onClick={handleAcceptRequest}
          disabled={isProcessing}
          className="flex-1 bg-gradient-to-r from-[#944EF8]/80 to-[#944EF8]/60 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:from-[#944EF8]/90 hover:to-[#944EF8]/70 transition-colors disabled:opacity-50"
        >
          <FaClipboardCheck /> Accept
        </button>
      </div>

      {/* Cancellation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Cancel Breakdown Request</h3>
            <p className="mb-4 text-gray-700">Please provide a reason for cancellation:</p>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50"
              rows="3"
              placeholder="Enter cancellation reason..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleCancelRequest}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default PendingRequestCard;