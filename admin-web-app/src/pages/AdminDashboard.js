import React, { useState, useEffect } from 'react';
import { api, getCurrentUser } from '../services/api';
import { BarChart, DonutChart, LineChart } from '../components/SVGCharts';
import { useLanguage } from '../context/LanguageContext';
import { encryptUrl } from '../utils/crypto';
import PaginatedTable, { UserAvatar, TableStatusBadge, TableRoleBadge, TableActionButton } from '../components/PaginatedTable';
import ThreeDLoader from '../components/ThreeDLoader';
import PremiumSelect from '../components/PremiumSelect';
import PremiumDatePicker from '../components/PremiumDatePicker';

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
  const isAuthorAdminUser = Boolean(
    currentUser && (
      currentUser.role_id === 4 || 
      currentUser.role_id === '4' || 
      currentUser.role === 4 || 
      currentUser.role === '4' || 
      currentUser.role === 'author_admin' || 
      currentUser.role === 'author admin' ||
      currentUser.originalRole === 4 ||
      currentUser.originalRole === '4' ||
      currentUser.originalRole === 'author_admin' ||
      currentUser.originalRole === 'author admin'
    )
  );

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 992);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const showError = (message) => {
    setCustomAlert({
      show: true,
      title: 'Oooops!',
      message,
      type: 'error',
      buttonText: 'Try Again'
    });
  };

  const showSuccess = (message, onConfirm = null) => {
    setCustomAlert({
      show: true,
      title: 'Success!',
      message,
      type: 'success',
      buttonText: 'Continue',
      onConfirm
    });
  };

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
    state_id: '',
    state: '',
    city_id: '',
    city: '',
    zipcode: '',
    address: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [genders, setGenders] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // Video Upload & Content Management states
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  const [subCategories, setSubCategories] = useState([]);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [subCategoryForm, setSubCategoryForm] = useState({ id: '', cat_id: '', name: '', description: '' });

  // Author Admin CRUD states
  const [authorAdmins, setAuthorAdmins] = useState([]);
  const [showAuthorAdminModal, setShowAuthorAdminModal] = useState(false);
  const [editingAuthorAdmin, setEditingAuthorAdmin] = useState(null);
  const [authorAdminFormLoading, setAuthorAdminFormLoading] = useState(false);
  const [authorAdminForm, setAuthorAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    gender: '',
    dob: '',
    address: '',
    state: '',
    state_id: '',
    city: '',
    city_id: '',
    zipcode: ''
  });

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    onConfirm: null
  });

  const showConfirmDelete = (message, onConfirm) => {
    setConfirmModal({
      show: true,
      title: 'Confirm Delete',
      message,
      confirmText: 'Delete',
      onConfirm
    });
  };

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
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [adminsList, setAdminsList] = useState([]);
  const [loadingAdminsList, setLoadingAdminsList] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);

  useEffect(() => {
    if (thumbnailFile) {
      const url = URL.createObjectURL(thumbnailFile);
      setThumbPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setThumbPreviewUrl(null);
    }
  }, [thumbnailFile]);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoPreviewUrl(null);
    }
  }, [videoFile]);

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

  // Admin Reports state
  const [adminReportType, setAdminReportType] = useState('course_analytics');
  const [adminReportData, setAdminReportData] = useState([]);
  const [adminReportLoading, setAdminReportLoading] = useState(false);

  const fetchAdminReport = async (reportType = adminReportType) => {
    setAdminReportLoading(true);
    try {
      const res = await api.reports.getAdminReport(reportType);
      if (Array.isArray(res)) {
        setAdminReportData(res);
      } else if (res && Array.isArray(res.data)) {
        setAdminReportData(res.data);
      } else if (res && typeof res === 'object') {
        const arrKey = Object.keys(res).find(k => Array.isArray(res[k]));
        if (arrKey) {
          setAdminReportData(res[arrKey]);
        } else {
          setAdminReportData([]);
        }
      } else {
        setAdminReportData([]);
      }
    } catch (err) {
      console.error("Failed to fetch admin report", err);
      setAdminReportData([]);
    } finally {
      setAdminReportLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setAdminReportLoading(true);
      const res = await api.reports.getAdminReport(adminReportType, {
        type: 'Report',
        export_type: format,
        format: format
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `${adminReportType}_report_${dateStr}.${format === 'pdf' ? 'pdf' : (format === 'excel' ? 'csv' : 'csv')}`;

      if (typeof res === 'string' && (res.startsWith('http://') || res.startsWith('https://') || res.startsWith('data:'))) {
        const link = document.createElement('a');
        link.href = res;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (res && typeof res === 'object' && !Array.isArray(res) && (res.file_url || res.url || res.download_url || res.file || res.data_url)) {
        const fileUrl = res.file_url || res.url || res.download_url || res.file || res.data_url;
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (typeof res === 'string' && res.trim().length > 0) {
        let mimeType = 'text/csv;charset=utf-8;';
        if (format === 'excel') mimeType = 'application/vnd.ms-excel;charset=utf-8;';
        if (format === 'pdf') mimeType = 'application/pdf;';

        const blob = new Blob([res], { type: mimeType });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      const exportList = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : adminReportData);
      if (exportList && exportList.length > 0) {
        if (format === 'pdf') {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            const reportTitle = adminReportType.replace(/_/g, ' ').toUpperCase();
            const tableHeadersHTML = Object.keys(exportList[0] || {}).map(h => `<th style="border:1px solid #ddd;padding:8px;background:#f2f2f2;text-align:left;">${h.replace(/_/g, ' ').toUpperCase()}</th>`).join('');
            const tableRowsHTML = exportList.map(row => 
              `<tr>${Object.values(row).map(val => `<td style="border:1px solid #ddd;padding:8px;">${String(val ?? '')}</td>`).join('')}</tr>`
            ).join('');

            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>${reportTitle} - Report</title>
                  <style>
                    body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
                    h1 { color: #6366f1; margin-bottom: 5px; }
                    p { color: #666; font-size: 13px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                    @media print { body { margin: 0; } }
                  </style>
                </head>
                <body>
                  <h1>${reportTitle} REPORT</h1>
                  <p>Generated on ${new Date().toLocaleString()}</p>
                  <table>
                    <thead><tr>${tableHeadersHTML}</tr></thead>
                    <tbody>${tableRowsHTML}</tbody>
                  </table>
                  <script>
                    window.onload = function() { window.print(); };
                  </script>
                </body>
              </html>
            `);
            printWindow.document.close();
            return;
          }
        }

        const headers = Object.keys(exportList[0] || {}).join(',');
        const rows = exportList.map(row => 
          Object.values(row).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const isExcel = format === 'excel';
        const csvContent = isExcel ? `\uFEFF${headers}\n${rows}` : `${headers}\n${rows}`;
        const mimeType = isExcel ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';

        const blob = new Blob([csvContent], { type: mimeType });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      showError('No details available');
    } catch (err) {
      console.error("Failed to export report", err);
      showError('No details available');
    } finally {
      setAdminReportLoading(false);
    }
  };

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
    if (activeTab === 'categories') {
      fetchCategories();
    }
    if (activeTab === 'sub_categories') {
      fetchSubCategories();
      fetchCategories();
    }
    if (activeTab === 'author_admin') {
      fetchAuthorAdmins();
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
      fetchAdminReport(adminReportType);
    }
  }, [activeTab, selectedAdminId, adminReportType]);

  useEffect(() => {
    if (showUserModal || showAuthorAdminModal) {
      fetchGenders();
      fetchStates();
    }
    if (showAuthorAdminModal && (authorAdminForm.state_id || authorAdminForm.state)) {
      fetchCities(authorAdminForm.state_id || authorAdminForm.state);
    }
  }, [showUserModal, showAuthorAdminModal]);

  const fetchStates = async () => {
    setLoadingStates(true);
    try {
      const res = await api.vdcategories.getStates();
      const list = Array.isArray(res) ? res : (res?.data || res?.result || []);
      const formatted = list.map(item => ({
        id: String(item.state_id || item.id || item.stat_id),
        name: item.name || item.state_name || item.title || item.state
      }));
      setStatesList(formatted);
      return formatted;
    } catch (err) {
      console.error("Failed to fetch states:", err);
      return [];
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (stateId) => {
    if (!stateId) {
      setCitiesList([]);
      return [];
    }
    setLoadingCities(true);
    try {
      const res = await api.vdcategories.getCity(stateId);
      const list = Array.isArray(res) ? res : (res?.data || res?.result || []);
      const formatted = list.map(item => ({
        id: String(item.city_id || item.id),
        name: item.name || item.city_name || item.title || item.city
      }));
      setCitiesList(formatted);
      return formatted;
    } catch (err) {
      console.error("Failed to fetch cities:", err);
      setCitiesList([]);
      return [];
    } finally {
      setLoadingCities(false);
    }
  };

  const handleStateChange = async (selectedStateId) => {
    const selectedStateObj = statesList.find(s => String(s.id) === String(selectedStateId));
    const stateName = selectedStateObj ? selectedStateObj.name : '';
    
    setUserForm(prev => ({
      ...prev,
      state_id: selectedStateId,
      state: stateName,
      city_id: '',
      city: ''
    }));
    
    if (selectedStateId) {
      fetchCities(selectedStateId);
    } else {
      setCitiesList([]);
    }
  };

  const handleAddAuthorAdminClick = async () => {
    setEditingAuthorAdmin(null);
    setAuthorAdminForm({
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      gender: '',
      dob: '',
      address: '',
      state: '',
      state_id: '',
      city: '',
      city_id: '',
      zipcode: ''
    });
    setCitiesList([]);
    setShowAuthorAdminModal(true);
    fetchStates();
    fetchGenders();
  };

  const handleEditAuthorAdminClick = async (admin) => {
    const rawRecord = (admin && admin.json) ? admin.json : admin;
    setEditingAuthorAdmin(rawRecord);

    const states = statesList.length > 0 ? statesList : (await fetchStates() || []);
    const genderOpts = genders.length > 0 ? genders : (await fetchGenders() || []);

    const rawState = rawRecord.state_id || rawRecord.state || '';
    const matchedState = (states || []).find(s => 
      String(s.id) === String(rawState) || 
      String(s.name).toLowerCase() === String(rawState).toLowerCase()
    );
    const resolvedStateId = matchedState ? String(matchedState.id) : String(rawState);
    const resolvedStateName = matchedState ? matchedState.name : String(rawState);

    let fetchedCities = [];
    if (resolvedStateId) {
      fetchedCities = await fetchCities(resolvedStateId);
    }

    const rawCity = rawRecord.city_id || rawRecord.city || '';
    const matchedCity = (fetchedCities || []).find(c => 
      String(c.id) === String(rawCity) || 
      String(c.name).toLowerCase() === String(rawCity).toLowerCase()
    );
    const resolvedCityId = matchedCity ? String(matchedCity.id) : String(rawCity);
    const resolvedCityName = matchedCity ? matchedCity.name : String(rawCity);

    const rawGender = rawRecord.gender_id || rawRecord.gender || '';
    const matchedGender = (genderOpts || []).find(g => 
      String(g.id) === String(rawGender) || 
      String(g.name).toLowerCase() === String(rawGender).toLowerCase()
    );
    const resolvedGender = matchedGender ? String(matchedGender.id) : String(rawGender);

    setAuthorAdminForm({
      firstName: rawRecord.first_name || '',
      lastName: rawRecord.last_name || '',
      email: rawRecord.email || '',
      mobile: rawRecord.phonenumber || rawRecord.mobile || '',
      gender: resolvedGender,
      dob: rawRecord.date_of_birth || rawRecord.dob ? String(rawRecord.date_of_birth || rawRecord.dob).slice(0, 10) : '',
      address: rawRecord.address || '',
      state: resolvedStateName,
      state_id: resolvedStateId,
      city: resolvedCityName,
      city_id: resolvedCityId,
      zipcode: rawRecord.zipcode || ''
    });

    setShowAuthorAdminModal(true);
  };

  const fetchAuthorAdmins = async () => {
    try {
      const res = await api.vdadmins.getAuthorAdmin();
      let list = [];
      if (Array.isArray(res)) {
        list = res.map(item => (item && item.json) ? item.json : item);
      } else if (res && Array.isArray(res.data)) {
        list = res.data.map(item => (item && item.json) ? item.json : item);
      } else if (res && Array.isArray(res.authorAdmins)) {
        list = res.authorAdmins.map(item => (item && item.json) ? item.json : item);
      } else if (res && typeof res === 'object' && res.json) {
        list = [res.json];
      } else if (res && typeof res === 'object' && (res.name || res.email || res.first_name || res.id)) {
        list = [res];
      } else if (res && typeof res === 'object') {
        const arrayProp = Object.values(res).find(val => Array.isArray(val));
        if (arrayProp) list = arrayProp.map(item => (item && item.json) ? item.json : item);
      }
      setAuthorAdmins(list);
    } catch (err) {
      console.error("Failed to fetch author admins:", err);
      setAuthorAdmins([]);
    }
  };

  const handleAuthorAdminSubmit = async (e) => {
    e.preventDefault();

    if (!authorAdminForm.firstName || !authorAdminForm.firstName.trim()) {
      showError('Please fill out first name');
      return;
    }
    if (!authorAdminForm.lastName || !authorAdminForm.lastName.trim()) {
      showError('Please fill out last name');
      return;
    }
    if (!authorAdminForm.email || !authorAdminForm.email.trim()) {
      showError('Please fill out email address');
      return;
    }
    if (!authorAdminForm.mobile || !authorAdminForm.mobile.trim()) {
      showError('Please fill out phone number');
      return;
    }
    if (authorAdminForm.mobile.replace(/\D/g, '').length !== 10) {
      showError('Phone number must be exactly 10 digits');
      return;
    }
    if (!authorAdminForm.gender) {
      showError('Please select gender');
      return;
    }
    if (!authorAdminForm.dob) {
      showError('Please select date of birth');
      return;
    }
    if (!authorAdminForm.address || !authorAdminForm.address.trim()) {
      showError('Please fill out address');
      return;
    }
    if (!authorAdminForm.state_id && !authorAdminForm.state) {
      showError('Please select state');
      return;
    }
    if (!authorAdminForm.city_id && !authorAdminForm.city) {
      showError('Please select city');
      return;
    }
    if (!authorAdminForm.zipcode || !authorAdminForm.zipcode.trim()) {
      showError('Please fill out zipcode');
      return;
    }
    if (authorAdminForm.zipcode.replace(/\D/g, '').length !== 6) {
      showError('Zipcode must be exactly 6 digits');
      return;
    }

    setAuthorAdminFormLoading(true);
    try {
      const payload = {
        first_name: authorAdminForm.firstName.trim(),
        last_name: authorAdminForm.lastName.trim(),
        email: authorAdminForm.email.trim(),
        phonenumber: authorAdminForm.mobile.trim(),
        mobile: authorAdminForm.mobile.trim(),
        gender_id: authorAdminForm.gender ? (parseInt(authorAdminForm.gender, 10) || authorAdminForm.gender) : null,
        date_of_birth: authorAdminForm.dob ? new Date(authorAdminForm.dob).toISOString() : null,
        address: authorAdminForm.address.trim(),
        state_id: authorAdminForm.state_id || authorAdminForm.state,
        state: String(authorAdminForm.state || authorAdminForm.state_id).trim(),
        city_id: authorAdminForm.city_id || authorAdminForm.city,
        city: String(authorAdminForm.city || authorAdminForm.city_id).trim(),
        zipcode: authorAdminForm.zipcode.trim()
      };

      await api.vdadmins.addAuthorAdmin(payload);
      showSuccess('Author Admin added successfully!');

      setShowAuthorAdminModal(false);
      setAuthorAdminForm({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        gender: '',
        dob: '',
        address: '',
        state: '',
        state_id: '',
        city: '',
        city_id: '',
        zipcode: ''
      });
      fetchAuthorAdmins();
    } catch (err) {
      console.error('Failed to submit author admin:', err);
      showError(err?.message || 'Failed to save author admin');
    } finally {
      setAuthorAdminFormLoading(false);
    }
  };

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

  const fetchGenders = async () => {
    try {
      const res = await api.users.getGender();
      console.log('Fetched user genders:', res);
      let list = [];
      if (Array.isArray(res)) {
        list = res.map(item => item.json || item);
      } else if (res && Array.isArray(res.data)) {
        list = res.data.map(item => item.json || item);
      } else if (res && typeof res === 'object') {
        const arrayProp = Object.values(res).find(val => Array.isArray(val));
        if (arrayProp) list = arrayProp.map(item => item.json || item);
      }
      setGenders(list);
      return list;
    } catch (e) {
      console.error('Failed to fetch user genders', e);
      setGenders([]);
      return [];
    }
  };

  const fetchSubCategories = async (categoryId = null) => {
    setLoadingSubCategories(true);
    try {
      let res;
      if (categoryId) {
        res = await api.videos.getSubCategories(categoryId);
      } else {
        res = await api.vdcategories.getSubCategories();
      }
      const subCats = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      setSubCategories(subCats);
      if (categoryId) {
        if (subCats.length > 0) {
          setUploadForm(prev => ({ ...prev, subCategory: subCats[0].id || subCats[0].name }));
        } else {
          setUploadForm(prev => ({ ...prev, subCategory: '' }));
        }
      }
      return subCats;
    } catch (e) {
      console.error('Failed to fetch sub categories:', e);
      setSubCategories([]);
      if (categoryId) setUploadForm(prev => ({ ...prev, subCategory: '' }));
      return [];
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
      const rawList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      const validCourses = rawList.filter(c => c && typeof c === 'object' && Object.keys(c).length > 0 && (c.id || c.title || c.course_title || c.name));
      setCourses(validCourses);
    } catch (e) {
      console.error(e);
      setCourses([]);
    }
  };

  const addChapter = () => {
    setChapters(prev => {
      const newId = prev.length > 0 ? Math.max(...prev.map(c => c.id)) + 1 : 1;
      const defaultVisibility = visibilities[0]?.id || '';
      return [
        ...prev,
        {
          id: newId,
          title: `Chapter ${newId}`,
          description: '',
          visibility: defaultVisibility,
          order: newId,
          videos: []
        }
      ];
    });
  };

  const removeChapter = (id) => {
    setChapters(prev => prev.filter(c => c.id !== id));
  };

  const updateChapterProp = (id, prop, val) => {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, [prop]: val } : c));
  };

  const addVideoToChapter = (chapterId) => {
    setChapters(prev => prev.map(ch => {
      if (ch.id !== chapterId) return ch;
      const newId = ch.videos.length > 0 ? Math.max(...ch.videos.map(v => v.id)) + 1 : 1;
      return {
        ...ch,
        videos: [
          ...ch.videos,
          { id: newId, title: 'New Lesson', file: null, fileName: '', thumbnail: null, thumbName: '', duration: '', isPreview: false }
        ]
      };
    }));
  };

  const removeVideoFromChapter = (chapterId, videoId) => {
    setChapters(prev => prev.map(ch => {
      if (ch.id !== chapterId) return ch;
      return {
        ...ch,
        videos: ch.videos.filter(v => v.id !== videoId)
      };
    }));
  };

  const updateVideoProp = (chapterId, videoId, prop, val) => {
    setChapters(prev => prev.map(ch => {
      if (ch.id !== chapterId) return ch;
      return {
        ...ch,
        videos: ch.videos.map(v => v.id === videoId ? { ...v, [prop]: val } : v)
      };
    }));
  };

  // Chapter Quiz Helpers
  const toggleChapterQuiz = (chapterId) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId) return ch;
      if (ch.quiz) {
        return { ...ch, quiz: null };
      } else {
        return {
          ...ch,
          quiz: {
            title: `${ch.title || 'Chapter'} Quiz`,
            questions: [
              {
                id: 1,
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0
              }
            ]
          }
        };
      }
    }));
  };

  const updateQuizTitle = (chapterId, title) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId || !ch.quiz) return ch;
      return {
        ...ch,
        quiz: {
          ...ch.quiz,
          title
        }
      };
    }));
  };

  const addQuizQuestion = (chapterId) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId) return ch;
      const currentQuestions = ch.quiz?.questions || [];
      const newId = currentQuestions.length > 0 ? Math.max(...currentQuestions.map(q => q.id)) + 1 : 1;
      const newQuestion = {
        id: newId,
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      };
      return {
        ...ch,
        quiz: {
          title: ch.quiz?.title || `${ch.title || 'Chapter'} Quiz`,
          questions: [...currentQuestions, newQuestion]
        }
      };
    }));
  };

  const removeQuizQuestion = (chapterId, questionId) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId || !ch.quiz) return ch;
      const updatedQuestions = ch.quiz.questions.filter(q => q.id !== questionId);
      return {
        ...ch,
        quiz: {
          ...ch.quiz,
          questions: updatedQuestions
        }
      };
    }));
  };

  const updateQuestionText = (chapterId, questionId, text) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId || !ch.quiz) return ch;
      return {
        ...ch,
        quiz: {
          ...ch.quiz,
          questions: ch.quiz.questions.map(q => q.id === questionId ? { ...q, question: text } : q)
        }
      };
    }));
  };

  const updateQuestionOption = (chapterId, questionId, optIdx, val) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId || !ch.quiz) return ch;
      return {
        ...ch,
        quiz: {
          ...ch.quiz,
          questions: ch.quiz.questions.map(q => {
            if (q.id !== questionId) return q;
            const newOptions = [...q.options];
            newOptions[optIdx] = val;
            return { ...q, options: newOptions };
          })
        }
      };
    }));
  };

  const updateQuestionCorrectAnswer = (chapterId, questionId, correctIdx) => {
    setChapters(chapters.map(ch => {
      if (ch.id !== chapterId || !ch.quiz) return ch;
      return {
        ...ch,
        quiz: {
          ...ch.quiz,
          questions: ch.quiz.questions.map(q => q.id === questionId ? { ...q, correctAnswer: correctIdx } : q)
        }
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
  const formatSecondsToTime = (totalSeconds) => {
    if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    const pad = (num) => num.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      if (!file) {
        resolve(0);
        return;
      }
      try {
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        videoElement.muted = true;
        videoElement.playsInline = true;

        const objectUrl = URL.createObjectURL(file);

        let resolved = false;
        let timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try { URL.revokeObjectURL(objectUrl); } catch (e) {}
            resolve(0);
          }
        }, 6000);

        const handleMetadata = () => {
          if (resolved) return;
          const dur = videoElement.duration;
          if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
            resolved = true;
            clearTimeout(timeoutId);
            try { URL.revokeObjectURL(objectUrl); } catch (e) {}
            resolve(Math.round(dur));
          }
        };

        videoElement.onloadedmetadata = handleMetadata;
        videoElement.onloadeddata = handleMetadata;
        videoElement.ondurationchange = handleMetadata;

        videoElement.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            try { URL.revokeObjectURL(objectUrl); } catch (e) {}
            resolve(0);
          }
        };

        videoElement.src = objectUrl;
        videoElement.load();
      } catch (err) {
        console.warn("Could not read video duration from file", err);
        resolve(0);
      }
    });
  };

  const handleChapterVideoUpload = async (chapterId, videoId, file) => {
    if (!file) return;

    // Automatically capture duration from video file immediately and autofill duration field
    const capturedDuration = await getVideoDuration(file);
    if (capturedDuration > 0) {
      const formattedDuration = formatSecondsToTime(capturedDuration);
      updateVideoProp(chapterId, videoId, 'duration', formattedDuration);
    }
    
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

    // 1. Basic Course Info Validations
    if (!courseForm.title?.trim()) {
      showError('Course Title is required');
      return;
    }
    if (!courseForm.description?.trim()) {
      showError('Course Description is required');
      return;
    }
    if (!courseForm.category) {
      showError('Category selection is required');
      return;
    }
    if (!courseForm.subCategory) {
      showError('Sub Category selection is required');
      return;
    }
    if (!courseForm.languageId) {
      showError('Language selection is required');
      return;
    }
    if (isSuperAdmin && !courseForm.visibility) {
      showError('Visibility selection is required');
      return;
    }
    const selectedVisObj = visibilities.find(v => v.id?.toString() === courseForm.visibility?.toString());
    const isPrivateVis = (selectedVisObj && (
      (selectedVisObj.name && selectedVisObj.name.toLowerCase() === 'private') ||
      (selectedVisObj.visibility && selectedVisObj.visibility.toString().toLowerCase() === 'private') ||
      (selectedVisObj.id && selectedVisObj.id.toString().toLowerCase() === 'private')
    )) || (courseForm.visibility && courseForm.visibility.toString().toLowerCase() === 'private');

    if (isSuperAdmin && isPrivateVis && !courseForm.adminId) {
      showError('Admin assignment selection is required for Private courses');
      return;
    }
    if (!courseForm.instructor?.trim()) {
      showError('Instructor / Author is required');
      return;
    }
    if (!courseForm.level?.toString().trim()) {
      showError('Course Level selection is required');
      return;
    }
    if (!courseThumbnailUrl?.trim()) {
      showError('Course Thumbnail is required');
      return;
    }
    if (!courseForm.totalChapters?.toString().trim()) {
      showError('Total Chapters field is required');
      return;
    }

    // 2. Chapters Required Validation (Exact popup text "Chapters required")
    if (!chapters || chapters.length === 0) {
      showError('Chapters required');
      return;
    }

    // 3. Total Chapters Count Mismatch Validation
    const expectedChaptersCount = parseInt(courseForm.totalChapters, 10);
    if (!isNaN(expectedChaptersCount) && expectedChaptersCount > 0 && chapters.length < expectedChaptersCount) {
      showError(`Please add all ${expectedChaptersCount} chapters specified in Total Chapters field (Current added: ${chapters.length})`);
      return;
    }

    // 4. Chapter Mandatory Fields Validation
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (!ch.title?.trim()) {
        showError(`Chapter ${i + 1}: Chapter title is required`);
        return;
      }
      if (!ch.description?.trim()) {
        showError(`Chapter ${i + 1}: Chapter description is required`);
        return;
      }
      if (!ch.videos || ch.videos.length === 0) {
        showError(`Chapter ${i + 1} (${ch.title || 'Untitled'}): At least one video/lesson is required`);
        return;
      }

      for (let j = 0; j < ch.videos.length; j++) {
        const v = ch.videos[j];
        if (!v.title?.trim()) {
          showError(`Chapter ${i + 1} Lesson ${j + 1}: Lesson title is required`);
          return;
        }
        if (!v.videoUrl?.trim()) {
          showError(`Chapter ${i + 1} Lesson ${j + 1} ("${v.title || 'Lesson'}"): Video file or Video URL is required`);
          return;
        }
      }

      // 5. Quiz Validation (if quiz is added/enabled)
      if (ch.quiz || ch.hasQuiz) {
        const qz = ch.quiz;
        if (!qz || !qz.title?.trim()) {
          showError(`Chapter ${i + 1} Quiz: Quiz title is required`);
          return;
        }
        if (!qz.questions || qz.questions.length === 0) {
          showError(`Chapter ${i + 1} Quiz: At least one question is required`);
          return;
        }

        for (let qIdx = 0; qIdx < qz.questions.length; qIdx++) {
          const q = qz.questions[qIdx];
          if (!q.question?.trim()) {
            showError(`Chapter ${i + 1} Quiz (Question ${qIdx + 1}): Question statement is required`);
            return;
          }
          if (!q.options || q.options.length < 2 || q.options.some(opt => !opt?.trim())) {
            showError(`Chapter ${i + 1} Quiz (Question ${qIdx + 1}): All option choices must be filled`);
            return;
          }
          if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
            showError(`Chapter ${i + 1} Quiz (Question ${qIdx + 1}): Correct answer selection is required`);
            return;
          }
        }
      }
    }

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

      const encryptedThumbnail = await encryptUrl(courseThumbnailUrl);
      const encryptedBanner = await encryptUrl(courseBannerUrl);

      const encryptedChapters = await Promise.all(chapters.map(async (ch) => {
        const encryptedVideos = await Promise.all((ch.videos || []).map(async (v) => {
          return {
            title: v.title,
            fileName: v.fileName || 'video.mp4',
            videoUrl: await encryptUrl(v.videoUrl || ''),
            thumbName: v.thumbName || 'thumbnail.png',
            thumbnailUrl: await encryptUrl(v.thumbnailUrl || ''),
            duration: v.duration,
            isPreview: v.isPreview
          };
        }));
        const chapterObj = {
          title: ch.title,
          description: ch.description,
          visibility: ch.visibility || visibilities[0]?.id || '',
          order: ch.order,
          videos: encryptedVideos
        };

        if (ch.quiz && Array.isArray(ch.quiz.questions) && ch.quiz.questions.length > 0) {
          chapterObj.quiz = {
            title: ch.quiz.title || `${ch.title || 'Chapter'} Quiz`,
            questions: ch.quiz.questions.map((q, idx) => ({
              id: q.id || idx + 1,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              answer: q.options[q.correctAnswer] || ''
            }))
          };
        }

        return chapterObj;
      }));

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
        thumbnail: encryptedThumbnail,
        banner: encryptedBanner,
        chapters: encryptedChapters
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

    if (!userForm.firstName || !userForm.firstName.trim()) {
      showError('Please fill out first name');
      return;
    }
    if (!userForm.lastName || !userForm.lastName.trim()) {
      showError('Please fill out last name');
      return;
    }
    if (!userForm.email || !userForm.email.trim()) {
      showError('Please fill out email address');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(userForm.email)) {
      showError('Please enter a valid email address with a valid domain suffix (e.g. name@domain.com)');
      return;
    }
    if (!userForm.mobile || !userForm.mobile.trim()) {
      showError('Please fill out phone number');
      return;
    }
    if (userForm.mobile.length !== 10) {
      showError('Phone number must be exactly 10 digits');
      return;
    }
    if (!userForm.gender) {
      showError('Please select gender');
      return;
    }
    if (!userForm.dob) {
      showError('Please select date of birth');
      return;
    }
    if (!userForm.address || !userForm.address.trim()) {
      showError('Please fill out address');
      return;
    }
    if (!userForm.city || !userForm.city.trim()) {
      showError('Please fill out city');
      return;
    }
    if (!userForm.state || !userForm.state.trim()) {
      showError('Please fill out state');
      return;
    }
    if (!userForm.zipcode || !userForm.zipcode.trim()) {
      showError('Please fill out zipcode');
      return;
    }
    if (userForm.zipcode.length !== 6) {
      showError('Zipcode must be exactly 6 digits');
      return;
    }

    setUserFormLoading(true);
    try {
      const dataToSave = {
        first_name: userForm.firstName.trim(),
        last_name: userForm.lastName.trim(),
        email: userForm.email.trim(),
        phonenumber: userForm.mobile.trim(),
        gender_id: userForm.gender ? (parseInt(userForm.gender, 10) || userForm.gender) : null,
        date_of_birth: userForm.dob ? new Date(userForm.dob).toISOString() : null,
        address: userForm.address.trim(),
        state_id: userForm.state_id || null,
        state: userForm.state ? userForm.state.trim() : '',
        city_id: userForm.city_id || null,
        city: userForm.city ? userForm.city.trim() : '',
        zipcode: userForm.zipcode.trim()
      };

      if (editingUser) {
        await api.users.update(editingUser.id, dataToSave);
        showSuccess('User updated successfully');
      } else {
        await api.users.create(dataToSave);
        showSuccess('User added successfully');
      }
      setShowUserModal(false);
      setUserForm({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        gender: '',
        dob: '',
        state_id: '',
        state: '',
        city_id: '',
        city: '',
        zipcode: '',
        address: ''
      });
      setEditingUser(null);
      fetchUsers();
      fetchDashboardData();
    } catch (err) {
      if (err.status === 422) {
        showError('Phone Number Already exist');
      } else if (err.status === 433) {
        showError('Email Already exist');
      } else {
        showError(err.message || 'Failed to save user');
      }
    } finally {
      setUserFormLoading(false);
    }
  };

  const formatDateToYYYYMMDD = (dobRaw) => {
    if (!dobRaw) return '';
    const str = String(dobRaw).trim();
    
    // Case 1: ISO string or YYYY-MM-DD e.g. "1976-08-12T00:00:00.000Z" or "1976-08-12"
    if (str.includes('-')) {
      const datePart = str.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    
    // Case 2: Slash format e.g. "08/12/1976" or "1976/08/12"
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // MM/DD/YYYY format
          const month = parts[0].padStart(2, '0');
          const day = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD format
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
    }

    // Fallback: local date parsing without UTC conversion
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error("Error formatting date", e);
    }
    return str;
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
    
    const matchedGender = genders.find(g => 
      String(g.name).toLowerCase() === String(userData.gender).toLowerCase() || 
      String(g.id) === String(userData.gender_id || userData.gender)
    );
    const genderVal = matchedGender ? matchedGender.id : (userData.gender_id || userData.gender || '');

    const formattedDob = formatDateToYYYYMMDD(userData.date_of_birth || userData.dob);

    const curStatesList = statesList.length > 0 ? statesList : await fetchStates();
    
    const matchedState = curStatesList.find(s => 
      String(s.id) === String(userData.state_id || userData.state) ||
      String(s.name).toLowerCase() === String(userData.state).toLowerCase()
    );
    const stateIdVal = matchedState ? matchedState.id : (userData.state_id || userData.state || '');
    const stateNameVal = matchedState ? matchedState.name : (userData.state || '');

    let curCitiesList = [];
    if (stateIdVal) {
      curCitiesList = await fetchCities(stateIdVal);
    }

    const matchedCity = curCitiesList.find(c => 
      String(c.id) === String(userData.city_id || userData.city) ||
      String(c.name).toLowerCase() === String(userData.city).toLowerCase()
    );
    const cityIdVal = matchedCity ? matchedCity.id : (userData.city_id || userData.city || '');
    const cityNameVal = matchedCity ? matchedCity.name : (userData.city || '');

    setUserForm({
      firstName: userData.first_name || userData.firstName || '',
      lastName: userData.last_name || userData.lastName || '',
      email: userData.email || '',
      mobile: userData.phonenumber || userData.mobile || '',
      gender: genderVal,
      dob: formattedDob,
      state_id: stateIdVal,
      state: stateNameVal,
      city_id: cityIdVal,
      city: cityNameVal,
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

  // --- Category CRUD Handlers ---
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    const cleanName = String(categoryForm.name || '').trim();
    if (!cleanName) {
      showError("Please fill out category name");
      return;
    }

    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.id, cleanName, categoryForm.description ? categoryForm.description.trim() : '');
        showSuccess("Category updated successfully!");
      } else {
        await api.categories.create(cleanName, categoryForm.description ? categoryForm.description.trim() : '');
        showSuccess("Category created successfully!");
      }
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      setEditingCategory(null);
      fetchCategories();
      fetchDashboardData();
    } catch (err) {
      console.error("Category error:", err);
      const is410 = err?.status === 410 || 
                    err?.response?.status === 410 || 
                    String(err?.message || '').includes('410') || 
                    String(err?.message || '').toLowerCase().includes('already exist');

      if (is410) {
        showError("Category already exist");
      } else {
        showError(err?.message || 'Failed to save category');
      }
    }
  };

  const handleDeleteCategory = (id) => {
    showConfirmDelete('Are you sure you want to delete this category?', async () => {
      try {
        await api.vdcategories.deleteCategory(id);
        fetchCategories();
        fetchDashboardData();
        showSuccess("Category deleted successfully!");
      } catch (err) {
        showError(err.message || 'Failed to delete category');
      }
    });
  };

  // --- Sub Category CRUD Handlers ---
  const handleSubCategorySubmit = async (e) => {
    e.preventDefault();
    if (!subCategoryForm.cat_id) {
      showError("Please select a parent Category");
      return;
    }
    const cleanName = String(subCategoryForm.name || '').trim();
    if (!cleanName) {
      showError("Please fill out sub category name");
      return;
    }

    try {
      if (editingSubCategory) {
        const subCatId = editingSubCategory.id || editingSubCategory.sub_category_id;
        await api.vdcategories.editSubCategory(
          subCatId,
          subCategoryForm.cat_id,
          cleanName,
          subCategoryForm.description ? subCategoryForm.description.trim() : ''
        );
        showSuccess("Sub category updated successfully!");
      } else {
        await api.vdcategories.addSubCategory(
          subCategoryForm.cat_id,
          cleanName,
          subCategoryForm.description ? subCategoryForm.description.trim() : ''
        );
        showSuccess("Sub category created successfully!");
      }
      setShowSubCategoryModal(false);
      setSubCategoryForm({ id: '', cat_id: '', name: '', description: '' });
      setEditingSubCategory(null);
      fetchSubCategories();
    } catch (err) {
      console.error("SubCategory submission error:", err);
      const is410 = err?.status === 410 || 
                    err?.response?.status === 410 || 
                    String(err?.message || '').includes('410') || 
                    String(err?.message || '').toLowerCase().includes('already exist');

      if (is410) {
        showError("Sub category already exist");
      } else {
        showError(err?.message || 'Failed to save sub category');
      }
    }
  };

  const handleDeleteSubCategory = (id) => {
    showConfirmDelete('Are you sure you want to delete this sub category?', async () => {
      try {
        await api.vdcategories.deleteSubCategory(id);
        fetchSubCategories();
        showSuccess("Sub category deleted successfully!");
      } catch (err) {
        showError(err.message || 'Failed to delete sub category');
      }
    });
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
      showError('Please select a video file to upload');
      return;
    }

    if (!thumbnailFile) {
      showError('Thumbnail Image is required');
      return;
    }

    if (await verifyFileContent(videoFile)) return;
    if (await verifyFileContent(thumbnailFile)) return;

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

      const encryptedVideoUrl = await encryptUrl(videoUrl);
      const encryptedThumbnailUrl = await encryptUrl(thumbnailUrl);

      const registerPayload = {
        title: uploadForm.title,
        description: uploadForm.description,
        category: uploadForm.category,
        subCategory: uploadForm.subCategory,
        subcategory_id: uploadForm.subCategory,
        language_id: uploadForm.languageId,
        tags: uploadForm.tags,
        visibility: uploadForm.visibility,
        videoUrl: encryptedVideoUrl,
        thumbnailUrl: encryptedThumbnailUrl
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




  const menuStructure = [
    {
      title: 'Dashboard',
      iconClass: 'fa-solid fa-house',
      iconColor: '#e50914',
      items: []
    },
    {
      title: 'Author Admin',
      iconClass: 'fa-solid fa-user-pen',
      iconColor: '#f59e0b',
      items: []
    },
    {
      title: 'User Management',
      iconClass: 'fa-solid fa-users',
      iconColor: '#38bdf8',
      items: [
        { id: 'users_all', label: 'Users', iconClass: 'fa-solid fa-user-group' },
        { id: 'users_logs', label: 'User Activity Logs', iconClass: 'fa-solid fa-clock-rotate-left' },
        { id: 'users_blocked', label: 'Blocked Users', iconClass: 'fa-solid fa-user-slash' }
      ]
    },
    {
      title: isSuperAdmin ? 'Content Management' : 'Video Management',
      iconClass: 'fa-solid fa-film',
      iconColor: '#ec4899',
      items: isSuperAdmin ? [
        { id: 'video_upload', label: 'Upload video', iconClass: 'fa-solid fa-cloud-arrow-up' },
        { id: 'course_upload', label: 'Upload Course', iconClass: 'fa-solid fa-folder-plus' },
        { id: 'course_all', label: 'All Courses', iconClass: 'fa-solid fa-layer-group' },
        { id: 'categories', label: 'Categories', iconClass: 'fa-solid fa-list-check' },
        { id: 'sub_categories', label: 'Sub Category', iconClass: 'fa-solid fa-sitemap' }
      ] : [
        { id: 'video_upload', label: 'Upload Video', iconClass: 'fa-solid fa-cloud-arrow-up' },
        { id: 'course_upload', label: 'Upload Course', iconClass: 'fa-solid fa-folder-plus' },
        { id: 'video_all', label: 'All Videos', iconClass: 'fa-solid fa-video' },
        { id: 'course_all', label: 'All Courses', iconClass: 'fa-solid fa-layer-group' },
        { id: 'categories', label: 'Categories', iconClass: 'fa-solid fa-list-check' },
        { id: 'sub_categories', label: 'Sub Category', iconClass: 'fa-solid fa-sitemap' }
      ]
    },
    {
      title: 'Analytics',
      iconClass: 'fa-solid fa-chart-line',
      iconColor: '#10b981',
      items: [
        { id: 'analytics_video', label: 'Video Analytics', iconClass: 'fa-solid fa-chart-column' },
        { id: 'analytics_user', label: 'User Analytics', iconClass: 'fa-solid fa-chart-pie' }
      ]
    },
    {
      title: 'Reports',
      iconClass: 'fa-solid fa-file-invoice-dollar',
      iconColor: '#6366f1',
      items: []
    },
    {
      title: 'Settings',
      iconClass: 'fa-solid fa-sliders',
      iconColor: '#8b5cf6',
      items: [
        { id: 'set_general', label: 'General Settings', iconClass: 'fa-solid fa-gear' },
        { id: 'set_languages', label: 'Languages', iconClass: 'fa-solid fa-language' }
      ]
    },
    {
      title: 'Administration',
      iconClass: 'fa-solid fa-building-user',
      iconColor: '#06b6d4',
      items: [
        { id: 'admin_users', label: 'Admin Management', iconClass: 'fa-solid fa-user-gear' },
        { id: 'admin_roles', label: 'Roles & Permissions', iconClass: 'fa-solid fa-key' },
        { id: 'admin_audit', label: 'Audit Logs', iconClass: 'fa-solid fa-receipt' },
        { id: 'admin_activity', label: 'Activity Logs', iconClass: 'fa-solid fa-list-check' }
      ]
    },
    {
      title: 'AI Insights',
      iconClass: 'fa-solid fa-brain',
      iconColor: '#f43f5e',
      items: [
        { id: 'ai_churn', label: 'Churn Prediction', iconClass: 'fa-solid fa-user-minus' },
        { id: 'ai_trending', label: 'Trending Videos', iconClass: 'fa-solid fa-fire' },
        { id: 'ai_recs', label: 'User Recommendations', iconClass: 'fa-solid fa-wand-magic-sparkles' },
        { id: 'ai_time', label: 'Best Upload Time', iconClass: 'fa-solid fa-business-time' }
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

  const visibleMenuStructure = menuStructure.filter(section => {
    if (isAuthorAdminUser) {
      if (section.title === 'Author Admin' || section.title === 'Administration' || section.title === 'AI Insights') {
        return false;
      }
    }
    return true;
  });

  const getActiveTabLabel = () => {
    for (const section of visibleMenuStructure) {
      if (section.title === 'Author Admin' && activeTab === 'author_admin') return 'Author Admin';
      const item = section.items.find(i => i.id === activeTab);
      if (item) return item.label;
    }
    if (activeTab === 'author_admin') return 'Author Admin';
    if (activeTab === 'users_all') return 'Users';
    if (activeTab === 'rep_export') return 'Reports';
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
        paddingTop: '12px',
        paddingBottom: '12px',
        paddingLeft: '12px',
        paddingRight: '12px',
        marginTop: '0px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'fixed',
        top: '60px',
        left: '0px',
        bottom: '0px',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        zIndex: 995,
        transition: 'transform 0.3s ease, left 0.3s ease'
      }} className={`youtube-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Mobile Sidebar Brand Header */}
        {isMobile && (
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
        )}

        {visibleMenuStructure.map((section, idx) => {
          const isDashboard = section.title === 'Dashboard';
          const isAuthorAdmin = section.title === 'Author Admin';
          const isReports = section.title === 'Reports';
          const isSelected = (isDashboard && activeTab === 'overview') || 
                             (isAuthorAdmin && activeTab === 'author_admin') || 
                             (isReports && activeTab === 'rep_export');
          return (
            <div key={section.title} style={{ marginBottom: '6px', marginTop: '0px' }}>
              <button 
                onClick={() => {
                  if (isDashboard) {
                    setActiveTab('overview');
                    setError('');
                    setUploadSuccess('');
                    if (isSidebarOpen && toggleSidebar) {
                      toggleSidebar();
                    }
                  } else if (isAuthorAdmin) {
                    setActiveTab('author_admin');
                    setError('');
                    setUploadSuccess('');
                    if (isSidebarOpen && toggleSidebar) {
                      toggleSidebar();
                    }
                  } else if (isReports) {
                    setActiveTab('rep_export');
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className={section.iconClass || 'fa-solid fa-circle'} style={{ fontSize: '15px', color: section.iconColor || 'var(--accent-primary)', width: '18px', textAlign: 'center' }}></i>
                  <span>{t('admin.menu.' + section.title.toLowerCase().replace(/ & /g, '_and_').replace(/\s+/g, '_'), section.title)}</span>
                </span>
                {!isDashboard && !isReports && !isAuthorAdmin && (
                  <i className={`fa-solid ${expandedSections[section.title] ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '11px', opacity: 0.7 }}></i>
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
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.iconClass && <i className={item.iconClass} style={{ fontSize: '13px', width: '16px', opacity: 0.85, textAlign: 'center' }}></i>}
                        <span>{t('admin.menu.' + item.id, item.label)}</span>
                      </span>
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
      <div style={justContent ? { flex: 1, minWidth: 0 } : {
        marginLeft: '260px',
        padding: '50px',
        width: 'calc(100% - 260px)',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }} className="admin-content-container">
        
        {/* Top Header Row */}
        {!justContent && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800 }}>
                {getActiveTabLabel()}
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>Welcome to the Admin Command Control center.</p>
            </div>
            {activeTab === 'rep_export' && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => handleExport('csv')} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                  Export CSV
                </button>
                <button onClick={() => handleExport('excel')} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                  Export Excel
                </button>
                <button onClick={() => handleExport('pdf')} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                  Export PDF
                </button>
              </div>
            )}
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
          <ThreeDLoader text="Loading telemetry data..." />
        ) : (
          <>
            {/* OVERVIEW CONTENT VIEW */}
            {activeTab === 'overview' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

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
                          const registeredCount = parseInt(stats?.total_users ?? stats?.totalUsers ?? stats?.cards?.totalUsers ?? (users.length || 0), 10);
                          const rawLoggedIn = stats?.funnel?.loggedIn ?? stats?.funnel?.loggedin ?? stats?.funnel?.login;
                          const loggedInCount = (rawLoggedIn !== undefined && rawLoggedIn !== null) ? parseInt(rawLoggedIn, 10) : 0;
                          
                          const rawStarted = stats?.funnel?.startedVideo ?? stats?.funnel?.startedvideo ?? stats?.funnel?.started;
                          const startedCount = (rawStarted !== undefined && rawStarted !== null) ? parseInt(rawStarted, 10) : 0;

                          const rawCompleted = stats?.funnel?.completedVideo ?? stats?.funnel?.completedvideo ?? stats?.funnel?.completed;
                          const completedCount = (rawCompleted !== undefined && rawCompleted !== null) ? parseInt(rawCompleted, 10) : 0;

                          const maxBaseline = Math.max(1, registeredCount, loggedInCount, startedCount, completedCount);
                          const loggedInPct = Math.round((loggedInCount / maxBaseline) * 100);
                          const startedPct = Math.round((startedCount / maxBaseline) * 100);
                          const completedPct = Math.round((completedCount / maxBaseline) * 100);

                          return [
                            { label: 'Registered Users', count: registeredCount, color: 'var(--accent-primary)', pct: 100 },
                            { label: 'Logged In', count: loggedInCount, color: 'var(--accent-secondary)', pct: Math.min(100, loggedInPct) },
                            { label: 'Started Video', count: startedCount, color: '#3b82f6', pct: Math.min(100, startedPct) },
                            { label: 'Completed Video', count: completedCount, color: '#10b981', pct: Math.min(100, completedPct) }
                          ];
                        })().map(level => (
                          <div key={level.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, width: '130px' }}>{level.label}</span>
                            <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                              <div style={{ 
                                width: `${Math.max(level.pct, level.count > 0 ? 5 : 0)}%`, 
                                height: '100%', 
                                background: `linear-gradient(90deg, ${level.color} 0%, rgba(255,255,255,0.05) 100%)`,
                                borderRadius: '12px',
                                transition: 'width 0.8s ease'
                              }} />
                              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: level.count > 0 ? '#fff' : 'var(--text-secondary)' }}>
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
                        <PaginatedTable
                          headers={['Video Lesson', 'Views', 'Watch Time', 'Completion %', 'Likes']}
                          data={Array.isArray(stats?.top_content) ? stats.top_content : (Array.isArray(stats?.topContent) ? stats.topContent : [])}
                          emptyMessage="No data available"
                          renderRow={(row, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{row.videoLesson || row.title || row.video || 'N/A'}</td>
                              <td>{row.views !== undefined ? row.views : 0}</td>
                              <td>{row.watchTime || row.time || row.watch_time || '0h'}</td>
                              <td>{row.completionPercentage !== undefined ? `${row.completionPercentage}%` : (row.comp ? `${row.comp}%` : '0%')}</td>
                              <td>{row.likes !== undefined ? row.likes : 0}</td>
                            </tr>
                          )}
                        />
                      </div>
                    </div>

                    {/* Video Categories & User widgets */}
                    <div className="dashboard-widgets-grid">
                      <div className="glass-card">
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Video Categories</h3>
                        <div className="table-container">
                          <PaginatedTable
                            headers={['Category', 'Videos', 'Views']}
                            data={stats?.category_performance || stats?.categoryPerformance || [
                              { categoryName: 'Science', videos: 25, views: '50K' },
                              { categoryName: 'Finance', videos: 18, views: '42K' },
                              { categoryName: 'Technology', videos: 12, views: '35K' }
                            ]}
                            emptyMessage="No category metrics found"
                            renderRow={(cat, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>{cat.categoryName || cat.name}</td>
                                <td>{cat.videos !== undefined ? cat.videos : cat.count}</td>
                                <td>{cat.views}</td>
                              </tr>
                            )}
                          />
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

            {/* AUTHOR ADMIN VIEW */}
            {activeTab === 'author_admin' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Author Admin</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Manage author admin accounts, profiles, and publishing access.</p>
                  </div>
                  <button 
                    onClick={handleAddAuthorAdminClick}
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <i className="fa-solid fa-plus"></i> Add Author Admin
                  </button>
                </div>

                <div className="table-container">
                  <PaginatedTable
                    headers={['Name', 'Email', 'Mobile', 'Status', 'Actions']}
                    data={authorAdmins}
                    emptyMessage="No author admins registered yet"
                    renderRow={(item, index) => {
                      const admin = (item && item.json) ? item.json : item;
                      const isAdminActive = admin.status === true || String(admin.status).toLowerCase() === 'true' || String(admin.status).toLowerCase() === 'active';
                      const fullName = admin.first_name ? `${admin.first_name} ${admin.last_name || ''}`.trim() : admin.name || 'Author Admin';
                      return (
                        <tr key={admin.id || index}>
                          <td>
                            <UserAvatar name={fullName} index={index} />
                          </td>
                          <td style={{ color: 'var(--text-primary)' }}>{admin.email || '-'}</td>
                          <td style={{ color: 'var(--text-primary)' }}>{admin.phonenumber || admin.mobile || '-'}</td>
                          <td>
                            <TableStatusBadge status={isAdminActive} />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <TableActionButton
                                icon="fa-solid fa-pen"
                                title="Edit Author Admin"
                                onClick={() => handleEditAuthorAdminClick(admin)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* USERS_ALL CONTENT VIEW */}
            {activeTab === 'users_all' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <h2 style={{ fontSize: '20px' }}>{t('admin.tabUsers')}</h2>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <PremiumSelect
                      options={[
                        { id: 'all', name: 'All Status' },
                        { id: 'active', name: 'Active' },
                        { id: 'inactive', name: 'Inactive' }
                      ]}
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      searchable={false}
                      icon="fa-solid fa-filter"
                      style={{ width: '135px', minWidth: '135px' }}
                    />
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
                  <PaginatedTable
                    headers={['Name', t('auth.emailAddress'), 'Mobile', 'Status', t('admin.tableActions')]}
                    data={(Array.isArray(users) ? users : [])
                      .filter(user => {
                        const isUserActive = user.status === true || String(user.status).toLowerCase() === 'true' || String(user.status).toLowerCase() === 'active';
                        if (userStatusFilter === 'active') return isUserActive;
                        if (userStatusFilter === 'inactive') return !isUserActive;
                        return true;
                      })
                    }
                    emptyMessage="No users registered under this administrator"
                    renderRow={(user, index) => {
                      const isUserActive = user.status === true || String(user.status).toLowerCase() === 'true' || String(user.status).toLowerCase() === 'active';
                      return (
                        <tr key={user.id || index}>
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
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* VIDEO_UPLOAD CONTENT VIEW */}
            {activeTab === 'video_upload' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px', maxWidth: '1200px', margin: '0 auto', alignItems: 'start' }}>
                
                {/* LEFT COLUMN: Upload Video Form */}
                <div className="glass-card" style={{ margin: 0 }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Video File *</label>
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
                            if (file) {
                              const durationSec = await getVideoDuration(file);
                              if (durationSec > 0) {
                                setUploadForm(prev => ({ ...prev, duration: durationSec.toString() }));
                              }
                            }
                          }}
                          required
                          className="form-input"
                          style={{ fontSize: '13px', padding: '10px' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Thumbnail Image *</label>
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
                          required
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

                {/* RIGHT COLUMN: Live Video Preview Card */}
                <div className="glass-card" style={{ margin: 0, padding: '28px', position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(124, 58, 237, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#7c3aed'
                      }}>
                        <i className="fa-solid fa-eye" style={{ fontSize: '16px' }}></i>
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Live Video Preview</h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Learner View Card</span>
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                      Live Preview
                    </span>
                  </div>

                  {/* Media Screen Box */}
                  <div style={{
                    width: '100%',
                    height: '210px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: 'var(--bg-tertiary, #09090b)',
                    position: 'relative',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {videoPreviewUrl ? (
                      <video src={videoPreviewUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : thumbPreviewUrl ? (
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <img src={thumbPreviewUrl} alt="Thumbnail preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(0,0,0,0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            background: 'rgba(124, 58, 237, 0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.5)'
                          }}>
                            <i className="fa-solid fa-play" style={{ color: '#ffffff', fontSize: '20px', marginLeft: '3px' }}></i>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'rgba(124, 58, 237, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px auto'
                        }}>
                          <i className="fa-solid fa-photo-film" style={{ fontSize: '24px', color: '#7c3aed' }}></i>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
                          Select Video & Thumbnail file to preview
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Metadata Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      margin: 0,
                      color: 'var(--text-primary)',
                      wordBreak: 'break-word'
                    }}>
                      {uploadForm.title.trim() || 'Untitled Video Lesson'}
                    </h4>

                    <p style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {uploadForm.description.trim() || 'Provide a detailed description of this course lesson to see it previewed here in real-time.'}
                    </p>

                    {/* Category & SubCategory & Language Badges */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {(() => {
                        const selCat = categories.find(c => String(c.id) === String(uploadForm.category));
                        const catName = selCat ? (selCat.name || selCat.category_name) : null;
                        return catName ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'rgba(124, 58, 237, 0.15)',
                            color: '#7c3aed'
                          }}>
                            <i className="fa-solid fa-folder-open" style={{ marginRight: '6px', fontSize: '11px' }}></i>
                            {catName}
                          </span>
                        ) : null;
                      })()}

                      {(() => {
                        const selSubCat = subCategories.find(s => String(s.id || s.name) === String(uploadForm.subCategory));
                        const subCatName = selSubCat ? (selSubCat.name || selSubCat.sub_category_name) : (uploadForm.subCategory || null);
                        return subCatName ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#3b82f6'
                          }}>
                            <i className="fa-solid fa-sitemap" style={{ marginRight: '6px', fontSize: '11px' }}></i>
                            {subCatName}
                          </span>
                        ) : null;
                      })()}

                      {(() => {
                        const selLang = languages.find(l => String(l.id || l.language_id || l.name) === String(uploadForm.languageId));
                        const langName = selLang ? (selLang.name || selLang.title || selLang.language_name) : null;
                        return langName ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981'
                          }}>
                            <i className="fa-solid fa-language" style={{ marginRight: '6px', fontSize: '11px' }}></i>
                            {langName}
                          </span>
                        ) : null;
                      })()}

                      {uploadForm.visibility && (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          background: uploadForm.visibility === 'private' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: uploadForm.visibility === 'private' ? '#ef4444' : '#f59e0b'
                        }}>
                          <i className={`fa-solid ${uploadForm.visibility === 'private' ? 'fa-lock' : 'fa-globe'}`} style={{ marginRight: '6px', fontSize: '11px' }}></i>
                          {uploadForm.visibility}
                        </span>
                      )}
                    </div>

                    {/* Tag Chips */}
                    {uploadForm.tags && uploadForm.tags.trim() && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {uploadForm.tags.split(',').map((t, idx) => {
                          const tagClean = t.trim();
                          if (!tagClean) return null;
                          return (
                            <span key={idx} style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              background: 'var(--bg-tertiary, rgba(255,255,255,0.06))',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)'
                            }}>
                              #{tagClean}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* File Attachment Status Bar */}
                    {(videoFile || thumbnailFile) && (
                      <div style={{
                        marginTop: '8px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'var(--bg-tertiary, rgba(0,0,0,0.03))',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '12px'
                      }}>
                        {videoFile && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fa-solid fa-file-video" style={{ color: '#7c3aed' }}></i>
                              Video:
                            </span>
                            <span style={{ fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                            </span>
                          </div>
                        )}
                        {thumbnailFile && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fa-solid fa-file-image" style={{ color: '#3b82f6' }}></i>
                              Thumbnail:
                            </span>
                            <span style={{ fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {thumbnailFile.name} ({(thumbnailFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

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
                  <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: textColor }}>Upload Course</h1>
                    <p style={{ color: subtitleColor, fontSize: '14px', marginTop: '4px' }}>
                      Add course details, chapters and multiple videos.
                    </p>
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
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Instructor / Author *</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            placeholder="e.g. John Doe"
                            value={courseForm.instructor}
                            onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Course Level *</label>
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
                          <label className="form-label" style={{ color: textColor, fontWeight: '600' }}>Total Chapters *</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '8px' }}
                            placeholder="e.g. 10"
                            value={courseForm.totalChapters}
                            onChange={(e) => setCourseForm({ ...courseForm, totalChapters: e.target.value })}
                            required
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
                                                if (file) {
                                                  const capturedDuration = await getVideoDuration(file);
                                                  if (capturedDuration > 0) {
                                                    const formattedDuration = formatSecondsToTime(capturedDuration);
                                                    updateVideoProp(ch.id, vid.id, 'duration', formattedDuration);
                                                  }
                                                }
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

                            {/* Chapter Quiz Section (Optional) */}
                            <div style={{ marginTop: '20px', borderTop: `1px dashed ${borderColor}`, paddingTop: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: textColor }}>📝 Chapter Quiz (Optional)</span>
                                  {ch.quiz && (
                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                                      {(ch.quiz.questions || []).length} Question{(ch.quiz.questions || []).length === 1 ? '' : 's'} Added
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="btn"
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    backgroundColor: ch.quiz ? 'rgba(239, 68, 68, 0.1)' : 'rgba(229, 9, 20, 0.1)',
                                    color: ch.quiz ? '#ef4444' : '#e50914',
                                    border: `1px solid ${ch.quiz ? '#ef4444' : '#e50914'}`,
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => toggleChapterQuiz(ch.id)}
                                >
                                  {ch.quiz ? '🗑️ Remove Quiz' : '➕ Add Quiz to Chapter'}
                                </button>
                              </div>

                              {ch.quiz && (
                                <div style={{ backgroundColor: isLight ? '#f9fafb' : 'rgba(255, 255, 255, 0.02)', border: `1px solid ${borderColor}`, padding: '16px', borderRadius: '8px', marginTop: '12px' }}>
                                  {/* Quiz Title */}
                                  <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '600', color: textColor }}>Quiz Title</label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '6px', fontSize: '13px' }}
                                      placeholder="e.g. Chapter 1 Knowledge Assessment"
                                      value={ch.quiz.title || ''}
                                      onChange={(e) => updateQuizTitle(ch.id, e.target.value)}
                                    />
                                  </div>

                                  {/* Questions List */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {(ch.quiz.questions || []).map((q, qIdx) => (
                                      <div key={q.id || qIdx} style={{ backgroundColor: containerBg, border: `1px solid ${borderColor}`, padding: '14px', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e50914' }}>Question {qIdx + 1}</span>
                                          {(ch.quiz.questions || []).length > 1 && (
                                            <button
                                              type="button"
                                              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}
                                              onClick={() => removeQuizQuestion(ch.id, q.id)}
                                            >
                                              🗑️ Remove Question
                                            </button>
                                          )}
                                        </div>

                                        {/* Question Statement */}
                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                          <label className="form-label" style={{ fontSize: '12px', fontWeight: '600', color: textColor }}>Question Statement *</label>
                                          <input
                                            type="text"
                                            className="form-input"
                                            style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '6px', fontSize: '13px' }}
                                            placeholder="Enter question text..."
                                            value={q.question || ''}
                                            onChange={(e) => updateQuestionText(ch.id, q.id, e.target.value)}
                                          />
                                        </div>

                                        {/* Options list with correct answer selection */}
                                        <div style={{ marginBottom: '10px' }}>
                                          <label className="form-label" style={{ fontSize: '12px', fontWeight: '600', color: textColor, marginBottom: '6px', display: 'block' }}>Options & Mark Correct Answer *</label>
                                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                                            {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                                              <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: q.correctAnswer === optIdx ? 'rgba(16, 185, 129, 0.1)' : 'transparent', padding: '6px 10px', borderRadius: '6px', border: `1px solid ${q.correctAnswer === optIdx ? '#10b981' : inputBorder}` }}>
                                                <input
                                                  type="radio"
                                                  name={`correct_ans_${ch.id}_${q.id}`}
                                                  checked={q.correctAnswer === optIdx}
                                                  onChange={() => updateQuestionCorrectAnswer(ch.id, q.id, optIdx)}
                                                  style={{ accentColor: '#10b981', cursor: 'pointer' }}
                                                  title="Mark as correct answer"
                                                />
                                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: q.correctAnswer === optIdx ? '#10b981' : textColor }}>{String.fromCharCode(65 + optIdx)}.</span>
                                                <input
                                                  type="text"
                                                  className="form-input"
                                                  style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor, borderRadius: '4px', fontSize: '12px', flex: 1, padding: '4px 8px' }}
                                                  placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                                  value={opt}
                                                  onChange={(e) => updateQuestionOption(ch.id, q.id, optIdx, e.target.value)}
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                    <button
                                      type="button"
                                      className="btn"
                                      style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 600, border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: textColor, borderRadius: '6px', alignSelf: 'flex-start', cursor: 'pointer' }}
                                      onClick={() => addQuizQuestion(ch.id)}
                                    >
                                      ➕ Add Question
                                    </button>
                                  </div>
                                </div>
                              )}
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
                  <PaginatedTable
                    headers={['Thumbnail', t('admin.uploadTitle'), t('admin.tableCategory'), t('admin.tableViews'), 'Visibility', t('admin.tableActions')]}
                    data={myVideos || []}
                    emptyMessage="No uploaded videos found"
                    renderRow={(video, index) => {
                      const hasThumbnail = video.thumbnail && typeof video.thumbnail === 'string';
                      const thumbUrl = hasThumbnail 
                        ? (video.thumbnail.startsWith('http') ? video.thumbnail : `http://localhost:5000${video.thumbnail}`) 
                        : 'https://placehold.co/180x101?text=No+Thumbnail';
                      const isPublic = String(video.visibility || '').toLowerCase() === 'scheduler' || String(video.visibility || '').toLowerCase() === 'public';
                      return (
                        <tr key={video.id || index} onClick={() => setReviewVideo(video)} style={{ cursor: 'pointer' }}>
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
                    }}
                  />
                </div>
              </div>
            )}

            {/* COURSE_ALL CONTENT VIEW */}
            {activeTab === 'course_all' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>All Courses</h2>
                <div className="table-container">
                  <PaginatedTable
                    headers={['Banner', 'Course Title', 'Instructor', 'Category', 'Chapters', 'Lessons', 'Price', 'Actions']}
                    data={(Array.isArray(courses) ? courses : []).filter(c => c && typeof c === 'object' && Object.keys(c).length > 0 && (c.id || c.title || c.course_title || c.name))}
                    emptyMessage="No data available"
                    renderRow={(course, index) => {
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
                        <tr key={course.id || displayTitle || index}>
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
                                showError('Coming soon');
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    }}
                  />
                </div>
              </div>
            )}

            {/* CATEGORIES VIEW */}
            {activeTab === 'categories' && (() => {
              const isLight = theme === 'light';
              const cardBg = isLight ? '#ffffff' : 'var(--bg-secondary)';
              const textColor = isLight ? '#18181b' : 'var(--text-primary)';
              const borderColor = isLight ? '#e4e4e7' : 'var(--border-color)';
              return (
                <div className="animate-fade-in glass-card" style={{ backgroundColor: cardBg, color: textColor, border: `1px solid ${borderColor}`, boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.04)' : 'none', padding: '24px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: textColor, margin: 0 }}>Video Categories</h2>
                    <button 
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryForm({ name: '', description: '' });
                        setShowCategoryModal(true);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      Add Category
                    </button>
                  </div>

                  <div className="table-container">
                    <PaginatedTable
                      headers={['Category Name', 'Description', 'Actions']}
                      data={categories}
                      emptyMessage="No categories found"
                      renderRow={(cat, index) => (
                        <tr key={cat.id || index}>
                          <td style={{ fontWeight: 600 }}>{cat.name}</td>
                          <td style={{ color: isLight ? '#71717a' : 'var(--text-secondary)' }}>{cat.description || '-'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setCategoryForm({ name: cat.name, description: cat.description || '' });
                                  setShowCategoryModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="btn"
                                style={{ padding: '6px 12px', fontSize: '12px', border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    />
                  </div>
                </div>
              );
            })()}

            {/* SUB CATEGORIES VIEW */}
            {activeTab === 'sub_categories' && (() => {
              const isLight = theme === 'light';
              const cardBg = isLight ? '#ffffff' : 'var(--bg-secondary)';
              const textColor = isLight ? '#18181b' : 'var(--text-primary)';
              const borderColor = isLight ? '#e4e4e7' : 'var(--border-color)';
              return (
                <div className="animate-fade-in glass-card" style={{ backgroundColor: cardBg, color: textColor, border: `1px solid ${borderColor}`, boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.04)' : 'none', padding: '24px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: textColor, margin: 0 }}>Video Sub Categories</h2>
                    <button 
                      onClick={() => {
                        fetchCategories();
                        setEditingSubCategory(null);
                        setSubCategoryForm({
                          id: '',
                          cat_id: categories[0]?.id || categories[0]?.category_id || '',
                          name: '',
                          description: ''
                        });
                        setShowSubCategoryModal(true);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      Add Sub Category
                    </button>
                  </div>

                  <div className="table-container">
                    <PaginatedTable
                      headers={['Sub Category Name', 'Parent Category', 'Description', 'Actions']}
                      data={subCategories}
                      emptyMessage="No sub categories found"
                      renderRow={(subCat, index) => {
                        const matchedCat = categories.find(c => 
                          String(c.id || c.category_id) === String(subCat.cat_id || subCat.category_id || subCat.catId || subCat.category) ||
                          String(c.name || c.category_name).toLowerCase() === String(subCat.category || subCat.cat_name || subCat.category_name).toLowerCase()
                        );
                        const parentCatName = matchedCat ? (matchedCat.name || matchedCat.category_name) : (subCat.category || subCat.category_name || subCat.cat_name || 'N/A');
                        const subCatId = subCat.id || subCat.sub_category_id;
                        const catIdVal = matchedCat ? String(matchedCat.id || matchedCat.category_id) : String(subCat.cat_id || subCat.category_id || subCat.category || '');

                        return (
                          <tr key={subCatId || index}>
                            <td style={{ fontWeight: 600 }}>{subCat.name || subCat.sub_category_name}</td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: 'rgba(124, 58, 237, 0.15)',
                                color: '#7c3aed'
                              }}>
                                {parentCatName}
                              </span>
                            </td>
                            <td style={{ color: isLight ? '#71717a' : 'var(--text-secondary)' }}>{subCat.description || '-'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  onClick={async () => {
                                    if (categories.length === 0) {
                                      await fetchCategories();
                                    }
                                    setEditingSubCategory(subCat);
                                    setSubCategoryForm({
                                      id: subCatId,
                                      cat_id: catIdVal,
                                      name: subCat.name || subCat.sub_category_name || '',
                                      description: subCat.description || ''
                                    });
                                    setShowSubCategoryModal(true);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteSubCategory(subCatId)}
                                  className="btn"
                                  style={{ padding: '6px 12px', fontSize: '12px', border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }}
                    />
                  </div>
                </div>
              );
            })()}
            
            {/* --- DYNAMIC USER MANAGEMENT VIEWS --- */}
            {activeTab.startsWith('users_') && activeTab !== 'users_logs' && activeTab !== 'users_all' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px', textTransform: 'capitalize' }}>
                  {activeTab.replace(/_/g, ' ')}
                </h2>
                <div className="table-container">
                  <PaginatedTable
                    headers={['Name', 'Email', 'Mobile', 'Role', 'Status', 'Actions']}
                    data={(Array.isArray(users) ? users : [])
                      .filter(u => {
                        const isUActive = u.status === true || String(u.status).toLowerCase() === 'true' || String(u.status).toLowerCase() === 'active';
                        if (activeTab === 'users_active') return isUActive;
                        if (activeTab === 'users_inactive') return !isUActive;
                        if (activeTab === 'users_blocked') return true;
                        return true;
                      })
                    }
                    emptyMessage="No users found in this tab status"
                    renderRow={(u, index) => {
                      const isUActive = u.status === true || String(u.status).toLowerCase() === 'true' || String(u.status).toLowerCase() === 'active';
                      return (
                        <tr key={u.id || index}>
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
                    }}
                  />
                </div>
              </div>
            )}

            {/* --- USER ACTIVITY LOGS --- */}
            {activeTab === 'users_logs' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>User Watch Activity Logs</h2>
                <div className="table-container">
                  <PaginatedTable
                    headers={['User', 'Video', 'Date/Time', 'Action']}
                    data={userLogs || []}
                    emptyMessage="No user watch activity logs found."
                    renderRow={(act, i) => {
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
                    }}
                  />
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
                    <PaginatedTable
                      headers={[
                        'User', 'Category', 'Video', 
                        { label: 'Views', style: { textAlign: 'center' } }, 
                        { label: 'Completed', style: { textAlign: 'center' } }, 
                        'Completion %', 'Watch Time', 
                        { label: 'Paused', style: { textAlign: 'center' } }, 
                        { label: 'Forwarded', style: { textAlign: 'center' } }, 
                        { label: 'Backward', style: { textAlign: 'center' } }, 
                        { label: 'Last Position', style: { textAlign: 'center' } }
                      ]}
                      data={(() => {
                        const logsList = Array.isArray(stats)
                          ? stats.map(item => item.json || item)
                          : (stats && typeof stats === 'object' && stats.watchHistoryDetails
                             ? stats.watchHistoryDetails
                             : (Array.isArray(userAnalytics)
                                ? userAnalytics.map(item => item.json || item)
                                : (userAnalytics && typeof userAnalytics === 'object' && (userAnalytics.id || userAnalytics.videoId || userAnalytics.user_id || userAnalytics.json)
                                   ? [userAnalytics.json || userAnalytics]
                                   : [])));
                        return logsList;
                      })()}
                      emptyMessage="No playback logs registered yet."
                      renderRow={(item, idx) => {
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
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- EXPORT CENTRE & REPORTS --- */}
            {activeTab === 'rep_export' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Reports</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Select a report type to view detailed analytics and performance metrics.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label htmlFor="report-select" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Report:
                      </label>
                      <select
                        id="report-select"
                        name="report"
                        value={adminReportType}
                        onChange={(e) => setAdminReportType(e.target.value)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          minWidth: '200px',
                          outline: 'none'
                        }}
                      >
                        <option value="course_analytics">Course Analytics</option>
                        <option value="engagement_analytics">Content Engagement</option>
                        <option value="user_analytics">User Activity Log</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  {adminReportType === 'course_analytics' && (
                    <PaginatedTable
                      headers={['Course', 'Enrolled', 'Completed', 'Completion %', 'Avg Time', 'Drop-off', 'Status']}
                      data={adminReportData || []}
                      emptyMessage="No details available"
                      renderRow={(item, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.course_name || item.course || item.courseName || item.title || 'N/A'}
                          </td>
                          <td>{item.enrolled ?? item.enrolled_count ?? item.enrolledCount ?? item.total_enrolled ?? 0}</td>
                          <td>{item.completed_count ?? item.completed ?? item.completedCount ?? 0}</td>
                          <td>
                            {(() => {
                              const val = item.complete_percentage ?? item.completion_percentage ?? item.completionPercentage ?? 0;
                              const str = String(val).trim();
                              if (str.endsWith('%')) return str;
                              const num = parseFloat(str);
                              return isNaN(num) ? str : `${Math.round(num)}%`;
                            })()}
                          </td>
                          <td>{item.avg_watch_time || item.avg_time || item.avgWatchTime || '0m'}</td>
                          <td>{item.drop_off || item.drop_off_rate || item.dropOff || '0%'}</td>
                          <td>
                            <span className={`badge ${String(item.status || '').toLowerCase() === 'inactive' ? 'badge-disabled' : 'badge-active'}`}>
                              {String(item.status || 'Active').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      )}
                    />
                  )}

                  {adminReportType === 'engagement_analytics' && (
                    <PaginatedTable
                      headers={['Course', 'Views', 'Watch Time', 'Avg Completion', 'Most Viewed Video', 'Least Viewed Video', 'Downloads']}
                      data={adminReportData || []}
                      emptyMessage="No details available"
                      renderRow={(item, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.course_name || item.course || item.courseName || item.title || 'N/A'}
                          </td>
                          <td>{item.views ?? item.total_views ?? item.views_count ?? 0}</td>
                          <td>{item.watch_time || item.watchTime || item.total_watch_time || '0m'}</td>
                          <td>
                            {(() => {
                              const val = item.complete_percentage ?? item.avg_completion ?? item.completion_percentage ?? 0;
                              const str = String(val).trim();
                              if (str.endsWith('%')) return str;
                              const num = parseFloat(str);
                              return isNaN(num) ? str : `${Math.round(num)}%`;
                            })()}
                          </td>
                          <td>{item.most_viewed || item.most_viewed_video || item.mostViewedVideo || 'N/A'}</td>
                          <td>{item.least_viewed || item.least_viewed_video || item.leastViewedVideo || 'N/A'}</td>
                          <td>{item.downloads ?? item.download_count ?? item.total_downloads ?? 0}</td>
                        </tr>
                      )}
                    />
                  )}

                  {adminReportType === 'user_analytics' && (
                    <PaginatedTable
                      headers={['User', 'Login Frequency', 'Last Login', 'Avg Session', 'Watch Time', 'Course Completed', 'Incomplete Course', 'Last Accessed Course', 'Status']}
                      data={adminReportData || []}
                      emptyMessage="No details available"
                      renderRow={(item, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.user_name || item.user || item.userName || item.name || 'N/A'}
                          </td>
                          <td>{item.login_frequency || item.loginFrequency || item.frequency || '0'}</td>
                          <td>{item.last_login || item.lastLogin || item.last_login_at || 'N/A'}</td>
                          <td>{item.avg_session || item.avgSession || item.avg_session_duration || '0m'}</td>
                          <td>{item.watch_time || item.watchTime || item.total_watch_time || '0m'}</td>
                          <td>{item.course_completed ?? item.courses_completed ?? item.completed_courses ?? 0}</td>
                          <td>{item.incomplete_course ?? item.incomplete_courses ?? item.courses_in_progress ?? 0}</td>
                          <td>{item.last_accessed_course || item.lastAccessedCourse || item.recent_course || 'N/A'}</td>
                          <td>
                            <span className={`badge ${String(item.status || '').toLowerCase() === 'inactive' ? 'badge-disabled' : 'badge-active'}`}>
                              {String(item.status || 'Active').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      )}
                    />
                  )}
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
                    <PaginatedTable
                      headers={['Stream Title', 'Viewers', 'Bitrate', 'FPS', 'Status']}
                      data={liveStreams}
                      emptyMessage="No active streams found"
                      renderRow={(stream, index) => (
                        <tr key={stream.id || index}>
                          <td style={{ fontWeight: 600 }}>{stream.title}</td>
                          <td>{stream.viewers} Concurrent</td>
                          <td style={{ color: 'var(--accent-secondary)' }}>{stream.bitrateKbps} Kbps</td>
                          <td>{stream.fps} FPS</td>
                          <td><span className="badge badge-active" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>LIVE</span></td>
                        </tr>
                      )}
                    />
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
             activeTab !== 'author_admin' &&
             !activeTab.startsWith('users_') && 
             activeTab !== 'video_upload' && 
             activeTab !== 'video_all' && 
             activeTab !== 'course_upload' && 
             activeTab !== 'course_all' && 
             activeTab !== 'categories' &&
             activeTab !== 'sub_categories' &&
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

      {/* --- ADD AUTHOR ADMIN MODAL --- */}
      {showAuthorAdminModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animate-fade-in" style={{
            width: isMobile ? '92%' : '100%',
            maxWidth: '640px',
            padding: isMobile ? '24px 16px' : '32px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            color: '#333333',
            maxHeight: isMobile ? '85vh' : '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#111111' }}>
              {editingAuthorAdmin ? 'Edit Author Admin' : 'Add Author Admin'}
            </h3>
            <form onSubmit={handleAuthorAdminSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>First Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter first name"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={authorAdminForm.firstName} 
                    onChange={e => setAuthorAdminForm({...authorAdminForm, firstName: e.target.value.replace(/^\s+/, '')})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out first name')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Last Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter last name"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={authorAdminForm.lastName} 
                    onChange={e => setAuthorAdminForm({...authorAdminForm, lastName: e.target.value.replace(/^\s+/, '')})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out last name')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Email Address *</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="Enter email address"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={authorAdminForm.email} 
                    onChange={e => setAuthorAdminForm({...authorAdminForm, email: e.target.value.trim()})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out email address')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Phone Number *</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="Enter phone number"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={authorAdminForm.mobile} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setAuthorAdminForm({...authorAdminForm, mobile: value});
                    }} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out phone number')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Gender *</label>
                  <PremiumSelect
                    options={genders}
                    value={authorAdminForm.gender}
                    onChange={e => setAuthorAdminForm({...authorAdminForm, gender: e.target.value})}
                    placeholder="Select Gender"
                    icon="fa-solid fa-venus-mars"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Date of Birth *</label>
                  <PremiumDatePicker
                    value={authorAdminForm.dob}
                    onChange={e => setAuthorAdminForm({...authorAdminForm, dob: e.target.value})}
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Address *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter full address"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={authorAdminForm.address} 
                    onChange={e => setAuthorAdminForm({...authorAdminForm, address: e.target.value.replace(/^\s+/, '')})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out address')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>State *</label>
                  <PremiumSelect
                    options={statesList}
                    value={authorAdminForm.state_id || authorAdminForm.state}
                    onChange={e => {
                      const selectedStateId = e.target.value;
                      const selectedStateObj = statesList.find(s => String(s.id) === String(selectedStateId));
                      setAuthorAdminForm(prev => ({
                        ...prev,
                        state_id: selectedStateId,
                        state: selectedStateObj ? selectedStateObj.name : '',
                        city_id: '',
                        city: ''
                      }));
                      if (selectedStateId) fetchCities(selectedStateId);
                    }}
                    placeholder={loadingStates ? "Loading states..." : "Select State"}
                    icon="fa-solid fa-map-location-dot"
                    disabled={loadingStates}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>City *</label>
                  <PremiumSelect
                    options={citiesList}
                    value={authorAdminForm.city_id || authorAdminForm.city}
                    onChange={e => {
                      const selectedCityObj = citiesList.find(c => String(c.id) === String(e.target.value));
                      setAuthorAdminForm(prev => ({
                        ...prev,
                        city_id: e.target.value,
                        city: selectedCityObj ? selectedCityObj.name : e.target.value
                      }));
                    }}
                    placeholder={loadingCities ? "Loading cities..." : (!authorAdminForm.state_id && !authorAdminForm.state ? "Select State First" : "Select City")}
                    icon="fa-solid fa-city"
                    disabled={loadingCities || (!authorAdminForm.state_id && !authorAdminForm.state)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Zipcode *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter zipcode"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={authorAdminForm.zipcode} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setAuthorAdminForm({...authorAdminForm, zipcode: value});
                    }} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out zipcode')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAuthorAdminModal(false)} className="btn btn-secondary" style={{ background: '#e0e0e0', color: '#333333', border: 'none' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={authorAdminFormLoading}>
                  {authorAdminFormLoading ? 'Saving...' : 'Save Author Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- USER MODAL --- */}
      {showUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animate-fade-in" style={{
            width: isMobile ? '92%' : '100%',
            maxWidth: '640px',
            padding: isMobile ? '24px 16px' : '32px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            color: '#333333',
            maxHeight: isMobile ? '85vh' : '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#111111' }}>{editingUser ? 'Edit User' : 'Add User'}</h3>
            <form onSubmit={handleUserSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
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
                    onChange={e => setUserForm({...userForm, firstName: e.target.value.replace(/^\s+/, '')})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out first name')}
                    onInput={e => e.target.setCustomValidity('')}
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
                    onChange={e => setUserForm({...userForm, lastName: e.target.value.replace(/^\s+/, '')})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out last name')}
                    onInput={e => e.target.setCustomValidity('')}
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
                    onChange={e => setUserForm({...userForm, email: e.target.value.trim()})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out email address')}
                    onInput={e => e.target.setCustomValidity('')}
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
                    onInvalid={e => e.target.setCustomValidity('Please fill out phone number')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Gender</label>
                  <PremiumSelect
                    options={genders}
                    value={userForm.gender}
                    onChange={e => setUserForm({...userForm, gender: e.target.value})}
                    placeholder="Select Gender"
                    icon="fa-solid fa-venus-mars"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Date of Birth</label>
                  <PremiumDatePicker
                    value={userForm.dob}
                    onChange={e => setUserForm({...userForm, dob: e.target.value})}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter address"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={userForm.address} 
                    onChange={e => setUserForm({...userForm, address: e.target.value.replace(/^\s+/, '')})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out address')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>State *</label>
                  <PremiumSelect
                    options={statesList}
                    value={userForm.state_id || userForm.state}
                    onChange={e => handleStateChange(e.target.value)}
                    placeholder={loadingStates ? "Loading states..." : "Select State"}
                    icon="fa-solid fa-map-location-dot"
                    disabled={loadingStates}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>City *</label>
                  <PremiumSelect
                    options={citiesList}
                    value={userForm.city_id || userForm.city}
                    onChange={e => {
                      const selectedCityObj = citiesList.find(c => String(c.id) === String(e.target.value));
                      setUserForm({
                        ...userForm,
                        city_id: e.target.value,
                        city: selectedCityObj ? selectedCityObj.name : e.target.value
                      });
                    }}
                    placeholder={loadingCities ? "Loading cities..." : (!userForm.state_id && !userForm.state ? "Select State First" : "Select City")}
                    icon="fa-solid fa-city"
                    disabled={loadingCities || (!userForm.state_id && !userForm.state)}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', marginBottom: 0 }}>
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
                    onInvalid={e => e.target.setCustomValidity('Please fill out zipcode')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowUserModal(false)} className="btn btn-secondary" style={{ background: '#e0e0e0', color: '#333333', border: 'none' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={userFormLoading}>
                  {userFormLoading ? (
                    <>
                      <style>{`
                        @keyframes spin {
                          from { transform: rotate(0deg); }
                          to { transform: rotate(360deg); }
                        }
                      `}</style>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CATEGORY CRUD MODAL --- */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px', background: '#ffffff', color: '#18181b', borderRadius: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px', fontWeight: 700, color: '#111111' }}>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Category Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g., Technology, Entertainment, Science & Tech"
                  style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                  value={categoryForm.name} 
                  onChange={e => setCategoryForm({...categoryForm, name: e.target.value.replace(/^\s+/, '')})} 
                  onInvalid={(e) => e.target.setCustomValidity('Please fill out category name')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Description</label>
                <textarea 
                  className="form-input" 
                  placeholder="Enter category description (optional)..."
                  style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd', resize: 'none' }}
                  value={categoryForm.description} 
                  onChange={e => setCategoryForm({...categoryForm, description: e.target.value.replace(/^\s+/, '')})}
                  rows="3" 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SUB CATEGORY CRUD MODAL --- */}
      {showSubCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px', background: '#ffffff', color: '#18181b', borderRadius: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px', fontWeight: 700, color: '#111111' }}>
              {editingSubCategory ? 'Edit Sub Category' : 'Add Sub Category'}
            </h3>
            <form onSubmit={handleSubCategorySubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Category</label>
                <PremiumSelect
                  options={categories.map(cat => ({
                    id: String(cat.id || cat.category_id),
                    name: cat.name || cat.category_name
                  }))}
                  value={String(subCategoryForm.cat_id)}
                  onChange={(e) => setSubCategoryForm({ ...subCategoryForm, cat_id: e.target.value })}
                  placeholder="Select Category"
                  searchable={true}
                  icon="fa-solid fa-list-check"
                  style={{ height: '44px', borderRadius: '8px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Sub Category Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g., Mobile Development, Machine Learning, Web Design"
                  style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                  value={subCategoryForm.name} 
                  onChange={e => setSubCategoryForm({...subCategoryForm, name: e.target.value.replace(/^\s+/, '')})} 
                  onInvalid={(e) => e.target.setCustomValidity('Please fill out sub category name')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Description</label>
                <textarea 
                  className="form-input" 
                  placeholder="Enter sub category description (optional)..."
                  style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd', resize: 'none' }}
                  value={subCategoryForm.description} 
                  onChange={e => setSubCategoryForm({...subCategoryForm, description: e.target.value.replace(/^\s+/, '')})}
                  rows="3" 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowSubCategoryModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div className="animate-fade-in glass-card" style={{ width: '90%', maxWidth: '420px', padding: '32px', textAlign: 'center', background: 'var(--bg-secondary, #ffffff)', color: 'var(--text-primary)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '24px' }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{confirmModal.title}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} 
                className="btn btn-secondary" 
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal(prev => ({ ...prev, show: false }));
                  if (cb) cb();
                }} 
                className="btn" 
                style={{ padding: '8px 20px', fontSize: '13px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                {confirmModal.confirmText || 'Delete'}
              </button>
            </div>
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
              border: `3px solid ${customAlert.type === 'success' ? '#1890ff' : '#f5222d'}`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              {customAlert.type === 'success' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1890ff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5222d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: customAlert.type === 'success' ? '#1890ff' : '#f5222d',
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
              onClick={() => {
                setCustomAlert(prev => ({ ...prev, show: false }));
                if (customAlert.onConfirm) customAlert.onConfirm();
              }}
              style={{
                background: customAlert.type === 'success' ? '#1890ff' : '#de2424',
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
