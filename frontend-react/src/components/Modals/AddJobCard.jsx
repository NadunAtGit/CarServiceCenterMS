import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import axiosInstance from "../../utils/AxiosInstance";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CircularProgress } from "@mui/material";

const AddJobCard = ({ onClose, getJobCards, appointmentId }) => {
  const [serviceDetails, setServiceDetails] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!serviceDetails || !type) {
      setError("Please fill all required fields.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post(`/api/teamleader/create-jobcard/${appointmentId}`, {
        ServiceDetails: serviceDetails,
        Type: type,
      });

      if (response.data.success) {
        toast.success("Job Card created successfully!");
        getJobCards(); // Refresh job cards list
        onClose();
      }
    } catch (error) {
      console.error("Error creating job card:", error);
      setError("Failed to create job card. Please try again.");
      toast.error("Error creating job card.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto bg-white rounded-lg p-6 max-w-xl shadow-lg top-40">
      <button
        className="absolute top-2 right-2 rounded-full bg-red-500 p-1 hover:bg-red-600"
        onClick={onClose}
      >
        <MdClose className="text-white" size={25} />
      </button>

      <div className="flex items-center flex-col gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-800">Create Job Card</h1>
      </div>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <div className="flex flex-col gap-4">
        <textarea
          className="text-md text-gray-900 border-2 p-2 rounded-xl border-red-500 w-full"
          placeholder="Service Details"
          value={serviceDetails}
          onChange={(e) => setServiceDetails(e.target.value)}
        />

        <select
          className="text-md text-gray-900 border-2 p-2 rounded-xl border-red-500 w-full"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="" disabled>
            Select Service Type
          </option>
          <option value="Repair">Repair</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Inspection">Inspection</option>
        </select>

        <button
          className="bg-red-500 text-white py-2 px-6 rounded-lg hover:bg-red-300"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Create Job Card"}
        </button>
      </div>
      <ToastContainer />
    </div>
  );
};

export default AddJobCard;
