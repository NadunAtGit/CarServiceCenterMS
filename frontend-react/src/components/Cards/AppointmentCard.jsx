import { FaCalendarAlt, FaClock, FaUser, FaCar } from "react-icons/fa";

const AppointmentCard = () => {


  return (
    <div className="p-7 border-3 border-red-400 rounded-2xl shadow-lg space-y-4 w-1/4 mb-10">
      <h1 className="text-xl font-bold">Appointment </h1>

      {/* Appointment Details */}
      <div className="space-y-2">
        {/* Date */}
        <div className="flex items-center space-x-2">
          <FaCalendarAlt className="text-blue-500" />
          <span>2023-04-05</span>
        </div>

        {/* Time */}
        <div className="flex items-center space-x-2">
          <FaClock className="text-green-500" />
          <span>12.00 pm</span>
        </div>

        {/* Customer */}
        <div className="flex items-center space-x-2">
          <FaUser className="text-purple-500" />
          <span>UseTatta</span>
        </div>

        {/* Vehicle */}
        <div className="flex items-center space-x-2">
          <FaCar className="text-red-500" />
          <span>CAA-9090</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex space-x-4">
            <button
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600"
            >
                Confirm
            </button>

            <button
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600"
            >
                Not Confirm
            </button>
</div>

    </div>
  );
};

export default AppointmentCard;
