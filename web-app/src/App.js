import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import VideoWatch from './pages/VideoWatch';
import Profile from './pages/Profile';
import { getCurrentUser } from './services/api';
import { LanguageProvider } from './context/LanguageContext';

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
  if (!allowedRoles.includes(user.role)) {
    // Redirect unauthorized roles back to their appropriate page
    if (user.role === 'super_admin') return <Navigate to="/super-admin" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
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

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const showSidebar = !isAuthPage && user && user.role === 'user';

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
        {showSidebar && (
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
        )}
        <div style={{ 
          flex: 1, 
          padding: !isAuthPage ? (user && (user.role === 'user' || user.role === 'admin' || user.role === 'super_admin') ? '0' : '40px') : '0',
          position: 'relative',
          minWidth: 0,
          height: '100%',
          overflow: 'hidden'
        }}>
          <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />

          {/* Protected routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          {/* User Specific Paths */}
          <Route path="/watch/:id" element={
            <RoleRoute allowedRoles={['user']}>
              <VideoWatch />
            </RoleRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } />

          {/* Admin Specific Paths */}
          <Route path="/admin" element={
            <RoleRoute allowedRoles={['admin']}>
              <AdminDashboard isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} theme={theme} />
            </RoleRoute>
          } />

          {/* Super Admin Specific Paths */}
          <Route path="/super-admin" element={
            <RoleRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
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
  if (user.role === 'super_admin') return <Navigate to="/super-admin" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <UserDashboard />;
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
    <LanguageProvider>
      <Router>
        <AppLayout theme={theme} setTheme={setTheme} />
      </Router>
    </LanguageProvider>
  );
}

export default App;
