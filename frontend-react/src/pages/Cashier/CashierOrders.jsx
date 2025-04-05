import React, { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import axiosInstance from '../../utils/AxiosInstance';
import OrderDetailsCard from '../../components/Cards/orderdetails/OrderDetailsCard'; // Assuming this component exists

const CashierOrders = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await axiosInstance.get('api/cashier/getorders');
      if (response.data.orders) {
        setOrders(response.data.orders);
      } else {
        console.error('Failed to fetch orders:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchOrders = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search term');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.get(
        `api/orders/search-order?query=${searchQuery}`
      );
      if (response.data.success) {
        setOrders(response.data.results);
      } else {
        console.error('Search failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error searching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 bg-[#D8D8D8] min-h-screen">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Orders</h1>

        {/* Search Section */}
        <div className="w-full grid md:grid-cols-3 gap-3 mb-6">
          <div className="col-span-full md:col-span-2 flex space-x-2">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search by order ID, customer ID, or date"
                className="w-full bg-white/70 text-gray-800 outline-none border border-[#944EF8]/20 py-2 px-4 rounded-lg backdrop-blur-xl focus:ring-2 focus:ring-[#944EF8]/30 transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#944EF8]/80 to-[#944EF8]/60 text-white border border-[#944EF8]/30 backdrop-blur-xl hover:from-[#944EF8]/90 hover:to-[#944EF8]/70 transition-all duration-300 shadow-md"
              onClick={searchOrders}
            >
              <FiSearch size={22} />
              Search
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-gray-600 text-center">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-xl font-bold mb-3 text-center text-gray-600">
            No orders available.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-lg">
            <table className="w-full bg-white/70 rounded-lg backdrop-blur-xl border border-[#944EF8]/10 shadow-md">
              <thead>
                <tr className="bg-[#944EF8]/10 text-gray-800">
                  <th className="py-3 px-4 text-left hidden md:table-cell">Order ID</th>
                  <th className="py-3 px-4 text-left">Requested By</th>
                  <th className="py-3 px-4 text-left">Requested At</th>
                  <th className="py-3 px-4 text-left">Order Status</th>
                  <th className="py-3 px-4 text-left">Operations</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.OrderID}
                    className="border-b border-[#944EF8]/10 hover:bg-[#944EF8]/5 transition-colors"
                  >
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{order.OrderID}</td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{order.RequestedBy}</td>
                    <td className="py-3 px-4 text-gray-700">{new Date(order.RequestedAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-700">{order.OrderStatus}</td>
                    <td className="py-3 px-4">
                      <button
                        className="text-red-500 hover:text-red-600 transition-colors"
                        onClick={() => deleteOrder(order.OrderID)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierOrders;
