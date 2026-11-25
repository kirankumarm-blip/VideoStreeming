import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import PremiumSelect from '../PremiumSelect';
import logoImg from '../../assets/logo.png';
import { SUPPORTED_SUBTITLE_LANGUAGES, formatTime } from '../../hooks/useVideoPlayer';

const Player = ({
  playerContainerRef,
  videoRef,
  srcUrl,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackSpeed,
  quality,
  isQualitySwitching,
  savedPositionText,
  subtitlesEnabled,
  subtitleLang,
  showCcMenu,
  ccMenuRef,
  activeCue,
  availableLanguages = SUPPORTED_SUBTITLE_LANGUAGES,
  multilingualData,
  fetchedVttTranscripts,
  generateTranscriptForVideo,
  video,
  // Handlers
  handlePlayPause,
  handlePlay,
  handlePause,
  handleVideoEnded,
  handleTimeUpdate,
  handleSeeked,
  handleSeek,
  handleVolumeChange,
  handleMuteToggle,
  handleSpeedChange,
  handleQualityChange,
  handleFullscreen,
  handleTimelineDragStart,
  handleTimelineDragEnd,
  handleResume,
  setSavedPositionText,
  setSubtitlesEnabled,
  setShowCcMenu,
  setSubtitleLang,
  setActiveCue,
  // Overlays & external state
  activeStudyRoom,
  setShowStudyRoomDrawer,
  studyRoomMembers = [],
  studySyncBanner,
  userEmail
}) => {
  const { t } = useLanguage();

  return (
    <div 
      ref={playerContainerRef}
      className="video-player-container animate-fade-in" 
      style={{ position: 'relative', overflow: 'hidden' }}
    >
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

      {/* Top-Right Video Watermark: Brand Logo & User Email */}
      <div 
        className="video-watermark-overlay"
        style={{
          position: 'absolute',
          top: '14px',
          right: '18px',
          zIndex: 35,
          pointerEvents: 'none',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '4px'
        }}
      >
        <img 
          src={logoImg} 
          alt="XLurn" 
          width={119}
          height={34}
          decoding="async"
          style={{ 
            height: '34px', 
            width: 'auto', 
            maxWidth: '130px', 
            objectFit: 'contain',
            display: 'block',
            filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.9))'
          }} 
        />

        {userEmail && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.85)',
            fontFamily: 'monospace, sans-serif',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.9)',
            letterSpacing: '0.4px'
          }}>
            {userEmail}
          </span>
        )}
      </div>

      {/* Top-Left Live Study Room Indicator */}
      {activeStudyRoom && (
        <div 
          onClick={() => setShowStudyRoomDrawer && setShowStudyRoomDrawer(v => !v)}
          style={{
            position: 'absolute',
            top: '14px',
            left: '18px',
            zIndex: 35,
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(16, 185, 129, 0.6)',
            borderRadius: '20px',
            padding: '6px 14px',
            color: '#34d399',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
            transition: 'all 0.2s ease'
          }}
          title="Click to toggle Study Room Chat & Members"
        >
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#10b981',
            boxShadow: '0 0 8px #10b981'
          }} />
          <span>{activeStudyRoom.roomId}</span>
          <span style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: '11px', fontWeight: 500 }}>
            ({studyRoomMembers?.length || 1} online)
          </span>
        </div>
      )}

      {/* Real-Time Sync Action Banner */}
      {studySyncBanner && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 45,
          background: 'rgba(15, 23, 42, 0.94)',
          border: '1px solid #6366f1',
          color: '#ffffff',
          padding: '8px 20px',
          borderRadius: '24px',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 6px 24px rgba(99, 102, 241, 0.45)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'none'
        }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
          {studySyncBanner}
        </div>
      )}

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
              {t('watch.resumeBtn', 'Resume')}
            </button>
            <button onClick={() => setSavedPositionText && setSavedPositionText('')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              {t('watch.startOverBtn', 'Start Over')}
            </button>
          </div>
        </div>
      )}

      {/* YouTube-Style Synchronized Subtitle Caption Overlay */}
      {subtitlesEnabled && activeCue && (
        <div 
          className="video-subtitle-overlay animate-fade-in"
          style={{
            position: 'absolute',
            bottom: '62px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(8, 8, 8, 0.82)',
            color: '#ffffff',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 500,
            lineHeight: '1.35',
            fontFamily: '"YouTube Noto", Roboto, "Segoe UI", Arial, sans-serif',
            textAlign: 'center',
            maxWidth: '85%',
            zIndex: 30,
            pointerEvents: 'none',
            textShadow: '0 0 2px #000, 0 1px 2px #000',
            letterSpacing: '0.3px',
            transition: 'all 0.12s ease-out',
            userSelect: 'none'
          }}
        >
          <span>{activeCue.text}</span>
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
            title={t('watch.volume', 'Volume')}
          >
            {isMuted ? '🔇' : volume < 0.3 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
          </button>
          <input 
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange && handleVolumeChange(e.target.value)}
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
          onClick={() => handleSeek && handleSeek(-10)} 
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
          title="Seek Back 10s"
        >
          ⏪ 10s
        </button>

        {/* Forward 10s */}
        <button 
          onClick={() => handleSeek && handleSeek(10)} 
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
              if (videoRef?.current) videoRef.current.currentTime = e.target.value;
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

        {/* Subtitles CC Button with Language Selector Menu */}
        <div className="cc-control-wrapper" ref={ccMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowCcMenu && setShowCcMenu(prev => !prev)}
            style={{
              background: subtitlesEnabled ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
              border: subtitlesEnabled ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.25)',
              color: subtitlesEnabled ? 'var(--accent-secondary)' : '#ffffff',
              fontWeight: 800,
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={subtitlesEnabled ? `Captions: ${availableLanguages.find(l => l.code === subtitleLang)?.name || 'ON'} (Click to change)` : 'Closed Captions (CC)'}
          >
            <span>CC</span>
            {subtitlesEnabled && (
              <span style={{ 
                fontSize: '9px', 
                background: 'var(--accent-primary)', 
                color: '#fff', 
                padding: '1px 4px', 
                borderRadius: '3px', 
                textTransform: 'uppercase',
                fontWeight: 700
              }}>
                {subtitleLang}
              </span>
            )}
          </button>

          {/* CC Language Selection Popover */}
          {showCcMenu && (
            <div 
              className="cc-menu-dropdown animate-fade-in"
              style={{
                position: 'absolute',
                bottom: '36px',
                left: '0',
                background: 'rgba(18, 18, 24, 0.96)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '6px 0',
                minWidth: '140px',
                zIndex: 120,
                boxShadow: '0 8px 24px rgba(0,0,0,0.7)'
              }}
            >
              <div style={{
                padding: '4px 12px 6px',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'rgba(255,255,255,0.45)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '4px'
              }}>
                Closed Captions
              </div>

              {/* Off Option */}
              <div
                onClick={() => {
                  setSubtitlesEnabled && setSubtitlesEnabled(false);
                  setShowCcMenu && setShowCcMenu(false);
                }}
                style={{
                  padding: '7px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: !subtitlesEnabled ? 'var(--accent-secondary)' : '#ffffff',
                  background: !subtitlesEnabled ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  fontWeight: !subtitlesEnabled ? 700 : 400,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (subtitlesEnabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (subtitlesEnabled) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>Off</span>
                {!subtitlesEnabled && <span style={{ color: 'var(--accent-primary)', fontSize: '13px' }}>✓</span>}
              </div>

              {/* Supported Language Options */}
              {availableLanguages.map(lang => {
                const isSelected = subtitlesEnabled && subtitleLang === lang.code;
                return (
                  <div
                    key={lang.code}
                    onClick={() => {
                      setSubtitleLang && setSubtitleLang(lang.code);
                      setSubtitlesEnabled && setSubtitlesEnabled(true);
                      setShowCcMenu && setShowCcMenu(false);
                      if (videoRef?.current && multilingualData) {
                        const cur = videoRef.current.currentTime;
                        const cues = (multilingualData.transcripts?.[lang.code] || []).length > 0
                          ? multilingualData.transcripts[lang.code]
                          : (fetchedVttTranscripts?.[lang.code] || (generateTranscriptForVideo ? generateTranscriptForVideo(video, lang.code, duration || 180) : []));
                        const match = cues.find(c => cur >= c.start && cur < c.end);
                        setActiveCue && setActiveCue(match || null);
                      }
                    }}
                    style={{
                      padding: '7px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: isSelected ? 'var(--accent-secondary)' : '#ffffff',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      fontWeight: isSelected ? 700 : 400,
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{lang.label || lang.name}</span>
                    {isSelected && <span style={{ color: 'var(--accent-primary)', fontSize: '13px' }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Playback Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#aaa' }}>{t('watch.playbackSpeed', 'Speed')}:</span>
          <PremiumSelect
            options={[
              { id: '0.5', name: '0.5x' },
              { id: '1', name: '1.0x' },
              { id: '1.5', name: '1.5x' },
              { id: '2', name: '2.0x' }
            ]}
            value={String(playbackSpeed)}
            onChange={(e) => handleSpeedChange && handleSpeedChange(parseFloat(e.target.value))}
            searchable={false}
            size="small"
            icon="fa-solid fa-gauge-high"
            style={{ width: '76px' }}
            dropUp={true}
          />
        </div>

        {/* Quality Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#aaa' }}>{t('watch.quality', 'Quality')}:</span>
          <PremiumSelect
            options={[
              { id: 'Auto', name: 'Auto' },
              { id: '1080p', name: '1080p' },
              { id: '720p', name: '720p' },
              { id: '480p', name: '480p' }
            ]}
            value={quality}
            onChange={(e) => handleQualityChange && handleQualityChange(e.target.value)}
            searchable={false}
            size="small"
            icon="fa-solid fa-sliders"
            style={{ width: '82px' }}
            dropUp={true}
          />
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
  );
};

export default Player;
