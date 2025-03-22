import React from "react";
import { FaCalendarAlt, FaClipboard, FaInfoCircle, FaCheckCircle } from "react-icons/fa";

const LeaveCard = ({ leave }) => {
  return (
    <div className="p-6 bg-gradient-to-r from-blue-100 to-blue-200 shadow-lg rounded-2xl border border-blue-300">
      <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2">
        <FaClipboard className="text-blue-600" />
        Leave Details
      </h3>
      <div className="mt-4 space-y-2">
        <p className="flex items-center gap-2 text-gray-700">
          <FaCalendarAlt className="text-blue-500" />
          <span><strong>Date:</strong> {leave.date}</span>
        </p>
        <p className="flex items-center gap-2 text-gray-700">
          <FaInfoCircle className="text-blue-500" />
          <span><strong>Type:</strong> {leave.type}</span>
        </p>
        <p className="flex items-center gap-2 text-gray-700">
          <FaClipboard className="text-blue-500" />
          <span><strong>Reason:</strong> {leave.reason}</span>
        </p>
        <p className="flex items-center gap-2 text-gray-700">
          <FaCheckCircle className={`text-lg ${leave.status === "Approved" ? "text-green-600" : "text-red-600"}`} />
          <span><strong>Status:</strong> {leave.status}</span>
        </p>
      </div>
    </div>
  );
};

export default LeaveCard;