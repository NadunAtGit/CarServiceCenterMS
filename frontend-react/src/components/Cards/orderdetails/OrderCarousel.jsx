import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';
import OrderApproveCard from './OrderApproveCard';
import { toast } from 'react-toastify';

const OrderCarousel = ({ orders, onApprove, onReject, showJobCard }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedOrderIds, setProcessedOrderIds] = useState(new Set());
  
  // Filter out processed orders
  const pendingOrders = orders.filter(order => !processedOrderIds.has(order.OrderID));
  
  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? pendingOrders.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === pendingOrders.length - 1 ? 0 : prevIndex + 1
    );
  };

  // Handle order processing (both approve and reject)
  const handleOrderProcessed = (orderId, action) => {
    // Add the order ID to the set of processed orders
    setProcessedOrderIds(prev => new Set([...prev, orderId]));
    
    // Adjust the current index if needed
    if (pendingOrders.length > 1 && currentIndex >= pendingOrders.length - 1) {
      setCurrentIndex(Math.max(0, pendingOrders.length - 2));
    }
    
    // Call the parent callback based on the action
    if (action === 'approved' && onApprove) {
      onApprove(orderId);
    } else if (action === 'rejected' && onReject) {
      onReject(orderId);
    }
  };

  if (pendingOrders.length === 0) {
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
            {currentIndex + 1} of {pendingOrders.length}
          </span>
          <div className="flex space-x-1">
            <button 
              onClick={goToPrevious}
              className="p-2 rounded-full bg-[#944EF8]/20 hover:bg-[#944EF8]/30 text-gray-800 transition-colors"
              disabled={pendingOrders.length <= 1}
            >
              <FiChevronLeft size={20} />
            </button>
            <button 
              onClick={goToNext}
              className="p-2 rounded-full bg-[#944EF8]/20 hover:bg-[#944EF8]/30 text-gray-800 transition-colors"
              disabled={pendingOrders.length <= 1}
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="w-full">
        {pendingOrders.length > 0 && (
          <OrderApproveCard 
            order={pendingOrders[currentIndex]} 
            onOrderProcessed={handleOrderProcessed}
            showJobCard={showJobCard}
          />
        )}
      </div>
      
      <div className="flex justify-center mt-4">
        {pendingOrders.map((_, index) => (
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
