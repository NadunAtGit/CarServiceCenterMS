import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import OrderApproveCard from './OrderApproveCard';

const OrderCarousel = ({ orders, onApprove, onReject }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

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
            >
              <FiChevronLeft size={20} />
            </button>
            <button 
              onClick={goToNext}
              className="p-2 rounded-full bg-[#944EF8]/20 hover:bg-[#944EF8]/30 text-gray-800 transition-colors"
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="w-full">
        <OrderApproveCard 
          order={orders[currentIndex]} 
          onApprove={onApprove} 
          onReject={onReject}
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