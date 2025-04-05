import React, { useState, useEffect } from 'react';
import axiosInstance from "../../utils/AxiosInstance";
import { FiUser, FiCheck, FiX } from "react-icons/fi";

const AssignWorkersModal = ({ onClose, jobCardId }) => {
  const [mechanics, setMechanics] = useState([]);
  const [selectedMechanics, setSelectedMechanics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch not working mechanics
  useEffect(() => {
    const fetchMechanics = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("api/teamleader/notworking-employees");
        if (!response.data.error) {
          setMechanics(response.data.employees);
        } else {
          console.error(response.data.message);
        }
      } catch (error) {
        console.error("Failed to fetch mechanics:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMechanics();
  }, []);

  // Handle selecting or deselecting mechanics
  const handleSelectionChange = (employeeId) => {
    setSelectedMechanics((prevSelected) => {
      if (prevSelected.includes(employeeId)) {
        return prevSelected.filter((id) => id !== employeeId);
      } else {
        return [...prevSelected, employeeId];
      }
    });
  };

  // Handle assigning mechanics to the job card
  const handleAssign = async () => {
    if (selectedMechanics.length === 0) {
      // Use a toast notification in your production code
      alert("Please select at least one mechanic.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post(`api/teamleader/assign-mechanics/${jobCardId}`, {
        employeeIds: selectedMechanics,
      });

      if (response.data.success) {
        // Use a toast notification in your production code
        alert(response.data.message);
        onClose();
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      alert("Failed to assign mechanics.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-[#944EF8]/10 p-6 shadow-lg w-full max-w-xl transition-all duration-300 transform">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Assign Mechanics to Job Card</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#944EF8]/10 transition-colors"
          >
            <FiX size={20} className="text-gray-600" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#944EF8] mx-auto"></div>
            <p className="ml-3 text-gray-600">Loading mechanics...</p>
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto mb-6 pr-2">
              {mechanics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No available mechanics found
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mechanics.map((mechanic) => (
                    <div 
                      key={mechanic.EmployeeID} 
                      className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
                        selectedMechanics.includes(mechanic.EmployeeID) 
                          ? 'border-[#944EF8] bg-[#944EF8]/10' 
                          : 'border-gray-200 hover:border-[#944EF8]/50'
                      }`}
                      onClick={() => handleSelectionChange(mechanic.EmployeeID)}
                    >
                      <div className="relative mr-3">
                        {mechanic.ProfilePicUrl ? (
                          <img 
                            src={mechanic.ProfilePicUrl} 
                            alt={mechanic.Name} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#944EF8]/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#944EF8]/20 flex items-center justify-center text-[#944EF8]">
                            <FiUser size={20} />
                          </div>
                        )}
                        
                        {selectedMechanics.includes(mechanic.EmployeeID) && (
                          <div className="absolute -top-1 -right-1 bg-[#944EF8] rounded-full w-5 h-5 flex items-center justify-center">
                            <FiCheck size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{mechanic.Name}</p>
                        <p className="text-xs text-gray-500">{mechanic.Email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={isLoading || selectedMechanics.length === 0}
                className={`px-6 py-2 rounded-lg bg-[#944EF8] text-white font-medium 
                  ${(isLoading || selectedMechanics.length === 0) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-[#7a3fd0] transition-colors'}`}
              >
                Assign Selected ({selectedMechanics.length})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AssignWorkersModal;