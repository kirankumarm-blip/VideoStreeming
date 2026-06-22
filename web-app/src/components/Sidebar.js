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
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          position: 'sticky',
          top: '72px',
          height: 'calc(100vh - 72px)',
          overflowY: 'auto',
          transition: 'transform 0.3s ease, left 0.3s ease',
          zIndex: 995
        }}
      >
        {menuItems.map(item => {
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
                outline: 'none'
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
