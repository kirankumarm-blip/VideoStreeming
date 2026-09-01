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
    { id: 'home', label: t('nav.home'), icon: '🏠', path: '/' },
    { id: 'explore', label: t('sidebar.explore', 'Explore'), icon: '🧭', path: '/?view=explore' },
    { id: 'categories', label: t('sidebar.categories', 'Categories'), icon: '🏷️', path: '/?view=categories' },
    { id: 'quiz', label: t('sidebar.quiz', 'Quiz'), icon: '📝', path: '/quizzes' },
    { id: 'certificates', label: t('sidebar.certificates', 'Certificates'), icon: '📜', path: '/certificates' },
    { id: 'watch_later', label: t('sidebar.watchLater', 'Watch Later'), icon: '⏳', path: '/?view=watch_later' },
    { id: 'downloads', label: t('sidebar.downloads', 'Downloads'), icon: '📥', path: '/?view=downloads' },
    { id: 'settings', label: t('sidebar.settings', 'Settings'), icon: '⚙️', path: '/?view=settings' }
  ];

  const handleItemClick = (item) => {
    navigate(item.path);
    if (onClose) onClose(); // Close mobile drawer on item click
  };

  return (
    <div 
      className={`youtube-sidebar ${isOpen ? 'open' : ''}`}
      style={{
        width: '240px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingTop: '12px',
        paddingBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'sticky',
        top: '60px',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        transition: 'all 0.25s ease',
        zIndex: 85,
        boxSizing: 'border-box'
      }}
    >
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
                background: isSelected ? 'var(--menu-active-bg)' : 'none',
                border: 'none',
                borderRadius: '10px',
                color: isSelected ? 'var(--menu-active-color)' : 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s, color 0.2s',
                outline: 'none',
                marginTop: idx === 0 ? '0px' : undefined
              }}
              onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)')}
              onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Language Selector in Sidebar */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '16px',
          paddingBottom: '20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }} className="sidebar-lang-section">
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🌐</span> {t('nav.language', 'Language')}
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
              height: '36px',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--bg-tertiary)'
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
