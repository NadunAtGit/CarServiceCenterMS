import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/AxiosInstance';
import CreateInvoiceCard from '../../components/Cards/CreateInvoiceCard';
import InvoiceCard from '../../components/Cards/InvoiceCard';

const CashierPayments = () => {
  const [jobCards, setJobCards] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(true);

  // Fetch finished job cards on mount
  useEffect(() => {
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
        setJobCards([]);
      } finally {
        setLoading(false);
      }
    };
    
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
    
    fetchJobCards();
    fetchPendingInvoices();
  }, []);

  const handlePaymentProcessed = async () => {
    // Refresh the pending invoices list after payment
    try {
      const res = await axiosInstance.get('/api/customers/pending-invoices');
      if (res.data.success) {
        setPendingInvoices(res.data.data || []);
      }
    } catch (err) {
      console.error("Error refreshing pending invoices:", err);
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
            <CreateInvoiceCard key={card.JobCardID} jobCard={card} />
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
              onPaymentProcessed={handlePaymentProcessed}
            />
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3 text-gray-700">Invoices</h2>
      {/* Existing invoice table code */}
      <div className="overflow-x-auto rounded-xl shadow-lg bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#944EF8]/10 text-gray-800">
              <th className="py-3 px-4 text-left">Invoice ID</th>
              <th className="py-3 px-4 text-left">Job Card</th>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Total</th>
              <th className="py-3 px-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Your existing invoice table rows */}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashierPayments;
