import React from 'react';
import { FiChevronRight } from 'react-icons/fi';

const PartsCard = ({ parts }) => {
  return (
    <div className="bg-gradient-to-r from-white via-gray-100 to-gray-200 rounded-lg shadow-lg p-4">
      <h3 className="font-semibold text-xl text-gray-800 mb-3">Parts ({parts.length})</h3>
      <div className="space-y-3">
        {parts.map((part) => (
          <div
            key={part.PartID}
            className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div>
              <p className="font-semibold text-gray-800">{part.PartName}</p>
              <p className="text-sm text-gray-600">Quantity: {part.Quantity}</p>
            </div>
            <button className="text-sm text-blue-500 hover:text-blue-700 flex items-center">
              View Details
              <FiChevronRight className="inline ml-1" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartsCard;
