import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const VideoWatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [video, setVideo] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const [lastPositionLoaded, setLastPositionLoaded] = useState(false);
  const [savedPositionText, setSavedPositionText] = useState('');

  // Player UI states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1.0); // 0.0 to 1.0
  const [isMuted, setIsMuted] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const [isQualitySwitching, setIsQualitySwitching] = useState(false);

  // YouTube metadata engagement states
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);

  useEffect(() => {
    fetchVideoAndRecommendations();
    setLastPositionLoaded(false);
    setSavedPositionText('');
    
    return () => {
      clearInterval(trackingIntervalRef.current);
    };
  }, [id]);

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

  const fetchVideoAndRecommendations = async () => {
    setLoading(true);
    try {
      const videoData = await api.videos.get(id);
      setVideo(videoData);
      setLikesCount(videoData.views ? Math.round(videoData.views * 0.12) : 12);
      setIsLiked(false);
      setIsDisliked(false);
      setIsSubscribed(false);

      // Fetch watch history
      const history = await api.videos.getHistory();
      const thisRecord = history.find(h => h.videoId === id);
      if (thisRecord && thisRecord.lastPosition > 5 && thisRecord.completionPercentage < 95) {
        const mins = Math.floor(thisRecord.lastPosition / 60);
        const secs = Math.floor(thisRecord.lastPosition % 60);
        setSavedPositionText(`${t('watch.resumeTitle')} (${mins}:${secs < 10 ? '0' : ''}${secs})`);
      }

      // Fetch related recommendations
      const list = await api.videos.list({ category: videoData.category });
      setRecommendations(list.filter(v => v.id !== id).slice(0, 4));
    } catch (e) {
      setError('Failed to load video details');
    } finally {
      setLoading(false);
    }
  };

  const startProgressTracking = () => {
    trackingIntervalRef.current = setInterval(() => {
      saveProgress();
    }, 5000);
  };

  const stopProgressTracking = () => {
    clearInterval(trackingIntervalRef.current);
    saveProgress();
  };

  const saveProgress = async () => {
    if (videoRef.current) {
      const pos = Math.round(videoRef.current.currentTime);
      const dur = Math.round(videoRef.current.duration || video?.duration || 300);
      if (pos > 0) {
        try {
          await api.videos.track(id, pos, dur);
        } catch (e) {
          console.error("Failed to track video progress", e);
        }
      }
    }
  };

  const handleResume = () => {
    if (videoRef.current) {
      api.videos.getHistory().then(history => {
        const thisRecord = history.find(h => h.videoId === id);
        if (thisRecord && thisRecord.lastPosition) {
          videoRef.current.currentTime = thisRecord.lastPosition;
          videoRef.current.play().catch(e => console.log(e));
          setIsPlaying(true);
        }
      });
    }
    setSavedPositionText('');
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        stopProgressTracking();
      } else {
        videoRef.current.play().catch(e => console.log(e));
        setIsPlaying(true);
        startProgressTracking();
      }
    }
  };

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
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
      setDuration(videoRef.current.duration || video?.duration || 0);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    stopProgressTracking();
    saveProgress();
  };

  const formatTime = (timeInSeconds) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '100px' }}>{t('admin.loading')}</div>;
  if (error || !video) return <div style={{ color: '#ef4444', textAlign: 'center', padding: '100px' }}>{error || 'Video not found'}</div>;

  const srcUrl = (() => {
    const url = video.videoUrl;
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
            onEnded={handleVideoEnded}
            onClick={handlePlayPause}
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
                VS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>VStreem Education</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>120K subscribers</span>
              </div>
              
              {/* Subscribe button */}
              <button 
                onClick={() => setIsSubscribed(!isSubscribed)}
                style={{
                  marginLeft: '12px',
                  padding: '10px 18px',
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: isSubscribed ? 'var(--bg-tertiary)' : 'var(--text-primary)',
                  color: isSubscribed ? 'var(--text-primary)' : 'var(--bg-primary)',
                  transition: 'all 0.2s'
                }}
                className="subscribe-btn"
              >
                {isSubscribed ? `✓ ${t('watch.subscribed')}` : t('watch.subscribe')}
              </button>
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
              }} onClick={() => alert("Downloading video to simulated local storage...")}>
                📥 Download
              </button>

              {/* Save button */}
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
              }} onClick={() => alert("Added to Playlist (Simulated)")}>
                ➕ Save
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

      {/* RIGHT COLUMN: RECOMMENDATIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t('watch.recommended')}</h3>
        {recommendations.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('watch.noRelatedVideos')} {video.category}</div>
        ) : (
          recommendations.map(rec => (
            <div 
              key={rec.id} 
              onClick={() => navigate(`/watch/${rec.id}`)}
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
                src={rec.thumbnail.startsWith('http') ? rec.thumbnail : `http://localhost:5000${rec.thumbnail}`} 
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
      </div>

    </div>
  );
};

export default VideoWatch;
