import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser, isSessionExpired } from '../../services/api';

/**
 * ProtectedRoute - Authentication Guard
 * 
 * Single Responsibility: Checks ONLY whether the user is authenticated and session is active.
 * If not authenticated or session expired -> redirects to /login.
 * Does NOT invoke logout() to avoid purging newly created sessions or triggering unwanted network requests.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const user = getCurrentUser();
  const hasActiveSession = isAuthenticated || (!isSessionExpired() && !!user);

  if (!hasActiveSession) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
