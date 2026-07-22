import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getCurrentUser } from '../services/api';
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

// Fallback static videos for categories that have no data
const fallbackStaticVideos = [
  {
    id: 'sb-sci-1',
    title: 'Introduction to Quantum Physics',
    description: 'Learn the fundamentals of quantum mechanics, wave-particle duality, and the Schrödinger equation.',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    category: 'Science',
    duration: 320,
    views: 1200,
    rating: 4.8,
    instructor: 'Dr. Sarah Jenkins',
    difficulty: 'Intermediate',
    tags: ['quantum', 'physics', 'science']
  },
  {
    id: 'sb-sci-2',
    title: 'The Wonders of Organic Chemistry',
    description: 'Explore the fascinating world of carbon compounds, reactions mechanisms, and molecular structures.',
    thumbnail: 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?w=600',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    category: 'Science',
    duration: 280,
    views: 950,
    rating: 4.6,
    instructor: 'Prof. Alan Turing',
    difficulty: 'Beginner',
    tags: ['chemistry', 'organic', 'science']
  },
  {
    id: 'sb-tech-1',
    title: 'How the Internet Works Under the Hood',
    description: 'A deep dive into DNS, TCP/IP, IP routing, HTTP packets, and client-server architectures.',
    thumbnail: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    category: 'Technology',
    duration: 450,
    views: 3100,
    rating: 4.9,
    instructor: 'Markus Persson',
    difficulty: 'Beginner',
    tags: ['networking', 'internet', 'tech']
  },
  {
    id: 'sb-tech-2',
    title: 'Building Modern Cloud Infrastructures',
    description: 'Deploying secure, load-balanced scalable services on AWS, Docker, and Kubernetes.',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    category: 'Technology',
    duration: 620,
    views: 1800,
    rating: 4.7,
    instructor: 'Linus Torvalds',
    difficulty: 'Advanced',
    tags: ['aws', 'kubernetes', 'cloud']
  },
  {
    id: 'sb-fin-1',
    title: 'Stock Market Essentials for Beginners',
    description: 'Understanding stock tickers, market caps, P/E ratios, dividends, and compound interest growth.',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    category: 'Finance',
    duration: 380,
    views: 4200,
    rating: 4.5,
    instructor: 'Warren Buffett',
    difficulty: 'Beginner',
    tags: ['stocks', 'investing', 'finance']
  },
  {
    id: 'sb-ai-1',
    title: 'Demystifying Large Language Models',
    description: 'How transformers, attention mechanisms, embeddings, and prompt tuning work in modern generative AI.',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    category: 'AI',
    duration: 510,
    views: 5400,
    rating: 4.9,
    instructor: 'Andrew Ng',
    difficulty: 'Intermediate',
    tags: ['llm', 'generative ai', 'transformers']
  },
  {
    id: 'sb-bus-1',
    title: 'Negotiation Skills for Executives',
    description: 'Master the art of leverage, active listening, win-win framing, and closing deals successfully.',
    thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    category: 'Business',
    duration: 340,
    views: 1300,
    rating: 4.7,
    instructor: 'Sheryl Sandberg',
    difficulty: 'Intermediate',
    tags: ['negotiation', 'leadership', 'business']
  },
  {
    id: 'sb-health-1',
    title: 'The Science of Sleep and Brain Performance',
    description: 'Optimize your circadian rhythm, REM cycles, and mental focus using evidence-based habits.',
    thumbnail: 'https://images.unsplash.com/photo-1511295742364-92791a13622d?w=600',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    category: 'Health',
    duration: 290,
    views: 2900,
    rating: 4.8,
    instructor: 'Dr. Matthew Walker',
    difficulty: 'Beginner',
    tags: ['sleep', 'neuroscience', 'wellness']
  },
  {
    id: 'sb-coding-1',
    title: 'React 19 Core Concepts Explained',
    description: 'Master React Server Components, server actions, useActionState, and the compiler in React 19.',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    category: 'Coding',
    duration: 480,
    views: 6700,
    rating: 4.9,
    instructor: 'Dan Abramov',
    difficulty: 'Intermediate',
    tags: ['react', 'javascript', 'coding']
  }
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
    const url = video.videoUrl || video.video_url;
    if (!url) {
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

  const thumbUrl = (() => {
    const thumb = video.thumbnail || '';
    if (!thumb) {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
    }
    return thumb.startsWith('http') ? thumb : `http://localhost:5000${thumb}`;
  })();

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}
    >
      <img 
        src={thumbUrl} 
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
        onContextMenu={(e) => e.preventDefault()}
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

// Premium Gold PRO Badge component matching user design spec
const ProBadge = ({ onClick }) => (
  <div 
    onClick={(e) => {
      e.stopPropagation();
      if (onClick) onClick(e);
    }}
    style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'radial-gradient(100% 100% at 50% 0%, #2a2217 0%, #0c0a08 100%)',
      border: '1.5px solid #d4af37',
      borderRadius: '24px',
      padding: '4px 14px 4px 10px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 0 12px rgba(212, 175, 55, 0.45), inset 0 1px 2px rgba(255, 235, 170, 0.4)',
      cursor: 'pointer',
      zIndex: 15,
      backdropFilter: 'blur(4px)',
      transition: 'transform 0.2s, box-shadow 0.2s'
    }}
    title="Need to upgrade your plan"
  >
    {/* SVG Golden Crown Icon */}
    <svg width="18" height="15" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldCrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe699" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#aa7c11" />
        </linearGradient>
      </defs>
      <path 
        d="M2 17H22V19H2V17ZM2 15L4.5 7L9 11L12 3L15 11L19.5 7L22 15H2Z" 
        fill="url(#goldCrownGrad)" 
      />
      <circle cx="4.5" cy="5.5" r="1.5" fill="#ffe699" />
      <circle cx="12" cy="1.5" r="1.5" fill="#ffe699" />
      <circle cx="19.5" cy="5.5" r="1.5" fill="#ffe699" />
    </svg>

    <span 
      style={{
        fontFamily: "'Playfair Display', 'Cinzel', 'Georgia', serif",
        fontSize: '13px',
        fontWeight: 800,
        letterSpacing: '1.2px',
        background: 'linear-gradient(180deg, #fff0c2 0%, #d4af37 70%, #aa7c11 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textTransform: 'uppercase'
      }}
    >
      PRO
    </span>
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

  // Custom Alert Modal State (Matches Login.js popup style)
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
  
  // Filter Explore Page and Categories state
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterDuration, setFilterDuration] = useState('All');
  const [sortBy, setSortBy] = useState('views');
  
  // Favorites
  const [favIds, setFavIds] = useState(new Set());
  const [favoritesList, setFavoritesList] = useState([]);
  const [downloadsList, setDownloadsList] = useState([]);
  const [exploreVideosList, setExploreVideosList] = useState([]);
  const [categoryVideosList, setCategoryVideosList] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Detailed Watch History state
  const [historyList, setHistoryList] = useState([]);

  // Community State
  const [comments, setComments] = useState([
    { id: 1, user: 'Dr. Sarah', text: 'Great progress on quantum physics course!', date: '2026-06-22T10:00:00Z', votes: 12 },
    { id: 2, user: 'Prof. Ramesh', text: 'Highly recommend practicing the coding algorithms in Lesson 4.', date: '2026-06-21T15:30:00Z', votes: 8 },
    { id: 3, user: 'Sunita Gowda', text: 'Anyone stuck on the final Entanglement module?', date: '2026-06-21T08:12:00Z', votes: 3 }
  ]);
  const [newComment, setNewComment] = useState('');

  // Combine your_courses and trending videos, then shuffle them together
  const allTopicsCombined = useMemo(() => {
    if (!dashboardData) return [];
    const courses = dashboardData.your_courses || dashboardData.yourCourses || [];
    const trending = dashboardData.trending || [];
    const combined = [...courses, ...trending];
    
    // Fisher-Yates Shuffle
    const arr = [...combined];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [dashboardData]);

  // Sync Header search changes with local searchQuery
  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    // Removed automatic history and favorites fetch
  }, []);

  useEffect(() => {
    if (activeView === 'home') {
      fetchDashboard('Dashboard');
    } else if (activeView === 'watch_later') {
      fetchDashboard('getwatchLaterVideos');
    } else if (activeView === 'downloads') {
      fetchDashboard('download_history');
    } else if (activeView === 'explore') {
      fetchExploreVideos();
    }
  }, [activeView]);

  useEffect(() => {
    if (selectedCategory) {
      const catId = typeof selectedCategory === 'object' ? (selectedCategory.id || selectedCategory.name) : selectedCategory;
      const subId = selectedSubCategory ? (typeof selectedSubCategory === 'object' ? (selectedSubCategory.id || selectedSubCategory.name) : selectedSubCategory) : null;
      fetchCategoryVideos(catId, subId);
    } else {
      setCategoryVideosList([]);
    }
  }, [selectedCategory, selectedSubCategory]);

  const fetchExploreVideos = async () => {
    setLoading(true);
    try {
      const data = await api.dashboard.getUser('getExplore Video');
      console.log("Explore videos from API:", data);
      const list = Array.isArray(data) ? data : (data.json || data.videos || []);
      setExploreVideosList(list);
    } catch (e) {
      console.error("Failed to load explore videos", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryVideos = async (categoryId, subCategory = null) => {
    setCategoryLoading(true);
    try {
      const payload = { category_id: categoryId };
      if (subCategory) {
        payload.sub_category = subCategory;
      }
      const data = await api.dashboard.getUser('getCategoryVideo', payload);
      console.log(`Category videos for category_id: ${categoryId}, sub_category: ${subCategory}:`, data);
      const list = Array.isArray(data) ? data : (data.json || data.videos || []);
      setCategoryVideosList(list);
    } catch (e) {
      console.error("Failed to load category videos", e);
    } finally {
      setCategoryLoading(false);
    }
  };

  const fetchDashboard = async (formStep = 'Dashboard') => {
    setLoading(true);
    try {
      const data = await api.dashboard.getUser(formStep);
      console.log(`User dashboard data (${formStep || 'home'}) from API:`, data);
      
      if (formStep === 'getwatchLaterVideos' || formStep === 'watchLater') {
        const list = Array.isArray(data) ? data : (data.json || data.favorites || data.watchLater || data.watchLaterVideos || []);
        setFavoritesList(list);
      } else if (formStep === 'download_history' || formStep === 'downloads') {
        const list = Array.isArray(data) ? data : (data.json || data.downloads || data.downloadHistory || data.download_history || []);
        setDownloadsList(list);
      } else {
        const actualData = Array.isArray(data) ? (data[0] || {}) : (data.json || data || {});
        
        const categoriesList = actualData.categories || [];
        const recommended = actualData.recommended || [];
        const trending = actualData.trending || [];
        const topRated = actualData.top_rated || actualData.topRated || [];
        const newVideos = actualData.new_lessons || actualData.newVideos || [];
        let yourCourses = actualData.your_courses || actualData.yourCourses || [];
        if (!yourCourses || yourCourses.length === 0) {
          yourCourses = [
            {
              id: 'c1',
              title: 'Quantum Computing Basics',
              thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=60',
              total_chapters: 12,
              total_lessons: 24,
              progress: 75
            },
            {
              id: 'c2',
              title: 'Full Stack Web Development',
              thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=60',
              total_chapters: 8,
              total_lessons: 32,
              progress: 40
            },
            {
              id: 'c3',
              title: 'Data Science with Python',
              thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=60',
              total_chapters: 10,
              total_lessons: 28,
              progress: 60
            },
            {
              id: 'c4',
              title: 'Mobile App Design',
              thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&auto=format&fit=crop&q=60',
              total_chapters: 6,
              total_lessons: 18,
              progress: 30
            }
          ];
        }

        setDashboardData({
          ...actualData,
          categories: categoriesList,
          recommended,
          trending,
          topRated,
          newVideos,
          yourCourses
        });
        const favs = actualData.favorites || [];
        setFavIds(new Set(favs.map(f => f.id)));
      }
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

  const isVideoLocked = (item) => {
    if (!item) return false;
    const currentUser = getCurrentUser();
    const userPlan = String(dashboardData?.user_plan ?? dashboardData?.user_plan_id ?? currentUser?.user_plan ?? currentUser?.user_plan_id ?? '1');
    const itemVisibility = String(item.visibility ?? item.visibility_id ?? '1');
    return userPlan === '1' && itemVisibility === '2';
  };

  const handleVideoCardClick = (video, courseContext = null) => {
    if (isVideoLocked(video) || (courseContext && isVideoLocked(courseContext))) {
      showUpgradeAlert('Need to upgrade your plan');
      return;
    }
    const id = typeof video === 'object' && video ? (video.id || video.videoUrl || video.video_url) : video;
    const videoObj = typeof video === 'object' && video ? video : getAllVideosList().find(v => v.id === id);
    navigate(`/watch/${id}`, { state: { video: videoObj, course: courseContext } });
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

  // Helper to compile a unified, deduplicated list of all videos (merging backend + static fallbacks)
  const getAllVideosList = () => {
    const allVideosMap = {};
    
    // 1. Populate fallback static videos first
    fallbackStaticVideos.forEach(v => {
      allVideosMap[v.id] = v;
    });

    // 2. Overlay live assigned videos from backend
    if (dashboardData) {
      const liveList = dashboardData.allVideos || [
        ...(dashboardData.recommended || []), 
        ...(dashboardData.trending || []), 
        ...(dashboardData.topRated || []),
        ...(dashboardData.newVideos || []),
        ...(dashboardData.continueWatching || []),
        ...(dashboardData.recentlyWatched || []),
        ...(dashboardData.favorites || [])
      ];
      liveList.forEach(v => {
        allVideosMap[v.id] = v;
      });
    }

    return Object.values(allVideosMap);
  };

  // Helper to filter videos dynamically for Explore
  const getFilteredExploreVideos = () => {
    let allList = exploreVideosList.length > 0 ? exploreVideosList : getAllVideosList();

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
        onClick={() => handleVideoCardClick(video)}
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
          
          {isVideoLocked(video) && (
            <ProBadge onClick={() => showUpgradeAlert('Need to upgrade your plan')} />
          )}
          
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

  const CourseCard = ({ course }) => {
    const thumbUrl = course.thumbnail || 'https://placehold.co/360x203?text=Course+Thumbnail';
    const progress = course.progress || course.completion_percentage || course.completionPercentage || 0;
    const chaptersCount = typeof course.chapters === 'number' ? course.chapters : (course.total_chapters || course.chapters_count || (Array.isArray(course.chapters) ? course.chapters.length : 0) || 0);
    const lessonsCount = typeof course.videos === 'number' ? course.videos : (course.total_lessons || course.lessons_count || (Array.isArray(course.lessons) ? course.lessons.length : 0) || (Array.isArray(course.videos) ? course.videos.length : 0) || 0);
    
    return (
      <div 
        className="course-card-custom" 
        onClick={() => {
          const lessonsList = getCourseLessonsList(course);
          if (lessonsList && lessonsList.length > 0) {
            const firstVideo = lessonsList[0];
            const videoPayload = {
              id: firstVideo.id || firstVideo.videoUrl || firstVideo.video_url || `${course.id}-v0`,
              title: firstVideo.title || firstVideo.name || 'Lesson 1',
              videoUrl: firstVideo.videoUrl || firstVideo.video_url || '',
              thumbnail: firstVideo.thumbnailUrl || firstVideo.thumbnail_url || course.thumbnail || '',
              category: course.category || '',
              description: firstVideo.description || course.description || ''
            };
            handleVideoCardClick(videoPayload, course);
          } else if (course.videoUrl || course.video_url) {
            handleVideoCardClick({
              id: course.id,
              title: course.title || course.course_name,
              videoUrl: course.videoUrl || course.video_url,
              thumbnail: course.thumbnail,
              category: course.category,
              description: course.description
            }, course);
          } else {
            alert(`Opening course: "${course.title || course.course_name}"!`);
          }
        }}
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
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
      >
        {/* Thumbnail container */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', overflow: 'hidden' }}>
          <img 
            src={thumbUrl} 
            alt={course.title || course.course_name} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {isVideoLocked(course) && (
            <ProBadge onClick={() => showUpgradeAlert('Need to upgrade your plan')} />
          )}
          {/* Chapter badge with play icon */}
          <div 
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              zIndex: 10,
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              color: '#ffffff',
              padding: '5px 12px',
              borderRadius: '24px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(4px)'
            }}
          >
            <div 
              style={{
                width: '18px',
                height: '18px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ fontSize: '7px', color: '#fff', marginLeft: '1px' }}>▶</span>
            </div>
            <span>{chaptersCount} Chapters</span>
          </div>
        </div>
        
        {/* Details container */}
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 4px 0', lineHeight: '1.4', color: 'var(--text-primary)' }}>
              {course.title || course.course_name}
            </h4>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              {lessonsCount} Lessons
            </div>
          </div>
          
          {/* Progress bar and indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#6366f1', borderRadius: '3px' }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {progress}% Complete
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', height: '100%', minWidth: 0 }} className="user-dashboard-content animate-fade-in">
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
                            onClick={() => handleVideoCardClick(lastWatched)}
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
                          if (firstRec) handleVideoCardClick(firstRec);
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
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedSubCategory(null);
                    }}
                    style={{
                      padding: '8px 20px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '24px',
                      background: !selectedCategory ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: !selectedCategory ? '#fff' : 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    🧭 {t('user.allTopics')}
                  </button>

                  {(dashboardData?.categories && dashboardData.categories.length > 0 ? dashboardData.categories : categoriesWithIcons).map((cat, idx) => {
                    const catName = typeof cat === 'object' ? cat.name : cat;
                    const catId = typeof cat === 'object' ? cat.id : cat;
                    const iconObj = categoriesWithIcons.find(c => c.name.toLowerCase() === catName.toLowerCase());
                    const icon = iconObj ? iconObj.icon : '📚';
                    const videoCount = cat.videoCount || cat.video_count || 0;

                    const isSelected = selectedCategory && (
                      (typeof selectedCategory === 'object' && (selectedCategory.id === catId || selectedCategory.name === catName)) ||
                      selectedCategory === catName || selectedCategory === catId
                    );

                    return (
                      <button
                        key={catId || idx}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedSubCategory(null);
                        }}
                        style={{
                          padding: '8px 20px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '24px',
                          background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                          color: isSelected ? '#fff' : 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{icon}</span> {catName} {videoCount > 0 ? `(${videoCount})` : ''}
                      </button>
                    );
                  })}
                </div>

                {/* Subcategories Row */}
                {selectedCategory && (() => {
                  const currentCatObj = typeof selectedCategory === 'object' 
                    ? selectedCategory 
                    : (dashboardData?.categories || []).find(c => c.name === selectedCategory || c.id === selectedCategory);
                  
                  const subCats = currentCatObj?.sub_categories || currentCatObj?.subCategories || [];
                  if (!subCats || subCats.length === 0) return null;

                  return (
                    <div className="animate-fade-in" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '4px' }}>Subcategories:</span>
                      
                      <button
                        onClick={() => setSelectedSubCategory(null)}
                        style={{
                          padding: '6px 16px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '20px',
                          background: !selectedSubCategory ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-tertiary)',
                          borderColor: !selectedSubCategory ? 'var(--accent-primary)' : 'var(--border-color)',
                          color: !selectedSubCategory ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        All Subcategories
                      </button>

                      {subCats.map((sub, sIdx) => {
                        const subName = typeof sub === 'object' ? sub.name : sub;
                        const subId = typeof sub === 'object' ? sub.id : sub;
                        
                        const isSubSelected = selectedSubCategory && (
                          (typeof selectedSubCategory === 'object' && (selectedSubCategory.id === subId || selectedSubCategory.name === subName)) ||
                          selectedSubCategory === subName || selectedSubCategory === subId
                        );

                        return (
                          <button
                            key={subId || sIdx}
                            onClick={() => setSelectedSubCategory(sub)}
                            style={{
                              padding: '6px 16px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '20px',
                              background: isSubSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-tertiary)',
                              borderColor: isSubSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                              color: isSubSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s'
                            }}
                          >
                            {subName}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Category & Subcategory Filtered Video List */}
                {selectedCategory ? (
                  <div className="animate-fade-in" style={{ marginTop: '10px' }}>
                    <h3 className="video-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {typeof selectedCategory === 'object' ? selectedCategory.name : selectedCategory}
                        {selectedSubCategory ? ` > ${typeof selectedSubCategory === 'object' ? selectedSubCategory.name : selectedSubCategory}` : ''}
                      </span>
                      <button 
                        onClick={() => {
                          setSelectedCategory(null);
                          setSelectedSubCategory(null);
                        }} 
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Clear Filter
                      </button>
                    </h3>

                    {categoryLoading ? (
                      <div style={{ color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center' }}>
                        Loading videos...
                      </div>
                    ) : (() => {
                      const filtered = categoryVideosList;

                      if (filtered.length === 0) {
                        return (
                          <div style={{ color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center', fontSize: '15px', fontWeight: 600 }}>
                            {language === 'hi' ? 'कोई वीडियो उपलब्ध नहीं है।' : language === 'kn' ? 'ಯಾವುದೇ ವೀಡಿಯೊಗಳು ಲಭ್ಯವಿಲ್ಲ.' : 'No videos available'}
                          </div>
                        );
                      }
                      return (
                        <div className="youtube-video-grid" style={{ marginTop: '20px' }}>
                          {filtered.map(video => (
                            <VideoCard key={video.id || video.videoUrl || video.title} video={video} />
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <>
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

                    {/* All Topics: Shuffled Courses (your_courses) + Trending Videos Grid (No horizontal scroll) */}
                    {allTopicsCombined.length > 0 && (
                      <div style={{ marginBottom: '40px' }}>
                        <div className="youtube-video-grid">
                          {allTopicsCombined.map((item, idx) => (
                            <div key={item.id || idx}>
                              {item.total_lessons || item.total_chapters || item.chapters ? (
                                <CourseCard course={item} />
                              ) : (
                                <VideoCard video={item} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
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
                    const matched = (dashboardData?.categories || []).find(c => c.name === cat.name);
                    const count = matched?.videoCount || matched?.video_count || 0;
                    
                    return (
                      <div 
                        key={cat.name}
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setSearchParams({ view: 'home' });
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
                  {downloadsList.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                      {language === 'hi' ? 'कोई डाउनलोड किए गए वीडियो नहीं मिले।' : language === 'kn' ? 'ಡೌನ್‌ಲೋಡ್ ಮಾಡಿದ ವೀಡಿಯೊಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' : 'No downloaded videos found.'}
                    </div>
                  ) : (
                    downloadsList.map(video => (
                      <VideoCard key={video.id} video={video} />
                    ))
                  )}
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
                        {(c.user || 'U').charAt(0).toUpperCase()}
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

            {/* --- CUSTOM UPGRADE ALERT MODAL (Matching Login.js popup style) --- */}
            {customAlert.show && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000,
                animation: 'fadeIn 0.25s ease'
              }}>
                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                  width: '90%',
                  maxWidth: '360px',
                  padding: '36px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: '#333333',
                  animation: 'scaleIn 0.25s ease'
                }}>
                  {/* Crown Circle Icon */}
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: '3px solid #f59e0b',
                    background: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <span style={{ fontSize: '28px' }}>👑</span>
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
                      borderRadius: '10px',
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
              </div>
            )}
          </>
        )}
      </div>
  );
};

export default UserDashboard;
