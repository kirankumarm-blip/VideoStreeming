import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import Background3D from '../components/Background3D';
import { useLanguage } from '../context/LanguageContext';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // States for forgot password flow
  const [authMode, setAuthMode] = useState('login'); // 'login', 'forgot', 'reset', 'otp'
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // OTP Verification States
  const [tempLoginData, setTempLoginData] = useState(null);
  const [otpCode, setOtpCode] = useState('');

  // Server configuration states
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('serverUrl') || 'http://localhost:5000/api');

  const handleSaveServerConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('serverUrl', serverUrl);
    setShowServerConfig(false);
    setSuccessMessage('Server URL updated successfully!');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.auth.login(email, password);
      
      // Temporarily clear tokens from local storage until OTP is verified
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setTempLoginData(res);
      setAuthMode('otp');
      setSuccessMessage('OTP sent successfully! Please verify with static OTP: 123456');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (otpCode === '123456') {
      // Save tempLoginData tokens to local storage to finalize the login
      localStorage.setItem('accessToken', tempLoginData.accessToken);
      localStorage.setItem('refreshToken', tempLoginData.refreshToken);
      localStorage.setItem('user', JSON.stringify(tempLoginData.user));
      setSuccessMessage('');

      // Redirect based on role
      if (tempLoginData.user.role === 'super_admin') {
        navigate('/super-admin');
      } else if (tempLoginData.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } else {
      setError('Invalid OTP code. Please enter the correct code.');
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate sending reset token (N8N API workflow simulation)
    setTimeout(() => {
      setLoading(false);
      setSuccessMessage('A simulated password reset token was sent. Use token: "RESET-MOCK-123" to reset password.');
      setAuthMode('reset');
      setResetToken('RESET-MOCK-123'); // Autofill for user convenience
    }, 1200);
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    // Simulate updating password via API
    setTimeout(() => {
      setLoading(false);
      setSuccessMessage('Password reset successfully. Please login with your new password.');
      setAuthMode('login');
      setEmail(forgotEmail);
      setPassword('');
    }, 1200);
  };

  // Pre-fill email if remembered
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="auth-wrapper" style={{ background: 'var(--bg-primary)', overflow: 'hidden', position: 'relative', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Dynamic 3D Motion Graphics Canvas */}
      <Background3D />

      {/* Floating Theme Toggle */}
      <button 
        onClick={toggleTheme}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: '20px',
          zIndex: 100,
          boxShadow: 'var(--shadow-md)',
          transition: 'all 0.2s'
        }}
        title="Toggle Theme"
        type="button"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Auth Form Overlay Container */}
      <div className="auth-card glass-card animate-fade-in" style={{ position: 'relative', zIndex: 10 }}>
        <div className="auth-logo">{t('nav.brand')}</div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#10b981',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {successMessage}
          </div>
        )}

        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>
              {t('auth.signIn')}
            </h2>
            
            <div className="form-group">
              <label className="form-label">{t('auth.emailAddress')}</label>
              <input
                type="email"
                className="form-input"
                placeholder={t('auth.enterEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.password')}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t('auth.enterPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', fontSize: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                {t('auth.rememberMe')}
              </label>
              
              <span 
                onClick={() => { setAuthMode('forgot'); setError(''); setSuccessMessage(''); }}
                style={{ color: 'var(--accent-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                {t('auth.forgotPassword')}
              </span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }} disabled={loading}>
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>
        )}

        {authMode === 'otp' && (
          <form onSubmit={handleOtpSubmit}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
              OTP Verification
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>
              Please enter the 6-digit verification code sent to your registered email.
            </p>

            <div className="form-group">
              <label className="form-label">Enter OTP</label>
              <input
                type="text"
                className="form-input"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                maxLength="6"
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: 'bold' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }}>
              Verify OTP
            </button>

            <div style={{ textAlign: 'center', fontSize: '14px' }}>
              <span 
                onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); setOtpCode(''); }}
                style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                {t('auth.backToSignIn')}
              </span>
            </div>
          </form>
        )}

        {authMode === 'forgot' && (
          <form onSubmit={handleForgotSubmit}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
              {t('auth.forgotPassword')}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>
              {t('auth.forgotText')}
            </p>

            <div className="form-group">
              <label className="form-label">{t('auth.emailAddress')}</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }} disabled={loading}>
              {loading ? t('auth.sending') : t('auth.sendResetLink')}
            </button>

            <div style={{ textAlign: 'center', fontSize: '14px' }}>
              <span 
                onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); }}
                style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                {t('auth.backToSignIn')}
              </span>
            </div>
          </form>
        )}

        {authMode === 'reset' && (
          <form onSubmit={handleResetSubmit}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
              {t('auth.updatePassword')}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>
              {t('auth.resetText')}
            </p>

            <div className="form-group">
              <label className="form-label">{t('auth.resetToken')}</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.newPassword')}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t('auth.passwordMin')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t('auth.reenterPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }} disabled={loading}>
              {loading ? t('auth.resetting') : t('auth.updatePassword')}
            </button>

            <div style={{ textAlign: 'center', fontSize: '14px' }}>
              <span 
                onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); }}
                style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                {t('auth.backToSignIn')}
              </span>
            </div>
          </form>
        )}
        {/* Server IP Config Drawer */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'center' }}>
          {!showServerConfig ? (
            <span 
              onClick={() => setShowServerConfig(true)}
              style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              ⚙️ Configure Server IP Address
            </span>
          ) : (
            <form onSubmit={handleSaveServerConfig} style={{ textAlign: 'left', marginTop: '8px' }}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Server API Base URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="e.g. http://192.168.1.100:5000/api"
                  required
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px', flex: 1 }}>
                  Save & Reload
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowServerConfig(false)}
                  style={{ padding: '6px 12px', fontSize: '11px', flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
