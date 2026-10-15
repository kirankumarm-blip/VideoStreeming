import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentUser } from '../services/api';

const LiveWebcasts = ({ theme }) => {
  const { t } = useLanguage();
  const currentUser = getCurrentUser() || {};

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [, setLoading] = useState(true);

  // Studio controls
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'hands', 'polls'
  const [copySuccess, setCopySuccess] = useState('');

  // Live state
  const [attendeesCount, setAttendeesCount] = useState(42);
  const [handRaises, setHandRaises] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Create Poll Modal
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Schedule Class Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    instructor: currentUser.name || 'Admin Instructor',
    instructorRole: 'Lead Instructor',
    category: 'Technology',
    scheduledAt: '',
    durationMinutes: 60,
    description: '',
    streamUrl: '/uploads/video-1783335443739-730573726.mp4'
  });

  const videoPreviewRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  // Fetch classes from backend
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/live-classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (!selectedClass && data.length > 0) {
          // Default to first live or first class
          const liveOne = data.find(c => c.status === 'live') || data[0];
          loadClassDetails(liveOne.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch live classes', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassDetails = async (classId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/live-classes/${classId}`);
      if (res.ok) {
        const cls = await res.json();
        setSelectedClass(cls);
        setAttendeesCount(cls.attendeesCount || 0);
        setHandRaises(cls.handRaises || []);
        setActivePoll(cls.activePoll || null);
        setChatMessages(cls.chatMessages || []);
        setIsBroadcasting(cls.status === 'live');
      }
    } catch (err) {
      console.error('Failed to load class details', err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // WebSocket Connection
  useEffect(() => {
    if (!selectedClass) return;

    const wsUrl = `ws://${window.location.hostname || 'localhost'}:5000`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'JOIN_LIVE_CLASS',
        classId: selectedClass.id,
        user: {
          id: currentUser.id || 'admin-host',
          name: currentUser.name || 'Instructor',
          role: 'instructor',
          avatar: '👨‍🏫'
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'LIVE_CLASS_STATE') {
          setAttendeesCount(msg.liveClass.attendeesCount || 0);
          setHandRaises(msg.liveClass.handRaises || []);
          setActivePoll(msg.liveClass.activePoll || null);
          setChatMessages(msg.liveClass.chatMessages || []);
        } else if (msg.type === 'ATTENDEE_UPDATE') {
          if (typeof msg.attendeesCount === 'number') {
            setAttendeesCount(msg.attendeesCount);
          }
        } else if (msg.type === 'LIVE_CHAT_MESSAGE') {
          setChatMessages(prev => [...prev, msg.message]);
        } else if (msg.type === 'HAND_QUEUE_UPDATED') {
          setHandRaises(msg.handRaises || []);
        } else if (msg.type === 'POLL_LAUNCHED') {
          setActivePoll(msg.poll);
        } else if (msg.type === 'POLL_UPDATED') {
          setActivePoll(msg.poll);
        } else if (msg.type === 'POLL_CLOSED') {
          setActivePoll(msg.poll);
        } else if (msg.type === 'CLASS_STATUS_CHANGED') {
          setSelectedClass(prev => prev ? { ...prev, status: msg.status } : prev);
          setIsBroadcasting(msg.status === 'live');
        } else if (msg.type === 'REQUEST_STREAM') {
          const studentId = msg.studentId || msg.from;
          if (studentId && mediaStreamRef.current) {
            handleStudentStreamRequest(studentId);
          }
        } else if (msg.type === 'WEBRTC_ANSWER') {
          const studentId = msg.from;
          const pc = peerConnectionsRef.current.get(studentId);
          if (pc && msg.answer) {
            pc.setRemoteDescription(new RTCSessionDescription(msg.answer)).catch(err => {
              console.warn('Set remote description error:', err);
            });
          }
        } else if (msg.type === 'WEBRTC_ICE_CANDIDATE') {
          const studentId = msg.from;
          const pc = peerConnectionsRef.current.get(studentId);
          if (pc && msg.candidate) {
            pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(err => {
              console.warn('Add ice candidate error:', err);
            });
          }
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [selectedClass?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Camera, Screen Share & Video Preview sync
  useEffect(() => {
    const videoEl = videoPreviewRef.current;
    if (!videoEl) return;

    if (isCameraOn || isScreenSharing) {
      if (mediaStreamRef.current) {
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.srcObject = mediaStreamRef.current;
        videoEl.muted = true;
        videoEl.play().catch(err => {
          console.warn('Camera preview play error:', err);
        });
      }
    } else {
      if (videoEl.srcObject) {
        videoEl.srcObject = null;
      }
      const streamSource = selectedClass?.streamUrl 
        ? `http://localhost:5000${selectedClass.streamUrl}` 
        : '/uploads/video-1783335443739-730573726.mp4';
      videoEl.src = streamSource;
      videoEl.muted = !isMicOn;
      videoEl.play().catch(err => {
        console.warn('Lecture video play error:', err);
      });
    }
  }, [isCameraOn, isScreenSharing, selectedClass?.streamUrl, isMicOn]);

  // Clean up media tracks on component unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  // WebRTC Peer Connection handling for student live viewing
  const handleStudentStreamRequest = async (studentId) => {
    if (!mediaStreamRef.current || !wsRef.current || !selectedClass) return;

    try {
      if (peerConnectionsRef.current.has(studentId)) {
        try { peerConnectionsRef.current.get(studentId).close(); } catch (e) {}
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionsRef.current.set(studentId, pc);

      mediaStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStreamRef.current);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'WEBRTC_ICE_CANDIDATE',
            classId: selectedClass.id,
            to: studentId,
            from: currentUser.id || 'admin-host',
            candidate: event.candidate
          }));
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsRef.current.send(JSON.stringify({
        type: 'WEBRTC_OFFER',
        classId: selectedClass.id,
        to: studentId,
        from: currentUser.id || 'admin-host',
        offer
      }));
    } catch (err) {
      console.error('Error handling student WebRTC stream request:', err);
    }
  };

  // Camera & Mic toggles
  const toggleCamera = async () => {
    if (isCameraOn) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      setIsCameraOn(false);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedClass) {
        wsRef.current.send(JSON.stringify({
          type: 'BROADCASTER_STOPPED',
          classId: selectedClass.id
        }));
      }
    } else {
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: isMicOn
        });
        mediaStreamRef.current = stream;
        setIsCameraOn(true);
        setIsScreenSharing(false);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedClass) {
          wsRef.current.send(JSON.stringify({
            type: 'BROADCASTER_READY',
            classId: selectedClass.id
          }));
        }
      } catch (err) {
        console.warn('Camera access denied or unavailable', err);
        alert(t('liveClass.cameraNotice', 'Webcam access was not granted or no camera is connected. Check browser camera permissions.'));
        setIsCameraOn(false);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      setIsScreenSharing(false);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedClass) {
        wsRef.current.send(JSON.stringify({
          type: 'BROADCASTER_STOPPED',
          classId: selectedClass.id
        }));
      }
    } else {
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        mediaStreamRef.current = stream;
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          peerConnectionsRef.current.forEach(pc => pc.close());
          peerConnectionsRef.current.clear();
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedClass) {
            wsRef.current.send(JSON.stringify({
              type: 'BROADCASTER_STOPPED',
              classId: selectedClass.id
            }));
          }
        };
        setIsScreenSharing(true);
        setIsCameraOn(false);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedClass) {
          wsRef.current.send(JSON.stringify({
            type: 'BROADCASTER_READY',
            classId: selectedClass.id
          }));
        }
      } catch (err) {
        console.warn('Screen share cancelled', err);
        setIsScreenSharing(false);
      }
    }
  };

  // Broadcast toggle
  const toggleBroadcast = async () => {
    if (!selectedClass) return;
    const nextStatus = isBroadcasting ? 'completed' : 'live';
    try {
      const res = await fetch(`http://localhost:5000/api/live-classes/${selectedClass.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setIsBroadcasting(nextStatus === 'live');
        setSelectedClass(prev => ({ ...prev, status: nextStatus }));
        fetchClasses();
      }
    } catch (err) {
      console.error('Failed to change broadcast status', err);
    }
  };

  // Chat message send
  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !wsRef.current || !selectedClass) return;

    wsRef.current.send(JSON.stringify({
      type: 'LIVE_CHAT_MESSAGE',
      classId: selectedClass.id,
      text: chatInput.trim(),
      user: {
        id: currentUser.id || 'admin-host',
        name: currentUser.name || 'Dr. Alice Carter',
        role: 'instructor'
      }
    }));
    setChatInput('');
  };

  // Hand raise moderation
  const lowerHand = (studentId) => {
    if (!wsRef.current || !selectedClass) return;
    wsRef.current.send(JSON.stringify({
      type: 'LOWER_HAND',
      classId: selectedClass.id,
      studentId
    }));
  };

  const allowStudentToSpeak = (student) => {
    if (!wsRef.current || !selectedClass) return;
    wsRef.current.send(JSON.stringify({
      type: 'LIVE_CHAT_MESSAGE',
      classId: selectedClass.id,
      text: `🎤 Instructor Dr. Alice Carter invited ${student.studentName} to speak!`,
      user: { id: 'sys', name: 'Virtual Classroom System', role: 'system' }
    }));
    lowerHand(student.studentId);
  };

  // Poll creation & launch
  const launchPoll = async (e) => {
    e.preventDefault();
    if (!pollQuestion.trim() || !selectedClass) return;
    const cleanOptions = pollOptions.filter(o => o.trim().length > 0);
    if (cleanOptions.length < 2) {
      alert(t('liveClass.minOptionsAlert', 'Please provide at least 2 options for the poll.'));
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/live-classes/${selectedClass.id}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pollQuestion.trim(),
          options: cleanOptions
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActivePoll(data.poll);
        setShowPollModal(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setActiveTab('polls');
      }
    } catch (err) {
      console.error('Failed to launch poll', err);
    }
  };

  const closeActivePoll = () => {
    if (!wsRef.current || !selectedClass) return;
    wsRef.current.send(JSON.stringify({
      type: 'CLOSE_POLL',
      classId: selectedClass.id
    }));
  };

  // Schedule Webcast
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/live-classes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      });
      if (res.ok) {
        setShowScheduleModal(false);
        fetchClasses();
      }
    } catch (err) {
      console.error('Failed to schedule class', err);
    }
  };

  const copyStudentLink = () => {
    if (!selectedClass) return;
    const url = `http://localhost:3001/#/live/${selectedClass.id}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(t('liveClass.linkCopied', 'Copied Student Link!'));
    setTimeout(() => setCopySuccess(''), 3000);
  };

  return (
    <div style={{
      padding: '24px',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      minHeight: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>📡</span>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('liveClass.adminTitle', 'Live Webcast Studio & Virtual Classroom')}
            </h1>
            {selectedClass?.status === 'live' && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
                ON AIR
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {t('liveClass.adminSubtitle', 'Broadcast high-definition interactive lectures, moderate student hand-raise doubts, and launch real-time polls.')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowScheduleModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📅</span>
            {t('liveClass.scheduleNew', 'Schedule Webcast')}
          </button>

          <button
            onClick={copyStudentLink}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: copySuccess ? '#10b981' : '#6366f1',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <span>🔗</span>
            {copySuccess || t('liveClass.shareStudentLink', 'Copy Student Join Link')}
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1fr)',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Left: Broadcast Stage */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Video Container */}
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
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted={isCameraOn || isScreenSharing ? true : !isMicOn}
              controls={!isCameraOn && !isScreenSharing}
              loop={!isCameraOn && !isScreenSharing}
              style={{
                width: '100%',
                height: '100%',
                objectFit: (isCameraOn || isScreenSharing) ? 'cover' : 'contain',
                transform: isCameraOn ? 'scaleX(-1)' : 'none'
              }}
            />

            {/* Live Indicator Overlay */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              zIndex: 10
            }}>
              <span style={{
                background: isBroadcasting ? 'rgba(239, 68, 68, 0.9)' : 'rgba(100, 116, 139, 0.8)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#fff',
                  animation: isBroadcasting ? 'pulse 1.2s infinite' : 'none'
                }} />
                {isBroadcasting ? t('liveClass.liveBadge', 'LIVE BROADCAST') : t('liveClass.readyBadge', 'STUDIO PREVIEW')}
              </span>

              <span style={{
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>👥</span>
                {attendeesCount} {t('liveClass.viewers', 'Learners')}
              </span>
            </div>

            {/* Hand-raise Alert Banner on Stream */}
            {handRaises.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(245, 158, 11, 0.95)',
                color: '#000',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'bounce 2s infinite',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('hands')}
              >
                <span>✋</span>
                <span>{handRaises.length} {t('liveClass.handsRaisedNotice', 'Doubt Hand Raised')}</span>
              </div>
            )}
          </div>

          {/* Broadcast Studio Controls Toolbar */}
          <div style={{
            padding: '16px 20px',
            background: 'var(--bg-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={toggleCamera}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: isCameraOn ? '#10b981' : 'var(--bg-primary)',
                  color: isCameraOn ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{isCameraOn ? '📹' : '📷'}</span>
                {isCameraOn ? t('liveClass.camOn', 'Camera ON') : t('liveClass.camOff', 'Webcam Off')}
              </button>

              <button
                onClick={() => setIsMicOn(!isMicOn)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: isMicOn ? 'var(--bg-primary)' : '#ef4444',
                  color: isMicOn ? 'var(--text-primary)' : '#fff',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{isMicOn ? '🎙️' : '🔇'}</span>
                {isMicOn ? t('liveClass.micLive', 'Mic Muted: No') : t('liveClass.micMuted', 'Mic Muted')}
              </button>

              <button
                onClick={toggleScreenShare}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: isScreenSharing ? '#6366f1' : 'var(--bg-primary)',
                  color: isScreenSharing ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🖥️</span>
                {isScreenSharing ? t('liveClass.stopSharing', 'Stop Screen') : t('liveClass.shareScreen', 'Share Screen')}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => setShowPollModal(true)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📊</span>
                {t('liveClass.createPoll', 'Launch Poll')}
              </button>

              <button
                onClick={toggleBroadcast}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  background: isBroadcasting ? '#ef4444' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isBroadcasting ? '0 4px 14px rgba(239, 68, 68, 0.4)' : '0 4px 14px rgba(16, 185, 129, 0.4)'
                }}
              >
                <span>{isBroadcasting ? '⏹️' : '🔴'}</span>
                {isBroadcasting ? t('liveClass.stopBroadcast', 'End Broadcast') : t('liveClass.startBroadcast', 'Go Live Now')}
              </button>
            </div>
          </div>

          {/* Current Webcast Metadata Info */}
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#6366f1',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {selectedClass?.category || 'Technology'}
                </span>
                <h2 style={{ margin: '8px 0 4px', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedClass?.title || 'Masterclass Webcast'}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Instructor: <strong>{selectedClass?.instructor || 'Instructor'}</strong> ({selectedClass?.instructorRole || 'Lead'})
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Duration: <strong>{selectedClass?.durationMinutes || 60} mins</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Session ID: <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>{selectedClass?.id}</code>
                </div>
              </div>
            </div>

            <p style={{ margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
              {selectedClass?.description || 'Deep dive into collaborative state and live interactive lecture streams.'}
            </p>
          </div>
        </div>

        {/* Right: Live Interactive Sidebar (Tabs: Chat, Hand-Raises, Polls) */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          height: '700px',
          overflow: 'hidden'
        }}>
          {/* Sidebar Tab Header */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-primary)'
          }}>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '14px 8px',
                background: activeTab === 'chat' ? 'var(--bg-secondary)' : 'none',
                border: 'none',
                borderBottom: activeTab === 'chat' ? '2px solid #6366f1' : 'none',
                color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>💬</span>
              {t('liveClass.tabChat', 'Live Chat')}
            </button>

            <button
              onClick={() => setActiveTab('hands')}
              style={{
                flex: 1,
                padding: '14px 8px',
                background: activeTab === 'hands' ? 'var(--bg-secondary)' : 'none',
                border: 'none',
                borderBottom: activeTab === 'hands' ? '2px solid #f59e0b' : 'none',
                color: activeTab === 'hands' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>✋</span>
              {t('liveClass.tabHands', 'Raised Hands')}
              {handRaises.length > 0 && (
                <span style={{
                  background: '#f59e0b',
                  color: '#000',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 800
                }}>
                  {handRaises.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('polls')}
              style={{
                flex: 1,
                padding: '14px 8px',
                background: activeTab === 'polls' ? 'var(--bg-secondary)' : 'none',
                border: 'none',
                borderBottom: activeTab === 'polls' ? '2px solid #10b981' : 'none',
                color: activeTab === 'polls' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>📊</span>
              {t('liveClass.tabPolls', 'Live Polls')}
              {activePoll && (
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981'
                }} />
              )}
            </button>
          </div>

          {/* Tab 1: Live Chat Content */}
          {activeTab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', fontSize: '13px' }}>
                    {t('liveClass.emptyChat', 'Chat messages from students will appear here in real time.')}
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
                              HOST
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

              {/* Chat Send Input */}
              <form onSubmit={sendChatMessage} style={{
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
                  placeholder={t('liveClass.chatInputPlaceholder', 'Send broadcast announcement or reply...')}
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
          )}

          {/* Tab 2: Hand Raises Queue */}
          {activeTab === 'hands' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                  ✋ {t('liveClass.handRaiseQueue', 'Student Doubt Queue')}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {handRaises.length} {t('liveClass.waiting', 'waiting')}
                </span>
              </div>

              {handRaises.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '13px'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✋</div>
                  <p style={{ margin: 0 }}>{t('liveClass.noHands', 'No raised hands at the moment.')}</p>
                  <p style={{ margin: '6px 0 0', fontSize: '12px' }}>
                    {t('liveClass.noHandsSub', 'When students click "Raise Hand" to ask a question, they will appear here.')}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {handRaises.map((student) => (
                    <div
                      key={student.id}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-primary)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{student.avatar || '🧑‍🎓'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                            {student.studentName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Raised at {student.time}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => allowStudentToSpeak(student)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          🎤 {t('liveClass.allowSpeak', 'Invite')}
                        </button>

                        <button
                          onClick={() => lowerHand(student.studentId)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {t('liveClass.dismiss', 'Dismiss')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Interactive Polls */}
          {activeTab === 'polls' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                  📊 {t('liveClass.pollsHeading', 'Interactive Live Polls')}
                </h3>
                <button
                  onClick={() => setShowPollModal(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  + {t('liveClass.newPoll', 'New Poll')}
                </button>
              </div>

              {!activePoll ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '13px'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                  <p style={{ margin: 0 }}>{t('liveClass.noActivePoll', 'No active poll right now.')}</p>
                  <p style={{ margin: '6px 0 0', fontSize: '12px' }}>
                    {t('liveClass.launchToEngage', 'Launch a quick multi-choice question to assess learner comprehension.')}
                  </p>
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-primary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{
                      background: activePoll.status === 'active' ? '#10b981' : '#64748b',
                      color: '#fff',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700
                    }}>
                      {activePoll.status === 'active' ? 'LIVE POLL' : 'CLOSED'}
                    </span>

                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {activePoll.totalVotes || 0} {t('liveClass.votesCast', 'votes')}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {activePoll.question}
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activePoll.options?.map((opt) => {
                      const total = activePoll.totalVotes || 1;
                      const pct = Math.round(((opt.votes || 0) / total) * 100);
                      return (
                        <div key={opt.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{opt.text}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{opt.votes || 0} ({pct}%)</span>
                          </div>
                          <div style={{
                            height: '8px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: '#6366f1',
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activePoll.status === 'active' && (
                    <button
                      onClick={closeActivePoll}
                      style={{
                        marginTop: '16px',
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        background: 'none',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {t('liveClass.closePoll', 'End Poll & Show Final Result')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Webcast Sessions Schedule Table / Cards */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            📋 {t('liveClass.allSessions', 'All Live Webcasts & Recorded Sessions')}
          </h3>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {classes.length} {t('liveClass.classesScheduled', 'sessions listed')}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {classes.map((cls) => {
            const isCurrent = selectedClass?.id === cls.id;
            return (
              <div
                key={cls.id}
                onClick={() => loadClassDetails(cls.id)}
                style={{
                  background: isCurrent ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-primary)',
                  borderRadius: '12px',
                  border: isCurrent ? '2px solid #6366f1' : '1px solid var(--border-color)',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, border-color 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    background: cls.status === 'live' ? '#ef4444' : (cls.status === 'upcoming' ? '#3b82f6' : '#64748b'),
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {cls.status}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    👥 {cls.attendeesCount || 0}
                  </span>
                </div>

                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {cls.title}
                </h4>

                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {cls.instructor} • {cls.category}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    ⏱️ {cls.durationMinutes || 60} min
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadClassDetails(cls.id);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: isCurrent ? '#6366f1' : 'var(--bg-secondary)',
                      color: isCurrent ? '#fff' : 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isCurrent ? t('liveClass.activeInStudio', 'Active In Studio') : t('liveClass.openStudio', 'Open Studio')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Launch Poll */}
      {showPollModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            width: '100%',
            maxWidth: '480px',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>
              📊 {t('liveClass.createPollTitle', 'Launch Live Poll to Learners')}
            </h3>

            <form onSubmit={launchPoll}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('liveClass.pollQuestionLabel', 'Poll Question')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('liveClass.pollQuestionPlaceholder', 'e.g. Which architectural pattern do you prefer?')}
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('liveClass.pollOptionsLabel', 'Options')}
                </label>
                {pollOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[i] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6366f1',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    + {t('liveClass.addOption', 'Add another option')}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPollModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('liveClass.broadcastPollBtn', 'Broadcast to Classroom')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Webcast */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            width: '100%',
            maxWidth: '520px',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>
              📅 {t('liveClass.scheduleWebcastTitle', 'Schedule New Virtual Webcast')}
            </h3>

            <form onSubmit={handleScheduleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('liveClass.webcastTitleLabel', 'Webcast Title')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next.js 14 Server Actions & Real-Time Sync"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {t('liveClass.instructorLabel', 'Instructor')}
                  </label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.instructor}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, instructor: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {t('liveClass.categoryLabel', 'Category')}
                  </label>
                  <select
                    value={scheduleForm.category}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Technology">Technology</option>
                    <option value="Science">Science</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {t('liveClass.dateTimeLabel', 'Date & Time')}
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.scheduledAt}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {t('liveClass.durationLabel', 'Duration (mins)')}
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={scheduleForm.durationMinutes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('liveClass.descriptionLabel', 'Description')}
                </label>
                <textarea
                  rows="3"
                  placeholder="Outline topics covered, prerequisites, and learning objectives..."
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('liveClass.saveScheduleBtn', 'Save & Publish Webcast')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveWebcasts;
