import React, { useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6';

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [isShowPassword, setShowPassword] = useState(false);

  const togglePassword = () => {
    setShowPassword(!isShowPassword);
  };

  return (
    <div className="flex items-center py-3 px-5 border-b-[1px] border-gray-500 bg-white shadow-sm mb-6 ">
      <input
        type={isShowPassword ? "text" : "password"} // Toggle between "text" and "password"
        placeholder={placeholder || "Password"}
        value={value}
        onChange={onChange}
        className="outline-none w-full text-sm bg-transparent"
      />

      {isShowPassword ? (
        <FaRegEye
          size={22}
          className="text-green-800 cursor-pointer"
          onClick={togglePassword}
        />
      ) : (
        <FaRegEyeSlash
          size={22}
          className="text-red-800 cursor-pointer"
          onClick={togglePassword}
        />
      )}
    </div>
  );
};

export default PasswordInput;