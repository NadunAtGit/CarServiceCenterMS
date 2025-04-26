import React, { useState } from 'react';
import axiosInstance from '../../utils/AxiosInstance';

const InvoiceCard = ({ invoice, onPaymentProcessed }) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePayment = async () => {
    setProcessing(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axiosInstance.put(`/api/cashier/confirm-cash-payment/${invoice.Invoice_ID}`);
      
      if (response.data.success) {
        setSuccess('Payment processed successfully');
        if (onPaymentProcessed) {
          setTimeout(() => {
            onPaymentProcessed();
          }, 1500);
        }
      } else {
        setError(response.data.message || 'Failed to process payment');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing payment');
    } finally {
      setProcessing(false);
    }
  };

  // Format date if it exists
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
      {/* Header with Invoice ID and Status */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-bold text-lg">{invoice.Invoice_ID}</div>
          <div className="text-sm text-gray-600">Job Card: {invoice.JobCardID}</div>
        </div>
        <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          {invoice.PaidStatus}
        </div>
      </div>
      
      {/* Vehicle and Customer Info */}
      <div className="text-gray-700 mb-4">
        <div><span className="font-semibold">Vehicle:</span> {invoice.VehicleNo} ({invoice.Model})</div>
        <div><span className="font-semibold">Customer:</span> {invoice.FirstName} {invoice.SecondName}</div>
        <div><span className="font-semibold">Generated:</span> {formatDate(invoice.GeneratedDate)}</div>
      </div>
      
      {/* Cost Breakdown */}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-gray-500">Parts Cost:</span>
            <div className="font-mono">Rs. {Number(invoice.Parts_Cost).toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-500">Labor Cost:</span>
            <div className="font-mono">Rs. {Number(invoice.Labour_Cost).toFixed(2)}</div>
          </div>
        </div>
        
        {/* Total and Payment Button */}
        <div className="flex justify-between items-center">
          <div className="font-bold">
            Total: <span className="font-mono">Rs. {Number(invoice.Total).toFixed(2)}</span>
          </div>
          <button
            className="bg-[#944EF8] text-white px-4 py-2 rounded-lg hover:bg-[#7a3ee6] transition disabled:opacity-50"
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Mark as Paid'}
          </button>
        </div>
      </div>
      
      {/* Success/Error Messages */}
      {success && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded p-2 text-green-700 text-sm">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default InvoiceCard;