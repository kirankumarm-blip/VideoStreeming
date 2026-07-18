import React, { useState, useEffect } from 'react';
import { api, setCurrentUser, getCurrentUser } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const Profile = () => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);

  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await api.auth.getProfile();
      setProfile(data);
      setName(data.name);
      setMobile(data.mobile);
    } catch (e) {
      setError('Failed to load profile details');
    } finally {
      setLoading(false);
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
      setSuccess(t('profile.updateSuccess'));
      
      // Update local storage so Header avatar updates
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

    try {
      await api.auth.changePassword(oldPassword, newPassword);
      setSuccess('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password. Check old password.');
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '100px' }}>{t('admin.loading')}</div>;
  if (!profile) return <div style={{ color: '#ef4444', textAlign: 'center', padding: '100px' }}>Failed to load profile. Please try again.</div>;

  return (
    <div className="main-content" style={{ marginLeft: 0, maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>{t('profile.title')}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{t('admin.subtitle')}</p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', flexWrap: 'wrap' }} className="responsive-profile-grid">
        
        {/* EDIT PROFILE CARD */}
        <div className="glass-card animate-fade-in">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>{t('profile.title')}</h2>
          
          <form onSubmit={handleUpdateProfile}>
            
            {/* Avatar Preview & Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-secondary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '24px',
                overflow: 'hidden'
              }}>
                {profile.avatar ? (
                  <img src={profile.avatar.startsWith('http') ? profile.avatar : `http://localhost:5000${profile.avatar}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (profile.name || profile.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Upload Photo</div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setAvatarFile(e.target.files[0])}
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.fullName')}</label>
              <input 
                type="text" 
                className="form-input" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.emailAddress')}</label>
              <input 
                type="email" 
                className="form-input" 
                value={profile.email}
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.mobileNumber')}</label>
              <input 
                type="tel" 
                className="form-input" 
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              {t('profile.saveChanges')}
            </button>
          </form>
        </div>

        {/* SECURITY SETTINGS (CHANGE PASSWORD) */}
        <div className="glass-card animate-fade-in">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>{t('profile.changePassword')}</h2>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">{t('profile.oldPassword')}</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter current password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('profile.newPassword')}</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder={t('auth.passwordMin')}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.confirmPassword')}</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              {t('profile.changePassword')}
            </button>
          </form>
        </div>

        {/* DEVICE LOGIN TRACKING (FULL WIDTH GRID ROW) */}
        <div className="glass-card animate-fade-in" style={{ gridColumn: 'span 2' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>{t('profile.activeDevices')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>View logged-in devices currently accessing this account</p>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('profile.deviceAgent')}</th>
                  <th>{t('profile.deviceLastLogin')}</th>
                  <th>Location (Simulated)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {profile.devices && profile.devices.length > 0 ? (
                  profile.devices.map((dev, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>{dev.agent}</td>
                      <td>{new Date(dev.lastLogin).toLocaleString()}</td>
                      <td>Dynamic IP (Active)</td>
                      <td>
                        <span className="badge badge-active" style={{ fontSize: '11px' }}>CONNECTED</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No device logs captured</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
