import React from 'react'
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
const App = () => {
  return (
    <div >
      <Routes>
          <Route path='/login' element={<Login/>}/>

          <Route path='/admin' element={<AdminHome/>}>
              <Route index element={<AdminDashboard />} /> {/* Default route for Home */}
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="employees" element={<AdminEmployees />} />
              <Route path="appointments" element={<AdminAppointments/>} />
              <Route path="customers" element={<AdminCustomers/>} />
              <Route path="Reports" element={<AdminReports/>} />
          </Route>

          <Route path='/serviceadvisor' element={<ServiceAdvisorHome/>}>
              <Route index element={<ServiceAdvisorJobCards />}/>
              <Route path="appointments" element={<ServiceAdvisorAppointments />} />
              <Route path="jobcards" element={<ServiceAdvisorJobCards />} />
          </Route>

          

      </Routes>
      
    </div>

  )
}

export default App