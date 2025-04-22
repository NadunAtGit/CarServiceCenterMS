import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/AxiosInstance';
import CreateInvoiceCard from '../../components/Cards/CreateInvoiceCard';

const CashierPayments = () => {
  const [jobCards, setJobCards] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

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
    fetchJobCards();
    // Optionally, fetch invoices here if you have an endpoint
    // setInvoices([...]);
  }, []);

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

      <h2 className="text-xl font-semibold mb-3 text-gray-700">Invoices</h2>
      {/* Dummy table, replace with your own invoice fetching logic */}
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
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500">No invoices found.</td>
              </tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.invoiceID} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{inv.invoiceID}</td>
                  <td className="py-2 px-4">{inv.jobCardID}</td>
                  <td className="py-2 px-4">{inv.date}</td>
                  <td className="py-2 px-4">Rs. {inv.total}</td>
                  <td className="py-2 px-4">{inv.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashierPayments;
