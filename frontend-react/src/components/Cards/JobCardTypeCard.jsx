import React from 'react';
import { FiTool, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

const JobCardTypeCard = ({ jobCard }) => {
  // Safely check if jobCard and Services exist before using them
  const services = jobCard?.Services || [];
  
  // Calculate completion stats only if services exist
  const completedServices = services.filter(s => s.Status === 'Finished').length;
  const totalServices = services.length;
  const progressPercentage = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;
  
  // Determine card status color based on job card status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'created':
        return 'bg-gray-100 border-gray-300';
      case 'assigned':
        return 'bg-blue-50 border-blue-300';
      case 'ongoing':
        return 'bg-yellow-50 border-yellow-300';
      case 'finished':
        return 'bg-green-50 border-green-300';
      case 'invoice generated':
        return 'bg-purple-50 border-purple-300';
      default:
        return 'bg-white border-gray-200';
    }
  };
  
  // Get appropriate icon for the status
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'created':
        return <FiAlertCircle className="text-gray-500" />;
      case 'assigned':
        return <FiTool className="text-blue-500" />;
      case 'ongoing':
        return <FiClock className="text-yellow-500" />;
      case 'finished':
        return <FiCheckCircle className="text-green-500" />;
      case 'invoice generated':
        return <FiCheckCircle className="text-purple-500" />;
      default:
        return <FiAlertCircle className="text-gray-500" />;
    }
  };

  // If jobCard is undefined, show a placeholder
  if (!jobCard) {
    return (
      <div className="bg-gray-100 rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
        <div className="h-2 bg-gray-200 rounded w-full mb-6"></div>
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow-md overflow-hidden border ${getStatusColor(jobCard.Status)}`}>
      <div className="border-b p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {jobCard.Type || 'Job Card'} - {jobCard.JobCardID}
          </h2>
          <div className="flex items-center">
            {getStatusIcon(jobCard.Status)}
            <span className="text-sm ml-2 text-gray-600">
              {jobCard.Status || 'Unknown Status'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {jobCard.ServiceDetails && (
          <div className="mb-4">
            <h3 className="font-medium text-gray-800 mb-2">
              Service Details:
            </h3>
            <p className="text-sm text-gray-600">
              {jobCard.ServiceDetails}
            </p>
          </div>
        )}
        
        {/* Only show services section if there are services */}
        {services.length > 0 && (
          <>
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-medium text-gray-800">
                  Services ({totalServices}):
                </h3>
                <span className="text-sm text-gray-600">
                  {completedServices} of {totalServices} completed
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
              {services.map(service => (
                <div 
                  key={service.ServiceRecord_ID || service.serviceRecordId} 
                  className="bg-white p-3 rounded-md border border-gray-100 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-800">
                        {service.Description || service.description || 'Unknown Service'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {service.ServiceType || service.serviceType || 'General Service'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.Status === 'Finished' 
                        ? 'bg-green-100 text-green-800' 
                        : service.Status === 'Ongoing' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {service.Status || 'Not Started'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        
        {/* Show a message if no services are available */}
        {services.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <FiAlertCircle className="mx-auto mb-2 text-gray-400" size={24} />
            <p>No service records available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobCardTypeCard;
