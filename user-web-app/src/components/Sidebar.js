import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import PremiumSelect from './PremiumSelect';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();

  const searchParams = new URLSearchParams(location.search);

  const activeView = location.pathname === '/quizzes' 
    ? 'quiz' 
    : (location.pathname === '/certificates' ? 'certificates' : (location.pathname === '/' ? (searchParams.get('view') || 'home') : ''));

  const menuItems = [
    {
      id: 'home',
      label: t('nav.home', 'Home'),
      subLabel: t('sidebar.subHome', 'Discover stories'),
      path: '/',
      icon: () => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      )
    },
    {
      id: 'explore',
      label: t('sidebar.explore', 'Explore'),
      subLabel: t('sidebar.subExplore', 'Find new content'),
      path: '/?view=explore',
      icon: () => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      )
    },
    {
      id: 'categories',
      label: t('sidebar.categories', 'Categories'),
      subLabel: t('sidebar.subCategories', 'Browse by genre'),
      path: '/?view=categories',
      icon: () => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2"></rect>
          <rect x="2" y="14" width="20" height="8" rx="2"></rect>
          <line x1="6" y1="6" x2="6.01" y2="6"></line>
          <line x1="6" y1="18" x2="6.01" y2="18"></line>
        </svg>
      )
    },
    {
      id: 'quiz',
      label: t('sidebar.quiz', 'Quiz'),
      subLabel: t('sidebar.subQuiz', 'Test your knowledge'),
      path: '/quizzes',
      icon: () => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
          <path d="M4 22h16"></path>
          <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"></path>
          <path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34"></path>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path>
        </svg>
      )
    },
    {
      id: 'certificates',
      label: t('sidebar.certificates', 'Certificates'),
      subLabel: t('sidebar.subCertificates', 'Your achievements'),
      path: '/certificates',
      icon: () => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      )
    },
    {
      id: 'watch_later',
      label: t('sidebar.watchLater', 'Watch Later'),
      subLabel: t('sidebar.subWatchLater', 'Save to watch later'),
      path: '/?view=watch_later',
      icon: () => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    {
      id: 'downloads',
      label: t('sidebar.downloads', 'Downloads'),
      subLabel: t('sidebar.subDownloads', 'Offline viewing'),
      path: '/?view=downloads',
      icon: () => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      )
    },
    {
      id: 'settings',
      label: t('sidebar.settings', 'Settings'),
      subLabel: t('sidebar.subSettings', 'App preferences'),
      path: '/?view=settings',
      icon: () => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    }
  ];

  const handleItemClick = (item) => {
    navigate(item.path);
    if (onClose) onClose(); // Close mobile drawer on item click
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose} 
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 990,
            backdropFilter: 'blur(3px)'
          }}
          className="mobile-sidebar-backdrop"
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <div 
        className={`youtube-sidebar ${isOpen ? 'open' : ''} premium-sidebar-container`}
        style={{
          width: '265px',
          minWidth: '265px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingTop: '16px',
          paddingBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          position: 'sticky',
          top: '60px',
          height: 'calc(100vh - 60px)',
          overflowY: 'auto',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 995,
          boxSizing: 'border-box'
        }}
      >
        {/* Menu Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item) => {
            const isSelected = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`premium-sidebar-item ${isSelected ? 'active' : ''}`}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '9px 10px',
                  background: isSelected 
                    ? 'var(--sidebar-active-bg, linear-gradient(90deg, rgba(236, 72, 153, 0.12) 0%, rgba(139, 92, 246, 0.16) 100%))' 
                    : 'transparent',
                  border: isSelected ? '1px solid var(--sidebar-active-border, rgba(139, 92, 246, 0.3))' : '1px solid transparent',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  outline: 'none',
                  boxShadow: isSelected ? '0 4px 14px rgba(139, 92, 246, 0.08)' : 'none'
                }}
              >
                {/* Left Neon Indicator Pill for Active Item */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    left: '-2px',
                    top: '12%',
                    height: '76%',
                    width: '3.5px',
                    borderRadius: '4px',
                    background: 'linear-gradient(180deg, #ec4899 0%, #8b5cf6 100%)',
                    boxShadow: '0 0 8px rgba(236, 72, 153, 0.8)'
                  }} />
                )}

                {/* Icon Container */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isSelected 
                    ? 'rgba(234, 179, 8, 0.14)' 
                    : 'var(--bg-tertiary, rgba(255,255,255,0.04))',
                  border: isSelected 
                    ? '1.5px solid #eab308' 
                    : '1px solid var(--border-color)',
                  color: isSelected 
                    ? '#eab308' 
                    : 'var(--accent-secondary, #8b5cf6)',
                  transition: 'all 0.2s ease'
                }}>
                  {item.icon(isSelected)}
                </div>

                {/* Text (Title + SubLabel) */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '2px' }}>
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: isSelected ? 700 : 600, 
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.label}
                  </span>
                  <span style={{ 
                    fontSize: '11px', 
                    color: isSelected ? 'var(--text-secondary)' : 'var(--text-tertiary, #94a3b8)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 400
                  }}>
                    {item.subLabel}
                  </span>
                </div>

                {/* Right Arrow Chevron */}
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    color: isSelected ? '#a855f7' : 'var(--text-secondary)',
                    opacity: isSelected ? 1 : 0.4,
                    flexShrink: 0,
                    transition: 'transform 0.2s ease, color 0.2s ease'
                  }}
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            );
          })}
        </div>

        {/* "Go Premium" Banner Card */}
        <div style={{
          marginTop: '16px',
          padding: '14px',
          borderRadius: '14px',
          background: 'var(--premium-card-bg, linear-gradient(135deg, rgba(30, 27, 75, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%))',
          border: '1px solid var(--premium-card-border, rgba(234, 179, 8, 0.3))',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle sparkle graphic */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(234, 179, 8, 0.18)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}>
              👑
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Go Premium
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Unlock all features
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              navigate('/profile');
              if (onClose) onClose();
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000000',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>Upgrade Now</span>
            <span style={{ fontSize: '13px' }}>➔</span>
          </button>
        </div>

        {/* Bottom Language Selector Card (Mobile Only) */}
        <div className="sidebar-mobile-only-lang" style={{
          marginTop: 'auto',
          paddingTop: '14px'
        }}>
          <div style={{
            padding: '10px 12px',
            borderRadius: '14px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: 'var(--text-secondary)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}>
              <span style={{ fontSize: '14px' }}>🌐</span> {t('nav.language', 'Language')}
            </div>
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
              style={{ width: '100%' }}
              buttonStyle={{
                height: '34px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--bg-secondary)'
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
