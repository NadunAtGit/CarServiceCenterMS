import React from 'react';

const CashierReports = () => {
  return (
    <div className="container mx-auto px-4 py-6 bg-[#D8D8D8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cashier Reports</h1>
        <p className="text-gray-600">Generate and view transaction reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[{
          title: 'Daily Summary',
          date: 'April 5, 2025',
          transactions: 156,
          revenue: '$3,245.75',
          average: '$20.81'
        }, {
          title: 'Weekly Summary',
          date: 'Mar 30 - Apr 5, 2025',
          transactions: 843,
          revenue: '$18,762.50',
          average: '$22.26'
        }, {
          title: 'Monthly Summary',
          date: 'March 2025',
          transactions: 3452,
          revenue: '$76,245.87',
          average: '$22.09'
        }].map((summary, i) => (
          <div key={i} className="bg-white/70 backdrop-blur-xl p-5 rounded-xl border border-[#944EF8]/10 shadow-md hover:shadow-lg transition-all duration-300">
            <h3 className="font-semibold text-gray-800">{summary.title}</h3>
            <p className="text-gray-500 text-sm">{summary.date}</p>
            <div className="mt-4">
              <div className="flex justify-between py-2 border-b">
                <span>Total Transactions</span>
                <span className="font-medium">{summary.transactions}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>Total Revenue</span>
                <span className="font-medium">{summary.revenue}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Average Transaction</span>
                <span className="font-medium">{summary.average}</span>
              </div>
            </div>
            <button className="mt-4 px-4 py-2 bg-[#944EF8] text-white rounded hover:bg-[#7b3be0] w-full">Generate Report</button>
          </div>
        ))}
      </div>

      <div className="bg-white/70 backdrop-blur-xl p-6 rounded-xl border border-[#944EF8]/10 shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Reports</h2>
          <select className="p-2 border rounded text-gray-700">
            <option>All Cashiers</option>
            <option>John Smith</option>
            <option>Sarah Johnson</option>
            <option>Mike Williams</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                {['Report ID', 'Date', 'Cashier', 'Type', 'Transactions', 'Amount', 'Actions'].map((col, i) => (
                  <th key={i} className="py-3 px-4 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[{
                id: '#REP-2504', date: 'Apr 5, 2025', cashier: 'John Smith', type: 'Daily', tx: 42, amount: '$876.50'
              }, {
                id: '#REP-2503', date: 'Apr 4, 2025', cashier: 'Sarah Johnson', type: 'Daily', tx: 38, amount: '$742.25'
              }, {
                id: '#REP-2502', date: 'Apr 3, 2025', cashier: 'Mike Williams', type: 'Daily', tx: 51, amount: '$1,102.75'
              }, {
                id: '#REP-2501', date: 'Apr 2, 2025', cashier: 'John Smith', type: 'Daily', tx: 47, amount: '$932.50'
              }, {
                id: '#REP-2500', date: 'Apr 1, 2025', cashier: 'Sarah Johnson', type: 'Daily', tx: 45, amount: '$891.75'
              }].map((report, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{report.id}</td>
                  <td className="py-3 px-4">{report.date}</td>
                  <td className="py-3 px-4">{report.cashier}</td>
                  <td className="py-3 px-4">{report.type}</td>
                  <td className="py-3 px-4">{report.tx}</td>
                  <td className="py-3 px-4">{report.amount}</td>
                  <td className="py-3 px-4">
                    <button className="text-[#944EF8] hover:text-[#7b3be0] mr-2">View</button>
                    <button className="text-[#944EF8] hover:text-[#7b3be0]">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="text-gray-600">Showing 5 of 42 reports</div>
          <div className="flex">
            <button className="px-3 py-1 border rounded mr-1 bg-gray-200">Previous</button>
            <button className="px-3 py-1 border rounded bg-[#944EF8] text-white">Next</button>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl p-6 rounded-xl border border-[#944EF8]/10 shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Generate Custom Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2">Report Type</label>
            <select className="w-full p-2 border rounded">
              <option>Daily Summary</option>
              <option>Weekly Summary</option>
              <option>Monthly Summary</option>
              <option>Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Cashier</label>
            <select className="w-full p-2 border rounded">
              <option>All Cashiers</option>
              <option>John Smith</option>
              <option>Sarah Johnson</option>
              <option>Mike Williams</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Start Date</label>
            <input type="date" className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">End Date</label>
            <input type="date" className="w-full p-2 border rounded" />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="px-6 py-2 bg-gray-200 rounded mr-2 hover:bg-gray-300">Reset</button>
          <button className="px-6 py-2 bg-[#944EF8] text-white rounded hover:bg-[#7b3be0]">Generate Report</button>
        </div>
      </div>
    </div>
  );
};

export default CashierReports;
