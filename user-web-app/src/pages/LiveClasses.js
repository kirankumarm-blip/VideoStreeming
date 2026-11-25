import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../utils/apiUrl';
import { getAssetBaseUrl } from '../utils/assetUrl';
import { logFormError, extractRequestId } from '../utils/formErrorHandler';
import { getDemoLiveClasses } from '../services/liveClassMock';

/**
 * Validates and processes the Live Classes API response.
 * Treats empty array as valid success, and sets error on non-ok or non-array responses.
 */
export const processLiveClassesApiResponse = (res, data) => {
  if (!res || !res.ok) {
    return {
      classes: [],
      error: 'Live classes could not be loaded at this moment'
    };
  }
  if (!Array.isArray(data)) {
    return {
      classes: [],
      error: 'Live classes could not be loaded at this moment'
    };
  }
  return {
    classes: data,
    error: null
  };
};

/**
 * Normalizes class status string using trimming and case-insensitivity.
 * Handles 'LIVE', 'Live', 'live', '  UPCOMING  ', etc.
 */
export const normalizeStatus = (status) => {
  if (typeof status !== 'string') return '';
  return status.trim().toLowerCase();
};

/**
 * Retrieves the start/scheduled time field from a class object.
 */
export const getClassStartTime = (cls) => {
  if (!cls || typeof cls !== 'object') return null;
  return cls.scheduledAt || cls.startTime || cls.scheduledTime || cls.startDate || null;
};

/**
 * Formats a valid date/time string for display in user locale.
 */
export const formatSessionDateTime = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return d.toLocaleString();
  }
};

/**
 * Selects a confirmed live class deterministically without mutating the original array.
 * If multiple classes are live, sorts by earliest start time (if valid), breaking ties by ID.
 * Returns null if no class has status 'live'.
 */
export const getDeterministicLiveClass = (classes) => {
  if (!Array.isArray(classes)) return null;
  const liveList = classes.filter(cls => cls && normalizeStatus(cls.status) === 'live');
  if (liveList.length === 0) return null;
  if (liveList.length === 1) return liveList[0];

  return [...liveList].sort((a, b) => {
    const timeA = new Date(getClassStartTime(a) || 0).getTime();
    const timeB = new Date(getClassStartTime(b) || 0).getTime();
    const validA = !isNaN(timeA) && timeA > 0;
    const validB = !isNaN(timeB) && timeB > 0;
    if (validA && validB && timeA !== timeB) {
      return timeA - timeB;
    }
    return String(a.id || '').localeCompare(String(b.id || ''));
  })[0];
};

/**
 * Finds the nearest future scheduled session without mutating the original array.
 * Excludes completed, cancelled, past, and live sessions.
 */
export const getNextUpcomingSession = (classes, referenceTime = Date.now()) => {
  if (!Array.isArray(classes)) return null;

  const excludedStatuses = new Set(['completed', 'cancelled', 'canceled', 'ended', 'live', 'expired', 'past']);

  const validUpcoming = classes.filter(cls => {
    if (!cls || typeof cls !== 'object') return false;
    const status = normalizeStatus(cls.status);
    if (excludedStatuses.has(status)) return false;

    const rawTime = getClassStartTime(cls);
    if (!rawTime) return false;

    const sessionDate = new Date(rawTime);
    if (isNaN(sessionDate.getTime())) return false;

    // Must be in the future (exclude past sessions)
    return sessionDate.getTime() >= referenceTime;
  });

  if (validUpcoming.length === 0) return null;

  return [...validUpcoming].sort((a, b) => {
    const timeA = new Date(getClassStartTime(a)).getTime();
    const timeB = new Date(getClassStartTime(b)).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return String(a.id || '').localeCompare(String(b.id || ''));
  })[0];
};

