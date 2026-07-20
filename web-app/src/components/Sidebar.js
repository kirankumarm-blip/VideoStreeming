import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // Get active view from search parameters (query string)
  const searchParams = new URLSearchParams(location.search);
  const activeView = location.pathname === '/' ? (searchParams.get('view') || 'home') : '';

  const menuItems = [
    { id: 'home', label: t('nav.home'), icon: '🏠', path: '/' },
    { id: 'explore', label: t('sidebar.explore', 'Explore'), icon: '🧭', path: '/?view=explore' },
    { id: 'categories', label: t('sidebar.categories', 'Categories'), icon: '🏷️', path: '/?view=categories' },
    { id: 'my_learning', label: t('sidebar.myLearning', 'My Learning'), icon: '📖', path: '/?view=my_learning' },
    { id: 'watch_later', label: t('sidebar.watchLater', 'Watch Later'), icon: '⏳', path: '/?view=watch_later' },
    { id: 'downloads', label: t('sidebar.downloads', 'Downloads'), icon: '📥', path: '/?view=downloads' },
    { id: 'certificates', label: t('sidebar.certificates', 'Certificates'), icon: '🏆', path: '/?view=certificates' },
    { id: 'progress', label: t('sidebar.progressTracker', 'Progress Tracker'), icon: '📊', path: '/?view=progress' },
    { id: 'community', label: t('sidebar.community', 'Community'), icon: '💬', path: '/?view=community' },
    { id: 'settings', label: t('sidebar.settings', 'Settings'), icon: '⚙️', path: '/?view=settings' }
  ];

  const handleItemClick = (item) => {
    navigate(item.path);
    if (onClose) onClose(); // Close mobile drawer on item click
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 990,
            backdropFilter: 'blur(4px)'
          }}
          className="mobile-sidebar-backdrop"
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`youtube-sidebar ${isOpen ? 'open' : ''}`}
        style={{
          width: '240px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          paddingTop: '0px',
          paddingBottom: '0px',
          paddingLeft: '12px',
          paddingRight: '12px',
          marginTop: '0px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          position: 'sticky',
          top: '60px',
          height: 'calc(100vh - 60px)',
          overflowY: 'auto',
          transition: 'transform 0.3s ease, left 0.3s ease',
          zIndex: 995
        }}
      >
        {/* Mobile Sidebar Brand Header */}
        <div className="mobile-sidebar-brand-header" style={{
          alignItems: 'center',
          gap: '16px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '10px',
          width: '100%',
          justifyContent: 'flex-start'
        }}>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
            type="button"
          >
            ✕
          </button>
          <span style={{ 
            fontFamily: "'Space Grotesk', sans-serif", 
            fontWeight: 700, 
            fontSize: '18px', 
            background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <defs>
                <linearGradient id="logoGradSide" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <path d="M34,16 C26,16 22,22 22,30 L22,70 C22,78 28,84 36,84 L44,84 C58,84 76,74 76,58 C76,42 58,32 44,32 L44,45 C52,45 62,50 62,58 C62,66 52,71 44,71 C38,71 35,67 35,62 L35,30 C35,24 38,20 44,20 L52,20 L52,8 L34,16 Z" fill="url(#logoGradSide)" />
              <path d="M44,48 L56,55 L44,62 Z" fill="#2563eb" />
            </svg>
            LurnAx
          </span>
        </div>

        {menuItems.map((item, idx) => {
          const isSelected = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
                padding: '12px 16px',
                background: isSelected ? 'rgba(229, 9, 20, 0.12)' : 'none',
                border: 'none',
                borderRadius: '10px',
                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s, color 0.2s',
                outline: 'none',
                marginTop: idx === 0 ? '0px' : undefined
              }}
              onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default Sidebar;
