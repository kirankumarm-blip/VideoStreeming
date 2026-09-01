import React, { useState, useEffect, useRef } from 'react';
import { api, setCurrentUser, getCurrentUser } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import PaginatedTable from '../components/PaginatedTable';

const Profile = () => {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [bio, setBio] = useState(localStorage.getItem('user_bio') || 'Movies are the ultimate escape.\nI watch, I learn, I grow.');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Active Modal State ('account', 'password', 'privacy', 'notifications', 'payment', null)
  const [activeModal, setActiveModal] = useState(null);

  // Stats Counters
  const [stats, setStats] = useState({
    watched: 28,
    watchLater: 12,
    downloads: 8
  });

  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState({
    courseUpdates: true,
    quizReminders: true,
    promotions: false,
    emailDigest: true
  });

  const [customAlert, setCustomAlert] = useState({
    show: false,
    title: '',
    message: '',
    type: 'error',
    buttonText: 'OK'
  });

  const verifyFileContent = async (file) => {
    if (!file) return false;
    
    // 1. Filename keyword check
    const fileName = file.name.toLowerCase();
    const keywords = ['explicit', 'minor', 'nudity', 'sex', 'pornography', 'porn', 'illegal', 'inappropriate', 'adult'];
    const isNameInappropriate = keywords.some(keyword => fileName.includes(keyword));
    if (isNameInappropriate) {
      setCustomAlert({
        show: true,
        title: 'Moderation Alert',
        message: 'Inappropriate content has been detected in the uploaded file.',
        type: 'error',
        buttonText: 'OK'
      });
      return true;
    }

    // Helper to run skin tone analysis on canvas pixels
    const analyzePixels = (ctx, width, height) => {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      let skinPixels = 0;
      const totalPixels = width * height;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        const isSkin = (
          r > 95 && g > 40 && b > 20 &&
          diff > 15 &&
          Math.abs(r - g) > 15 &&
          r > g && r > b
        );
        
        if (isSkin) {
          skinPixels++;
        }
      }
      
      const percentage = (skinPixels / totalPixels) * 100;
      return percentage > 18;
    };
    
    // 2. Skin tone skin-pixel scan (only for images)
    if (file.type.startsWith('image/')) {
      const hasNudity = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 80;
              canvas.height = 80;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, 80, 80);
              const flagged = analyzePixels(ctx, 80, 80);
              resolve(flagged);
            } catch (err) {
              resolve(false);
            }
          };
          img.onerror = () => resolve(false);
          img.src = e.target.result;
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      });
      
      if (hasNudity) {
        setCustomAlert({
          show: true,
          title: 'Moderation Alert',
          message: 'Inappropriate content has been detected in the uploaded file.',
          type: 'error',
          buttonText: 'OK'
        });
        return true;
      }
    }
    
    return false;
  };

  useEffect(() => {
    fetchProfile();
    fetchUserStats();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await api.auth.getProfile().catch(() => null);
      const localUser = getCurrentUser() || {};
      const mergedUser = (data && (data.name || data.email || data.id)) ? { ...localUser, ...data } : (localUser.email ? localUser : { name: 'User', email: 'user@lurnax.com', ...localUser });
      
      setProfile(mergedUser);
      setName(mergedUser.name || '');
      setMobile(mergedUser.mobile || '');
      if (mergedUser.avatar) {
        setAvatarPreview(mergedUser.avatar.startsWith('http') ? mergedUser.avatar : `http://localhost:5000${mergedUser.avatar}`);
      }
    } catch (e) {
      const localUser = getCurrentUser() || { name: 'User', email: 'user@lurnax.com' };
      setProfile(localUser);
      setName(localUser.name || '');
      setMobile(localUser.mobile || '');
      if (localUser.avatar) {
        setAvatarPreview(localUser.avatar.startsWith('http') ? localUser.avatar : `http://localhost:5000${localUser.avatar}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const recent = await api.dashboard.getUser('recently_palyed').catch(() => []);
      const recentList = Array.isArray(recent) ? recent : (recent?.data && Array.isArray(recent.data) ? recent.data : []);
      
      const quizzes = await api.dashboard.getUser('getQuizHistory', { formstep: 'getQuizHistory' }).catch(() => []);
      const quizList = Array.isArray(quizzes) ? quizzes : (quizzes?.data && Array.isArray(quizzes.data) ? quizzes.data : []);

      setStats({
        watched: recentList.length || 28,
        watchLater: 12,
        downloads: quizList.length || 8
      });
    } catch (err) {
      // Keep defaults
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (await verifyFileContent(file)) {
      e.target.value = '';
      return;
    }

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Auto-upload avatar
    const formData = new FormData();
    formData.append('name', name || profile?.name || '');
    formData.append('mobile', mobile || profile?.mobile || '');
    formData.append('avatar', file);

    try {
      const res = await api.auth.updateProfile(formData);
      setSuccess('Profile photo updated successfully!');
      
      const currentUser = getCurrentUser();
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          name: res.user?.name || currentUser.name,
          avatar: res.user?.avatar || currentUser.avatar
        });
      }
      fetchProfile();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to upload profile photo');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('mobile', mobile);
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      const res = await api.auth.updateProfile(formData);
      localStorage.setItem('user_bio', bio);
      setSuccess(t('profile.updateSuccess', 'Profile updated successfully!'));
      
      const currentUser = getCurrentUser();
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          name: res.user.name,
          mobile: res.user.mobile,
          avatar: res.user.avatar
        });
      }

      fetchProfile();
      setActiveModal(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    const userEmail = currentProfile.email || profile?.email || getCurrentUser()?.email;
    if (!userEmail) {
      setError('User email not found. Please log in again.');
      return;
    }

    try {
      // Calling the same resetPassword API used in login page forgot password section
      const res = await api.auth.resetPassword(userEmail, newPassword);
      const msg = (res && res.message) ? res.message : 'Password updated successfully!';
      setSuccess(msg);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveModal(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please check your inputs.');
    }
  };

  const menuSections = [
    {
      id: 'account',
      title: 'Account Information',
      subtitle: 'Update your personal details',
      iconBg: 'rgba(168, 85, 247, 0.15)',
      iconColor: '#c084fc',
      icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    },
    {
      id: 'password',
      title: 'Change Password',
      subtitle: 'Update your password',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconColor: '#60a5fa',
      icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      )
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      subtitle: 'Manage your privacy settings',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#34d399',
      icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="9 12 11 14 15 10"></polyline>
        </svg>
      )
    },
    {
      id: 'notifications',
      title: 'Notification Preferences',
      subtitle: 'Manage notification settings',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#fbbf24',
      icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      )
    },
    {
      id: 'payment',
      title: 'Payment Methods',
      subtitle: 'Manage your payment options',
      iconBg: 'rgba(236, 72, 153, 0.15)',
      iconColor: '#f472b6',
      icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      )
    }
  ];

  const currentProfile = profile || getCurrentUser() || { name: 'User', email: 'user@lurnax.com' };

  return (
    <div className="profile-page-wrapper" style={{
      maxWidth: '780px',
      margin: '0 auto',
      padding: '24px 20px 60px 20px',
      color: 'var(--text-primary)',
      boxSizing: 'border-box'
    }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          My Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
          Manage your account, preferences and plan
        </p>
      </div>

      {/* Toast Notifications */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Hidden File Input for Avatar */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        onChange={handleAvatarSelect} 
        style={{ display: 'none' }} 
      />

      {/* Top Profile Hero Card */}
      <div className="profile-hero-card" style={{
        position: 'relative',
        borderRadius: '24px',
        padding: '28px',
        marginBottom: '20px',
        background: 'var(--profile-hero-bg, linear-gradient(135deg, rgba(28, 18, 48, 0.95) 0%, rgba(14, 15, 26, 0.98) 100%))',
        border: '1px solid var(--profile-hero-border, rgba(139, 92, 246, 0.25))',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Subtle Decorative Background Curve Graphic */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '280px',
          height: '100%',
          opacity: 0.35,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(ellipse at top right, rgba(168, 85, 247, 0.4), transparent 70%)',
          backgroundRepeat: 'no-repeat'
        }}>
          <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" style={{ opacity: 0.4 }}>
            <path d="M50 0 C100 80, 120 120, 200 150" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M20 30 C80 100, 130 140, 200 180" stroke="#ec4899" strokeWidth="1" />
            <path d="M0 60 C60 120, 110 160, 200 200" stroke="#8b5cf6" strokeWidth="1.5" />
          </svg>
        </div>

        {/* User Info Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 2, flexWrap: 'wrap' }}>
          {/* Avatar with Edit Badge */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '105px',
              height: '105px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              padding: '3px',
              boxShadow: '0 8px 24px rgba(168, 85, 247, 0.35)'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                color: 'var(--text-primary)',
                fontWeight: 800,
                fontSize: '38px',
                userSelect: 'none'
              }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (name || currentProfile.name || currentProfile.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
            </div>

            {/* Edit Photo Pencil Badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              title="Change Profile Photo"
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#7c3aed',
                border: '2.5px solid var(--bg-secondary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(124, 58, 237, 0.5)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          </div>

          {/* Details Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {name || currentProfile.name || 'User Name'}
              </h2>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '20px',
                background: 'rgba(124, 58, 237, 0.25)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                color: '#c084fc'
              }}>
                Free Plan
              </span>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {currentProfile.email || 'user@lurnax.com'}
            </div>

            {/* Quote / Bio */}
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              lineHeight: '1.4',
              fontStyle: 'italic',
              whiteSpace: 'pre-line',
              opacity: 0.85
            }}>
              "{bio}"
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border-color)', margin: '22px 0 18px 0', opacity: 0.7 }} />

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Stat 1: Videos Watched */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
              fontSize: '20px'
            }}>
              ▷
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stats.watched}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Videos Watched
              </div>
            </div>
          </div>

          {/* Stat 2: Watch Later */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '0 8px',
            borderLeft: '1px solid var(--border-color)',
            borderRight: '1px solid var(--border-color)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
              fontSize: '18px'
            }}>
              🔖
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stats.watchLater}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Watch Later
              </div>
            </div>
          </div>

          {/* Stat 3: Downloads */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
              fontSize: '18px'
            }}>
              📥
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stats.downloads}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Downloads
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Navigation List Card */}
      <div className="profile-menu-card" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
      }}>
        {menuSections.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => setActiveModal(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              cursor: 'pointer',
              borderBottom: idx === menuSections.length - 1 ? 'none' : '1px solid var(--border-color)',
              transition: 'background 0.15s ease'
            }}
            className="profile-menu-item"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Left: Icon Box + Title/Subtitle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: item.iconBg,
                color: item.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {item.icon()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.title}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {item.subtitle}
                </span>
              </div>
            </div>

            {/* Right: Chevron Arrow */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        ))}
      </div>

      {/* --- MODAL DIALOGS FOR SETTINGS SECTIONS --- */}

      {/* 1. Account Information Modal */}
      {activeModal === 'account' && (
        <div style={modalBackdropStyle} onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Account Information</h3>
              <button type="button" onClick={() => setActiveModal(null)} style={closeBtnStyle}>✕</button>
            </div>
            <form onSubmit={handleUpdateProfile} style={{ padding: '20px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value.replace(/^\s+/, ''))}
                  required
                  style={inputStyle}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={currentProfile.email || 'user@lurnax.com'}
                  disabled
                  style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Mobile Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  style={inputStyle}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Bio / Quote</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              <button type="submit" style={primaryBtnStyle}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Change Password Modal */}
      {activeModal === 'password' && (
        <div style={modalBackdropStyle} onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Change Password</h3>
              <button type="button" onClick={() => setActiveModal(null)} style={closeBtnStyle}>✕</button>
            </div>
            <form onSubmit={handleChangePassword} style={{ padding: '20px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value.trim())}
                  required
                  style={inputStyle}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value.trim())}
                  required
                  style={inputStyle}
                />
              </div>

              <button type="submit" style={primaryBtnStyle}>
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Privacy & Security Modal */}
      {activeModal === 'privacy' && (
        <div style={modalBackdropStyle} onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <div style={{ ...modalCardStyle, maxWidth: '640px' }}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Privacy & Active Devices</h3>
              <button type="button" onClick={() => setActiveModal(null)} style={closeBtnStyle}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                Devices currently logged into and authorized for your account:
              </p>
              <div className="table-container">
                <PaginatedTable
                  headers={[
                    'Device Agent',
                    'Last Login',
                    'Status'
                  ]}
                  data={currentProfile.devices || []}
                  emptyMessage="No active device sessions captured"
                  showSearch={false}
                  showStatusFilter={false}
                  showExport={false}
                  renderRow={(dev, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{dev.agent}</td>
                      <td style={{ fontSize: '12px' }}>{new Date(dev.lastLogin).toLocaleString()}</td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981'
                        }}>
                          ONLINE
                        </span>
                      </td>
                    </tr>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Notification Preferences Modal */}
      {activeModal === 'notifications' && (
        <div style={modalBackdropStyle} onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Notification Preferences</h3>
              <button type="button" onClick={() => setActiveModal(null)} style={closeBtnStyle}>✕</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { key: 'courseUpdates', label: 'Course Updates & New Lessons', desc: 'Get notified when new videos and chapters release' },
                { key: 'quizReminders', label: 'Quiz & Certificate Alerts', desc: 'Receive score summaries and completion certificates' },
                { key: 'emailDigest', label: 'Weekly Learning Digest', desc: 'Summary of watch progress and recommended topics' },
                { key: 'promotions', label: 'Special Offers & Promotions', desc: 'Discounts on premium features and live workshops' }
              ].map(pref => (
                <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{pref.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pref.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs[pref.key]}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, [pref.key]: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSuccess('Notification preferences saved!');
                  setActiveModal(null);
                  setTimeout(() => setSuccess(''), 4000);
                }}
                style={{ ...primaryBtnStyle, marginTop: '8px' }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Payment Methods Modal */}
      {activeModal === 'payment' && (
        <div style={modalBackdropStyle} onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Payment & Subscription</h3>
              <button type="button" onClick={() => setActiveModal(null)} style={closeBtnStyle}>✕</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>Current Plan: Free Tier</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>Active</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Enjoy free course previews, chapter quizzes, and basic telemetry tracking.
                </span>
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>👑</span>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>Upgrade to Premium VIP</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Unlock unlimited HD 4K streaming, offline video downloads, and priority certificates for $9.99/mo.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess('VIP Upgrade requested! Our team will contact you.');
                    setActiveModal(null);
                    setTimeout(() => setSuccess(''), 4000);
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#000000',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  Upgrade to VIP ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM MODERATION ALERT MODAL --- */}
      {customAlert.show && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '360px', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: '3px solid #ef4444',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 16px auto',
              color: '#ef4444',
              fontSize: '24px'
            }}>
              ✕
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', margin: '0 0 8px 0' }}>
              {customAlert.title}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              {customAlert.message}
            </p>
            <button
              onClick={() => setCustomAlert(prev => ({ ...prev, show: false }))}
              style={{ ...primaryBtnStyle, background: '#ef4444' }}
            >
              {customAlert.buttonText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Common Modal Styling Constants
const modalBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3000,
  padding: '20px'
};

const modalCardStyle = {
  width: '100%',
  maxWidth: '480px',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '20px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  animation: 'modalZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
};

const modalHeaderStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'var(--bg-tertiary)'
};

const closeBtnStyle = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box'
};

const primaryBtnStyle = {
  width: '100%',
  padding: '11px',
  borderRadius: '10px',
  border: 'none',
  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
};

export default Profile;
