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

// Completed Request Card Component
// CompletedRequestCard Component with Invoice Modal
const CompletedRequestCard = ({ request }) => {
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    distance: '',
    additionalCharges: '0',
    notes: 'Breakdown service provided'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setInvoiceData({
      distance: '',
      additionalCharges: '0',
      notes: 'Breakdown service provided'
    });
  };

  const handleCreateInvoice = async () => {
    // Validate inputs
    if (!invoiceData.distance || isNaN(invoiceData.distance) || parseFloat(invoiceData.distance) <= 0) {
      toast.error("Please enter a valid distance");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post(`api/driver/breakdown/invoice/${request.RequestID}`, {
        distance: parseFloat(invoiceData.distance),
        additionalCharges: parseFloat(invoiceData.additionalCharges) || 0,
        notes: invoiceData.notes
      });

      if (response.data.success) {
        toast.success("Invoice created successfully");
        setIsModalOpen(false);
        // Refresh the parent component to show the new invoice
        window.location.reload();
      } else {
        toast.error(response.data.message || "Failed to create invoice");
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error(error.response?.data?.message || "An error occurred while creating the invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-5 border border-green-200 w-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-green-600">Request #{request.RequestID}</h3>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          Completed
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500">Customer</h4>
          <p className="font-medium">{request.FirstName} {request.SecondName}</p>
          <p className="text-sm">{request.CustomerPhone}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Vehicle</h4>
          <p>{request.VehicleNo}</p>
          <p className="text-sm text-gray-600">{request.VehicleModel}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Completed Time</h4>
          <p>{formatDate(request.CompletedTime)}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-gray-700 mb-3">
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
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
        <p className="text-gray-700">{request.Description}</p>
      </div>

      {!request.InvoiceID && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleOpenModal}
            disabled={isCreatingInvoice}
            className="w-full bg-[#944EF8] hover:bg-[#7a3ee6] text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isCreatingInvoice ? "Creating Invoice..." : "Create Invoice"}
          </button>
        </div>
      )}

      {request.InvoiceID && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-green-700 font-medium">Invoice #{request.InvoiceID} created</p>
            <p className="text-sm text-green-600">Amount: Rs. {request.TotalAmount?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-green-600">Status: {request.InvoiceStatus || 'Pending'}</p>
          </div>
        </div>
      )}

      {/* Invoice Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Create Invoice for Breakdown Service</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="distance">
                Distance Traveled (km) *
              </label>
              <input
  type="number"
  id="distance"
  name="distance"
  value={invoiceData.distance}
  onChange={handleInputChange}
  placeholder="Enter distance in kilometers"
  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
  min="0.1"
  max="1000"
  step="0.1"
  required
/>
              <p className="text-xs text-gray-500 mt-1">
                This will be used to calculate the service charge based on price per km.
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="additionalCharges">
                Additional Charges (Rs.)
              </label>
              <input
                type="number"
                id="additionalCharges"
                name="additionalCharges"
                value={invoiceData.additionalCharges}
                onChange={handleInputChange}
                placeholder="Enter additional charges if any"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={invoiceData.notes}
                onChange={handleInputChange}
                placeholder="Enter notes about the service"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="3"
              ></textarea>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                className="px-4 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7a3ee6] transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Main Driver Dashboard Component
const DriverDashboard = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(true);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchPendingRequests = async () => {
    setIsLoadingPending(true);
    try {
      const response = await axiosInstance.get("api/driver/breakdown/pending");
      if (response.data.success) {
        setPendingRequests(response.data.data || []);
      } else {
        console.error("Failed to fetch pending breakdown requests:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching pending breakdown requests:", error);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const fetchActiveRequests = async () => {
    setIsLoadingActive(true);
    try {
      const response = await axiosInstance.get("api/driver/breakdown/active");
      if (response.data.success) {
        setActiveRequests(response.data.data || []);
      } else {
        console.error("Failed to fetch active breakdown requests:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching active breakdown requests:", error);
    } finally {
      setIsLoadingActive(false);
    }
  };

  const fetchCompletedRequests = async () => {
    setIsLoadingCompleted(true);
    try {
      const response = await axiosInstance.get("api/driver/breakdown/completed");
      if (response.data.success) {
        setCompletedRequests(response.data.data || []);
      } else {
        console.error("Failed to fetch completed breakdown requests:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching completed breakdown requests:", error);
    } finally {
      setIsLoadingCompleted(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    fetchActiveRequests();
    fetchCompletedRequests();
  }, []);

  const handleAcceptRequest = (requestId) => {
    setPendingRequests(prev => prev.filter(req => req.RequestID !== requestId));
    fetchActiveRequests();
  };

  const handleCancelRequest = (requestId) => {
    setPendingRequests(prev => prev.filter(req => req.RequestID !== requestId));
  };

  const handleRefresh = () => {
    fetchPendingRequests();
    fetchActiveRequests();
    fetchCompletedRequests();
  };

  return (
    <div className="w-full ">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Driver Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'pending'
              ? 'text-[#944EF8] border-b-2 border-[#944EF8]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Requests
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'active'
              ? 'text-[#944EF8] border-b-2 border-[#944EF8]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('active')}
        >
          Active Requests
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'completed'
              ? 'text-[#944EF8] border-b-2 border-[#944EF8]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('completed')}
        >
          Completed Requests
        </button>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Pending Requests */}
      {activeTab === 'pending' && (
        <>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Pending Breakdown Requests</h2>
          {isLoadingPending ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8]"></div>
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {pendingRequests.map((request) => (
                <PendingRequestCard
                  key={request.RequestID}
                  request={request}
                  onAccept={handleAcceptRequest}
                  onCancel={handleCancelRequest}
                  onRefresh={handleRefresh}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/70 rounded-lg p-8 text-center border border-[#944EF8]/20 shadow-md w-full">
              <p className="text-gray-500">No pending breakdown requests found.</p>
            </div>
          )}
        </>
      )}

      {/* Active Requests */}
      {activeTab === 'active' && (
        <>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Active Breakdown Requests</h2>
          {isLoadingActive ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8]"></div>
            </div>
          ) : activeRequests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {activeRequests.map((request) => (
                <div key={request.RequestID} className="bg-white rounded-lg shadow-md p-5 border border-blue-200 w-full">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-blue-600">Request #{request.RequestID}</h3>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      In Progress
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Customer</h4>
                      <p className="font-medium">{request.FirstName} {request.SecondName}</p>
                      <p className="text-sm">{request.CustomerPhone}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Vehicle</h4>
                      <p>{request.VehicleNo}</p>
                      <p className="text-sm text-gray-600">{request.VehicleModel}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Accepted Time</h4>
                      <p>{new Date(request.AcceptedTime).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-700 mb-3">
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
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                    <p className="text-gray-700">{request.Description}</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={async () => {
                        try {
                          const response = await axiosInstance.put(`api/driver/breakdown/complete/${request.RequestID}`);
                          if (response.data.success) {
                            toast.success("Request marked as completed");
                            handleRefresh();
                          } else {
                            toast.error(response.data.message || "Failed to complete request");
                          }
                        } catch (error) {
                          console.error("Error completing request:", error);
                          toast.error(error.response?.data?.message || "An error occurred");
                        }
                      }}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      Mark as Completed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/70 rounded-lg p-8 text-center border border-[#944EF8]/20 shadow-md w-full">
              <p className="text-gray-500">No active breakdown requests found.</p>
            </div>
          )}
        </>
      )}

      {/* Completed Requests */}
      {activeTab === 'completed' && (
        <>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Completed Breakdown Requests</h2>
          {isLoadingCompleted ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8]"></div>
            </div>
          ) : completedRequests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {completedRequests.map((request) => (
                <CompletedRequestCard key={request.RequestID} request={request} />
              ))}
            </div>
          ) : (
            <div className="bg-white/70 rounded-lg p-8 text-center border border-[#944EF8]/20 shadow-md w-full">
              <p className="text-gray-500">No completed breakdown requests found.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DriverDashboard;
