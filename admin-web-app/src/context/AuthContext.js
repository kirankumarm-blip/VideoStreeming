import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react';
import { api, getCurrentUser, isSessionExpired, clearTokens, verifySession } from '../services/api';
import { normalizeRole, hasPermission, ROLES, ROLE_LABELS } from '../constants/roles';

const AuthContext = createContext(null);

const initialState = {
  user: getCurrentUser(),
  isAuthenticated: !isSessionExpired() && !!getCurrentUser(),
  isLoading: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !isSessionExpired() && !!action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Sync authentication state from session storage
  const syncAuth = useCallback(() => {
    if (isSessionExpired()) {
      dispatch({ type: 'LOGOUT' });
    } else {
      const currentUser = getCurrentUser();
      if (currentUser) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: currentUser } });
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    }
  }, []);

  useEffect(() => {
    syncAuth();

    const handleStorageChange = (e) => {
      if (
        e.key === 'admin_session_expires_at' ||
        e.key === 'admin_session_user' ||
        e.key === 'lastUserActivity'
      ) {
        syncAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncAuth]);

  // Re-authorise session from server to detect and correct any client-side localStorage tampering
  useEffect(() => {
    let isMounted = true;
    const reauthoriseSessionFromServer = async () => {
      if (isSessionExpired()) return;
      try {
        const result = await verifySession();
        if (isMounted && result && result.valid && result.user) {
          const localUser = getCurrentUser();
          const serverRole = normalizeRole(result.user);
          const localRole = localUser ? normalizeRole(localUser) : null;
          if (serverRole !== localRole || result.user.id !== localUser?.id) {
            dispatch({ type: 'UPDATE_USER', payload: result.user });
          }
        }
      } catch (e) {}
    };

    reauthoriseSessionFromServer();
    return () => { isMounted = false; };
  }, []);

  const login = useCallback((user) => {
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
  }, []);

  const logout = useCallback(() => {
    try {
      if (api && api.auth && typeof api.auth.logout === 'function') {
        api.auth.logout(1);
      }
    } catch (e) {}
    clearTokens();
    dispatch({ type: 'LOGOUT' });
    if (typeof window !== 'undefined') {
      window.location.hash = '#/login';
    }
  }, []);

  const normalizedRole = useMemo(() => {
    const activeUser = state.user || getCurrentUser();
    return activeUser ? normalizeRole(activeUser) : null;
  }, [state.user]);

  const roleLabel = useMemo(() => {
    return normalizedRole ? (ROLE_LABELS[normalizedRole] || normalizedRole) : '';
  }, [normalizedRole]);

  const canAccess = useCallback(
    (allowedRoles) => {
      const activeUser = state.user || getCurrentUser();
      if (!activeUser || isSessionExpired()) {
        return false;
      }
      return hasPermission(activeUser, allowedRoles);
    },
    [state.user]
  );

  const value = useMemo(
    () => ({
      user: state.user || getCurrentUser(),
      isAuthenticated: (state.isAuthenticated || !!getCurrentUser()) && !isSessionExpired(),
      isLoading: state.isLoading,
      role: normalizedRole,
      roleLabel,
      isSuperAdmin: normalizedRole === ROLES.SUPER_ADMIN,
      isAdmin: normalizedRole === ROLES.ADMIN,
      isAuthorAdmin: normalizedRole === ROLES.AUTHOR_ADMIN,
      canAccess,
      login,
      logout,
      syncAuth,
    }),
    [
      state.user,
      state.isAuthenticated,
      state.isLoading,
      normalizedRole,
      roleLabel,
      canAccess,
      login,
      logout,
      syncAuth,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
