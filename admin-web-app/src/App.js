import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import LiveWebcasts from './pages/LiveWebcasts';
import Unauthorized from './pages/Unauthorized';
import { getCurrentUser, getAccessToken, getRefreshToken, clearTokens, isValidToken, isSessionExpired, setSessionData, verifySession, api } from './services/api';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeCustomizerProvider, useThemeCustomizer } from './context/ThemeCustomizerContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES } from './constants/roles';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import { ThemeCustomizerDrawer, ScreenIdChip } from './components/AppearanceCustomizer';
import { validateApiConfiguration } from './utils/apiUrl';

// Clean up any legacy insecure storage keys on startup
try {
  localStorage.removeItem('server_url');
  localStorage.removeItem('serverUrl');
  localStorage.removeItem('rememberedPassword');
  sessionStorage.removeItem('rememberedPassword');
} catch (e) {}

// Validate API configuration on application startup
try {
  validateApiConfiguration();
} catch (e) {
  console.error('API configuration validation failed:', e.message);
}

// Check for cross-portal SSO token handoff (e.g. redirected from User Portal)
try {
  const hash = window.location.hash || '';
  const queryPart = hash.includes('?') ? hash.split('?')[1] : (window.location.search ? window.location.search.substring(1) : '');
  const ssoParams = new URLSearchParams(queryPart);
  const ssoToken = ssoParams.get('sso_token');
  const ssoRefreshToken = ssoParams.get('sso_refresh_token') || ssoToken;
  const ssoRole = ssoParams.get('sso_role');
  if (ssoToken && ssoRole && ssoRole !== 'user') {
    const ssoEmail = ssoParams.get('sso_email') || '';
    const ssoName = ssoParams.get('sso_name') || (ssoEmail ? ssoEmail.split('@')[0] : 'Admin');
    const ssoId = ssoParams.get('sso_id') || 'a-' + Date.now();
    const isSuper = ssoRole === 'super_admin' || ssoRole === '1';
    const ssoUser = {
      id: ssoId,
      name: ssoName,
      email: ssoEmail,
      role: ssoRole,
      role_id: isSuper ? 1 : 2,
      originalRole: ssoRole
    };
    setSessionData(ssoUser, Date.now() + 60 * 60 * 1000);
    localStorage.setItem('lastUserActivity', Date.now().toString());
    const targetHash = isSuper ? '#/super-admin' : '#/admin';
    window.history.replaceState(null, '', window.location.pathname + targetHash);
  }
} catch (e) {
  console.error('SSO handoff error', e);
}

// Error boundary to prevent white screens if any subcomponent errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0c',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#e50914' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#a0a0ab', marginBottom: '24px', maxWidth: '500px' }}>
            An unexpected error occurred while loading this view. You can reload or reset your session.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#e50914',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = window.location.origin + window.location.pathname + '#/login';
                window.location.reload();
              }}
              style={{
                background: '#1b1b22',
                color: '#a0a0ab',
                border: '1px solid #333',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Clear Session & Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Sub-component to manage navigation rendering based on route
const AppLayout = ({ theme, setTheme }) => {
  const location = useLocation();
  const { user, isAuthenticated, isSuperAdmin, isAdmin, isAuthorAdmin, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Hide global navigation on Login / Signup screens
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  // 1 hour inactivity auto-logout listener with Cross-Tab Sync
  useEffect(() => {
    if (!isAuthenticated || isAuthPage) return;

    const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour in milliseconds
    let timeoutId = null;

    const checkAndPerformAutoLogout = () => {
      if (isSessionExpired()) {
        sessionStorage.setItem('inactivityLoggedOut', 'true');
        logout();
        return;
      }
      const lastActivity = parseInt(localStorage.getItem('lastUserActivity') || '0', 10);
      const timeSinceLastActivity = Date.now() - lastActivity;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
        sessionStorage.setItem('inactivityLoggedOut', 'true');
        logout();
      } else {
        const remainingTime = INACTIVITY_TIMEOUT_MS - timeSinceLastActivity;
        timeoutId = setTimeout(checkAndPerformAutoLogout, remainingTime);
      }
    };

    const resetTimer = () => {
      const now = Date.now();
      localStorage.setItem('lastUserActivity', now.toString());

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(checkAndPerformAutoLogout, INACTIVITY_TIMEOUT_MS);
    };

    const handleStorageChange = (e) => {
      if (e.key === 'lastUserActivity') {
        if (timeoutId) clearTimeout(timeoutId);
        const lastActivity = parseInt(e.newValue || '0', 10);
        const remainingTime = INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivity);
        if (remainingTime > 0) {
          timeoutId = setTimeout(checkAndPerformAutoLogout, remainingTime);
        } else {
          checkAndPerformAutoLogout();
        }
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    let lastEventTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastEventTime > 1000) {
        lastEventTime = now;
        resetTimer();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    activityEvents.forEach(event => window.addEventListener(event, handleUserActivity));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('storage', handleStorageChange);
      activityEvents.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, [user?.id || user?.email, isAuthPage, isAuthenticated, logout]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      {!isAuthPage && isAuthenticated && (
        <Navigation 
          toggleSidebar={toggleSidebar} 
          theme={theme} 
          setTheme={setTheme} 
        />
      )}
      <div style={{ flex: 1, display: 'flex', position: 'relative', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        <div style={{ 
          flex: 1, 
          padding: !isAuthPage ? ((isAdmin || isSuperAdmin || isAuthorAdmin) ? '0' : '40px') : '0',
          position: 'relative',
          minWidth: 0,
          height: '100%',
          overflowY: 'auto'
        }}>
          <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

          {/* Protected routes - Authenticated users only */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } />

          {/* Admin Specific Paths - Authorization guard */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.AUTHOR_ADMIN]}>
                <AdminDashboard isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} theme={theme} />
              </RoleRoute>
            </ProtectedRoute>
          } />

          {/* Super Admin Specific Paths - Authorization guard */}
          <Route path="/super-admin" element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
                <SuperAdminDashboard isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} theme={theme} />
              </RoleRoute>
            </ProtectedRoute>
          } />

          {/* Live Webcast Studio Path & Live Classes Alias - Authorization guard */}
          <Route path="/live-webcasts" element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.AUTHOR_ADMIN]}>
                <LiveWebcasts theme={theme} />
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/live-classes" element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.AUTHOR_ADMIN]}>
                <LiveWebcasts theme={theme} />
              </RoleRoute>
            </ProtectedRoute>
          } />

          {/* 403 Forbidden / Unauthorized Route */}
          <Route path="/unauthorized" element={
            <ProtectedRoute>
              <Unauthorized />
            </ProtectedRoute>
          } />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  </div>
  );
};

// Helper component to redirect authenticated user to their role-specific dashboard
const DashboardRedirect = () => {
  const { isSuperAdmin, isAdmin, isAuthorAdmin } = useAuth();
  if (isSuperAdmin) {
    return <Navigate to="/super-admin" replace />;
  }
  if (isAdmin || isAuthorAdmin) {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/unauthorized" replace />;
};

const AppContent = () => {
  const { settings, updateSetting } = useThemeCustomizer();
  const theme = settings?.mode || 'dark';
  const setTheme = (nextMode) => updateSetting('mode', nextMode);

  return (
    <Router>
      <AppLayout theme={theme} setTheme={setTheme} />
      <ThemeCustomizerDrawer />
      <ScreenIdChip />
    </Router>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeCustomizerProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeCustomizerProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
