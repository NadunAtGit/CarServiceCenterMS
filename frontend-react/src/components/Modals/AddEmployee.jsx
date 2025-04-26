import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import ImageSelector from "../INPUTS/ImageSelector";
import { uploadImage } from "../../utils/UploadImage";
import axiosInstance from "../../utils/AxiosInstance";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CircularProgress } from "@mui/material";

const AddEmployee = ({ onClose, getEmployees }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [profilePic, setProfilePic] = useState(null); // Store the image file
  const [profilePicUrl, setProfilePicUrl] = useState(""); // Store the uploaded image URL
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !username || !email || !phone || !role || !password) {
      setError("Please fill all required fields");
      return;
    }

    setError("");
    setLoading(true); // Clear previous errors

    try {
      let uploadedImageUrl = profilePicUrl;

      if (profilePic) { // Ensure image exists
        console.log("Uploading image...");
        const uploadedUrl = await uploadImage(profilePic, "employeepics");
        if (uploadedUrl) {
          uploadedImageUrl = uploadedUrl;
          setProfilePicUrl(uploadedUrl);
          console.log("Image uploaded successfully:", uploadedUrl);
        } else {
          console.log("Image upload failed");
          uploadedImageUrl = ""; // Ensure profilePicUrl is empty on failure
        }
      }

      // If no image is uploaded, you can decide whether to set a default or skip it
      if (!uploadedImageUrl) {
        uploadedImageUrl = "path_to_default_image"; // Or leave it empty if you don't want to send it
      }

      console.log("Final profilePicUrl:", uploadedImageUrl);

      const response = await axiosInstance.post("api/admin/create-employee", {
        name,
        username,
        email,
        password,
        phone,
        role,
        profilePicUrl: uploadedImageUrl, // Send uploaded URL or default URL
      });

      if (response.data) {
        toast.success("Employee created successfully");
        getEmployees();
        onClose();
      }
    } catch (error) {
      setError("Error creating employee, please try again.");
      toast.error("Error creating employee, please try again.");
      console.error("Error details:", error.response || error); // Log the full error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto bg-white/90 rounded-lg p-6 max-w-xl shadow-lg backdrop-blur-lg border border-[#944EF8]/20">
      <button
        className="absolute top-2 right-2 rounded-full bg-gradient-to-r from-[#944EF8] to-[#944EF8]/80 p-1 hover:from-[#944EF8]/90 hover:to-[#944EF8] transition-all duration-300 shadow-md"
        onClick={onClose}
      >
        <MdClose className="text-white" size={25} />
      </button>

      <div className="flex items-center flex-col gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-800">Create Employee</h1>
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#944EF8]/30 shadow-md">
          <ImageSelector setImage={setProfilePic} image={profilePic} />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <div className="flex flex-col gap-4">
        <input
          type="text"
          className="text-md text-gray-800 border p-2 rounded-xl border-[#944EF8]/30 bg-white/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50 backdrop-blur-xl transition-all duration-300"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          className="text-md text-gray-800 border p-2 rounded-xl border-[#944EF8]/30 bg-white/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50 backdrop-blur-xl transition-all duration-300"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="email"
          className="text-md text-gray-800 border p-2 rounded-xl border-[#944EF8]/30 bg-white/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50 backdrop-blur-xl transition-all duration-300"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="text-md text-gray-800 border p-2 rounded-xl border-[#944EF8]/30 bg-white/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50 backdrop-blur-xl transition-all duration-300"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="text"
          className="text-md text-gray-800 border p-2 rounded-xl border-[#944EF8]/30 bg-white/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50 backdrop-blur-xl transition-all duration-300"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <select
          className="text-md text-gray-800 border p-2 rounded-xl border-[#944EF8]/30 bg-white/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#944EF8]/50 backdrop-blur-xl transition-all duration-300"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="" disabled className="bg-white text-gray-800">
            Select Role
          </option>
          <option value="Admin" className="bg-white text-gray-800">Admin</option>
          <option value="Mechanic" className="bg-white text-gray-800">Mechanic</option>
          <option value="Team Leader" className="bg-white text-gray-800">Team Leader</option>
          <option value="Service Advisor" className="bg-white text-gray-800">Service Advisor</option>
          <option value="Cashier" className="bg-white text-gray-800">Cashier</option>
          <option value="Driver" className="bg-white text-gray-800">Driver</option>
        </select>

        <button
          className="bg-gradient-to-r from-[#944EF8] to-[#944EF8]/80 text-white py-2 px-6 rounded-lg hover:from-[#944EF8]/90 hover:to-[#944EF8] transition-all duration-300 shadow-md flex justify-center items-center"
          onClick={handleSubmit}
          disabled={loading} // Disable button when loading
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Create Employee"
          )}
        </button>
      </div>
      <ToastContainer />
    </div>
  );
};

export default AddEmployee;