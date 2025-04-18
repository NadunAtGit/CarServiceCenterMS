import React from 'react';
import { FiTool, FiClock, FiCheckCircle, FiAlertTriangle, FiPlayCircle, FiCheck } from 'react-icons/fi';

const ServiceItem = ({ service, onUpdateStatus, isUpdating, jobCardId }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-200 text-gray-700';
      case 'Started':
        return 'bg-yellow-100 text-yellow-800';
      case 'Ongoing':
        return 'bg-yellow-100 text-yellow-800';
      case 'Finished':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Not Started':
        return <FiClock className="mr-1" />;
      case 'Started':
      case 'Ongoing':
        return <FiPlayCircle className="mr-1" />;
      case 'Finished':
        return <FiCheckCircle className="mr-1" />;
      default:
        return <FiAlertTriangle className="mr-1" />;
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-900">{service.ServiceType}</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(service.Status)}`}>
          {getStatusIcon(service.Status)}
          {service.Status}
        </span>
      </div>
      
      <p className="text-sm text-gray-500 mb-3">{service.ServiceDescription}</p>
      
      <div className="flex justify-end">
        {service.Status === 'Not Started' && (
          <button
            onClick={() => onUpdateStatus(service.ServiceRecord_ID, 'Ongoing')}  // Use ServiceRecord_ID here
            disabled={isUpdating}
            className="flex items-center text-xs px-3 py-1.5 rounded bg-[#944EF8]/10 text-[#944EF8] hover:bg-[#944EF8]/20 transition-colors"
          >
        <FiPlayCircle className="mr-1" />
        Start Service
</button>

        )}
        
        {service.Status === 'Ongoing' && (
          <button
            onClick={() => onUpdateStatus(service.ServiceRecord_ID, 'Finished')}
            disabled={isUpdating}
            className="flex items-center text-xs px-3 py-1.5 rounded bg-[#944EF8]/10 text-[#944EF8] hover:bg-[#944EF8]/20 transition-colors"
          >
            <FiCheck className="mr-1" />
            Complete Service
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiceItem;