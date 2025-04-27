import React, { useState, useEffect } from 'react';
import { FiDownload, FiPrinter, FiFilter, FiCalendar, FiEye } from 'react-icons/fi';
import axiosInstance from '../../utils/AxiosInstance';
import ReportModal from '../../components/Modals/ReportModal';

const AdminReports = () => {
  const [reportType, setReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [department, setDepartment] = useState('all');
  const [dailySummary, setDailySummary] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentReports, setRecentReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    { value: 'service', label: 'Service Center' },
    { value: 'parts', label: 'Parts Department' },
    { value: 'sales', label: 'Vehicle Sales' },
    { value: 'finance', label: 'Finance' }
  ];

  useEffect(() => {
    const fetchSummaryData = async () => {
      setIsLoading(true);
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch daily summary
        const dailyRes = await axiosInstance.get(`/api/reports/daily?date=${today}`);
        setDailySummary(dailyRes.data.data);
        
        // Fetch weekly summary
        const weeklyRes = await axiosInstance.get('/api/reports/weekly');
        setWeeklySummary(weeklyRes.data.data);
        
        // Get current month and year
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
        
        // Fetch monthly summary
        const monthlyRes = await axiosInstance.get(`/api/reports/monthly?year=${currentYear}&month=${currentMonth}`);
        setMonthlySummary(monthlyRes.data.data);
  
        // Fetch real reports from API
        const reportsRes = await axiosInstance.get('/api/reports');
        if (reportsRes.data.success) {
          setRecentReports(reportsRes.data.reports);
        }
      } catch (error) {
        console.error("Error fetching summary data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSummaryData();
  }, []);
  
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };
  
  const handleDownloadReport = async (reportType, customParams = {}) => {
    try {
      let endpoint = `/api/reports/${reportType}/download`;
      let params = {};
      
      // Add custom parameters if provided
      if (Object.keys(customParams).length > 0) {
        params = { ...customParams };
      }
      
      // Make API call to generate and download PDF
      const response = await axiosInstance.get(endpoint, {
        params,
        responseType: 'blob' // Important for handling file downloads
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on report type
      const date = new Date().toISOString().split('T')[0];
      link.download = `${reportType}_report_${date}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error(`Error downloading ${reportType} report:`, error);
      alert(`Failed to download report. Please try again.`);
    }
  };

  const handleGenerateCustomReport = async () => {
    if (!dateRange.start || !dateRange.end) {
      alert('Please select both start and end dates');
      return;
    }
    
    // Prepare parameters for custom report
    const params = {
      startDate: dateRange.start,
      endDate: dateRange.end,
      department: department
    };
    
    // Call the download handler with custom parameters
    handleDownloadReport('custom', params);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#f5f5f5] min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Admin Reports Dashboard</h1>
        <p className="text-gray-600">Comprehensive reporting for all departments</p>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8]"></div>
          </div>
        ) : (
          <>
            {/* Daily Summary Card */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm hover:shadow-md transition-all">
              <h3 className="font-semibold text-gray-800">{dailySummary?.title || "Daily Summary"}</h3>
              <p className="text-gray-500 text-sm mb-4">{dailySummary?.date || "Today"}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Transactions</span>
                  <span className="font-medium">{dailySummary?.transactions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Revenue</span>
                  <span className="font-medium">${(dailySummary?.revenue || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Services</span>
                  <span className="font-medium">{dailySummary?.services || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Parts Sold</span>
                  <span className="font-medium">{dailySummary?.parts || 0}</span>
                </div>
              </div>
              
              <div className="mt-4">
                <button 
                  onClick={() => handleDownloadReport('daily')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#944EF8] text-white rounded hover:bg-[#7b3be0]"
                >
                  <FiDownload size={16} />
                  Download PDF
                </button>
              </div>
            </div>

            {/* Weekly Summary Card */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm hover:shadow-md transition-all">
              <h3 className="font-semibold text-gray-800">{weeklySummary?.title || "Weekly Summary"}</h3>
              <p className="text-gray-500 text-sm mb-4">{weeklySummary?.date || "This Week"}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Transactions</span>
                  <span className="font-medium">{weeklySummary?.transactions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Revenue</span>
                  <span className="font-medium">${(weeklySummary?.revenue || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Services</span>
                  <span className="font-medium">{weeklySummary?.services || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Parts Sold</span>
                  <span className="font-medium">{weeklySummary?.parts || 0}</span>
                </div>
              </div>
              
              <div className="mt-4">
                <button 
                  onClick={() => handleDownloadReport('weekly')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#944EF8] text-white rounded hover:bg-[#7b3be0]"
                >
                  <FiDownload size={16} />
                  Download PDF
                </button>
              </div>
            </div>

            {/* Monthly Summary Card */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm hover:shadow-md transition-all">
              <h3 className="font-semibold text-gray-800">{monthlySummary?.title || "Monthly Summary"}</h3>
              <p className="text-gray-500 text-sm mb-4">{monthlySummary?.date || "This Month"}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Transactions</span>
                  <span className="font-medium">{monthlySummary?.transactions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Revenue</span>
                  <span className="font-medium">${(monthlySummary?.revenue || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Services</span>
                  <span className="font-medium">{monthlySummary?.services || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Parts Sold</span>
                  <span className="font-medium">{monthlySummary?.parts || 0}</span>
                </div>
              </div>
              
              <div className="mt-4">
                <button 
                  onClick={() => handleDownloadReport('monthly')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#944EF8] text-white rounded hover:bg-[#7b3be0]"
                >
                  <FiDownload size={16} />
                  Download PDF
                </button>
              </div>
            </div>
          </>
        )}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.startDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.transactions}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.revenue}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button 
                          className="text-[#944EF8] hover:text-[#7b3be0]"
                          onClick={() => handleDownloadReport(report.type.toLowerCase(), { reportId: report.id })}
                          title="Download"
                        >
                          <FiDownload size={16} />
                        </button>
                        <button 
                          className="text-[#944EF8] hover:text-[#7b3be0]"
                          onClick={() => handleViewReport(report)}
                          title="View Details"
                        >
                          <FiEye size={16} />
                        </button>
                      </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">Showing {recentReports.length} of {recentReports.length} reports</div>
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
          <button 
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            onClick={() => {
              setDateRange({ start: '', end: '' });
              setDepartment('all');
              setReportType('daily');
            }}
          >
            Reset
          </button>
          <button 
            className="px-4 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7b3be0]"
            onClick={handleGenerateCustomReport}
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Report Modal */}
          {showModal && selectedReport && (
            <ReportModal 
              report={selectedReport} 
              onClose={() => setShowModal(false)} 
            />
          )}

    </div>

    
  );
};

export default AdminReports;
