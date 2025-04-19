import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';
import OrderApproveCard from './OrderApproveCard';
import axiosInstance from '../../../utils/axiosInstance';
import { toast } from 'react-toastify';

const OrderCarousel = ({ orders, onOrderProcessed }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingOrders, setProcessingOrders] = useState({});

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? orders.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === orders.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleApprove = async (orderId) => {
    setProcessingOrders(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await axiosInstance.put(`/api/cashier/approveorder/${orderId}`);
      
      // Enhanced success toast with icon and details
      toast.success(
        <div className="flex items-start">
          <FiCheck className="mt-1 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">{response.data.message}</p>
            <p className="text-sm mt-1">Order ID: {orderId}</p>
            {response.data.fulfilledParts && (
              <p className="text-sm">
                {response.data.fulfilledParts.length} part(s) fulfilled using FIFO
              </p>
            )}
          </div>
        </div>,
        {
          autoClose: 5000,
          closeOnClick: true,
          pauseOnHover: true
        }
      );
      
      // Notify parent component to refresh orders
      if (onOrderProcessed) {
        onOrderProcessed(orderId, 'approved');
      }
      
      // If we're at the last order, go to the previous one
      if (currentIndex === orders.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (error) {
      console.error("Error approving order:", error);
      
      // If there are insufficient parts, show detailed error
      if (error.response?.data?.insufficientParts) {
        const parts = error.response.data.insufficientParts;
        
        toast.error(
          <div className="flex items-start">
            <FiAlertTriangle className="mt-1 mr-2 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-medium">Insufficient stock for order {orderId}</p>
              <ul className="text-sm mt-1 list-disc pl-4">
                {parts.map((part, index) => (
                  <li key={index}>
                    {part.PartName}: need {part.Required}, have {part.Available}
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          {
            autoClose: 8000, // Longer display time for detailed errors
            closeOnClick: true,
            pauseOnHover: true
          }
        );
      } else {
        // Generic error message
        const errorMessage = error.response?.data?.message || 'Failed to approve order';
        
        toast.error(
          <div className="flex items-start">
            <FiX className="mt-1 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Error approving order {orderId}</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          </div>,
          {
            autoClose: 5000,
            closeOnClick: true,
            pauseOnHover: true
          }
        );
      }
    } finally {
      setProcessingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleReject = async (orderId) => {
    setProcessingOrders(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await axiosInstance.put(`/api/cashier/rejectorder/${orderId}`);
      
      toast.info(
        <div className="flex items-start">
          <FiX className="mt-1 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">{response.data.message}</p>
            <p className="text-sm mt-1">Order ID: {orderId}</p>
          </div>
        </div>,
        {
          autoClose: 4000,
          closeOnClick: true,
          pauseOnHover: true
        }
      );
      
      // Notify parent component to refresh orders
      if (onOrderProcessed) {
        onOrderProcessed(orderId, 'rejected');
      }
      
      // If we're at the last order, go to the previous one
      if (currentIndex === orders.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
      
      const errorMessage = error.response?.data?.message || 'Failed to reject order';
      
      toast.error(
        <div className="flex items-start">
          <FiX className="mt-1 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">Error rejecting order {orderId}</p>
            <p className="text-sm mt-1">{errorMessage}</p>
          </div>
        </div>,
        {
          autoClose: 5000,
          closeOnClick: true,
          pauseOnHover: true
        }
      );
    } finally {
      setProcessingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white/70 rounded-lg p-6 backdrop-blur-xl text-center border border-[#944EF8]/20 shadow-md">
        <p className="text-gray-700">No orders pending approval</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Orders Pending Approval</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {currentIndex + 1} of {orders.length}
          </span>
          <div className="flex space-x-1">
            <button 
              onClick={goToPrevious}
              className="p-2 rounded-full bg-[#944EF8]/20 hover:bg-[#944EF8]/30 text-gray-800 transition-colors"
              disabled={orders.length <= 1}
            >
              <FiChevronLeft size={20} />
            </button>
            <button 
              onClick={goToNext}
              className="p-2 rounded-full bg-[#944EF8]/20 hover:bg-[#944EF8]/30 text-gray-800 transition-colors"
              disabled={orders.length <= 1}
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="w-full">
        <OrderApproveCard 
          order={orders[currentIndex]} 
          onApprove={handleApprove} 
          onReject={handleReject}
          isProcessing={processingOrders[orders[currentIndex]?.OrderID]}
        />
      </div>
      
      <div className="flex justify-center mt-4">
        {orders.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 mx-1 rounded-full ${
              index === currentIndex ? 'bg-[#944EF8]' : 'bg-gray-300'
            }`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default OrderCarousel;
