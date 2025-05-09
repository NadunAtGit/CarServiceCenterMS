import React, { useState, useEffect } from 'react';
import { FiUsers, FiDollarSign, FiCalendar, FiTool, FiBarChart2 } from "react-icons/fi";
import { AiOutlineRise, AiOutlineFall } from "react-icons/ai";
import axiosInstance from '../../utils/AxiosInstance';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0,
    totalAppointments: 0,
    totalEmployees: 0,
    totalServices: 0,
    salesGrowth: 0,
    appointmentGrowth: 0
  });
  const [topEmployees, setTopEmployees] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [serviceDistribution, setServiceDistribution] = useState([]);
  const [revenueByDepartment, setRevenueByDepartment] = useState([]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch monthly sales data from API
      const TotalSalesResponse = await axiosInstance.get('/api/reports/this-month-sales');
      console.log("API Response:", TotalSalesResponse.data);

      // Check if the response has the expected structure
      if (TotalSalesResponse.data && TotalSalesResponse.data.totalSales) {
        const salesValue = parseFloat(TotalSalesResponse.data.totalSales);
        console.log("Parsed Sales Value:", salesValue);
        
        if (!isNaN(salesValue)) {
          setDashboardData(prevData => ({
            ...prevData,
            totalSales: salesValue
          }));
        } else {
          console.error("Failed to parse sales value:", TotalSalesResponse.data.totalSales);
          setDashboardData(prevData => ({
            ...prevData,
            totalSales: 0
          }));
        }
      } else {
        console.error("Unexpected API response format:", TotalSalesResponse.data);
        setDashboardData(prevData => ({
          ...prevData,
          totalSales: 0
        }));
      }

      const TotalAppointmentsResponse = await axiosInstance.get('/api/reports/this-month-appointments');
      console.log("API Response (Appointments):", TotalAppointmentsResponse.data);

      if (TotalAppointmentsResponse.data && TotalAppointmentsResponse.data.totalAppointments) {
        const appointmentsValue = parseInt(TotalAppointmentsResponse.data.totalAppointments);
        console.log("Parsed Appointments Value:", appointmentsValue);
        
        if (!isNaN(appointmentsValue)) {
          setDashboardData(prevData => ({
            ...prevData,
            totalAppointments: appointmentsValue
          }));
        } else {
          console.error("Failed to parse appointments value:", TotalAppointmentsResponse.data.totalAppointments);
          setDashboardData(prevData => ({
            ...prevData,
            totalAppointments: 0
          }));
        }
      } else {
        console.error("Unexpected API response format for appointments:", TotalAppointmentsResponse.data);
        setDashboardData(prevData => ({
          ...prevData,
          totalAppointments: 0
        }));
      }

      // Inside fetchDashboardData function
      const monthlySalesResponse = await axiosInstance.get('/api/reports/monthly-sales');
      console.log("Monthly Sales Data:", monthlySalesResponse.data);

      if (Array.isArray(monthlySalesResponse.data) && monthlySalesResponse.data.length > 0) {
        // Find the index of April to reorder the months starting from April
        const monthsOrder = ["January", "February", "March", "April", "May", "June", 
                            "July", "August", "September", "October", "November", "December"];
        const aprilIndex = monthsOrder.indexOf("April");
        
        // Reorder months to start from April
        const reorderedMonths = [
          ...monthsOrder.slice(aprilIndex),
          ...monthsOrder.slice(0, aprilIndex)
        ];
        
        // Create a map of the API data for easy lookup
        const salesByMonth = {};
        monthlySalesResponse.data.forEach(item => {
          salesByMonth[item.month] = parseFloat(item.totalSales);
        });
        
        // Create the chart data array starting from April
        const chartData = reorderedMonths.map(month => ({
          month: month.substring(0, 3), // Abbreviate month names to first 3 letters
          sales: salesByMonth[month] || 0 // Use 0 if no data for that month
        }));
        
        setMonthlySales(chartData);
      } else {
        console.error("Unexpected API response format:", monthlySalesResponse.data);
        // Fallback to mock data if needed
      }

      // Add this to your fetchDashboardData function
      const employeeCountResponse = await axiosInstance.get('/api/reports/count-employees');
      console.log("Employee Count Response:", employeeCountResponse.data);

      // Check if the response has the expected structure
      if (employeeCountResponse.data && employeeCountResponse.data.employee_count !== undefined) {
        const employeeCount = parseInt(employeeCountResponse.data.employee_count);
        console.log("Parsed Employee Count:", employeeCount);
        
        if (!isNaN(employeeCount)) {
          setDashboardData(prevData => ({
            ...prevData,
            totalEmployees: employeeCount
          }));
        } else {
          console.error("Failed to parse employee count:", employeeCountResponse.data.totalEmployees);
          setDashboardData(prevData => ({
            ...prevData,
            totalEmployees: 0
          }));
        }
      } else {
        console.error("Unexpected API response format for employee count:", employeeCountResponse.data);
        setDashboardData(prevData => ({
          ...prevData,
          totalEmployees: 0
        }));
      }

      // Fetch service distribution data from API
      const serviceDistributionResponse = await axiosInstance.get('/api/reports/service-distribution');
      console.log("Service Distribution Data:", serviceDistributionResponse.data);

      if (serviceDistributionResponse.data.success && Array.isArray(serviceDistributionResponse.data.serviceDistribution)) {
        const services = serviceDistributionResponse.data.serviceDistribution;
        
        // Process data to show top 4 and group others
        if (services.length > 4) {
          // Sort by value (percentage) in descending order
          const sortedServices = [...services].sort((a, b) => b.value - a.value);
          
          // Take top 4 services
          const top4Services = sortedServices.slice(0, 4);
          
          // Calculate "Other" percentage by summing the rest
          const otherPercentage = sortedServices.slice(4).reduce((sum, item) => sum + item.value, 0);
          
          // Create final data with "Other" category
          const finalData = [
            ...top4Services,
            { name: "Other", value: otherPercentage }
          ];
          
          setServiceDistribution(finalData);
        } else {
          setServiceDistribution(services);
        }
      } else {
        console.error("Unexpected API response format for service distribution:", serviceDistributionResponse.data);
        // Fallback to empty array or mock data
        setServiceDistribution([]);
      }

      // Mock top employees data
      setTopEmployees([
        { id: 'EMP001', name: 'John Smith', role: 'Mechanic', performance: 95, revenue: 15200 },
        { id: 'EMP018', name: 'Sarah Johnson', role: 'Advisor', performance: 92, revenue: 14800 },
        { id: 'EMP007', name: 'Robert Lee', role: 'Team Leader', performance: 90, revenue: 13900 },
        { id: 'EMP025', name: 'Emma Wilson', role: 'Mechanic', performance: 88, revenue: 12750 },
        { id: 'EMP014', name: 'Michael Brown', role: 'Advisor', performance: 86, revenue: 12100 }
      ]);

      // Mock revenue by department
      // Inside fetchDashboardData function
const departmentRevenueResponse = await axiosInstance.get('/api/reports/department-revenue');
console.log("Department Revenue Data:", departmentRevenueResponse.data);

if (departmentRevenueResponse.data.success && Array.isArray(departmentRevenueResponse.data.departmentRevenue)) {
  setRevenueByDepartment(departmentRevenueResponse.data.departmentRevenue);
} else {
  console.error("Unexpected API response format for department revenue:", departmentRevenueResponse.data);
  // Fallback to empty array or mock data if needed
  setRevenueByDepartment([]);
}


    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Colors for the pie chart
  const COLORS = ['#944EF8', '#7a3fd0', '#5F30A5', '#472385', '#371A66', '#22104D'];

  return (
    <div className="container mx-auto px-4 py-6 bg-[#D8D8D8] min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8] mx-auto"></div>
          <p className="ml-3 text-gray-600">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Sales Card */}
            <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-5 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Sales <span className="text-xs">({new Date().toLocaleString('default', { month: 'long' })} 2025)</span></p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">${dashboardData.totalSales.toLocaleString()}</h3>
                  <div className="flex items-center mt-2">
                    {dashboardData.salesGrowth > 0 ? (
                      <>
                        <AiOutlineRise className="text-green-500" />
                        <span className="text-green-500 text-sm ml-1">{dashboardData.salesGrowth}%</span>
                      </>
                    ) : (
                      <>
                        <AiOutlineFall className="text-red-500" />
                        <span className="text-red-500 text-sm ml-1">{Math.abs(dashboardData.salesGrowth)}%</span>
                      </>
                    )}
                    <span className="text-gray-500 text-xs ml-2">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-[#944EF8]/10 rounded-lg">
                  <FiDollarSign size={24} className="text-[#944EF8]" />
                </div>
              </div>
            </div>

            {/* Total Appointments Card */}
            <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-5 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Appointments</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">{dashboardData.totalAppointments}</h3>
                  <div className="flex items-center mt-2">
                    {dashboardData.appointmentGrowth > 0 ? (
                      <>
                        <AiOutlineRise className="text-green-500" />
                        <span className="text-green-500 text-sm ml-1">{dashboardData.appointmentGrowth}%</span>
                      </>
                    ) : (
                      <>
                        <AiOutlineFall className="text-red-500" />
                        <span className="text-red-500 text-sm ml-1">{Math.abs(dashboardData.appointmentGrowth)}%</span>
                      </>
                    )}
                    <span className="text-gray-500 text-xs ml-2">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-[#944EF8]/10 rounded-lg">
                  <FiCalendar size={24} className="text-[#944EF8]" />
                </div>
              </div>
            </div>

            {/* Total Employees Card */}
            <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-5 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Employees</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">{dashboardData.totalEmployees}</h3>
                  <div className="flex items-center mt-2">
                    <span className="text-gray-500 text-xs">Active staff members</span>
                  </div>
                </div>
                <div className="p-3 bg-[#944EF8]/10 rounded-lg">
                  <FiUsers size={24} className="text-[#944EF8]" />
                </div>
              </div>
            </div>

            {/* Total Services Card */}
            <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-5 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Services</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">{dashboardData.totalServices}</h3>
                  <div className="flex items-center mt-2">
                    <span className="text-gray-500 text-xs">Total services completed</span>
                  </div>
                </div>
                <div className="p-3 bg-[#944EF8]/10 rounded-lg">
                  <FiTool size={24} className="text-[#944EF8]" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Sales Chart */}
            <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-5 shadow-md hover:shadow-lg transition-all duration-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Sales</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySales} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" />
                      <YAxis 
                        domain={[0, 500000]} // Set minimum to 0 and maximum to 500,000 (5 lakhs)
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} // Format as $Xk for readability
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          border: '1px solid #944EF8',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Sales']}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="sales" stroke="#944EF8" activeDot={{ r: 8 }} />
                    </LineChart>

                </ResponsiveContainer>
              </div>
            </div>

            {/* Service Distribution Chart */}
            <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-5 shadow-md hover:shadow-lg transition-all duration-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {serviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Percentage']}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid #944EF8',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Department Revenue Chart */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-5 shadow-md hover:shadow-lg transition-all duration-300 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Department</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDepartment}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid #944EF8',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#944EF8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Performing Employees */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-5 shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-800">Top Performing Employees</h3>
              <FiBarChart2 size={20} className="text-[#944EF8]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#944EF8]/10 text-gray-700">
                    <th className="py-3 px-4 text-left font-semibold rounded-tl-lg">Employee</th>
                    <th className="py-3 px-4 text-left font-semibold">Role</th>
                    <th className="py-3 px-4 text-left font-semibold">Performance</th>
                    <th className="py-3 px-4 text-left font-semibold rounded-tr-lg">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {topEmployees.map((employee, index) => (
                    <tr key={employee.id} className="border-b border-[#944EF8]/10 hover:bg-[#944EF8]/5 transition-colors">
                      <td className="py-3 px-4 text-gray-800 font-medium">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-[#944EF8]/20 flex items-center justify-center mr-3 text-xs font-bold text-[#944EF8]">
                            {index + 1}
                          </div>
                          {employee.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{employee.role}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-[#944EF8] h-2 rounded-full"
                              style={{ width: `${employee.performance}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-700">{employee.performance}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">${employee.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
