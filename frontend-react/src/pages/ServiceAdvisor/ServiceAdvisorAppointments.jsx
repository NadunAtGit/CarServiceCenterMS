import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/AxiosInstance';
import { FiCalendar, FiClock, FiUser, FiTruck, FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCw, FiSearch, FiFilter } from 'react-icons/fi';


const ServiceAdvisorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/api/appointments/get-all');
      if (response.data.success) {
        setAppointments(response.data.appointments);
      } else {
        setError('Failed to fetch appointments');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while fetching appointments');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    // Handle different time formats
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // For time format like "14:30:00"
    const timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'not confirmed':
      case 'waitingconfirmation':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return <FiCheckCircle className="mr-1" />;
      case 'cancelled':
        return <FiXCircle className="mr-1" />;
      case 'completed':
        return <FiCheckCircle className="mr-1" />;
      case 'not confirmed':
      case 'waitingconfirmation':
        return <FiAlertCircle className="mr-1" />;
      default:
        return <FiClock className="mr-1" />;
    }
  };

  // Filter appointments based on search term, status, and date
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      (appointment.CustomerID?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appointment.VehicleID?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appointment.AppointmentID?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'All' || 
      appointment.Status?.toLowerCase() === statusFilter.toLowerCase();
    
    const matchesDate = 
      !dateFilter || 
      (appointment.Date && appointment.Date.split('T')[0] === dateFilter);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Get unique statuses for filter dropdown
  const uniqueStatuses = ['All', ...new Set(appointments.map(a => a.Status).filter(Boolean))];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Appointments Management</h1>
        <button 
          onClick={fetchAppointments}
          className="flex items-center px-4 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7a3ee6] transition-colors"
          disabled={loading}
        >
          <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, vehicle, or appointment ID"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8] appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status || 'Unknown'}</option>
              ))}
            </select>
          </div>
          
          {/* Date Filter */}
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#944EF8]"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
          <div className="flex items-center">
            <FiAlertCircle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8]"></div>
          <p className="ml-4 text-gray-600">Loading appointments...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAppointments.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FiCalendar className="mx-auto text-gray-400 text-5xl mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Appointments Found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'All' || dateFilter 
              ? 'Try adjusting your filters to see more results.' 
              : 'There are no appointments in the system yet.'}
          </p>
        </div>
      )}

      {/* Appointments List */}
      {!loading && !error && filteredAppointments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created On
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.AppointmentID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {appointment.AppointmentID}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FiCalendar className="mr-1 text-gray-400" />
                        {formatDate(appointment.Date)}
                      </div>
                      <div className="flex items-center mt-1">
                        <FiClock className="mr-1 text-gray-400" />
                        {formatTime(appointment.Time)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FiUser className="mr-1 text-gray-400" />
                        {appointment.CustomerID}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FiTruck className="mr-1 text-gray-400" />
                        {appointment.VehicleID}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.Status)}`}>
                        {getStatusIcon(appointment.Status)}
                        {appointment.Status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(appointment.AppointmentMadeDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredAppointments.length}</span> of{" "}
              <span className="font-medium">{appointments.length}</span> appointments
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceAdvisorAppointments;
