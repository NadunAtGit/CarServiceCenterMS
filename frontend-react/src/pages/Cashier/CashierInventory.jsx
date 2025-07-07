import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/AxiosInstance';
import AddPartModal from '../../components/Modals/AddPartModal';
import AddStockModal from '../../components/Modals/AddStockModal';
import RegisterPartModal from '../../components/Modals/RegisterPartModal';

const CashierInventory = () => {
  const [stocks, setStocks] = useState([]);
  const [parts, setParts] = useState([]);
  const [stockBatches, setStockBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [error, setError] = useState(null);
  const [partsError, setPartsError] = useState(null);
  const [batchesError, setBatchesError] = useState(null);
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showEditPartModal, setShowEditPartModal] = useState(false);
  const [showRegisterPartModal, setShowRegisterPartModal] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);

  // Search state
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockItemsSearchTerm, setStockItemsSearchTerm] = useState('');
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const [stockBatchesSearchTerm, setStockBatchesSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState('stocks'); // 'stocks', 'batches'

  const fetchStocks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosInstance.get('api/cashier/stocks');
      
      if (response.data.stocks) {
        setStocks(response.data.stocks);
      } else {
        setError("Failed to fetch stocks: " + (response.data.message || "Unknown error"));
        console.error("Failed to fetch stocks:", response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch stocks";
      setError(errorMessage);
      console.error("Error fetching stocks:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchParts = async () => {
    try {
      setIsLoadingParts(true);
      setPartsError(null);
      const response = await axiosInstance.get('api/cashier/getparts');
      
      if (response.data.parts) {
        setParts(response.data.parts);
      } else {
        setPartsError("Failed to fetch parts: " + (response.data.message || "Unknown error"));
        console.error("Failed to fetch parts:", response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch parts";
      setPartsError(errorMessage);
      console.error("Error fetching parts:", error);
    } finally {
      setIsLoadingParts(false);
    }
  };

  const fetchStockBatches = async () => {
    try {
      setIsLoadingBatches(true);
      setBatchesError(null);
      const response = await axiosInstance.get('api/cashier/stock-batches');
      
      if (response.data.stockBatches) {
        setStockBatches(response.data.stockBatches);
      } else {
        setBatchesError("Failed to fetch stock batches: " + (response.data.message || "Unknown error"));
        console.error("Failed to fetch stock batches:", response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch stock batches";
      setBatchesError(errorMessage);
      console.error("Error fetching stock batches:", error);
    } finally {
      setIsLoadingBatches(false);
    }
  };
  
  const handleDeletePart = async (partId) => {
    if (!window.confirm(`Are you sure you want to delete part #${partId}?`)) {
      return;
    }
    
    try {
      const response = await axiosInstance.delete(`api/cashier/parts/${partId}`);
      
      if (response.status === 200) {
        // Refresh parts list
        fetchParts();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete part";
      alert(`Error: ${errorMessage}`);
      console.error("Error deleting part:", error);
    }
  };
  
  const openAddPartModal = (stockId) => {
    setSelectedStockId(stockId);
    setShowAddPartModal(true);
  };

  const openAddStockModal = () => {
    setShowAddStockModal(true);
  };
  
  const openRegisterPartModal = () => {
    setShowRegisterPartModal(true);
  };
  
  const openEditPartModal = (part) => {
    setSelectedPart(part);
    setShowEditPartModal(true);
  };

  const handlePartAdded = () => {
    fetchStocks();
    fetchParts();
    fetchStockBatches();
    setShowAddPartModal(false);
  };

  const handleStockAdded = () => {
    fetchStocks();
    fetchStockBatches();
    setShowAddStockModal(false);
  };
  
  const handlePartUpdated = () => {
    fetchParts();
    setShowEditPartModal(false);
  };

  useEffect(() => {
    fetchStocks();
    fetchParts();
    fetchStockBatches();
  }, []);

  // Helper function to safely format currency
  const formatCurrency = (value) => {
    // Convert value to a number if it's not already
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if the value is a valid number
    if (numValue !== null && numValue !== undefined && !isNaN(numValue)) {
      return `$${numValue.toFixed(2)}`;
    }
    return '$0.00';
  };

  // Helper function to safely format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to safely calculate total value
  const calculateTotal = (price, quantity) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    
    if (!isNaN(numPrice) && !isNaN(numQuantity)) {
      return formatCurrency(numPrice * numQuantity);
    }
    return '$0.00';
  };

  // Filter stocks based on search term and date filter
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.StockID.toString().includes(stockSearchTerm) || 
                          stock.SupplierID.toString().includes(stockSearchTerm);
    
    // Apply date filter if set
    if (dateFilter) {
      const stockDate = new Date(stock.Date).toISOString().split('T')[0];
      return matchesSearch && stockDate === dateFilter;
    }
    
    return matchesSearch;
  });

  // Filter stock items based on search term
  const filteredStockItems = stocks.flatMap(stock => 
    stock.stockItems && stock.stockItems.length > 0 ? 
      stock.stockItems
        .filter(item => 
          item.PartID.toString().includes(stockItemsSearchTerm) || 
          stock.StockID.toString().includes(stockItemsSearchTerm)
        )
        .map(item => ({ ...item, stockId: stock.StockID })) : 
      []
  );
  
  // Filter stock batches based on search term
  const filteredStockBatches = stockBatches.filter(batch => 
    batch.BatchID.toString().includes(stockBatchesSearchTerm) || 
    batch.PartID.toString().includes(stockBatchesSearchTerm) ||
    batch.BatchNumber?.toString().includes(stockBatchesSearchTerm) ||
    batch.PartName?.toLowerCase().includes(stockBatchesSearchTerm.toLowerCase()) ||
    batch.SupplierName?.toLowerCase().includes(stockBatchesSearchTerm.toLowerCase())
  );
  
  // Filter parts based on search term
  const filteredParts = parts.filter(part => 
    part.PartID.toString().includes(partsSearchTerm) || 
    (part.Name && part.Name.toLowerCase().includes(partsSearchTerm.toLowerCase()))
  );

  // Get unique dates for date filter
  const uniqueDates = [...new Set(stocks.map(stock => new Date(stock.Date).toISOString().split('T')[0]))].sort();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6 text-black">Inventory Management</h1>
        
        {/* Top row with two columns: Parts List (narrow) and Stock Shipments (wider) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Left Column: Parts List (narrow) */}
          <div className="md:col-span-1">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-[#9A67EA]">Parts</h2>
              <button 
                className="bg-[#7A40C2] hover:bg-[#6b38b3] text-white px-4 py-2 rounded-full transition-colors flex items-center text-sm"
                onClick={openRegisterPartModal}
              >
                <svg className="w-4 h-4 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 4v16m8-8H4"></path>
                </svg>
                Add New Part
              </button>
            </div>
            
            {/* Parts Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
                placeholder="Search parts by ID or name..."
                value={partsSearchTerm}
                onChange={(e) => setPartsSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Error Message */}
            {partsError && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{partsError}</span>
              </div>
            )}
            
            {/* Parts List Container */}
            <div className="rounded-3xl shadow-xl bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] border border-white/40 p-4 h-[400px] overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-grow">
                {isLoadingParts ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#9A67EA]"></div>
                  </div>
                ) : filteredParts.length > 0 ? (
                  <div className="space-y-3">
                    {filteredParts.map(part => (
                      <div 
                        key={part.PartID}
                        className="bg-white/70 p-4 rounded-xl hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-[#7A40C2]">#{part.PartID}: {part.Name || 'Unnamed Part'}</h3>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openEditPartModal(part)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDeletePart(part.PartID)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div className="text-sm">
                            <span className="font-medium text-gray-600">Stock:</span> {part.Stock || 0}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-600">Category:</span> {part.Category || 'N/A'}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-600">Buying:</span> {formatCurrency(part.BuyingPrice)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-600">Selling:</span> {formatCurrency(part.SellingPrice)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-600">No parts found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column: Stock Shipments (wider) */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-4">
                <button 
                  className={`text-2xl font-semibold ${activeTab === 'stocks' ? 'text-[#9A67EA]' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('stocks')}
                >
                  Stock Shipments
                </button>
                <button 
                  className={`text-2xl font-semibold ${activeTab === 'batches' ? 'text-[#9A67EA]' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('batches')}
                >
                  Stock Batches
                </button>
              </div>
              <button 
                className="bg-[#7A40C2] hover:bg-[#6b38b3] text-white px-4 py-2 rounded-full transition-colors flex items-center"
                onClick={openAddStockModal}
              >
                <svg className="w-4 h-4 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 4v16m8-8H4"></path>
                </svg>
                Add New Stock
              </button>
            </div>

            {activeTab === 'stocks' ? (
              <>
                {/* Search and Filter for Stocks */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-grow">
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
                      placeholder="Search by Stock ID or Supplier ID..."
                      value={stockSearchTerm}
                      onChange={(e) => setStockSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    >
                      <option value="">All Dates</option>
                      {uniqueDates.map(date => (
                        <option key={date} value={date}>{date}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#9A67EA]"></div>
                  </div>
                ) : filteredStocks.length > 0 ? (
                  <div className="rounded-3xl shadow-xl p-4 bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] border border-white/40 h-[400px] overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto h-full">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white/50 sticky top-0">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Stock ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Supplier ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Items Count</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Add Part</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white/30 divide-y divide-gray-200">
                          {filteredStocks.map((stock) => (
                            <tr key={stock.StockID} className="hover:bg-white/50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">#{stock.StockID}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{new Date(stock.Date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{stock.SupplierID}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{stock.stockItems ? stock.stockItems.length : 0}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                <button
                                  className="bg-[#7A40C2] hover:bg-[#6b38b3] text-white px-4 py-1 rounded-full text-sm transition-colors"
                                  onClick={() => openAddPartModal(stock.StockID)}
                                >
                                  Add Part
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl shadow-xl p-6 bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] border border-white/40 text-center h-[400px] flex items-center justify-center">
                    <p className="text-gray-600">No stocks found in inventory.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Search for Stock Batches */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-grow">
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
                      placeholder="Search by Batch ID, Part ID, Part Name or Supplier Name..."
                      value={stockBatchesSearchTerm}
                      onChange={(e) => setStockBatchesSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {batchesError && (
                  <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    <span className="block sm:inline">{batchesError}</span>
                  </div>
                )}

                {isLoadingBatches ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#9A67EA]"></div>
                  </div>
                ) : filteredStockBatches.length > 0 ? (
                  <div className="rounded-3xl shadow-xl p-4 bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] border border-white/40 h-[400px] overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto h-full">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white/50 sticky top-0">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Batch ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Part</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Batch #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Initial Qty</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Remaining</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Retail</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Receipt Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Expiry</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white/30 divide-y divide-gray-200">
                          {filteredStockBatches.map((batch) => (
                            <tr key={batch.BatchID} className="hover:bg-white/50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">#{batch.BatchID}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                <div>{batch.PartID}: {batch.PartName || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{batch.PartDescription || ''}</div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">{batch.BatchNumber || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{batch.InitialQuantity}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                <span className={`${batch.RemainingQuantity <= 5 ? 'text-red-600 font-semibold' : ''}`}>
                                  {batch.RemainingQuantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">{formatCurrency(batch.CostPrice)}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{formatCurrency(batch.RetailPrice)}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{formatDate(batch.ReceiptDate)}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                {batch.ExpiryDate ? (
                                  <span className={`${new Date(batch.ExpiryDate) < new Date() ? 'text-red-600 font-semibold' : ''}`}>
                                    {formatDate(batch.ExpiryDate)}
                                  </span>
                                ) : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl shadow-xl p-6 bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] border border-white/40 text-center h-[400px] flex items-center justify-center">
                    <p className="text-gray-600">No stock batches found.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Bottom section for Stock Items */}
        <div className="mt-8">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-[#9A67EA]">Stock Items</h2>
            <div>
              <input
                type="text"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A67EA] bg-white/80"
                placeholder="Search stock items..."
                value={stockItemsSearchTerm}
                onChange={(e) => setStockItemsSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="rounded-3xl shadow-xl p-4 bg-gradient-to-br from-[#e3d2f7] to-[#d9baf4] border border-white/40 h-[400px] overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto h-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white/50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Stock ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Part ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Stock Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Retail Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Total Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white/30 divide-y divide-gray-200">
                  {filteredStockItems.length > 0 ? (
                    filteredStockItems.map((item, index) => (
                      <tr key={`${item.stockId}-${item.PartID}-${index}`} className="hover:bg-white/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">#{item.stockId}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.PartID}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{formatCurrency(item.StockPrice)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{formatCurrency(item.RetailPrice)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.Quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {calculateTotal(item.StockPrice, item.Quantity)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-sm text-center text-gray-600">No stock items found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddPartModal && (
        <AddPartModal
          stockId={selectedStockId}
          onClose={() => setShowAddPartModal(false)}
          onPartAdded={handlePartAdded}
        />
      )}

      {showAddStockModal && (
        <AddStockModal
          onClose={() => setShowAddStockModal(false)}
          onStockAdded={handleStockAdded}
        />
      )}

      {showRegisterPartModal && (
        <RegisterPartModal
          isOpen={showRegisterPartModal}
          onClose={() => setShowRegisterPartModal(false)}
          onPartRegistered={handlePartAdded}
        />
      )}
      
      {/* {showEditPartModal && (
        <EditPartModal
          part={selectedPart}
          onClose={() => setShowEditPartModal(false)}
          onPartUpdated={handlePartUpdated}
        />
      )} */}
    </div>
  );
};

export default CashierInventory;