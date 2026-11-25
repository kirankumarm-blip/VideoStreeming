import { useState, useRef, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/apiUrl';
import { getAssetBaseUrl } from '../utils/assetUrl';
import { generateCorrelationId, handleFormApiError } from '../utils/formErrorHandler';

export const useStudyRoom = ({
  video,
  activeCourse,
  currentUser,
  userEmail,
  videoId,
  videoRef,
  roomQueryParam,
  searchParams,
  setSearchParams
}) => {
  const [activeStudyRoom, setActiveStudyRoom] = useState(null);
  const [studyRoomMessages, setStudyRoomMessages] = useState([]);
  const [studyRoomMembers, setStudyRoomMembers] = useState([]);
  const [showStudyRoomDrawer, setShowStudyRoomDrawer] = useState(false);
  const [showStudyRoomModal, setShowStudyRoomModal] = useState(false);
  const [studySyncBanner, setStudySyncBanner] = useState('');
  const [studyInputMessage, setStudyInputMessage] = useState('');
  const [studyJoinCodeInput, setStudyJoinCodeInput] = useState('');
  const [studyCreatingRoom, setStudyCreatingRoom] = useState(false);
  const [studyInviteCopied, setStudyInviteCopied] = useState(false);

  const studyWsRef = useRef(null);
  const isRemoteSyncRef = useRef(false);
  const studySyncBannerTimerRef = useRef(null);

  const triggerStudyBanner = useCallback((msg) => {
    if (studySyncBannerTimerRef.current) clearTimeout(studySyncBannerTimerRef.current);
    setStudySyncBanner(msg);
    studySyncBannerTimerRef.current = setTimeout(() => {
      setStudySyncBanner('');
    }, 3200);
  }, []);

  useEffect(() => {
    const targetRoomId = roomQueryParam || (activeStudyRoom?.roomId);
    if (!targetRoomId) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname || 'localhost';
    const socket = new WebSocket(`${wsProtocol}//${wsHost}:5000`);
    studyWsRef.current = socket;

    socket.onopen = () => {
      const username = currentUser?.username || currentUser?.name || (userEmail?.split('@')[0]) || 'Learner';
      socket.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomId: targetRoomId,
        user: {
          id: currentUser?.id || 'learner_' + Math.random().toString(36).substring(2, 7),
          username: username,
          email: userEmail
        }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ROOM_STATE') {
          setActiveStudyRoom(data.room);
          setStudyRoomMessages(data.room.chatMessages || []);
          setStudyRoomMembers(data.room.activeMembers || []);
          setShowStudyRoomDrawer(true);
          
          if (videoRef?.current && data.room.currentTime !== undefined) {
            if (Math.abs(videoRef.current.currentTime - data.room.currentTime) > 1.5) {
              isRemoteSyncRef.current = true;
              videoRef.current.currentTime = data.room.currentTime;
              setTimeout(() => { isRemoteSyncRef.current = false; }, 400);
            }
            if (data.room.isPlaying) {
              videoRef.current.play().catch(e => console.log('Autoplay sync notice:', e));
            } else {
              videoRef.current.pause();
            }
          }
        } else if (data.type === 'SYNC_PLAY') {
          isRemoteSyncRef.current = true;
          if (videoRef?.current) {
            if (Math.abs(videoRef.current.currentTime - data.currentTime) > 1.5) {
              videoRef.current.currentTime = data.currentTime;
            }
            videoRef.current.play().catch(e => console.log(e));
          }
          triggerStudyBanner(`▶️ ${data.senderName || 'Peer'} resumed playback`);
          setTimeout(() => { isRemoteSyncRef.current = false; }, 400);
        } else if (data.type === 'SYNC_PAUSE') {
          isRemoteSyncRef.current = true;
          if (videoRef?.current) {
            if (Math.abs(videoRef.current.currentTime - data.currentTime) > 1.5) {
              videoRef.current.currentTime = data.currentTime;
            }
            videoRef.current.pause();
          }
          triggerStudyBanner(`⏸️ ${data.senderName || 'Peer'} paused the video`);
          setTimeout(() => { isRemoteSyncRef.current = false; }, 400);
        } else if (data.type === 'SYNC_SEEK') {
          isRemoteSyncRef.current = true;
          if (videoRef?.current) {
            videoRef.current.currentTime = data.currentTime;
          }
          const min = Math.floor(data.currentTime / 60);
          const sec = Math.floor(data.currentTime % 60);
          const formatted = `${min}:${sec < 10 ? '0' : ''}${sec}`;
          triggerStudyBanner(`⏩ ${data.senderName || 'Peer'} seeked to ${formatted}`);
          setTimeout(() => { isRemoteSyncRef.current = false; }, 400);
        } else if (data.type === 'CHAT_MESSAGE') {
          setStudyRoomMessages(prev => [...prev, data.message]);
        } else if (data.type === 'MEMBER_JOINED') {
          setStudyRoomMembers(data.activeMembers || []);
          triggerStudyBanner(`👋 ${data.user?.username || 'A learner'} joined study party`);
        } else if (data.type === 'MEMBER_LEFT') {
          setStudyRoomMembers(data.activeMembers || []);
        } else if (data.type === 'ERROR') {
          triggerStudyBanner(`⚠️ ${data.message || 'Room error'}`);
        }
      } catch (err) {
        console.error('Error handling Study Room WS message:', err);
      }
    };

    socket.onerror = (err) => {
      console.log('Study Room WS error:', err);
    };

    socket.onclose = () => {
      console.log('Study Room WS closed');
    };

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      studyWsRef.current = null;
    };
  }, [roomQueryParam, activeStudyRoom?.roomId, currentUser, userEmail, videoRef, triggerStudyBanner]);

  const handleSendStudyMessage = useCallback((customText = null) => {
    const textToSend = (typeof customText === 'string' ? customText : studyInputMessage).trim();
    if (!textToSend || !studyWsRef.current || studyWsRef.current.readyState !== WebSocket.OPEN) return;
    studyWsRef.current.send(JSON.stringify({
      type: 'CHAT_MESSAGE',
      text: textToSend
    }));
    setStudyInputMessage('');
  }, [studyInputMessage]);

  const handleLeaveStudyRoom = useCallback(() => {
    if (studyWsRef.current) {
      studyWsRef.current.close();
      studyWsRef.current = null;
    }
    setActiveStudyRoom(null);
    setShowStudyRoomDrawer(false);
    setStudyRoomMessages([]);
    setStudyRoomMembers([]);
    if (searchParams && setSearchParams) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('room');
      setSearchParams(nextParams);
    }
    triggerStudyBanner('🚪 Left study party');
  }, [searchParams, setSearchParams, triggerStudyBanner]);

  const handleCreateWatchPartyNow = useCallback(async () => {
    setStudyCreatingRoom(true);
    const clientCorrelationId = generateCorrelationId();
    try {
      const apiBase = getApiBaseUrl() || getAssetBaseUrl();
      const res = await fetch(`${apiBase}/api/study-rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': clientCorrelationId,
          'X-Request-ID': clientCorrelationId
        },
        body: JSON.stringify({
          title: `${video?.title || 'Lesson'} Watch Party`,
          courseId: video?.course_id || activeCourse?.id || 1,
          courseTitle: activeCourse?.title || video?.course_name || 'Active Course',
          videoId: videoId || video?.id || 1,
          hostName: currentUser?.username || currentUser?.name || (userEmail?.split('@')[0]) || 'Learner',
          userEmail: userEmail
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.room) {
          setShowStudyRoomModal(false);
          if (searchParams && setSearchParams) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set('room', data.room.roomId);
            setSearchParams(nextParams);
          }
          setActiveStudyRoom(data.room);
          setShowStudyRoomDrawer(true);
          triggerStudyBanner(`🎉 Study Room ${data.room.roomId} is ready!`);
        }
      } else {
        const errResult = await handleFormApiError(res, null, {
          formName: 'CreateWatchPartyInstant',
          clientCorrelationId
        });
        triggerStudyBanner(`⚠️ ${errResult.displayMessage}`);
      }
    } catch (err) {
      const errResult = await handleFormApiError(null, err, {
        formName: 'CreateWatchPartyInstant',
        clientCorrelationId
      });
      triggerStudyBanner(`⚠️ ${errResult.displayMessage}`);
    } finally {
      setStudyCreatingRoom(false);
    }
  }, [video, activeCourse, videoId, currentUser, userEmail, searchParams, setSearchParams, triggerStudyBanner]);

  const handleJoinWatchPartyByCode = useCallback((code) => {
    const trimmed = (code || studyJoinCodeInput).trim().toUpperCase();
    if (!trimmed) return;
    setShowStudyRoomModal(false);
    if (searchParams && setSearchParams) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('room', trimmed);
      setSearchParams(nextParams);
    }
    setShowStudyRoomDrawer(true);
  }, [studyJoinCodeInput, searchParams, setSearchParams]);

  const handleCopyStudyInvite = useCallback(() => {
    const targetRoomId = activeStudyRoom?.roomId || roomQueryParam;
    const inviteUrl = `${window.location.origin}/watch/${videoId}?room=${targetRoomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setStudyInviteCopied(true);
    triggerStudyBanner('📋 Invite link copied to clipboard!');
    setTimeout(() => setStudyInviteCopied(false), 2500);
  }, [activeStudyRoom?.roomId, roomQueryParam, videoId, triggerStudyBanner]);

  return {
    activeStudyRoom,
    studyRoomMessages,
    studyRoomMembers,
    showStudyRoomDrawer,
    setShowStudyRoomDrawer,
    showStudyRoomModal,
    setShowStudyRoomModal,
    studySyncBanner,
    studyInputMessage,
    setStudyInputMessage,
    studyJoinCodeInput,
    setStudyJoinCodeInput,
    studyCreatingRoom,
    studyInviteCopied,
    handleSendStudyMessage,
    handleLeaveStudyRoom,
    handleCreateWatchPartyNow,
    handleJoinWatchPartyByCode,
    handleCopyStudyInvite,
    isRemoteSyncRef,
    studyWsRef
  };
};

export default useStudyRoom;
