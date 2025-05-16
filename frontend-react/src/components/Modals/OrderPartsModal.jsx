import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiMinus, FiShoppingCart, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import AxiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

const OrderPartsModal = ({ jobCard, onClose, onSubmit }) => {
  const [parts, setParts] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [error, setError] = useState(null);
  const [partAvailability, setPartAvailability] = useState({});

  // Fetch available parts when modal opens
  useEffect(() => {
    const fetchParts = async () => {
      try {
        setIsLoading(true);
        const response = await AxiosInstance.get('/api/cashier/getparts');
        
        // Add availability information to each part
        const partsWithAvailability = response.data.parts.map(part => ({
          ...part,
          isAvailable: Number(part.Stock) > 0, // Use Stock as initial indicator
          availableQuantity: Number(part.Stock) || 0 // Convert to number
        }));
        setAvailableParts(partsWithAvailability);
      } catch (err) {
        setError('Failed to load parts');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchParts();
  }, []);

  // Initialize parts for each service
  useEffect(() => {
    if (jobCard?.Services) {
      const initialParts = jobCard.Services.map(service => ({
        ServiceRecord_ID: service.ServiceRecord_ID,
        ServiceName: service.ServiceName,
        parts: []
      }));
      setParts(initialParts);
    }
  }, [jobCard]);

  const handleAddPart = (serviceIndex) => {
    const updatedParts = [...parts];
    updatedParts[serviceIndex].parts.push({
      PartID: '',
      Quantity: 1,
      Name: '',
      isAvailable: false,
      availableQuantity: 0
    });
    setParts(updatedParts);
  };

  const handleRemovePart = (serviceIndex, partIndex) => {
    const updatedParts = [...parts];
    updatedParts[serviceIndex].parts.splice(partIndex, 1);
    setParts(updatedParts);
  };

  const checkPartAvailability = async (partId) => {
    if (!partId) return null;
    
    // If we already checked this part, return cached result
    if (partAvailability[partId]) {
      return partAvailability[partId];
    }
    
    try {
      setIsCheckingAvailability(true);
      const response = await AxiosInstance.get(`/api/mechanic/check-part-availability/${partId}`);
      
      // Cache the result - ensure numeric conversion for availability calculation
      const availableQuantity = Number(response.data.part.TotalAvailable || 0);
      
      const availabilityData = {
        isAvailable: availableQuantity > 0, // Calculate based on actual quantity
        availableQuantity: availableQuantity,
        batches: response.data.batches || []
      };
      
      setPartAvailability(prev => ({
        ...prev,
        [partId]: availabilityData
      }));
      
      return availabilityData;
    } catch (err) {
      console.error("Error checking part availability:", err);
      return {
        isAvailable: false,
        availableQuantity: 0,
        batches: []
      };
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handlePartChange = async (serviceIndex, partIndex, field, value) => {
    const updatedParts = [...parts];
    updatedParts[serviceIndex].parts[partIndex][field] = value;
    
    // If changing PartID, update the Name from availableParts and check availability
    if (field === 'PartID') {
      const selectedPart = availableParts.find(p => p.PartID === value);
      if (selectedPart) {
        updatedParts[serviceIndex].parts[partIndex].Name = selectedPart.Name;
        
        // Check real-time availability
        const availability = await checkPartAvailability(value);
        
        if (availability) {
          const availableQty = Number(availability.availableQuantity);
          
          // Update the selected part in the current service
          updatedParts[serviceIndex].parts[partIndex].isAvailable = availableQty > 0;
          updatedParts[serviceIndex].parts[partIndex].availableQuantity = availableQty;
          
          // Also update the availableParts state with the new quantity
          setAvailableParts(prevParts => 
            prevParts.map(p => 
              p.PartID === value 
                ? {...p, availableQuantity: availableQty, isAvailable: availableQty > 0} 
                : p
            )
          );
          
          // Show toast if part is not available
          if (availableQty <= 0) {
            toast.warning(`${selectedPart.Name} is currently out of stock!`);
          } else if (availableQty < updatedParts[serviceIndex].parts[partIndex].Quantity) {
            toast.warning(`Only ${availableQty} units of ${selectedPart.Name} available!`);
          }
        }
      }
    }
    
    setParts(updatedParts);
  };

  const handleQuantityChange = async (serviceIndex, partIndex, increment) => {
    const updatedParts = [...parts];
    const currentPart = updatedParts[serviceIndex].parts[partIndex];
    const newQuantity = currentPart.Quantity + (increment ? 1 : -1);
    
    if (newQuantity > 0) {
      // Check if we have enough stock for the new quantity
      const partId = currentPart.PartID;
      if (partId) {
        const availability = await checkPartAvailability(partId);
        
        if (availability && newQuantity > Number(availability.availableQuantity)) {
          toast.warning(`Requested quantity exceeds available stock (${availability.availableQuantity} available)`);
        }
      }
      
      updatedParts[serviceIndex].parts[partIndex].Quantity = newQuantity;
      setParts(updatedParts);
    }
  };

  const handleSubmit = () => {
    // Flatten the parts array to match the API expectation
    const orderParts = parts.flatMap(service => 
      service.parts.filter(part => part.PartID).map(part => ({
        ServiceRecord_ID: service.ServiceRecord_ID,
        PartID: part.PartID,
        Quantity: part.Quantity
      }))
    );

    if (orderParts.length === 0) {
      setError('Please add at least one part to order');
      return;
    }

    // Check if any parts exceed available quantity
    const unavailableParts = [];
    orderParts.forEach(part => {
      const availability = partAvailability[part.PartID];
      if (availability && Number(part.Quantity) > Number(availability.availableQuantity)) {
        const partInfo = availableParts.find(p => p.PartID === part.PartID);
        unavailableParts.push({
          name: partInfo?.Name || part.PartID,
          requested: part.Quantity,
          available: availability.availableQuantity
        });
      }
    });

    // If there are unavailable parts, show a confirmation dialog
    if (unavailableParts.length > 0) {
      const confirmMessage = `Some parts have insufficient stock:\n${
        unavailableParts.map(p => `- ${p.name}: requested ${p.requested}, available ${p.available}`).join('\n')
      }\n\nDo you want to submit the order anyway?`;
      
      if (window.confirm(confirmMessage)) {
        onSubmit(orderParts);
      }
    } else {
      onSubmit(orderParts);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold">Order Parts for Job Card #{jobCard.JobCardID}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <div className="space-y-6">
              {parts.map((service, serviceIndex) => (
                <div key={service.ServiceRecord_ID} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">{service.ServiceName}</h3>
                  
                  {service.parts.length > 0 ? (
                    <div className="space-y-3">
                      {service.parts.map((part, partIndex) => (
                        <div key={partIndex} className="flex items-center space-x-3">
                          <div className="flex-1">
                            <select
                              className="w-full border rounded p-2"
                              value={part.PartID}
                              onChange={(e) => handlePartChange(serviceIndex, partIndex, 'PartID', e.target.value)}
                            >
                              <option value="">Select Part</option>
                              {availableParts.map(availablePart => {
                                // Get the real-time availability from partAvailability if it exists
                                const realTimeAvailability = partAvailability[availablePart.PartID];
                                const actualQuantity = realTimeAvailability 
                                  ? Number(realTimeAvailability.availableQuantity) 
                                  : Number(availablePart.availableQuantity);
                                
                                return (
                                  <option 
                                    key={availablePart.PartID} 
                                    value={availablePart.PartID}
                                    disabled={actualQuantity <= 0}
                                  >
                                    {availablePart.Name} ({availablePart.PartNumber || 'N/A'}) - 
                                    {actualQuantity > 0 
                                      ? ` ${actualQuantity} available` 
                                      : ' Out of stock'}
                                  </option>
                                );
                              })}
                            </select>
                            
                            {/* Availability indicator */}
                            {part.PartID && (
                              <div className="text-xs mt-1 flex items-center">
                                {partAvailability[part.PartID] ? (
                                  Number(partAvailability[part.PartID].availableQuantity) > 0 ? (
                                    <>
                                      <FiCheckCircle className="text-green-500 mr-1" />
                                      <span className={Number(part.Quantity) > Number(partAvailability[part.PartID].availableQuantity) 
                                        ? "text-orange-500" 
                                        : "text-green-500"
                                      }>
                                        {partAvailability[part.PartID].availableQuantity} available
                                        {Number(part.Quantity) > Number(partAvailability[part.PartID].availableQuantity) && 
                                          ` (${part.Quantity - partAvailability[part.PartID].availableQuantity} short)`}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <FiAlertCircle className="text-red-500 mr-1" />
                                      <span className="text-red-500">Out of stock</span>
                                    </>
                                  )
                                ) : (
                                  <span className="text-gray-500">Checking availability...</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center border rounded">
                            <button 
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                              onClick={() => handleQuantityChange(serviceIndex, partIndex, false)}
                            >
                              <FiMinus />
                            </button>
                            <span className="px-3">{part.Quantity}</span>
                            <button 
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                              onClick={() => handleQuantityChange(serviceIndex, partIndex, true)}
                            >
                              <FiPlus />
                            </button>
                          </div>
                          
                          <button 
                            className="p-2 text-red-500 hover:text-red-700"
                            onClick={() => handleRemovePart(serviceIndex, partIndex)}
                          >
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No parts added for this service</p>
                  )}
                  
                  <button
                    className="mt-3 flex items-center text-sm text-[#944EF8] hover:text-[#7d3ac1]"
                    onClick={() => handleAddPart(serviceIndex)}
                  >
                    <FiPlus className="mr-1" /> Add Part
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#944EF8] text-white rounded hover:bg-[#7d3ac1] flex items-center"
            disabled={isLoading || isCheckingAvailability}
          >
            <FiShoppingCart className="mr-2" />
            {isLoading || isCheckingAvailability ? 'Processing...' : 'Submit Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderPartsModal;
