import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import Login from './pages/Login';
import AdminHome from './pages/Admin/AdminHome';
import AdminAppointments from './pages/Admin/AdminAppointments';
import AdminCustomers from './pages/Admin/AdminCustomers';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminReports from './pages/Admin/AdminReports';
import AdminEmployees from './pages/Admin/AdminEmployees';

import ServiceAdvisorHome from './pages/ServiceAdvisor/ServiceAdvisorHome';
import ServiceAdvisorAppointments from './pages/ServiceAdvisor/ServiceAdvisorAppointments';
import ServiceAdvisorJobCards from './pages/ServiceAdvisor/ServiceAdvisorJobCards';

import {jwtDecode} from 'jwt-decode';

const App = () => {
  return (
    <div >
      <Routes>
          {/* Redirect to login if no valid route */}
          <Route path="*" element={<Navigate to="/login" />} />

          {/* Login route */}
          <Route path='/login' element={<Login />} />

          {/* Admin routes */}
          <Route 
            path='/admin' 
            element={
              <PrivateRoute roles={['Admin']}>
                <AdminHome />
              </PrivateRoute>
            }
          >
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="employees" element={<AdminEmployees />} />
              <Route path="appointments" element={<AdminAppointments />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="reports" element={<AdminReports />} />
          </Route>

          {/* Service Advisor routes */}
          <Route 
            path='/serviceadvisor' 
            element={
              <PrivateRoute roles={['Service Advisor']}>
                <ServiceAdvisorHome />
              </PrivateRoute>
            }
          >
              <Route index element={<ServiceAdvisorJobCards />} />
              <Route path="appointments" element={<ServiceAdvisorAppointments />} />
              <Route path="jobcards" element={<ServiceAdvisorJobCards />} />
          </Route>

      </Routes>
    </div>
  );
};

// PrivateRoute Component for role-based access control
const PrivateRoute = ({ roles, children }) => {
  const token = localStorage.getItem("token");

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // Decode the token to get the role
  let role;
  try {
    const decodedToken = jwtDecode(token);
    role = decodedToken.role; // Extract role from the token
  } catch (e) {
    return <Navigate to="/login" />;
  }

  // If user role is not in the allowed roles, redirect to login
  if (!roles.includes(role)) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default App;
