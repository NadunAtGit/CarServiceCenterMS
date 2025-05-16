import React, { useState } from 'react';
import LOGO from '../assets/logo.png';
import LoginBg from '../assets/loginbg.jpg';
import PasswordInput from '../components/INPUTS/PasswordInput';
import { validateEmail } from '../utils/Validations';
import { useNavigate } from "react-router-dom";
import axiosInstance from '../utils/AxiosInstance';
import { jwtDecode } from "jwt-decode";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
      e.preventDefault();

      if (!validateEmail(email)) {
        setError("Please enter a valid email address.");
        return;
      }
    
      // Validate password
      if (!password) {
        setError("Please enter a password.");
        return;
      }
    
      // Clear previous errors
      setError(null);

      try {
          const response = await axiosInstance.post("/api/admin/employee-login", {
            email,
            password
          });

          if (response.data && response.data.accessToken) {
            // Save token to localStorage
            localStorage.setItem("token", response.data.accessToken);
      
            // Decode token to get the role
            const decodedToken = jwtDecode(response.data.accessToken);
            const userRole = decodedToken.role;
      
            // Navigate to the appropriate page based on the role
            if (userRole === 'Admin') {
              navigate("/admin"); 
            } else if (userRole === 'Team Leader') {
              navigate("/teamleader");
            } else if (userRole === 'Service Advisor') {
              navigate("/serviceadvisor");
            } else if (userRole === 'Mechanic') {
              navigate("/mechanic");
            }else if (userRole === 'Cashier') {
              navigate("/cashier");
            }else if (userRole === 'Driver') {
              navigate("/driver");
              
            }
          }
      } catch (error) {
        if (error.response) {
          console.log("Error Response:", error.response);
    
          if (error.response.data && error.response.data.message) {
            setError(error.response.data.message);
          } else {
            setError("An unexpected error occurred. Please try again.");
          }
        } else if (error.request) {
          console.log("No response received:", error.request);
          setError("No response from server. Please check your network connection.");
        } else {
          console.log("Error during request setup:", error.message);
          setError("An unexpected error occurred. Please try again.");
        }
      }
    }

  return (
    <div className='flex items-center justify-center min-h-screen p-5 relative bg-gradient-to-br from-[#F8F9FD] to-[#E2E6F4]'>
      {/* Brand Logo */}
      <div className='absolute top-5 left-5'>
        <img src={LOGO} className='w-36 object-contain' alt="Brand Logo" />
      </div>

      {/* Login Container */}
      <div className='max-w-4xl w-full bg-white/80 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden md:flex border border-[#944EF8]/20'>
        {/* Left Side (Form) */}
        <div className='w-full md:w-1/2 p-10 flex items-center justify-center'>
          <div className='w-full max-w-sm'>
            <h2 className='text-4xl font-semibold mb-4 text-gray-800 flex items-center'>
              <span className='bg-clip-text text-transparent bg-gradient-to-r from-[#944EF8] to-[#7a3fd0]'>Login</span>
            </h2>
            <p className='text-sm text-gray-600 mb-8'>
              Welcome back, enter your credentials to continue
            </p>

            <form className="space-y-8" onSubmit={handleLogin}>
              {/* Email Input */}
              <div className="relative">
                <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-2'>
                  Email
                </label>
                <input
                  type='email'
                  id='email'
                  placeholder='Enter your email'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='w-full px-4 py-3 text-sm border-b-2 border-gray-300 focus:border-[#944EF8] focus:outline-none transition-colors bg-transparent rounded-t-lg'
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <label htmlFor='password' className='block text-sm font-medium text-gray-700 mb-2'>
                  Password
                </label>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Login Button */}
              <button className='w-full bg-gradient-to-r from-[#944EF8] to-[#7a3fd0] text-white py-3 rounded-lg hover:from-[#8144df] hover:to-[#6935b7] transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[0.98] font-medium'>
                Login
              </button>
            </form>
          </div>
        </div>

        {/* Right Side (Image) */}
        <div className='hidden md:block md:w-1/2 relative overflow-hidden'>
          <div className="absolute inset-0 bg-gradient-to-tr from-[#944EF8]/60 to-transparent mix-blend-multiply"></div>
          <img src={LoginBg} className='w-full h-full object-cover' alt='Login Background' />
        </div>
      </div>
    </div>
  );
};

export default Login;