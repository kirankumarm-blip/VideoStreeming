import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentUser } from '../services/api';

const LiveClasses = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const currentUser = getCurrentUser() || {};

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'live', 'upcoming', 'completed'

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/live-classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (err) {
      console.error('Failed to fetch live classes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    const interval = setInterval(fetchClasses, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredClasses = classes.filter(cls => {
    if (filter === 'all') return true;
    return cls.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return (
          <span style={{
            background: '#ef4444',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
            {t('liveClass.liveBadge', 'LIVE NOW')}
          </span>
        );
      case 'upcoming':
        return (
          <span style={{
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            {t('liveClass.upcomingBadge', 'UPCOMING')}
          </span>
        );
      case 'completed':
        return (
          <span style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            {t('liveClass.recordedBadge', 'RECORDED')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      padding: '32px 40px',
      maxWidth: '1400px',
      margin: '0 auto',
      color: 'var(--text-primary)',
      minHeight: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(239, 68, 68, 0.12) 100%)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '36px',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '780px', position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '14px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
            {t('liveClass.heroPill', 'REAL-TIME INTERACTIVE CLASSROOM')}
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: 800,
            margin: '0 0 12px',
            lineHeight: 1.25,
            color: 'var(--text-primary)'
          }}>
            {t('liveClass.heroTitle', 'Virtual Classroom & Live Webcasts')}
          </h1>

          <p style={{
            fontSize: '16px',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            margin: '0 0 24px'
          }}>
            {t('liveClass.heroSubtitle', 'Learn directly from industry masters. Participate in real-time polls, raise your hand ✋ to ask questions live, and collaborate with classmates without external apps.')}
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const liveOne = classes.find(c => c.status === 'live');
                if (liveOne) {
                  navigate(`/live/${liveOne.id}`);
                } else if (classes.length > 0) {
                  navigate(`/live/${classes[0].id}`);
                }
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)'
              }}
            >
              <span>🔴</span>
              {t('liveClass.joinCurrentLive', 'Join Live Webcast Now')}
            </button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div style={{
          position: 'absolute',
          right: '-40px',
          bottom: '-40px',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: t('liveClass.filterAll', 'All Webcasts') },
            { id: 'live', label: t('liveClass.filterLive', '🔴 Live Now') },
            { id: 'upcoming', label: t('liveClass.filterUpcoming', '📅 Upcoming') },
            { id: 'completed', label: t('liveClass.filterPast', '📼 Recorded Archive') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: filter === tab.id ? 'var(--bg-secondary)' : 'none',
                color: filter === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: filter === tab.id ? '1px solid var(--border-color)' : '1px solid transparent',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {filteredClasses.length} {t('liveClass.webcastsAvailable', 'webcasts available')}
        </div>
      </div>

      {/* Webcasts Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          Loading virtual classrooms...
        </div>
      ) : filteredClasses.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📡</div>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
            {t('liveClass.noSessionsFound', 'No live webcasts in this category')}
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Check back soon or explore the recorded archive of past masterclasses.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '24px'
        }}>
          {filteredClasses.map((cls) => {
            const isLive = cls.status === 'live';
            return (
              <div
                key={cls.id}
                onClick={() => navigate(`/live/${cls.id}`)}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  border: isLive ? '2px solid rgba(239, 68, 68, 0.6)' : '1px solid var(--border-color)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = isLive 
                    ? '0 12px 28px rgba(239, 68, 68, 0.25)' 
                    : '0 12px 28px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Thumbnail Header */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  background: '#0a0a0a',
                  overflow: 'hidden'
                }}>
                  <img
                    src={cls.thumbnail}
                    alt={cls.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />

                  {/* Status Overlay Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 2
                  }}>
                    {getStatusBadge(cls.status)}
                  </div>

                  {/* Viewer / Registered Attendees Count */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>👥</span>
                    <span>{cls.attendeesCount || 0}</span>
                  </div>
                </div>

                {/* Content Details */}
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      color: '#6366f1',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px'
                    }}>
                      {cls.category}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      ⏱️ {cls.durationMinutes || 60} mins
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    margin: '0 0 8px',
                    lineHeight: 1.35,
                    color: 'var(--text-primary)'
                  }}>
                    {cls.title}
                  </h3>

                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    margin: '0 0 16px',
                    flex: 1
                  }}>
                    {cls.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: 'auto'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cls.instructor}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {cls.instructorRole}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/live/${cls.id}`);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: isLive ? '#ef4444' : 'var(--bg-primary)',
                        color: isLive ? '#fff' : 'var(--text-primary)',
                        border: isLive ? 'none' : '1px solid var(--border-color)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{isLive ? '🚀' : '👀'}</span>
                      {isLive ? t('liveClass.enterClassroom', 'Enter Classroom') : (cls.status === 'upcoming' ? t('liveClass.viewDetails', 'View Details') : t('liveClass.watchRecording', 'Watch Recording'))}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveClasses;
