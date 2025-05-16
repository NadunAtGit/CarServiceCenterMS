import React, { useState } from 'react';
import { FiTool, FiChevronRight, FiShoppingCart, FiCheckSquare, FiClock } from 'react-icons/fi';
import ServiceItem from './ServiceItem';
import OrderPartsModal from '../Modals/OrderPartsModal';
import AxiosInstance from '../../utils/axiosInstance';

const JobCardStatusCard = ({ jobCard, onUpdateServiceStatus, isUpdating, onJobCardFinished }) => {
  const [showOrderPartsModal, setShowOrderPartsModal] = useState(false);
  const [isOrderingParts, setIsOrderingParts] = useState(false);
  const [isFinishingJobCard, setIsFinishingJobCard] = useState(false);
  const [nextServiceMileage, setNextServiceMileage] = useState('');
  const [mileageError, setMileageError] = useState('');

  // Calculate the number of completed services
  const completedServices = jobCard.Services.filter(s => s.Status === 'Finished').length;
  const progressPercentage = (completedServices / jobCard.Services.length) * 100;
  
  // Check if all services are finished
  const allServicesFinished = completedServices === jobCard.Services.length && jobCard.Services.length > 0;

  const handleOrderParts = async (parts) => {
    setIsOrderingParts(true);
    try {
      const response = await AxiosInstance.post(`/api/mechanic/order-parts/${jobCard.JobCardID}`, { parts });
      
      if (response.data) {
        alert('Parts ordered successfully!');
        setShowOrderPartsModal(false);
      }
    } catch (error) {
      console.error('Error ordering parts:', error);
      alert(error.response?.data?.message || 'Failed to order parts');
    } finally {
      setIsOrderingParts(false);
    }
  };

  const validateMileage = () => {
    if (!nextServiceMileage) {
      setMileageError('Next service mileage is required');
      return false;
    }
    
    const mileageValue = parseInt(nextServiceMileage);
    if (isNaN(mileageValue)) {
      setMileageError('Please enter a valid number');
      return false;
    }
    
    const currentMileage = jobCard.ServiceMilleage || 0;
    if (mileageValue <= currentMileage) {
      setMileageError(`Next service mileage must be greater than current mileage (${currentMileage})`);
      return false;
    }
    
    setMileageError('');
    return true;
  };

  const handleFinishJobCard = async () => {
    if (!validateMileage()) {
      return;
    }
    
    setIsFinishingJobCard(true);
    try {
      // Call API to update job card status to 'Completed' with next service mileage
      const response = await AxiosInstance.put(`/api/mechanic/finish-job/${jobCard.JobCardID}`, {
        nextServiceMileage: parseInt(nextServiceMileage)
      });
      
      if (response.data) {
        alert('Job card completed successfully!');
        // Call the callback function to refresh the parent component
        if (onJobCardFinished) {
          onJobCardFinished();
        }
      }
    } catch (error) {
      console.error('Error finishing job card:', error);
      alert(error.response?.data?.message || 'Failed to finish job card');
    } finally {
      setIsFinishingJobCard(false);
    }
  };

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
        
        {/* Current Mileage Information */}
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center">
            <FiClock className="text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Current Service Mileage:</span>
            <span className="ml-2 text-sm text-gray-900">{jobCard.ServiceMilleage || 'N/A'} km</span>
          </div>
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
              serviceRecordId={service.ServiceRecord_ID}
            />
          ))}
        </div>
      
        {/* Next Service Mileage Input - Only show when all services are finished */}
        {/* Next Service Mileage Input - Only show when all services are finished */}
{allServicesFinished && (
  <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
    <h3 className="font-medium text-gray-800 mb-2">
      Set Next Service Mileage
    </h3>
    
    {/* Add this section to prominently display current mileage */}
    <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-md">
      <div className="flex items-center">
        <FiClock className="text-blue-600 mr-2" />
        <span className="text-sm font-medium text-gray-700">Current Mileage:</span>
        <span className="ml-2 text-sm font-bold text-blue-700">{jobCard.ServiceMilleage || '0'} km</span>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Next service mileage must be greater than the current mileage
      </p>
    </div>
    
    <div className="flex flex-col">
      <div className="flex items-center">
        <input
          type="number"
          value={nextServiceMileage}
          onChange={(e) => setNextServiceMileage(e.target.value)}
          placeholder="Enter next service mileage"
          className={`w-full p-2 border rounded-md ${mileageError ? 'border-red-500' : 'border-gray-300'}`}
        />
        <span className="ml-2 text-gray-600">km</span>
      </div>
      {mileageError && (
        <p className="text-red-500 text-sm mt-1">{mileageError}</p>
      )}
      <p className="text-sm text-gray-500 mt-2">
        Enter the mileage when the vehicle should be serviced next.
      </p>
    </div>
  </div>
)}

      
        <div className="mt-4 flex justify-end space-x-3">
          {!allServicesFinished && (
            <button 
              onClick={() => setShowOrderPartsModal(true)}
              className="flex items-center text-sm px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <FiShoppingCart className="mr-2" />
              Order Parts
            </button>
          )}
          
          {allServicesFinished && (
            <button 
              onClick={handleFinishJobCard}
              disabled={isFinishingJobCard}
              className="flex items-center text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              <FiCheckSquare className="mr-2" />
              {isFinishingJobCard ? 'Finishing...' : 'Finish Job Card'}
            </button>
          )}
        </div>
      </div>

      {/* Order Parts Modal */}
      {showOrderPartsModal && (
        <OrderPartsModal
          jobCard={jobCard}
          onClose={() => setShowOrderPartsModal(false)}
          onSubmit={handleOrderParts}
          isSubmitting={isOrderingParts}
        />
      )}
    </div>
  );
};

export default JobCardStatusCard;
