import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react';
import { 
  api, 
  getCurrentUser, 
  setCurrentUser, 
  getAccessToken, 
  getRefreshToken, 
  setTokens, 
  clearTokens, 
  isValidToken, 
  isTokenExpired 
} from '../services/api';

export const AuthContext = createContext(null);

export const normalizeRole = (user) => {
  if (!user) return null;
  const role = String(user.role || user.role_id || '').toLowerCase();
  if (role === '1' || role === 'super_admin' || role === 'superadmin') return 'super_admin';
  if (role === '2' || role === 'author_admin' || role === 'author admin') return 'author_admin';
  if (role === '4' || role === 'admin') return 'admin';
  return 'user';
};

export const normalizePlan = (user) => {
  if (!user) return '1';
  const planVal = user.user_plan ?? user.user_plan_id ?? user.plan_id ?? user.plan ?? '1';
  return String(planVal);
};

const getInitialUser = () => {
  try {
    return getCurrentUser();
  } catch (e) {
    return null;
  }
};

const getInitialTheme = () => {
  try {
    return localStorage.getItem('theme') || 'dark';
  } catch (e) {
    return 'dark';
  }
};

const initialUser = getInitialUser();
const token = getAccessToken() || getRefreshToken();
const isAuth = Boolean(initialUser && isValidToken(token) && !isTokenExpired(token));

