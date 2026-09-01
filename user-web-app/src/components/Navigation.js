import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getCurrentUser } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import PremiumSelect from './PremiumSelect';

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
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const recentlyViewedRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    if (user && user.role === 'user') {
      fetchRecentlyViewedByFilter(activeFilter);
    }
    return () => clearInterval(interval);
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
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      const normalized = list.map((item, idx) => {
        let jsonObj = {};
        if (item && item.json) {
          try {
            jsonObj = typeof item.json === 'string' ? JSON.parse(item.json) : item.json;
          } catch (err) {
            jsonObj = item.json || {};
          }
        }
        
        let msgVal = item.message || jsonObj.message || item.description || jsonObj.description || '';
        if (typeof msgVal === 'string') {
          msgVal = msgVal.replace(/^"|"$/g, '');
        }
        
        let titleVal = item.title || jsonObj.title || item.name || jsonObj.name;
        if (!titleVal) {
          if (msgVal.toLowerCase().includes('course')) {
            titleVal = 'New Course Published';
          } else {
            titleVal = 'New Video Uploaded';
          }
        }

        const dateVal = item.date || jsonObj.date || item.created_at || jsonObj.created_at || new Date().toISOString();
        const readVal = item.read !== undefined ? Boolean(item.read) : (jsonObj.read !== undefined ? Boolean(jsonObj.read) : false);

        return {
          id: String(item.id || jsonObj.id || (item.pairedItem ? item.pairedItem.item : idx)),
          title: titleVal,
          message: msgVal,
          date: dateVal,
          read: readVal
        };
      });
      const validNotifications = normalized.filter(n => {
        if (!n) return false;
        const msgStr = String(n.message || '').trim();
        const titleStr = String(n.title || '').trim();

        // If notification has no message and title is default fallback or empty, ignore empty object
        if (!msgStr && (!titleStr || titleStr === 'New Video Uploaded' || titleStr === 'New Course Published' || titleStr === 'Notification')) {
          return false;
        }
        return msgStr.length > 0 || titleStr.length > 0;
      });

      setNotifications(validNotifications);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  const fetchRecentlyViewedByFilter = async (filterValue) => {
    try {
      setLoadingHistory(true);
      const response = await api.dashboard.getUser('recently_palyed', { 
        filter: filterValue 
      });
      
      const list = Array.isArray(response) ? response : (response?.data && Array.isArray(response.data) ? response.data : []);
      
      const formatted = list.map((item, idx) => {
        const data = item?.json || item || {};
        return {
          id: data.id || item.id || idx,
          video: {
            id: data.video_id || data.id || idx,
            title: data.title || '',
            thumbnail: data.thumbnail || '',
          },
          completionPercentage: parseFloat(data.completion_percentage || 0),
          watchDuration: data.watch_duration || '',
          watchStatus: data.watch_status || '',
          startedAt: data.started_at || ''
        };
      });
      
      setRecentlyViewed(formatted);
    } catch (e) {
      console.error("Failed to load recently viewed with filter", e);
    } finally {
      setLoadingHistory(false);
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
    setNotifications(prev => prev.map(n => String(n.id) === String(notif.id) ? { ...n, read: true } : n));
    setShowNotifDropdown(false);
    try {
      await api.notifications.saveNotification(notif.id, 'read');
    } catch (e) {
      console.error('Failed to save notification read status', e);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleLogout = () => {
    api.auth.logout(1);
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
      padding: '0 24px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* Burger menu for tablet/mobile */}
        <button 
          onClick={toggleSidebar} 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '22px',
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
              height: '56px', 
              width: '200px', 
              objectFit: 'contain', 
              objectPosition: 'left',
              zIndex: 110, 
              position: 'relative',
              imageRendering: '-webkit-optimize-contrast' 
            }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>


        {/* Recently Viewed Dropdown */}
        {user.role === 'user' && (
          <div ref={recentlyViewedRef} style={{ position: 'relative' }} className="nav-recently-played">
            <button 
              onClick={() => {
                const newShow = !showRecentlyViewed;
                setShowRecentlyViewed(newShow);
                if (newShow) {
                  fetchRecentlyViewedByFilter(activeFilter);
                }
              }}
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
                width: '320px',
                zIndex: 1000,
                padding: '12px'
              }} className="glass-card">
                <div style={{ fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '14px' }}>
                  {t('user.recentlyPlayed')}
                </div>
                
                {/* Filter Selector Row */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  {['Last 7 days', 'last 1 month', 'more than 1 month'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter);
                        fetchRecentlyViewedByFilter(filter);
                      }}
                      style={{
                        flex: 1,
                        fontSize: '10px',
                        padding: '4px 2px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: activeFilter === filter ? 'var(--accent-primary)' : 'var(--border-color)',
                        background: activeFilter === filter ? 'var(--accent-primary)' : 'transparent',
                        color: activeFilter === filter ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: activeFilter === filter ? 600 : 400,
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {filter === 'Last 7 days' ? t('filter.7days', 'Last 7 days') :
                       filter === 'last 1 month' ? t('filter.1month', 'Last 1 month') :
                       t('filter.more1month', 'More than 1 month')}
                    </button>
                  ))}
                </div>

                {loadingHistory ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '24px 0', textAlign: 'center' }}>
                    <div style={{ 
                      display: 'inline-block', 
                      width: '18px', 
                      height: '18px', 
                      border: '2px solid var(--accent-primary)', 
                      borderTopColor: 'transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 0.8s linear infinite',
                      marginBottom: '6px'
                    }} />
                    <div>Loading...</div>
                  </div>
                ) : recentlyViewed.length === 0 ? (
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
                            style={{ width: '70px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '2px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {video.title}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              <span style={{ 
                                color: item.watchStatus === 'Completed' ? '#10b981' : 'var(--accent-primary)', 
                                fontWeight: 600 
                              }}>
                                {item.watchStatus || 'Watched'} ({item.completionPercentage}%)
                              </span>
                              {item.watchDuration && (
                                <>
                                  <span>•</span>
                                  <span>{item.watchDuration}</span>
                                </>
                              )}
                            </div>
                            {item.startedAt && (
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                                📅 {item.startedAt}
                              </div>
                            )}
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
        <div style={{ display: 'flex', alignItems: 'center', width: '118px', minWidth: '118px' }} className="nav-lang-switcher">
          <PremiumSelect
            options={[
              { id: 'en', name: 'English' },
              { id: 'hi', name: 'हिंदी' },
              { id: 'kn', name: 'ಕನ್ನಡ' }
            ]}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            searchable={false}
            size="small"
            style={{ width: '118px', minWidth: '118px' }}
            buttonStyle={{
              height: '34px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}
          />
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

        {/* Notifications */}
        {user && (
          <div ref={notifRef} style={{ position: 'relative' }} className="nav-notifications">
            <div onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
            }} className="notification-bell" style={{ position: 'relative', cursor: 'pointer', padding: '6px' }}>
              <span style={{ fontSize: '20px' }}>🔔</span>
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </div>

            {showNotifDropdown && (
              <div className="notification-dropdown glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={async () => {
                        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        if (unreadIds.length > 0) {
                          try {
                            await api.notifications.saveAllNotifications(unreadIds, 'read');
                          } catch (e) {
                            console.error('Failed to save all notifications read status', e);
                          }
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={`notification-item ${n.read ? '' : 'unread'}`}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        marginBottom: '6px',
                        backgroundColor: n.read ? 'transparent' : 'rgba(124, 58, 237, 0.08)',
                        borderLeft: n.read ? 'none' : '3px solid #7c3aed',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="notification-title" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{n.title}</span>
                        {!n.read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7c3aed' }}></span>}
                      </div>
                      <div className="notification-msg" style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.message}</div>
                      <div className="notification-date" style={{ fontSize: '11px', color: 'var(--text-tertiary, #a1a1aa)', marginTop: '4px' }}>{new Date(n.date).toLocaleString()}</div>
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
