import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/AxiosInstance';
import CreateInvoiceCard from '../../components/Cards/CreateInvoiceCard';
import InvoiceCard from '../../components/Cards/InvoiceCard';

const CashierPayments = () => {
  const [jobCards, setJobCards] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [allInvoicesLoading, setAllInvoicesLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch finished job cards
  const fetchJobCards = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/advisor/finished-jobcards');
      if (res.data.success) {
        setJobCards(res.data.jobCards || []);
      } else {
        setJobCards([]);
      }
    } catch (err) {
      console.error("Error fetching job cards:", err);
      setJobCards([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch pending invoices
  const fetchPendingInvoices = async () => {
    setInvoiceLoading(true);
    try {
      const res = await axiosInstance.get('/api/cashier/pending-invoices');
      if (res.data.success) {
        setPendingInvoices(res.data.data || []);
      } else {
        setPendingInvoices([]);
      }
    } catch (err) {
      console.error("Error fetching pending invoices:", err);
      setPendingInvoices([]);
    } finally {
      setInvoiceLoading(false);
    }
  };
  
  // Fetch all invoices with pagination and filters
  const fetchAllInvoices = async () => {
    setAllInvoicesLoading(true);
    try {
      let queryParams = new URLSearchParams({
        page: currentPage,
        limit
      });
      
      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }
      
      if (dateRange.startDate && dateRange.endDate) {
        queryParams.append('startDate', dateRange.startDate);
        queryParams.append('endDate', dateRange.endDate);
      }
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      const res = await axiosInstance.get(`/api/cashier/invoices?${queryParams.toString()}`);
      if (res.data.success) {
        setAllInvoices(res.data.data || []);
        setTotalPages(res.data.pagination.pages);
      } else {
        setAllInvoices([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching all invoices:", err);
      setAllInvoices([]);
      setTotalPages(1);
    } finally {
      setAllInvoicesLoading(false);
    }
  };

  // Initial data fetch on component mount
  useEffect(() => {
    fetchJobCards();
    fetchPendingInvoices();
  }, []);
  
  // Fetch all invoices when pagination or filters change
  useEffect(() => {
    fetchAllInvoices();
  }, [currentPage, limit, statusFilter, dateRange, searchTerm]);

  // Handle invoice creation
  const handleInvoiceCreated = async (jobCardId) => {
    // Refresh both job cards and pending invoices
    await fetchJobCards();
    await fetchPendingInvoices();
    await fetchAllInvoices(); // Also refresh all invoices
  };

  // Handle payment processing
  const handlePaymentProcessed = async (invoiceId) => {
    // Refresh pending invoices after payment
    await fetchPendingInvoices();
    await fetchAllInvoices(); // Also refresh all invoices
  };
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    // fetchAllInvoices is triggered by useEffect when searchTerm changes
  };
  
  // Handle date filter
  const handleDateFilter = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when filtering
    // fetchAllInvoices is triggered by useEffect when dateRange changes
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Cashier Payments</h1>
      
      <h2 className="text-xl font-semibold mb-3 text-gray-700">Finished Job Cards</h2>
      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : jobCards.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No finished job cards found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {jobCards.map(card => (
            <CreateInvoiceCard 
              key={card.JobCardID} 
              jobCard={card} 
              onInvoiceCreated={() => handleInvoiceCreated(card.JobCardID)}
            />
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3 text-gray-700">Pending Invoices</h2>
      {invoiceLoading ? (
        <div className="text-center text-gray-500 py-8">Loading pending invoices...</div>
      ) : pendingInvoices.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No pending invoices found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {pendingInvoices.map(invoice => (
            <InvoiceCard 
              key={invoice.Invoice_ID} 
              invoice={invoice} 
              onPaymentProcessed={() => handlePaymentProcessed(invoice.Invoice_ID)}
            />
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3 text-gray-700">All Invoices</h2>
      
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              id="statusFilter"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          
          {/* Date Range Filter */}
          <div>
            <form onSubmit={handleDateFilter} className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                />
                <input
                  type="date"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                />
                <button 
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
          
          {/* Search */}
          
        </div>
        <div>
            <form onSubmit={handleSearch}>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="flex">
                <input
                  id="search"
                  type="text"
                  placeholder="Search by Invoice or Job Card ID"
                  className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded-r-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
      </div>
      
      {/* Invoices Table */}
      <div className="overflow-x-auto rounded-xl shadow-lg bg-white">
        {allInvoicesLoading ? (
          <div className="text-center text-gray-500 py-8">Loading invoices...</div>
        ) : allInvoices.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No invoices found.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#944EF8]/10 text-gray-800">
                  <th className="py-3 px-4 text-left">Invoice ID</th>
                  <th className="py-3 px-4 text-left">Job Card</th>
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Parts Cost</th>
                  <th className="py-3 px-4 text-left">Labour Cost</th>
                  <th className="py-3 px-4 text-left">Total</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allInvoices.map((invoice) => (
                  <tr key={invoice.Invoice_ID} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">{invoice.Invoice_ID}</td>
                    <td className="py-3 px-4">{invoice.JobCard_ID}</td>
                    <td className="py-3 px-4">{invoice.FormattedDate}</td>
                    <td className="py-3 px-4">{formatCurrency(invoice.Parts_Cost)}</td>
                    <td className="py-3 px-4">{formatCurrency(invoice.Labour_Cost)}</td>
                    <td className="py-3 px-4 font-medium">{formatCurrency(invoice.Total)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(invoice.PaidStatus)}`}>
                        {invoice.PaidStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button 
                          className="text-purple-600 hover:text-purple-900"
                          onClick={() => window.open(`/invoice/${invoice.Invoice_ID}`, '_blank')}
                        >
                          View
                        </button>
                        {invoice.PaidStatus === 'Pending' && (
                          <button 
                            className="text-green-600 hover:text-green-900"
                            onClick={() => {
                              // Navigate to payment page or open payment modal
                              window.location.href = `/process-payment/${invoice.Invoice_ID}`;
                            }}
                          >
                            Process Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            <div className="flex justify-between items-center px-4 py-3 bg-white border-t border-gray-200">
              <div className="flex items-center">
                <select
                  className="border border-gray-300 rounded-md px-2 py-1 mr-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing limit
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm text-gray-700">
                  Showing <span className="font-medium">{allInvoices.length}</span> of{' '}
                  <span className="font-medium">{totalPages * limit}</span> results
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 rounded-md ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 rounded-md ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <span className="px-4 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CashierPayments;