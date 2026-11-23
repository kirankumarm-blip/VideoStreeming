import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, roleLabel, isSuperAdmin, logout } = useAuth();

  const handleReturnDashboard = () => {
    if (isSuperAdmin) {
      navigate('/super-admin', { replace: true });
    } else {
      navigate('/admin', { replace: true });
    }
  };

  const attemptedRoles = location.state?.attemptedRoles;

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          background: 'linear-gradient(145deg, #18181f 0%, #111115 100%)',
          borderRadius: '16px',
          padding: '40px 32px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          textAlign: 'center',
        }}
      >
        {/* Shield / Forbidden Icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#ef4444',
            fontSize: '32px',
          }}
        >
          <i className="fa-solid fa-shield-halved" />
        </div>

        {/* 403 Badge */}
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          403 Forbidden
        </span>

        {/* Title */}
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#ffffff',
            margin: '0 0 12px',
          }}
        >
          Access Denied
        </h1>

        {/* Subtitle message */}
        <p
          style={{
            color: '#9ca3af',
            fontSize: '15px',
            lineHeight: '1.6',
            margin: '0 0 24px',
          }}
        >
          You do not have the required administrative permissions to access this page.
        </p>

        {/* Account Info Pill */}
        {user && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280', fontSize: '13px' }}>Signed in as:</span>
              <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: '600' }}>
                {user.name || user.email || 'Admin User'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: attemptedRoles ? '8px' : '0' }}>
              <span style={{ color: '#6b7280', fontSize: '13px' }}>Current Role:</span>
              <span
                style={{
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'rgba(56, 189, 248, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {roleLabel || role || 'User'}
              </span>
            </div>
            {attemptedRoles && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Required Role:</span>
                <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '600' }}>
                  {attemptedRoles.map(r => r.replace('_', ' ').toUpperCase()).join(' or ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleReturnDashboard}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #e50914 0%, #b81d24 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(229, 9, 20, 0.3)',
            }}
          >
            <i className="fa-solid fa-arrow-left" />
            Back to Dashboard
          </button>
          <button
            onClick={logout}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              background: 'transparent',
              color: '#9ca3af',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Sign In with Different Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
