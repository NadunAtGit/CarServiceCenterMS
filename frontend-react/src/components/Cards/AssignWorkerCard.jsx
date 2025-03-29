import React, { useState } from "react"; // Make sure to import useState
import { FaClipboardList, FaTools, FaCheckCircle, FaUserPlus } from "react-icons/fa";
import Modal from "react-modal";
import AssignWorkersModal from "../Modals/AssignWorkersModal"; // Import the modal

const AssignWorkerCard = ({ job, onAssign }) => {
  const [isModalOpen, setIsModalOpen] = useState(false); // Track modal visibility

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-5 border border-gray-300 w-80 mx-auto">
      {/* Left-aligned details */}
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-left">
        <FaClipboardList className="text-blue-500" /> {job.JobCardID}
      </h2>

      <p className="text-gray-600 flex items-center gap-2 text-left">
        <FaTools className="text-green-500" />
        {job.ServiceDetails}
      </p>

      <p className="text-gray-600 flex items-center gap-2 mt-2 text-left">
        <FaCheckCircle className="text-purple-500" />
        Type: {job.Type}
      </p>

      {/* Assign Worker Button - Centered */}
      <div className="flex justify-center mt-4">
        <button
          onClick={openModal}  // Open modal when clicked
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
        >
          <FaUserPlus /> Assign Worker
        </button>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        style={{
          overlay: {
            backgroundColor: "rgba(0,0,0,0.2)",
            zIndex: 999,
          },
        }}
        className="model-box"
      >
        <AssignWorkersModal 
          jobCardId={job.JobCardID} // Pass job card ID to modal
          onClose={closeModal} 
        />
      </Modal>
    </div>
  );
};

export default AssignWorkerCard;
