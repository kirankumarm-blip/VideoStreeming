import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getCurrentUser } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const Navigation = ({ toggleSidebar, theme, setTheme }) => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [showRecentlyViewed, setShowRecentlyViewed] = useState(false);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const recentlyViewedRef = useRef(null);

  useEffect(() => {
    if (user && user.role === 'user') {
      fetchNotifications();
      fetchRecentlyViewed();
      // Poll notifications every 30s
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
      if (recentlyViewedRef.current && !recentlyViewedRef.current.contains(e.target)) {
        setShowRecentlyViewed(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.list();
      setNotifications(data);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  const fetchRecentlyViewed = async () => {
    try {
      const data = await api.videos.getHistory();
      setRecentlyViewed(data || []);
    } catch (e) {
      console.error("Failed to load recently viewed", e);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('search', val);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await api.notifications.markAsRead(notif.id);
        // Update local state
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      } catch (e) {
        console.error(e);
      }
    }
    // Perform any navigation if required
    setShowNotifDropdown(false);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleLogout = () => {
    api.auth.logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) return null;

  return (
    <nav className="global-navbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px',
      padding: '0 40px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Burger menu for tablet/mobile */}
        <button 
          onClick={toggleSidebar} 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'none' // Controlled in CSS or dynamically based on resize, but hidden on desktop
          }}
          className="mobile-burger-btn"
        >
          ☰
        </button>
        <div 
          onClick={() => navigate('/')} 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <img 
            src="/logo.png" 
            alt="LurnAx" 
            style={{ 
              height: '100px', 
              width: '250px', 
              objectFit: 'contain', 
              objectPosition: 'left',
              margin: '-20px 0', 
              zIndex: 110, 
              position: 'relative',
              imageRendering: '-webkit-optimize-contrast' 
            }} 
          />
        </div>
      </div>

      {/* Centered Search Bar */}
      {user.role === 'user' && (
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          margin: '0 20px',
          display: 'flex',
          alignItems: 'center'
        }} className="nav-search-container">
          <span style={{ position: 'absolute', left: '14px', color: 'var(--text-secondary)' }}>🔍</span>
          <input 
            type="text"
            placeholder={t('user.searchPlaceholder')}
            value={headerSearch}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '10px 16px 10px 38px',
              borderRadius: '24px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
            className="nav-search-input"
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>


        {/* Recently Viewed Dropdown */}
        {user.role === 'user' && (
          <div ref={recentlyViewedRef} style={{ position: 'relative' }} className="nav-recently-played">
            <button 
              onClick={() => setShowRecentlyViewed(!showRecentlyViewed)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              {t('user.recentlyPlayed')}
            </button>

            {showRecentlyViewed && (
              <div style={{
                position: 'absolute',
                top: '45px',
                right: 0,
                width: '300px',
                zIndex: 1000,
                padding: '12px'
              }} className="glass-card">
                <div style={{ fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '14px' }}>
                  {t('user.recentlyPlayed')}
                </div>
                {recentlyViewed.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '12px 0', textAlign: 'center' }}>
                    {t('user.noVideosWatched')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                    {recentlyViewed.map(item => {
                      const video = item.video;
                      if (!video) return null;
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => {
                            navigate(`/watch/${video.id}`);
                            setShowRecentlyViewed(false);
                          }}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            transition: 'background 0.2s'
                          }}
                          className="recently-viewed-item"
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <img 
                            src={video.thumbnail && video.thumbnail.startsWith('http') ? video.thumbnail : (video.thumbnail ? `http://localhost:5000${video.thumbnail}` : 'https://placehold.co/180x101?text=No+Thumbnail')} 
                            alt={video.title} 
                            style={{ width: '60px', height: '34px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {video.title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {item.completionPercentage}% {t('user.watchedPercent')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Language Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="nav-lang-switcher">
          <span style={{ fontSize: '14px' }} title={t('nav.language')}>🌐</span>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="kn">ಕನ್ನಡ</option>
          </select>
        </div>

        {/* Theme Switcher */}
        <button 
          className="nav-theme-switcher"
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontSize: '20px',
            padding: '4px'
          }}
          title={t('nav.theme')}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Notifications (End Users only) */}
        {user.role === 'user' && (
          <div ref={notifRef} style={{ position: 'relative' }} className="nav-notifications">
            <div onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="notification-bell">
              <span style={{ fontSize: '20px' }}>🔔</span>
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </div>

            {showNotifDropdown && (
              <div className="notification-dropdown glass-card">
                <div style={{ fontWeight: 700, paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={`notification-item ${n.read ? '' : 'unread'}`}
                    >
                      <div className="notification-title">{n.title}</div>
                      <div className="notification-msg">{n.message}</div>
                      <div className="notification-date">{new Date(n.date).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* User Profile */}
        <div ref={profileRef} style={{ position: 'relative' }} className="nav-profile-avatar">
          <div 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-secondary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              overflow: 'hidden'
            }}>
              {user.avatar ? (
                <img src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (user.name || user.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, display: 'none' }} className="desktop-username">
              {user.name || user.email}
            </span>
          </div>

          {showProfileDropdown && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: 0,
              width: '180px',
              zIndex: 1000,
              padding: '8px 0'
            }} className="glass-card">
              <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                {t('nav.role')}: {user.role === 'super_admin' ? t('admin.superTitle') : user.role === 'admin' ? t('admin.title') : t('nav.brand')}
              </div>
              <div 
                onClick={() => { navigate('/profile'); setShowProfileDropdown(false); }} 
                style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
              >
                {t('nav.profile')}
              </div>
              <div 
                onClick={handleLogout} 
                style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 600 }}
                onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
              >
                {t('nav.logout')}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
