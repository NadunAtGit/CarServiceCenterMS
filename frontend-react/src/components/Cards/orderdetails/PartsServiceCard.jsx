import React from 'react';

const PartsServiceCard = ({ service }) => {
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
                className="flex justify-between items-center bg-white p-2 rounded border border-gray-200"
              >
                <div>
                  <p className="text-sm font-medium">{part.PartName}</p>
                  <p className="text-xs text-gray-600">{part.PartID}</p>
                </div>
                <div className="bg-gray-100 px-2 py-1 rounded text-sm">
                  Qty: {part.Quantity}
                </div>
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