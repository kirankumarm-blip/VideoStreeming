import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import Background3D from '../components/Background3D';
import { useLanguage } from '../context/LanguageContext';

const Signup = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [genderId, setGenderId] = useState('');
  const [genders, setGenders] = useState([]);
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

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

  // Password strength checker
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: 'Empty', color: '#888', pct: 0 };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 0:
      case 1:
        return { label: 'Weak', color: '#ef4444', pct: 25 };
      case 2:
        return { label: 'Fair', color: '#f59e0b', pct: 50 };
      case 3:
        return { label: 'Good', color: '#3b82f6', pct: 75 };
      case 4:
      default:
        return { label: 'Strong', color: '#10b981', pct: 100 };
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Field Validations
    if (!firstName || !lastName || !genderId || !dob || !email || !mobile || !password || !confirmPassword) {
      showError('All fields are required');
      return;
    }

    if (mobile.length !== 10) {
      showError('Phone number must be exactly 10 digits');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    // Email regex check with TLD verification
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address (e.g. name@domain.com)');
      return;
    }

    setLoading(true);

    try {
      await api.auth.signup({
        firstName,
        lastName,
        genderId,
        dob: new Date(dob).toISOString(),
        email,
        mobile,
        password
      });
      showSuccess('Account created successfully! Redirecting to login page...', () => {
        navigate('/login');
      });
    } catch (err) {
      showError(err.message || 'Registration failed. Check if email is already in use.');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  React.useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  React.useEffect(() => {
    const fetchGenders = async () => {
      try {
        const response = await api.auth.getGenders();
        let rawList = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        } else if (response && Array.isArray(response.genders)) {
          rawList = response.genders;
        } else if (response && typeof response === 'object') {
          for (const key in response) {
            if (Array.isArray(response[key])) {
              rawList = response[key];
              break;
            }
          }
        }

        // Extract the nested 'json' object if present (e.g. UAT network responses)
        const genderList = rawList.map(item => {
          if (item && item.json) {
            return item.json;
          }
          return item;
        });

        setGenders(genderList);
      } catch (err) {
        console.error('Failed to fetch genders:', err);
      }
    };
    fetchGenders();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="auth-wrapper" style={{ background: 'var(--bg-primary)', overflow: 'hidden', position: 'relative', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* 3D Motion Graphics Canvas Background */}
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

      {/* Form Container */}
      <div className="auth-card glass-card animate-fade-in" style={{ position: 'relative', zIndex: 10, maxWidth: '640px' }}>

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

        {success && (
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
            {success}
          </div>
        )}

        <form onSubmit={handleSignupSubmit}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>
            {t('auth.signUp')}
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Gender</label>
              <select
                className="form-input"
                value={genderId}
                onChange={(e) => setGenderId(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                <option value="">Select Gender</option>
                {genders.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name || g.gender_name || g.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.emailAddress')}</label>
            <input
              type="email"
              className="form-input"
              placeholder={t('auth.enterEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="Enter 10-digit phone number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="form-label">{t('auth.password')}</label>
            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder={t('auth.passwordMin')}
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

          {/* Password Strength Meter */}
          {password && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Password Strength:</span>
                <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
              </div>
              <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${strength.pct}%`, height: '100%', backgroundColor: strength.color, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">{t('auth.confirmPassword')}</label>
            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="form-input"
                placeholder={t('auth.reenterPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', paddingRight: '50px' }}
                required
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                {showConfirmPassword ? (
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
            {loading ? t('auth.creatingAccount') : t('auth.signUp')}
          </button>

          <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              {t('auth.signIn')}
            </Link>
          </div>
        </form>
      </div>

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

export default Signup;
