import { useState, useRef, useEffect, useCallback } from 'react';

export const SUPPORTED_SUBTITLE_LANGUAGES = [
  { code: 'en', label: 'English', name: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)', name: 'Hindi' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', name: 'Kannada' },
  { code: 'te', label: 'తెలుగు (Telugu)', name: 'Telugu' }
];

export function formatTime(timeInSeconds) {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
  const mins = Math.floor(timeInSeconds / 60);
  const secs = Math.floor(timeInSeconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const useVideoPlayer = ({
  video,
  transcriptCues = [],
  trackingDataRef,
  isResumingRef,
  prevTimeRef,
  seekStartTimeRef,
  currentTimeRef,
  onPlay,
  onPause
} = {}) => {
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const ccMenuRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [quality, setQuality] = useState('Auto');
  const [isQualitySwitching, setIsQualitySwitching] = useState(false);
  const [savedPositionText, setSavedPositionText] = useState('');

  // Subtitles & Captions
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [subtitleLang, setSubtitleLang] = useState('en');
  const [showCcMenu, setShowCcMenu] = useState(false);
  const [activeCue, setActiveCue] = useState(null);

  // Close CC popup menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ccMenuRef.current && !ccMenuRef.current.contains(e.target)) {
        setShowCcMenu(false);
      }
    };
    if (showCcMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCcMenu]);

  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log('Playback notice:', e));
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback((seconds) => {
    if (videoRef.current) {
      if (isResumingRef) isResumingRef.current = true;
      const targetTime = Math.max(0, Math.min(videoRef.current.duration || duration || 0, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = targetTime;
      if (trackingDataRef?.current) {
        if (seconds > 0) trackingDataRef.current.forwardedCount += 1;
        else trackingDataRef.current.backwardCount += 1;
      }
    }
  }, [duration, isResumingRef, trackingDataRef]);

  const handleSeekTo = useCallback((targetSeconds) => {
    if (videoRef.current) {
      if (isResumingRef) isResumingRef.current = true;
      const validTarget = Math.max(0, Math.min(videoRef.current.duration || duration || 1000, targetSeconds));
      videoRef.current.currentTime = validTarget;
      setCurrentTime(validTarget);
      if (currentTimeRef) currentTimeRef.current = validTarget;
      if (transcriptCues && transcriptCues.length > 0) {
        const match = transcriptCues.find(c => validTarget >= c.start && validTarget < c.end);
        setActiveCue(match || null);
      }
      if (!isPlaying) {
        videoRef.current.play().catch(e => console.log(e));
        setIsPlaying(true);
      }
    }
  }, [duration, isPlaying, transcriptCues, isResumingRef, currentTimeRef]);

  const handleVolumeChange = useCallback((newVolume) => {
    const val = parseFloat(newVolume);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  }, []);

  const handleMuteToggle = useCallback(() => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted && volume === 0) {
        handleVolumeChange(0.5);
      }
    }
  }, [isMuted, volume, handleVolumeChange]);

  const handleQualityChange = useCallback((newQuality) => {
    setQuality(newQuality);
    setIsQualitySwitching(true);
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
  }, [isPlaying]);

  const handleSpeedChange = useCallback((speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    const target = playerContainerRef.current || videoRef.current;
    if (target) {
      if (!document.fullscreenElement) {
        if (target.requestFullscreen) target.requestFullscreen();
        else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
        else if (target.msRequestFullscreen) target.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      if (currentTimeRef) currentTimeRef.current = cur;
      const dur = videoRef.current.duration || video?.duration || 0;
      setDuration(dur);
      if (!videoRef.current.seeking && prevTimeRef) {
        prevTimeRef.current = cur;
      }
      if (transcriptCues && transcriptCues.length > 0) {
        const match = transcriptCues.find(c => cur >= c.start && cur < c.end);
        setActiveCue(match || null);
      }
    }
  }, [video?.duration, transcriptCues, currentTimeRef, prevTimeRef]);

  const handleTimelineDragStart = useCallback(() => {
    if (videoRef.current && seekStartTimeRef) {
      seekStartTimeRef.current = videoRef.current.currentTime;
    }
  }, [seekStartTimeRef]);

  const handleTimelineDragEnd = useCallback(() => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const start = seekStartTimeRef ? seekStartTimeRef.current : 0;
      if (trackingDataRef?.current) {
        if (current > start + 1.5) trackingDataRef.current.forwardedCount += 1;
        else if (current < start - 1.5) trackingDataRef.current.backwardCount += 1;
      }
      if (prevTimeRef) prevTimeRef.current = current;
    }
  }, [seekStartTimeRef, trackingDataRef, prevTimeRef]);

  // Hotkeys listener
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
        case 'c':
          setSubtitlesEnabled(prev => !prev);
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
          handleVolumeChange(Math.min(1.0, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0.0, volume - 0.1));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleMuteToggle, handleFullscreen, handleSeek, handleVolumeChange, volume]);

  return {
    videoRef,
    playerContainerRef,
    ccMenuRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    playbackSpeed,
    setPlaybackSpeed,
    quality,
    setQuality,
    isQualitySwitching,
    setIsQualitySwitching,
    savedPositionText,
    setSavedPositionText,
    subtitlesEnabled,
    setSubtitlesEnabled,
    subtitleLang,
    setSubtitleLang,
    showCcMenu,
    setShowCcMenu,
    activeCue,
    setActiveCue,
    handlePlayPause,
    handleSeek,
    handleSeekTo,
    handleVolumeChange,
    handleMuteToggle,
    handleSpeedChange,
    handleQualityChange,
    handleFullscreen,
    handleTimeUpdate,
    handleTimelineDragStart,
    handleTimelineDragEnd,
    formatTime
  };
};

export default useVideoPlayer;
