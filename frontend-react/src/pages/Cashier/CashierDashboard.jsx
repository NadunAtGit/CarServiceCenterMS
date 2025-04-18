import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCreditCard, FiShoppingCart, FiPackage } from "react-icons/fi";
import { AiOutlineRise, AiOutlineFall } from "react-icons/ai";

const CashierDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayTransactions: 0,
    itemsSold: 0,
    averageTicket: 0
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    setDashboardData({
      todaySales: 1245.75,
      todayTransactions: 28,
      itemsSold: 56,
      averageTicket: 44.49
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 bg-[#f5f5f5] min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Cashier Dashboard</h1>
      
      {/* Summary Cards - Simplified */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Today's Sales */}
        <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-[#944EF8]/10 rounded-lg mr-4">
              <FiDollarSign size={20} className="text-[#944EF8]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Today's Sales</p>
              <h3 className="text-xl font-bold text-gray-800">${dashboardData.todaySales.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-[#944EF8]/10 rounded-lg mr-4">
              <FiCreditCard size={20} className="text-[#944EF8]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Transactions</p>
              <h3 className="text-xl font-bold text-gray-800">{dashboardData.todayTransactions}</h3>
            </div>
          </div>
        </div>

        {/* Items Sold */}
        <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-[#944EF8]/10 rounded-lg mr-4">
              <FiPackage size={20} className="text-[#944EF8]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Items Sold</p>
              <h3 className="text-xl font-bold text-gray-800">{dashboardData.itemsSold}</h3>
            </div>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-[#944EF8]/10 rounded-lg mr-4">
              <FiShoppingCart size={20} className="text-[#944EF8]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Avg. Ticket</p>
              <h3 className="text-xl font-bold text-gray-800">${dashboardData.averageTicket.toFixed(2)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Simplified */}
      <div className="bg-white rounded-xl border border-[#944EF8]/20 p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span>Oil Change - John D.</span>
            <span className="font-medium">$49.99</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span>Brake Pads - Sarah M.</span>
            <span className="font-medium">$89.50</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span>Air Filter - Mike T.</span>
            <span className="font-medium">$24.99</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span>Battery - Emma R.</span>
            <span className="font-medium">$129.99</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;