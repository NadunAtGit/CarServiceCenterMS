import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';

const AddPartModal = ({ stockId, onClose, onPartAdded }) => {
  const [parts, setParts] = useState([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [newPart, setNewPart] = useState({
    partId: '',
    StockPrice: '',
    RetailPrice: '',
    Quantity: ''
  });

  const fetchParts = async () => {
    try {
      setIsLoadingParts(true);
      const response = await axiosInstance.get('api/cashier/getparts');
      
      if (response.data.parts) {
        setParts(response.data.parts);
      } else {
        setError("Failed to fetch parts: " + (response.data.message || "Unknown error"));
        console.error("Failed to fetch parts:", response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch parts";
      setError(errorMessage);
      console.error("Error fetching parts:", error);
    } finally {
      setIsLoadingParts(false);
    }
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const response = await axiosInstance.post(
        `api/cashier/stocks/${stockId}/parts`, 
        newPart
      );
      
      if (response.status === 201) {
        // Notify parent component of success
        onPartAdded();
        onClose();
      }
    } catch (error) {
      // Handle specific error cases
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || "An error occurred";
        
        switch (statusCode) {
          case 404:
            setError(`Resource not found: ${errorMessage}`);
            break;
          case 401:
            setError("Unauthorized: Please log in again");
            break;
          case 403:
            setError("You don't have permission to perform this action");
            break;
          case 500:
            setError(`Server error: ${errorMessage}`);
            break;
          default:
            setError(`Error: ${errorMessage}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        setError("No response received from server. Please check your connection.");
      } else {
        // Something happened in setting up the request
        setError(`Error: ${error.message}`);
      }
      console.error("Error adding part to stock:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePartSelect = (partId) => {
    const selectedPart = parts.find(part => part.PartID === partId);
    if (selectedPart) {
      setNewPart({
        ...newPart,
        partId: selectedPart.PartID,
        // Pre-fill prices from existing part data if available
        StockPrice: newPart.StockPrice || selectedPart.BuyingPrice || '',
        RetailPrice: newPart.RetailPrice || selectedPart.SellingPrice || ''
      });
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/50 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4 text-[#7A40C2]">Add Part to Stock #{stockId}</h3>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleAddPart}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Part</label>
            {isLoadingParts ? (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#9A67EA]"></div>
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
                value={newPart.partId}
                onChange={(e) => handlePartSelect(e.target.value)}
                required
                disabled={isSubmitting}
              >
                <option value="">-- Select a part --</option>
                {parts.map(part => (
                  <option key={part.PartID} value={part.PartID}>
                    {part.PartID} - {part.Name || 'Unknown'} {part.Stock !== undefined ? `(Current Stock: ${part.Stock})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Price</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
              value={newPart.StockPrice}
              onChange={(e) => setNewPart({ ...newPart, StockPrice: e.target.value })}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Retail Price</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
              value={newPart.RetailPrice}
              onChange={(e) => setNewPart({ ...newPart, RetailPrice: e.target.value })}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
              value={newPart.Quantity}
              onChange={(e) => setNewPart({ ...newPart, Quantity: e.target.value })}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 transition-colors bg-white/80"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-[#7A40C2] text-white rounded-full ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#6b38b3]'} transition-colors flex items-center justify-center`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                'Add Part'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPartModal;