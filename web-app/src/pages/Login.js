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

      {/* Top Left Branding Logo */}
      <div style={{
        position: 'absolute',
        top: '32px',
        left: '40px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: 100
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #a855f7 0%, #ff333d 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(168, 85, 247, 0.35)'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span style={{
          fontSize: '22px',
          fontWeight: 800,
          fontFamily: "'Space Grotesk', sans-serif",
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          VStream
        </span>
      </div>

      {/* Floating SVG Educational/Media Assets in the Background */}
      <div className="floating-asset" style={{
        position: 'absolute',
        top: '15%',
        left: '12%',
        animation: 'float 6s ease-in-out infinite',
        opacity: 0.7,
        filter: 'drop-shadow(0 15px 25px rgba(139, 92, 246, 0.2))',
        zIndex: 1
      }}>
        {/* Graduation Cap */}
        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="url(#purpleGrad)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" fill="url(#purpleGrad)" fillOpacity="0.08" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
      </div>

      <div className="floating-asset" style={{
        position: 'absolute',
        top: '36%',
        left: '8%',
        animation: 'float-delayed 8s ease-in-out infinite',
        opacity: 0.7,
        filter: 'drop-shadow(0 15px 25px rgba(139, 92, 246, 0.15))',
        zIndex: 1
      }}>
        {/* Play Button Icon */}
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          border: '1.5px solid rgba(139, 92, 246, 0.25)',
          background: 'rgba(139, 92, 246, 0.05)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#a855f7" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '4px' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      <div className="floating-asset" style={{
        position: 'absolute',
        top: '18%',
        right: '12%',
        animation: 'float 7s ease-in-out infinite',
        opacity: 0.7,
        filter: 'drop-shadow(0 15px 25px rgba(139, 92, 246, 0.2))',
        zIndex: 1
      }}>
        {/* Book Icon */}
        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="url(#purpleGrad)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" fill="url(#purpleGrad)" fillOpacity="0.08" />
        </svg>
      </div>

      <div className="floating-asset" style={{
        position: 'absolute',
        top: '42%',
        right: '9%',
        animation: 'float-delayed 9s ease-in-out infinite',
        opacity: 0.7,
        filter: 'drop-shadow(0 15px 25px rgba(139, 92, 246, 0.15))',
        zIndex: 1
      }}>
        {/* Video Camera SVG */}
        <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="url(#purpleGrad)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="url(#purpleGrad)" fillOpacity="0.08" />
        </svg>
      </div>

      {/* Floating Glass Spheres */}
      <div className="floating-asset" style={{
        position: 'absolute',
        top: '60%',
        left: '6%',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, rgba(168, 85, 247, 0.4) 50%, rgba(124, 58, 237, 0.1) 100%)',
        boxShadow: '0 8px 24px rgba(139, 92, 246, 0.2)',
        animation: 'float 5s ease-in-out infinite',
        zIndex: 1
      }}></div>
      
      <div className="floating-asset" style={{
        position: 'absolute',
        top: '70%',
        right: '15%',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, rgba(168, 85, 247, 0.4) 50%, rgba(124, 58, 237, 0.1) 100%)',
        boxShadow: '0 8px 24px rgba(139, 92, 246, 0.2)',
        animation: 'float-delayed 6s ease-in-out infinite',
        zIndex: 1
      }}></div>

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
      <div className="auth-card glass-card animate-fade-in" style={{ position: 'relative', zIndex: 10, maxWidth: '480px', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.4)', padding: '52px 48px' }}>
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', textAlign: 'center', color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Welcome Back 👋
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '28px' }}>
              Sign in to continue your learning journey.
            </p>
            
            <div className="form-group">
              <label className="form-label">{t('auth.emailAddress')}</label>
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ position: 'absolute', left: '16px', width: '20px', height: '20px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0l-7.5-4.615a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <input
                  type="email"
                  className="form-input"
                  placeholder={t('auth.enterEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', paddingLeft: '48px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label">{t('auth.password')}</label>
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ position: 'absolute', left: '16px', width: '20px', height: '20px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder={t('auth.enterPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: '48px', paddingRight: '50px' }}
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={loading}>
              {loading ? t('auth.signingIn') : (
                <>
                  {t('auth.signIn')} <span style={{ fontSize: '18px' }}>→</span>
                </>
              )}
            </button>

            {/* Social Logins Divider */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)', opacity: 0.5 }}></div>
              <span style={{ padding: '0 12px' }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)', opacity: 0.5 }}></div>
            </div>

            {/* Social Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '28px' }}>
              <button type="button" style={{ width: '56px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </button>
              <button type="button" style={{ width: '56px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <svg width="20" height="20" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#f35325" d="M0 0h11v11H0z"/>
                  <path fill="#81bc06" d="M12 0h11v11H12z"/>
                  <path fill="#05a6f0" d="M0 12h11v11H0z"/>
                  <path fill="#ffba08" d="M12 12h11v11H12z"/>
                </svg>
              </button>
              <button type="button" style={{ width: '56px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-primary)" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.5-.62.71-1.16 1.85-1.02 2.96 1.11.09 2.25-.56 2.95-1.4z"/>
                </svg>
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Create Account <span style={{ fontSize: '16px' }}>→</span>
              </Link>
            </div>
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
