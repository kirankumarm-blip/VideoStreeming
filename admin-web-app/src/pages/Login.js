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
  const [showPassword, setShowPassword] = useState(false);
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
      
      // Map flat or nested keys from the UAT response payload
      const userObj = otpRes.user || (tempLoginData ? tempLoginData.user : null);
      
      const token = otpRes.token || otpRes.accessToken || (tempLoginData ? (tempLoginData.token || tempLoginData.accessToken) : '');
      const role = otpRes.role || (userObj ? userObj.role : '') || (tempLoginData ? tempLoginData.role : '');
      const name = otpRes.name || (userObj ? userObj.name : '') || (tempLoginData ? tempLoginData.name : '');
      const userEmail = otpRes.email || (userObj ? userObj.email : '') || email;
      const userId = otpRes.id || (userObj ? userObj.id : null) || (tempLoginData ? tempLoginData.id : null);

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
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        showError('Access denied. This portal is for administrators only.');
        return;
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

      {/* Top Left Branding Logo */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        zIndex: 100
      }}>
        <img src="/logo.png" alt="LurnAx" style={{ height: '100px', width: '300px', objectFit: 'contain', objectPosition: 'left', imageRendering: '-webkit-optimize-contrast' }} />
      </div>

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
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', textAlign: 'center', color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Welcome Back! 👋
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '28px' }}>
              Sign in to continue your learning journey.
            </p>
            
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
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder={t('auth.enterPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '50px' }}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    transition: 'color 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.815 7.815 3 3m-3-3-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
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
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
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
