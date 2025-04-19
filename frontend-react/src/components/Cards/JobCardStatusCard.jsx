import React, { useState } from 'react';
import { FiTool, FiChevronRight, FiShoppingCart, FiCheckSquare } from 'react-icons/fi';
import ServiceItem from './ServiceItem';
import OrderPartsModal from '../Modals/OrderPartsModal';
import AxiosInstance from '../../utils/axiosInstance';

const JobCardStatusCard = ({ jobCard, onUpdateServiceStatus, isUpdating }) => {
  const [showOrderPartsModal, setShowOrderPartsModal] = useState(false);
  const [isOrderingParts, setIsOrderingParts] = useState(false);
  const [isFinishingJobCard, setIsFinishingJobCard] = useState(false);

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

  const handleFinishJobCard = async () => {
    setIsFinishingJobCard(true);
    try {
      // Call API to update job card status to 'Completed'
      const response = await AxiosInstance.put(`/api/mechanic/finish-job/${jobCard.JobCardID}`);
      
      if (response.data) {
        alert('Job card completed successfully!');
        // Optionally refresh the job card data or redirect
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
              className="flex items-center text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
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
