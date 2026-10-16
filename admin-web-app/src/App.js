import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import LiveWebcasts from './pages/LiveWebcasts';
import { getCurrentUser, api } from './services/api';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeCustomizerProvider } from './context/ThemeCustomizerContext';
import { ThemeCustomizerDrawer, ScreenIdChip } from './components/AppearanceCustomizer';

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

// Route protection for authenticated users
const ProtectedRoute = ({ children }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Route protection based on user roles
const RoleRoute = ({ children, allowedRoles }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const userRole = String(user.role || user.role_id || '').toLowerCase();
  if (userRole === 'user' || userRole === 'student' || userRole === 'end_user') {
    return <Navigate to="/login" replace />;
  }
  const isAllowed = allowedRoles.some(r => {
    if (r === 'admin') {
      return userRole === 'admin' || userRole === '4' || userRole === 'author_admin' || userRole === 'author admin' || user.role === 4 || user.role_id === 4;
    }
    if (r === 'super_admin') {
      return userRole === 'super_admin' || userRole === '1' || user.role === 1 || user.role_id === 1;
    }
    return r === userRole;
  });
  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Sub-component to manage navigation rendering based on route
const AppLayout = ({ theme, setTheme }) => {
  const location = useLocation();
  const user = getCurrentUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Hide global navigation on Login / Signup screens
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  // 10 minutes inactivity auto-logout listener with Cross-Tab Sync
  useEffect(() => {
    if (!user || isAuthPage) return;

    const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
    let timeoutId = null;

    const checkAndPerformAutoLogout = () => {
      const lastActivity = parseInt(localStorage.getItem('lastUserActivity') || '0', 10);
      const timeSinceLastActivity = Date.now() - lastActivity;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
        sessionStorage.setItem('inactivityLoggedOut', 'true');
        api.auth.logout(2);
        window.location.hash = '/login';
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
  }, [user, isAuthPage]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      {!isAuthPage && user && (
        <Navigation 
          toggleSidebar={toggleSidebar} 
          theme={theme} 
          setTheme={setTheme} 
        />
      )}
      <div style={{ flex: 1, display: 'flex', position: 'relative', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        <div style={{ 
          flex: 1, 
          padding: !isAuthPage ? (user && (user.role === 'admin' || user.role === 'super_admin') ? '0' : '40px') : '0',
          position: 'relative',
          minWidth: 0,
          height: '100%',
          overflowY: 'auto'
        }}>
          <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

          {/* Protected routes */}
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

          {/* Admin Specific Paths */}
          <Route path="/admin" element={
            <RoleRoute allowedRoles={['admin', 'author_admin']}>
              <AdminDashboard isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} theme={theme} />
            </RoleRoute>
          } />

          {/* Super Admin Specific Paths */}
          <Route path="/super-admin" element={
            <RoleRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} theme={theme} />
            </RoleRoute>
          } />

          {/* Live Webcast Studio Path */}
          <Route path="/live-webcasts" element={
            <RoleRoute allowedRoles={['admin', 'super_admin', 'author_admin']}>
              <LiveWebcasts theme={theme} />
            </RoleRoute>
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
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  const r = String(user.role || user.role_id || '').toLowerCase();
  if (r === 'super_admin' || r === '1' || user.role === 1 || user.role_id === 1) return <Navigate to="/super-admin" replace />;
  if (r === 'admin' || r === '4' || r === 'author_admin' || r === 'author admin' || user.role === 4 || user.role_id === 4) return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeCustomizerProvider externalTheme={theme} setExternalTheme={setTheme}>
          <Router>
            <AppLayout theme={theme} setTheme={setTheme} />
            <ThemeCustomizerDrawer />
            <ScreenIdChip />
          </Router>
        </ThemeCustomizerProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
