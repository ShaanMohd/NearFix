import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Helper to safely extract authenticated user and validated role from localStorage
 */
export function getAuthenticatedUser() {
  const token = localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') {
    return { isLoggedIn: false, role: null, user: null };
  }
  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  } catch (e) {
    profile = {};
  }
  const role = profile.role || localStorage.getItem('userRole') || 'customer';
  return { isLoggedIn: true, role, user: profile };
}

/**
 * WorkerRouteGuard: Strictly restricts access to authenticated service providers (workers).
 * - Non-authenticated visitors -> redirected to /login/worker
 * - Customers attempting to access -> redirected to /app (Customer Home)
 * - Admins -> redirected to /admin/dashboard
 */
export function WorkerRouteGuard({ children }) {
  const location = useLocation();
  const { isLoggedIn, role } = getAuthenticatedUser();

  if (!isLoggedIn) {
    return (
      <Navigate 
        to={`/login/worker?redirect=${encodeURIComponent(location.pathname + location.search)}`} 
        replace 
      />
    );
  }

  if (role !== 'worker') {
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/app'} replace />;
  }

  return children;
}

/**
 * CustomerProtectedGuard: Restricts access to authenticated customers (e.g. My Bookings, Profile).
 * - Non-authenticated visitors -> redirected to /login/customer
 * - Workers attempting to access -> redirected to /app/workerHome (Worker Dashboard)
 * - Admins -> redirected to /admin/dashboard
 */
export function CustomerProtectedGuard({ children }) {
  const location = useLocation();
  const { isLoggedIn, role } = getAuthenticatedUser();

  if (!isLoggedIn) {
    return (
      <Navigate 
        to={`/login/customer?redirect=${encodeURIComponent(location.pathname + location.search)}`} 
        replace 
      />
    );
  }

  if (role === 'worker') {
    return <Navigate to="/app/workerHome" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}

/**
 * CustomerHomeGuard: Discover & search home page (/app).
 * - Workers -> automatically redirected to their dedicated dashboard (/app/workerHome)
 * - Customers or Guests -> allowed to view discover/search
 */
export function CustomerHomeGuard({ children }) {
  const { isLoggedIn, role } = getAuthenticatedUser();

  if (isLoggedIn && role === 'worker') {
    return <Navigate to="/app/workerHome" replace />;
  }

  return children;
}

/**
 * CustomerMapGuard: (/app/map).
 * - Workers -> automatically redirected to /app/workerHome
 * - Customers or Guests -> allowed to view worker map
 */
export function CustomerMapGuard({ children }) {
  const { isLoggedIn, role } = getAuthenticatedUser();

  if (isLoggedIn && role === 'worker') {
    return <Navigate to="/app/workerHome" replace />;
  }

  return children;
}
