import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelection from './components/RoleSelection';
import CustomerLoginView from './components/CustomerLoginView';
import WorkerLoginView from './components/WorkerLoginView';
import AdminLoginView from './components/AdminLoginView';
import MainLayout from './components/MainLayout';
import AdminLayout from './components/AdminLayout';

// Customer & Worker Views
import HomeView from './views/HomeView';
import MapView from './views/MapView';
import MyBookingsView from './views/MyBookingsView';
import NotificationsView from './views/NotificationsView';
import ProfileView from './views/ProfileView';
import WorkerProfileView from './views/WorkerProfileView';
import WorkerHome from './views/WorkerHome';
import WorkerBookingsView from './views/WorkerBookingsView';
import WorkerScheduleView from './views/WorkerScheduleView';

// Admin Views
import AdminDashboard from './views/admin/AdminDashboard';
import WorkerVerification from './views/admin/WorkerVerification';
import WorkerVerificationDetail from './views/admin/WorkerVerificationDetail';
import Complaints from './views/admin/Complaints';
import ComplaintDetail from './views/admin/ComplaintDetail';
import Workers from './views/admin/Workers';
import Settings from './views/admin/Settings';

import LandingPage from './components/LandingPage';
import { useLocation } from 'react-router-dom';
import { 
  WorkerRouteGuard, 
  CustomerProtectedGuard, 
  CustomerHomeGuard, 
  CustomerMapGuard 
} from './components/RouteGuards';

function AdminRouteGuard() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const isAuthenticatedAdmin = Boolean(token && userRole === 'admin');

  if (!isAuthenticatedAdmin) {
    return <AdminLoginView />;
  }

  return <AdminLayout />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login/customer" element={<CustomerLoginView />} />
        <Route path="/login/worker" element={<WorkerLoginView />} />
        <Route path="/login/admin" element={<Navigate to="/admin" replace />} />

        {/* Main Application Layout for Customer & Worker */}
        <Route path="/app" element={<MainLayout />}>
          {/* Customer Routes with Role Separation */}
          <Route index element={<CustomerHomeGuard><HomeView /></CustomerHomeGuard>} />
          <Route path="map" element={<CustomerMapGuard><MapView /></CustomerMapGuard>} />
          <Route path="bookings" element={<CustomerProtectedGuard><MyBookingsView /></CustomerProtectedGuard>} />
          <Route path="notifications" element={<NotificationsView />} />
          <Route path="profile" element={<CustomerProtectedGuard><ProfileView /></CustomerProtectedGuard>} />
          <Route path="worker/:id" element={<WorkerProfileView />} />

          {/* Worker Specific Routes with WorkerRouteGuard Protection */}
          <Route path="workerHome" element={<WorkerRouteGuard><WorkerHome /></WorkerRouteGuard>} />
          <Route path="worker/bookings" element={<WorkerRouteGuard><WorkerBookingsView /></WorkerRouteGuard>} />
          <Route path="worker/schedule" element={<WorkerRouteGuard><WorkerScheduleView /></WorkerRouteGuard>} />
          <Route path="workerProfile" element={<WorkerRouteGuard><WorkerProfileView /></WorkerRouteGuard>} />
        </Route>

        {/* Admin Application Layout */}
        <Route path="/admin" element={<AdminRouteGuard />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="verification" element={<WorkerVerification />} />
          <Route path="verification/:workerId" element={<WorkerVerificationDetail />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="complaints/:complaintId" element={<ComplaintDetail />} />
          <Route path="workers" element={<Workers />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

