// src/components/MechanicDashboard.js
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/AxiosInstance';
import JobCardStatusCard from '../../components/Cards/JobCardStatusCard';
import { FiTool } from 'react-icons/fi';

const MechanicDashboard = () => {
  const [assignedJobCards, setAssignedJobCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch assigned job cards
  useEffect(() => {
    const fetchAssignedJobCards = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await axiosInstance.get('/api/mechanic/assigned-jobcards');
        
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

    fetchAssignedJobCards();
  }, []);

  // Update service status - FIXED PATH to match backend route
  const handleUpdateServiceStatus = async (serviceRecordId, newStatus) => {
    setIsUpdating(true);
  
    try {
      const response = await axiosInstance.put(`/api/mechanic/update-service-record-status/${serviceRecordId}`, {
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
      } else {
        setErrorMessage(response.data.message || 'Failed to update service status');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'An error occurred while updating the service status');
      console.error('Error updating service status:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  

  return (
    <div className="container mx-auto px-4 py-6 bg-[#D8D8D8] min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Mechanic Dashboard</h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8] mx-auto"></div>
          <p className="ml-3 text-gray-600">Loading assigned job cards...</p>
        </div>
      ) : errorMessage ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {errorMessage}</span>
        </div>
      ) : assignedJobCards.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-8 shadow-md text-center">
          <FiTool size={40} className="text-[#944EF8] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Job Cards Assigned</h3>
          <p className="text-gray-600">You currently don't have any assigned job cards.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedJobCards.map(jobCard => (
            <JobCardStatusCard
              key={jobCard.JobCardID}
              jobCard={jobCard}
              onUpdateServiceStatus={handleUpdateServiceStatus}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MechanicDashboard;