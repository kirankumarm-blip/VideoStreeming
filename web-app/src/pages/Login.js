import React, { useState, useEffect } from 'react';
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
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // States for forgot password flow
  const [authMode, setAuthMode] = useState('login'); // 'login', 'forgot', 'reset', 'otp'
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [successMessage, setSuccessMessage] = useState('');
  
  // OTP Verification States
  const [tempLoginData, setTempLoginData] = useState(null);
  const [otpCode, setOtpCode] = useState('');

  // OTP Timer & Resend States
  const [timer, setTimer] = useState(120);
  const [timerActive, setTimerActive] = useState(false);

  // Custom Alert Modal States
  const [customAlert, setCustomAlert] = useState({
    show: false,
    type: 'success',
    title: '',
    message: '',
    buttonText: 'Continue',
    onConfirm: null
  });

  const showSuccess = (message, onConfirm = null) => {
    setCustomAlert({
      show: true,
      type: 'success',
      title: 'Success!',
      message,
      buttonText: 'Continue',
      onConfirm
    });
  };

  const showError = (message, onConfirm = null) => {
    setCustomAlert({
      show: true,
      type: 'error',
      title: 'Oooops!',
      message,
      buttonText: 'Try Again',
      onConfirm
    });
  };

  // Server configuration states
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('serverUrl') || 'http://localhost:5000/api');

  useEffect(() => {
    let interval = null;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && timerActive) {
      setTimerActive(false);
      showError('OTP Expired');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer, timerActive]);

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
      // 1. Validate credentials
      const res = await api.auth.login(email, password);
      
      // 2. Call vdotp workflow to generate and send OTP
      await api.auth.otp(email, 'generateOtp');

      showSuccess('OTP sent successfully', () => {
        // Clear existing tokens from storage until OTP is verified
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
        setTimer(120);
        setTimerActive(true);
      });
    } catch (err) {
      if (err.status === 401) {
        showError('Invalid Credentials');
      } else {
        showError(err.message || 'Login failed. Please check your credentials.');
      }
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 3. Call vdotp workflow to verify OTP
      const otpRes = await api.auth.otp(email, 'verifyOtp', otpCode);
      
      // Map flat keys directly from the UAT response payload
      const token = otpRes.token || otpRes.accessToken || (tempLoginData ? (tempLoginData.token || tempLoginData.accessToken) : '');
      const role = otpRes.role || (tempLoginData ? tempLoginData.role : '');
      const name = otpRes.name || (tempLoginData ? tempLoginData.name : '');
      const userEmail = otpRes.email || email;
      const userId = otpRes.id || (tempLoginData ? tempLoginData.id : null);

      const finalUser = {
        id: userId,
        name: name,
        email: userEmail,
        role: role
      };

      // Save tokens to local storage to finalize session login
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', token);
      localStorage.setItem('user', JSON.stringify(finalUser));
      setSuccessMessage('');
      setTimerActive(false);

      // Redirect based on role
      if (role === 'super_admin') {
        navigate('/super-admin');
      } else if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      if (err.status === 402) {
        showError('Invalid OTP');
      } else {
        showError(err.message || 'Invalid OTP code. Please enter the correct code.');
      }
      setError(err.message || 'Invalid OTP code. Please enter the correct code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await api.auth.otp(email, 'generateOtp');
      showSuccess('OTP sent successfully', () => {
        setTimer(120);
        setTimerActive(true);
      });
    } catch (err) {
      showError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {timer > 0 ? (
                <span>Resend OTP in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div style={{ textAlign: 'center', fontSize: '14px' }}>
              <span 
                onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); setOtpCode(''); setTimerActive(false); }}
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

      {/* --- CUSTOM ALERT MODAL --- */}
      {customAlert.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            width: '100%',
            maxWidth: '360px',
            padding: '40px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#333333',
            animation: 'scaleIn 0.25s ease'
          }}>
            {/* Circle Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: `3px solid ${customAlert.type === 'success' ? '#1890ff' : '#f5222d'}`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              {customAlert.type === 'success' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1890ff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5222d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: customAlert.type === 'success' ? '#1890ff' : '#f5222d',
              margin: '0 0 12px 0'
            }}>
              {customAlert.title}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.5',
              margin: '0 0 28px 0'
            }}>
              {customAlert.message}
            </p>

            {/* Button */}
            <button
              onClick={() => {
                setCustomAlert(prev => ({ ...prev, show: false }));
                if (customAlert.onConfirm) customAlert.onConfirm();
              }}
              style={{
                background: customAlert.type === 'success' ? '#3a78f2' : '#de2424',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: 600,
                width: '100%',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                outline: 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
              onMouseLeave={e => e.currentTarget.style.opacity = 1}
            >
              {customAlert.buttonText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
