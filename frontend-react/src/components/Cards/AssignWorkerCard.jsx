import React, { useState } from "react";
import { FaClipboardList, FaTools, FaCheckCircle, FaUserPlus } from "react-icons/fa";
import Modal from "react-modal";
import AssignWorkersModal from "../Modals/AssignWorkersModal";

const AssignWorkerCard = ({ job, onAssignSuccess }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Handle successful assignment
  const handleAssignSuccess = (jobCardId) => {
    if (onAssignSuccess) {
      onAssignSuccess(jobCardId);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white/80 via-white/60 to-white/80 shadow-lg rounded-2xl p-5 border border-[#944EF8]/20 w-full max-w-sm mx-auto backdrop-blur-xl transition-all transform hover:scale-105">
      {/* Job Details */}
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-left text-[#944EF8]">
        <FaClipboardList /> {job.JobCardID}
      </h2>

      {/* Service Details with truncation and expand */}
      <div className="text-gray-700 flex items-start gap-2 text-left relative">
        <FaTools className="text-green-500 mt-1" />
        <div
          className={`cursor-pointer ${isExpanded ? "" : "truncate"} max-w-[200px]`}
          title={!isExpanded ? job.ServiceDetails : ""}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {job.ServiceDetails}
        </div>
      </div>

      <p className="text-gray-700 flex items-center gap-2 mt-2 text-left">
        <FaCheckCircle className="text-purple-500" />
        Type: {job.Type}
      </p>

      {/* Assign Worker Button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={openModal}
          className="bg-gradient-to-r from-[#944EF8]/80 to-[#944EF8]/60 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 backdrop-blur-md transition-all transform hover:scale-95 focus:outline-none hover:from-[#944EF8]/90 hover:to-[#944EF8]/70 border border-[#944EF8]/30 shadow-md"
        >
          <FaUserPlus /> Assign Worker
        </button>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="modal-box"
        style={{
          overlay: { backgroundColor: "rgba(0,0,0,0.2)", zIndex: 999 },
        }}
      >
        <AssignWorkersModal 
          jobCardId={job.JobCardID} 
          onClose={closeModal} 
          onAssignSuccess={handleAssignSuccess}
        />
      </Modal>
    </div>
  );
};

export default AssignWorkerCard;