const LiveClasses = ({ initialDemoMode = false }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const currentUser = user || {};

  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'live', 'upcoming', 'completed'
  const [isDemoMode, setIsDemoMode] = useState(() => {
    if (initialDemoMode) return true;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('demo') === 'true' || window.location.hash.includes('demo');
    }
    return false;
  });

  const isFetchingRef = useRef(false);

  const loadDemoData = () => {
    const demoData = getDemoLiveClasses();
    setClasses(demoData);
    setError(null);
    setIsLoading(false);
    setIsDemoMode(true);
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    fetchClasses(true);
  };

  const toggleDemoMode = () => {
    if (isDemoMode) {
      exitDemoMode();
    } else {
      loadDemoData();
    }
  };

  const fetchClasses = async (isManual = false) => {
    // Prevent duplicate concurrent requests from repeated clicks
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Show loading indicator on manual triggers or initial mount
    if (isManual || classes.length === 0) {
      setIsLoading(true);
    }

    try {
      const apiBase = getApiBaseUrl() || getAssetBaseUrl();
      const res = await fetch(`${apiBase}/api/live-classes`);

      if (res.ok) {
        const data = await res.json();
        const processed = processLiveClassesApiResponse(res, data);
        setClasses(processed.classes);
        setError(processed.error);

        if (processed.error) {
          logFormError({
            form: 'LiveClassesListing',
            status: res.status,
            message: 'Invalid API response format: expected array'
          });
        }
      } else {
        // HTTP 4xx / 5xx error
        setClasses([]);
        setError('Live classes could not be loaded at this moment');
        const reqInfo = extractRequestId(res, null);
        logFormError({
          form: 'LiveClassesListing',
          requestId: reqInfo.requestId,
          status: res.status,
          message: `Live classes request failed with HTTP ${res.status}`
        });
      }
    } catch (err) {
      // Network error, timeout, or DNS failure
      setClasses([]);
      setError('Live classes could not be loaded at this moment');
      logFormError({
        form: 'LiveClassesListing',
        status: 'NETWORK_ERROR',
        message: err?.message || 'Network error fetching live classes'
      });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      loadDemoData();
      return;
    }
    fetchClasses(true);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
        if (!isDemoMode) {
          fetchClasses(false);
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isDemoMode]);

  const liveNow = getDeterministicLiveClass(classes);
  const nextSession = getNextUpcomingSession(classes);

  const filteredClasses = classes.filter(cls => {
    if (filter === 'all') return true;
    return normalizeStatus(cls.status) === filter;
  });

  const getStatusBadge = (status) => {
    switch (normalizeStatus(status)) {
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
            background: liveNow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.12)',
            border: liveNow ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.25)',
            color: liveNow ? '#ef4444' : '#818cf8',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '14px'
          }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: liveNow ? '#ef4444' : '#818cf8', 
              animation: liveNow ? 'pulse 1.5s infinite' : 'none' 
            }} />
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
            <button
              data-testid="hero-join-live-btn"
              disabled={!liveNow || isLoading || !!error}
              onClick={() => {
                if (liveNow && liveNow.id) {
                  navigate(`/live/${liveNow.id}`);
                }
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                background: liveNow ? '#ef4444' : 'var(--bg-secondary, rgba(255, 255, 255, 0.08))',
                color: liveNow ? '#fff' : 'var(--text-secondary)',
                border: liveNow ? 'none' : '1px solid var(--border-color)',
                fontWeight: 700,
                fontSize: '15px',
                cursor: liveNow ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: liveNow ? '0 4px 16px rgba(239, 68, 68, 0.35)' : 'none',
                opacity: liveNow ? 1 : 0.65,
                transition: 'all 0.2s ease'
              }}
            >
              {isLoading ? (
                <span>{t('liveClass.checkingStatus', 'Checking live status...')}</span>
              ) : error ? (
                <span>{t('liveClass.statusUnavailable', 'Live session status unavailable')}</span>
              ) : liveNow ? (
                <>
                  <span>🔴</span>
                  <span>{t('liveClass.joinCurrentLive', 'Join Live Webcast Now')}</span>
                </>
              ) : (
                <span>{t('liveClass.noLiveClassRightNow', 'No live class right now')}</span>
              )}
            </button>

            {/* Next session display underneath the hero button */}
            {!liveNow && !isLoading && !error && (
              <div
                data-testid="next-session-info"
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📅</span>
                <span>
                  {nextSession ? (
                    `${t('liveClass.nextSessionPrefix', 'Next session')}: ${formatSessionDateTime(getClassStartTime(nextSession))}`
                  ) : (
                    t('liveClass.noSessionsScheduled', 'No sessions scheduled yet.')
                  )}
                </span>
              </div>
            )}
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

      {/* Demo Mode Notification Banner */}
      {isDemoMode && (
        <div 
          data-testid="demo-mode-banner"
          style={{
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.18))',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>✨</span>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              <strong>Demo Showcase Mode:</strong> Showing interactive static masterclasses with real-time poll, chat, and hand-raise features.
            </span>
          </div>
          <button
            type="button"
            onClick={exitDemoMode}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '6px 14px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              transition: 'all 0.15s'
            }}
          >
            Switch to Live API
          </button>
        </div>
      )}

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            data-testid="toggle-demo-mode-btn"
            onClick={toggleDemoMode}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: isDemoMode ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-secondary)',
              color: isDemoMode ? '#818cf8' : 'var(--text-secondary)',
              border: isDemoMode ? '1px solid #6366f1' : '1px solid var(--border-color)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <span>✨</span>
            <span>{isDemoMode ? 'Exit Demo' : 'Load Demo Data'}</span>
          </button>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {error ? 0 : filteredClasses.length} {t('liveClass.webcastsAvailable', 'webcasts available')}
          </div>
        </div>
      </div>

      {/* Webcasts Grid / Status States */}
      {isLoading ? (
        <div 
          data-testid="live-classes-loading"
          style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}
        >
          Loading virtual classrooms...
        </div>
      ) : error ? (
        <div 
          data-testid="live-classes-error"
          role="alert"
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Live classes could not be loaded at this moment
          </h3>
          <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {t('liveClass.errorSubtext', 'Please check your connection and try again.')}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="retry-btn"
              onClick={() => fetchClasses(true)}
              disabled={isLoading}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                background: '#6366f1',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🔄</span>
              <span>{isLoading ? 'Retrying...' : t('liveClass.retry', 'Retry')}</span>
            </button>
            <button
              type="button"
              data-testid="load-demo-btn"
              onClick={loadDemoData}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              <span>✨</span>
              <span>Load Demo Classes</span>
            </button>
          </div>
        </div>
      ) : classes.length === 0 ? (
        <div 
          data-testid="live-classes-empty"
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📡</div>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
            No live classes available
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            {t('liveClass.emptySub', 'Check back soon for upcoming live interactive sessions.')}
          </p>
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              data-testid="load-demo-empty-btn"
              onClick={loadDemoData}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              <span>✨</span>
              <span>Load Demo Classes</span>
            </button>
          </div>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div 
          data-testid="live-classes-filtered-empty"
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}
        >
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
            const isLive = normalizeStatus(cls.status) === 'live';
            const normStatus = normalizeStatus(cls.status);
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
                    width={320}
                    height={180}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      aspectRatio: '16 / 9'
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
                    <span>{typeof cls.attendeesCount === 'number' && !isNaN(cls.attendeesCount) && cls.attendeesCount >= 0 ? cls.attendeesCount : '—'}</span>
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
                      {isLive ? t('liveClass.enterClassroom', 'Enter Classroom') : (normStatus === 'upcoming' ? t('liveClass.viewDetails', 'View Details') : t('liveClass.watchRecording', 'Watch Recording'))}
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
