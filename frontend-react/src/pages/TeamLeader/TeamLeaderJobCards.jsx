import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/AxiosInstance';
import { FiGrid, FiList, FiFilter, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import JobCardTypeCard from '../../components/Cards/JobCardTypeCard';

const TeamLeaderJobCards = () => {
  // State for job cards data
  const [jobCards, setJobCards] = useState({
    created: [],
    assigned: [],
    ongoing: [],
    finished: [],
    invoiceGenerated: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  // Fetch job cards on component mount
  useEffect(() => {
    fetchAllJobCards();
  }, []);

  // Function to fetch all types of job cards
  const fetchAllJobCards = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all types of job cards in parallel
      const [created, assigned, ongoing, finished, invoiceGenerated] = await Promise.all([
        axiosInstance.get('/api/teamleader/get-jobcards-created'),
        axiosInstance.get('/api/teamleader/get-jobcards-assigned'),
        axiosInstance.get('/api/teamleader/get-jobcards-ongoing'),
        axiosInstance.get('/api/teamleader/get-jobcards-finished'),
        axiosInstance.get('/api/teamleader/get-jobcards-invoicegenerated')
      ]);

      // Update state with fetched data
      setJobCards({
        created: created.data.success ? created.data.jobCards : [],
        assigned: assigned.data.success ? assigned.data.jobCards : [],
        ongoing: ongoing.data.success ? ongoing.data.jobCards : [],
        finished: finished.data.success ? finished.data.jobCards : [],
        invoiceGenerated: invoiceGenerated.data.success ? invoiceGenerated.data.jobCards : []
      });
    } catch (err) {
      console.error('Error fetching job cards:', err);
      setError('Failed to fetch job cards. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Get job cards based on active tab
  const getFilteredJobCards = () => {
    switch (activeTab) {
      case 'created':
        return jobCards.created;
      case 'assigned':
        return jobCards.assigned;
      case 'ongoing':
        return jobCards.ongoing;
      case 'finished':
        return jobCards.finished;
      case 'invoiceGenerated':
        return jobCards.invoiceGenerated;
      case 'all':
      default:
        return [
          ...jobCards.created,
          ...jobCards.assigned,
          ...jobCards.ongoing,
          ...jobCards.finished,
          ...jobCards.invoiceGenerated
        ];
    }
  };

  // Count job cards by status
  const counts = {
    created: jobCards.created.length,
    assigned: jobCards.assigned.length,
    ongoing: jobCards.ongoing.length,
    finished: jobCards.finished.length,
    invoiceGenerated: jobCards.invoiceGenerated.length,
    all: jobCards.created.length + jobCards.assigned.length + 
         jobCards.ongoing.length + jobCards.finished.length + 
         jobCards.invoiceGenerated.length
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Job Cards Management</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#944EF8] text-white' : 'bg-white text-gray-600'}`}
          >
            <FiGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#944EF8] text-white' : 'bg-white text-gray-600'}`}
          >
            <FiList size={18} />
          </button>
          <button
            onClick={fetchAllJobCards}
            className="flex items-center px-4 py-2 bg-[#944EF8] text-white rounded-lg hover:bg-[#7a3ee6] transition-colors ml-2"
            disabled={loading}
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {/* Tab buttons for each status */}
          {/* (Similar to your original code) */}
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
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#944EF8]"></div>
          <p className="ml-4 text-gray-600">Loading job cards...</p>
        </div>
      )}

      {/* Job Cards Grid/List View */}
      {!loading && !error && getFilteredJobCards().length > 0 && (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-6"
        }>
          {getFilteredJobCards().map(jobCard => (
            <div key={jobCard.JobCardID} className={viewMode === 'list' ? "w-full" : ""}>
              <JobCardTypeCard jobCard={jobCard} />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && getFilteredJobCards().length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FiAlertCircle className="mx-auto text-gray-400 text-5xl mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Job Cards Found</h3>
          <p className="text-gray-500">
            {activeTab !== 'all' 
              ? `There are no job cards with '${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}' status.` 
              : 'There are no job cards in the system yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamLeaderJobCards;
