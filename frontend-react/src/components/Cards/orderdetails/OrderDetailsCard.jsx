import React from 'react';
import ServiceRecordCard from './ServiceRecordCard'; // Assuming this component exists
import PartsCard from './PartsCard'; // Assuming this component exists

const OrderDetailsCard = ({ order }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full">
      <h3 className="font-semibold text-xl text-gray-800 mb-3">Order ID: {order.OrderID}</h3>
      <div className="mb-4">
        <h4 className="font-medium text-gray-800">Job Card ID: {order.JobCardID}</h4>
        <p className="text-sm text-gray-600">Requested By: {order.RequestedBy}</p>
      </div>

      {/* Service Records */}
      <div className="mb-4">
        <h4 className="font-semibold text-lg text-gray-800 mb-2">Service Records</h4>
        <ServiceRecordCard serviceRecords={order.ServiceRecords} />
      </div>

      {/* Parts */}
      <div className="mb-4">
        <h4 className="font-semibold text-lg text-gray-800 mb-2">Parts</h4>
        <PartsCard parts={order.Parts} />
      </div>

      {/* Order Status */}
      <div className="mt-4">
        <p className="text-sm text-gray-600">Status: {order.OrderStatus}</p>
      </div>
    </div>
  );
};

export default OrderDetailsCard;
