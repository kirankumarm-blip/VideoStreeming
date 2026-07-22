import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, getCurrentUser } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const VideoWatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  const [video, setVideo] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Custom Alert Modal State (Same as UserDashboard / Login page)
  const [customAlert, setCustomAlert] = useState({
    show: false,
    title: 'Upgrade Required',
    message: '',
    buttonText: 'OK'
  });

  const showUpgradeAlert = (message = 'Need to upgrade your plan') => {
    setCustomAlert({
      show: true,
      title: 'Upgrade Required',
      message,
      buttonText: 'OK'
    });
  };

  const currentUser = getCurrentUser();
  const userPlan = String(location.state?.userPlan ?? location.state?.user_plan ?? currentUser?.user_plan ?? currentUser?.user_plan_id ?? '1');

  const isChapterLocked = (lesson, courseObj = null) => {
    if (!lesson) return false;
    if (userPlan !== '1') return false;

    const vis = lesson.visibility ?? lesson.visibility_id ?? lesson.is_private ?? lesson.isPrivate ?? courseObj?.visibility ?? courseObj?.visibility_id;
    const visStr = String(vis || '').toLowerCase();
    return visStr === '2' || visStr === 'private' || vis === true || vis === 2;
  };
  
  const videoRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const [lastPositionLoaded, setLastPositionLoaded] = useState(false);
  const [savedPositionText, setSavedPositionText] = useState('');

  // Playback detailed analytics tracking
  const trackingDataRef = useRef({
    isNewSession: true,
    watchTime: 0,
    pausedCount: 0,
    forwardedCount: 0,
    backwardCount: 0
  });
  const prevTimeRef = useRef(0);
  const isResumingRef = useRef(false);
  const seekStartTimeRef = useRef(0);
  const idRef = useRef(id);
  const currentTimeRef = useRef(0);
  const videoRefData = useRef(null);

  useEffect(() => {
    idRef.current = id;
  }, [id]);

  useEffect(() => {
    videoRefData.current = video;
    if (videoRef.current && video) {
      videoRef.current.load();
      setIsPlaying(true);
      videoRef.current.play().catch(err => {
        console.log("Autoplay prevented:", err);
        setIsPlaying(false);
      });
    }
  }, [video]);

  const [ipAddress, setIpAddress] = useState('127.0.0.1');
  const sessionStartedAtRef = useRef(new Date().toISOString());

  useEffect(() => {
    sessionStartedAtRef.current = new Date().toISOString();
  }, [id]);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => setIpAddress(data.ip))
      .catch(err => console.log("Failed to fetch IP, using fallback", err));
  }, []);

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "Tablet";
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return "Mobile";
    }
    return "Desktop";
  };

  const getPlatform = () => {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "Windows";
    if (ua.indexOf("Mac") !== -1) return "MacOS";
    if (ua.indexOf("X11") !== -1) return "UNIX";
    if (ua.indexOf("Linux") !== -1) return "Linux";
    if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
    if (/Android/.test(ua)) return "Android";
    return navigator.platform || "Unknown";
  };

  // Player UI states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1.0); // 0.0 to 1.0
  const [isMuted, setIsMuted] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const [isQualitySwitching, setIsQualitySwitching] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        trackingDataRef.current.watchTime += 1;
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // YouTube metadata engagement states
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    fetchVideoAndRecommendations(location.state?.video);
    setLastPositionLoaded(false);
    setSavedPositionText('');
    
    return () => {
      clearInterval(trackingIntervalRef.current);
      saveProgress();
      
      if (currentTimeRef.current >= 1) {
        api.dashboard.getUser('watchHistory', { 
          id: idRef.current,
          title: videoRefData.current?.title || '',
          thumbnail: videoRefData.current?.thumbnail || videoRefData.current?.thumbnailUrl || videoRefData.current?.thumbnail_url || '',
          video_url: videoRefData.current?.videoUrl || videoRefData.current?.video_url || ''
        }).catch(err => {
          console.error("Failed to register watchHistory", err);
        });
      }
    };
  }, [id, location.state]);

  // Keyboard Hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'm':
          handleMuteToggle();
          break;
        case 'f':
          e.preventDefault();
          handleFullscreen();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSeek(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          handleSeek(5);
          break;
        case 'arrowup':
          e.preventDefault();
          const upVol = Math.min(1.0, volume + 0.1);
          handleVolumeChange(upVol);
          break;
        case 'arrowdown':
          e.preventDefault();
          const downVol = Math.max(0.0, volume - 0.1);
          handleVolumeChange(downVol);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted]);

  const fetchVideoAndRecommendations = async (passedVideo = null) => {
    setLoading(true);
    try {
      let videoData = passedVideo || location.state?.video;
      if (!videoData) {
        try {
          videoData = await api.videos.get(id);
        } catch (apiError) {
          console.warn("Could not load video details from API, using state or fallback", apiError);
        }
      }

      if (!videoData) {
        throw new Error('Video details not found');
      }

      setVideo(videoData);
      setLikesCount(videoData.views ? Math.round(videoData.views * 0.12) : 12);
      setIsLiked(false);
      setIsDisliked(false);
      setIsSubscribed(false);

      // Fetch watch history
      const history = await api.videos.getHistory().catch(() => []);
      const thisRecord = history.find(h => h.videoId === id);
      if (thisRecord && thisRecord.lastPosition > 5 && thisRecord.completionPercentage < 95) {
        const mins = Math.floor(thisRecord.lastPosition / 60);
        const secs = Math.floor(thisRecord.lastPosition % 60);
        setSavedPositionText(`${t('watch.resumeTitle')} (${mins}:${secs < 10 ? '0' : ''}${secs})`);
      }

      // Fetch related recommendations
      let list = [];
      try {
        list = await api.videos.list({ category: videoData.category });
      } catch (listError) {
        console.warn("Could not load recommendations", listError);
      }
      
      const filteredRecs = Array.isArray(list) 
        ? list.filter(v => String(v.id) !== String(id)) 
        : [];
      setRecommendations(filteredRecs.slice(0, 4));
    } catch (e) {
      console.error(e);
      setError('Failed to load video details');
    } finally {
      setLoading(false);
    }
  };

  const getCourseLessonsList = (courseObj) => {
    if (!courseObj) return [];
    if (Array.isArray(courseObj.chapters)) {
      const list = [];
      courseObj.chapters.forEach(chap => {
        if (Array.isArray(chap.videos)) {
          list.push(...chap.videos);
        } else if (Array.isArray(chap.lessons)) {
          list.push(...chap.lessons);
        }
      });
      if (list.length > 0) {
        return list.map((v, i) => {
          if (typeof v === 'string') {
            return { id: `${courseObj.id}-v-${i}`, title: `Lesson ${i + 1}`, videoUrl: v, thumbnailUrl: courseObj.thumbnail || '', thumbnail: courseObj.thumbnail || '' };
          }
          const tUrl = v.video_thumbnail || v.videoThumbnail || v.thumbnail || v.thumbnailUrl || v.thumbnail_url || courseObj.thumbnail || '';
          return { ...v, thumbnail: tUrl, thumbnailUrl: tUrl };
        });
      }
    }
    if (Array.isArray(courseObj.videos)) {
      return courseObj.videos.map((v, index) => {
        if (typeof v === 'string') {
          return {
            id: `${courseObj.id}-v-${index}`,
            title: `Lesson ${index + 1}`,
            videoUrl: v,
            thumbnailUrl: courseObj.thumbnail || '',
            thumbnail: courseObj.thumbnail || ''
          };
        }
        const tUrl = v.video_thumbnail || v.videoThumbnail || v.thumbnail || v.thumbnailUrl || v.thumbnail_url || courseObj.thumbnail || '';
        return { ...v, thumbnail: tUrl, thumbnailUrl: tUrl };
      });
    }
    if (Array.isArray(courseObj.lessons)) {
      return courseObj.lessons.map((l, index) => {
        if (typeof l === 'string') {
          return {
            id: `${courseObj.id}-l-${index}`,
            title: `Lesson ${index + 1}`,
            videoUrl: l,
            thumbnailUrl: courseObj.thumbnail || '',
            thumbnail: courseObj.thumbnail || ''
          };
        }
        const tUrl = l.video_thumbnail || l.videoThumbnail || l.thumbnail || l.thumbnailUrl || l.thumbnail_url || courseObj.thumbnail || '';
        return { ...l, thumbnail: tUrl, thumbnailUrl: tUrl };
      });
    }
    return [];
  };

  const startProgressTracking = () => {
    // Silent local tracking of metrics (watchTime increments automatically in active play interval)
  };

  const stopProgressTracking = () => {
    clearInterval(trackingIntervalRef.current);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    startProgressTracking();
  };

  const handlePause = () => {
    setIsPlaying(false);
    stopProgressTracking();
    if (videoRef.current && !videoRef.current.seeking && videoRef.current.currentTime < videoRef.current.duration) {
      trackingDataRef.current.pausedCount += 1;
    }
  };

  async function saveProgress() {
    const pos = Math.round(videoRef.current ? videoRef.current.currentTime : (currentTimeRef.current || 0));
    const dur = Math.round(videoRef.current ? (videoRef.current.duration || video?.duration || 300) : (video?.duration || 300));
    const deltaWatchTime = trackingDataRef.current.watchTime;
    
    // Only call API if they actually watched some duration since last save
    if (pos > 0 && deltaWatchTime > 0) {
      try {
        await api.dashboard.getUser('watchsession', {
          id,
          videoid: id,
          videoId: id,
          lastPosition: pos,
          lastPositionTime: formatTime(pos),
          duration: formatTime(dur),
          isNewSession: trackingDataRef.current.isNewSession,
          watchTime: formatTime(deltaWatchTime),
          pausedCount: trackingDataRef.current.pausedCount,
          forwardedCount: trackingDataRef.current.forwardedCount,
          backwardCount: trackingDataRef.current.backwardCount,
          title: video?.title || '',
          thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
          video_url: video?.videoUrl || video?.video_url || '',
          device_type: getDeviceType(),
          platform: getPlatform(),
          started_at: sessionStartedAtRef.current,
          ended_at: new Date().toISOString(),
          watch_duration_sec: deltaWatchTime,
          video_duration_sec: dur,
          status: Math.min(100, Math.round((pos / dur) * 100)) >= 90,
          staus: Math.min(100, Math.round((pos / dur) * 100)) >= 90,
          completion_percentage: Math.min(100, Math.round((pos / dur) * 100)),
          playback_speed: playbackSpeed,
          quality: quality,
          ip_address: ipAddress
        });
        // Reset watchTime to prevent duplicate calls on unmount
        trackingDataRef.current.watchTime = 0;
        trackingDataRef.current.isNewSession = false;
      } catch (e) {
        console.error("Failed to track video progress", e);
      }
    }
  };

  const handleResume = () => {
    if (videoRef.current) {
      api.videos.getHistory().then(history => {
        const thisRecord = history.find(h => h.videoId === id);
        if (thisRecord && thisRecord.lastPosition) {
          isResumingRef.current = true;
          videoRef.current.currentTime = thisRecord.lastPosition;
          prevTimeRef.current = thisRecord.lastPosition;
          videoRef.current.play().catch(e => console.log(e));
        }
      });
    }
    setSavedPositionText('');
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log(e));
      }
    }
  };

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      isResumingRef.current = true;
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      if (seconds > 0) {
        trackingDataRef.current.forwardedCount += 1;
      } else {
        trackingDataRef.current.backwardCount += 1;
      }
    }
  };

  const handleVolumeChange = (newVolume) => {
    const val = parseFloat(newVolume);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted && volume === 0) {
        handleVolumeChange(0.5);
      }
    }
  };

  const handleQualityChange = (newQuality) => {
    setQuality(newQuality);
    setIsQualitySwitching(true);
    
    // Simulate network quality switching delay
    if (videoRef.current) {
      videoRef.current.pause();
      const currentPos = videoRef.current.currentTime;
      setTimeout(() => {
        setIsQualitySwitching(false);
        if (videoRef.current) {
          videoRef.current.currentTime = currentPos;
          if (isPlaying) {
            videoRef.current.play().catch(e => console.log(e));
          }
        }
      }, 800);
    }
  };

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      currentTimeRef.current = videoRef.current.currentTime;
      setDuration(videoRef.current.duration || video?.duration || 0);
      if (!videoRef.current.seeking) {
        prevTimeRef.current = videoRef.current.currentTime;
      }
    }
  };

  const handleSeeked = () => {
    if (videoRef.current) {
      if (isResumingRef.current) {
        isResumingRef.current = false;
        prevTimeRef.current = videoRef.current.currentTime;
        return;
      }
      const current = videoRef.current.currentTime;
      const prev = prevTimeRef.current;
      if (current > prev + 1.5) {
        trackingDataRef.current.forwardedCount += 1;
      } else if (current < prev - 1.5) {
        trackingDataRef.current.backwardCount += 1;
      }
      prevTimeRef.current = current;
    }
  };

  const handleTimelineDragStart = () => {
    if (videoRef.current) {
      seekStartTimeRef.current = videoRef.current.currentTime;
    }
  };

  const handleTimelineDragEnd = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const start = seekStartTimeRef.current;
      if (current > start + 1.5) {
        trackingDataRef.current.forwardedCount += 1;
      } else if (current < start - 1.5) {
        trackingDataRef.current.backwardCount += 1;
      }
      prevTimeRef.current = current;
    }
  };

  const handleVideoEnded = () => {
    saveProgress();
  };

  function formatTime(timeInSeconds) {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isCurrentVideoLocked = () => {
    if (!video) return false;
    if (userPlan !== '1') return false;

    const vis = video.visibility ?? video.visibility_id ?? video.is_private ?? video.isPrivate ?? location.state?.course?.visibility ?? location.state?.course?.visibility_id;
    const visStr = String(vis || '').toLowerCase();
    return visStr === '2' || visStr === 'private' || vis === true || vis === 2;
  };

  const handleSaveToWatchLater = async () => {
    try {
      await api.dashboard.getUser('watchLater', { 
        id,
        title: video?.title || '',
        thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
        video_url: video?.videoUrl || video?.video_url || ''
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadVideo = async () => {
    if (userPlan === '1' || userPlan !== '2') {
      showUpgradeAlert('Need to upgrade your plan');
      return;
    }
    try {
      const videoUrl = video?.videoUrl || video?.video_url;
      if (!videoUrl) {
        return;
      }
      
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = videoUrl.split('/').pop().split('?')[0] || 'video.mp4';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      await api.dashboard.getUser('download_video', { 
        id,
        title: video?.title || '',
        thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
        video_url: videoUrl
      });
    } catch (e) {
      console.error("Download failed", e);
      try {
        const videoUrl = video?.videoUrl || video?.video_url;
        if (videoUrl) {
          window.open(videoUrl, '_blank');
          await api.dashboard.getUser('download_video', { 
            id,
            title: video?.title || '',
            thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
            video_url: videoUrl
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '100px' }}>{t('admin.loading')}</div>;
  if (error || !video) return <div style={{ color: '#ef4444', textAlign: 'center', padding: '100px' }}>{error || 'Video not found'}</div>;

  const srcUrl = (() => {
    const url = video.videoUrl || video.video_url;
    if (!url || url.includes('commondatastorage.googleapis.com') || url.startsWith('/videos/')) {
      return 'https://www.w3schools.com/html/mov_bbb.mp4';
    }
    if (url.startsWith('/uploads')) {
      const ext = url.split('.').pop().toLowerCase();
      if (['mp4', 'webm', 'ogg'].includes(ext)) {
        return `http://localhost:5000${url}`;
      }
      return 'https://www.w3schools.com/html/mov_bbb.mp4';
    }
    return url;
  })();

  return (
    <div className="watch-layout" style={{ padding: '32px 40px', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />

      {/* LEFT COLUMN: PLAYER & METADATA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Video Player */}
        <div className="video-player-container animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
          
          <video
            ref={videoRef}
            src={srcUrl}
            className="video-player-element"
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleSeeked}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleVideoEnded}
            onClick={handlePlayPause}
            onContextMenu={(e) => e.preventDefault()}
            controls={false}
            preload="auto"
          />

          {/* Buffering quality overlay spinner */}
          {isQualitySwitching && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 99
            }}>
              <span style={{ fontSize: '32px', animation: 'spin 1s infinite linear', marginBottom: '12px' }}>🌀</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Switching to {quality}...</span>
            </div>
          )}

          {/* Auto Resume Toast Overlay */}
          {savedPositionText && (
            <div style={{
              position: 'absolute',
              bottom: '90px',
              left: '20px',
              background: 'rgba(18, 18, 23, 0.95)',
              border: '1px solid var(--accent-secondary)',
              padding: '16px 20px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              zIndex: 100,
              boxShadow: 'var(--shadow-lg)',
              maxWidth: '320px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{savedPositionText}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleResume} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {t('watch.resumeBtn')}
                </button>
                <button onClick={() => setSavedPositionText('')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {t('watch.startOverBtn')}
                </button>
              </div>
            </div>
          )}

          {/* CUSTOM CONTROLS PANEL */}
          <div className="video-player-controls" style={{ flexWrap: 'wrap', gap: '12px' }}>
            
            {/* Play/Pause */}
            <button 
              onClick={handlePlayPause} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', width: '32px' }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Volume controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                onClick={handleMuteToggle}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title={t('watch.volume')}
              >
                {isMuted ? '🔇' : volume < 0.3 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(e.target.value)}
                style={{
                  width: '60px',
                  height: '4px',
                  accentColor: 'var(--accent-secondary)',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Rewind 10s */}
            <button 
              onClick={() => handleSeek(-10)} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
              title="Seek Back 10s"
            >
              ⏪ 10s
            </button>

            {/* Forward 10s */}
            <button 
              onClick={() => handleSeek(10)} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
              title="Seek Forward 10s"
            >
              10s ⏩
            </button>

            {/* Time Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
              <span style={{ fontSize: '12px', color: '#aaa', minWidth: '35px' }}>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (videoRef.current) videoRef.current.currentTime = e.target.value;
                }}
                onMouseDown={handleTimelineDragStart}
                onTouchStart={handleTimelineDragStart}
                onMouseUp={handleTimelineDragEnd}
                onTouchEnd={handleTimelineDragEnd}
                style={{
                  flex: 1,
                  height: '4px',
                  accentColor: 'var(--accent-primary)',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '12px', color: '#aaa', minWidth: '35px' }}>{formatTime(duration)}</span>
            </div>

            {/* Playback Speed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{t('watch.playbackSpeed')}:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                style={{
                  background: '#222',
                  border: '1px solid #444',
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '12px',
                  padding: '4px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="0.5" style={{ background: '#222', color: '#fff' }}>0.5x</option>
                <option value="1" style={{ background: '#222', color: '#fff' }}>1.0x</option>
                <option value="1.5" style={{ background: '#222', color: '#fff' }}>1.5x</option>
                <option value="2" style={{ background: '#222', color: '#fff' }}>2.0x</option>
              </select>
            </div>

            {/* Quality Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{t('watch.quality')}:</span>
              <select
                value={quality}
                onChange={(e) => handleQualityChange(e.target.value)}
                style={{
                  background: '#222',
                  border: '1px solid #444',
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '12px',
                  padding: '4px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="Auto" style={{ background: '#222', color: '#fff' }}>Auto</option>
                <option value="1080p" style={{ background: '#222', color: '#fff' }}>1080p</option>
                <option value="720p" style={{ background: '#222', color: '#fff' }}>720p</option>
                <option value="480p" style={{ background: '#222', color: '#fff' }}>480p</option>
              </select>
            </div>

            {/* Fullscreen */}
            <button 
              onClick={handleFullscreen} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
              title="Fullscreen"
            >
              🖵
            </button>

          </div>
        </div>

        {/* Widescreen YouTube Details Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
          {/* Large Video Title */}
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{video.title}</h1>
          
          {/* Action and channel row */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '16px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-color)'
          }} className="watch-engagement-row">
            
            {/* Publisher details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Channel Avatar bubble */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px'
              }}>
                LA
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>LurnAx Education</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>120K subscribers</span>
              </div>
              

            </div>

            {/* Engagement buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Like / Dislike pill */}
              <div style={{
                display: 'inline-flex',
                background: 'var(--bg-tertiary)',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}>
                <button 
                  onClick={() => {
                    if (isLiked) {
                      setIsLiked(false);
                      setLikesCount(prev => prev - 1);
                    } else {
                      setIsLiked(true);
                      setLikesCount(prev => prev + 1);
                      if (isDisliked) setIsDisliked(false);
                    }
                  }}
                  style={{
                    background: isLiked ? 'rgba(255,255,255,0.08)' : 'none',
                    border: 'none',
                    padding: '8px 16px',
                    color: isLiked ? 'var(--accent-secondary)' : 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  👍 {likesCount}
                </button>
                <div style={{ width: '1px', background: 'var(--border-color)' }} />
                <button 
                  onClick={() => {
                    if (isDisliked) {
                      setIsDisliked(false);
                    } else {
                      setIsDisliked(true);
                      if (isLiked) {
                        setIsLiked(false);
                        setLikesCount(prev => prev - 1);
                      }
                    }
                  }}
                  style={{
                    background: isDisliked ? 'rgba(255,255,255,0.08)' : 'none',
                    border: 'none',
                    padding: '8px 16px',
                    color: isDisliked ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  👎
                </button>
              </div>

              {/* Share button */}
              <button style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }} onClick={() => alert("Link copied to clipboard (Simulated)")}>
                🔗 Share
              </button>

              {/* Download button */}
              <button style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }} onClick={handleDownloadVideo}>
                📥 Download
              </button>

              {/* Watch Later button */}
              <button style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }} onClick={handleSaveToWatchLater}>
                🔖 Watch Later
              </button>
            </div>
          </div>

          {/* Collapsible Dark Description Box */}
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            lineHeight: '1.6'
          }} className="watch-description-box">
            <div style={{ fontWeight: 700, marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span>{video.views} {t('user.viewsCount')}</span>
              <span>•</span>
              <span>{video.category}</span>
              <span>•</span>
              <span>Published by: {video.uploadedBy === 'u-superadmin' ? 'Super Admin' : 'Admin'}</span>
            </div>
            
            <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
              {video.description || "No description provided for this lesson."}
            </p>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {video.tags && video.tags.map((tag, i) => (
                <span key={i} style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: RECOMMENDATIONS OR COURSE PLAYLIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {location.state?.course && getCourseLessonsList(location.state.course).length > 0 ? (
          (() => {
            const courseLessons = getCourseLessonsList(location.state.course);
            const courseTitle = location.state.course.title || location.state.course.course_name || 'Course';
            
            // Calculate completion progress
            const currentIdx = courseLessons.findIndex(l => String(l.id || l.videoUrl || l.video_url) === String(video?.id || video?.videoUrl || video?.video_url));
            const completedCount = currentIdx === -1 ? 0 : currentIdx; // Index represents number of lessons watched before this one
            const percent = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;
            const displayPercent = Math.min(100, Math.max(0, percent));
            
            // SVG Circular Progress Ring math
            const radius = 16;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '380px' }}>
                {/* Course Playlist Card Header Box */}
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '16px', 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>📖</span> Course Playlist
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {courseTitle} ({courseLessons.length} Lessons)
                      </div>
                    </div>
                    {/* SVG Progress Ring */}
                    <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="48" height="48" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r={radius} fill="transparent" stroke="var(--bg-tertiary)" strokeWidth="3" />
                        <circle cx="24" cy="24" r={radius} fill="transparent" stroke="#6366f1" strokeWidth="3" 
                          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                          transform="rotate(-90 24 24)" />
                      </svg>
                      <span style={{ position: 'absolute', fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>{displayPercent}%</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {completedCount} of {courseLessons.length} completed
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${displayPercent}%`, height: '100%', background: '#6366f1', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Lessons vertical list of cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {courseLessons.map((lesson, idx) => {
                    const isLessonActive = String(lesson.id || lesson.videoUrl || lesson.video_url) === String(video?.id || video?.videoUrl || video?.video_url);
                    const isLocked = isChapterLocked(lesson, location.state?.course);
                    const lessonThumb = lesson.thumbnail || lesson.thumbnailUrl || lesson.thumbnail_url || location.state?.course?.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
                    const lessonDuration = lesson.duration || (idx === 0 ? '5:21' : idx === 1 ? '8:45' : idx === 2 ? '6:30' : '7:15');

                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          if (isLocked) {
                            showUpgradeAlert('Need to upgrade your plan');
                            return;
                          }
                          navigate(`/watch/${lesson.id || idx}`, { state: { video: lesson, course: location.state.course, userPlan } });
                        }}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '12px',
                          cursor: 'pointer',
                          background: 'var(--bg-secondary)',
                          borderRadius: '12px',
                          border: isLessonActive ? '1.5px solid #6366f1' : '1px solid var(--border-color)',
                          boxShadow: isLessonActive ? '0 4px 15px rgba(99, 102, 241, 0.08)' : 'none',
                          transition: 'border 0.2s, background 0.2s',
                          opacity: isLocked ? 0.9 : 1
                        }}
                      >
                        {/* Thumbnail on left */}
                        <div style={{ position: 'relative', width: '90px', height: '54px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                          <img 
                            src={lessonThumb} 
                            alt={lesson.title || `Lesson ${idx + 1}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                          {isLocked && (
                            <div 
                              style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                background: 'rgba(0,0,0,0.75)',
                                color: '#f59e0b',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                              title="Need to upgrade your plan"
                            >
                              🔒 <span style={{ fontSize: '9px', color: '#fff' }}>PRO</span>
                            </div>
                          )}
                          {isLessonActive && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              backgroundColor: 'rgba(0,0,0,0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: '#6366f1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <span style={{ fontSize: '7px', color: '#fff', marginLeft: '1px' }}>▶</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Title and duration info */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ 
                              fontSize: '13px', 
                              fontWeight: '600', 
                              color: isLessonActive ? '#6366f1' : 'var(--text-primary)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: '1.3'
                            }}>
                              <span style={{ color: 'var(--text-secondary)', marginRight: '6px', fontWeight: '500' }}>{idx + 1}</span>
                              {lesson.title || lesson.name || `Lesson ${idx + 1}`}
                            </div>
                            {isLocked ? (
                              <span 
                                style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                  color: '#f59e0b',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="Need to upgrade your plan"
                              >
                                🔒 PRO
                              </span>
                            ) : isLessonActive ? (
                              <span style={{
                                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                color: '#6366f1',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '9px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}>
                                Now Playing
                              </span>
                            ) : null}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            <span>{lessonDuration}</span>
                            {isLocked ? (
                              <span style={{ fontSize: '12px', color: '#f59e0b' }}>🔒</span>
                            ) : (!isLessonActive && idx > completedCount ? (
                              <span style={{ fontSize: '11px' }}>🔒</span>
                            ) : null)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Continue Learning card at bottom */}
                {completedCount + 1 < courseLessons.length && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                      Continue Learning
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }} onClick={() => {
                      const nextIdx = completedCount + 1;
                      const nextLesson = courseLessons[nextIdx];
                      if (isChapterLocked(nextLesson, location.state?.course)) {
                        showUpgradeAlert('Need to upgrade your plan');
                        return;
                      }
                      navigate(`/watch/${nextLesson.id || nextIdx}`, { state: { video: nextLesson, course: location.state.course, userPlan } });
                    }}>
                      <div style={{ width: '70px', height: '42px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                        <img 
                          src={courseLessons[completedCount + 1]?.thumbnail || courseLessons[completedCount + 1]?.thumbnailUrl || courseLessons[completedCount + 1]?.thumbnail_url || location.state?.course?.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600'} 
                          alt="Next" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {courseLessons[completedCount + 1]?.title || 'Next Lesson'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Lesson {completedCount + 2} • {courseLessons[completedCount + 1]?.duration || '9:10'}
                        </div>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>&gt;</span>
                    </div>
                  </div>
                )}

                {/* View Full Course Content Button */}
                <button 
                  onClick={() => alert("Showing full course content details...")}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #6366f1',
                    color: '#6366f1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span>📋</span> View Full Course Content
                </button>
              </div>
            );
          })()
        ) : (
          <>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t('watch.recommended')}</h3>
            {recommendations.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('watch.noRelatedVideos')} {video?.category}</div>
            ) : (
              recommendations.map(rec => (
                <div 
                  key={rec.id} 
                  onClick={() => {
                    if (isChapterLocked(rec)) {
                      showUpgradeAlert('Need to upgrade your plan');
                      return;
                    }
                    navigate(`/watch/${rec.id}`, { state: { video: rec, userPlan } });
                  }}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    transition: 'transform 0.2s',
                    padding: '8px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <img 
                    src={(() => {
                      const thumb = rec.thumbnail || rec.thumbnailUrl || rec.thumbnail_url || '';
                      if (!thumb) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
                      return thumb.startsWith('http') ? thumb : `http://localhost:5000${thumb}`;
                    })()} 
                    alt={rec.title} 
                    style={{ width: '100px', height: '56px', objectFit: 'cover', borderRadius: '4px' }} 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {rec.views} {t('user.viewsCount')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* --- CUSTOM UPGRADE ALERT MODAL (Portal to document.body for viewport centering) --- */}
      {customAlert.show && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            width: '90%',
            maxWidth: '380px',
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#333333',
            animation: 'scaleIn 0.25s ease',
            position: 'relative'
          }}>
            {/* Crown Circle Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '3px solid #f59e0b',
              background: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '32px' }}>👑</span>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 12px 0'
            }}>
              {customAlert.title}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: '#4b5563',
              lineHeight: '1.5',
              margin: '0 0 28px 0'
            }}>
              {customAlert.message}
            </p>

            {/* Button */}
            <button
              onClick={() => setCustomAlert(prev => ({ ...prev, show: false }))}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              {customAlert.buttonText}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default VideoWatch;
