import React, { useState, useEffect } from 'react';
// Adjust the import path as necessary
import { toast } from 'react-toastify';
import JobCardStatusCard from '../../components/Cards/JobCardStatusCard';
import { FiTool, FiAlertCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import AxiosInstance from "../../utils/axiosInstance"; // Adjust the import path as necessary 

const MechanicDashboard = () => {
  const [assignedJobCards, setAssignedJobCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch assigned job cards
  const fetchAssignedJobCards = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await AxiosInstance.get('/api/mechanic/assigned-jobcards');
      
      if (response.data.success) {
        // Update property names to match updated components
        const formattedJobCards = response.data.assignedJobCards.map(jobCard => ({
          ...jobCard,
          // Map ServiceStatus to Status if needed
          Services: jobCard.Services.map(service => ({
            ...service,
            Status: service.ServiceStatus // Add Status property while keeping ServiceStatus for backward compatibility
          }))
        }));
        
        setAssignedJobCards(formattedJobCards);
      } else {
        setErrorMessage(response.data.message || 'Failed to fetch assigned job cards');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'An error occurred while fetching job cards');
      console.error("Error fetching job cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedJobCards();
  }, []);

  // Update service status - FIXED PATH to match backend route
  const handleUpdateServiceStatus = async (serviceRecordId, newStatus) => {
    setIsUpdating(true);
  
    try {
      const response = await AxiosInstance.put(`/api/mechanic/update-service-record-status/${serviceRecordId}`, {
        status: newStatus,
      });
  
      if (response.data.success) {
        setAssignedJobCards((prevJobCards) => {
          return prevJobCards.map((jobCard) => {
            const updatedServices = jobCard.Services.map((service) => {
              if (service.ServiceRecord_ID === serviceRecordId) {
                return {
                  ...service,
                  Status: newStatus,
                  ServiceStatus: newStatus,
                };
              }
              return service;
            });
  
            if (updatedServices.some((service) => service.ServiceRecord_ID === serviceRecordId)) {
              return {
                ...jobCard,
                Services: updatedServices,
              };
            }
  
            return jobCard;
          });
        });
        
        toast.success(`Service status updated to ${newStatus}`);
      } else {
        setErrorMessage(response.data.message || 'Failed to update service status');
        toast.error(response.data.message || 'Failed to update service status');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'An error occurred while updating the service status');
      toast.error(error.response?.data?.message || 'An error occurred while updating the service status');
      console.error('Error updating service status:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Render the empty state in a more user-friendly way
  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg p-10 max-w-2xl mx-auto border border-gray-100">
        <div className="bg-[#944EF8]/10 p-6 rounded-full mb-6">
          <FiTool size={50} className="text-[#944EF8]" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-800 mb-3">No Job Cards Assigned Yet</h3>
        <p className="text-gray-600 text-center mb-6 max-w-md">
          You don't have any job cards assigned to you at the moment. New assignments will appear here when they're ready.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
          <div className="bg-blue-50 p-4 rounded-lg flex items-start">
            <FiClock className="text-blue-500 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-700">Check Back Later</h4>
              <p className="text-sm text-blue-600">Assignments are updated throughout the day</p>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg flex items-start">
            <FiAlertCircle className="text-purple-500 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-purple-700">Need Help?</h4>
              <p className="text-sm text-purple-600">Contact your supervisor for assistance</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={fetchAssignedJobCards}
          className="mt-8 flex items-center px-4 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7a3ee6] transition-colors"
        >
          <FiRefreshCw className="mr-2" />
          Refresh Assignments
        </button>
      </div>
    );
  };

  // Render the error state
  const renderErrorState = () => {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto border border-red-100">
        <div className="flex items-center mb-4">
          <div className="bg-red-100 p-3 rounded-full mr-4">
            <FiAlertCircle size={24} className="text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-red-700">Error Loading Job Cards</h3>
        </div>
        
        <p className="text-gray-700 mb-6">{errorMessage}</p>
        
        {/* <div className="bg-gray-50 p-4 rounded-lg mb-6 border-l-4 border-gray-300">
          <h4 className="font-medium text-gray-800 mb-2">Possible solutions:</h4>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>Check your internet connection</li>
            <li>Verify that the server is running</li>
            <li>You may need to log in again</li>
            <li>Contact IT support if the problem persists</li>
          </ul>
        </div> */}
        
        <button 
          onClick={fetchAssignedJobCards}
          className="w-full flex justify-center items-center px-4 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7a3ee6] transition-colors"
        >
          <FiRefreshCw className="mr-2" />
          Try Again
        </button>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#F5F7FA] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mechanic Dashboard</h1>
        <button 
          onClick={fetchAssignedJobCards}
          disabled={isLoading}
          className="flex items-center px-3 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7a3ee6] transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-64 bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8]"></div>
          <p className="mt-4 text-gray-600">Loading your assigned job cards...</p>
        </div>
      ) : errorMessage ? (
        renderErrorState()
      ) : assignedJobCards.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {assignedJobCards.map(jobCard => (
    <JobCardStatusCard
      key={jobCard.JobCardID}
      jobCard={jobCard}
      onUpdateServiceStatus={handleUpdateServiceStatus}
      isUpdating={isUpdating}
      onJobCardFinished={fetchAssignedJobCards}
    />
  ))}
</div>

      )}
    </div>
  );
};

export default MechanicDashboard;
