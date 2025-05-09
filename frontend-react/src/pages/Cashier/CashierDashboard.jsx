import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCreditCard, FiShoppingCart, FiPackage, FiClock, FiCalendar, FiTrendingUp, FiUsers } from "react-icons/fi";
import { AiOutlineRise, AiOutlineFall, AiOutlineCheckCircle, AiOutlineClockCircle } from "react-icons/ai";
import axiosInstance from '../../utils/AxiosInstance';

const CashierDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayTransactions: 0,
    itemsSold: 0,
    averageTicket: 0,
    pendingPayments: 0,
    cashierPerformance: 0,
    targetCompletion: 0
  });
  
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [topSellingItems, setTopSellingItems] = useState([]);
  
  // Current date display
  const currentDate = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = currentDate.toLocaleDateString('en-US', dateOptions);
  const currentTime = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch today's sales data
      const todaySalesResponse = await axiosInstance.get('/api/reports/today-sales');
      
      // Fetch today's transactions count
      const todayTransactionsResponse = await axiosInstance.get('/api/reports/today-transactions');
      
      // Fetch pending payments count
      const pendingInvoicesResponse = await axiosInstance.get('/api/reports/unpaid-invoices');
      
      // Fetch payment methods statistics
      const paymentMethodsResponse = await axiosInstance.get('/api/reports/payment-methods-stats');

      // Fetch recent transactions
const recentTransactionsResponse = await axiosInstance.get('/api/reports/recent-transactions');
      
