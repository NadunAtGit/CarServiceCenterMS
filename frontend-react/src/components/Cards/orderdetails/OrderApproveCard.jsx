import React, { useState } from 'react';
import PartsServiceCard from './PartsServiceCard';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosInstance from '../../../utils/axiosInstance';

const OrderApproveCard = ({ order, onOrderProcessed }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [availabilityChecks, setAvailabilityChecks] = useState({});

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      // Make the API call directly from this component
      const response = await axiosInstance.put(`/api/cashier/approveorder/${order.OrderID}`);
      
      // Show success toast with details from the response
      toast.success(`Order ${order.OrderID} approved and fulfilled using FIFO method`);
      
      // Notify parent component if needed
      if (onOrderProcessed) {
        onOrderProcessed(order.OrderID, 'approved');
      }
    } catch (error) {
      console.error("Error approving order:", error);
      
      // Handle different error scenarios
      if (error.response?.data?.insufficientParts) {
        const parts = error.response.data.insufficientParts;
        const partsList = parts.map(p => 
          `${p.PartName}: need ${p.Required}, have ${p.Available}`
        ).join(', ');
        
        toast.error(`Insufficient stock: ${partsList}`);
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to approve order';
        toast.error(`Error: ${errorMessage}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      // Make the API call directly from this component
      const response = await axiosInstance.put(`/api/cashier/rejectorder/${order.OrderID}`);
      
      toast.info(`Order ${order.OrderID} rejected`);
      
      // Notify parent component if needed
      if (onOrderProcessed) {
        onOrderProcessed(order.OrderID, 'rejected');
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
      const errorMessage = error.response?.data?.message || 'Failed to reject order';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkAvailability = async (partId) => {
    try {
      const response = await axiosInstance.get(`/api/cashier/check-part-availability/${partId}`);
      const data = response.data;
      
      setAvailabilityChecks(prev => ({
        ...prev,
        [partId]: data
      }));
      
      // Show availability information in a toast
      if (data.isAvailable) {
        toast.success(`${data.part.Name}: ${data.part.TotalAvailable} units available across ${data.part.BatchCount} batches`);
      } else {
        toast.warning(`${data.part.Name}: Out of stock!`);
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      toast.error(`Error checking availability: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{order.OrderID}</h3>
          <p className="text-sm text-gray-600">Requested by: {order.RequestedBy}</p>
          <p className="text-sm text-gray-600">Date: {formatDate(order.RequestedAt)}</p>
          {order.Notes && (
            <p className="text-sm text-gray-600 mt-1 italic">Notes: {order.Notes}</p>
          )}
        </div>
        <div className="flex items-center">
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            {order.OrderStatus}
          </span>
          {order.FulfillmentStatus && (
            <span className="ml-2 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
              {order.FulfillmentStatus}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {order.Services.map((service) => (
          <PartsServiceCard 
            key={service.ServiceRecordID} 
            service={service} 
            onCheckAvailability={checkAvailability}
            availabilityData={availabilityChecks}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-end space-x-3">
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleReject}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Reject'}
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-md bg-green-500 text-white hover:bg-green-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleApprove}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Approve & Fulfill (FIFO)'}
        </button>
      </div>
      
      {/* Include ToastContainer in the component */}
      <ToastContainer />
    </div>
  );
};

export default OrderApproveCard;
