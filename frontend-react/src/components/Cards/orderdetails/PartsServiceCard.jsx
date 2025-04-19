import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

const PartsServiceCard = ({ service, onCheckAvailability, availabilityData = {} }) => {
  const renderAvailabilityBadge = (partId) => {
    const data = availabilityData[partId];
    
    if (!data) return null;
    
    if (data.isAvailable) {
      return (
        <div className="flex items-center text-xs text-green-600 mt-1">
          <FiCheckCircle className="mr-1" />
          <span>{data.part.TotalAvailable} available in {data.part.BatchCount} batches</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-xs text-red-600 mt-1">
          <FiAlertCircle className="mr-1" />
          <span>Out of stock</span>
        </div>
      );
    }
  };
  
  const renderBatchInfo = (partId) => {
    const data = availabilityData[partId];
    
    if (!data || !data.batches || data.batches.length === 0) return null;
    
    return (
      <div className="mt-2 text-xs">
        <div className="flex items-center text-gray-600 mb-1">
          <FiInfo className="mr-1" />
          <span>FIFO Batch Information:</span>
        </div>
        <div className="ml-4 space-y-1">
          {data.batches.slice(0, 3).map((batch, index) => (
            <div key={batch.BatchID} className="flex justify-between">
              <span>Batch {batch.BatchNumber || batch.BatchID}</span>
              <span>{batch.RemainingQuantity} units</span>
              <span>{new Date(batch.ReceiptDate).toLocaleDateString()}</span>
            </div>
          ))}
          {data.batches.length > 3 && (
            <div className="text-gray-500 italic">
              ...and {data.batches.length - 3} more batches
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-md font-semibold text-gray-700">{service.ServiceRecordID}</h4>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
          {service.ServiceType}
        </span>
      </div>

      <div className="mt-2">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Required Parts:</h5>
        <div className="space-y-2">
          {service.Parts.length > 0 ? (
            service.Parts.map((part) => (
              <div 
                key={part.PartID} 
                className="flex flex-col bg-white p-2 rounded border border-gray-200 gap-2"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{part.PartName}</p>
                    <p className="text-xs text-gray-600">Part ID: {part.PartID}</p>
                    {renderAvailabilityBadge(part.PartID)}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <div className="bg-gray-100 px-2 py-1 rounded text-sm whitespace-nowrap">
                      Qty: {part.Quantity}
                    </div>
                    <button
                      onClick={() => onCheckAvailability(part.PartID)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded text-sm whitespace-nowrap border border-blue-200"
                    >
                      Check Availability
                    </button>
                  </div>
                </div>
                
                {renderBatchInfo(part.PartID)}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic">No parts required</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartsServiceCard;