if (recentTransactionsResponse.data.success && recentTransactionsResponse.data.recentTransactions) {
  setRecentTransactions(recentTransactionsResponse.data.recentTransactions);
} else {
  // Fallback to empty array if API fails
  setRecentTransactions([]);
}

      
      // Update dashboard data with API responses
      const sales = todaySalesResponse.data.todaySales || 0;
      const transactions = todayTransactionsResponse.data.todayTransactions || 0;
      
      setDashboardData({
        todaySales: sales,
        todayTransactions: transactions,
        pendingPayments: pendingInvoicesResponse.data.unpaidCount || 0,
        averageTicket: transactions > 0 ? sales / transactions : 0,
        // Keep these as static for now
        cashierPerformance: 94,
        targetCompletion: 78
      });
      
      // Update payment methods data
      if (paymentMethodsResponse.data.success && paymentMethodsResponse.data.paymentStats) {
        const stats = paymentMethodsResponse.data.paymentStats;
        const total = stats.cash.amount + stats.payhere.amount + stats.other.amount;
        
        setPaymentMethods([
          { 
            method: 'Cash', 
            count: stats.cash.count, 
            amount: stats.cash.amount, 
            percentage: total > 0 ? (stats.cash.amount / total * 100) : 0 
          },
          { 
            method: 'PayHere', 
            count: stats.payhere.count, 
            amount: stats.payhere.amount, 
            percentage: total > 0 ? (stats.payhere.amount / total * 100) : 0 
          },
          { 
            method: 'Other', 
            count: stats.other.count, 
            amount: stats.other.amount, 
            percentage: total > 0 ? (stats.other.amount / total * 100) : 0 
          }
        ]);
      }
      
      
      
      setTopSellingItems([
        { name: 'Oil Change', count: 12, revenue: 599.88 },
        { name: 'Brake Service', count: 8, revenue: 716.00 },
        { name: 'Tire Rotation', count: 7, revenue: 525.00 },
        { name: 'Air Filter', count: 5, revenue: 124.95 }
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

  return (
    <div className="container mx-auto px-4 py-6 bg-[#f5f5f5] min-h-screen">
      {/* Header with date/time */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cashier Dashboard</h1>
        <div className="text-right">
          <p className="text-sm text-gray-500">{formattedDate}</p>
          <p className="text-lg font-medium text-[#944EF8]">{currentTime}</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8]"></div>
          <p className="ml-4 text-gray-600">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards - Enhanced */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Today's Sales */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Today's Sales</p>
                  <h3 className="text-xl font-bold text-gray-800">${dashboardData.todaySales.toFixed(2)}</h3>
                  <div className="flex items-center mt-1">
                    <AiOutlineRise className="text-green-500" />
                    <span className="text-green-500 text-xs ml-1">+12.5% from yesterday</span>
                  </div>
                </div>
                <div className="p-3 bg-[#944EF8]/10 rounded-lg">
                  <FiDollarSign size={24} className="text-[#944EF8]" />
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Transactions</p>
                  <h3 className="text-xl font-bold text-gray-800">{dashboardData.todayTransactions}</h3>
                  <div className="flex items-center mt-1">
                    <AiOutlineRise className="text-green-500" />
                    <span className="text-green-500 text-xs ml-1">+3 from yesterday</span>
                  </div>
                </div>
                <div className="p-3 bg-[#944EF8]/10 rounded-lg">
                  <FiCreditCard size={24} className="text-[#944EF8]" />
                </div>
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Pending Payments</p>
                  <h3 className="text-xl font-bold text-gray-800">{dashboardData.pendingPayments}</h3>
                  <div className="flex items-center mt-1">
                    <AiOutlineClockCircle className="text-amber-500" />
                    <span className="text-amber-500 text-xs ml-1">Needs attention</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <FiClock size={24} className="text-amber-500" />
                </div>
              </div>
            </div>

            {/* Average Ticket */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Avg. Ticket</p>
                  <h3 className="text-xl font-bold text-gray-800">${dashboardData.averageTicket.toFixed(2)}</h3>
                  <div className="flex items-center mt-1">
                    <AiOutlineRise className="text-green-500" />
                    <span className="text-green-500 text-xs ml-1">+$2.14 from yesterday</span>
                  </div>
                </div>
                <div className="p-3 bg-[#944EF8]/10 rounded-lg">
                  <FiShoppingCart size={24} className="text-[#944EF8]" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Performance & Goals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Cashier Performance */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Your Performance</h3>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-800">{dashboardData.cashierPerformance}%</h2>
                <FiTrendingUp size={20} className="text-green-500" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${dashboardData.cashierPerformance}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Based on transaction speed and accuracy</p>
            </div>
            
            {/* Daily Target */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Daily Target</h3>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-800">{dashboardData.targetCompletion}%</h2>
                <FiCalendar size={20} className="text-[#944EF8]" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-[#944EF8] h-2.5 rounded-full" style={{ width: `${dashboardData.targetCompletion}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">$1,245.75 of $1,600 daily goal</p>
            </div>
            
            {/* Payment Methods */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Payment Methods</h3>
              {paymentMethods.map((method, index) => (
                <div key={index} className="mb-2">
                  <div className="flex justify-between text-sm">
                    <span>{method.method}</span>
                    <span className="font-medium">${method.amount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className={`h-1.5 rounded-full ${
                        index === 0 ? 'bg-[#944EF8]' : index === 1 ? 'bg-green-500' : 'bg-blue-500'
                      }`} 
                      style={{ width: `${method.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Recent Transactions & Top Items */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Transactions */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
                <button className="text-sm text-[#944EF8]">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-2">Invoice</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentTransactions.map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm font-medium text-gray-800">{transaction.id}</td>
                        <td className="px-3 py-3 text-sm text-gray-600">{transaction.customer}</td>
                        <td className="px-3 py-3 text-sm font-medium">${(typeof transaction.amount === 'number' ? transaction.amount : parseFloat(transaction.amount) || 0).toFixed(2)}</td>
                        <td className="px-3 py-3 text-sm text-gray-600">{transaction.time}</td>
                        <td className="px-3 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transaction.status === 'Completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Top Selling Items */}
            <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Top Services</h2>
              <div className="space-y-4">
                {topSellingItems.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      index === 0 ? 'bg-[#944EF8] text-white' : 
                      index === 1 ? 'bg-[#944EF8]/80 text-white' : 
                      index === 2 ? 'bg-[#944EF8]/60 text-white' : 
                      'bg-[#944EF8]/40 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-800">{item.name}</span>
                        <span className="text-gray-600">${item.revenue.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500">{item.count} transactions</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-2 bg-[#944EF8]/10 text-[#944EF8] rounded-lg text-sm hover:bg-[#944EF8]/20 transition-colors">
                    New Invoice
                  </button>
                  <button className="p-2 bg-[#944EF8]/10 text-[#944EF8] rounded-lg text-sm hover:bg-[#944EF8]/20 transition-colors">
                    Process Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CashierDashboard;
