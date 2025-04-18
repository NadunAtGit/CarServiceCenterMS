import React from 'react';
import { FiTool, FiChevronRight } from 'react-icons/fi';
import ServiceItem from './ServiceItem';

const JobCardStatusCard = ({ jobCard, onUpdateServiceStatus, isUpdating }) => {
  // Calculate the number of completed services
  const completedServices = jobCard.Services.filter(s => s.Status === 'Finished').length;
  const progressPercentage = (completedServices / jobCard.Services.length) * 100;
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="border-b p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {jobCard.Type} - {jobCard.JobCardID}
          </h2>
          <span className="text-sm text-gray-500">
            Vehicle ID: {jobCard.VehicleID}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <h3 className="font-medium text-gray-800 mb-2">
            Service Details:
          </h3>
          <p className="text-sm text-gray-600">
            {jobCard.ServiceDetails}
          </p>
        </div>
          
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-medium text-gray-800">
              Services ({jobCard.Services.length}):
            </h3>
            <span className="text-sm text-gray-600">
              {completedServices} of {jobCard.Services.length} completed
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-[#944EF8] h-2.5 rounded-full" 
              style={{
                width: `${progressPercentage}%`
              }}
            />
          </div>
        </div>
      
        <div className="space-y-3">
          {jobCard.Services.map(service => (
            <ServiceItem
              key={service.ServiceRecord_ID}
              service={service}
              onUpdateStatus={onUpdateServiceStatus}
              isUpdating={isUpdating}
              serviceRecordId={service.ServiceRecord_ID}  // Pass ServiceRecord_ID instead of JobCardID
          />
          ))}
        </div>
      
        <div className="mt-4 flex justify-end">
          <button className="flex items-center text-sm px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            Order Parts
            <FiChevronRight className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCardStatusCard;