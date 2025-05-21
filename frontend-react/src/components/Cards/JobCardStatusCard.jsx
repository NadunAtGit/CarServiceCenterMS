import React, { useState, useEffect } from 'react';
import { 
  FiTool, FiChevronRight, FiShoppingCart, FiCheckSquare, FiClock, 
  FiAlertCircle, FiCheckCircle, FiXCircle, FiPackage, FiRefreshCw 
} from 'react-icons/fi';
import ServiceItem from './ServiceItem';
import OrderPartsModal from '../Modals/OrderPartsModal';
import AxiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

const JobCardStatusCard = ({ jobCard, onUpdateServiceStatus, isUpdating, onJobCardFinished }) => {
  const [showOrderPartsModal, setShowOrderPartsModal] = useState(false);
  const [isOrderingParts, setIsOrderingParts] = useState(false);
  const [isFinishingJobCard, setIsFinishingJobCard] = useState(false);
  const [nextServiceMileage, setNextServiceMileage] = useState('');
  const [mileageError, setMileageError] = useState('');
  const [partOrders, setPartOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [error, setError] = useState(null);
  const [currentMileage, setCurrentMileage] = useState(jobCard.ServiceMilleage || 0);
  const [isLoadingMileage, setIsLoadingMileage] = useState(false);

  // Calculate the number of completed services
  const completedServices = jobCard.Services.filter(s => s.Status === 'Finished').length;
  const progressPercentage = (completedServices / jobCard.Services.length) * 100;
  
  // Check if all services are finished
  const allServicesFinished = completedServices === jobCard.Services.length && jobCard.Services.length > 0;

  // Check if there's a pending order (status 'Sent')
  const hasPendingOrder = partOrders.some(order => order.OrderStatus === 'Sent');

  // Fetch part orders and current mileage when component mounts
  useEffect(() => {
    fetchPartOrders();
    fetchCurrentMileage();
  }, [jobCard.JobCardID]);

  const fetchCurrentMileage = async () => {
    if (!jobCard.VehicleID) return;
    
    setIsLoadingMileage(true);
    try {
      const response = await AxiosInstance.get(`/api/customers/get-mileage/${jobCard.VehicleID}`);
      
      if (response.data && response.data.success) {
        setCurrentMileage(response.data.data.currentMileage || jobCard.serviceMilleage || 0);
      } else {
        toast.error(response.data?.message || 'Failed to fetch current mileage');
      }
    } catch (error) {
      console.error('Error fetching current mileage:', error);
      toast.error('Failed to fetch current mileage');
    } finally {
      setIsLoadingMileage(false);
    }
  };

  const fetchPartOrders = async () => {
    setIsLoadingOrders(true);
    setError(null);
    try {
      const response = await AxiosInstance.get(`/api/mechanic/part-orders/${jobCard.JobCardID}`);
      
      if (response.data && response.data.success) {
        setPartOrders(response.data.orders || []);
      } else {
        setError(response.data?.message || 'Failed to fetch part orders');
        toast.error(response.data?.message || 'Failed to fetch part orders');
      }
    } catch (error) {
      console.error('Error fetching part orders:', error);
      setError(error.response?.data?.message || error.message || 'Network error');
      toast.error(error.response?.data?.message || 'Failed to fetch part orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleOrderParts = async (parts) => {
    setIsOrderingParts(true);
    try {
      const response = await AxiosInstance.post(`/api/mechanic/order-parts/${jobCard.JobCardID}`, { parts });
      
      if (response.data) {
        toast.success('Parts ordered successfully!');
        setShowOrderPartsModal(false);
        await fetchPartOrders();
      }
    } catch (error) {
      console.error('Error ordering parts:', error);
      toast.error(error.response?.data?.message || 'Failed to order parts');
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
      const response = await AxiosInstance.put(`/api/mechanic/finish-job/${jobCard.JobCardID}`, {
        nextServiceMileage: parseInt(nextServiceMileage)
      });
      
      if (response.data) {
        toast.success('Job card completed successfully!');
        if (onJobCardFinished) {
          onJobCardFinished();
        }
      }
    } catch (error) {
      console.error('Error finishing job card:', error);
      toast.error(error.response?.data?.message || 'Failed to finish job card');
    } finally {
      setIsFinishingJobCard(false);
    }
  };

  const renderOrderStatus = () => {
    if (isLoadingOrders) {
      return (
        <div className="flex items-center justify-center p-4">
          <FiRefreshCw className="animate-spin mr-2" />
          <span>Loading orders...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="flex items-center text-red-600">
            <FiAlertCircle className="mr-2" />
            <span>Error loading orders: {error}</span>
          </div>
          <button 
            onClick={fetchPartOrders}
            className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center"
          >
            <FiRefreshCw className="mr-1" /> Retry
          </button>
        </div>
      );
    }

    if (partOrders.length === 0) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <div className="flex items-center text-blue-600">
            <FiPackage className="mr-2" />
            <span>No parts orders found for this job card</span>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4">
        <h3 className="font-medium text-gray-800 mb-2 flex items-center">
          <FiPackage className="mr-2" /> Parts Orders ({partOrders.length})
        </h3>
        <div className="space-y-3">
          {partOrders.map((order) => (
            <div key={order.OrderID} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {order.OrderStatus === 'Approved' ? (
                    <FiCheckCircle className="text-green-500" size={20} />
                  ) : order.OrderStatus === 'Rejected' ? (
                    <FiXCircle className="text-red-500" size={20} />
                  ) : (
                    <FiClock className="text-amber-500" size={20} />
                  )}
                  <div>
                    <h4 className="font-medium">{order.OrderID}</h4>
                    <p className="text-xs text-gray-500">
                      {new Date(order.RequestedAt).toLocaleString()}
                      {order.RequestedByName && ` • Requested by ${order.RequestedByName}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.OrderStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                    order.OrderStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {order.OrderStatus}
                  </span>
                  {order.OrderStatus === 'Approved' && (
                    <span className={`text-xs mt-1 ${
                      order.FulfillmentStatus === 'Fulfilled' ? 'text-blue-600' :
                      order.FulfillmentStatus === 'Partially Fulfilled' ? 'text-purple-600' :
                      'text-gray-600'
                    }`}>
                      {order.FulfillmentStatus}
                    </span>
                  )}
                </div>
              </div>
              
              {order.Notes && (
                <div className="mt-2 text-sm text-gray-600 border-t pt-2">
                  <p className="italic">{order.Notes}</p>
                </div>
              )}

              {order.parts && order.parts.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Parts:</h5>
                  <ul className="space-y-1">
                    {order.parts.map((part, index) => (
                      <li key={index} className="text-sm text-gray-600 flex justify-between">
                        <span>{part.PartName || `Part ${part.PartID}`}</span>
                        <span className="font-medium">x{part.Quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
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
            {isLoadingMileage ? (
              <div className="flex items-center">
                <FiRefreshCw className="animate-spin mr-2" />
                <span className="text-sm text-gray-600">Loading current mileage...</span>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700">Current Vehicle Mileage:</span>
                <span className="ml-2 text-sm text-gray-900">{currentMileage} km</span>
              </>
            )}
          </div>
        </div>

        {/* Service Mileage Information */}
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center">
            <FiTool className="text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Service Mileage:</span>
            <span className="ml-2 text-sm text-blue-900">{jobCard.ServiceMilleage || 'N/A'} km</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Mileage recorded when service was started
          </p>
        </div>
          
        {/* Parts Order Status Section */}
        {renderOrderStatus()}
        
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
        {allServicesFinished && (
          <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-800 mb-2">
              Set Next Service Mileage
            </h3>
            
            <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-md">
              <div className="flex items-center">
                <FiClock className="text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Current Vehicle Mileage:</span>
                <span className="ml-2 text-sm font-bold text-blue-700">{currentMileage} km</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Next service mileage must be greater than the current vehicle mileage
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
                  min={currentMileage + 1}
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
              disabled={hasPendingOrder || isLoadingOrders}
              className={`flex items-center text-sm px-4 py-2 rounded transition-colors ${
                hasPendingOrder || isLoadingOrders
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiShoppingCart className="mr-2" />
              {hasPendingOrder ? 'Parts Already Ordered' : 'Order Parts'}
            </button>
          )}
          
          {allServicesFinished && (
            <button 
              onClick={handleFinishJobCard}
              disabled={isFinishingJobCard || hasPendingOrder}
              className={`flex items-center text-sm px-4 py-2 rounded text-white transition-colors ${
                isFinishingJobCard || hasPendingOrder
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
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