import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/AxiosInstance';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddPartModal = ({ stockId, onClose, onPartAdded }) => {
  const [parts, setParts] = useState([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({
    notes: null
  });
  const [newPart, setNewPart] = useState({
    partId: '',
    StockPrice: '',
    RetailPrice: '',
    Quantity: '',
    BatchNumber: '',
    ManufacturingDate: '',
    ExpiryDate: '',
    Notes: ''
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
    setFieldErrors({ notes: null });
    setIsSubmitting(true);
    
    try {
      const response = await axiosInstance.post(
        `api/cashier/stocks/${stockId}/parts`, 
        newPart
      );
      
      if (response.status === 201) {
        // Show success toast
        toast.success("Part added to stock successfully!", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          toastId: "success-add-part" // Prevents duplicate toasts
        });
        
        // Notify parent component of success
        onPartAdded();
        onClose();
      }
    } catch (error) {
      // Extract error message
      let errorMessage = "An unknown error occurred";
      
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        const statusCode = error.response.status;
        errorMessage = error.response.data?.message || "An error occurred";
        
        // Check for field-specific errors
        if (error.response.data?.fieldErrors) {
          if (error.response.data.fieldErrors.Notes) {
            setFieldErrors(prev => ({
              ...prev,
              notes: error.response.data.fieldErrors.Notes
            }));
          }
        }
        
        // Handle specific status codes
        switch (statusCode) {
          case 409:
            toast.error(`Conflict: ${errorMessage}`, {
              position: "top-right",
              autoClose: 5000,
              toastId: "error-conflict-part"
            });
            break;
          case 404:
            toast.error(`Not found: ${errorMessage}`, {
              position: "top-right",
              autoClose: 5000,
              toastId: "error-notfound-part"
            });
            break;
          case 401:
            toast.error("Unauthorized: Please log in again", {
              position: "top-right",
              autoClose: 5000,
              toastId: "error-auth-part"
            });
            break;
          case 403:
            toast.error("You don't have permission to perform this action", {
              position: "top-right",
              autoClose: 5000,
              toastId: "error-permission-part"
            });
            break;
          case 500:
            toast.error(`Server error: ${errorMessage}`, {
              position: "top-right",
              autoClose: 5000,
              toastId: "error-server-part"
            });
            break;
          default:
            toast.error(`Error: ${errorMessage}`, {
              position: "top-right",
              autoClose: 5000,
              toastId: "error-default-part"
            });
        }
      } else if (error.request) {
        // The request was made but no response was received
        toast.error("No response received from server. Please check your connection.", {
          position: "top-right",
          autoClose: 5000,
          toastId: "error-network-part"
        });
      } else {
        // Something happened in setting up the request
        toast.error(`Error: ${error.message}`, {
          position: "top-right",
          autoClose: 5000,
          toastId: "error-request-part"
        });
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

  // Generate a default batch number based on current date
  const generateDefaultBatchNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `BATCH-${year}${month}${day}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/50 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* New fields for batch tracking */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
              value={newPart.BatchNumber || generateDefaultBatchNumber()}
              onChange={(e) => setNewPart({ ...newPart, BatchNumber: e.target.value })}
              placeholder="e.g., MFG-2025-04-001"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier for this batch of parts</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
              value={newPart.ManufacturingDate}
              onChange={(e) => setNewPart({ ...newPart, ManufacturingDate: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
              value={newPart.ExpiryDate}
              onChange={(e) => setNewPart({ ...newPart, ExpiryDate: e.target.value })}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank if not applicable</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className={`w-full px-3 py-2 border ${fieldErrors.notes ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80`}
              value={newPart.Notes}
              onChange={(e) => {
                setNewPart({ ...newPart, Notes: e.target.value });
                // Clear the error when user types
                if (fieldErrors.notes) {
                  setFieldErrors(prev => ({ ...prev, notes: null }));
                }
              }}
              placeholder="Additional information about this batch"
              rows="2"
              disabled={isSubmitting}
            />
            {fieldErrors.notes && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                {fieldErrors.notes}
              </p>
            )}
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
        
        {/* Toast container for notifications */}
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </div>
  );
};

export default AddPartModal;
