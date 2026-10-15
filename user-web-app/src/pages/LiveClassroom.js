import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentUser } from '../services/api';

const LiveClassroom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const currentUser = getCurrentUser() || {};

  const [liveClass, setLiveClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Real-time state
  const [attendeesCount, setAttendeesCount] = useState(42);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [handRaiseNotice, setHandRaiseNotice] = useState('');
  const [activePoll, setActivePoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [bottomTab, setBottomTab] = useState('notes'); // 'notes', 'resources', 'bio'
  const [copySuccess, setCopySuccess] = useState('');
  const [isLiveWebcamActive, setIsLiveWebcamActive] = useState(false);

  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const chatEndRef = useRef(null);

  // Fetch initial class details
  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/live-classes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLiveClass(data);
        setAttendeesCount(data.attendeesCount || 0);
        setActivePoll(data.activePoll || null);
        setChatMessages(data.chatMessages || []);

        // Check if current user already raised hand
        if (data.handRaises && currentUser.id) {
          const raised = data.handRaises.some(h => String(h.studentId) === String(currentUser.id));
          setIsHandRaised(raised);
        }
      } else {
        setError(t('liveClass.notFound', 'Classroom session not found or concluded.'));
      }
    } catch (err) {
      console.error('Failed to fetch class', err);
      setError(t('liveClass.networkError', 'Failed to connect to the live classroom.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [id]);

  // Handle receiving WebRTC live video/audio from instructor
  const handleReceiveOffer = async (offer, instructorId) => {
    try {
      if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close(); } catch (e) {}
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams && event.streams[0]) {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(err => console.warn('Learner play stream error:', err));
          setIsLiveWebcamActive(true);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'WEBRTC_ICE_CANDIDATE',
            classId: id,
            to: instructorId,
            from: currentUser.id || 'student-guest',
            candidate: event.candidate
          }));
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'WEBRTC_ANSWER',
          classId: id,
          to: instructorId,
          from: currentUser.id || 'student-guest',
          answer
        }));
      }
    } catch (err) {
      console.error('Error handling WebRTC offer:', err);
    }
  };

  // WebSocket Connection
  useEffect(() => {
    if (!id) return;

    const wsUrl = `ws://${window.location.hostname || 'localhost'}:5000`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'JOIN_LIVE_CLASS',
        classId: id,
        user: {
          id: currentUser.id || `u-${Date.now()}`,
          name: currentUser.name || currentUser.username || 'Learner',
          role: 'student',
          avatar: '🧑‍🎓'
        }
      }));

      // In case instructor is already broadcasting live, request the stream
      ws.send(JSON.stringify({
        type: 'REQUEST_STREAM',
        classId: id,
        studentId: currentUser.id || `u-${Date.now()}`
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'LIVE_CLASS_STATE') {
          setAttendeesCount(msg.liveClass.attendeesCount || 0);
          setActivePoll(msg.liveClass.activePoll || null);
          setChatMessages(msg.liveClass.chatMessages || []);
        } else if (msg.type === 'ATTENDEE_UPDATE') {
          if (typeof msg.attendeesCount === 'number') {
            setAttendeesCount(msg.attendeesCount);
          }
        } else if (msg.type === 'LIVE_CHAT_MESSAGE') {
          setChatMessages(prev => [...prev, msg.message]);
        } else if (msg.type === 'HAND_QUEUE_UPDATED') {
          if (currentUser.id) {
            const raised = (msg.handRaises || []).some(h => String(h.studentId) === String(currentUser.id));
            setIsHandRaised(raised);
          }
        } else if (msg.type === 'POLL_LAUNCHED') {
          setActivePoll(msg.poll);
          setHasVoted(false);
          setSelectedOptionId(null);
        } else if (msg.type === 'POLL_UPDATED') {
          setActivePoll(msg.poll);
        } else if (msg.type === 'POLL_CLOSED') {
          setActivePoll(msg.poll);
        } else if (msg.type === 'CLASS_STATUS_CHANGED') {
          setLiveClass(prev => prev ? { ...prev, status: msg.status } : prev);
        } else if (msg.type === 'BROADCASTER_READY') {
          ws.send(JSON.stringify({
            type: 'REQUEST_STREAM',
            classId: id,
            studentId: currentUser.id || `u-${Date.now()}`
          }));
        } else if (msg.type === 'WEBRTC_OFFER' && msg.offer) {
          handleReceiveOffer(msg.offer, msg.from);
        } else if (msg.type === 'WEBRTC_ICE_CANDIDATE' && msg.candidate) {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(e => {});
          }
        } else if (msg.type === 'BROADCASTER_STOPPED') {
          if (peerConnectionRef.current) {
            try { peerConnectionRef.current.close(); } catch (e) {}
            peerConnectionRef.current = null;
          }
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = liveClass?.streamUrl ? `http://localhost:5000${liveClass.streamUrl}` : '/uploads/video-1783335443739-730573726.mp4';
            videoRef.current.play().catch(e => {});
          }
          setIsLiveWebcamActive(false);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    return () => {
      if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close(); } catch (e) {}
        peerConnectionRef.current = null;
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [id, liveClass?.streamUrl]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Raise / Lower Hand toggle
  const toggleHandRaise = () => {
    if (!wsRef.current || !id) return;

    if (isHandRaised) {
      wsRef.current.send(JSON.stringify({
        type: 'LOWER_HAND',
        classId: id,
        studentId: currentUser.id || 'u-guest'
      }));
      setIsHandRaised(false);
      setHandRaiseNotice(t('liveClass.handLoweredNotice', 'Hand lowered.'));
    } else {
      wsRef.current.send(JSON.stringify({
        type: 'RAISE_HAND',
        classId: id,
        user: {
          id: currentUser.id || `u-${Date.now()}`,
          name: currentUser.name || currentUser.username || 'Learner',
          role: 'student',
          avatar: '🧑‍🎓'
        }
      }));
      setIsHandRaised(true);
      setHandRaiseNotice(t('liveClass.handRaisedSuccess', '✋ Hand raised! Instructor will invite you to ask your question.'));
    }

    setTimeout(() => setHandRaiseNotice(''), 4000);
  };

  // Vote on active poll
  const submitPollVote = async (optionId) => {
    if (hasVoted || !activePoll || !id) return;
    setSelectedOptionId(optionId);
    setHasVoted(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'VOTE_POLL',
        classId: id,
        optionId,
        user: { id: currentUser.id || 'u-guest' }
      }));
    } else {
      try {
        await fetch(`http://localhost:5000/api/live-classes/${id}/poll/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionId })
        });
      } catch (err) {
        console.error('Vote failed', err);
      }
    }
  };

  // Send Chat message
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !wsRef.current || !id) return;

    wsRef.current.send(JSON.stringify({
      type: 'LIVE_CHAT_MESSAGE',
      classId: id,
      text: chatInput.trim(),
      user: {
        id: currentUser.id || `u-${Date.now()}`,
        name: currentUser.name || currentUser.username || 'Learner',
        role: 'student'
      }
    }));
    setChatInput('');
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopySuccess(t('liveClass.linkCopied', 'Classroom link copied!'));
    setTimeout(() => setCopySuccess(''), 3000);
  };

  if (loading) {
    return (
      <div style={{
        padding: '80px 20px',
        textAlign: 'center',
        color: 'var(--text-secondary)'
      }}>
        Connecting to virtual classroom broadcast...
      </div>
    );
  }

  if (error || !liveClass) {
    return (
      <div style={{
        padding: '80px 20px',
        textAlign: 'center',
        color: 'var(--text-primary)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 10px' }}>
          {error || 'Classroom not available'}
        </h2>
        <Link
          to="/live-classes"
          style={{
            display: 'inline-block',
            marginTop: '16px',
            padding: '10px 20px',
            background: '#6366f1',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600
          }}
        >
          ← Back to Live Webcasts
        </Link>
      </div>
    );
  }

  const isLive = liveClass.status === 'live';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    }}>
      {/* Top Classroom Bar */}
      <div style={{
        padding: '12px 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/live-classes')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0
            }}
          >
            ← {t('liveClass.allClasses', 'Classes')}
          </button>

          <div style={{ height: '18px', width: '1px', background: 'var(--border-color)' }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {liveClass.title}
              </h2>
              {isLive ? (
                <span style={{
                  background: '#ef4444',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </span>
              ) : (
                <span style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  {liveClass.status.toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {liveClass.instructor} • {liveClass.category}
            </div>
          </div>
        </div>

        {/* Right Action Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Attendee Count Badge */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-primary)'
          }}>
            <span>👥</span>
            <span>{attendeesCount} {t('liveClass.studentsInRoom', 'in class')}</span>
          </div>

          {/* Raise Hand Button */}
          <button
            onClick={toggleHandRaise}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: isHandRaised ? '#f59e0b' : 'var(--bg-primary)',
              color: isHandRaised ? '#000' : 'var(--text-primary)',
              border: isHandRaised ? 'none' : '1px solid var(--border-color)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              boxShadow: isHandRaised ? '0 0 12px rgba(245, 158, 11, 0.5)' : 'none'
            }}
          >
            <span>✋</span>
            {isHandRaised ? t('liveClass.lowerHandBtn', 'Lower Hand (Waiting...)') : t('liveClass.raiseHandBtn', 'Raise Hand')}
          </button>

          {/* Share Classroom Button */}
          <button
            onClick={copyShareLink}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: copySuccess ? '#10b981' : 'var(--bg-primary)',
              color: copySuccess ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔗</span>
            {copySuccess || t('liveClass.share', 'Share')}
          </button>
        </div>
      </div>

      {/* Hand Raised Notification Toast */}
      {handRaiseNotice && (
        <div style={{
          background: isHandRaised ? 'rgba(245, 158, 11, 0.95)' : 'var(--bg-secondary)',
          color: isHandRaised ? '#000' : 'var(--text-primary)',
          padding: '10px 24px',
          fontSize: '13px',
          fontWeight: 600,
          textAlign: 'center',
          borderBottom: '1px solid var(--border-color)',
          transition: 'all 0.3s'
        }}>
          {handRaiseNotice}
        </div>
      )}

      {/* Main Classroom Layout (Left: Video Player & Tabs, Right: Live Chat) */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(340px, 1fr)',
        overflow: 'hidden'
      }}>
        {/* Left Stage */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          borderRight: '1px solid var(--border-color)'
        }}>
          {/* Live Video Player */}
          <div style={{
            position: 'relative',
            background: '#0a0a0a',
            width: '100%',
            aspectRatio: '16 / 9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <video
              ref={videoRef}
              src={isLiveWebcamActive ? undefined : `http://localhost:5000${liveClass.streamUrl || '/uploads/video-1783335443739-730573726.mp4'}`}
              autoPlay
              controls
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: isLiveWebcamActive ? 'cover' : 'contain'
              }}
            />

            {/* Live Watermark Overlay */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'rgba(0, 0, 0, 0.75)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.6px',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              pointerEvents: 'none'
            }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: isLiveWebcamActive ? '#10b981' : '#ef4444', 
                animation: 'pulse 1.2s infinite' 
              }} />
              {isLiveWebcamActive 
                ? '🔴 LIVE INSTRUCTOR BROADCAST' 
                : (isLive ? 'XLURN LIVE STREAM' : 'RECORDED CLASSROOM')}
            </div>

            {/* Floating Live Poll Popup (When Active) */}
            {activePoll && activePoll.status === 'active' && (
              <div style={{
                position: 'absolute',
                bottom: '48px',
                right: '20px',
                width: '320px',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(99, 102, 241, 0.5)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                borderRadius: '14px',
                padding: '16px',
                backdropFilter: 'blur(10px)',
                zIndex: 20,
                color: '#fff',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    background: '#10b981',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 800
                  }}>
                    LIVE POLL
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {activePoll.totalVotes || 0} votes
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', lineHeight: 1.4 }}>
                  {activePoll.question}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activePoll.options?.map((opt) => {
                    const total = activePoll.totalVotes || 1;
                    const pct = Math.round(((opt.votes || 0) / total) * 100);
                    const isSelected = selectedOptionId === opt.id;

                    return (
                      <button
                        key={opt.id}
                        disabled={hasVoted}
                        onClick={() => submitPollVote(opt.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isSelected 
                            ? 'rgba(99, 102, 241, 0.4)' 
                            : (hasVoted ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)'),
                          border: isSelected ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 600,
                          textAlign: 'left',
                          cursor: hasVoted ? 'default' : 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                          <span>{opt.text}</span>
                          {hasVoted && <span>{pct}%</span>}
                        </div>

                        {hasVoted && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${pct}%`,
                            background: isSelected ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                            zIndex: 1,
                            transition: 'width 0.4s'
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {hasVoted && (
                  <div style={{ fontSize: '11px', color: '#10b981', textAlign: 'center', marginTop: '8px', fontWeight: 600 }}>
                    ✓ Vote recorded! Live results updating.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lower Stage Tab Controls */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            padding: '0 24px'
          }}>
            {[
              { id: 'notes', label: t('liveClass.tabNotes', 'Session Overview & Notes') },
              { id: 'resources', label: t('liveClass.tabResources', 'Lecture Slides & Files') },
              { id: 'bio', label: t('liveClass.tabInstructorBio', 'Instructor Profile') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setBottomTab(tab.id)}
                style={{
                  padding: '14px 18px',
                  background: 'none',
                  border: 'none',
                  borderBottom: bottomTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                  color: bottomTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Lower Stage Tab Content */}
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            {bottomTab === 'notes' && (
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700 }}>
                  {liveClass.title}
                </h3>
                <p style={{ margin: '0 0 20px', lineHeight: 1.6, color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {liveClass.description}
                </p>

                <h4 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700 }}>
                  Key Topics & Curriculum
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
                  <li>Real-time collaborative state architecture & WebSocket multiplexing</li>
                  <li>React 19 Server Components, Actions, and optimistic dispatch</li>
                  <li>Live doubt moderation with virtual hand-raise queueing</li>
                  <li>Deploying high-throughput media pipelines with zero third-party lock-in</li>
                </ul>
              </div>
            )}

            {bottomTab === 'resources' && (
              <div>
                <h3 style={{ margin: '0 0 14px', fontSize: '18px', fontWeight: 700 }}>
                  {t('liveClass.downloadableMaterials', 'Downloadable Lecture Materials')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { name: 'Masterclass_Lecture_Slides.pdf', size: '4.8 MB', icon: '📄' },
                    { name: 'WebSocket_Architecture_Diagram.png', size: '1.2 MB', icon: '🖼️' },
                    { name: 'Interactive_Demo_Code_Repository.zip', size: '14.5 MB', icon: '📦' }
                  ].map((res, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{res.icon}</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {res.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {res.size}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => alert(`Downloading ${res.name}...`)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          background: '#6366f1',
                          color: '#fff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bottomTab === 'bio' && (
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #ef4444)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  flexShrink: 0
                }}>
                  👨‍🏫
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
                    {liveClass.instructor}
                  </h3>
                  <div style={{ color: '#6366f1', fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>
                    {liveClass.instructorRole}
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                    Over 12 years of industry engineering experience architecting distributed media pipelines, full-stack reactive applications, and mentoring engineering students globally.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Stage: Live Interactive Chat */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--bg-secondary)',
          overflow: 'hidden'
        }}>
          {/* Chat Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>💬</span>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>
                {t('liveClass.classroomChat', 'Live Classroom Chat')}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Real-Time Sync
            </span>
          </div>

          {/* Messages Feed */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '60px', fontSize: '13px' }}>
                {t('liveClass.welcomeChat', 'Welcome! Ask questions or share thoughts with classmates and the instructor.')}
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: msg.role === 'instructor' 
                      ? 'rgba(99, 102, 241, 0.12)' 
                      : (msg.role === 'system' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-primary)'),
                    borderLeft: msg.role === 'instructor' ? '3px solid #6366f1' : (msg.role === 'system' ? '3px solid #f59e0b' : 'none')
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {msg.sender}
                      </span>
                      {msg.role === 'instructor' && (
                        <span style={{ background: '#6366f1', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          INSTRUCTOR
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {msg.timeStr || ''}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {msg.text}
                  </p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Field */}
          <form onSubmit={handleSendChat} style={{
            padding: '12px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t('liveClass.askDoubtPlaceholder', 'Ask a question or share doubt...')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LiveClassroom;
