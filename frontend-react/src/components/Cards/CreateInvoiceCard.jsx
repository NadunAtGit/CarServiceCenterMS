import React, { useState } from 'react';
import axiosInstance from '../../utils/AxiosInstance';

const CreateInvoiceCard = ({ jobCard }) => {
  const [creating, setCreating] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');

  const handleCreateInvoice = async () => {
    setCreating(true);
    setError('');
    setInvoice(null);
    try {
      const res = await axiosInstance.post(`/api/cashier/create-invoice/${jobCard.JobCardID}`);
      if (res.data.success) {
        setInvoice(res.data.invoice);
      } else {
        setError(res.data.message || 'Failed to create invoice');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating invoice');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <div className="font-bold text-lg">{jobCard.JobCardID}</div>
          <div className="text-sm text-gray-600">{jobCard.Type} | {jobCard.Status}</div>
        </div>
        <button
          className="bg-[#944EF8] text-white px-4 py-1 rounded-lg hover:bg-[#7a3ee6] transition"
          onClick={handleCreateInvoice}
          disabled={creating}
        >
          {creating ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
      <div className="mt-2 text-gray-700">
        <div><span className="font-semibold">Vehicle:</span> {jobCard.VehicleNo} ({jobCard.VehicleModel})</div>
        <div><span className="font-semibold">Appointment:</span> {jobCard.AppointmentDate?.slice(0,10)} {jobCard.AppointmentTime}</div>
        <div><span className="font-semibold">Service Details:</span> {jobCard.ServiceDetails}</div>
      </div>
      <div className="mt-4">
        <div className="font-semibold mb-1">Services</div>
        <ul className="text-sm text-gray-800 space-y-1">
          {jobCard.Services && jobCard.Services.length > 0 ? jobCard.Services.map(s => (
            <li key={s.serviceRecordId || s.ServiceRecord_ID} className="flex justify-between">
              <span>{s.description || s.Description} ({s.serviceType || s.ServiceType})</span>
              <span className="text-right text-gray-600 font-mono">Rs. {s.cost || s.price || 0}</span>
            </li>
          )) : <li className="text-gray-400">No services</li>}
        </ul>
      </div>
      <div className="mt-4">
        <div className="font-semibold mb-1">Parts Used</div>
        <ul className="text-sm text-gray-800 space-y-1">
          {jobCard.PartsUsed && jobCard.PartsUsed.length > 0 ? jobCard.PartsUsed.map(p => (
            <li key={p.partId || p.PartID} className="flex justify-between">
              <span>{p.partName || p.PartName} (x{p.quantity || p.Quantity})</span>
              <span className="text-right text-gray-600 font-mono">Rs. {p.totalPrice || p.TotalPrice || 0}</span>
            </li>
          )) : <li className="text-gray-400">No parts</li>}
        </ul>
      </div>
      <div className="mt-4 border-t pt-2 flex flex-col gap-1">
        <div className="flex justify-between text-sm">
          <span>Service Total</span>
          <span className="font-mono">Rs. {jobCard.totalServiceCost || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Parts Total</span>
          <span className="font-mono">Rs. {jobCard.totalPartsCost || 0}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span className="font-mono">Rs. {jobCard.totalCost || ((jobCard.totalServiceCost||0)+(jobCard.totalPartsCost||0))}</span>
        </div>
      </div>
      {invoice && (
        <div className="mt-4 bg-green-50 border border-green-400 rounded p-2 text-green-700 text-sm">
          Invoice Created: <span className="font-mono">{invoice.invoiceID}</span>
        </div>
      )}
      {error && (
        <div className="mt-2 bg-red-50 border border-red-400 rounded p-2 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default CreateInvoiceCard;
