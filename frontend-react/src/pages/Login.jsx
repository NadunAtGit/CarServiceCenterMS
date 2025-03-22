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

    const handleLogin=async(e)=>{
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

      try{
          const response=await axiosInstance.post("/api/admin/employee-login",{
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
              navigate("/admin"); // Admin or Manager should be redirected to Home
            } else if (userRole === 'Team Leader') {
              navigate("/teamleader"); // Team Leader should be redirected to Home
              // Other users should be redirected to Employee Dashboard
            }else if(userRole === 'Service Advisor'){
              navigate("/serviceadvisor");
          }
        }
      }catch(error){
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
    <div className='flex items-center justify-center min-h-screen p-5 relative'>
      {/* Brand Logo */}
      <div className='absolute top-3 left-5'>
        <img src={LOGO} className='w-32 object-contain' alt="Brand Logo" />
      </div>

      {/* Login Container */}
      <div className='max-w-3xl w-full bg-white shadow-lg rounded-lg overflow-hidden md:flex border border-gray-300'>
        {/* Left Side (Form) */}
        <div className='w-full md:w-1/2 p-10 flex items-center justify-center'>
          <div className='w-full max-w-sm'>
            <h2 className='text-4xl font-semibold mb-4'>Login</h2>
            <p className='text-sm text-gray-500 mb-6'>
              Welcome back, enter your credentials
            </p>

            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Email Input */}
              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-600 mb-2'>
                  Email
                </label>
                <input
                  type='email'
                  id='email'
                  placeholder='Enter your email'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='w-full px-4 py-2 text-sm border-b border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:rounded-lg'
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor='password' className='block text-sm font-medium text-gray-600 mb-2'>
                  Password
                </label>
                <PasswordInput  value={password} onChange={(e) => setPassword(e.target.value)}/>
              </div>

              {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

              {/* Login Button */}
              <button className='w-full bg-red-500 text-white py-2 rounded-md hover:bg-blue-700 transition'>
                Login
              </button>
            </form>
          </div>
        </div>

        {/* Right Side (Image) */}
        <div className='hidden md:flex md:w-1/2'>
          <img src={LoginBg} className='w-full h-full object-cover' alt='Login Background' />
        </div>
      </div>
    </div>
  );
};

export default Login;
