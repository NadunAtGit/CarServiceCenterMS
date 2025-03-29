import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/AxiosInstance";  // Import axiosInstance for making API requests
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CircularProgress } from "@mui/material";

const AssignWorkersModal = ({ onClose, jobCardId }) => {
  const [mechanics, setMechanics] = useState([]); // Store available mechanics
  const [selectedMechanics, setSelectedMechanics] = useState([]); // Store selected mechanics
  const [loading, setLoading] = useState(false); // Track loading state

  // Fetch not working mechanics (those who are present today and not working)
  useEffect(() => {
    const fetchMechanics = async () => {
      try {
        const response = await axiosInstance.get("api/teamleader/notworking-employees");
        if (response.data.error) {
          toast.error(response.data.message);
        } else {
          setMechanics(response.data.employees);
        }
      } catch (error) {
        toast.error("Failed to fetch mechanics.");
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
      toast.error("Please select at least one mechanic.");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post(`api/teamleader/assign-mechanics/${jobCardId}`, {
        employeeIds: selectedMechanics,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        onClose(); // Close modal after success
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Failed to assign mechanics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto bg-white rounded-lg p-6 max-w-xl shadow-lg top-40 flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4">Assign Mechanics to Job Card</h2>

      {/* List of available mechanics */}
      <div className="max-h-60 overflow-y-auto w-full mb-4">
        {mechanics.length === 0 ? (
          <p>No available mechanics.</p>
        ) : (
          mechanics.map((mechanic) => (
            <div key={mechanic.EmployeeID} className="flex items-center mb-2">
              <input
                type="checkbox"
                id={`mechanic-${mechanic.EmployeeID}`}
                checked={selectedMechanics.includes(mechanic.EmployeeID)}
                onChange={() => handleSelectionChange(mechanic.EmployeeID)}
                className="mr-2"
              />
              <label htmlFor={`mechanic-${mechanic.EmployeeID}`} className="text-sm">
                {mechanic.Name}
              </label>
            </div>
          ))
        )}
      </div>

      {/* Loading spinner */}
      {loading && <CircularProgress />}

      {/* Action buttons */}
      <div className="flex mt-4 gap-4">
        <button
          onClick={onClose}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Close
        </button>
        <button
          onClick={handleAssign}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Assign Mechanics
        </button>
      </div>

      <ToastContainer />
    </div>
  );
};

export default AssignWorkersModal;
