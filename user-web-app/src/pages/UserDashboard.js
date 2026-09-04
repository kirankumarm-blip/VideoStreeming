import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getCurrentUser } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import ThreeDLoader from '../components/ThreeDLoader';
import PremiumSelect from '../components/PremiumSelect';

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
      message: `${message}. Upgrade your account to unlock premium courses, HD lessons, and offline access!`,
      buttonText: 'View Plans & Upgrade ➔',
      action: () => navigate('/plans')
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
  const [watchLaterSearch, setWatchLaterSearch] = useState('');
  const [downloadsList, setDownloadsList] = useState([]);
  const [exploreVideosList, setExploreVideosList] = useState([]);
  const [hasFetchedExplore, setHasFetchedExplore] = useState(false);
  const [categoryVideosList, setCategoryVideosList] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Detailed Watch History state
  const [historyList, setHistoryList] = useState([]);

  // Playlist state (calling vdUser with formstep getPlayList)
  const [playlistsList, setPlaylistsList] = useState([]);
  const [playlistVideosList, setPlaylistVideosList] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistSearch, setPlaylistSearch] = useState('');

  // Dedicated Watch History state (calling vdUser with formstep getWatchHistory)
  const [watchHistoryList, setWatchHistoryList] = useState([]);
  const [watchHistoryLoading, setWatchHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Dynamic Categories state (calling vdUser with formstep getAllCategories)
  const [allCategoriesList, setAllCategoriesList] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [dynamicSubCategories, setDynamicSubCategories] = useState([]);

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
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeView === 'home') {
      fetchDashboard('Dashboard');
    } else if (activeView === 'watch_later') {
      fetchDashboard('getwatchLaterVideos');
    } else if (activeView === 'playlist' || activeView === 'playlists') {
      setSelectedPlaylist(null);
      fetchPlaylists();
    } else if (activeView === 'watch_history' || activeView === 'history') {
      fetchWatchHistory();
    } else if (activeView === 'categories') {
      fetchCategories();
    } else if (activeView === 'downloads') {
      fetchDashboard('download_history');
    } else if (activeView === 'explore') {
      fetchExploreVideos();
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'home' && selectedCategory) {
      const catId = typeof selectedCategory === 'object' ? (selectedCategory.id || selectedCategory.category_id || selectedCategory.name) : selectedCategory;
      const catState = typeof selectedCategory === 'object' ? (selectedCategory.source || selectedCategory.state || selectedCategory.visibility || selectedCategory.status || null) : null;
      const catName = typeof selectedCategory === 'object' ? (selectedCategory.name || selectedCategory.title || selectedCategory.category_name || null) : selectedCategory;
      const subId = selectedSubCategory ? (typeof selectedSubCategory === 'object' ? (selectedSubCategory.id || selectedSubCategory.sub_category_id || selectedSubCategory.name) : selectedSubCategory) : null;
      
      fetchCategoryVideos(catId, subId, catState, catName);

      // Check if subcategories already exist on the selected category object
      const currentCatObj = (typeof selectedCategory === 'object' && selectedCategory.sub_categories && selectedCategory.sub_categories.length > 0)
        ? selectedCategory
        : (allCategoriesList.find(c => 
            (typeof selectedCategory === 'object' && (
              (selectedCategory.unique_id && c.unique_id === selectedCategory.unique_id) ||
              (c.id === selectedCategory.id && c.name === selectedCategory.name && (c.source || c.state || '') === (selectedCategory.source || selectedCategory.state || '')) ||
              (c.name === selectedCategory.name && ((selectedCategory.source || selectedCategory.state) ? (c.source || c.state) === (selectedCategory.source || selectedCategory.state) : true))
            )) ||
            (c.name === catName && (catState ? (c.source || c.state) === catState : true)) ||
            c.id === selectedCategory || 
            c.name === selectedCategory
          ) || (typeof selectedCategory === 'object' ? selectedCategory : null));

      if (currentCatObj && currentCatObj.sub_categories && currentCatObj.sub_categories.length > 0) {
        setDynamicSubCategories(currentCatObj.sub_categories);
      } else {
        setDynamicSubCategories([]);
      }
    } else if (activeView === 'home') {
      setCategoryVideosList([]);
      setDynamicSubCategories([]);
    }
  }, [selectedCategory, selectedSubCategory, allCategoriesList, activeView]);

  const filterValidVideoItems = (data) => {
    let rawList = [];
    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && Array.isArray(data.data)) {
      rawList = data.data;
    } else if (data && Array.isArray(data.json)) {
      rawList = data.json;
    }
    return rawList
      .map(item => (item && item.json !== undefined ? item.json : item))
      .filter(d => d && typeof d === 'object' && Object.keys(d).length > 0 && (d.id || d.title || d.video_title || d.course_title || d.name || d.url || d.videoUrl || d.video_url));
  };

  const fetchExploreVideos = async () => {
    setLoading(true);
    try {
      const data = await api.dashboard.getUser('getExplore Video');
      console.log("Explore videos from API:", data);
      const list = filterValidVideoItems(data);
      setExploreVideosList(list);
      setHasFetchedExplore(true);
    } catch (e) {
      console.error("Failed to load explore videos", e);
      setHasFetchedExplore(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryVideos = async (categoryId, subCategory = null, categoryState = null, categoryName = null) => {
    setCategoryLoading(true);
    try {
      const payload = { 
        category_id: categoryId,
        id: categoryId
      };
      if (categoryState) {
        payload.state = categoryState;
        payload.source = categoryState;
        payload.visibility = categoryState;
      }
      if (categoryName) {
        payload.category_name = categoryName;
        payload.name = categoryName;
        payload.category = categoryName;
      }
      if (subCategory) {
        const subName = typeof subCategory === 'object' ? (subCategory.name || subCategory.title || subCategory.id) : subCategory;
        const subId = typeof subCategory === 'object' ? (subCategory.id || subCategory.sub_category_id) : null;
        payload.sub_category = subName;
        payload.subCategory = subName;
        if (subId) {
          payload.sub_category_id = subId;
          payload.subCategoryId = subId;
        }
      }
      const data = await api.dashboard.getUser('getCategoryVideo', payload);
      console.log(`Category videos for category_id: ${categoryId}, state: ${categoryState}, sub_category: ${subCategory}:`, data);
      const list = filterValidVideoItems(data);
      setCategoryVideosList(list);
    } catch (e) {
      console.error("Failed to load category videos", e);
    } finally {
      setCategoryLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    setLoading(true);
    setPlaylistLoading(true);
    try {
      const res = await api.user.getPlayList();
      console.log("Playlists from vdUser API (getPlayList):", res);

      // Extract raw items
      let raw = [];
      if (Array.isArray(res)) {
        raw = res;
      } else if (res && Array.isArray(res.playlists)) {
        raw = res.playlists;
      } else if (res && Array.isArray(res.data)) {
        raw = res.data;
      } else if (res && Array.isArray(res.result)) {
        raw = res.result;
      } else if (res && Array.isArray(res.json)) {
        raw = res.json;
      }

      // Unwrap { json: { ... }, pairedItem: ... } or direct objects
      const unwrapped = raw.map(item => (item && item.json !== undefined ? item.json : item));

      // Check if items are direct video items (e.g. have video_url, thumbnail, or title without sub-videos)
      const directVideos = filterValidVideoItems(unwrapped).map(v => ({
        ...v,
        id: v.id || v.video_id || v.lesson_id,
        videoId: v.id || v.video_id || v.lesson_id,
        title: v.title || v.video_title || v.name || 'Untitled Lesson',
        thumbnail: v.thumbnail || v.image || v.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60',
        duration: v.duration || '10:00',
        category: v.category || 'General',
        video_url: v.video_url || v.videoUrl || v.url || ''
      }));

      // Map playlists if structured as folders
      const mappedPlaylists = unwrapped
        .filter(p => p && (p.videos || p.video_list || p.lessons || p.playlist_name || p.name))
        .map((p, idx) => {
          const videosRaw = p.videos || p.video_list || p.lessons || [];
          const mappedVideos = filterValidVideoItems(videosRaw).map(v => ({
            ...v,
            id: v.id || v.video_id || v.lesson_id,
            videoId: v.id || v.video_id || v.lesson_id,
            title: v.title || v.video_title || v.name || 'Untitled Lesson',
            thumbnail: v.thumbnail || v.image || p.thumbnail || p.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60',
            duration: v.duration || '10:00',
            category: v.category || 'General'
          }));
          return {
            id: p.id || p.playlist_id || p._id || `pl-${idx + 1}`,
            name: p.name || p.title || p.playlist_name || `Playlist ${idx + 1}`,
            title: p.name || p.title || p.playlist_name || `Playlist ${idx + 1}`,
            description: p.description || p.desc || 'Curated video playlist.',
            thumbnail: p.thumbnail || p.image || p.cover || (mappedVideos[0]?.thumbnail) || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=60',
            video_count: p.video_count !== undefined ? p.video_count : (p.videos_count !== undefined ? p.videos_count : mappedVideos.length),
            videos: mappedVideos,
            created_at: p.created_at || p.createdAt || ''
          };
        });

      setPlaylistVideosList(directVideos);
      setPlaylistsList(mappedPlaylists);
    } catch (e) {
      console.error("Failed to load playlists from vdUser getPlayList API", e);
    } finally {
      setPlaylistLoading(false);
      setLoading(false);
    }
  };

  const fetchWatchHistory = async () => {
    setLoading(true);
    setWatchHistoryLoading(true);
    try {
      const res = await api.user.getWatchHistory();
      console.log("Watch History from vdUser API (getWatchHistory):", res);
      let raw = [];
      if (Array.isArray(res)) {
        raw = res;
      } else if (res && Array.isArray(res.watchHistory)) {
        raw = res.watchHistory;
      } else if (res && Array.isArray(res.history)) {
        raw = res.history;
      } else if (res && Array.isArray(res.data)) {
        raw = res.data;
      } else if (res && Array.isArray(res.result)) {
        raw = res.result;
      } else if (res && Array.isArray(res.json)) {
        raw = res.json;
      }
      const unwrapped = raw.map(item => (item && item.json !== undefined ? item.json : item));
      const mapped = unwrapped.map((h, idx) => {
        // Handle completion percentage key variants (e.g. "completion percentage", "completion_percentage", "completionPercentage", "progress")
        const rawPct = h['completion percentage'] !== undefined 
          ? h['completion percentage'] 
          : (h.completion_percentage !== undefined 
            ? h.completion_percentage 
            : (h.completionPercentage !== undefined 
              ? h.completionPercentage 
              : (h.progress !== undefined ? h.progress : (h.status === 'completed' ? 100 : 0))));
        
        const numPct = Math.min(100, Math.max(0, parseFloat(rawPct) || 0));
        const isCompleted = numPct >= 95 || h.status === 'completed' || h['status'] === 'completed';

        // Handle video duration key variants (e.g. "video_duration_sec", "video_duration", "duration_sec", "duration")
        const rawDuration = h.video_duration_sec || h.video_duration || h.duration_sec || h.duration || h.video_length || '';
        let formattedDuration = '12:00';
        if (rawDuration) {
          if (typeof rawDuration === 'string' && rawDuration.includes(':')) {
            formattedDuration = rawDuration;
          } else {
            const s = parseInt(rawDuration, 10);
            if (!isNaN(s) && s > 0) {
              const m = Math.floor(s / 60);
              const rem = s % 60;
              formattedDuration = `${m}:${rem < 10 ? '0' : ''}${rem}`;
            } else if (typeof rawDuration === 'string') {
              formattedDuration = rawDuration;
            }
          }
        }

        // Handle date/time
        const dateStr = h.date || h.watched_at || h.watchDate || h.watch_date || h.created_at || '';

        const vidId = h.id || h.video_id || h.videoId || `hist-${idx + 1}`;
        const vidUrl = h.video_url || h.videoUrl || h.url || '';
        const vidTitle = h.title || h.video_title || h.name || 'Untitled Lesson';
        const vidThumb = h.thumbnail || h.image || h.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60';

        return {
          id: vidId,
          videoId: vidId,
          video_id: vidId,
          title: vidTitle,
          video_title: vidTitle,
          name: vidTitle,
          thumbnail: vidThumb,
          thumbnailUrl: vidThumb,
          image: vidThumb,
          video_url: vidUrl,
          videoUrl: vidUrl,
          url: vidUrl,
          duration: formattedDuration,
          video_duration_sec: formattedDuration,
          category: h.category || h.category_name || 'General',
          course_title: h.course_title || h.courseTitle || '',
          chapter_title: h.chapter_title || h.chapterTitle || '',
          watch_time: h.watch_duration !== undefined ? h.watch_duration : (h.watch_time || h.watchTime || 0),
          last_position: h.last_position || h.lastPosition || 0,
          completion_percentage: numPct,
          completionPercentage: numPct,
          status: isCompleted ? 'completed' : 'in_progress',
          watched_at: dateStr || new Date().toISOString(),
          date: dateStr,
          views: h.views || 1
        };
      });
      setWatchHistoryList(mapped);
    } catch (e) {
      console.error("Failed to load watch history from vdUser getWatchHistory API", e);
    } finally {
      setWatchHistoryLoading(false);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await api.user.getAllCategories();
      console.log("Categories from vdUser API (getAllCategories):", res);

      let raw = [];
      if (Array.isArray(res)) {
        raw = res;
      } else if (res && Array.isArray(res.categories)) {
        raw = res.categories;
      } else if (res && Array.isArray(res.data)) {
        raw = res.data;
      } else if (res && Array.isArray(res.result)) {
        raw = res.result;
      } else if (res && Array.isArray(res.json)) {
        raw = res.json;
      }

      const unwrapped = raw.map(item => (item && item.json !== undefined ? item.json : item));
      const defaultIcons = ['💻', '🤖', '⚛️', '📱', '☁️', '🧠', '🎨', '🚀', '📊', '🔒', '📚', '🎯'];

      const mapped = unwrapped
        .filter(c => c && typeof c === 'object' && (c.name || c.title || c.category_name || c.id || c.category_id))
        .map((c, idx) => {
          const catName = c.name || c.title || c.category_name || `Category ${idx + 1}`;
          const catState = c.source || c.state || c.visibility || c.status || '';
          const iconMatch = categoriesWithIcons.find(ci => ci.name.toLowerCase() === String(catName).toLowerCase());
          const iconEmoji = c.icon && !String(c.icon).startsWith('http') && !String(c.icon).startsWith('fa')
            ? c.icon
            : (iconMatch?.icon || defaultIcons[idx % defaultIcons.length]);
          const vCount = c.video_count !== undefined ? c.video_count : (c.videoCount !== undefined ? c.videoCount : 0);

          let rawSub = c.sub_categories || c.subCategories || c.sub_category || c.subCategory || c.subcategories || c.subcategory || c.sub_category_list || c.sub_cats || [];
          if (typeof rawSub === 'string') {
            try {
              const p = JSON.parse(rawSub);
              rawSub = Array.isArray(p) ? p : rawSub.split(',').map(s => s.trim()).filter(Boolean);
            } catch (e) {
              rawSub = rawSub.split(',').map(s => s.trim()).filter(Boolean);
            }
          }
          if (!Array.isArray(rawSub)) {
            rawSub = [rawSub];
          }
          const parsedSubCats = rawSub.map((s, sIdx) => {
            if (typeof s === 'string') {
              return { id: s, name: s, title: s };
            }
            return {
              id: s.id || s.sub_category_id || s.subcategory_id || s.name || `sub-${sIdx + 1}`,
              name: s.name || s.title || s.sub_category_name || s.subcategory_name || `Subcategory ${sIdx + 1}`,
              title: s.name || s.title || s.sub_category_name || s.subcategory_name || `Subcategory ${sIdx + 1}`,
              ...s
            };
          }).filter(s => s && s.name);

          return {
            id: c.id || c.category_id || `cat-${idx + 1}`,
            category_id: c.id || c.category_id || `cat-${idx + 1}`,
            name: catName,
            title: catName,
            category_name: catName,
            source: catState,
            state: catState,
            visibility: catState,
            unique_id: `${c.id || idx}_${catName}_${catState}`,
            icon: iconEmoji,
            video_count: parseInt(vCount, 10) || 0,
            videoCount: parseInt(vCount, 10) || 0,
            sub_categories: parsedSubCats
          };
        });

      setAllCategoriesList(prev => {
        if (!prev || prev.length === 0) return mapped;
        // Merge mapped categories from getAllCategories with prev (preserving sub_categories if prev already has them)
        return mapped.map(mCat => {
          const mName = String(mCat.name || mCat.title || '').trim().toLowerCase();
          const mState = mCat.source || mCat.state || '';
          const match = prev.find(p => {
            const pName = String(p.name || p.title || '').trim().toLowerCase();
            const pState = p.source || p.state || '';
            return (p.unique_id && mCat.unique_id && p.unique_id === mCat.unique_id) ||
                   (pName === mName && (pState && mState ? pState === mState : true)) ||
                   (pName === mName);
          });
          if (match && (!mCat.sub_categories || mCat.sub_categories.length === 0) && match.sub_categories && match.sub_categories.length > 0) {
            return {
              ...mCat,
              sub_categories: match.sub_categories
            };
          }
          return mCat;
        });
      });
    } catch (e) {
      console.error("Failed to load categories from vdUser getAllCategories API", e);
      setAllCategoriesList([]);
    } finally {
      setCategoriesLoading(false);
      setLoading(false);
    }
  };

  const fetchDashboard = async (formStep = 'Dashboard') => {
    setLoading(true);
    try {
      const data = await api.dashboard.getUser(formStep);
      console.log(`User dashboard data (${formStep || 'home'}) from API:`, data);
      
      if (formStep === 'getwatchLaterVideos' || formStep === 'watchLater') {
        const list = filterValidVideoItems(data);
        setFavoritesList(list);
      } else if (formStep === 'download_history' || formStep === 'downloads') {
        const list = filterValidVideoItems(data);
        setDownloadsList(list);
      } else {
        let actualData = {};
        if (Array.isArray(data)) {
          const first = data[0] || {};
          actualData = (first && first.json !== undefined) ? first.json : first;
        } else if (data && data.json !== undefined) {
          actualData = data.json;
        } else {
          actualData = data || {};
        }
        
        const rawCategories = actualData.categories || [];
        const defaultIcons = ['💻', '🤖', '⚛️', '📱', '☁️', '🧠', '🎨', '🚀', '📊', '🔒', '📚', '🎯'];
        const mappedCategories = rawCategories.map((c, idx) => {
          const catName = c.name || c.title || c.category_name || `Category ${idx + 1}`;
          const catState = c.source || c.state || c.visibility || c.status || '';
          const iconMatch = categoriesWithIcons.find(ci => ci.name.toLowerCase() === String(catName).toLowerCase());
          const iconEmoji = c.icon && !String(c.icon).startsWith('http') && !String(c.icon).startsWith('fa')
            ? c.icon
            : (iconMatch?.icon || defaultIcons[idx % defaultIcons.length]);
          const vCount = c.video_count !== undefined ? c.video_count : (c.videoCount !== undefined ? c.videoCount : 0);

          let rawSub = c.sub_categories || c.subCategories || c.sub_category || c.subCategory || c.subcategories || c.subcategory || [];
          if (typeof rawSub === 'string') {
            try {
              const p = JSON.parse(rawSub);
              rawSub = Array.isArray(p) ? p : rawSub.split(',').map(s => s.trim()).filter(Boolean);
            } catch (e) {
              rawSub = rawSub.split(',').map(s => s.trim()).filter(Boolean);
            }
          }
          if (!Array.isArray(rawSub)) rawSub = [rawSub];
          const parsedSubCats = rawSub.map((s, sIdx) => {
            if (typeof s === 'string') return { id: s, name: s, title: s };
            return {
              id: s.id || s.sub_category_id || s.subcategory_id || s.name || `sub-${sIdx + 1}`,
              name: s.name || s.title || s.sub_category_name || s.subcategory_name || `Subcategory ${sIdx + 1}`,
              title: s.name || s.title || s.sub_category_name || s.subcategory_name || `Subcategory ${sIdx + 1}`,
              ...s
            };
          }).filter(s => s && s.name);

          return {
            id: c.id || c.category_id || `cat-${idx + 1}`,
            category_id: c.id || c.category_id || `cat-${idx + 1}`,
            name: catName,
            title: catName,
            category_name: catName,
            source: catState,
            state: catState,
            visibility: catState,
            unique_id: `${c.id || idx}_${catName}_${catState}`,
            icon: iconEmoji,
            video_count: parseInt(vCount, 10) || 0,
            videoCount: parseInt(vCount, 10) || 0,
            sub_categories: parsedSubCats
          };
        });

        if (mappedCategories.length > 0) {
          setAllCategoriesList(prev => {
            if (!prev || prev.length === 0) return mappedCategories;
            
            // Update existing categories with sub_categories from dashboard
            const updated = prev.map(pCat => {
              const pName = String(pCat.name || pCat.title || '').trim().toLowerCase();
              const pState = pCat.source || pCat.state || '';
              const match = mappedCategories.find(mc => {
                const mcName = String(mc.name || mc.title || '').trim().toLowerCase();
                const mcState = mc.source || mc.state || '';
                return (mc.unique_id && pCat.unique_id && mc.unique_id === pCat.unique_id) ||
                       (mcName === pName && (mcState && pState ? mcState === pState : true)) ||
                       (mcName === pName);
              });
              if (match) {
                return {
                  ...pCat,
                  ...match,
                  sub_categories: (match.sub_categories && match.sub_categories.length > 0) 
                    ? match.sub_categories 
                    : (pCat.sub_categories || [])
                };
              }
              return pCat;
            });

            // Append any categories from dashboard that are not in prev
            mappedCategories.forEach(mc => {
              const mcName = String(mc.name || mc.title || '').trim().toLowerCase();
              const mcState = mc.source || mc.state || '';
              const exists = updated.some(u => {
                const uName = String(u.name || u.title || '').trim().toLowerCase();
                const uState = u.source || u.state || '';
                return (u.unique_id && mc.unique_id && u.unique_id === mc.unique_id) ||
                       (uName === mcName && (uState && mcState ? uState === mcState : true)) ||
                       (uName === mcName);
              });
              if (!exists) {
                updated.push(mc);
              }
            });

            return updated;
          });
        }

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
          categories: mappedCategories.length > 0 ? mappedCategories : rawCategories,
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
    const cId = courseObj.id || courseObj.course_id || courseObj.courseId || 0;

    if (Array.isArray(courseObj.chapters)) {
      const list = [];
      courseObj.chapters.forEach(chap => {
        const chapId = chap.id || chap.chapter_id || chap.chapterId || 0;
        const chapItems = Array.isArray(chap.videos) ? chap.videos : (Array.isArray(chap.lessons) ? chap.lessons : []);
        chapItems.forEach((v, idx) => {
          if (typeof v === 'string') {
            list.push({
              id: `${cId}-v-${idx}`,
              title: `Lesson ${idx + 1}`,
              videoUrl: v,
              thumbnailUrl: courseObj.thumbnail || '',
              thumbnail: courseObj.thumbnail || '',
              course_id: cId,
              chapter_id: chapId
            });
          } else {
            const tUrl = v.video_thumbnail || v.videoThumbnail || v.thumbnail || v.thumbnailUrl || v.thumbnail_url || courseObj.thumbnail || '';
            list.push({
              ...v,
              thumbnail: tUrl,
              thumbnailUrl: tUrl,
              course_id: v.course_id || v.courseId || cId,
              chapter_id: v.chapter_id || v.chapterId || chapId
            });
          }
        });
      });
      if (list.length > 0) {
        return list;
      }
    }

    if (Array.isArray(courseObj.videos)) {
      return courseObj.videos.map((v, index) => {
        if (typeof v === 'string') {
          return {
            id: `${cId}-v-${index}`,
            title: `Lesson ${index + 1}`,
            videoUrl: v,
            thumbnailUrl: courseObj.thumbnail || '',
            thumbnail: courseObj.thumbnail || '',
            course_id: cId,
            chapter_id: 0
          };
        }
        const tUrl = v.video_thumbnail || v.videoThumbnail || v.thumbnail || v.thumbnailUrl || v.thumbnail_url || courseObj.thumbnail || '';
        return {
          ...v,
          thumbnail: tUrl,
          thumbnailUrl: tUrl,
          course_id: v.course_id || v.courseId || cId,
          chapter_id: v.chapter_id || v.chapterId || 0
        };
      });
    }

    if (Array.isArray(courseObj.lessons)) {
      return courseObj.lessons.map((l, index) => {
        if (typeof l === 'string') {
          return {
            id: `${cId}-l-${index}`,
            title: `Lesson ${index + 1}`,
            videoUrl: l,
            thumbnailUrl: courseObj.thumbnail || '',
            thumbnail: courseObj.thumbnail || '',
            course_id: cId,
            chapter_id: 0
          };
        }
        const tUrl = l.video_thumbnail || l.videoThumbnail || l.thumbnail || l.thumbnailUrl || l.thumbnail_url || courseObj.thumbnail || '';
        return {
          ...l,
          thumbnail: tUrl,
          thumbnailUrl: tUrl,
          course_id: l.course_id || l.courseId || cId,
          chapter_id: l.chapter_id || l.chapterId || 0
        };
      });
    }

    return [];
  };

  const isVideoLocked = (item) => {
    if (!item) return false;
    const currentUser = getCurrentUser();
    const userPlan = String(dashboardData?.user_plan ?? dashboardData?.user_plan_id ?? currentUser?.user_plan ?? currentUser?.user_plan_id ?? '1');
    if (userPlan !== '1') return false;

    const vis = item.visibility ?? item.visibility_id ?? item.is_private ?? item.isPrivate;
    const visStr = String(vis || '').toLowerCase();
    return visStr === '2' || visStr === 'private' || vis === true || vis === 2;
  };

  const handleVideoCardClick = (video, courseContext = null) => {
    if (isVideoLocked(video) || (courseContext && isVideoLocked(courseContext))) {
      showUpgradeAlert('Need to upgrade your plan');
      return;
    }
    const currentUser = getCurrentUser();
    const userPlan = String(dashboardData?.user_plan ?? dashboardData?.user_plan_id ?? currentUser?.user_plan ?? currentUser?.user_plan_id ?? '1');
    const id = typeof video === 'object' && video ? (video.id || video.videoUrl || video.video_url) : video;
    const videoObj = typeof video === 'object' && video ? video : getAllVideosList().find(v => v.id === id);
    navigate(`/watch/${id}`, { state: { video: videoObj, course: courseContext, userPlan } });
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
    let allList = hasFetchedExplore ? exploreVideosList : getAllVideosList();

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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '6px' }}>
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
          if (isVideoLocked(course)) {
            showUpgradeAlert('Need to upgrade your plan');
            return;
          }
          const courseTitle = course.title || course.course_name || course.name || 'Course';
          const lessonsList = getCourseLessonsList(course);
          if (lessonsList && lessonsList.length > 0) {
            const firstVideo = lessonsList[0];
            const videoPayload = {
              ...firstVideo,
              visibility: firstVideo.visibility ?? firstVideo.visibility_id ?? course.visibility ?? course.visibility_id,
              id: firstVideo.id || firstVideo.videoUrl || firstVideo.video_url || `${course.id}-v0`,
              title: firstVideo.title || firstVideo.name || 'Lesson 1',
              videoUrl: firstVideo.videoUrl || firstVideo.video_url || '',
              thumbnail: firstVideo.thumbnailUrl || firstVideo.thumbnail_url || course.thumbnail || '',
              category: course.category || '',
              description: firstVideo.description || course.description || '',
              course_name: courseTitle,
              courseTitle: courseTitle
            };
            handleVideoCardClick(videoPayload, { ...course, title: courseTitle });
          } else if (course.videoUrl || course.video_url) {
            handleVideoCardClick({
              ...course,
              id: course.id,
              title: courseTitle,
              videoUrl: course.videoUrl || course.video_url,
              thumbnail: course.thumbnail,
              category: course.category,
              description: course.description,
              course_name: courseTitle,
              courseTitle: courseTitle
            }, { ...course, title: courseTitle });
          } else {
            showUpgradeAlert(`Opening course: "${courseTitle}"!`);
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
          <ThreeDLoader text="Loading dashboard telemetry data..." />
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

                  {allCategoriesList.map((cat, idx) => {
                    const catName = typeof cat === 'object' ? (cat.name || cat.title || cat.category_name) : cat;
                    const catId = typeof cat === 'object' ? (cat.id || cat.category_id || cat.name) : cat;
                    const catState = typeof cat === 'object' ? (cat.source || cat.state || cat.visibility || '') : '';
                    const catKey = typeof cat === 'object' ? (cat.unique_id || `${catId}_${catName}_${catState}_${idx}`) : `${cat}_${idx}`;
                    const iconObj = categoriesWithIcons.find(c => c.name.toLowerCase() === String(catName).toLowerCase());
                    const icon = (typeof cat === 'object' && cat.icon) ? cat.icon : (iconObj ? iconObj.icon : '📚');
                    const videoCount = typeof cat === 'object' ? (cat.video_count !== undefined ? cat.video_count : (cat.videoCount || 0)) : 0;

                    const selCatState = selectedCategory && typeof selectedCategory === 'object' ? (selectedCategory.source || selectedCategory.state || selectedCategory.visibility || '') : '';
                    const selCatName = selectedCategory && typeof selectedCategory === 'object' ? (selectedCategory.name || selectedCategory.title || selectedCategory.category_name) : selectedCategory;
                    const selCatId = selectedCategory && typeof selectedCategory === 'object' ? (selectedCategory.id || selectedCategory.category_id) : selectedCategory;

                    const isSelected = Boolean(
                      selectedCategory && (
                        (typeof selectedCategory === 'object' && (
                          (selectedCategory.unique_id && cat.unique_id && selectedCategory.unique_id === cat.unique_id) ||
                          (String(selCatName).trim().toLowerCase() === String(catName).trim().toLowerCase() && (selCatState ? selCatState === catState : true)) ||
                          (String(selCatId) === String(catId) && String(selCatName).trim().toLowerCase() === String(catName).trim().toLowerCase())
                        )) ||
                        selectedCategory === cat ||
                        String(selCatName).trim().toLowerCase() === String(catName).trim().toLowerCase() ||
                        String(selectedCategory) === String(catId)
                      )
                    );

                    return (
                      <button
                        key={catKey}
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
                  const selCatName = typeof selectedCategory === 'object' ? (selectedCategory.name || selectedCategory.title || selectedCategory.category_name) : selectedCategory;
                  const selCatId = typeof selectedCategory === 'object' ? (selectedCategory.id || selectedCategory.category_id) : selectedCategory;
                  const selCatState = typeof selectedCategory === 'object' ? (selectedCategory.source || selectedCategory.state || selectedCategory.visibility || '') : '';
                  const selUniqueId = typeof selectedCategory === 'object' ? selectedCategory.unique_id : null;

                  const currentCatObj = (selectedCategory && typeof selectedCategory === 'object' && Array.isArray(selectedCategory.sub_categories) && selectedCategory.sub_categories.length > 0)
                    ? selectedCategory
                    : (allCategoriesList.find(c => 
                        (selUniqueId && c.unique_id && c.unique_id === selUniqueId) ||
                        (String(c.name).trim().toLowerCase() === String(selCatName).trim().toLowerCase() && (selCatState ? (c.source || c.state) === selCatState : true)) ||
                        (String(c.id) === String(selCatId) && String(c.name).trim().toLowerCase() === String(selCatName).trim().toLowerCase()) ||
                        (String(c.name).trim().toLowerCase() === String(selCatName).trim().toLowerCase())
                      ) || (typeof selectedCategory === 'object' ? selectedCategory : null) || (dashboardData?.categories || []).find(c => c.name === selCatName || (c.id === selCatId && c.name === selCatName)));
                  
                  let rawSubCats = (currentCatObj?.sub_categories && currentCatObj.sub_categories.length > 0) 
                    ? currentCatObj.sub_categories 
                    : (dynamicSubCategories && dynamicSubCategories.length > 0 ? dynamicSubCategories : (currentCatObj?.subCategories || currentCatObj?.sub_category || []));

                  if (typeof rawSubCats === 'string') {
                    try {
                      const parsed = JSON.parse(rawSubCats);
                      rawSubCats = Array.isArray(parsed) ? parsed : rawSubCats.split(',').map(s => s.trim()).filter(Boolean);
                    } catch (e) {
                      rawSubCats = rawSubCats.split(',').map(s => s.trim()).filter(Boolean);
                    }
                  }

                  if (!Array.isArray(rawSubCats)) {
                    rawSubCats = rawSubCats ? [rawSubCats] : [];
                  }

                  let subCats = rawSubCats.map((sub, sIdx) => {
                    if (typeof sub === 'string') {
                      return { id: sub, name: sub, title: sub };
                    }
                    const subName = sub.name || sub.title || sub.sub_category_name || sub.subcategory_name || sub.label || `Subcategory ${sIdx + 1}`;
                    const subId = sub.id || sub.sub_category_id || sub.subcategory_id || sub.subCategoryId || subName;
                    return {
                      id: subId,
                      name: subName,
                      title: subName,
                      ...sub
                    };
                  }).filter(s => s && s.name);

                  // If still empty, extract from any videos matching this category
                  if (subCats.length === 0) {
                    const catNameStr = String(selCatName || '').toLowerCase();
                    const relevantVideos = [
                      ...(categoryVideosList || []),
                      ...((dashboardData?.trending || []).filter(v => String(v.category || '').toLowerCase() === catNameStr)),
                      ...((dashboardData?.your_courses || []).filter(v => String(v.category || '').toLowerCase() === catNameStr))
                    ];
                    const seen = new Set();
                    relevantVideos.forEach(v => {
                      const subName = v.sub_category || v.subCategory || v.subcategory || v.sub_category_name || v.subcategory_name;
                      if (subName && typeof subName === 'string' && !seen.has(subName.toLowerCase())) {
                        seen.add(subName.toLowerCase());
                        subCats.push({
                          id: v.sub_category_id || v.subCategoryId || subName,
                          name: subName,
                          title: subName
                        });
                      }
                    });
                  }

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
                        const subName = typeof sub === 'object' ? (sub.name || sub.title) : sub;
                        const subId = typeof sub === 'object' ? (sub.id || sub.sub_category_id || sub.name) : sub;
                        
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
                              background: isSubSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                              borderColor: isSubSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                              color: isSubSelected ? '#ffffff' : 'var(--text-secondary)',
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

                    {/* All Topics Sections: Your Courses, Recommended, and Trending */}
                    {(() => {
                      const yourCourses = dashboardData?.yourCourses || dashboardData?.your_courses || [];
                      const recommended = dashboardData?.recommended || [];
                      const trending = dashboardData?.trending || [];
                      const hasSpecificSections = yourCourses.length > 0 || recommended.length > 0 || trending.length > 0;

                      if (hasSpecificSections) {
                        return (
                          <>
                            {/* Your Courses Section */}
                            {yourCourses.length > 0 && (
                              <div style={{ marginBottom: '40px' }}>
                                <h3 className="video-section-title" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                                  {language === 'hi' ? 'आपके पाठ्यक्रम' : language === 'kn' ? 'ನಿಮ್ಮ ಕೋರ್ಸ್‌ಗಳು' : 'Your Courses'}
                                </h3>
                                <div className="youtube-video-grid">
                                  {yourCourses.map((course, idx) => (
                                    <CourseCard key={course.id || idx} course={course} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Recommended Section */}
                            {recommended.length > 0 && (
                              <div style={{ marginBottom: '40px' }}>
                                <h3 className="video-section-title" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                                  {language === 'hi' ? 'अनुशंसित' : language === 'kn' ? 'ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ' : 'Recommended'}
                                </h3>
                                <div className="youtube-video-grid">
                                  {recommended.map((item, idx) => (
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

                            {/* Trending Section */}
                            {trending.length > 0 && (
                              <div style={{ marginBottom: '40px' }}>
                                <h3 className="video-section-title" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                                  {language === 'hi' ? 'ट्रेंडिंग' : language === 'kn' ? 'ಟ್ರೆಂಡಿಂಗ್' : 'Trending'}
                                </h3>
                                <div className="youtube-video-grid">
                                  {trending.map((video, idx) => (
                                    <VideoCard key={video.id || idx} video={video} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      }

                      // Fallback to allTopicsCombined if specific lists are empty
                      if (allTopicsCombined.length > 0) {
                        return (
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
                        );
                      }

                      return null;
                    })()}
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
                    <PremiumSelect
                      options={[
                        { id: 'All', name: language === 'hi' ? 'सभी कठिनाइयां' : language === 'kn' ? 'ಎಲ್ಲಾ ಕಠಿಣತೆ' : 'All Difficulties' },
                        { id: 'Beginner', name: t('video.beginner') },
                        { id: 'Intermediate', name: t('video.intermediate') },
                        { id: 'Advanced', name: t('video.advanced') }
                      ]}
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      searchable={false}
                      icon="fa-solid fa-layer-group"
                      style={{ width: '160px' }}
                    />

                    <PremiumSelect
                      options={[
                        { id: 'All', name: language === 'hi' ? 'सभी अवधियां' : language === 'kn' ? 'ಎಲ್ಲಾ ಅವಧಿಗಳು' : 'All Durations' },
                        { id: 'short', name: '< 5 mins' },
                        { id: 'medium', name: '5 - 15 mins' },
                        { id: 'long', name: '> 15 mins' }
                      ]}
                      value={filterDuration}
                      onChange={(e) => setFilterDuration(e.target.value)}
                      searchable={false}
                      icon="fa-solid fa-clock"
                      style={{ width: '150px' }}
                    />

                    <PremiumSelect
                      options={[
                        { id: 'views', name: t('video.views') },
                        { id: 'rating', name: t('video.rating') },
                        { id: 'title', name: language === 'hi' ? 'शीर्षक' : language === 'kn' ? 'ಶೀರ್ಷಿಕೆ' : 'Title' }
                      ]}
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      searchable={false}
                      icon="fa-solid fa-arrow-down-short-wide"
                      style={{ width: '130px' }}
                    />
                  </div>
                </div>

                {getFilteredExploreVideos().length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '80px 20px',
                    color: 'var(--text-muted, #888888)',
                    fontSize: '18px',
                    fontWeight: 500,
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    No videos are available
                  </div>
                ) : (
                  <div className="youtube-video-grid">
                    {getFilteredExploreVideos().map(video => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= CATEGORIES VIEW ================= */}
            {activeView === 'categories' && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{t('sidebar.categories')}</h2>
                  {categoriesLoading && (
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading categories...</span>
                  )}
                </div>

                {categoriesLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px' }}>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <div 
                        key={n} 
                        style={{ 
                          background: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '16px', 
                          padding: '32px 24px', 
                          textAlign: 'center',
                          opacity: 0.6,
                          animation: 'pulse 1.5s infinite' 
                        }}
                      >
                        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
                        <div style={{ height: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', margin: '0 auto 8px', width: '60%' }}></div>
                        <div style={{ height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', margin: '0 auto', width: '40%' }}></div>
                      </div>
                    ))}
                  </div>
                ) : allCategoriesList.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border-color)',
                    marginTop: '16px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗂️</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                      No categories available
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                      There are currently no categories found from the server.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px' }}>
                    {allCategoriesList.map((cat, idx) => {
                      const catName = typeof cat === 'object' ? (cat.name || cat.title || cat.category_name) : cat;
                      const catId = typeof cat === 'object' ? (cat.id || cat.category_id || cat.name) : cat;
                      const catState = typeof cat === 'object' ? (cat.source || cat.state || cat.visibility || '') : '';
                      const catKey = typeof cat === 'object' ? (cat.unique_id || `${catId}_${catName}_${catState}_${idx}`) : `${cat}_${idx}`;
                      const iconMatch = categoriesWithIcons.find(ci => ci.name.toLowerCase() === String(catName).toLowerCase());
                      const icon = (typeof cat === 'object' && cat.icon) ? cat.icon : (iconMatch?.icon || '📚');
                      const count = typeof cat === 'object' && cat.video_count !== undefined 
                        ? cat.video_count 
                        : (typeof cat === 'object' && cat.videoCount !== undefined 
                          ? cat.videoCount 
                          : 0);
                      
                      return (
                        <div 
                          key={catKey}
                          onClick={() => {
                            setSelectedCategory(cat);
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
                          <div style={{ fontSize: '48px', marginBottom: '12px' }}>{icon}</div>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{catName}</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {count} {language === 'hi' ? 'वीडियो' : language === 'kn' ? 'ವೀಡಿಯೊಗಳು' : 'videos'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
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
            {activeView === 'watch_later' && (() => {
              const query = (watchLaterSearch || searchQuery || '').trim().toLowerCase();
              const filteredFavorites = favoritesList.filter(video => {
                if (!query) return true;
                const title = (video.title || video.video_title || video.name || '').toLowerCase();
                const desc = (video.description || video.desc || '').toLowerCase();
                const instructor = (video.instructor || video.author || '').toLowerCase();
                const cat = (video.category || video.category_name || '').toLowerCase();
                return title.includes(query) || desc.includes(query) || instructor.includes(query) || cat.includes(query);
              });

              return (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{t('sidebar.watchLater')}</h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                        {language === 'hi' ? 'आपके सहेजे गए वीडियो' : language === 'kn' ? 'ನಿಮ್ಮ ಉಳಿಸಿದ ವೀಡಿಯೊಗಳು' : 'Your saved videos to watch later'}
                      </p>
                    </div>

                    {/* Search Input for Watch Later */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                      <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }}></i>
                      <input 
                        type="text"
                        placeholder={t('user.searchWatchLater', 'Search watch later videos...')}
                        value={watchLaterSearch}
                        onChange={(e) => setWatchLaterSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 36px 10px 40px',
                          borderRadius: '24px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          outline: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                      />
                      {watchLaterSearch && (
                        <button 
                          onClick={() => setWatchLaterSearch('')}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '2px 4px'
                          }}
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {favoritesList.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                      🔖 {language === 'hi' ? 'कोई बुकमार्क किए गए वीडियो नहीं मिले।' : language === 'kn' ? 'ಬುಕ್ಮಾರ್ಕ್ ಮಾಡಿದ ವೀಡಿಯೊಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' : 'No bookmarked videos found.'}
                    </div>
                  ) : filteredFavorites.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                      🔍 {language === 'hi' ? `"${query}" के लिए कोई वीडियो नहीं मिला।` : language === 'kn' ? `"${query}" ಗಾಗಿ ಯಾವುದೇ ವೀಡಿಯೊಗಳು ಕಂಡುಬಂದಿಲ್ಲ.` : `No videos found matching "${query}".`}
                    </div>
                  ) : (
                    <div className="youtube-video-grid">
                      {filteredFavorites.map(video => (
                        <VideoCard key={video.id || video.video_id} video={video} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ================= PLAYLIST VIEW (vdUser: getPlayList) ================= */}
            {(activeView === 'playlist' || activeView === 'playlists') && (() => {
              const query = (playlistSearch || searchQuery || '').trim().toLowerCase();

              return (
                <div className="animate-fade-in">
                  {selectedPlaylist ? (() => {
                    const filteredPlaylistVideos = (selectedPlaylist.videos || []).filter(video => {
                      if (!query) return true;
                      const title = (video.title || video.video_title || video.name || '').toLowerCase();
                      const desc = (video.description || video.desc || '').toLowerCase();
                      const instructor = (video.instructor || video.author || '').toLowerCase();
                      const cat = (video.category || video.category_name || '').toLowerCase();
                      return title.includes(query) || desc.includes(query) || instructor.includes(query) || cat.includes(query);
                    });

                    return (
                      <div>
                        {/* Playlist Detail Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                            <button 
                              onClick={() => {
                                setSelectedPlaylist(null);
                                setPlaylistSearch('');
                              }}
                              className="btn btn-secondary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', fontSize: '13px' }}
                            >
                              <i className="fa-solid fa-arrow-left"></i> {t('user.backToPlaylists', 'Back to Playlists')}
                            </button>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
                              {selectedPlaylist.title || selectedPlaylist.name}
                            </h2>
                            <span className="badge badge-active" style={{ fontSize: '12px' }}>
                              {selectedPlaylist.videos?.length || selectedPlaylist.video_count || 0} Lessons
                            </span>
                          </div>

                          {/* Search Input for Playlist Detail */}
                          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }}></i>
                            <input 
                              type="text"
                              placeholder={t('user.searchPlaylistVideos', 'Search lessons in playlist...')}
                              value={playlistSearch}
                              onChange={(e) => setPlaylistSearch(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 36px 10px 40px',
                                borderRadius: '24px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            />
                            {playlistSearch && (
                              <button 
                                onClick={() => setPlaylistSearch('')}
                                style={{
                                  position: 'absolute',
                                  right: '12px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  padding: '2px 4px'
                                }}
                                title="Clear search"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {selectedPlaylist.description && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', maxWidth: '800px', lineHeight: '1.6' }}>
                            {selectedPlaylist.description}
                          </p>
                        )}

                        {(!selectedPlaylist.videos || selectedPlaylist.videos.length === 0) ? (
                          <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                            {language === 'hi' ? 'इस प्लेलिस्ट में कोई वीडियो नहीं है।' : language === 'kn' ? 'ಈ ಪ್ಲೇಪಟ್ಟಿಯಲ್ಲಿ ಯಾವುದೇ ವೀಡಿಯೊಗಳಿಲ್ಲ.' : 'No videos in this playlist yet.'}
                          </div>
                        ) : filteredPlaylistVideos.length === 0 ? (
                          <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                            🔍 {language === 'hi' ? `"${query}" के लिए कोई वीडियो नहीं मिला।` : language === 'kn' ? `"${query}" ಗಾಗಿ ಯಾವುದೇ ವೀಡಿಯೊಗಳು ಕಂಡುಬಂದಿಲ್ಲ.` : `No videos found matching "${query}".`}
                          </div>
                        ) : (
                          <div className="youtube-video-grid">
                            {filteredPlaylistVideos.map(video => (
                              <VideoCard key={video.id || video.video_id} video={video} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })() : playlistVideosList.length > 0 ? (() => {
                    const filteredFlatVideos = playlistVideosList.filter(video => {
                      if (!query) return true;
                      const title = (video.title || video.video_title || video.name || '').toLowerCase();
                      const desc = (video.description || video.desc || '').toLowerCase();
                      const instructor = (video.instructor || video.author || '').toLowerCase();
                      const cat = (video.category || video.category_name || '').toLowerCase();
                      return title.includes(query) || desc.includes(query) || instructor.includes(query) || cat.includes(query);
                    });

                    return (
                      <div>
                        {/* Flat Playlist Videos Grid */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                          <div>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{t('sidebar.playlist', 'Playlist')}</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                              {t('sidebar.subPlaylist', 'Your saved playlist videos')}
                            </p>
                          </div>

                          {/* Search Input for Flat Playlist Videos */}
                          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }}></i>
                            <input 
                              type="text"
                              placeholder={t('user.searchPlaylistVideos', 'Search playlist videos...')}
                              value={playlistSearch}
                              onChange={(e) => setPlaylistSearch(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 36px 10px 40px',
                                borderRadius: '24px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            />
                            {playlistSearch && (
                              <button 
                                onClick={() => setPlaylistSearch('')}
                                style={{
                                  position: 'absolute',
                                  right: '12px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  padding: '2px 4px'
                                }}
                                title="Clear search"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {filteredFlatVideos.length === 0 ? (
                          <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                            🔍 {language === 'hi' ? `"${query}" के लिए कोई वीडियो नहीं मिला।` : language === 'kn' ? `"${query}" ಗಾಗಿ ಯಾವುದೇ ವೀಡಿಯೊಗಳು ಕಂಡುಬಂದಿಲ್ಲ.` : `No videos found matching "${query}".`}
                          </div>
                        ) : (
                          <div className="youtube-video-grid">
                            {filteredFlatVideos.map(video => (
                              <VideoCard key={video.id || video.video_id} video={video} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })() : (() => {
                    const filteredPlaylists = playlistsList.filter(pl => {
                      if (!query) return true;
                      const title = (pl.title || pl.name || '').toLowerCase();
                      const desc = (pl.description || '').toLowerCase();
                      return title.includes(query) || desc.includes(query);
                    });

                    return (
                      <div>
                        {/* Playlists Grid */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                          <div>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{t('sidebar.playlist', 'Playlist')}</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                              {t('sidebar.subPlaylist', 'Curated & custom video playlists')}
                            </p>
                          </div>

                          {/* Search Input for Playlists */}
                          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }}></i>
                            <input 
                              type="text"
                              placeholder={t('user.searchPlaylists', 'Search playlists...')}
                              value={playlistSearch}
                              onChange={(e) => setPlaylistSearch(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 36px 10px 40px',
                                borderRadius: '24px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            />
                            {playlistSearch && (
                              <button 
                                onClick={() => setPlaylistSearch('')}
                                style={{
                                  position: 'absolute',
                                  right: '12px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  padding: '2px 4px'
                                }}
                                title="Clear search"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {playlistLoading ? (
                          <div className="youtube-video-grid">
                            {[1, 2, 3, 4].map(n => <SkeletonCard key={n} />)}
                          </div>
                        ) : playlistsList.length === 0 ? (
                          <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                            📑 {language === 'hi' ? 'कोई प्लेलिस्ट नहीं मिली।' : language === 'kn' ? 'ಯಾವುದೇ ಪ್ಲೇಪಟ್ಟಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' : 'No playlists found.'}
                          </div>
                        ) : filteredPlaylists.length === 0 ? (
                          <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                            🔍 {language === 'hi' ? `"${query}" के लिए कोई प्लेलिस्ट नहीं मिली।` : language === 'kn' ? `"${query}" ಗಾಗಿ ಯಾವುದೇ ಪ್ಲೇಪಟ್ಟಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ.` : `No playlists found matching "${query}".`}
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '22px' }}>
                            {filteredPlaylists.map(pl => (
                              <div 
                                key={pl.id}
                                onClick={() => setSelectedPlaylist(pl)}
                                className="glass-card"
                                style={{
                                  padding: '0',
                                  borderRadius: '16px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-secondary)',
                                  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                                  display: 'flex',
                                  flexDirection: 'column'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-4px)';
                                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.18)';
                                  e.currentTarget.style.borderColor = 'var(--accent-color, #2563eb)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                  e.currentTarget.style.borderColor = 'var(--border-color)';
                                }}
                              >
                                {/* Playlist Cover Image with Video Count Badge */}
                                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#0f172a' }}>
                                  <img 
                                    src={pl.thumbnail} 
                                    alt={pl.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                      e.target.src = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=60';
                                    }}
                                  />
                                  <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: 'rgba(0, 0, 0, 0.75)',
                                    color: '#fff',
                                    padding: '4px 10px',
                                    borderRadius: '14px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    backdropFilter: 'blur(4px)'
                                  }}>
                                    <i className="fa-solid fa-list-ul"></i> {pl.video_count || pl.videos?.length || 0} Videos
                                  </div>
                                  <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    padding: '14px'
                                  }}>
                                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <i className="fa-solid fa-circle-play" style={{ color: 'var(--accent-color, #38bdf8)' }}></i> View Playlist
                                    </span>
                                  </div>
                                </div>

                                {/* Playlist Meta Details */}
                                <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                                      {pl.title || pl.name}
                                    </h3>
                                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                      {pl.description}
                                    </p>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                    <span><i className="fa-regular fa-clock"></i> {pl.videos?.length || pl.video_count || 0} Lessons</span>
                                    <span style={{ color: 'var(--accent-color, #2563eb)', fontWeight: 600 }}>Open ➔</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* ================= WATCH HISTORY VIEW (vdUser: getWatchHistory) ================= */}
            {(activeView === 'watch_history' || activeView === 'history') && (() => {
              const query = (historySearch || searchQuery || '').trim().toLowerCase();
              const filteredHistory = watchHistoryList.filter(item => {
                if (!query) return true;
                const title = (item.title || item.video_title || item.name || '').toLowerCase();
                const courseTitle = (item.course_title || item.courseName || '').toLowerCase();
                const desc = (item.description || item.desc || '').toLowerCase();
                const instructor = (item.instructor || item.author || '').toLowerCase();
                const cat = (item.category || item.category_name || '').toLowerCase();
                return title.includes(query) || courseTitle.includes(query) || desc.includes(query) || instructor.includes(query) || cat.includes(query);
              });

              return (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{t('sidebar.watchHistory', 'Watch History')}</h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                        {t('sidebar.subWatchHistory', 'Videos and lessons you recently watched')}
                      </p>
                    </div>

                    {/* Search Input for Watch History */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                      <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }}></i>
                      <input 
                        type="text"
                        placeholder={t('user.searchWatchHistory', 'Search watch history...')}
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 36px 10px 40px',
                          borderRadius: '24px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          outline: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                      />
                      {historySearch && (
                        <button 
                          onClick={() => setHistorySearch('')}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '2px 4px'
                          }}
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {watchHistoryLoading ? (
                    <div className="youtube-video-grid">
                      {[1, 2, 3, 4].map(n => <SkeletonCard key={n} />)}
                    </div>
                  ) : watchHistoryList.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                      🕒 {language === 'hi' ? 'कोई देखने का इतिहास नहीं मिला।' : language === 'kn' ? 'ಯಾವುದೇ ವೀಕ್ಷಣೆ ಇತಿಹಾಸ ಕಂಡುಬಂದಿಲ್ಲ.' : 'No watch history recorded yet. Start watching videos to build your history!'}
                    </div>
                  ) : filteredHistory.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
                      🔍 {language === 'hi' ? `"${query}" के लिए कोई इतिहास नहीं मिला।` : language === 'kn' ? `"${query}" ಗಾಗಿ ಯಾವುದೇ ಇತಿಹಾಸ ಕಂಡುಬಂದಿಲ್ಲ.` : `No watch history found matching "${query}".`}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {filteredHistory.map(item => {
                        const pct = Math.min(100, Math.max(0, item.completion_percentage !== undefined ? item.completion_percentage : 0));
                        const isComplete = item.status === 'completed' || pct >= 95;
                        const videoTargetId = item.videoId || item.video_id || item.id;
                        const handleNavigateToWatch = () => {
                          navigate(`/watch/${videoTargetId}`, { state: { video: item } });
                        };

                        return (
                          <div 
                            key={item.id}
                            className="glass-card"
                            style={{
                              display: 'flex',
                              gap: '20px',
                              padding: '16px',
                              borderRadius: '16px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {/* Thumbnail with duration & progress bar */}
                            <div 
                              onClick={handleNavigateToWatch}
                              style={{
                                position: 'relative',
                                width: '220px',
                                minWidth: '200px',
                                aspectRatio: '16/9',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                background: '#0f172a',
                                flexShrink: 0
                              }}
                            >
                              <img 
                                src={item.thumbnail} 
                                alt={item.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60';
                                }}
                              />
                              {/* Duration Badge */}
                              {item.duration && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: '8px',
                                  right: '8px',
                                  background: 'rgba(0, 0, 0, 0.8)',
                                  color: '#fff',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600
                                }}>
                                  {item.duration}
                                </div>
                              )}
                              {/* Progress Bar at Bottom */}
                              <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: 'rgba(255,255,255,0.2)'
                              }}>
                                <div style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  background: isComplete ? '#10b981' : '#e50914'
                                }} />
                              </div>
                            </div>

                            {/* Info Column */}
                            <div style={{ flex: 1, minWidth: '240px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                {item.category && (
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    color: 'var(--accent-primary)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)'
                                  }}>
                                    {item.category}
                                  </span>
                                )}
                                {item.watched_at && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {new Date(item.watched_at).toLocaleDateString()}
                                  </span>
                                )}
                                {item.duration && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    ⏱️ {item.duration}
                                  </span>
                                )}
                              </div>

                              <h3 
                                onClick={handleNavigateToWatch}
                                style={{ 
                                  fontSize: '16px', 
                                  fontWeight: 700, 
                                  margin: '0 0 6px 0', 
                                  cursor: 'pointer',
                                  color: 'var(--text-primary)',
                                  lineHeight: 1.4
                                }}
                              >
                                {item.title || item.video_title}
                              </h3>

                              {item.course_title && (
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                                  <span style={{ fontWeight: 600 }}>Course:</span> {item.course_title}
                                </p>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: isComplete ? '#10b981' : 'var(--text-secondary)'
                                }}>
                                  {isComplete ? '✅ Completed' : `⏳ In Progress (${pct}%)`}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <i className="fa-regular fa-calendar"></i> {item.date || (item.watched_at && !item.watched_at.includes('T') ? item.watched_at : (item.watched_at ? new Date(item.watched_at).toLocaleDateString() : 'Recently'))}
                                </span>
                                {item.watch_time > 0 && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <i className="fa-regular fa-eye"></i> {Math.round(item.watch_time / 60)} mins watched
                                  </span>
                                )}
                              </div>
                          </div>

                          {/* Action Button */}
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                              onClick={handleNavigateToWatch}
                              className="btn btn-primary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 18px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: 600
                              }}
                            >
                              <i className="fa-solid fa-play"></i> {isComplete ? 'Watch Again' : 'Resume ➔'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                    onClick={() => {
                      setCustomAlert(prev => ({ ...prev, show: false }));
                      if (customAlert.action) {
                        customAlert.action();
                      } else {
                        navigate('/plans');
                      }
                    }}
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
          </>
        )}
      </div>
  );
};

export default UserDashboard;
