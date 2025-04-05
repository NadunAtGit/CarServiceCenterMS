import React from 'react';
import { FiChevronRight } from 'react-icons/fi';

const ServiceRecordCard = ({ serviceRecords }) => {
  return (
    <div className="bg-gradient-to-r from-white via-gray-100 to-gray-200 rounded-lg shadow-lg p-4">
      <h3 className="font-semibold text-xl text-gray-800 mb-3">Service Records ({serviceRecords.length})</h3>
      <div className="space-y-3">
        {serviceRecords.map((service) => (
          <div
            key={service.ServiceRecord_ID}
            className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div>
              <p className="font-semibold text-gray-800">{service.ServiceName}</p>
              <p className="text-sm text-gray-600">Status: {service.Status}</p>
            </div>
            <button className="text-sm text-blue-500 hover:text-blue-700 flex items-center">
              View Details
              <FiChevronRight className="inline ml-1" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceRecordCard;
