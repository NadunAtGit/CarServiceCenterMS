import React, { useState } from 'react';
import { FiDownload, FiPrinter, FiFilter, FiCalendar } from 'react-icons/fi';

const AdminReports = () => {
  const [reportType, setReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [department, setDepartment] = useState('all');

  // Mock data - replace with API calls
  const summaryData = {
    daily: {
      title: 'Daily Summary',
      date: 'April 7, 2025',
      transactions: 342,
      revenue: '$8,745.25',
      services: 156,
      parts: 186
    },
    weekly: {
      title: 'Weekly Summary',
      date: 'Mar 31 - Apr 6, 2025',
      transactions: 1842,
      revenue: '$42,567.80',
      services: 856,
      parts: 986
    },
    monthly: {
      title: 'Monthly Summary',
      date: 'March 2025',
      transactions: 7453,
      revenue: '$192,845.60',
      services: 3452,
      parts: 4001
    }
  };

  const recentReports = [
    { id: 'ADM-REP-0425', date: 'Apr 7, 2025', type: 'Daily', department: 'All', transactions: 342, revenue: '$8,745.25' },
    { id: 'ADM-REP-0424', date: 'Apr 6, 2025', type: 'Daily', department: 'Service', transactions: 198, revenue: '$5,120.50' },
    { id: 'ADM-REP-0423', date: 'Apr 5, 2025', type: 'Daily', department: 'Parts', transactions: 144, revenue: '$3,624.75' },
    { id: 'ADM-REP-0415', date: 'Apr 1-7, 2025', type: 'Weekly', department: 'All', transactions: 1842, revenue: '$42,567.80' },
    { id: 'ADM-REP-0325', date: 'Mar 1-31, 2025', type: 'Monthly', department: 'All', transactions: 7453, revenue: '$192,845.60' }
  ];

  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    { value: 'service', label: 'Service Center' },
    { value: 'parts', label: 'Parts Department' },
    { value: 'sales', label: 'Vehicle Sales' },
    { value: 'finance', label: 'Finance' }
  ];

  const handleGenerateReport = () => {
    // In a real app, this would call an API to generate the report
    alert(`Generating ${reportType} report for ${department} department from ${dateRange.start} to ${dateRange.end}`);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#f5f5f5] min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Admin Reports Dashboard</h1>
        <p className="text-gray-600">Comprehensive reporting for all departments</p>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(summaryData).map(([key, data]) => (
          <div key={key} className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm hover:shadow-md transition-all">
            <h3 className="font-semibold text-gray-800">{data.title}</h3>
            <p className="text-gray-500 text-sm mb-4">{data.date}</p>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Transactions</span>
                <span className="font-medium">{data.transactions}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Revenue</span>
                <span className="font-medium">{data.revenue}</span>
              </div>
              <div className="flex justify-between">
                <span>Services</span>
                <span className="font-medium">{data.services}</span>
              </div>
              <div className="flex justify-between">
                <span>Parts Sold</span>
                <span className="font-medium">{data.parts}</span>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#944EF8]/10 text-[#944EF8] rounded hover:bg-[#944EF8]/20">
                <FiDownload size={16} />
                Export
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#944EF8] text-white rounded hover:bg-[#7b3be0]">
                <FiPrinter size={16} />
                Print
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white rounded-xl border border-[#944EF8]/20 p-6 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2 md:mb-0">Recent Reports</h2>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select 
                className="appearance-none pl-3 pr-8 py-2 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/30"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {departmentOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <FiFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#944EF8]/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Report ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Transactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentReports.map((report, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.transactions}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.revenue}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button className="text-[#944EF8] hover:text-[#7b3be0]">
                        <FiDownload size={16} />
                      </button>
                      <button className="text-[#944EF8] hover:text-[#7b3be0]">
                        <FiPrinter size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">Showing 5 of 28 reports</div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border rounded bg-gray-100 hover:bg-gray-200">Previous</button>
            <button className="px-3 py-1 border rounded bg-[#944EF8] text-white hover:bg-[#7b3be0]">Next</button>
          </div>
        </div>
      </div>

      {/* Custom Report Generator */}
      <div className="bg-white rounded-xl border border-[#944EF8]/20 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Generate Custom Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]/30"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="daily">Daily Summary</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Summary</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]/30"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {departmentOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="relative">
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]/30"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
              <FiCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="relative">
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]/30"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
              <FiCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
            Reset
          </button>
          <button 
            className="px-4 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7b3be0]"
            onClick={handleGenerateReport}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;