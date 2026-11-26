import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserDashboard from './pages/UserDashboard';
import VideoWatch from './pages/VideoWatch';
import Profile from './pages/Profile';
import UserQuizzes from './pages/UserQuizzes';
import Certificates from './pages/Certificates';
import Plans from './pages/Plans';
import StudyRooms from './pages/StudyRooms';
import LiveClasses from './pages/LiveClasses';
import LiveClassroom from './pages/LiveClassroom';
import FAQ from './pages/FAQ';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import logoImg from './assets/logo.png';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeCustomizerProvider, useThemeCustomizer } from './context/ThemeCustomizerContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeCustomizerDrawer, ScreenIdChip } from './components/AppearanceCustomizer';
import { validateApiConfiguration } from './utils/apiUrl';

// Clean up any legacy password storage, insecure server overrides, or invalid tokens on application startup
try {
  localStorage.removeItem('server_url');
  localStorage.removeItem('serverUrl');
  const curAccess = localStorage.getItem('accessToken');
  if (curAccess && (!curAccess.trim() || curAccess === 'undefined' || curAccess === 'null')) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('learner_accessToken');
  }
  const curRefresh = localStorage.getItem('refreshToken');
  if (curRefresh && (!curRefresh.trim() || curRefresh === 'undefined' || curRefresh === 'null')) {
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('learner_refreshToken');
  }
  localStorage.removeItem('rememberedPassword');
  sessionStorage.removeItem('rememberedPassword');
} catch (e) {}

// Validate API configuration on application startup
try {
  validateApiConfiguration();
} catch (e) {
  console.error('API configuration validation failed:', e.message);
}

// Check for cross-portal SSO token handoff (e.g. redirected from Admin Portal)
try {
  const hash = window.location.hash || '';
  const queryPart = hash.includes('?') ? hash.split('?')[1] : (window.location.search ? window.location.search.substring(1) : '');
  const ssoParams = new URLSearchParams(queryPart);
  const ssoToken = ssoParams.get('sso_token');
  const ssoRefreshToken = ssoParams.get('sso_refresh_token') || ssoToken;
  if (ssoToken) {
    const ssoEmail = ssoParams.get('sso_email') || '';
    const ssoName = ssoParams.get('sso_name') || (ssoEmail ? ssoEmail.split('@')[0] : 'Learner');
    const ssoId = ssoParams.get('sso_id') || 'u-' + Date.now();
    const ssoUser = {
      id: ssoId,
      name: ssoName,
      email: ssoEmail,
      role: 'user',
      role_id: 3,
      originalRole: 'USER'
    };
    localStorage.setItem('accessToken', ssoToken);
    localStorage.setItem('refreshToken', ssoRefreshToken);
    localStorage.setItem('learner_accessToken', ssoToken);
    localStorage.setItem('learner_refreshToken', ssoRefreshToken);
    localStorage.setItem('user', JSON.stringify(ssoUser));
    localStorage.setItem('learner_user', JSON.stringify(ssoUser));
    localStorage.setItem('lastUserActivity', Date.now().toString());
    window.history.replaceState(null, '', window.location.pathname + '#/');
  }
} catch (e) {
  console.error('SSO handoff error', e);
}

// Route protection for authenticated users: validates token existence and expiration via AuthContext
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Route protection based on user roles
const RoleRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, role, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  const currentRole = String(role || user.role || '').toLowerCase();
  const normalizedAllowed = (allowedRoles || []).map(r => String(r).toLowerCase());
  const isMatch = normalizedAllowed.includes(currentRole) || 
    (normalizedAllowed.includes('user') && (currentRole === 'user' || currentRole === 'student' || currentRole === 'end_user' || currentRole === 'learner' || currentRole === '3'));
  if (!isMatch) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Sub-component to manage navigation rendering based on route
