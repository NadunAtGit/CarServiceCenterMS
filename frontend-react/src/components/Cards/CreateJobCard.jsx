import React, { useState,useEffect } from "react";
import { FaCalendarAlt, FaClock, FaUser, FaCar } from "react-icons/fa";
import Modal from "react-modal";
import AddJobCard from "../Modals/AddJobCard";

const CreateJobCard = ({ appointment, recallTable, recallCarousel }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

    

  return (
    <div className="p-7 border-3 border-red-400 rounded-2xl shadow-lg space-y-4 w-full mb-10">
      <h1 className="text-xl font-bold">Appointment</h1>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <FaCalendarAlt className="text-blue-500" />
          <span>{appointment.AppointmentMadeDate}</span>
        </div>
        <div className="flex items-center space-x-2">
          <FaClock className="text-green-500" />
          <span>{appointment.Time}</span>
        </div>
        <div className="flex items-center space-x-2">
          <FaUser className="text-purple-500" />
          <span>{appointment.CustomerID}</span>
        </div>
        <div className="flex items-center space-x-2">
          <FaCar className="text-red-500" />
          <span>{appointment.VehicleID}</span>
        </div>
      </div>
      <div className="flex space-x-4">
        <button
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 disabled:opacity-50"
          onClick={openModal}
        >
          Create Job Card
        </button>
      </div>

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
        <AddJobCard
          onClose={closeModal}
          getJobCards={recallTable}
          appointmentId={appointment.AppointmentID}
          recallCarousel={recallCarousel}
        />
      </Modal>
    </div>
  );
};

export default CreateJobCard;