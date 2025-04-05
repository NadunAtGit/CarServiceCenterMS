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

  // Mock data - would be replaced with actual API calls
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      // In production, replace with actual API endpoints
      
      // Mock dashboard summary data
      setDashboardData({
        totalSales: 147250,
        totalAppointments: 326,
        totalEmployees: 42,
        totalServices: 589,
        salesGrowth: 12.5,
        appointmentGrowth: 8.3
      });

      // Mock top employees data
      setTopEmployees([
        { id: 'EMP001', name: 'John Smith', role: 'Mechanic', performance: 95, revenue: 15200 },
        { id: 'EMP018', name: 'Sarah Johnson', role: 'Advisor', performance: 92, revenue: 14800 },
        { id: 'EMP007', name: 'Robert Lee', role: 'Team Leader', performance: 90, revenue: 13900 },
        { id: 'EMP025', name: 'Emma Wilson', role: 'Mechanic', performance: 88, revenue: 12750 },
        { id: 'EMP014', name: 'Michael Brown', role: 'Advisor', performance: 86, revenue: 12100 }
      ]);

      // Mock monthly sales data
      setMonthlySales([
        { month: 'Jan', sales: 9800 },
        { month: 'Feb', sales: 10200 },
        { month: 'Mar', sales: 11500 },
        { month: 'Apr', sales: 10800 },
        { month: 'May', sales: 12100 },
        { month: 'Jun', sales: 12800 },
        { month: 'Jul', sales: 13400 },
        { month: 'Aug', sales: 12900 },
        { month: 'Sep', sales: 14300 },
        { month: 'Oct', sales: 13800 },
        { month: 'Nov', sales: 14600 },
        { month: 'Dec', sales: 15200 }
      ]);

      // Mock service distribution data
      setServiceDistribution([
        { name: 'Oil Change', value: 35 },
        { name: 'Brake Service', value: 20 },
        { name: 'Tire Replacement', value: 15 },
        { name: 'Engine Repair', value: 12 },
        { name: 'Transmission', value: 8 },
        { name: 'Other', value: 10 }
      ]);

      // Mock revenue by department
      setRevenueByDepartment([
        { department: 'Repairs', revenue: 68000 },
        { department: 'Maintenance', revenue: 45000 },
        { department: 'Parts', revenue: 23000 },
        { department: 'Detailing', revenue: 11250 }
      ]);

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
                  <p className="text-gray-500 text-sm font-medium">Total Sales</p>
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
                  <LineChart data={monthlySales}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid #944EF8',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`$${value}`, 'Sales']}
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