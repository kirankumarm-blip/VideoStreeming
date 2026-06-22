import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

// Category map with emojis
const categoriesWithIcons = [
  { name: 'Science', icon: '🔬' },
  { name: 'Technology', icon: '💻' },
  { name: 'Finance', icon: '💰' },
  { name: 'AI', icon: '🤖' },
  { name: 'Business', icon: '📈' },
  { name: 'Health', icon: '🏥' },
  { name: 'Coding', icon: '👨‍💻' }
];

// YouTube-Style Hover Silent Video Preview Component
const HoverThumbnail = ({ video }) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef(null);
  const hoverTimeout = useRef(null);

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => {
      setIsHovered(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(e => console.log("Autoplay failed/blocked", e));
      }
    }, 500); // 500ms delay to filter accidental mouseovers
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout.current);
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  useEffect(() => {
    return () => clearTimeout(hoverTimeout.current);
  }, []);

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
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}
    >
      <img 
        src={video.thumbnail.startsWith('http') ? video.thumbnail : `http://localhost:5000${video.thumbnail}`} 
        alt={video.title} 
        className="thumbnail-img" 
        style={{ 
          opacity: isHovered ? 0 : 1, 
          transition: 'opacity 0.3s ease',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0
        }} 
      />
      
      <video
        ref={videoRef}
        src={srcUrl}
        muted
        loop
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

// Skeleton Loader Card component
const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-shimmer" />
  </div>
);

const UserDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL parameters mapping
  const activeView = searchParams.get('view') || 'home';
  const urlSearchQuery = searchParams.get('search') || '';

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filter Explore Page and Categories state
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterDuration, setFilterDuration] = useState('All');
  const [sortBy, setSortBy] = useState('views');
  
  // Favorites
  const [favIds, setFavIds] = useState(new Set());
  const [favoritesList, setFavoritesList] = useState([]);

  // Detailed Watch History state
  const [historyList, setHistoryList] = useState([]);

  // Community State
  const [comments, setComments] = useState([
    { id: 1, user: 'Dr. Sarah', text: 'Great progress on quantum physics course!', date: '2026-06-22T10:00:00Z', votes: 12 },
    { id: 2, user: 'Prof. Ramesh', text: 'Highly recommend practicing the coding algorithms in Lesson 4.', date: '2026-06-21T15:30:00Z', votes: 8 },
    { id: 3, user: 'Sunita Gowda', text: 'Anyone stuck on the final Entanglement module?', date: '2026-06-21T08:12:00Z', votes: 3 }
  ]);
  const [newComment, setNewComment] = useState('');

  // Sync Header search changes with local searchQuery
  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    fetchDashboard();
    fetchHistory();
    fetchFavorites();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.dashboard.getUser();
      setDashboardData(data);
      
      const favs = data.favorites || [];
      setFavIds(new Set(favs.map(f => f.id)));
    } catch (e) {
      console.error("Failed to load user dashboard", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const history = await api.videos.getHistory();
      setHistoryList(history);
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  const fetchFavorites = async () => {
    try {
      const favs = await api.videos.getFavorites();
      setFavoritesList(favs);
    } catch (e) {
      console.error("Failed to fetch favorites", e);
    }
  };

  const handleToggleFavorite = async (e, videoId) => {
    e.stopPropagation();
    try {
      const res = await api.videos.toggleFavorite(videoId);
      setFavIds(prev => {
        const next = new Set(prev);
        if (res.isFavorite) next.add(videoId);
        else next.delete(videoId);
        return next;
      });
      fetchFavorites();
      fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVideoCardClick = (id) => {
    navigate(`/watch/${id}`);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: comments.length + 1,
      user: 'Me',
      text: newComment,
      date: new Date().toISOString(),
      votes: 0
    };
    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  const handleVoteComment = (id) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, votes: c.votes + 1 } : c));
  };

  // Helper to filter videos dynamically for Explore
  const getFilteredExploreVideos = () => {
    const allVideosMap = {};
    [
      ...(dashboardData?.recommended || []), 
      ...(dashboardData?.trending || []), 
      ...(dashboardData?.topRated || []),
      ...(dashboardData?.newVideos || [])
    ].forEach(v => {
      allVideosMap[v.id] = v;
    });
    
    let allList = Object.values(allVideosMap);

    if (searchQuery) {
      allList = allList.filter(v => 
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedCategory) {
      allList = allList.filter(v => v.category === selectedCategory);
    }

    if (filterDifficulty !== 'All') {
      allList = allList.filter(v => v.difficulty?.toLowerCase() === filterDifficulty.toLowerCase());
    }

    if (filterDuration !== 'All') {
      allList = allList.filter(v => {
        const d = v.duration || 300;
        if (filterDuration === 'short') return d < 300; // < 5 mins
        if (filterDuration === 'medium') return d >= 300 && d <= 900; // 5-15 mins
        if (filterDuration === 'long') return d > 900; // > 15 mins
        return true;
      });
    }

    allList.sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return (b.views || 0) - (a.views || 0); // default views
    });

    return allList;
  };

  // Video Card rendering block
  const VideoCard = ({ video, progress }) => {
    const isFav = favIds.has(video.id);
    const percentage = progress?.completionPercentage || video.progress?.completionPercentage || 0;
    
    const formatDuration = (sec) => {
      if (!sec) return '00:00';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const renderStars = (rating) => {
      const r = rating || 4.5;
      const fullStars = Math.floor(r);
      const halfStar = r % 1 >= 0.5 ? '½' : '';
      return '★'.repeat(fullStars) + halfStar + '☆'.repeat(5 - fullStars - (halfStar ? 1 : 0));
    };

    return (
      <div 
        className="video-card" 
        onClick={() => handleVideoCardClick(video.id)}
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
      >
        <div className="thumbnail-container" style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
          <HoverThumbnail video={video} />
          
          {video.difficulty && (
            <span 
              className={`difficulty-badge difficulty-${video.difficulty.toLowerCase()}`}
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                zIndex: 10,
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '12px'
              }}
            >
              {t(`video.${video.difficulty.toLowerCase()}`, video.difficulty)}
            </span>
          )}

          <span 
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              zIndex: 10
            }}
          >
            {formatDuration(video.duration)}
          </span>

          <button
            onClick={(e) => handleToggleFavorite(e, video.id)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.6)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isFav ? '#f59e0b' : '#fff',
              fontSize: '14px',
              cursor: 'pointer',
              zIndex: 10
            }}
            title={isFav ? t('video.bookmark') : t('video.bookmark')}
          >
            ★
          </button>

          {percentage > 0 && (
            <div className="progress-bar-container" style={{ zIndex: 5 }}>
              <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
            </div>
          )}
        </div>

        <div className="video-info" style={{ padding: '12px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            margin: '0 0 6px 0',
            color: 'var(--text-primary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.3',
            minHeight: '36px'
          }}>
            {video.title}
          </h4>
          
          {video.instructor && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {t('video.instructor')}: <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{video.instructor}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#f59e0b', fontSize: '12px' }}>{renderStars(video.rating)}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>({video.rating || 4.5})</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {video.views || 0} {t('video.views')}
            </div>
          </div>

          {percentage > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--accent-secondary)', marginTop: '6px', fontWeight: 600 }}>
              {percentage}% {t('user.watchedPercent')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowX: 'hidden' }} className="user-dashboard-content animate-fade-in">
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
            {[1, 2, 3, 4].map(n => <SkeletonCard key={n} />)}
          </div>
        ) : (
          <>
            {/* ================= HOME VIEW ================= */}
            {activeView === 'home' && (
              <>
                {/* Hero Section Banner */}
                {dashboardData?.continueWatching && dashboardData.continueWatching.length > 0 ? (
                  (() => {
                    const lastWatched = dashboardData.continueWatching[0];
                    const totalDuration = lastWatched.duration || 300;
                    const watchedTime = lastWatched.progress?.lastPosition || 0;
                    const timeLeftMin = Math.ceil((totalDuration - watchedTime) / 60);
                    const progressPercent = lastWatched.progress?.completionPercentage || 0;
                    
                    return (
                      <div className="hero-banner animate-fade-in">
                        <div className="hero-content">
                          <span style={{
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            display: 'inline-block',
                            marginBottom: '12px'
                          }}>
                            {language === 'hi' ? 'कलिका जारी रखें' : language === 'kn' ? 'ಕಲಿಕೆಯನ್ನು ಮುಂದುವರಿಸಿ' : 'Continue Learning'}
                          </span>
                          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {lastWatched.title}
                          </h1>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0', maxWidth: '300px' }}>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-primary)' }} />
                            </div>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{progressPercent}%</span>
                          </div>
                          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginBottom: '20px' }}>
                            ⏱️ {timeLeftMin} {language === 'hi' ? 'मिनट बचे हैं' : language === 'kn' ? 'ನಿಮಿಷಗಳು ಉಳಿದಿವೆ' : 'mins left'}
                          </p>
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleVideoCardClick(lastWatched.id)}
                            style={{
                              padding: '12px 28px',
                              borderRadius: '24px',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)',
                              transition: 'transform 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            {language === 'hi' ? 'तुरंत शुरू करें' : language === 'kn' ? 'ತ್ವರಿತ ರೆಸ್ಯೂಮ್' : 'Quick Resume'} 🎬
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="hero-banner animate-fade-in">
                    <div className="hero-content">
                      <span style={{
                        background: 'var(--accent-secondary)',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        display: 'inline-block',
                        marginBottom: '12px'
                      }}>
                        {language === 'hi' ? 'विशेष पाठ' : language === 'kn' ? 'ವಿಶೇಷ ಪಾಠ' : 'Featured Course'}
                      </span>
                      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {language === 'hi' ? 'क्वांटम कंप्यूटिंग की खोज' : language === 'kn' ? 'ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಅನ್ವೇಷಣೆ' : 'Explore Quantum Computing'}
                      </h1>
                      <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.4' }}>
                        {language === 'hi' ? 'क्वांटम यांत्रिकी, सुपरपोजिशन और उलझाव में गहराई से गोता लगाएँ। आज ही अपना सीखने का सफर शुरू करें!' : language === 'kn' ? 'ಕ್ವಾಂಟಮ್ ಮೆಕ್ಯಾನಿಕ್ಸ್, ಸೂಪರ್ಪೋಸಿಷನ್ ಮತ್ತು ಎಂಟ್ಯಾಂಗಲ್ಮೆಂಟ್ ಬಗ್ಗೆ ಆಳವಾಗಿ ತಿಳಿಯಿರಿ. ಇಂದೇ ಕಲಿಕೆ ಆರಂಭಿಸಿ!' : 'Dive deep into quantum mechanics, superposition, and entanglement. Start your learning path today!'}
                      </p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          const firstRec = dashboardData?.recommended?.[0];
                          if (firstRec) handleVideoCardClick(firstRec.id);
                        }}
                        style={{
                          padding: '12px 28px',
                          borderRadius: '24px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)'
                        }}
                      >
                        {language === 'hi' ? 'सीखना शुरू करें' : language === 'kn' ? 'ಕಲಿಕೆ ಆರಂಭಿಸಿ' : 'Start Learning'} 🚀
                      </button>
                    </div>
                  </div>
                )}

                {/* Category Chips with Icons */}
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '32px', borderBottom: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setSearchParams({ view: 'explore' });
                    }}
                    style={{
                      padding: '8px 20px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '24px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    🧭 {t('user.allTopics')}
                  </button>
                  {categoriesWithIcons.map(cat => {
                    const dbCat = dashboardData?.categories.find(c => c.name === cat.name);
                    if (!dbCat) return null;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setSearchParams({ view: 'explore' });
                        }}
                        style={{
                          padding: '8px 20px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '24px',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <span>{cat.icon}</span> {cat.name} ({dbCat.videoCount})
                      </button>
                    );
                  })}
                </div>

                {/* Continue Watching Section */}
                {dashboardData?.continueWatching && dashboardData.continueWatching.length > 0 && (
                  <div style={{ marginBottom: '40px' }}>
                    <h3 className="video-section-title">{t('user.continueWatching')}</h3>
                    <div className="horizontal-scroll-row">
                      {dashboardData.continueWatching.map(video => (
                        <div key={video.id} style={{ flex: '0 0 280px' }}>
                          <VideoCard video={video} progress={video.progress} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Section */}
                <div style={{ marginBottom: '40px' }}>
                  <h3 className="video-section-title">{t('user.recommended')}</h3>
                  <div className="horizontal-scroll-row">
                    {(dashboardData?.recommended || []).map(video => (
                      <div key={video.id} style={{ flex: '0 0 280px' }}>
                        <VideoCard video={video} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trending Now Section */}
                <div style={{ marginBottom: '40px' }}>
                  <h3 className="video-section-title">🔥 {language === 'hi' ? 'ट्रेंडिंग वीडियो' : language === 'kn' ? 'ಟ್ರೆಂಡಿಂಗ್ ವೀಡಿಯೊಗಳು' : 'Trending Now'}</h3>
                  <div className="horizontal-scroll-row">
                    {(dashboardData?.trending || []).map(video => (
                      <div key={video.id} style={{ flex: '0 0 280px' }}>
                        <VideoCard video={video} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Because You Watched Contextual Recommendation */}
                {dashboardData?.becauseYouWatched && dashboardData.becauseYouWatched.videos?.length > 0 && (
                  <div style={{ marginBottom: '40px' }}>
                    <h3 className="video-section-title">
                      ✨ {language === 'hi' ? `चूंकि आपने ${dashboardData.becauseYouWatched.category} देखा` : language === 'kn' ? `ನೀವು ${dashboardData.becauseYouWatched.category} ವೀಕ್ಷಿಸಿದ್ದರಿಂದ` : `Because You Watched ${dashboardData.becauseYouWatched.category}`}
                    </h3>
                    <div className="horizontal-scroll-row">
                      {dashboardData.becauseYouWatched.videos.map(video => (
                        <div key={video.id} style={{ flex: '0 0 280px' }}>
                          <VideoCard video={video} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Rated Section */}
                <div style={{ marginBottom: '40px' }}>
                  <h3 className="video-section-title">⭐ {language === 'hi' ? 'शीर्ष रेटेड पाठ' : language === 'kn' ? 'ಉನ್ನತ ದರ್ಜೆಯ ಪಾಠಗಳು' : 'Top Rated Lessons'}</h3>
                  <div className="horizontal-scroll-row">
                    {(dashboardData?.topRated || []).map(video => (
                      <div key={video.id} style={{ flex: '0 0 280px' }}>
                        <VideoCard video={video} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Newly Added Section */}
                <div style={{ marginBottom: '40px' }}>
                  <h3 className="video-section-title">🆕 {t('user.newlyAdded')}</h3>
                  <div className="horizontal-scroll-row">
                    {(dashboardData?.newVideos || []).map(video => (
                      <div key={video.id} style={{ flex: '0 0 280px' }}>
                        <VideoCard video={video} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ================= EXPLORE VIEW ================= */}
            {activeView === 'explore' && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{t('sidebar.explore')}</h2>
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select 
                      value={filterDifficulty} 
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      className="form-input" 
                      style={{ width: 'auto', padding: '6px 12px', borderRadius: '8px' }}
                    >
                      <option value="All">{language === 'hi' ? 'सभी कठिनाइयां' : language === 'kn' ? 'ಎಲ್ಲಾ ಕಠಿಣತೆ' : 'All Difficulties'}</option>
                      <option value="Beginner">{t('video.beginner')}</option>
                      <option value="Intermediate">{t('video.intermediate')}</option>
                      <option value="Advanced">{t('video.advanced')}</option>
                    </select>

                    <select 
                      value={filterDuration} 
                      onChange={(e) => setFilterDuration(e.target.value)}
                      className="form-input" 
                      style={{ width: 'auto', padding: '6px 12px', borderRadius: '8px' }}
                    >
                      <option value="All">{language === 'hi' ? 'सभी अवधियां' : language === 'kn' ? 'ಎಲ್ಲಾ ಅವಧಿಗಳು' : 'All Durations'}</option>
                      <option value="short">&lt; 5 mins</option>
                      <option value="medium">5 - 15 mins</option>
                      <option value="long">&gt; 15 mins</option>
                    </select>

                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                      className="form-input" 
                      style={{ width: 'auto', padding: '6px 12px', borderRadius: '8px' }}
                    >
                      <option value="views">{t('video.views')}</option>
                      <option value="rating">{t('video.rating')}</option>
                      <option value="title">{language === 'hi' ? 'शीर्षक' : language === 'kn' ? 'ಶೀರ್ಷಿಕೆ' : 'Title'}</option>
                    </select>
                  </div>
                </div>

                <div className="youtube-video-grid">
                  {getFilteredExploreVideos().map(video => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </div>
            )}

            {/* ================= CATEGORIES VIEW ================= */}
            {activeView === 'categories' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>{t('sidebar.categories')}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px' }}>
                  {categoriesWithIcons.map(cat => {
                    const matched = dashboardData?.categories.find(c => c.name === cat.name);
                    const count = matched?.videoCount || 0;
                    
                    return (
                      <div 
                        key={cat.name}
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setSearchParams({ view: 'explore' });
                        }}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '16px',
                          padding: '24px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                          e.currentTarget.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{cat.icon}</div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{cat.name}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {count} {language === 'hi' ? 'वीडियो' : language === 'kn' ? 'ವೀಡಿಯೊಗಳು' : 'videos'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= MY LEARNING VIEW ================= */}
            {activeView === 'my_learning' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>{t('sidebar.myLearning')}</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                  
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', position: 'relative' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔥</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('metrics.streak')}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px' }}>
                      {dashboardData?.progressDashboard?.currentStreak || 5} {language === 'hi' ? 'दिन' : language === 'kn' ? 'ದಿನಗಳು' : 'Days'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', position: 'relative' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏱️</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('metrics.hoursWatched')}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px' }}>
                      {dashboardData?.progressDashboard?.hoursWatched || 4.2} hrs
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', position: 'relative' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('metrics.completed')}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px' }}>
                      {dashboardData?.progressDashboard?.coursesCompleted || 0}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', position: 'relative' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('metrics.certificatesEarned')}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px' }}>
                      {dashboardData?.progressDashboard?.certificatesEarned || 0}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', marginBottom: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>🎯 {t('metrics.weeklyGoal')}</h3>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                      {dashboardData?.progressDashboard?.weeklyProgress || 10}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${dashboardData?.progressDashboard?.weeklyProgress || 10}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' }} />
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                    {language === 'hi' ? 'अपना साप्ताहिक लक्ष्य पूरा करने के लिए वीडियो देखना जारी रखें!' : language === 'kn' ? 'ನಿಮ್ಮ ಸಾಪ್ತಾಹಿಕ ಗುರಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ವೀಡಿಯೊಗಳನ್ನು ವೀಕ್ಷಿಸುವುದನ್ನು ಮುಂದುವರಿಸಿ!' : 'Keep watching videos to hit your weekly learning target!'}
                  </p>
                </div>

                {dashboardData?.continueWatching && dashboardData.continueWatching.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>{t('user.continueWatching')}</h3>
                    <div className="youtube-video-grid">
                      {dashboardData.continueWatching.map(video => (
                        <VideoCard key={video.id} video={video} progress={video.progress} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= WATCH LATER VIEW ================= */}
            {activeView === 'watch_later' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>{t('sidebar.watchLater')}</h2>
                {favoritesList.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                    {language === 'hi' ? 'कोई बुकमार्क किए गए वीडियो नहीं मिले।' : language === 'kn' ? 'ಬುಕ್ಮಾರ್ಕ್ ಮಾಡಿದ ವೀಡಿಯೊಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' : 'No bookmarked videos found.'}
                  </div>
                ) : (
                  <div className="youtube-video-grid">
                    {favoritesList.map(video => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= DOWNLOADS VIEW ================= */}
            {activeView === 'downloads' && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{t('user.simulatedDownloads')}</h2>
                  <span className="badge badge-active" style={{ fontSize: '12px' }}>{t('user.offlineSyncActive')}</span>
                </div>
                <div className="youtube-video-grid">
                  {dashboardData?.recommended?.slice(0, 2).map(video => (
                    <VideoCard key={video.id} video={{ ...video, title: `[Offline] ${video.title}` }} />
                  ))}
                </div>
              </div>
            )}

            {/* ================= CERTIFICATES VIEW ================= */}
            {activeView === 'certificates' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>{t('sidebar.certificates')}</h2>
                
                {historyList.filter(h => h.status === 'completed' || h.completionPercentage >= 95).length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                    🏆 {language === 'hi' ? 'पूर्ण प्रमाण पत्र प्राप्त करने के लिए पाठ पूरे करें।' : language === 'kn' ? 'ಪ್ರಮಾಣಪತ್ರಗಳನ್ನು ಪಡೆಯಲು ಪಾಠಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.' : 'Complete lessons to earn completion certificates.'}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {historyList.filter(h => h.status === 'completed' || h.completionPercentage >= 95).map(h => {
                      if (!h.video) return null;
                      return (
                        <div 
                          key={h.id}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            padding: '24px',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '32px' }}>🏆</span>
                            <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>VERIFIED</span>
                          </div>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Certificate of Completion</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>This is proudly presented to you for completing the course:</p>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '8px 0' }}>{h.video.title}</p>
                          </div>
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: 'auto', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Instructor: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{h.video.instructor || 'Dr. Sarah'}</span>
                            <br />
                            Issued on: {new Date(h.watchDate).toLocaleDateString()}
                          </div>
                          <button 
                            onClick={() => alert(`LinkedIn Share Triggered for course: "${h.video.title}"!`)}
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px' }}
                          >
                            Share on LinkedIn 🔗
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= PROGRESS TRACKER VIEW ================= */}
            {activeView === 'progress_tracker' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>{t('sidebar.progressTracker')}</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                  
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '24px' }}>{t('analytics.completionRate')}</h3>
                    
                    <div className="analytics-gauge">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-tertiary)" strokeWidth="10" />
                        <circle 
                          cx="60" 
                          cy="60" 
                          r="50" 
                          fill="none" 
                          stroke="var(--accent-primary)" 
                          strokeWidth="10" 
                          strokeDasharray="314"
                          strokeDashoffset={314 - (314 * (dashboardData?.userAnalytics?.completionRate || 0)) / 100}
                          strokeLinecap="round"
                          transform="rotate(-90 60 60)"
                        />
                      </svg>
                      <div className="analytics-gauge-value">{dashboardData?.userAnalytics?.completionRate || 0}%</div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '20px', textAlign: 'center' }}>
                      {language === 'hi' ? 'पूर्ण पाठ बनाम शुरू किए गए पाठ।' : language === 'kn' ? 'ವೀಕ್ಷಿಸಿದ ಒಟ್ಟು ವೀಡಿಯೊಗಳಲ್ಲಿ ಪೂರ್ಣಗೊಂಡ ವೀಡಿಯೊಗಳು.' : 'Completed lessons relative to started ones.'}
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>{t('analytics.watchAnalytics')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('analytics.favoriteTopic')}</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-secondary)' }}>
                          {dashboardData?.userAnalytics?.favoriteTopic || 'Science'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('analytics.mostWatchedCategory')}</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-primary)' }}>
                          {dashboardData?.userAnalytics?.mostWatchedCategory || 'Science'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Time Logged</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                          {dashboardData?.userAnalytics?.totalWatchTime || 0} {language === 'hi' ? 'मिनट' : language === 'kn' ? 'ನಿಮಿಷಗಳು' : 'minutes'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= COMMUNITY VIEW ================= */}
            {activeView === 'community' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>{t('community.discussionBoards')}</h2>
                
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>{language === 'hi' ? 'चर्चा में शामिल हों' : language === 'kn' ? 'ಚರ್ಚೆಯಲ್ಲಿ ಭಾಗವಹಿಸಿ' : 'Join the conversation'}</h3>
                  <textarea
                    placeholder={t('community.askQuestion')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', height: '100px', borderRadius: '12px', padding: '12px', resize: 'none', marginBottom: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <button 
                    onClick={handleAddComment}
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', borderRadius: '20px', fontWeight: 600 }}
                  >
                    {t('community.postBtn')}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-secondary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '16px'
                      }}>
                        {c.user.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px' }}>{c.user}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(c.date).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{c.text}</p>
                        
                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                          <button 
                            onClick={() => handleVoteComment(c.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            ▲ {c.votes} {language === 'hi' ? 'वोट' : language === 'kn' ? 'ಮತಗಳು' : 'votes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= SETTINGS VIEW ================= */}
            {activeView === 'settings' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>{t('admin.menu.settings')}</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
                  
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>💳 Subscription & Gateway Plan</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)' }}>Premium Active Plan</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Expires in: 12 days
                        </div>
                      </div>
                      <button 
                        onClick={() => alert("Subscription Manage API Triggered!")}
                        className="btn btn-secondary"
                        style={{ padding: '10px 20px', borderRadius: '20px', fontWeight: 600 }}
                      >
                        Manage Billing / Upgrade
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>⚙️ General Preferences</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Autoplay Next Lesson</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Automatically start the next lesson when active one finishes.</div>
                        </div>
                        <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Email Course Updates</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Receive weekly digests and updates for assigned courses.</div>
                        </div>
                        <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
  );
};

export default UserDashboard;
