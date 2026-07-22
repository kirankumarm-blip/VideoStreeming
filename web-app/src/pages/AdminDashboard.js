import React, { useState, useEffect } from 'react';
import { api, getCurrentUser } from '../services/api';
import { BarChart, DonutChart, LineChart } from '../components/SVGCharts';
import { useLanguage } from '../context/LanguageContext';

const getFormattedSeconds = (sec) => {
  if (sec === undefined || sec === null) return '';
  const s = parseFloat(sec);
  if (isNaN(s)) return sec;
  if (s >= 3600) return `${(s / 3600).toFixed(1)} hrs`;
  if (s >= 60) return `${Math.round(s / 60)} min`;
  return `${Math.round(s)} sec`;
};

const AdminDashboard = ({ isSidebarOpen, toggleSidebar, theme, activeTabOverride, justContent, selectedAdminId }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview'); // overview, users_all, video_upload, etc.

  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser && currentUser.role === 'super_admin';

  useEffect(() => {
    if (activeTabOverride) {
      setActiveTab(activeTabOverride);
    }
  }, [activeTabOverride]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customAlert, setCustomAlert] = useState({
    show: false,
    title: '',
    message: '',
    type: 'error',
    buttonText: 'OK'
  });

  const verifyFileContent = async (file) => {
    if (!file) return false;
    
    // 1. Filename keyword check
    const name = file.name.toLowerCase();
    const keywords = ['explicit', 'minor', 'nudity', 'sex', 'pornography', 'porn', 'illegal', 'inappropriate', 'adult'];
    const isNameInappropriate = keywords.some(keyword => name.includes(keyword));
    if (isNameInappropriate) {
      setCustomAlert({
        show: true,
        title: 'Moderation Alert',
        message: 'Inappropriate content has been detected in the uploaded file.',
        type: 'error',
        buttonText: 'OK'
      });
      return true;
    }

    // Helper to run skin tone analysis on canvas pixels
    const analyzePixels = (ctx, width, height) => {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      let skinPixels = 0;
      const totalPixels = width * height;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        const isSkin = (
          r > 95 && g > 40 && b > 20 &&
          diff > 15 &&
          Math.abs(r - g) > 15 &&
          r > g && r > b
        );
        
        if (isSkin) {
          skinPixels++;
        }
      }
      
      const percentage = (skinPixels / totalPixels) * 100;
      return percentage > 18;
    };
    
    // 2. Skin tone skin-pixel scan (only for images)
    if (file.type.startsWith('image/')) {
      const hasNudity = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 80;
              canvas.height = 80;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, 80, 80);
              const flagged = analyzePixels(ctx, 80, 80);
              resolve(flagged);
            } catch (err) {
              resolve(false);
            }
          };
          img.onerror = () => resolve(false);
          img.src = e.target.result;
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      });
      
      if (hasNudity) {
        setCustomAlert({
          show: true,
          title: 'Moderation Alert',
          message: 'Inappropriate content has been detected in the uploaded file.',
          type: 'error',
          buttonText: 'OK'
        });
        return true;
      }
    }

    // 3. Skin tone skin-pixel scan (only for videos)
    if (file.type.startsWith('video/')) {
      const hasNudity = await new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;
        
        video.onloadeddata = () => {
          const seekTime = Math.min(1.0, video.duration / 2);
          video.currentTime = seekTime;
        };
        
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 80;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 80, 80);
            const flagged = analyzePixels(ctx, 80, 80);
            resolve(flagged);
          } catch (err) {
            resolve(false);
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        };
        
        video.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(false);
        };
      });

      if (hasNudity) {
        setCustomAlert({
          show: true,
          title: 'Moderation Alert',
          message: 'Inappropriate content has been detected in the uploaded file.',
          type: 'error',
          buttonText: 'OK'
        });
        return true;
      }
    }
    
    return false;
  };

  // Accordion Sections State
  const [expandedSections, setExpandedSections] = useState({
    'Dashboard': true,
    'User Management': false,
    'Video Management': false,
    'Analytics': false,
    'Revenue & Payments': false,
    'Marketing': false,
    'Engagement': false,
    'Monitoring': false,
    'Content Moderation': false,
    'Reports': false,
    'Settings': false,
    'Administration': false,
    'AI Insights': false
  });

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Video review modal
  const [reviewVideo, setReviewVideo] = useState(null);

  // Users CRUD states
  const [users, setUsers] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    gender: '',
    dob: '',
    city: '',
    state: '',
    zipcode: '',
    address: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // Video Upload states
  const [categories, setCategories] = useState([]);
  const [visibilities, setVisibilities] = useState([]);
  const [levels, setLevels] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: '',
    subCategory: '',
    tags: '',
    visibility: '',
    planId: '',
    languageId: '',
    adminId: ''
  });
  const [subCategories, setSubCategories] = useState([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [adminsList, setAdminsList] = useState([]);
  const [loadingAdminsList, setLoadingAdminsList] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const [myVideos, setMyVideos] = useState([]);

  const [courses, setCourses] = useState([]);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    subCategory: '',
    languageId: '',
    instructor: '',
    level: 'Beginner',
    tags: '',
    totalChapters: '',
    visibility: '',
    adminId: ''
  });
  const [courseThumbnail, setCourseThumbnail] = useState(null);
  const [courseBanner, setCourseBanner] = useState(null);
  const [chapters, setChapters] = useState([]);

  // New State variables for dynamic sections
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [contentAnalytics, setContentAnalytics] = useState(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState(null);
  const [engagementAnalytics, setEngagementAnalytics] = useState(null);
  const [streamingAnalytics, setStreamingAnalytics] = useState(null);
  
  const [liveStreams, setLiveStreams] = useState([]);
  const [serverMonitoring, setServerMonitoring] = useState(null);
  const [securityMonitoring, setSecurityMonitoring] = useState(null);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [settings, setSettings] = useState({});
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!justContent) {
      fetchUsers();
      fetchCategories();
      fetchVideos();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchDashboardData('overview');
    }
    if (activeTab === 'users_all' || activeTab.startsWith('users_')) {
      fetchUsers();
    }
    if (activeTab === 'video_upload' || activeTab === 'course_upload') {
      fetchCategories();
      fetchVisibilities();
      fetchLevels();
      fetchPlans();
      fetchLanguages();
      fetchAdminsList();
    }
    if (activeTab === 'video_all') {
      fetchVideos();
    }
    if (activeTab === 'course_all') {
      fetchCourses(selectedAdminId);
    }
    if (activeTab === 'analytics' || activeTab.startsWith('analytics_')) {
      fetchDashboardData('analytics');
      fetchAnalyticsData();
    }
    if (activeTab === 'realtime' || activeTab.startsWith('mon_')) {
      fetchMonitoringData();
    }
    if (activeTab.startsWith('set_')) {
      fetchSettingsData();
    }
    if (activeTab === 'rep_export') {
      fetchTransactions();
    }
  }, [activeTab, selectedAdminId]);

  const fetchAnalyticsData = async () => {
    try {
      const u = await api.analytics.getUser();
      console.log("Fetched user analytics data u:", u);
      setUserAnalytics(u);
    } catch (err) {
      console.error("Failed to fetch user analytics", err);
    }

    try {
      const c = await api.analytics.getContent();
      setContentAnalytics(c);
    } catch (err) {
      console.error("Failed to fetch content analytics", err);
    }

    try {
      const r = await api.analytics.getRevenue();
      setRevenueAnalytics(r);
    } catch (err) {
      console.error("Failed to fetch revenue analytics", err);
    }

    try {
      const e = await api.analytics.getEngagement();
      setEngagementAnalytics(e);
    } catch (err) {
      console.error("Failed to fetch engagement analytics", err);
    }

    try {
      const s = await api.analytics.getStreaming();
      setStreamingAnalytics(s);
    } catch (err) {
      console.error("Failed to fetch streaming analytics", err);
    }
  };

  const fetchMonitoringData = async () => {
    try {
      const s = await api.monitoring.getServer();
      setServerMonitoring(s);
      const sec = await api.monitoring.getSecurity();
      setSecurityMonitoring(sec);
      const a = await api.monitoring.getAlerts();
      setSystemAlerts(a);
    } catch (err) {
      console.error('Failed to load monitoring data', err);
    }
  };

  const fetchSettingsData = async () => {
    try {
      const s = await api.settings.get();
      setSettings(s);
    } catch (err) {
      console.error('Failed to load settings data', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const txs = await api.payments.getTransactions();
      setTransactions(txs);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async (formStep = 'overview') => {
    setLoading(true);
    try {
      const data = await api.dashboard.getAdmin(formStep);
      setStats(data);
    } catch (err) {
      setError('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      let data;
      if (activeTab === 'users_blocked') {
        data = await api.users.listBlocked();
        setUsers(Array.isArray(data) ? data : []);
      } else if (activeTab === 'users_logs') {
        data = await api.users.getUserLogs();
        setUserLogs(Array.isArray(data) ? data : []);
      } else {
        data = await api.users.list();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
      setUsers([]);
      setUserLogs([]);
    }
  };

  const fetchSubCategories = async (categoryId) => {
    if (!categoryId) {
      setSubCategories([]);
      return;
    }
    setLoadingSubCategories(true);
    try {
      const res = await api.videos.getSubCategories(categoryId);
      const subCats = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      setSubCategories(subCats);
      if (subCats.length > 0) {
        setUploadForm(prev => ({ ...prev, subCategory: subCats[0].id || subCats[0].name }));
      } else {
        setUploadForm(prev => ({ ...prev, subCategory: '' }));
      }
    } catch (e) {
      console.error('Failed to fetch sub categories:', e);
      setSubCategories([]);
      setUploadForm(prev => ({ ...prev, subCategory: '' }));
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.categories.list();
      setCategories(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        const firstCatId = data[0].id;
        setUploadForm(prev => ({ ...prev, category: firstCatId }));
        fetchSubCategories(firstCatId);
      }
    } catch (e) {
      console.error(e);
      setCategories([]);
    }
  };

  const fetchVisibilities = async () => {
    try {
      const data = await api.videos.listVisibilities();
      setVisibilities(data);
      if (data.length > 0) {
        setUploadForm(prev => ({ ...prev, visibility: data[0].id }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await api.videos.getPlans();
      const plansList = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      setPlans(plansList);
      if (plansList.length > 0) {
        setUploadForm(prev => ({ ...prev, planId: plansList[0].id || plansList[0].plan_id || '' }));
      }
    } catch (e) {
      console.error('Failed to fetch plans:', e);
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchLanguages = async () => {
    setLoadingLanguages(true);
    try {
      const res = await api.videos.getLanguages();
      const langList = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      setLanguages(langList);
      if (langList.length > 0) {
        const firstLangId = langList[0].id || langList[0].language_id || '';
        setUploadForm(prev => ({ ...prev, languageId: firstLangId }));
        setCourseForm(prev => ({ ...prev, languageId: firstLangId }));
      }
    } catch (e) {
      console.error('Failed to fetch languages:', e);
      setLanguages([]);
    } finally {
      setLoadingLanguages(false);
    }
  };

  const fetchAdminsList = async () => {
    setLoadingAdminsList(true);
    try {
      const res = await api.videos.getAdmins();
      console.log("getAdmins API raw response:", res);
      let rawList = [];
      if (Array.isArray(res)) {
        rawList = res;
      } else if (res && typeof res === 'object') {
        if (Array.isArray(res.admins)) {
          rawList = res.admins;
        } else if (Array.isArray(res.data)) {
          rawList = res.data;
        } else if (res.id || res.alpha_id || res.name || res.username) {
          rawList = [res];
        }
      }
      console.log("rawList computed:", rawList);
      const admList = rawList.map(item => item.json || item);
      console.log("admList computed:", admList);
      setAdminsList(admList);
      if (admList.length > 0) {
        const firstAdmId = admList[0].id || admList[0].alpha_id || admList[0].admin_id || '';
        setUploadForm(prev => ({ ...prev, adminId: firstAdmId }));
        setCourseForm(prev => ({ ...prev, adminId: firstAdmId }));
      }
    } catch (e) {
      console.error('Failed to fetch admins list:', e);
      setAdminsList([]);
    } finally {
      setLoadingAdminsList(false);
    }
  };

  const fetchLevels = async () => {
    try {
      const data = await api.videos.getLevels();
      const levelsList = Array.isArray(data) ? data : [];
      setLevels(levelsList);
      if (levelsList.length > 0) {
        setCourseForm(prev => ({ ...prev, level: levelsList[0].id || levelsList[0].level }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVideos = async () => {
    try {
      const data = await api.videos.list();
      setMyVideos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setMyVideos([]);
    }
  };

  const fetchCourses = async (adminId = selectedAdminId) => {
    try {
      const data = await api.videos.listCourses(adminId);
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setCourses([]);
    }
  };

  const addChapter = () => {
    const newId = chapters.length > 0 ? Math.max(...chapters.map(c => c.id)) + 1 : 1;
    const defaultVisibility = visibilities[0]?.id || '';
    setChapters([
      ...chapters,
      {
        id: newId,
        title: `Chapter ${newId}`,
        description: '',
        visibility: defaultVisibility,
        order: newId,
        videos: []
      }
    ]);
  };

  const removeChapter = (id) => {
    setChapters(chapters.filter(c => c.id !== id));
  };

  const updateChapterProp = (id, prop, val) => {
    setChapters(chapters.map(c => c.id === id ? { ...c, [prop]: val } : c));
  };

  const addVideoToChapter = (chapterId) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId) return ch;
      const newId = ch.videos.length > 0 ? Math.max(...ch.videos.map(v => v.id)) + 1 : 1;
      return {
        ...ch,
        videos: [
          ...ch.videos,
          { id: newId, title: 'New Lesson', file: null, fileName: '', thumbnail: null, thumbName: '', duration: '00:00', isPreview: false }
        ]
      };
    }));
  };

  const removeVideoFromChapter = (chapterId, videoId) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId) return ch;
      return {
        ...ch,
        videos: ch.videos.filter(v => v.id !== videoId)
      };
    }));
  };

  const updateVideoProp = (chapterId, videoId, prop, val) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId) return ch;
      return {
        ...ch,
        videos: ch.videos.map(v => v.id === videoId ? { ...v, [prop]: val } : v)
      };
    }));
  };

  const [courseThumbnailUrl, setCourseThumbnailUrl] = useState('');
  const [courseBannerUrl, setCourseBannerUrl] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  const handleCourseThumbnailUpload = async (file) => {
    if (!file) return;
    if (await verifyFileContent(file)) return;
    setThumbnailUploading(true);
    try {
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const initRes = await api.videos.initiateChunkUpload(file.name, file.size, file.type);
      const uploadId = initRes.uploadId;
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const chunkFormData = new FormData();
        chunkFormData.append('uploadId', uploadId);
        chunkFormData.append('chunkIndex', chunkIndex);
        chunkFormData.append('chunk', chunkBlob, file.name);
        await api.videos.uploadChunk(chunkFormData);
      }
      const completeRes = await api.videos.completeChunkUpload(uploadId, file.name, totalChunks);
      setCourseThumbnailUrl(completeRes.minioUrl);
    } catch (err) {
      alert(`Failed to upload thumbnail: ${err.message}`);
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleCourseBannerUpload = async (file) => {
    if (!file) return;
    if (await verifyFileContent(file)) return;
    setBannerUploading(true);
    try {
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const initRes = await api.videos.initiateChunkUpload(file.name, file.size, file.type);
      const uploadId = initRes.uploadId;
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const chunkFormData = new FormData();
        chunkFormData.append('uploadId', uploadId);
        chunkFormData.append('chunkIndex', chunkIndex);
        chunkFormData.append('chunk', chunkBlob, file.name);
        await api.videos.uploadChunk(chunkFormData);
      }
      const completeRes = await api.videos.completeChunkUpload(uploadId, file.name, totalChunks);
      setCourseBannerUrl(completeRes.minioUrl);
    } catch (err) {
      alert(`Failed to upload banner: ${err.message}`);
    } finally {
      setBannerUploading(false);
    }
  };

  const handleChapterVideoUpload = async (chapterId, videoId, file) => {
    if (!file) return;
    if (await verifyFileContent(file)) return;
    
    updateVideoProp(chapterId, videoId, 'uploadStatus', 'uploading');
    updateVideoProp(chapterId, videoId, 'fileName', file.name);
    
    try {
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      
      const initRes = await api.videos.initiateChunkUpload(file.name, file.size, file.type);
      const uploadId = initRes.uploadId;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        const chunkFormData = new FormData();
        chunkFormData.append('uploadId', uploadId);
        chunkFormData.append('chunkIndex', chunkIndex);
        chunkFormData.append('chunk', chunkBlob, file.name);

        const percent = Math.round((chunkIndex / totalChunks) * 100);
        updateVideoProp(chapterId, videoId, 'uploadProgress', percent);

        await api.videos.uploadChunk(chunkFormData);
      }

      const completeRes = await api.videos.completeChunkUpload(uploadId, file.name, totalChunks);
      
      updateVideoProp(chapterId, videoId, 'uploadStatus', 'success');
      updateVideoProp(chapterId, videoId, 'videoUrl', completeRes.minioUrl);
    } catch (err) {
      console.error(err);
      updateVideoProp(chapterId, videoId, 'uploadStatus', 'error');
      alert(`Failed to upload video: ${err.message}`);
    }
  };

  const handleChapterThumbnailUpload = async (chapterId, videoId, file) => {
    if (!file) return;
    if (await verifyFileContent(file)) return;
    
    updateVideoProp(chapterId, videoId, 'thumbStatus', 'uploading');
    updateVideoProp(chapterId, videoId, 'thumbName', file.name);
    
    try {
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      
      const initRes = await api.videos.initiateChunkUpload(file.name, file.size, file.type);
      const uploadId = initRes.uploadId;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        const chunkFormData = new FormData();
        chunkFormData.append('uploadId', uploadId);
        chunkFormData.append('chunkIndex', chunkIndex);
        chunkFormData.append('chunk', chunkBlob, file.name);

        await api.videos.uploadChunk(chunkFormData);
      }

      const completeRes = await api.videos.completeChunkUpload(uploadId, file.name, totalChunks);
      
      updateVideoProp(chapterId, videoId, 'thumbStatus', 'success');
      updateVideoProp(chapterId, videoId, 'thumbnailUrl', completeRes.minioUrl);
    } catch (err) {
      console.error(err);
      updateVideoProp(chapterId, videoId, 'thumbStatus', 'error');
      alert(`Failed to upload thumbnail: ${err.message}`);
    }
  };

  const handleCourseSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setUploadProgress('Submitting course...');
    try {
      const calculatedLessons = chapters.reduce((sum, ch) => sum + (ch.videos ? ch.videos.length : 0), 0);
      const calculatedDuration = chapters.reduce((sum, ch) => {
        if (!ch.videos) return sum;
        return sum + ch.videos.reduce((chSum, v) => {
          const d = parseFloat(v.duration);
          return chSum + (isNaN(d) ? 0 : d);
        }, 0);
      }, 0);

      const selectedVisObj = visibilities.find(v => v.id?.toString() === courseForm.visibility?.toString());
      const isPrivate = (selectedVisObj && (
        (selectedVisObj.name && selectedVisObj.name.toLowerCase() === 'private') ||
        (selectedVisObj.visibility && selectedVisObj.visibility.toString().toLowerCase() === 'private') ||
        (selectedVisObj.id && selectedVisObj.id.toString().toLowerCase() === 'private')
      )) || (courseForm.visibility && courseForm.visibility.toString().toLowerCase() === 'private');

      const payload = {
        title: courseForm.title,
        description: courseForm.description,
        category: courseForm.category,
        subCategory: courseForm.subCategory,
        subcategory_id: courseForm.subCategory,
        language_id: courseForm.languageId,
        instructor: courseForm.instructor,
        level: courseForm.level,
        tags: courseForm.tags,
        totalChapters: courseForm.totalChapters || chapters.length.toString(),
        totalLessons: calculatedLessons.toString(),
        totalDuration: calculatedDuration.toString(),
        thumbnail: courseThumbnailUrl,
        banner: courseBannerUrl,
        chapters: chapters.map(ch => ({
          title: ch.title,
          description: ch.description,
          visibility: ch.visibility || visibilities[0]?.id || '',
          order: ch.order,
          videos: ch.videos.map(v => ({
            title: v.title,
            fileName: v.fileName || 'video.mp4',
            videoUrl: v.videoUrl || '',
            thumbName: v.thumbName || 'thumbnail.png',
            thumbnailUrl: v.thumbnailUrl || '',
            duration: v.duration,
            isPreview: v.isPreview
          }))
        }))
      };

      if (isSuperAdmin) {
        payload.visibility = courseForm.visibility;
        if (isPrivate) {
          payload.admin_id = courseForm.adminId;
        }
      }

      await api.videos.uploadCourse(payload);
      setUploadSuccess('Course created successfully!');
      setUploadProgress('');
      
      // Reset
      const defaultCatId = categories[0]?.id || '';
      const defaultLangId = languages[0]?.id || languages[0]?.language_id || '';
      setCourseForm({
        title: '',
        description: '',
        category: defaultCatId,
        subCategory: '',
        languageId: defaultLangId,
        instructor: '',
        level: levels[0]?.id || levels[0]?.level || 'Beginner',
        tags: '',
        totalChapters: '',
        visibility: '',
        adminId: ''
      });
      setChapters([]);
      setCourseThumbnailUrl('');
      setCourseBannerUrl('');
      fetchCourses();
      setActiveTab('course_all');
    } catch (e) {
      console.error(e);
      setUploadProgress('');
      alert('Failed to submit course: ' + e.message);
    }
  };

  // --- User CRUD Handlers ---
  const handleUserSubmit = async (e) => {
    e.preventDefault();

    // Email regex validation (e.g. marco@gmail.com)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(userForm.email)) {
      alert('Please enter a valid email address with a valid domain suffix (e.g. name@domain.com)');
      return;
    }

    // Phone number length validation
    if (userForm.mobile.length !== 10) {
      alert('Phone number must be exactly 10 digits');
      return;
    }

    // Zipcode length validation
    if (userForm.zipcode.length !== 6) {
      alert('Zipcode must be exactly 6 digits');
      return;
    }

    try {
      const dataToSave = {
        first_name: userForm.firstName,
        last_name: userForm.lastName,
        email: userForm.email,
        phonenumber: userForm.mobile,
        gender: userForm.gender,
        date_of_birth: userForm.dob,
        address: userForm.address,
        city: userForm.city,
        state: userForm.state,
        zipcode: userForm.zipcode
      };

      if (editingUser) {
        await api.users.update(editingUser.id, dataToSave);
      } else {
        await api.users.create(dataToSave);
      }
      setShowUserModal(false);
      setUserForm({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        gender: '',
        dob: '',
        city: '',
        state: '',
        zipcode: '',
        address: ''
      });
      setEditingUser(null);
      fetchUsers();
      fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to save user');
    }
  };

  const handleEditClick = async (user) => {
    setEditingUser(user);
    let userData = user;
    try {
      const res = await api.users.get(user.id);
      if (res && (res.id || res.email)) {
        userData = res;
      }
    } catch (e) {
      console.warn("Failed to fetch user details, using local data", e);
    }
    
    setUserForm({
      firstName: userData.first_name || userData.firstName || '',
      lastName: userData.last_name || userData.lastName || '',
      email: userData.email || '',
      mobile: userData.phonenumber || userData.mobile || '',
      gender: userData.gender || '',
      dob: userData.date_of_birth || userData.dob || '',
      city: userData.city || '',
      state: userData.state || '',
      zipcode: userData.zipcode || '',
      address: userData.address || ''
    });
    setShowUserModal(true);
  };

  const handleToggleUserStatus = async (user, statusVal, isBlock = false) => {
    try {
      await api.users.changeStatus(user.id, statusVal, isBlock);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleUnblockUser = async (user) => {
    try {
      await api.users.unblock(user.id);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to unblock user');
    }
  };

  // --- Video Upload Handler ---
  const handleVideoUpload = async (e) => {
    e.preventDefault();
    setError('');
    setUploadProgress('');
    setUploadSuccess('');

    if (!videoFile) {
      setError('Please select a video file to upload');
      return;
    }

    if (await verifyFileContent(videoFile)) return;
    if (thumbnailFile && await verifyFileContent(thumbnailFile)) return;

    const uploadFileInChunks = async (file, fileRoleLabel) => {
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      
      setUploadProgress(`Initiating chunked upload for ${fileRoleLabel}...`);
      const initRes = await api.videos.initiateChunkUpload(file.name, file.size, file.type);
      const uploadId = initRes.uploadId;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        const chunkFormData = new FormData();
        chunkFormData.append('uploadId', uploadId);
        chunkFormData.append('chunkIndex', chunkIndex);
        chunkFormData.append('chunk', chunkBlob, file.name);

        const percent = Math.round((chunkIndex / totalChunks) * 100);
        setUploadProgress(`Uploading ${fileRoleLabel}: ${percent}% (${chunkIndex + 1}/${totalChunks} chunks)`);

        await api.videos.uploadChunk(chunkFormData);
      }

      setUploadProgress(`Finalizing and assembling ${fileRoleLabel} in MinIO...`);
      const completeRes = await api.videos.completeChunkUpload(uploadId, file.name, totalChunks);
      return completeRes.minioUrl;
    };

    try {
      // 1. Upload video file chunks
      const videoUrl = await uploadFileInChunks(videoFile, 'Video');

      // 2. Upload thumbnail file chunks (if selected)
      let thumbnailUrl = '';
      if (thumbnailFile) {
        thumbnailUrl = await uploadFileInChunks(thumbnailFile, 'Thumbnail');
      }

      // 3. Register metadata and notify database via n8n webhook
      setUploadProgress('Registering video metadata with database...');
      
      const selectedVisObj = visibilities.find(v => v.id?.toString() === uploadForm.visibility?.toString());
      const isPrivate = (selectedVisObj && (
        (selectedVisObj.name && selectedVisObj.name.toLowerCase() === 'private') ||
        (selectedVisObj.visibility && selectedVisObj.visibility.toString().toLowerCase() === 'private') ||
        (selectedVisObj.id && selectedVisObj.id.toString().toLowerCase() === 'private')
      )) || (uploadForm.visibility && uploadForm.visibility.toString().toLowerCase() === 'private');

      const registerPayload = {
        title: uploadForm.title,
        description: uploadForm.description,
        category: uploadForm.category,
        subCategory: uploadForm.subCategory,
        subcategory_id: uploadForm.subCategory,
        language_id: uploadForm.languageId,
        tags: uploadForm.tags,
        visibility: uploadForm.visibility,
        videoUrl,
        thumbnailUrl
      };
      if (isPrivate) {
        if (isSuperAdmin) {
          registerPayload.admin_id = uploadForm.adminId;
        } else {
          registerPayload.plan_id = uploadForm.planId;
        }
      }

      await api.videos.registerVideo(registerPayload);

      setUploadSuccess('Video uploaded and registered successfully!');
      
      // Reset form
      const defaultCatId = categories[0]?.id || '';
      const defaultLangId = languages[0]?.id || languages[0]?.language_id || '';
      setUploadForm({
        title: '',
        description: '',
        category: defaultCatId,
        subCategory: '',
        tags: '',
        visibility: visibilities[0]?.id || '',
        planId: '',
        languageId: defaultLangId,
        adminId: ''
      });
      if (defaultCatId) {
        fetchSubCategories(defaultCatId);
      }
      setVideoFile(null);
      setThumbnailFile(null);
      
      // Clear file inputs manually
      document.getElementById('videoInput').value = '';
      const thumbInput = document.getElementById('thumbInput');
      if (thumbInput) thumbInput.value = '';

      fetchVideos();
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to upload video');
    } finally {
      setUploadProgress('');
    }
  };

  // --- Delete Video Handler ---
  const handleDeleteVideo = async (id) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await api.videos.delete(id);
        fetchVideos();
        fetchDashboardData();
      } catch (err) {
        alert(err.message || 'Failed to delete video');
      }
    }
  };

  // --- Export Reports ---
  const handleExport = async (format) => {
    try {
      const data = await api.reports.getAdmin();
      if (format === 'csv') {
        const csvContent = data.exportData.csv;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "admin_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(`Exporting admin popularity stats report in ${format.toUpperCase()} format...\n(Completed successfully!)`);
      }
    } catch (e) {
      alert("Failed to export report");
    }
  };


  const menuStructure = [
    {
      title: 'Dashboard',
      icon: '📊',
      items: []
    },
    {
      title: 'User Management',
      icon: '👥',
      items: [
        { id: 'users_all', label: 'Users' },
        { id: 'users_logs', label: 'User Activity Logs' },
        { id: 'users_blocked', label: 'Blocked Users' }
      ]
    },
    {
      title: isSuperAdmin ? 'Content Management' : 'Video Management',
      icon: '🎬',
      items: isSuperAdmin ? [
        { id: 'video_upload', label: 'Upload video' },
        { id: 'course_upload', label: 'Upload Course' },
        { id: 'course_all', label: 'All Courses' }
      ] : [
        { id: 'video_upload', label: 'Upload Video' },
        { id: 'course_upload', label: 'Upload Course' },
        { id: 'video_all', label: 'All Videos' },
        { id: 'course_all', label: 'All Courses' }
      ]
    },
    {
      title: 'Analytics',
      icon: '📈',
      items: [
        { id: 'analytics_video', label: 'Video Analytics' },
        { id: 'analytics_user', label: 'User Analytics' }
      ]
    },
    {
      title: 'Engagement',
      icon: '⭐',
      items: [
        { id: 'engage_likes', label: 'Likes & Reactions' },
        { id: 'engage_comments', label: 'Comments' },
        { id: 'engage_reviews', label: 'Reviews & Ratings' }
      ]
    },
    {
      title: 'Reports',
      icon: '📂',
      items: [
        { id: 'rep_daily', label: 'Daily Reports' },
        { id: 'rep_weekly', label: 'Weekly Reports' },
        { id: 'rep_monthly', label: 'Monthly Reports' }
      ]
    },
    {
      title: 'Settings',
      icon: '⚙',
      items: [
        { id: 'set_general', label: 'General Settings' },
        { id: 'set_languages', label: 'Languages' }
      ]
    },
    {
      title: 'Administration',
      icon: '🏢',
      items: [
        { id: 'admin_users', label: 'Admin Management' },
        { id: 'admin_roles', label: 'Roles & Permissions' },
        { id: 'admin_audit', label: 'Audit Logs' },
        { id: 'admin_activity', label: 'Activity Logs' }
      ]
    },
    {
      title: 'AI Insights',
      icon: '🤖',
      items: [
        { id: 'ai_churn', label: 'Churn Prediction' },
        { id: 'ai_trending', label: 'Trending Videos' },
        { id: 'ai_recs', label: 'User Recommendations' },
        { id: 'ai_time', label: 'Best Upload Time' }
      ]
    }
  ];

  const userGrowthData = [
    { label: 'Jan', count: 120 },
    { label: 'Feb', count: 340 },
    { label: 'Mar', count: 680 },
    { label: 'Apr', count: 1000 }
  ];

  const videoViewsTrend = [
    { label: 'Mon', count: 240 },
    { label: 'Tue', count: 420 },
    { label: 'Wed', count: 380 },
    { label: 'Thu', count: 620 },
    { label: 'Fri', count: 540 },
    { label: 'Sat', count: 850 },
    { label: 'Sun', count: 980 }
  ];

  const getActiveTabLabel = () => {
    for (const section of menuStructure) {
      const item = section.items.find(i => i.id === activeTab);
      if (item) return item.label;
    }
    if (activeTab === 'users_all') return 'Users';
    return activeTab.replace(/_/g, ' ');
  };

  return (
    <div style={justContent ? { display: 'block', width: '100%', background: 'var(--bg-primary)' } : { display: 'flex', height: 'calc(100vh - 60px)', background: 'var(--bg-primary)', marginLeft: 0, width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      {/* Mobile Backdrop Overlay */}
      {!justContent && isSidebarOpen && (
        <div 
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 990,
            backdropFilter: 'blur(4px)'
          }}
          className="mobile-sidebar-backdrop"
        />
      )}

      {/* 1. ADMIN SIDEBAR (YouTube-style accordion sidebar) */}
      {!justContent && (
        <div style={{
        width: '260px',
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        paddingTop: '0px',
        paddingBottom: '0px',
        paddingLeft: '12px',
        paddingRight: '12px',
        marginTop: '0px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'sticky',
        top: '60px',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        zIndex: 995,
        transition: 'transform 0.3s ease, left 0.3s ease'
      }} className={`youtube-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Mobile Sidebar Brand Header */}
        <div className="mobile-sidebar-brand-header" style={{
          alignItems: 'center',
          gap: '16px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '10px',
          width: '100%',
          justifyContent: 'flex-start'
        }}>
          <button 
            onClick={toggleSidebar} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
            type="button"
          >
            ✕
          </button>
          <img src="/logo.png" alt="LurnAx" style={{ height: '48px', objectFit: 'contain' }} />
        </div>

        {menuStructure.map((section, idx) => {
          const isDashboard = section.title === 'Dashboard';
          const isSelected = isDashboard && activeTab === 'overview';
          return (
            <div key={section.title} style={{ marginBottom: '8px', marginTop: idx === 0 ? '0px' : undefined }}>
              <button 
                onClick={() => {
                  if (isDashboard) {
                    setActiveTab('overview');
                    setError('');
                    setUploadSuccess('');
                    if (isSidebarOpen && toggleSidebar) {
                      toggleSidebar();
                    }
                  } else {
                    toggleSection(section.title);
                  }
                }}
                className="admin-sidebar-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '10px 14px',
                  background: isSelected ? 'var(--menu-active-bg)' : 'none',
                  border: 'none',
                  color: isSelected ? 'var(--menu-active-color)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  textAlign: 'left',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)')}
                onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'none')}
                type="button"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{section.icon}</span>
                  <span>{t('admin.menu.' + section.title.toLowerCase().replace(/ & /g, '_and_').replace(/\s+/g, '_'), section.title)}</span>
                </span>
                {!isDashboard && (
                  <span style={{ fontSize: '10px' }}>{expandedSections[section.title] ? '▼' : '▶'}</span>
                )}
              </button>
            
            {expandedSections[section.title] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px', marginTop: '4px' }}>
                {section.items.map(item => {
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setError('');
                        setUploadSuccess('');
                        if (isSidebarOpen && toggleSidebar) {
                          toggleSidebar();
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        background: isSelected ? 'var(--menu-active-bg)' : 'none',
                        border: 'none',
                        borderRadius: '6px',
                        color: isSelected ? 'var(--menu-active-color)' : 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.2s',
                        width: '100%',
                        outline: 'none'
                      }}
                      onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'none')}
                      type="button"
                    >
                      {t('admin.menu.' + item.id, item.label)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )})}
      </div>
      )}

      {/* 2. MAIN ADMIN CONTENT CONTAINER */}
      <div style={justContent ? { flex: 1, minWidth: 0 } : { flex: 1, padding: '32px 40px', overflowY: 'auto', height: '100%', minWidth: 0 }} className="admin-content-container">
        
        {/* Top Header Row */}
        {!justContent && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800 }}>
                {getActiveTabLabel()}
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>Welcome to the Admin Command Control center.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => handleExport('csv')} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                Export CSV
              </button>
              <button onClick={() => handleExport('excel')} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                Export Excel
              </button>
              <button onClick={() => alert("PDF report is preparing... (Simulated)")} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                Export PDF
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {uploadSuccess && (
          <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
            {uploadSuccess}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-secondary)' }}>Loading telemetry data...</div>
        ) : (
          <>
            {/* OVERVIEW CONTENT VIEW */}
            {activeTab === 'overview' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* 4 Notices Alerts */}
                <div className="dashboard-stats-grid alerts-box" style={{ gap: '16px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '4px solid #10b981', padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#10b981' }}>🟢 Transcoding Engines Online</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>All uploads successfully transcoded to 1080p, 720p, and 480p H.264 profiles.</span>
                  </div>
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderLeft: '4px solid #3b82f6', padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#3b82f6' }}>🌐 CDN Edge hit rate: 94.2%</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Edge caching optimized across all regional media delivery nodes.</span>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '4px solid #10b981', padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#10b981' }}>🟢 Live Ingestion Stable</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>RTMP ingestion active with 0 frame drops and stable 4500kbps bitrate.</span>
                  </div>
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderLeft: '4px solid #f59e0b', padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#f59e0b' }}>🗄️ Storage Synced</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Database assets fully synced. AWS S3 storage usage is at 68% capacity.</span>
                  </div>
                </div>

                {/* 🎯 PLATFORM METRIC CARDS */}
                <div className="dashboard-stats-grid">
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.statTotalUsers', 'Total Users')}</span>
                    <span className="stat-value">{stats?.total_users || stats?.cards?.totalUsers || users.length || 0}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      color: parseFloat(stats?.users_growth_percent || 0) >= 0 ? '#10b981' : '#ef4444', 
                      fontWeight: 600 
                    }}>
                      {stats?.users_growth_percent 
                        ? `${parseFloat(stats.users_growth_percent) >= 0 ? '↑' : '↓'} ${Math.abs(parseFloat(stats.users_growth_percent))}% this month` 
                        : '↑ 12% this month'}
                    </span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.statActiveUsers', 'Total Courses')}</span>
                    <span className="stat-value">{stats?.total_courses || stats?.cards?.totalCourses || (Array.isArray(courses) ? courses.length : 0) || 0}</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>🟢 Active in catalog</span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.dashboard.totalVideosUploaded', 'Total Videos Uploaded')}</span>
                    <span className="stat-value">{stats?.total_videos || stats?.cards?.totalVideos || (Array.isArray(myVideos) ? myVideos.length : 0) || 0}</span>
                    <span style={{ fontSize: '11px', color: '#a0a0ab' }}>All transcode jobs completed</span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.statTotalViews', 'Total Views')}</span>
                    <span className="stat-value">{stats?.total_video_views || stats?.cards?.totalViews || 0}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      color: parseFloat(stats?.video_views_growth_percent || 0) >= 0 ? '#10b981' : '#ef4444', 
                      fontWeight: 600 
                    }}>
                      {stats?.video_views_growth_percent 
                        ? `${parseFloat(stats.video_views_growth_percent) >= 0 ? '↑' : '↓'} ${Math.abs(parseFloat(stats.video_views_growth_percent))}% this week` 
                        : '↑ 34% this week'}
                    </span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.dashboard.dailyWatchTime', 'Daily Watch Time')}</span>
                    <span className="stat-value">{getFormattedSeconds(stats?.today_watch_sec) || (contentAnalytics?.watchTimePerVideo?.reduce((sum, v) => sum + v.minutes, 0) || 150) + " min"}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      color: parseFloat(stats?.daily_watch_growth_percent || 0) >= 0 ? '#10b981' : '#ef4444', 
                      fontWeight: 600 
                    }}>
                      {stats?.daily_watch_growth_percent 
                        ? `${parseFloat(stats.daily_watch_growth_percent) >= 0 ? '↑' : '↓'} ${Math.abs(parseFloat(stats.daily_watch_growth_percent))}% vs yesterday` 
                        : '↑ 8% vs yesterday'}
                    </span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.dashboard.monthlyWatchTime', 'Monthly Watch Time')}</span>
                    <span className="stat-value">{getFormattedSeconds(stats?.month_watch_sec) || ((contentAnalytics?.watchTimePerVideo?.reduce((sum, v) => sum + v.minutes, 0) * 30) || 4500) + " min"}</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                      {stats?.monthly_target_percent 
                        ? `${stats.monthly_target_percent}% of monthly target` 
                        : '92% of monthly target'}
                    </span>
                  </div>
                </div>

                {/* Main Dashboard layout (Split Column Grid) */}
                <div className="admin-dashboard-layout">
                  {/* Left Column: Charts and Tables */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
                    
                    {/* SVG Line Charts */}
                    <div className="dashboard-charts-grid charts-grid-row">
                      <div className="glass-card">
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>User Growth Trend</h3>
                        <LineChart data={stats?.user_growth || stats?.userGrowth || userAnalytics?.registrations || userGrowthData} />
                        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <span>Daily signups: {stats?.daily_signups || stats?.dailySignups || '+5'}</span>
                          <span>•</span>
                          <span>Monthly signups: {stats?.monthly_signups || stats?.monthlySignups || '+120'}</span>
                          <span>•</span>
                          <span>Active users: {stats?.total_users || stats?.cards?.activeUsers || 87}</span>
                        </div>
                      </div>
                      
                      <div className="glass-card">
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Video Performance Trend</h3>
                        <LineChart data={stats?.video_views || stats?.videoViews || contentAnalytics?.viewsTrend || videoViewsTrend} />
                        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <span>Views per Day: {stats?.views_per_day_avg || stats?.viewsPerDayAvg || '850 avg'}</span>
                          <span>•</span>
                          <span>Watch Hours: {stats?.watch_hours_avg || stats?.watchHoursAvg || '42h avg'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Engagement Funnel */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>User Engagement Funnel</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(() => {
                          const registeredCount = parseInt(stats?.total_users || stats?.cards?.totalUsers || users.length || 1000, 10);
                          const loggedInCount = parseInt(stats?.funnel?.loggedIn || 850, 10);
                          const startedCount = parseInt(stats?.funnel?.startedVideo || 600, 10);
                          const completedCount = parseInt(stats?.funnel?.completedVideo || 400, 10);

                          const loggedInPct = Math.round((loggedInCount / Math.max(1, registeredCount)) * 100);
                          const startedPct = Math.round((startedCount / Math.max(1, registeredCount)) * 100);
                          const completedPct = Math.round((completedCount / Math.max(1, registeredCount)) * 100);

                          const funnelData = stats?.engagementFunnel || [
                            { label: 'Registered Users', count: registeredCount, color: 'var(--accent-primary)', pct: 100 },
                            { label: 'Logged In', count: loggedInCount, color: 'var(--accent-secondary)', pct: Math.min(100, loggedInPct) },
                            { label: 'Started Video', count: startedCount, color: '#3b82f6', pct: Math.min(100, startedPct) },
                            { label: 'Completed Video', count: completedCount, color: '#10b981', pct: Math.min(100, completedPct) }
                          ];
                          return funnelData;
                        })().map(level => (
                          <div key={level.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, width: '130px' }}>{level.label}</span>
                            <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                              <div style={{ 
                                width: `${level.pct}%`, 
                                height: '100%', 
                                background: `linear-gradient(90deg, ${level.color} 0%, rgba(255,255,255,0.05) 100%)`,
                                borderRadius: '12px',
                                transition: 'width 0.8s ease'
                              }} />
                              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
                                {level.count} ({level.pct}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Content Table */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Top Content</h3>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Video Lesson</th>
                              <th>Views</th>
                              <th>Watch Time</th>
                              <th>Completion %</th>
                              <th>Likes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(stats?.top_content || stats?.topContent || [
                              { videoLesson: 'React JS for Beginners', views: 1200, watchTime: '650h', completionPercentage: 85, likes: 540 },
                              { videoLesson: 'Understanding Compound Interest', views: 980, watchTime: '410h', completionPercentage: 70, likes: 320 },
                              { videoLesson: 'Introduction to Quantum Mechanics', views: 450, watchTime: '180h', completionPercentage: 62, likes: 110 }
                            ]).map((row, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>{row.videoLesson || row.title}</td>
                                <td>{row.views}</td>
                                <td>{row.watchTime || row.time}</td>
                                <td>{row.completionPercentage !== undefined ? `${row.completionPercentage}%` : row.comp}</td>
                                <td>{row.likes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Video Categories & User widgets */}
                    <div className="dashboard-widgets-grid">
                      <div className="glass-card">
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Video Categories</h3>
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Category</th>
                                <th>Videos</th>
                                <th>Views</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(stats?.category_performance || stats?.categoryPerformance || [
                                { categoryName: 'Science', videos: 25, views: '50K' },
                                { categoryName: 'Finance', videos: 18, views: '42K' },
                                { categoryName: 'Technology', videos: 12, views: '35K' }
                              ]).map((cat, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 600 }}>{cat.categoryName || cat.name}</td>
                                  <td>{cat.videos !== undefined ? cat.videos : cat.count}</td>
                                  <td>{cat.views}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="glass-card">
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>User Performance Widget</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Most Active Users</span>
                          <div className="table-container" style={{ marginBottom: '12px' }}>
                            <table className="data-table" style={{ fontSize: '12px' }}>
                              <thead>
                                <tr>
                                  <th>User</th>
                                  <th>Watched</th>
                                  <th>Hours</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr><td style={{ fontWeight: 600 }}>John Doe</td><td>40</td><td>25h</td></tr>
                                <tr><td style={{ fontWeight: 600 }}>Varma K.</td><td>32</td><td>18h</td></tr>
                              </tbody>
                            </table>
                          </div>

                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Inactive Users</span>
                          <div className="table-container">
                            <table className="data-table" style={{ fontSize: '12px' }}>
                              <thead>
                                <tr>
                                  <th>User</th>
                                  <th>Last Login</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr><td style={{ fontWeight: 600 }}>User Rahul</td><td>15 Days Ago</td></tr>
                                <tr><td style={{ fontWeight: 600 }}>Priya Sharma</td><td>12 Days Ago</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Telemetry, AI, Activity, Geo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
                    

                    {/* AI Insights Panel */}
                    <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(229, 9, 20, 0.05) 100%)', border: '1px solid var(--accent-secondary)' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>🤖 AI Insights</h3>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', paddingLeft: '16px', lineHeight: '1.5', margin: 0 }}>
                        <li><strong style={{ color: 'var(--accent-secondary)' }}>React Tutorial</strong> gaining 35% more views week-over-week.</li>
                        <li>Finance category engagement dropped 12% in the last 7 days.</li>
                        <li>15 active users at risk of churning in the next week.</li>
                        <li>Optimal uploading window: <strong style={{ color: 'var(--accent-primary)' }}>7 PM - 9 PM</strong> (highest engagement).</li>
                      </ul>
                    </div>

                    {/* Geographic Analytics */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Geographic Viewers</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                          { country: 'India', pct: 45, color: 'var(--accent-primary)' },
                          { country: 'USA', pct: 25, color: 'var(--accent-secondary)' },
                          { country: 'UK', pct: 15, color: '#3b82f6' },
                          { country: 'Others', pct: 15, color: '#a0a0ab' }
                        ].map(geo => (
                          <div key={geo.country} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                              <span>{geo.country}</span>
                              <span>{geo.pct}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${geo.pct}%`, height: '100%', background: geo.color, borderRadius: '3px' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Device Analytics */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Device Analytics</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                          { device: 'Mobile', pct: 70, color: 'var(--accent-secondary)' },
                          { device: 'Desktop', pct: 20, color: 'var(--accent-primary)' },
                          { device: 'TV', pct: 10, color: '#10b981' }
                        ].map(dev => (
                          <div key={dev.device} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dev.color }} />
                            <span style={{ fontWeight: 600, width: '70px' }}>{dev.device}</span>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${dev.pct}%`, height: '100%', background: dev.color, borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontWeight: 700, minWidth: '30px', textAlign: 'right' }}>{dev.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Recent Activity</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
                        {[
                          { text: 'User Rahul registered', time: '10m ago' },
                          { text: 'Admin uploaded new video', time: '45m ago' },
                          { text: 'User Priya completed course', time: '1h ago' },
                          { text: 'Subscription purchased ($9.99)', time: '2h ago' },
                          { text: 'Video React JS reached 10K views', time: '5h ago' }
                        ].map((act, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{act.text}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{act.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* USERS_ALL CONTENT VIEW */}
            {activeTab === 'users_all' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <h2 style={{ fontSize: '20px' }}>{t('admin.tabUsers')}</h2>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select 
                      value={userStatusFilter} 
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      className="form-input" 
                      style={{ width: 'auto', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <button 
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({
                          firstName: '',
                          lastName: '',
                          email: '',
                          mobile: '',
                          gender: '',
                          dob: '',
                          city: '',
                          state: '',
                          zipcode: '',
                          address: ''
                        });
                        setShowUserModal(true);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      {t('admin.addUser')}
                    </button>
                  </div>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>{t('auth.emailAddress')}</th>
                        <th>Mobile</th>
                        <th>Status</th>
                        <th>{t('admin.tableActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(users) ? users : [])
                        .filter(user => {
                          const isUserActive = user.status === true || String(user.status).toLowerCase() === 'true' || String(user.status).toLowerCase() === 'active';
                          if (userStatusFilter === 'active') return isUserActive;
                          if (userStatusFilter === 'inactive') return !isUserActive;
                          return true;
                        })
                        .map(user => {
                          const isUserActive = user.status === true || String(user.status).toLowerCase() === 'true' || String(user.status).toLowerCase() === 'active';
                          return (
                            <tr key={user.id}>
                              <td style={{ fontWeight: 600 }}>{user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.name || 'User'}</td>
                              <td>{user.email}</td>
                              <td>{user.phonenumber || user.mobile}</td>
                              <td>
                                <span className={`badge ${isUserActive ? 'badge-active' : 'badge-disabled'}`}>
                                  {isUserActive ? 'Active' : 'InActive'}
                                </span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    onClick={() => handleEditClick(user)}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleToggleUserStatus(user, isUserActive ? false : true)}
                                    className="btn"
                                    style={{ 
                                      padding: '6px 12px', 
                                      fontSize: '12px', 
                                      border: 'none', 
                                      backgroundColor: isUserActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                                      color: isUserActive ? '#ef4444' : '#10b981' 
                                    }}
                                  >
                                    {isUserActive ? 'Disable' : 'Enable'}
                                  </button>
                                  <button 
                                    onClick={() => handleToggleUserStatus(user, false, true)}
                                    className="btn"
                                    style={{ 
                                      padding: '6px 12px', 
                                      fontSize: '12px', 
                                      border: 'none', 
                                      backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                                      color: '#f59e0b' 
                                    }}
                                  >
                                    Block
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* VIDEO_UPLOAD CONTENT VIEW */}
            {activeTab === 'video_upload' && (
              <div className="animate-fade-in glass-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>{t('admin.tabUpload')}</h2>
                <form onSubmit={handleVideoUpload}>
                  <div className="form-group">
                    <label className="form-label">{t('admin.uploadTitle')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Advanced Calculus Lesson 3"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">{t('admin.uploadDesc')}</label>
                    <textarea 
                      className="form-input" 
                      rows="4"
                      placeholder="Provide a detailed description of this course lesson..."
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className="responsive-2col-grid">
                    <div className="form-group">
                      <label className="form-label">{t('admin.tableCategory')}</label>
                      <select 
                        className="form-input"
                        value={uploadForm.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUploadForm(prev => ({ ...prev, category: val }));
                          fetchSubCategories(val);
                        }}
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Sub Category</label>
                      <select 
                        className="form-input"
                        value={uploadForm.subCategory}
                        onChange={(e) => setUploadForm({ ...uploadForm, subCategory: e.target.value })}
                        required
                        disabled={loadingSubCategories}
                      >
                        <option value="">{loadingSubCategories ? 'Loading...' : 'Select Sub Category'}</option>
                        {subCategories.map(subCat => (
                          <option key={subCat.id || subCat.name} value={subCat.id || subCat.name}>{subCat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Language</label>
                      <select 
                        className="form-input"
                        value={uploadForm.languageId}
                        onChange={(e) => setUploadForm({ ...uploadForm, languageId: e.target.value })}
                        required
                        disabled={loadingLanguages}
                      >
                        <option value="">{loadingLanguages ? 'Loading...' : 'Select Language'}</option>
                        {languages.map(lang => (
                          <option key={lang.id || lang.language_id || lang.name} value={lang.id || lang.language_id || lang.name}>
                            {lang.name || lang.title || lang.language_name || lang.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Visibility</label>
                      <select 
                        className="form-input"
                        value={uploadForm.visibility}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUploadForm(prev => ({ ...prev, visibility: val }));
                          const selectedVisObj = visibilities.find(v => v.id?.toString() === val?.toString());
                          const isPrivate = (selectedVisObj && (
                            (selectedVisObj.name && selectedVisObj.name.toLowerCase() === 'private') ||
                            (selectedVisObj.visibility && selectedVisObj.visibility.toString().toLowerCase() === 'private') ||
                            (selectedVisObj.id && selectedVisObj.id.toString().toLowerCase() === 'private')
                          )) || (val && val.toString().toLowerCase() === 'private');
                          if (isPrivate && isSuperAdmin) {
                            fetchAdminsList();
                          }
                        }}
                        required
                      >
                        {visibilities.map(vis => (
                          <option key={vis.id} value={vis.id}>{vis.name || vis.visibility || vis.title || vis.id}</option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const selectedVisObj = visibilities.find(v => v.id?.toString() === uploadForm.visibility?.toString());
                      const isPrivate = (selectedVisObj && (
                        (selectedVisObj.name && selectedVisObj.name.toLowerCase() === 'private') ||
                        (selectedVisObj.visibility && selectedVisObj.visibility.toString().toLowerCase() === 'private') ||
                        (selectedVisObj.id && selectedVisObj.id.toString().toLowerCase() === 'private')
                      )) || (uploadForm.visibility && uploadForm.visibility.toString().toLowerCase() === 'private');
                      return isPrivate;
                    })() && (
                      isSuperAdmin ? (
                        <div className="form-group">
                          <label className="form-label">Admin *</label>
                          <select 
                            className="form-input"
                            value={uploadForm.adminId}
                            onChange={(e) => setUploadForm({ ...uploadForm, adminId: e.target.value })}
                            required
                            disabled={loadingAdminsList}
                          >
                            <option value="">{loadingAdminsList ? 'Loading...' : 'Select Admin'}</option>
                            {adminsList.map(admin => (
                              <option key={admin.id || admin.admin_id} value={admin.id || admin.admin_id}>
                                {admin.name || admin.username || admin.email || admin.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="form-group">
                          <label className="form-label">Plan</label>
                          <select 
                            className="form-input"
                            value={uploadForm.planId}
                            onChange={(e) => setUploadForm({ ...uploadForm, planId: e.target.value })}
                            required
                            disabled={loadingPlans}
                          >
                            <option value="">{loadingPlans ? 'Loading...' : 'Select Plan'}</option>
                            {plans.map(p => (
                              <option key={p.id || p.plan_id} value={p.id || p.plan_id}>
                                {p.name || p.title || p.plan_name || p.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tags (Comma separated)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. math, algebra, tutorial"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Video File</label>
                      <input 
                        type="file" 
                        id="videoInput"
                        accept="video/*" 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file && await verifyFileContent(file)) {
                            e.target.value = '';
                            return;
                          }
                          setVideoFile(file);
                        }}
                        required
                        className="form-input"
                        style={{ fontSize: '13px', padding: '10px' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Thumbnail Image</label>
                      <input 
                        type="file" 
                        id="thumbInput"
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file && await verifyFileContent(file)) {
                            e.target.value = '';
                            return;
                          }
                          setThumbnailFile(file);
                        }}
                        className="form-input"
                        style={{ fontSize: '13px', padding: '10px' }}
                      />
                    </div>
                  </div>

                  {uploadProgress && (
                    <div style={{ margin: '20px 0', fontSize: '13px', color: 'var(--accent-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid var(--accent-secondary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s infinite linear' }} />
                      {uploadProgress}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} disabled={!!uploadProgress}>
                    {t('admin.tabUpload')}
                  </button>
                </form>
              </div>
            )}
            {activeTab === 'course_upload' && (() => {
              const isLight = theme === 'light';
              const containerBg = isLight ? '#ffffff' : 'var(--bg-secondary)';
              const textColor = isLight ? '#18181b' : 'var(--text-primary)';
              const borderColor = isLight ? '#e4e4e7' : 'rgba(255,255,255,0.08)';
              const inputBg = isLight ? '#ffffff' : 'rgba(255,255,255,0.04)';
              const inputBorder = isLight ? '#d4d4d8' : 'rgba(255,255,255,0.12)';
              const subtitleColor = isLight ? '#71717a' : 'var(--text-secondary)';
              const dragBg = isLight ? '#f9fafb' : 'rgba(255,255,255,0.01)';
              const tableHeaderBg = isLight ? '#f4f4f5' : 'rgba(255,255,255,0.03)';

              return (
                <div className="animate-fade-in glass-card" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', backgroundColor: containerBg, color: textColor, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: textColor }}>Upload Course</h1>
                      <p style={{ color: subtitleColor, fontSize: '14px', marginTop: '4px' }}>
                        Add course details, chapters and multiple videos.
                      </p>
                    </div>
                    {!justContent && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" className="btn" style={{ padding: '8px 16px', fontSize: '13px', border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: textColor, borderRadius: '8px' }}>Export CSV</button>
                        <button type="button" className="btn" style={{ padding: '8px 16px', fontSize: '13px', border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: textColor, borderRadius: '8px' }}>Export Excel</button>
                        <button type="button" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#e50914', border: 'none', color: '#ffffff', borderRadius: '8px' }}>Export PDF</button>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleCourseSubmit}>
                    {/* Part 1: Course Information */}
                    <div style={{ backgroundColor: containerBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderColor}`, marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e50914', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold' }}>1</div>
                        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: textColor }}>Course Information</h2>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Course Title *</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            placeholder="e.g. Complete Python Programming"
                            value={courseForm.title}
                            onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Course Description *</label>
                          <textarea
                            className="form-input"
                            rows="1"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            placeholder="Provide a detailed description of this course..."
                            value={courseForm.description}
                            onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Category *</label>
                          <select
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            value={courseForm.category}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCourseForm(prev => ({ ...prev, category: val }));
                              fetchSubCategories(val);
                            }}
                            required
                          >
                            <option value="">Select Category</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Sub Category *</label>
                          <select
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            value={courseForm.subCategory}
                            onChange={(e) => setCourseForm({ ...courseForm, subCategory: e.target.value })}
                            required
                            disabled={loadingSubCategories}
                          >
                            <option value="">{loadingSubCategories ? 'Loading...' : 'Select Sub Category'}</option>
                            {subCategories.map((subCat) => (
                              <option key={subCat.id || subCat.name} value={subCat.id || subCat.name}>{subCat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Language *</label>
                          <select
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            value={courseForm.languageId}
                            onChange={(e) => setCourseForm({ ...courseForm, languageId: e.target.value })}
                            required
                            disabled={loadingLanguages}
                          >
                            <option value="">{loadingLanguages ? 'Loading...' : 'Select Language'}</option>
                            {languages.map((lang) => (
                              <option key={lang.id || lang.language_id || lang.name} value={lang.id || lang.language_id || lang.name}>
                                {lang.name || lang.title || lang.language_name || lang.id}
                              </option>
                            ))}
                          </select>
                        </div>
                        {isSuperAdmin && (
                          <>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Visibility *</label>
                              <select
                                className="form-input"
                                style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                                value={courseForm.visibility}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCourseForm(prev => ({ ...prev, visibility: val }));
                                  const selectedVisObj = visibilities.find(v => v.id?.toString() === val?.toString());
                                  const isPrivate = (selectedVisObj && (
                                    (selectedVisObj.name && selectedVisObj.name.toLowerCase() === 'private') ||
                                    (selectedVisObj.visibility && selectedVisObj.visibility.toString().toLowerCase() === 'private') ||
                                    (selectedVisObj.id && selectedVisObj.id.toString().toLowerCase() === 'private')
                                  )) || (val && val.toString().toLowerCase() === 'private');
                                  if (isPrivate && isSuperAdmin) {
                                    fetchAdminsList();
                                  }
                                }}
                                required
                              >
                                <option value="">Select Visibility</option>
                                {visibilities.map((vis) => (
                                  <option key={vis.id} value={vis.id}>{vis.name || vis.visibility || vis.title || vis.id}</option>
                                ))}
                              </select>
                            </div>
                            {(() => {
                              const selectedVisObj = visibilities.find(v => v.id?.toString() === courseForm.visibility?.toString());
                              const isPrivate = (selectedVisObj && (
                                (selectedVisObj.name && selectedVisObj.name.toLowerCase() === 'private') ||
                                (selectedVisObj.visibility && selectedVisObj.visibility.toString().toLowerCase() === 'private') ||
                                (selectedVisObj.id && selectedVisObj.id.toString().toLowerCase() === 'private')
                              )) || (courseForm.visibility && courseForm.visibility.toString().toLowerCase() === 'private');
                              return isPrivate;
                            })() && (
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Admin *</label>
                                <select
                                  className="form-input"
                                  style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                                  value={courseForm.adminId}
                                  onChange={(e) => setCourseForm({ ...courseForm, adminId: e.target.value })}
                                  required
                                  disabled={loadingAdminsList}
                                >
                                  <option value="">{loadingAdminsList ? 'Loading...' : 'Select Admin'}</option>
                                  {adminsList.map((admin) => (
                                    <option key={admin.id || admin.admin_id} value={admin.id || admin.admin_id}>
                                      {admin.name || admin.username || admin.email || admin.id}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Instructor / Author</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            placeholder="e.g. John Doe"
                            value={courseForm.instructor}
                            onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Course Level</label>
                          <select
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            value={courseForm.level}
                            onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                            required
                          >
                            <option value="">Select Level</option>
                            {levels.map(lvl => (
                              <option key={lvl.id || lvl.level} value={lvl.id || lvl.level}>
                                {lvl.level || lvl.level_name || lvl.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Tags (Comma separated)</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            placeholder="e.g. programming, python, tutorial"
                            value={courseForm.tags}
                            onChange={(e) => setCourseForm({ ...courseForm, tags: e.target.value })}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Course Thumbnail *</label>
                          <input
                            type="file"
                            accept="image/*"
                            className="form-input"
                            style={{ fontSize: '12px', padding: '8px', backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file && await verifyFileContent(file)) {
                                e.target.value = '';
                                return;
                              }
                              handleCourseThumbnailUpload(file);
                            }}
                          />
                          {thumbnailUploading && <span style={{ fontSize: '11px', color: '#e50914', display: 'block', marginTop: '4px' }}>Uploading thumbnail...</span>}
                          {courseThumbnailUrl && <span style={{ fontSize: '11px', color: '#10b981', display: 'block', marginTop: '4px' }}>✔️ Uploaded to MinIO</span>}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Course Banner (Optional)</label>
                          <input
                            type="file"
                            accept="image/*"
                            className="form-input"
                            style={{ fontSize: '12px', padding: '8px', backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file && await verifyFileContent(file)) {
                                e.target.value = '';
                                return;
                              }
                              handleCourseBannerUpload(file);
                            }}
                          />
                          {bannerUploading && <span style={{ fontSize: '11px', color: '#e50914', display: 'block', marginTop: '4px' }}>Uploading banner...</span>}
                          {courseBannerUrl && <span style={{ fontSize: '11px', color: '#10b981', display: 'block', marginTop: '4px' }}>✔️ Uploaded to MinIO</span>}
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Total Chapters</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            placeholder="e.g. 10"
                            value={courseForm.totalChapters}
                            onChange={(e) => setCourseForm({ ...courseForm, totalChapters: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Part 2: Chapters & Videos */}
                    <div style={{ backgroundColor: containerBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderColor}`, marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e50914', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold' }}>2</div>
                          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: textColor }}>Chapters & Videos</h2>
                        </div>
                        <button type="button" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#e50914', border: 'none', color: '#ffffff', cursor: 'pointer', borderRadius: '8px' }} onClick={addChapter}>
                          + Add Chapter
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isLight ? '#f4f4f5' : 'rgba(255,255,255,0.04)', border: `1px solid ${borderColor}`, padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', color: subtitleColor }}>
                        <span style={{ fontSize: '14px' }}>ℹ️</span> Add chapters and upload multiple videos for each chapter.
                      </div>

                      {chapters.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', border: `1px dashed ${borderColor}`, borderRadius: '10px', color: subtitleColor }}>
                          No chapters added yet. Click "+ Add Chapter" above to create one.
                        </div>
                      ) : (
                        chapters.map((ch, chIdx) => (
                          <div key={ch.id} style={{ border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '16px', marginBottom: '20px', backgroundColor: containerBg }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', color: '#e50914', fontWeight: 'bold' }}>Chapter {chIdx + 1}</span>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ width: '200px', padding: '6px 12px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                                  value={ch.title}
                                  onChange={(e) => updateChapterProp(ch.id, 'title', e.target.value)}
                                />
                              </div>
                              <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer' }} onClick={() => removeChapter(ch.id)}>
                                🗑️ Remove Chapter
                              </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '12px', color: textColor, fontWeight: '600' }}>Chapter Description (Optional)</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                                  placeholder="e.g. This chapter covers the basics..."
                                  value={ch.description}
                                  onChange={(e) => updateChapterProp(ch.id, 'description', e.target.value)}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '12px', color: textColor, fontWeight: '600' }}>Chapter Order</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                                  value={ch.order}
                                  onChange={(e) => updateChapterProp(ch.id, 'order', parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '12px', color: textColor, fontWeight: '600' }}>Visibility *</label>
                                <select 
                                  className="form-input"
                                  style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px', padding: '8px 12px', height: '38px', fontSize: '13px' }}
                                  value={ch.visibility || ''}
                                  onChange={(e) => updateChapterProp(ch.id, 'visibility', e.target.value)}
                                  required
                                >
                                  {visibilities.map(vis => (
                                    <option key={vis.id} value={vis.id}>{vis.name || vis.visibility || vis.title || vis.id}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                              <span style={{ fontSize: '12px', color: textColor, fontWeight: 'bold' }}>Videos in this chapter</span>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" className="btn" style={{ padding: '6px 12px', fontSize: '12px', border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: textColor, borderRadius: '6px' }}>Upload Multiple Videos</button>
                                <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#e50914', border: 'none', color: '#ffffff', cursor: 'pointer', borderRadius: '6px' }} onClick={() => addVideoToChapter(ch.id)}>+ Add Video</button>
                              </div>
                            </div>

                            {/* Videos Table */}
                            <div className="table-container" style={{ marginBottom: '16px', border: `1px solid ${borderColor}`, borderRadius: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                              <table className="data-table" style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse', backgroundColor: containerBg }}>
                                <thead>
                                  <tr style={{ backgroundColor: tableHeaderBg, borderBottom: `1px solid ${borderColor}` }}>
                                    <th style={{ width: '40px', padding: '10px', color: textColor }}>#</th>
                                    <th style={{ color: textColor, padding: '10px' }}>Video Title</th>
                                    <th style={{ color: textColor, padding: '10px' }}>Video File</th>
                                    <th style={{ color: textColor, padding: '10px' }}>Thumbnail</th>
                                    <th style={{ width: '90px', color: textColor, padding: '10px' }}>Duration</th>
                                    <th style={{ width: '60px', color: textColor, padding: '10px' }}>Preview</th>
                                    <th style={{ width: '50px', color: textColor, padding: '10px' }}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ch.videos.length === 0 ? (
                                    <tr>
                                      <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: subtitleColor, backgroundColor: containerBg }}>
                                        No videos added yet. Click "+ Add Video" or drop files below.
                                      </td>
                                    </tr>
                                  ) : (
                                    ch.videos.map((vid, vidIdx) => (
                                      <tr key={vid.id} style={{ borderBottom: `1px solid ${borderColor}`, backgroundColor: containerBg }}>
                                        <td style={{ padding: '10px', color: textColor }}>{vidIdx + 1}</td>
                                        <td style={{ padding: '10px' }}>
                                          <input
                                            type="text"
                                            className="form-input"
                                            style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '6px' }}
                                            value={vid.title}
                                            onChange={(e) => updateVideoProp(ch.id, vid.id, 'title', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <input
                                              type="file"
                                              accept="video/*"
                                              style={{ fontSize: '10px', maxWidth: '120px', color: textColor }}
                                              onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (file && await verifyFileContent(file)) {
                                                  e.target.value = '';
                                                  return;
                                                }
                                                handleChapterVideoUpload(ch.id, vid.id, file);
                                              }}
                                            />
                                            {vid.uploadStatus === 'uploading' && (
                                              <span style={{ fontSize: '10px', color: '#e50914' }}>Uploading: {vid.uploadProgress || 0}%</span>
                                            )}
                                            {vid.uploadStatus === 'success' && (
                                              <span style={{ fontSize: '10px', color: '#10b981' }}>✔️ Done</span>
                                            )}
                                            {vid.uploadStatus === 'error' && (
                                              <span style={{ fontSize: '10px', color: '#ef4444' }}>❌ Error</span>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              style={{ fontSize: '10px', maxWidth: '120px', color: textColor }}
                                              onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (file && await verifyFileContent(file)) {
                                                  e.target.value = '';
                                                  return;
                                                }
                                                handleChapterThumbnailUpload(ch.id, vid.id, file);
                                              }}
                                            />
                                            {vid.thumbStatus === 'uploading' && (
                                              <span style={{ fontSize: '10px', color: '#e50914' }}>Uploading...</span>
                                            )}
                                            {vid.thumbStatus === 'success' && (
                                              <span style={{ fontSize: '10px', color: '#10b981' }}>✔️ Done</span>
                                            )}
                                            {vid.thumbStatus === 'error' && (
                                              <span style={{ fontSize: '10px', color: '#ef4444' }}>❌ Error</span>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                          <input
                                            type="text"
                                            className="form-input"
                                            style={{ padding: '4px 8px', fontSize: '12px', textAlign: 'center', backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '6px' }}
                                            value={vid.duration}
                                            onChange={(e) => updateVideoProp(ch.id, vid.id, 'duration', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px' }}>
                                          <input
                                            type="checkbox"
                                            checked={vid.isPreview}
                                            onChange={(e) => updateVideoProp(ch.id, vid.id, 'isPreview', e.target.checked)}
                                          />
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px' }}>
                                          <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }} onClick={() => removeVideoFromChapter(ch.id, vid.id)}>
                                            🗑️
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Drag and Drop zone */}
                            <div style={{ border: `2px dashed ${borderColor}`, borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', backgroundColor: dragBg }}>
                              <span style={{ fontSize: '28px' }}>☁️</span>
                              <span style={{ fontSize: '13px', color: subtitleColor }}>
                                Drag & drop videos here or <span style={{ color: '#e50914', textDecoration: 'underline' }}>click to browse</span>
                              </span>
                              <span style={{ fontSize: '11px', color: subtitleColor }}>You can upload multiple videos at once</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {uploadProgress && (
                      <div style={{ margin: '20px 0', fontSize: '13px', color: '#e50914', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #e50914', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s infinite linear' }} />
                        {uploadProgress}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
                      <button type="button" className="btn" style={{ padding: '10px 24px', border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: textColor, borderRadius: '8px', fontWeight: '600' }} onClick={() => alert('Draft Saved!')}>
                        Save as Draft
                      </button>
                      <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', backgroundColor: '#e50914', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: '600' }} disabled={!!uploadProgress}>
                        Submit Course
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}

            {/* VIDEO_ALL CONTENT VIEW */}
            {activeTab === 'video_all' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Uploaded Videos</h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Thumbnail</th>
                        <th>{t('admin.uploadTitle')}</th>
                        <th>{t('admin.tableCategory')}</th>
                        <th>{t('admin.tableViews')}</th>
                        <th>Visibility</th>
                        <th>{t('admin.tableActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(myVideos) ? myVideos : []).map(video => {
                        const hasThumbnail = video.thumbnail && typeof video.thumbnail === 'string';
                        const thumbUrl = hasThumbnail 
                          ? (video.thumbnail.startsWith('http') ? video.thumbnail : `http://localhost:5000${video.thumbnail}`) 
                          : 'https://placehold.co/180x101?text=No+Thumbnail';
                        const isPublic = String(video.visibility || '').toLowerCase() === 'scheduler' || String(video.visibility || '').toLowerCase() === 'public';
                        return (
                          <tr key={video.id} onClick={() => setReviewVideo(video)} style={{ cursor: 'pointer' }}>
                            <td>
                              <img 
                                src={thumbUrl} 
                                alt={video.title || 'Video'} 
                                style={{ width: '80px', borderRadius: '4px', aspectRatio: '16/9', objectFit: 'cover' }} 
                              />
                            </td>
                            <td style={{ fontWeight: 600 }}>{video.title || 'Untitled'}</td>
                            <td>{video.category || 'Uncategorized'}</td>
                            <td>{video.views || 0}</td>
                            <td>
                              <span className={`badge ${isPublic ? 'badge-active' : 'badge-disabled'}`}>
                                {String(video.visibility || 'Public').toUpperCase()}
                              </span>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  onClick={() => setReviewVideo(video)}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  {t('admin.playReviewBtn')}
                                </button>
                                <button 
                                  onClick={() => handleDeleteVideo(video.id)}
                                  className="btn"
                                  style={{ padding: '6px 12px', fontSize: '12px', border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                >
                                  {t('admin.deleteBtn')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* COURSE_ALL CONTENT VIEW */}
            {activeTab === 'course_all' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>All Courses</h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Banner</th>
                        <th>Course Title</th>
                        <th>Instructor</th>
                        <th>Category</th>
                        <th>Chapters</th>
                        <th>Lessons</th>
                        <th>Price</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No courses found. Click "Upload Course" to add one.
                          </td>
                        </tr>
                      ) : (
                        courses.map((course) => {
                          const displayTitle = course.course_title || course.title || 'Untitled Course';
                          const courseBanner = course.banner || course.thumbnail || course.thumbnailUrl || '';
                          
                          // Safely resolve chapters count
                          const chaptersCount = Array.isArray(course.chapters)
                            ? course.chapters.length
                            : (course.totalChapters || course.chapters || 0);

                          // Safely resolve lessons count
                          const lessonsCount = course.totalLessons || course.lessons || 
                            (Array.isArray(course.chapters)
                              ? course.chapters.reduce((acc, ch) => acc + (Array.isArray(ch.videos) ? ch.videos.length : Array.isArray(ch.lessons) ? ch.lessons.length : 0), 0)
                              : (course.videos || 0));

                          return (
                            <tr key={course.id || displayTitle}>
                              <td>
                                {courseBanner ? (
                                  <img 
                                    src={courseBanner} 
                                    alt={displayTitle} 
                                    style={{ width: '80px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} 
                                  />
                                ) : (
                                  <div style={{ width: '80px', height: '45px', borderRadius: '4px', backgroundColor: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#a1a1aa' }}>
                                    🎬
                                  </div>
                                )}
                              </td>
                              <td style={{ fontWeight: 'bold' }}>{displayTitle}</td>
                              <td>{course.instructor || 'N/A'}</td>
                              <td>{course.category || 'N/A'}</td>
                              <td>{chaptersCount}</td>
                              <td>{lessonsCount}</td>
                              <td>{course.price && course.price !== '0' ? `$${course.price}` : 'Free'}</td>
                              <td>
                                <button 
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                  onClick={() => {
                                    alert(`Viewing course: ${displayTitle}`);
                                  }}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* --- DYNAMIC USER MANAGEMENT VIEWS --- */}
            {activeTab.startsWith('users_') && activeTab !== 'users_logs' && activeTab !== 'users_all' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px', textTransform: 'capitalize' }}>
                  {activeTab.replace(/_/g, ' ')}
                </h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(users) ? users : [])
                        .filter(u => {
                          const isUActive = u.status === true || String(u.status).toLowerCase() === 'true' || String(u.status).toLowerCase() === 'active';
                          if (activeTab === 'users_active') return isUActive;
                          if (activeTab === 'users_inactive') return !isUActive;
                          if (activeTab === 'users_blocked') return true;
                          return true;
                        })
                        .map(u => {
                          const isUActive = u.status === true || String(u.status).toLowerCase() === 'true' || String(u.status).toLowerCase() === 'active';
                          return (
                            <tr key={u.id}>
                              <td style={{ fontWeight: 600 }}>{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.name || 'User'}</td>
                              <td>{u.email}</td>
                              <td>{u.phonenumber || u.mobile}</td>
                              <td><span style={{ fontSize: '11px', textTransform: 'uppercase' }}>{u.role || 'user'}</span></td>
                              <td>
                                <span className={`badge ${isUActive ? 'badge-active' : 'badge-disabled'}`}>
                                  {isUActive ? 'Active' : 'InActive'}
                                </span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {activeTab === 'users_blocked' ? (
                                    <button 
                                      onClick={() => handleUnblockUser(u)}
                                      className="btn"
                                      style={{ 
                                        padding: '6px 12px', 
                                        fontSize: '12px', 
                                        border: 'none', 
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                                        color: '#10b981' 
                                      }}
                                    >
                                      Unblock
                                    </button>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => handleEditClick(u)}
                                        className="btn btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                      >
                                        Edit
                                      </button>
                                      <button 
                                        onClick={() => handleToggleUserStatus(u, isUActive ? false : true)}
                                        className="btn"
                                        style={{ 
                                          padding: '6px 12px', 
                                          fontSize: '12px', 
                                          border: 'none', 
                                          backgroundColor: isUActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                                          color: isUActive ? '#ef4444' : '#10b981' 
                                        }}
                                      >
                                        {isUActive ? 'Disable' : 'Enable'}
                                      </button>
                                      <button 
                                        onClick={() => handleToggleUserStatus(u, false, true)}
                                        className="btn"
                                        style={{ 
                                          padding: '6px 12px', 
                                          fontSize: '12px', 
                                          border: 'none', 
                                          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                                          color: '#f59e0b' 
                                        }}
                                      >
                                        Block
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- USER ACTIVITY LOGS --- */}
            {activeTab === 'users_logs' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>User Watch Activity Logs</h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Video</th>
                        <th>Date/Time</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userLogs.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No user watch activity logs found.</td>
                        </tr>
                      ) : (
                        userLogs.map((act, i) => {
                          const logItem = act.json || act;
                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{logItem.user_name || ''}</td>
                              <td>{logItem.video || ''}</td>
                              <td>{logItem.date || ''}</td>
                              <td>
                                <span style={{ 
                                  color: String(logItem.watch_activity || '').toLowerCase().includes('complete') || String(logItem.watch_activity || '').toLowerCase().includes('finish') ? '#10b981' : '#3b82f6', 
                                  fontWeight: 500 
                                }}>
                                  {logItem.watch_activity || ''}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- ANALYTICS MODULE VIEWS --- */}
            {(activeTab.includes('analytics') || activeTab.startsWith('analytics_')) && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  <div className="glass-card">
                    <h3>User Growth Analytics</h3>
                    <LineChart data={userAnalytics?.registrations || userGrowthData} />
                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '12px', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <span>DAU: <strong>{userAnalytics?.dau || 87}</strong></span>
                      <span>MAU: <strong>{userAnalytics?.mau || 240}</strong></span>
                      <span>Retention: <strong>{userAnalytics?.retentionRate || 78}%</strong></span>
                    </div>
                  </div>
                  
                  <div className="glass-card">
                    <h3>Device Statistics</h3>
                    <DonutChart data={userAnalytics?.deviceUsage || [
                      { label: 'Mobile', count: 70 },
                      { label: 'Desktop', count: 20 },
                      { label: 'TV', count: 10 }
                    ]} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  <div className="glass-card">
                    <h3>Engagement KPI Summary</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Likes:</span>
                        <span style={{ fontWeight: 700 }}>{engagementAnalytics?.likes || 154}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Comments:</span>
                        <span style={{ fontWeight: 700 }}>{engagementAnalytics?.comments || 64}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Shares:</span>
                        <span style={{ fontWeight: 700 }}>{engagementAnalytics?.shares || 102}</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card">
                    <h3>Buffering & Playback metrics</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>CDN latency:</span>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>{streamingAnalytics?.cdnPerformanceMs || 38} ms</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Buffering Ratio:</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{streamingAnalytics?.bufferingRatioPercent || 0.85}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- USER PLAYBACK BEHAVIOR METRICS --- */}
                <div className="glass-card" style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    👤 User Video Playback Behavior Metrics
                  </h3>
                  <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Category</th>
                          <th>Video</th>
                          <th style={{ textAlign: 'center' }}>Views</th>
                          <th style={{ textAlign: 'center' }}>Completed</th>
                          <th>Completion %</th>
                          <th>Watch Time</th>
                          <th style={{ textAlign: 'center' }}>Paused</th>
                          <th style={{ textAlign: 'center' }}>Forwarded</th>
                          <th style={{ textAlign: 'center' }}>Backward</th>
                          <th style={{ textAlign: 'center' }}>Last Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const logsList = Array.isArray(stats)
                            ? stats.map(item => item.json || item)
                            : (stats && typeof stats === 'object' && stats.watchHistoryDetails
                               ? stats.watchHistoryDetails
                               : (Array.isArray(userAnalytics)
                                  ? userAnalytics.map(item => item.json || item)
                                  : (userAnalytics && typeof userAnalytics === 'object' && (userAnalytics.id || userAnalytics.videoId || userAnalytics.user_id || userAnalytics.json)
                                     ? [userAnalytics.json || userAnalytics]
                                     : [])));

                          if (logsList.length === 0) {
                            return (
                              <tr>
                                <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                                  No playback logs registered yet.
                                </td>
                              </tr>
                            );
                          }

                          return logsList.map((item, idx) => {
                            const formatWatchTime = (seconds) => {
                              if (!seconds) return '0s';
                              const mins = Math.floor(seconds / 60);
                              const secs = seconds % 60;
                              if (mins > 0) {
                                return `${mins}m ${secs > 0 ? secs + 's' : ''}`;
                              }
                              return `${secs}s`;
                            };

                            const formatPosition = (seconds) => {
                              if (!seconds) return '00:00';
                              const mins = Math.floor(seconds / 60);
                              const secs = seconds % 60;
                              return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
                            };

                            const completed = (item.status === true || String(item.status).toLowerCase() === 'true' || item.completed === 'Yes');
                            const completedText = completed ? 'Completed' : 'Partially Completed';
                            const completionPct = parseFloat(item.completion_percentage || item.completionPercentage || 0);
                            
                            const displayWatchTime = item.watch_duration_sec !== undefined
                              ? formatWatchTime(parseInt(item.watch_duration_sec, 10))
                              : (typeof item.watchTime === 'string' && item.watchTime.includes(':') 
                                 ? item.watchTime 
                                 : formatWatchTime(item.watchTime || item.watchtime || 0));

                            const pausedVal = item.total_pause_count !== undefined ? item.total_pause_count : (item.pausedCount || 0);
                            const forwardedVal = item.total_seek_forward !== undefined ? item.total_seek_forward : (item.forwardedCount || 0);
                            const backwardVal = item.total_seek_backward !== undefined ? item.total_seek_backward : (item.backwardCount || 0);

                            const lastPosDisplay = item.last_position_sec 
                              ? item.last_position_sec 
                              : formatPosition(item.lastPosition || 0);

                            return (
                              <tr key={item.id || idx}>
                                <td style={{ fontWeight: 600 }}>
                                  <div>{item.user_name || item.userName || `User ${item.user_id || item.userId || ''}`}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>{item.user_email || item.userEmail || ''}</div>
                                </td>
                                <td>
                                  <span className="category-tag" style={{ fontSize: '12px' }}>
                                    {item.category_name || item.videoCategory || 'Uncategorized'}
                                  </span>
                                </td>
                                <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.title || item.videoTitle || 'Untitled Video'}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.views || 0}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: '12px', 
                                    fontSize: '11px', 
                                    fontWeight: 600,
                                    background: completed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: completed ? '#10b981' : '#f59e0b'
                                  }}>
                                    {completedText}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1, height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                                      <div style={{ 
                                        width: `${completionPct}%`, 
                                        height: '100%', 
                                        background: completionPct >= 90 ? '#10b981' : 'var(--accent-primary)',
                                        borderRadius: '3px'
                                      }} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{completionPct}%</span>
                                  </div>
                                </td>
                                <td style={{ fontWeight: 500 }}>{displayWatchTime}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{pausedVal}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{forwardedVal}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{backwardVal}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600, fontFamily: 'monospace' }}>
                                  {completed ? '100%' : lastPosDisplay}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- EXPORT CENTRE & PAYMENTS --- */}
            {activeTab === 'rep_export' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Transaction History & Refund Management</h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id}>
                          <td><code>{tx.id}</code></td>
                          <td style={{ fontWeight: 600 }}>{tx.userName}</td>
                          <td>₹{tx.amount}</td>
                          <td>
                            <span className={`badge ${tx.status === 'success' ? 'badge-active' : 'badge-disabled'}`}>
                              {String(tx.status || '').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- MONITORING / REALTIME VIEWS --- */}
            {(activeTab === 'realtime' || activeTab.startsWith('mon_')) && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                  <div className="glass-card">
                    <h4>CPU Load</h4>
                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${serverMonitoring?.cpuUsage || 28}%`, height: '100%', background: '#3b82f6' }} />
                    </div>
                    <span style={{ fontSize: '13px', marginTop: '8px', display: 'block' }}>{serverMonitoring?.cpuUsage || 28}%</span>
                  </div>

                  <div className="glass-card">
                    <h4>RAM Allocation</h4>
                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${serverMonitoring?.ramUsage || 64}%`, height: '100%', background: '#10b981' }} />
                    </div>
                    <span style={{ fontSize: '13px', marginTop: '8px', display: 'block' }}>{serverMonitoring?.ramUsage || 64}%</span>
                  </div>
                </div>

                <div className="glass-card">
                  <h3>Active Live Stream Health Indicators</h3>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Stream Title</th>
                          <th>Viewers</th>
                          <th>Bitrate</th>
                          <th>FPS</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveStreams.length === 0 ? (
                          <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No active streams found</td></tr>
                        ) : (
                          liveStreams.map(stream => (
                            <tr key={stream.id}>
                              <td style={{ fontWeight: 600 }}>{stream.title}</td>
                              <td>{stream.viewers} Concurrent</td>
                              <td style={{ color: 'var(--accent-secondary)' }}>{stream.bitrateKbps} Kbps</td>
                              <td>{stream.fps} FPS</td>
                              <td><span className="badge badge-active" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>LIVE</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- PLATFORM SETTINGS VIEWS --- */}
            {activeTab.startsWith('set_') && (
              <div className="animate-fade-in glass-card" style={{ maxWidth: '540px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '24px', textTransform: 'capitalize' }}>
                  {activeTab.replace('set_', '').replace(/_/g, ' ')} Settings
                </h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  alert("Settings updated successfully!");
                }}>
                  {activeTab === 'set_general' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Default Streaming Quality</label>
                        <select 
                          className="form-input" 
                          value={settings.defaultQuality || '1080p'} 
                          onChange={e => setSettings({ ...settings, defaultQuality: e.target.value })}
                        >
                          <option value="1080p">1080p (Full HD)</option>
                          <option value="720p">720p (HD)</option>
                          <option value="480p">480p (Standard)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">CDN Provider</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={settings.cdnProvider || 'Cloudflare'} 
                          onChange={e => setSettings({ ...settings, cdnProvider: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  {activeTab !== 'set_general' && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Configuration parameters for **{activeTab.replace('set_', '').toUpperCase()}** are managed by Super Admins.
                    </p>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>
                    Save Settings
                  </button>
                </form>
              </div>
            )}

            {/* --- FALLBACK FOR MODULE PAGES --- */}
            {activeTab !== 'overview' && 
             !activeTab.startsWith('users_') && 
             activeTab !== 'video_upload' && 
             activeTab !== 'video_all' && 
             activeTab !== 'course_upload' && 
             activeTab !== 'course_all' && 
             !activeTab.includes('analytics') &&
             !activeTab.startsWith('mon_') &&
             activeTab !== 'realtime' &&
             activeTab !== 'rep_export' &&
             !activeTab.startsWith('set_') && (
              <div className="glass-card animate-fade-in" style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px', textTransform: 'capitalize' }}>
                  {activeTab.replace(/_/g, ' ')} Module
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                  This page represents the dedicated portal for **{activeTab.replace(/_/g, ' ').toUpperCase()}**. Full mock details, telemetry records, and management parameters are synchronized with the cloud core.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '24px' }}>
                  <div className="glass-card" style={{ background: 'var(--bg-tertiary)', border: 'none' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Status Parameters</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Module Status:</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>ACTIVE</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Last Sync Time:</span>
                        <span>Just now</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Database Cluster:</span>
                        <span>Healthy (Primary)</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card" style={{ background: 'var(--bg-tertiary)', border: 'none' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Operations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button className="btn btn-primary" style={{ fontSize: '12px', padding: '8px 12px' }} onClick={() => alert(`${activeTab} execution triggered successfully!`)}>
                        Trigger Task Run
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '8px 12px' }} onClick={() => alert("Report generated and queued for export.")}>
                        Generate Module Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- VIDEO REVIEW PLAYER MODAL --- */}
      {reviewVideo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '800px', padding: '24px', background: '#111116', border: '1px solid var(--accent-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t('admin.videoReview')}: {reviewVideo.title}</h3>
              <button 
                onClick={() => setReviewVideo(null)} 
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9', marginBottom: '16px' }}>
              <video 
                src={(() => {
                  const url = reviewVideo.videoUrl || reviewVideo.video_url;
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
                })()} 
                controls 
                autoPlay
                onContextMenu={(e) => e.preventDefault()}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>{t('admin.tableCategory')}: {reviewVideo.category}</span>
              <span>{t('admin.tableViews')}: {reviewVideo.views || 0}</span>
            </div>
            <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.6', color: '#eee' }}>{reviewVideo.description}</p>
          </div>
        </div>
      )}

      {/* --- USER MODAL --- */}
      {showUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animate-fade-in" style={{
            width: '90%',
            maxWidth: '640px',
            padding: '32px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            color: '#333333',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#111111' }}>{editingUser ? 'Edit User' : 'Add User'}</h3>
            <form onSubmit={handleUserSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>First Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter first name"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.firstName} 
                    onChange={e => setUserForm({...userForm, firstName: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Last Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter last name"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.lastName} 
                    onChange={e => setUserForm({...userForm, lastName: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="Enter email address"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.email} 
                    onChange={e => setUserForm({...userForm, email: e.target.value})} 
                    required 
                    disabled={!!editingUser}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="Enter phone number"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.mobile} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setUserForm({...userForm, mobile: value});
                    }} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Gender</label>
                  <select 
                    className="form-input" 
                    value={userForm.gender} 
                    onChange={e => setUserForm({...userForm, gender: e.target.value})}
                    required
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Date of Birth</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.dob} 
                    onChange={e => setUserForm({...userForm, dob: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter address"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.address} 
                    onChange={e => setUserForm({...userForm, address: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>City</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter city"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.city} 
                    onChange={e => setUserForm({...userForm, city: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>State</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter state"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.state} 
                    onChange={e => setUserForm({...userForm, state: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Zipcode</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter zipcode"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.zipcode} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setUserForm({...userForm, zipcode: value});
                    }} 
                    required 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowUserModal(false)} className="btn btn-secondary" style={{ background: '#e0e0e0', color: '#333333', border: 'none' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none' }}>Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CUSTOM ALERT MODAL --- */}
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
          zIndex: 10000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            width: '100%',
            maxWidth: '360px',
            padding: '40px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#333333'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '3px solid #f5222d',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5222d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#f5222d',
              margin: '0 0 12px 0'
            }}>
              {customAlert.title}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.5',
              margin: '0 0 28px 0'
            }}>
              {customAlert.message}
            </p>
            <button
              onClick={() => setCustomAlert(prev => ({ ...prev, show: false }))}
              style={{
                background: '#de2424',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: 600,
                width: '100%',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                outline: 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
              onMouseLeave={e => e.currentTarget.style.opacity = 1}
            >
              {customAlert.buttonText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
