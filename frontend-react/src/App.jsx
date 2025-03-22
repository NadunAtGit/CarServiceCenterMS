import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import Login from './pages/Login';
import AdminHome from './pages/Admin/AdminHome';
import AdminAppointments from './pages/Admin/AdminAppointments';
import AdminCustomers from './pages/Admin/AdminCustomers';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminReports from './pages/Admin/AdminReports';
import AdminEmployees from './pages/Admin/AdminEmployees';
import EmployeeDashBoard from './pages/EmployeeDashboard';

import ServiceAdvisorHome from './pages/ServiceAdvisor/ServiceAdvisorHome';
import ServiceAdvisorAppointments from './pages/ServiceAdvisor/ServiceAdvisorAppointments';
import ServiceAdvisorJobCards from './pages/ServiceAdvisor/ServiceAdvisorJobCards';

import TeamLeaderHome from './pages/TeamLeader/TeamLeaderHome';
import TeamLeaderAssign from './pages/TeamLeader/TeamLeaderAssign';
import TeamLeaderJobCards from './pages/TeamLeader/TeamLeaderJobCards';

import MechanicHome from './pages/Mechanic/MechanicHome';
import MechanicDashboard from './pages/Mechanic/MechanicDashboard';
import {jwtDecode} from 'jwt-decode';

const App = () => {
  return (
    <div>
      <Routes>
          {/* Redirect to login if no valid route */}
          <Route path="*" element={<Navigate to="/login" />} />
          <Route path="employee-dashboard" element={<EmployeeDashBoard />} />

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


          {/* Team Leader routes */}
          <Route 
            path='/teamleader' 
            element={
              <PrivateRoute roles={['Team Leader']}>
                <TeamLeaderHome />
              </PrivateRoute>
            }
          >
                <Route index element={<TeamLeaderJobCards />} />
                <Route path="assign" element={<TeamLeaderAssign />} />
                <Route path="jobcards-leader" element={<TeamLeaderJobCards />} />
          </Route>

          <Route 
            path='/mechanic' 
            element={
              <PrivateRoute roles={['Mechanic']}>
                <MechanicHome />
              </PrivateRoute>
            }
          >
                <Route index element={<MechanicDashboard />} />
                <Route path="dashboard" element={<MechanicDashboard />} />
                
          </Route>

      </Routes>
    </div>
  );
};

// PrivateRoute Component for role-based access control
const PrivateRoute = ({ roles, children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    console.log("🚨 No token found. Redirecting to login.");
    return <Navigate to="/login" />;
  }

  let role;
  try {
    const decodedToken = jwtDecode(token);
    role = decodedToken.role;
    console.log("✅ Decoded Role:", role); 
    console.log("Decoded Token: ", decodedToken);
console.log("Decoded Role: ", decodedToken.role);

    // Debugging
  } catch (e) {
    console.log("🚨 Invalid token. Redirecting to login.");
    return <Navigate to="/login" />;
  }

  console.log(`🔍 Checking if '${role}' exists in`, roles);

  if (!roles.includes(role)) {
    console.log(`🚫 Access Denied: '${role}' does not match any of`, roles);
    return <Navigate to="/login" />;
  }

  console.log(`✅ Access Granted for: '${role}'`);
  return children;
};

export default App;