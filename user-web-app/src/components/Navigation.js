import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getCurrentUser } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import PremiumSelect from './PremiumSelect';

const Navigation = ({ toggleSidebar, theme, setTheme }) => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [showRecentlyViewed, setShowRecentlyViewed] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previewRecentVideo, setPreviewRecentVideo] = useState(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState(headerSearch);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState({ courses: [], videos: [], categories: [] });
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch (e) {
      return [];
    }
  });

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const recentlyViewedRef = useRef(null);
  const previewVideoRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const hasLoadedIndexRef = useRef(false);

  // Sync searchQuery when headerSearch changes in URL
  useEffect(() => {
    setSearchQuery(headerSearch);
  }, [headerSearch]);

  // Load search index on-demand once
  const loadSearchIndex = async () => {
    if (hasLoadedIndexRef.current) return;
    hasLoadedIndexRef.current = true;
    try {
      const [coursesRes, videosRes, categoriesRes] = await Promise.allSettled([
        api.videos.getAllCourses ? api.videos.getAllCourses() : api.dashboard.getUser('getAllCourses'),
        api.videos.list ? api.videos.list() : api.dashboard.getUser('getAllVideos'),
        api.categories ? api.categories.list() : api.dashboard.getUser('categories')
      ]);

      const normalizeList = (res) => {
        if (res.status !== 'fulfilled' || !res.value) return [];
        const val = res.value;
        if (Array.isArray(val)) return val;
        if (val.data && Array.isArray(val.data)) return val.data;
        if (val.json && Array.isArray(val.json)) return val.json;
        return [];
      };

      const courses = normalizeList(coursesRes).map(c => c.json || c);
      const videos = normalizeList(videosRes).map(v => v.json || v);
      const categories = normalizeList(categoriesRes).map(cat => cat.json || cat);
      setSearchIndex({ courses, videos, categories });
    } catch (err) {
      console.warn("Failed to load global search index:", err);
    }
  };

  // Fetch notifications once on initial mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Keyboard shortcut listener (/ or Ctrl+K / Cmd+K to focus search, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) ||
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        loadSearchIndex();
        searchInputRef.current?.focus();
        setIsSearchDropdownOpen(true);
      }
      if (e.key === 'Escape' && isSearchDropdownOpen) {
        setIsSearchDropdownOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchDropdownOpen]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
      if (recentlyViewedRef.current && !recentlyViewedRef.current.contains(e.target)) {
        setShowRecentlyViewed(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.list();
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      const normalized = list.map((item, idx) => {
        let jsonObj = {};
        if (item && item.json) {
          try {
            jsonObj = typeof item.json === 'string' ? JSON.parse(item.json) : item.json;
          } catch (err) {
            jsonObj = item.json || {};
          }
        }
        
        let msgVal = item.message || jsonObj.message || item.description || jsonObj.description || '';
        if (typeof msgVal === 'string') {
          msgVal = msgVal.replace(/^"|"$/g, '');
        }
        
        let titleVal = item.title || jsonObj.title || item.name || jsonObj.name;
        if (!titleVal) {
          if (msgVal.toLowerCase().includes('course')) {
            titleVal = 'New Course Published';
          } else {
            titleVal = 'New Video Uploaded';
          }
        }

        const dateVal = item.date || jsonObj.date || item.created_at || jsonObj.created_at || new Date().toISOString();
        const readVal = item.read !== undefined ? Boolean(item.read) : (jsonObj.read !== undefined ? Boolean(jsonObj.read) : false);

        return {
          id: String(item.id || jsonObj.id || (item.pairedItem ? item.pairedItem.item : idx)),
          title: titleVal,
          message: msgVal,
          date: dateVal,
          read: readVal
        };
      });
      const validNotifications = normalized.filter(n => {
        if (!n) return false;
        const msgStr = String(n.message || '').trim();
        const titleStr = String(n.title || '').trim();

        // If notification has no message and title is default fallback or empty, ignore empty object
        if (!msgStr && (!titleStr || titleStr === 'New Video Uploaded' || titleStr === 'New Course Published' || titleStr === 'Notification')) {
          return false;
        }
        return msgStr.length > 0 || titleStr.length > 0;
      });

      setNotifications(validNotifications);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  const fetchRecentlyViewedByFilter = async (filterValue) => {
    try {
      setLoadingHistory(true);
      const response = await api.dashboard.getUser('recently_palyed', { 
        filter: filterValue 
      });
      
      const list = Array.isArray(response) ? response : (response?.data && Array.isArray(response.data) ? response.data : []);
      
      const formatted = list.map((item, idx) => {
        const data = item?.json || item || {};
        return {
          id: data.id || item.id || idx,
          video: {
            id: data.video_id || data.id || idx,
            title: data.title || '',
            thumbnail: data.thumbnail || '',
            video_url: data.video_url || data.videoUrl || data.url || ''
          },
          completionPercentage: parseFloat(data.completion_percentage || 0),
          watchDuration: data.watch_duration || '',
          watchStatus: data.watch_status || '',
          startedAt: data.started_at || ''
        };
      });
      
      setRecentlyViewed(formatted);
    } catch (e) {
      console.error("Failed to load recently viewed with filter", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatVideoTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '00:00';
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handlePreviewSeek = (e) => {
    const time = parseFloat(e.target.value);
    setPreviewCurrentTime(time);
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = time;
    }
  };

  // Compute categorized search results across courses, videos, resources, and categories
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { courses: [], videos: [], resources: [], categories: [], total: 0 };

    // Search in Courses
    const matchedCourses = (searchIndex.courses || []).filter(c => {
      const title = String(c.title || c.name || '').toLowerCase();
      const desc = String(c.description || '').toLowerCase();
      const instructor = String(c.instructor || '').toLowerCase();
      const category = String(c.category || '').toLowerCase();
      const tags = Array.isArray(c.tags) ? c.tags.join(' ').toLowerCase() : String(c.tags || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || instructor.includes(q) || category.includes(q) || tags.includes(q);
    }).slice(0, 5);

    // Search in Videos / Lessons
    const matchedVideos = (searchIndex.videos || []).filter(v => {
      const title = String(v.title || v.video_title || v.name || '').toLowerCase();
      const desc = String(v.description || '').toLowerCase();
      const instructor = String(v.instructor || '').toLowerCase();
      const category = String(v.category || '').toLowerCase();
      const tags = Array.isArray(v.tags) ? v.tags.join(' ').toLowerCase() : String(v.tags || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || instructor.includes(q) || category.includes(q) || tags.includes(q);
    }).slice(0, 5);

    // Search in Resources / Documents / PDFs
    const matchedResources = [];
    (searchIndex.videos || []).forEach(v => {
      const files = v.files || v.resources || v.attachments || [];
      if (Array.isArray(files)) {
        files.forEach(f => {
          const fName = String(f.file_name || f.fileName || f.name || f.title || '').toLowerCase();
          const fType = String(f.file_type || f.type || '').toLowerCase();
          if (fName.includes(q) || fType.includes(q)) {
            matchedResources.push({
              id: f.id || `${v.id}_res_${fName}`,
              fileName: f.file_name || f.fileName || f.name || f.title || 'Resource Document',
              fileType: f.file_type || f.type || 'PDF',
              fileUrl: f.file_url || f.url || '',
              videoId: v.id,
              videoTitle: v.title || v.video_title
            });
          }
        });
      }
    });

    // Search in Categories
    const matchedCategories = (searchIndex.categories || []).filter(cat => {
      const name = String(typeof cat === 'object' ? (cat.name || cat.title || cat.category_name) : cat).toLowerCase();
      let subNames = '';
      if (typeof cat === 'object' && cat.sub_categories) {
        subNames = (Array.isArray(cat.sub_categories) ? cat.sub_categories.map(s => typeof s === 'object' ? s.name : s).join(' ') : String(cat.sub_categories)).toLowerCase();
      }
      return name.includes(q) || subNames.includes(q);
    }).slice(0, 4);

    const total = matchedCourses.length + matchedVideos.length + matchedResources.length + matchedCategories.length;
    return {
      courses: matchedCourses,
      videos: matchedVideos,
      resources: matchedResources.slice(0, 4),
      categories: matchedCategories,
      total
    };
  }, [searchQuery, searchIndex]);

  const saveRecentSearch = (term) => {
    if (!term || !term.trim()) return;
    const cleanTerm = term.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t.toLowerCase() !== cleanTerm.toLowerCase());
      const updated = [cleanTerm, ...filtered].slice(0, 6);
      try {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const removeRecentSearch = (e, termToRemove) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(t => t !== termToRemove);
      try {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const clearAllRecentSearches = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('recentSearches');
    } catch (e) {}
  };

  const handleExecuteSearch = (term) => {
    const finalTerm = term !== undefined ? term : searchQuery;
    if (finalTerm) {
      saveRecentSearch(finalTerm);
    }
    setIsSearchDropdownOpen(false);
    navigate(`/?search=${encodeURIComponent(finalTerm || '')}`);
  };

  const handleSelectVideo = (video) => {
    saveRecentSearch(video.title || video.video_title || 'Video');
    setIsSearchDropdownOpen(false);
    navigate(`/watch/${video.id || video.video_id}`);
  };

  const handleSelectCourse = (course) => {
    saveRecentSearch(course.title || course.name || 'Course');
    setIsSearchDropdownOpen(false);
    const firstVid = course.chapters?.[0]?.lessons?.[0]?.id || course.videos?.[0]?.id || course.first_video_id || course.id;
    navigate(`/watch/${firstVid}`);
  };

  const handleSelectCategory = (cat) => {
    const catName = typeof cat === 'object' ? (cat.name || cat.title || cat.category_name) : cat;
    saveRecentSearch(catName);
    setIsSearchDropdownOpen(false);
    navigate(`/?category=${encodeURIComponent(catName)}`);
  };

  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <strong key={i} style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{part}</strong>
      ) : part
    );
  };

  const handleNotificationClick = async (notif) => {
    setNotifications(prev => prev.map(n => String(n.id) === String(notif.id) ? { ...n, read: true } : n));
    setShowNotifDropdown(false);
    try {
      await api.notifications.saveNotification(notif.id, 'read');
    } catch (e) {
      console.error('Failed to save notification read status', e);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleLogout = () => {
    api.auth.logout(1);
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) return null;

  return (
    <>
      <nav className="global-navbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px',
      padding: '0 24px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* Burger menu for tablet/mobile */}
        <button 
          onClick={toggleSidebar} 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '22px',
            cursor: 'pointer',
            display: 'none' // Controlled in CSS or dynamically based on resize, but hidden on desktop
          }}
          className="mobile-burger-btn"
        >
          ☰
        </button>
        <div 
          onClick={() => navigate('/')} 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <img 
            src="/logo.png" 
            alt="XLurn" 
            className="nav-brand-logo"
            style={{ 
              height: '42px', 
              width: 'auto',
              maxWidth: '140px',
              objectFit: 'contain', 
              objectPosition: 'left',
              margin: '0',
              zIndex: 110, 
              position: 'relative',
              imageRendering: '-webkit-optimize-contrast' 
            }} 
          />
        </div>
      </div>

      {/* Global Responsive Search Bar */}
      <div 
        ref={searchContainerRef}
        className="nav-global-search"
        style={{
          flex: '1',
          maxWidth: '560px',
          margin: '0 20px',
          position: 'relative'
        }}
      >
        <div className="header-search-box">
          <svg className="header-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            className="header-search-input"
            placeholder={t('nav.searchPlaceholder') || 'Search courses, lessons, documents...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchDropdownOpen(true);
              loadSearchIndex();
            }}
            onFocus={() => {
              setIsSearchDropdownOpen(true);
              loadSearchIndex();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleExecuteSearch();
              }
            }}
          />
          {searchQuery && (
            <button 
              type="button" 
              className="header-search-clear"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              title={t('nav.clearSearch') || 'Clear search'}
            >
              ✕
            </button>
          )}
          <span className="header-search-kbd">/</span>
        </div>

        {/* Live Categorized Instant Search Dropdown */}
        {isSearchDropdownOpen && (
          <div className="header-search-dropdown glass-card animate-fade-in">
            {searchQuery.trim() ? (
              searchResults.total > 0 ? (
                <>
                  {/* Courses section */}
                  {searchResults.courses.length > 0 && (
                    <div className="search-results-group">
                      <div className="search-category-header">
                        <span>🎓 {t('nav.searchCourses') || 'Courses'}</span>
                        <span className="search-count-badge">{searchResults.courses.length}</span>
                      </div>
                      {searchResults.courses.map(course => (
                        <div 
                          key={course.id || course.title} 
                          className="search-result-row"
                          onClick={() => handleSelectCourse(course)}
                        >
                          <img 
                            src={course.thumbnail ? (course.thumbnail.startsWith('http') ? course.thumbnail : `http://localhost:5000${course.thumbnail}`) : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100'} 
                            alt={course.title}
                            className="search-result-thumb"
                          />
                          <div className="search-result-info">
                            <div className="search-result-title">{highlightMatch(course.title || course.name, searchQuery)}</div>
                            <div className="search-result-meta">
                              {course.instructor && <span>👨‍🏫 {course.instructor}</span>}
                              {course.total_lessons && <span>• {course.total_lessons} lessons</span>}
                              {course.category && <span>• {course.category}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Videos & Lessons section */}
                  {searchResults.videos.length > 0 && (
                    <div className="search-results-group">
                      <div className="search-category-header">
                        <span>🎬 {t('nav.searchVideos') || 'Videos & Lessons'}</span>
                        <span className="search-count-badge">{searchResults.videos.length}</span>
                      </div>
                      {searchResults.videos.map(video => (
                        <div 
                          key={video.id || video.title} 
                          className="search-result-row"
                          onClick={() => handleSelectVideo(video)}
                        >
                          <img 
                            src={video.thumbnail ? (video.thumbnail.startsWith('http') ? video.thumbnail : `http://localhost:5000${video.thumbnail}`) : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'} 
                            alt={video.title}
                            className="search-result-thumb"
                          />
                          <div className="search-result-info">
                            <div className="search-result-title">{highlightMatch(video.title || video.video_title, searchQuery)}</div>
                            <div className="search-result-meta">
                              {video.category && <span>🏷️ {video.category}</span>}
                              {video.duration && <span>• ⏱️ {video.duration}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resources & Documents section */}
                  {searchResults.resources.length > 0 && (
                    <div className="search-results-group">
                      <div className="search-category-header">
                        <span>📄 {t('nav.searchResources') || 'Resources & Documents'}</span>
                        <span className="search-count-badge">{searchResults.resources.length}</span>
                      </div>
                      {searchResults.resources.map(res => (
                        <div 
                          key={res.id || res.fileName} 
                          className="search-result-row"
                          onClick={() => {
                            saveRecentSearch(res.fileName);
                            setIsSearchDropdownOpen(false);
                            if (res.videoId) navigate(`/watch/${res.videoId}`);
                          }}
                        >
                          <div className="search-result-doc-icon">📄</div>
                          <div className="search-result-info">
                            <div className="search-result-title">{highlightMatch(res.fileName, searchQuery)}</div>
                            <div className="search-result-meta">
                              <span>{res.fileType.toUpperCase()}</span>
                              {res.videoTitle && <span>• From: {res.videoTitle}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Categories & Topics section */}
                  {searchResults.categories.length > 0 && (
                    <div className="search-results-group">
                      <div className="search-category-header">
                        <span>🏷️ {t('nav.searchCategories') || 'Categories & Topics'}</span>
                        <span className="search-count-badge">{searchResults.categories.length}</span>
                      </div>
                      <div className="search-categories-tags">
                        {searchResults.categories.map((cat, idx) => {
                          const catName = typeof cat === 'object' ? (cat.name || cat.title) : cat;
                          return (
                            <button
                              key={idx}
                              type="button"
                              className="search-cat-tag-btn"
                              onClick={() => handleSelectCategory(cat)}
                            >
                              🏷️ {highlightMatch(catName, searchQuery)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* View All Search Results button */}
                  <div className="search-footer-action">
                    <button
                      type="button"
                      className="search-view-all-btn"
                      onClick={() => handleExecuteSearch()}
                    >
                      {t('nav.viewAllResults') || 'View all results for'} "{searchQuery}" ➔
                    </button>
                  </div>
                </>
              ) : (
                <div className="search-no-results">
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t('nav.noSearchResults') || 'No results found for'} "{searchQuery}"
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Try checking your spelling or searching for a different keyword
                  </div>
                </div>
              )
            ) : (
              /* Recent Searches & Suggested Quick Searches */
              <div className="search-recent-panel">
                {recentSearches.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div className="search-category-header">
                      <span>🕒 {t('nav.recentSearches') || 'Recent Searches'}</span>
                      <button 
                        type="button" 
                        className="search-clear-all-btn"
                        onClick={clearAllRecentSearches}
                      >
                        {t('nav.clearSearch') || 'Clear'}
                      </button>
                    </div>
                    <div className="search-recent-list">
                      {recentSearches.map((term, idx) => (
                        <div 
                          key={idx} 
                          className="search-recent-item"
                          onClick={() => {
                            setSearchQuery(term);
                            handleExecuteSearch(term);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>🕒</span>
                            <span>{term}</span>
                          </div>
                          <button 
                            type="button" 
                            className="search-recent-remove"
                            onClick={(e) => removeRecentSearch(e, term)}
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Topics shortcut tags */}
                <div>
                  <div className="search-category-header">
                    <span>🔥 {t('user.categories') || 'Popular Topics'}</span>
                  </div>
                  <div className="search-categories-tags">
                    {['React', 'AI & Machine Learning', 'Quantum Physics', 'Data Science', 'Technology', 'Science'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className="search-cat-tag-btn"
                        onClick={() => {
                          setSearchQuery(tag);
                          handleExecuteSearch(tag);
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>


        {/* Recently Viewed Dropdown */}
        {user.role === 'user' && (
          <div ref={recentlyViewedRef} style={{ position: 'relative' }} className="nav-recently-played">
            <button 
              onClick={() => {
                const newShow = !showRecentlyViewed;
                setShowRecentlyViewed(newShow);
                if (newShow) {
                  fetchRecentlyViewedByFilter(activeFilter);
                }
              }}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              {t('user.recentlyPlayed')}
            </button>

            {showRecentlyViewed && (
              <div style={{
                position: 'absolute',
                top: '45px',
                right: 0,
                width: '320px',
                zIndex: 1000,
                padding: '12px'
              }} className="glass-card">
                <div style={{ fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '14px' }}>
                  {t('user.recentlyPlayed')}
                </div>
                
                {/* Filter Selector Row */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  {['Last 7 days', 'last 1 month', 'more than 1 month'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter);
                        fetchRecentlyViewedByFilter(filter);
                      }}
                      style={{
                        flex: 1,
                        fontSize: '10px',
                        padding: '4px 2px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: activeFilter === filter ? 'var(--accent-primary)' : 'var(--border-color)',
                        background: activeFilter === filter ? 'var(--accent-primary)' : 'transparent',
                        color: activeFilter === filter ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: activeFilter === filter ? 600 : 400,
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {filter === 'Last 7 days' ? t('filter.7days', 'Last 7 days') :
                       filter === 'last 1 month' ? t('filter.1month', 'Last 1 month') :
                       t('filter.more1month', 'More than 1 month')}
                    </button>
                  ))}
                </div>

                {loadingHistory ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '24px 0', textAlign: 'center' }}>
                    <div style={{ 
                      display: 'inline-block', 
                      width: '18px', 
                      height: '18px', 
                      border: '2px solid var(--accent-primary)', 
                      borderTopColor: 'transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 0.8s linear infinite',
                      marginBottom: '6px'
                    }} />
                    <div>Loading...</div>
                  </div>
                ) : recentlyViewed.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '12px 0', textAlign: 'center' }}>
                    {t('user.noVideosWatched')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                    {recentlyViewed.map(item => {
                      const video = item.video;
                      if (!video) return null;
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => {
                            setPreviewRecentVideo(item);
                            setShowRecentlyViewed(false);
                          }}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            transition: 'background 0.2s'
                          }}
                          className="recently-viewed-item"
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <img 
                            src={video.thumbnail && video.thumbnail.startsWith('http') ? video.thumbnail : (video.thumbnail ? `http://localhost:5000${video.thumbnail}` : 'https://placehold.co/180x101?text=No+Thumbnail')} 
                            alt={video.title} 
                            style={{ width: '70px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '2px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {video.title}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              <span style={{ 
                                color: item.watchStatus === 'Completed' ? '#10b981' : 'var(--accent-primary)', 
                                fontWeight: 600 
                              }}>
                                {item.watchStatus || 'Watched'} ({item.completionPercentage}%)
                              </span>
                              {item.watchDuration && (
                                <>
                                  <span>•</span>
                                  <span>{item.watchDuration}</span>
                                </>
                              )}
                            </div>
                            {item.startedAt && (
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                                📅 {item.startedAt}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Language Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', width: '135px', minWidth: '135px' }} className="nav-lang-switcher">
          <PremiumSelect
            options={[
              { id: 'en', name: 'English' },
              { id: 'hi', name: 'हिंदी' },
              { id: 'kn', name: 'ಕನ್ನಡ' }
            ]}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            searchable={false}
            size="small"
            icon="fa-solid fa-globe"
            style={{ width: '135px', minWidth: '135px' }}
            buttonStyle={{
              height: '34px',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12.5px',
              fontWeight: 600
            }}
          />
        </div>

        {/* Theme Switcher */}
        <button 
          className="nav-theme-switcher"
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontSize: '20px',
            padding: '4px'
          }}
          title={t('nav.theme')}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        {user && (
          <div ref={notifRef} style={{ position: 'relative' }} className="nav-notifications">
            <div onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
            }} className="notification-bell" style={{ position: 'relative', cursor: 'pointer', padding: '6px' }}>
              <span style={{ fontSize: '20px' }}>🔔</span>
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </div>

            {showNotifDropdown && (
              <div className="notification-dropdown glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={async () => {
                        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        if (unreadIds.length > 0) {
                          try {
                            await api.notifications.saveAllNotifications(unreadIds, 'read');
                          } catch (e) {
                            console.error('Failed to save all notifications read status', e);
                          }
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={`notification-item ${n.read ? '' : 'unread'}`}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        marginBottom: '6px',
                        backgroundColor: n.read ? 'transparent' : 'rgba(124, 58, 237, 0.08)',
                        borderLeft: n.read ? 'none' : '3px solid #7c3aed',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="notification-title" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{n.title}</span>
                        {!n.read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7c3aed' }}></span>}
                      </div>
                      <div className="notification-msg" style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.message}</div>
                      <div className="notification-date" style={{ fontSize: '11px', color: 'var(--text-tertiary, #a1a1aa)', marginTop: '4px' }}>{new Date(n.date).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* User Profile */}
        <div ref={profileRef} style={{ position: 'relative' }} className="nav-profile-avatar">
          <div 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-secondary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              overflow: 'hidden'
            }}>
              {user.avatar ? (
                <img src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (user.name || user.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, display: 'none' }} className="desktop-username">
              {user.name || user.email}
            </span>
          </div>

          {showProfileDropdown && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: 0,
              width: '180px',
              zIndex: 1000,
              padding: '8px 0'
            }} className="glass-card">
              <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                {t('nav.role')}: {user.role === 'super_admin' ? t('admin.superTitle') : user.role === 'admin' ? t('admin.title') : t('nav.brand')}
              </div>
              <div 
                onClick={() => { navigate('/profile'); setShowProfileDropdown(false); }} 
                style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
              >
                {t('nav.profile')}
              </div>
              <div 
                onClick={handleLogout} 
                style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 600 }}
                onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
              >
                {t('nav.logout')}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>

    {/* Custom Video Alert / Preview Pop-up Modal for Recently Played */}
    {previewRecentVideo && (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setPreviewRecentVideo(null);
          }
        }}
      >
        <div 
          style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'modalZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Pop-up Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'var(--bg-tertiary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '18px' }}>🎬</span>
              <h3 style={{ 
                margin: 0, 
                fontSize: '15px', 
                fontWeight: 700, 
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {previewRecentVideo.video?.title || 'Recently Played Video'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setPreviewRecentVideo(null)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.2s'
              }}
            >
              ✕
            </button>
          </div>

          {/* Video Player Section */}
          <div style={{ position: 'relative', width: '100%', backgroundColor: '#000' }}>
            <video
              ref={previewVideoRef}
              src={previewRecentVideo.video?.video_url && previewRecentVideo.video.video_url.startsWith('http') 
                ? previewRecentVideo.video.video_url 
                : (previewRecentVideo.video?.video_url ? `http://localhost:5000${previewRecentVideo.video.video_url}` : '')}
              poster={previewRecentVideo.video?.thumbnail && previewRecentVideo.video.thumbnail.startsWith('http')
                ? previewRecentVideo.video.thumbnail
                : (previewRecentVideo.video?.thumbnail ? `http://localhost:5000${previewRecentVideo.video.thumbnail}` : '')}
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              autoPlay
              playsInline
              onTimeUpdate={() => {
                if (previewVideoRef.current) {
                  setPreviewCurrentTime(previewVideoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (previewVideoRef.current) {
                  setPreviewDuration(previewVideoRef.current.duration);
                }
              }}
              style={{
                width: '100%',
                maxHeight: '320px',
                display: 'block',
                outline: 'none'
              }}
            />
          </div>

          {/* Meta Details & Draggable Progress Bar */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Status & Timing */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: previewRecentVideo.watchStatus === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                  color: previewRecentVideo.watchStatus === 'Completed' ? '#10b981' : '#8b5cf6'
                }}>
                  {previewRecentVideo.watchStatus || 'Watched'} • {previewRecentVideo.completionPercentage || 0}%
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {formatVideoTime(previewCurrentTime)} / {formatVideoTime(previewDuration)}
                </span>
              </div>

              {previewRecentVideo.startedAt && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  📅 {previewRecentVideo.startedAt}
                </span>
              )}
            </div>

            {/* Draggable Forward/Backward Timeline Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  if (previewVideoRef.current) {
                    previewVideoRef.current.currentTime = Math.max(0, previewVideoRef.current.currentTime - 10);
                  }
                }}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  padding: '5px 9px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
                title="Rewind 10 seconds"
              >
                ⏪ 10s
              </button>

              <input
                type="range"
                min={0}
                max={previewDuration || 100}
                step={0.1}
                value={previewCurrentTime}
                onChange={handlePreviewSeek}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  accentColor: '#8b5cf6',
                  height: '6px'
                }}
              />

              <button
                type="button"
                onClick={() => {
                  if (previewVideoRef.current) {
                    previewVideoRef.current.currentTime = Math.min(previewDuration || 1000, previewVideoRef.current.currentTime + 10);
                  }
                }}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  padding: '5px 9px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
                title="Forward 10 seconds"
              >
                10s ⏩
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default Navigation;
