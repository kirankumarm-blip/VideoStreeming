import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentUser } from '../services/api';

const StudyRooms = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const user = getCurrentUser() || {};

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // Create room modal / state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('1');
  const [creating, setCreating] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/study-rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch study rooms', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000); // Poll active rooms every 10s
    return () => clearInterval(interval);
  }, []);

  const handleJoinWithCode = async (e) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;

    try {
      const res = await fetch(`http://localhost:5000/api/study-rooms/${code}`);
      if (res.ok) {
        const room = await res.json();
        navigate(`/watch/${room.videoId || 1}?room=${code}`);
      } else {
        setJoinError(t('studyRooms.notFound', 'Room not found. Please verify the 6-character code.'));
        setTimeout(() => setJoinError(''), 4000);
      }
    } catch (err) {
      setJoinError(t('studyRooms.networkError', 'Unable to connect to study room service.'));
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);

    try {
      const payload = {
        title: newRoomTitle.trim() || `${user.name || 'Learner'}'s Study Room`,
        courseId: selectedCourse,
        courseTitle: selectedCourse === '1' ? 'Full Stack Web Development with React & Node' : 'Complete Python Bootcamp 2026',
        videoId: selectedCourse === '1' ? '1' : '2',
        thumbnail: selectedCourse === '1' 
          ? 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600'
          : 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
        userName: user.name || user.username || 'Learner',
        userId: user.id || 'u-user'
      };

      const res = await fetch('http://localhost:5000/api/study-rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/watch/${payload.videoId}?room=${data.roomId}`);
      }
    } catch (err) {
      console.error('Failed to create room', err);
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  const formatTimestamp = (sec) => {
    if (!sec || typeof sec !== 'number') return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{
      padding: '32px 40px',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>👥</span>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800 }}>
              {t('studyRooms.title', 'Virtual Study Rooms & Watch Parties')}
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {t('studyRooms.subtitle', 'Watch video lessons together with friends, synchronized play/pause, and real-time chat.')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '12px 22px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span>➕</span>
          <span>{t('studyRooms.createBtn', 'Start New Study Room')}</span>
        </button>
      </div>

      {/* Quick Join Card with Room Code */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '24px 28px',
        marginBottom: '36px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '420px' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 700 }}>
            {t('studyRooms.haveCodeTitle', 'Have an invite code from a friend?')}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            {t('studyRooms.haveCodeSub', 'Enter the 6-character room code to instantly jump into their live watch party.')}
          </p>
        </div>

        <form onSubmit={handleJoinWithCode} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            placeholder="e.g. STUDY-7492"
            maxLength={14}
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '1px',
              width: '200px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!joinCodeInput.trim()}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: joinCodeInput.trim() ? '#6366f1' : 'var(--bg-tertiary)',
              color: joinCodeInput.trim() ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: joinCodeInput.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s'
            }}
          >
            {t('studyRooms.joinBtn', 'Join Room ➔')}
          </button>
        </form>

        {joinError && (
          <div style={{ width: '100%', color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>
            ⚠️ {joinError}
          </div>
        )}
      </div>

      {/* Live Study Rooms Section */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔴</span> {t('studyRooms.activeTitle', 'Active Live Watch Parties')}
        </h2>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {rooms.length} {t('studyRooms.roomsActive', 'rooms live now')}
        </span>
      </div>

      {loading && rooms.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading active rooms...
        </div>
      ) : rooms.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'var(--bg-secondary)',
          borderRadius: '20px',
          border: '1px dashed var(--border-color)'
        }}>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🛋️</span>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700 }}>
            {t('studyRooms.noActive', 'No active study rooms at the moment')}
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {t('studyRooms.noActiveSub', 'Be the first to start a watch party and invite your friends or batchmates!')}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: '#6366f1',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {t('studyRooms.createBtn', 'Start New Study Room')}
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {rooms.map((room) => (
            <div
              key={room.id}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                boxShadow: '0 4px 18px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.05)';
              }}
            >
              {/* Thumbnail Container */}
              <div style={{ position: 'relative', width: '100%', height: '170px', background: '#000' }}>
                <img
                  src={room.thumbnail}
                  alt={room.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                />

                {/* Live Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(239, 68, 68, 0.95)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  letterSpacing: '0.4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
                  LIVE
                </div>

                {/* Members Pill */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span>🟢</span>
                  <span>{room.membersCount} online</span>
                </div>

                {/* Progress Timestamp */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  ▶ At {formatTimestamp(room.currentTime)}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                    {room.courseTitle}
                  </div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {room.title}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                    <span>Hosted by</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{room.hostName}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/watch/${room.videoId || 1}?room=${room.id}`)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
                    }}
                  >
                    <span>Join Watch Party</span>
                    <span>➔</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/#/watch/${room.videoId || 1}?room=${room.id}`;
                      navigator.clipboard.writeText(shareUrl);
                      alert(`Invite link for room ${room.id} copied to clipboard!`);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="Copy invite link"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Study Room Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }} onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            boxShadow: '0 20px 48px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>👥</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                  {t('studyRooms.modalCreateTitle', 'Create a Live Study Room')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  {t('studyRooms.roomNameLabel', 'Room Name / Topic')}
                </label>
                <input
                  type="text"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  placeholder="e.g. Chapter 2 Quiz Prep & Code Review"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  {t('studyRooms.selectCourseLabel', 'Select Course to Watch Together')}
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="1">Full Stack Web Development with React & Node</option>
                  <option value="2">Complete Python Bootcamp 2026</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t('plans.cancel', 'Cancel')}
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: creating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
                  }}
                >
                  {creating ? 'Starting Room...' : 'Launch Watch Party 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRooms;
