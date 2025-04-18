import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import axiosInstance from "../../utils/AxiosInstance";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CircularProgress } from "@mui/material";
import ServicesDropdown from "../INPUTS/ServicesDropdown";

const AddJobCard = ({ onClose, getJobCards, appointmentId, getAppointments, recallCarousel }) => {
  const [serviceDetails, setServiceDetails] = useState("");
  const [type, setType] = useState("");
  const [serviceRecords, setServiceRecords] = useState([{ Description: "", ServiceType: "", ServiceID: "" }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Validate if appointmentId exists
  if (!appointmentId) {
    return (
      <div className="relative mx-auto bg-white rounded-lg p-6 max-w-xl shadow-lg top-40">
        <button
          className="absolute top-2 right-2 rounded-full bg-d9baf4 p-1 hover:bg-purple-400"
          onClick={onClose}
        >
          <MdClose className="text-white" size={25} />
        </button>
        <div className="flex items-center flex-col gap-4 mb-6">
          <h1 className="text-xl font-bold text-gray-800">Error</h1>
          <p className="text-red-500">No appointment selected. Please select an appointment first.</p>
          <button
            className="bg-d9baf4 text-white py-2 px-6 rounded-lg hover:bg-purple-400 mt-4"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Add a new empty service record
  const addServiceRecord = () => {
    setServiceRecords([...serviceRecords, { Description: "", ServiceType: "", ServiceID: "" }]);
  };

  // Handle changes in service record input fields
  const handleServiceRecordChange = (index, e) => {
    const updatedRecords = [...serviceRecords];
    updatedRecords[index][e.target.name] = e.target.value;
    setServiceRecords(updatedRecords);
  };

  // Remove a service record
  const removeServiceRecord = (index) => {
    if (serviceRecords.length > 1) {
      const updatedRecords = [...serviceRecords];
      updatedRecords.splice(index, 1);
      setServiceRecords(updatedRecords);
    } else {
      toast.info("At least one service record is required");
    }
  };

  const handleSubmit = async () => {
    // Modified validation to include ServiceID
    if (!serviceDetails || !type || serviceRecords.length === 0 || 
        serviceRecords.some(record => !record.Description || !record.ServiceType || !record.ServiceID)) {
      setError("Please fill all required fields, including service records.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      console.log("Submitting job card for appointment:", appointmentId);
      
      // Add null PartID to each service record to handle the foreign key constraint
      const serviceRecordsWithNullPartID = serviceRecords.map(record => ({
        ...record,
        PartID: null
      }));
      
      console.log("Data being sent:", {
        ServiceDetails: serviceDetails,
        Type: type,
        ServiceRecords: serviceRecordsWithNullPartID,
      });

      const response = await axiosInstance.post(`/api/advisor/create-jobcard/${appointmentId}`, {
        ServiceDetails: serviceDetails,
        Type: type,
        ServiceRecords: serviceRecordsWithNullPartID,
      });

      if (response.data.success) {
        toast.success("Job Card created successfully!");
        
        // Call all callback functions to refresh data
        if (typeof getJobCards === 'function') getJobCards();
        if (typeof getAppointments === 'function') getAppointments();
        if (typeof recallCarousel === 'function') recallCarousel();
        
        // Close the modal after a short delay to allow the success toast to be seen
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError("Failed to create job card: " + (response.data.message || "Unknown error"));
        toast.error("Error creating job card: " + (response.data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error creating job card:", error);
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      setError("Failed to create job card: " + errorMessage);
      toast.error("Error creating job card: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto bg-white rounded-lg p-6 max-w-xl shadow-lg">
      <button
        className="absolute top-2 right-2 rounded-full bg-d9baf4 p-1 hover:bg-purple-400"
        onClick={onClose}
      >
        <MdClose className="text-white" size={25} />
      </button>

      <div className="flex items-center flex-col gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-800">Create Job Card</h1>
        <p className="text-gray-600 text-sm">Appointment ID: {appointmentId}</p>
      </div>

      {error && <p className="text-red-500 text-sm mb-4 p-2 bg-red-50 rounded-md border border-red-200">{error}</p>}

      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Service Details</label>
          <textarea
            className="text-md text-gray-900 border-2 p-2 rounded-xl border-d9baf4 w-full min-h-[100px]"
            placeholder="Enter detailed description of the service required"
            value={serviceDetails}
            onChange={(e) => setServiceDetails(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Job Card Type</label>
          <select
            className="text-md text-gray-900 border-2 p-2 rounded-xl border-d9baf4 w-full"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="" disabled>Select Service Type</option>
            <option value="Repair">Repair</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inspection">Inspection</option>
          </select>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">Service Records</label>
            <button
              type="button"
              className="text-blue-500 text-sm font-medium hover:text-blue-700 transition-colors"
              onClick={addServiceRecord}
            >
              + Add Record
            </button>
          </div>
          
          {/* Added max height with overflow for scrolling when many records are added */}
          <div className="max-h-60 overflow-y-auto pr-2">
            {serviceRecords.map((record, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-md bg-gray-50 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-md font-medium">Record #{index + 1}</h3>
                  {serviceRecords.length > 1 && (
                    <button
                      type="button"
                      className="text-red-500 text-sm hover:text-red-700"
                      onClick={() => removeServiceRecord(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                {/* Replace the input and select with ServicesDropdown */}
                <ServicesDropdown 
                  value={record.ServiceID}
                  onChange={handleServiceRecordChange}
                  index={index}
                  required={true}
                />
                
                {/* Display the selected service details (optional) */}
                {record.Description && record.ServiceType && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p><strong>Selected Service:</strong> {record.Description}</p>
                    <p><strong>Service Type:</strong> {record.ServiceType}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          className="bg-purple-400  text-white py-3 px-6 rounded-lg hover:bg-d9baf4 transition-colors mt-4 flex items-center justify-center text-purple-400"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Create Job Card"}
        </button>
      </div>
      
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default AddJobCard;