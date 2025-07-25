import React from 'react';
import { FiX, FiDownload, FiPrinter } from 'react-icons/fi';

const ReportModal = ({ report, onClose }) => {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return `$${parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="fixed inset-0 bg-white-100 bg-opacity-30 backdrop-filter-md backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#944EF8] text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">{report.type} Report Details</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-grow">
          {/* Report Header */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Report ID: {report.id}</h3>
                <p className="text-gray-600">Generated on {formatDate(report.generatedDate)}</p>
              </div>
              <div className="mt-3 md:mt-0">
                <span className="inline-block px-3 py-1 bg-[#944EF8]/10 text-[#944EF8] rounded-full font-medium text-sm">
                  {report.department} Department
                </span>
              </div>
            </div>
          </div>
          
          {/* Report Summary */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Report Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Report Period</p>
                <p className="font-medium">
                  {formatDate(report.startDate)} - {formatDate(report.endDate)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Generated By</p>
                <p className="font-medium">Employee ID: {report.generatedBy}</p>
              </div>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Key Metrics</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#944EF8]/5 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Total Transactions</p>
                <p className="text-xl font-semibold">{report.transactions}</p>
              </div>
              <div className="bg-[#944EF8]/5 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Total Revenue</p>
                <p className="text-xl font-semibold">{formatCurrency(report.revenue)}</p>
              </div>
              <div className="bg-[#944EF8]/5 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Services Completed</p>
                <p className="text-xl font-semibold">{report.services}</p>
              </div>
              <div className="bg-[#944EF8]/5 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Parts Sold</p>
                <p className="text-xl font-semibold">{report.parts}</p>
              </div>
            </div>
          </div>
          
          {/* Revenue Breakdown */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Revenue Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Service Revenue</p>
                <p className="text-lg font-semibold">{formatCurrency(report.serviceRevenue)}</p>
                <div className="mt-2 bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#944EF8] h-full" 
                    style={{ 
                      width: `${report.revenue > 0 ? (report.serviceRevenue / report.revenue) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Parts Revenue</p>
                <p className="text-lg font-semibold">{formatCurrency(report.partsRevenue)}</p>
                <div className="mt-2 bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#944EF8] h-full" 
                    style={{ 
                      width: `${report.revenue > 0 ? (report.partsRevenue / report.revenue) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Data Section */}
          {report.data && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Additional Data</h4>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(report.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
          <button 
            className="px-4 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7b3be0] flex items-center gap-2"
          >
            <FiDownload size={16} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
