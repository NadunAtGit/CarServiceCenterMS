import React from 'react';
import PartsServiceCard from './PartsServiceCard';

const OrderApproveCard = ({ order, onApprove, onReject }) => {
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

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{order.OrderID}</h3>
          <p className="text-sm text-gray-600">Requested by: {order.RequestedBy}</p>
          <p className="text-sm text-gray-600">Date: {formatDate(order.RequestedAt)}</p>
        </div>
        <div className="flex items-center">
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            {order.OrderStatus}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {order.Services.map((service) => (
          <PartsServiceCard key={service.ServiceRecordID} service={service} />
        ))}
      </div>

      <div className="mt-4 flex justify-end space-x-3">
        <button 
          className="px-4 py-2 text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600 transition"
          onClick={() => onReject(order.OrderID)}
        >
          Reject
        </button>
        <button 
          className="px-4 py-2 text-sm font-medium rounded-md bg-green-500 text-white hover:bg-green-600 transition"
          onClick={() => onApprove(order.OrderID)}
        >
          Approve
        </button>
      </div>
    </div>
  );
};

export default OrderApproveCard;