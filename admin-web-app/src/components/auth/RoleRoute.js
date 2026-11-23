import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser } from '../../services/api';
import { normalizeRole, hasPermission } from '../../constants/roles';

/**
 * RoleRoute - Client Navigation Guard
 * 
 * Single Responsibility: Controls UI navigation flow to route users to their
 * appropriate screens.
 * 
 * NOTE: Client roles are for NAVIGATION ONLY. They are not a security barrier.
 * Every privileged backend endpoint re-authorizes the incoming request directly from the
 * server session, returning HTTP 403 Forbidden if permissions are insufficient.
 * 
 * If a user lacks permissions -> redirects to /unauthorized (403 Forbidden).
 */
const RoleRoute = ({ children, allowedRoles }) => {
  const { canAccess, user, role } = useAuth();
  const activeUser = user || getCurrentUser();
  const activeRole = role || (activeUser ? normalizeRole(activeUser) : null);

  const isAllowed = canAccess(allowedRoles) || (activeUser && hasPermission(activeUser, allowedRoles));

  if (!isAllowed) {
    return (
      <Navigate 
        to="/unauthorized" 
        state={{ 
          attemptedRoles: allowedRoles, 
          userRole: activeRole || activeUser?.role 
        }} 
        replace 
      />
    );
  }

  return children;
};

export default RoleRoute;