const AppLayout = ({ theme, setTheme }) => {
  const location = useLocation();
  const { user, isAuthenticated, isLearner, logout, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Hide global navigation on Login / Signup / Reset Password screens
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);
  const isLegalOrPublicPage = ['/faq', '/privacy', '/terms'].includes(location.pathname);

  // Inactivity auto-logout listener and navigation security
  useEffect(() => {
    const handleNavigationSecurity = () => {
      const currentHash = window.location.hash || '';
      const isPublic = currentHash.includes('/login') || currentHash.includes('/signup') || currentHash.includes('/forgot-password') || currentHash.includes('/reset-password') || currentHash.includes('/faq') || currentHash.includes('/privacy') || currentHash.includes('/terms');
      if (!isPublic && (!isAuthenticated || !user)) {
        logout();
      }
    };
    window.addEventListener('popstate', handleNavigationSecurity);
    window.addEventListener('hashchange', handleNavigationSecurity);
    return () => {
      window.removeEventListener('popstate', handleNavigationSecurity);
      window.removeEventListener('hashchange', handleNavigationSecurity);
    };
  }, [isAuthenticated, user, logout]);

  useEffect(() => {
    if (!user || isAuthPage) return;

    const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour in milliseconds
    let timeoutId = null;

    const checkAndPerformAutoLogout = async () => {
      const lastActivity = parseInt(localStorage.getItem('lastUserActivity') || '0', 10);
      if (!lastActivity) {
        localStorage.setItem('lastUserActivity', Date.now().toString());
        timeoutId = setTimeout(checkAndPerformAutoLogout, INACTIVITY_TIMEOUT_MS);
        return;
      }
      const timeSinceLastActivity = Date.now() - lastActivity;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
        sessionStorage.setItem('inactivityLoggedOut', 'true');
        await logout(2);
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

    const initialLastActivity = parseInt(localStorage.getItem('lastUserActivity') || '0', 10);
    const isRecentlyActive = initialLastActivity && (Date.now() - initialLastActivity < 30000);
    if (initialLastActivity && !isRecentlyActive && (Date.now() - initialLastActivity >= INACTIVITY_TIMEOUT_MS)) {
      checkAndPerformAutoLogout();
    } else {
      resetTimer();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('storage', handleStorageChange);
      activityEvents.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, [user?.id || user?.email, isAuthPage, logout]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const userRole = String(user?.role || '').toLowerCase();
  const isLearnerRole = isLearner || (userRole === 'user' || userRole === 'student' || userRole === 'end_user' || userRole === 'learner' || userRole === '3');
  const showSidebar = !isAuthPage && user && isLearnerRole;
  const isFullWidthPage = isAuthPage || isLegalOrPublicPage || (user && isLearnerRole);

  if (isLoading) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: theme === 'dark' ? '#0f172a' : '#f8fafc',
          color: theme === 'dark' ? '#f8fafc' : '#0f172a',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}
      >
        <div style={{
          width: '44px',
          height: '44px',
          border: `3px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          borderTop: '3px solid #6366f1',
          borderRadius: '50%',
          animation: 'spinSessionLoader 0.9s linear infinite',
          marginBottom: '16px'
        }} />
        <style>{`
          @keyframes spinSessionLoader {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '0.01em', opacity: 0.85 }}>
          Verifying session...
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      {!isAuthPage && user && (
        <Navigation 
          toggleSidebar={toggleSidebar} 
          theme={theme} 
          setTheme={setTheme} 
        />
      )}
      {!user && isLegalOrPublicPage && (
        <header style={{
          height: '60px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxSizing: 'border-box',
          zIndex: 100
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src={logoImg} alt="XLURN" width={112} height={32} decoding="async" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>XLURN</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/login" style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'var(--accent-primary, #2563eb)',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600
            }}>
              Sign In
            </Link>
          </div>
        </header>
      )}
      <div style={{ flex: 1, display: 'flex', position: 'relative', height: (user || isLegalOrPublicPage) && !isAuthPage ? 'calc(100vh - 60px)' : '100vh', overflow: 'hidden' }}>
        {showSidebar && (
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
        )}
        <div style={{ 
          flex: 1, 
          padding: isFullWidthPage ? '0' : '40px',
          position: 'relative',
          minWidth: 0,
          height: '100%',
          overflowY: 'auto'
        }}>
          <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" replace /> : <Login initialAuthMode="forgot" />} />
          <Route path="/reset-password" element={isAuthenticated ? <Navigate to="/" replace /> : <Login initialAuthMode="reset" />} />
          <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <Signup />} />

          {/* Public Legal & Info routes */}
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />

          {/* Protected routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/plans" element={
            <ProtectedRoute>
              <Plans />
            </ProtectedRoute>
          } />

          {/* User Specific Paths */}
          <Route path="/quizzes" element={
            <RoleRoute allowedRoles={['user']}>
              <UserQuizzes />
            </RoleRoute>
          } />

          <Route path="/certificates" element={
            <RoleRoute allowedRoles={['user']}>
              <Certificates />
            </RoleRoute>
          } />

          <Route path="/study-rooms" element={
            <RoleRoute allowedRoles={['user']}>
              <StudyRooms />
            </RoleRoute>
          } />

          <Route path="/live-classes" element={
            <RoleRoute allowedRoles={['user']}>
              <LiveClasses />
            </RoleRoute>
          } />

          {/* Alias route for live-webcasts */}
          <Route path="/live-webcasts" element={
            <RoleRoute allowedRoles={['user']}>
              <LiveClasses />
            </RoleRoute>
          } />

          <Route path="/live-demo" element={
            <RoleRoute allowedRoles={['user']}>
              <LiveClasses initialDemoMode={true} />
            </RoleRoute>
          } />

          <Route path="/live/:id" element={
            <RoleRoute allowedRoles={['user']}>
              <LiveClassroom />
            </RoleRoute>
          } />

          <Route path="/watch/:id" element={
            <RoleRoute allowedRoles={['user']}>
              <VideoWatch />
            </RoleRoute>
          } />

          <Route path="/course/:id" element={
            <RoleRoute allowedRoles={['user']}>
              <VideoWatch />
            </RoleRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <DashboardRedirect />
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', margin: '20px', overflow: 'auto', maxHeight: '90vh' }}>
          <h2 style={{ marginBottom: '16px' }}>Something went wrong (Rendering Error)</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', fontFamily: 'monospace' }}>
            {this.state.error?.stack || String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper component to redirect authenticated user to their role-specific dashboard
const DashboardRedirect = () => {
  const { isAuthenticated, user, isLearner } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  const role = String(user.role || '').toLowerCase();
  const isLearnerRole = isLearner || role === 'user' || role === 'student' || role === 'end_user' || role === 'learner' || role === '3';
  if (!isLearnerRole) return <Navigate to="/login" replace />;
  return (
    <ErrorBoundary>
      <UserDashboard />
    </ErrorBoundary>
  );
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
        <AuthProvider>
          <ThemeCustomizerProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </ThemeCustomizerProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