const initialState = {
  user: initialUser,
  isAuthenticated: isAuth,
  isLoading: false,
  plan: normalizePlan(initialUser),
  theme: getInitialTheme()
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS': {
      const user = action.payload.user;
      return {
        ...state,
        user,
        isAuthenticated: true,
        isLoading: false,
        plan: normalizePlan(user)
      };
    }
    case 'LOGOUT': {
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        plan: '1'
      };
    }
    case 'UPDATE_USER': {
      const updatedUser = { ...(state.user || {}), ...action.payload };
      return {
        ...state,
        user: updatedUser,
        isAuthenticated: Boolean(updatedUser && (state.isAuthenticated || !!getAccessToken())),
        plan: normalizePlan(updatedUser)
      };
    }
    case 'UPDATE_PLAN': {
      const { planId, planName } = action.payload;
      const updatedUser = state.user ? {
        ...state.user,
        user_plan: planId,
        user_plan_id: planId,
        plan_id: planId,
        ...(planName ? { plan_name: planName } : {})
      } : null;
      return {
        ...state,
        plan: String(planId),
        user: updatedUser
      };
    }
    case 'SET_THEME': {
      return {
        ...state,
        theme: action.payload
      };
    }
    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: Boolean(action.payload)
      };
    }
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Synchronize state from storage / tokens
  const syncAuth = useCallback(() => {
    const activeToken = getAccessToken() || getRefreshToken();
    const currentUser = getCurrentUser();
    const isValid = Boolean(currentUser && isValidToken(activeToken) && !isTokenExpired(activeToken));

    if (!isValid) {
      dispatch({ type: 'LOGOUT' });
    } else {
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: currentUser } });
    }

    try {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      dispatch({ type: 'SET_THEME', payload: savedTheme });
    } catch (e) {}
  }, []);

  // Cross-tab storage synchronization
  useEffect(() => {
    syncAuth();

    const handleStorageChange = (e) => {
      if (
        e.key === 'learner_user' ||
        e.key === 'user' ||
        e.key === 'accessToken' ||
        e.key === 'learner_accessToken' ||
        e.key === 'refreshToken' ||
        e.key === 'learner_refreshToken' ||
        e.key === 'lastUserActivity' ||
        e.key === 'theme' ||
        e.key === 'user_plan'
      ) {
        syncAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncAuth]);

  // Server-side session verification on mount
  useEffect(() => {
    let isMounted = true;
    const verifySessionWithServer = async () => {
      const token = getAccessToken() || getRefreshToken();
      if (!token || !isValidToken(token) || isTokenExpired(token)) {
        return;
      }
      try {
        const response = await api.auth.me();
        const raw = Array.isArray(response) ? (response[0] || {}) : (response || {});
        const resData = (raw && typeof raw === 'object' && 'json' in raw) ? raw.json : raw;
        const verifiedUser = resData?.user || resData?.data || resData;
        if (isMounted && verifiedUser && (verifiedUser.id || verifiedUser.email || verifiedUser.name)) {
          setCurrentUser(verifiedUser);
          dispatch({ type: 'UPDATE_USER', payload: verifiedUser });
        }
      } catch (err) {
        if (isMounted && err && (err.status === 401 || err.statusCode === 401)) {
          clearTokens();
          dispatch({ type: 'LOGOUT' });
        }
      }
    };

    verifySessionWithServer();
    return () => {
      isMounted = false;
    };
  }, []);

  // Actions
  const login = useCallback((userData, tokens = {}) => {
    if (tokens.accessToken || tokens.refreshToken) {
      setTokens(tokens.accessToken, tokens.refreshToken);
    }
    if (tokens.token) {
      try {
        localStorage.setItem('token', tokens.token);
      } catch (e) {}
    }
    if (userData) {
      setCurrentUser(userData);
      try {
        localStorage.setItem('lastUserActivity', Date.now().toString());
      } catch (e) {}
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: userData } });
    }
  }, []);

  const logout = useCallback((logoutType = 1) => {
    try {
      if (api && api.auth && typeof api.auth.logout === 'function') {
        Promise.resolve(api.auth.logout(logoutType)).catch((err) => {
          console.warn('Logout API background error:', err);
        });
      }
    } catch (e) {
      console.warn('Logout API error:', e);
    }
    clearTokens();
    dispatch({ type: 'LOGOUT' });
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + '#/login');
      window.location.hash = '/login';
    }
  }, []);

  const updateUser = useCallback((partialUser) => {
    const existing = state.user || getCurrentUser() || {};
    const updated = { ...existing, ...partialUser };
    setCurrentUser(updated);
    dispatch({ type: 'UPDATE_USER', payload: updated });
    return updated;
  }, [state.user]);

  const updatePlan = useCallback((planOrId) => {
    let planId = '1';
    let planName = 'free';

    if (typeof planOrId === 'object' && planOrId !== null) {
      planId = String(planOrId.plan_id || planOrId.id || planOrId.user_plan || '1');
      planName = String(planOrId.plan_name || planOrId.name || '').toLowerCase();
    } else if (typeof planOrId === 'string' || typeof planOrId === 'number') {
      planId = String(planOrId);
      if (planId === '2') planName = 'intermediate';
      else if (planId === '3') planName = 'premium';
      else if (planId === '1') planName = 'free';
    }

    const existing = state.user || getCurrentUser() || {};
    const updated = {
      ...existing,
      user_plan: planId,
      user_plan_id: planId,
      plan_id: planId,
      ...(planName ? { plan_name: planName } : {})
    };

    setCurrentUser(updated);
    try {
      localStorage.setItem('user_plan', planId);
      if (planName) localStorage.setItem('plan_name', planName);
    } catch (e) {}

    dispatch({ type: 'UPDATE_PLAN', payload: { planId, planName } });
    return updated;
  }, [state.user]);

  const setTheme = useCallback((mode) => {
    try {
      localStorage.setItem('theme', mode);
    } catch (e) {}
    dispatch({ type: 'SET_THEME', payload: mode });
  }, []);

  const role = useMemo(() => normalizeRole(state.user), [state.user]);
  const isLearner = useMemo(() => role === 'user', [role]);

  const value = useMemo(() => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    role,
    isLearner,
    plan: state.plan,
    theme: state.theme,
    login,
    logout,
    updateUser,
    updatePlan,
    setTheme,
    syncAuth,
  }), [
    state.user,
    state.isAuthenticated,
    state.isLoading,
    role,
    isLearner,
    state.plan,
    state.theme,
    login,
    logout,
    updateUser,
    updatePlan,
    setTheme,
    syncAuth
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
