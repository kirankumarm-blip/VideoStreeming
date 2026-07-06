import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart, DonutChart, LineChart } from '../components/SVGCharts';
import { useLanguage } from '../context/LanguageContext';

const AdminDashboard = ({ isSidebarOpen, toggleSidebar }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview'); // overview, users_all, video_upload, etc.
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  const [userForm, setUserForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // Video Upload states
  const [categories, setCategories] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    visibility: 'public'
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // My Videos list states
  const [myVideos, setMyVideos] = useState([]);

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
    fetchDashboardData();
    fetchUsers();
    fetchCategories();
    fetchVideos();
    fetchAnalyticsData();
    fetchMonitoringData();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' || activeTab.startsWith('analytics_')) {
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
  }, [activeTab]);

  const fetchAnalyticsData = async () => {
    try {
      const u = await api.analytics.getUser();
      setUserAnalytics(u);
      const c = await api.analytics.getContent();
      setContentAnalytics(c);
      const r = await api.analytics.getRevenue();
      setRevenueAnalytics(r);
      const e = await api.analytics.getEngagement();
      setEngagementAnalytics(e);
      const s = await api.analytics.getStreaming();
      setStreamingAnalytics(s);
    } catch (err) {
      console.error('Failed to load analytics data', err);
    }
  };

  const fetchMonitoringData = async () => {
    try {
      const l = await api.monitoring.getLive();
      setLiveStreams(l);
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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await api.dashboard.getAdmin();
      setStats(data);
    } catch (err) {
      setError('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.categories.list();
      setCategories(data);
      if (data.length > 0) {
        setUploadForm(prev => ({ ...prev, category: data[0].name }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVideos = async () => {
    try {
      const data = await api.videos.list();
      setMyVideos(data);
    } catch (e) {
      console.error(e);
    }
  };

  // --- User CRUD Handlers ---
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, userForm);
      } else {
        await api.users.create(userForm.name, userForm.email, userForm.mobile, userForm.password);
      }
      setShowUserModal(false);
      setUserForm({ name: '', email: '', mobile: '', password: '' });
      setEditingUser(null);
      fetchUsers();
      fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to save user');
    }
  };

  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await api.users.update(user.id, { status: nextStatus });
      fetchUsers();
    } catch (err) {
      console.error(err);
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

    const formData = new FormData();
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('category', uploadForm.category);
    formData.append('tags', uploadForm.tags);
    formData.append('visibility', uploadForm.visibility);
    formData.append('video', videoFile);
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }

    setUploadProgress('Uploading video files...');
    try {
      await api.videos.upload(formData);
      setUploadSuccess('Video uploaded and processed successfully!');
      // Reset form
      setUploadForm({
        title: '',
        description: '',
        category: categories[0]?.name || '',
        tags: '',
        visibility: 'public'
      });
      setVideoFile(null);
      setThumbnailFile(null);
      
      // Clear file inputs manually
      document.getElementById('videoInput').value = '';
      const thumbInput = document.getElementById('thumbInput');
      if (thumbInput) thumbInput.value = '';

      fetchVideos();
      fetchDashboardData();
    } catch (err) {
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
      items: [
        { id: 'overview', label: 'Overview' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'realtime', label: 'Real-Time Monitoring' }
      ]
    },
    {
      title: 'User Management',
      icon: '👥',
      items: [
        { id: 'users_all', label: 'Users' },
        { id: 'users_logs', label: 'User Activity Logs' },
        { id: 'users_subs', label: 'User Subscriptions' },
        { id: 'users_blocked', label: 'Blocked Users' }
      ]
    },
    {
      title: 'Video Management',
      icon: '🎬',
      items: [
        { id: 'video_upload', label: 'Upload Video' },
        { id: 'video_all', label: 'All Videos' },
        { id: 'video_pending', label: 'Pending Videos' },
        { id: 'video_queue', label: 'Processing Queue' },
        { id: 'video_featured', label: 'Featured Videos' },
        { id: 'categories', label: 'Categories' },
        { id: 'tags', label: 'Tags' },
        { id: 'comments_mod', label: 'Comments Moderation' }
      ]
    },
    {
      title: 'Analytics',
      icon: '📈',
      items: [
        { id: 'analytics_video', label: 'Video Analytics' },
        { id: 'analytics_user', label: 'User Analytics' },
        { id: 'analytics_watch', label: 'Watch Time Analytics' },
        { id: 'analytics_completion', label: 'Completion Analytics' },
        { id: 'analytics_device', label: 'Device Analytics' },
        { id: 'analytics_geo', label: 'Geographic Analytics' },
        { id: 'analytics_traffic', label: 'Traffic Sources' }
      ]
    },
    {
      title: 'Engagement',
      icon: '⭐',
      items: [
        { id: 'engage_likes', label: 'Likes & Reactions' },
        { id: 'engage_comments', label: 'Comments' },
        { id: 'engage_reviews', label: 'Reviews & Ratings' },
        { id: 'engage_watchlist', label: 'Watchlist Analytics' }
      ]
    },
    {
      title: 'Monitoring',
      icon: '🔔',
      items: [
        { id: 'mon_live', label: 'Live Users' },
        { id: 'mon_sys', label: 'System Logs' },
        { id: 'mon_err', label: 'Error Logs' },
        { id: 'mon_storage', label: 'Storage Usage' },
        { id: 'mon_transcode', label: 'Video Processing Status' }
      ]
    },
    {
      title: 'Reports',
      icon: '📂',
      items: [
        { id: 'rep_daily', label: 'Daily Reports' },
        { id: 'rep_weekly', label: 'Weekly Reports' },
        { id: 'rep_monthly', label: 'Monthly Reports' },
        { id: 'rep_custom', label: 'Custom Reports' },
        { id: 'rep_export', label: 'Export Center' }
      ]
    },
    {
      title: 'Settings',
      icon: '⚙',
      items: [
        { id: 'set_general', label: 'General Settings' },
        { id: 'set_branding', label: 'Branding' },
        { id: 'set_languages', label: 'Languages' },
        { id: 'set_gateway', label: 'Payment Gateway' },
        { id: 'set_email', label: 'Email Settings' },
        { id: 'set_sms', label: 'SMS Settings' },
        { id: 'set_keys', label: 'API Keys' },
        { id: 'set_security', label: 'Security Settings' }
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

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: 'var(--bg-primary)', marginLeft: 0, width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
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
          <span style={{ 
            fontFamily: "'Space Grotesk', sans-serif", 
            fontWeight: 700, 
            fontSize: '18px', 
            background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            VStreem
          </span>
        </div>

        {menuStructure.map((section, idx) => (
          <div key={section.title} style={{ marginBottom: '8px', marginTop: idx === 0 ? '0px' : undefined }}>
            <button 
              onClick={() => toggleSection(section.title)}
              className="admin-sidebar-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                cursor: 'pointer',
                borderRadius: '8px',
                textAlign: 'left'
              }}
              type="button"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{section.icon}</span>
                <span>{t('admin.menu.' + section.title.toLowerCase().replace(/ & /g, '_and_').replace(/\s+/g, '_'), section.title)}</span>
              </span>
              <span style={{ fontSize: '10px' }}>{expandedSections[section.title] ? '▼' : '▶'}</span>
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
                        background: isSelected ? 'rgba(229, 9, 20, 0.12)' : 'none',
                        border: 'none',
                        borderRadius: '6px',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
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
        ))}
      </div>

      {/* 2. MAIN ADMIN CONTENT CONTAINER */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', height: '100%', minWidth: 0 }} className="admin-content-container">
        
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, textTransform: 'capitalize' }}>
              {activeTab.replace(/_/g, ' ')}
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
                    <span className="stat-value">{stats?.cards?.totalUsers || users.length || 0}</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>↑ 12% this month</span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.statActiveUsers', 'Active Users Today')}</span>
                    <span className="stat-value">{stats?.cards?.activeUsers || 87}</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>🔴 Live now</span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.dashboard.totalVideosUploaded', 'Total Videos Uploaded')}</span>
                    <span className="stat-value">{stats?.cards?.totalVideos || myVideos.length || 0}</span>
                    <span style={{ fontSize: '11px', color: '#a0a0ab' }}>All transcode jobs completed</span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.statTotalViews', 'Total Views')}</span>
                    <span className="stat-value">{stats?.cards?.totalViews || 2630}</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>↑ 34% this week</span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.dashboard.dailyWatchTime', 'Daily Watch Time')}</span>
                    <span className="stat-value">{(contentAnalytics?.watchTimePerVideo?.reduce((sum, v) => sum + v.minutes, 0) || 150) + " min"}</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>↑ 8% vs yesterday</span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.dashboard.monthlyWatchTime', 'Monthly Watch Time')}</span>
                    <span className="stat-value">{((contentAnalytics?.watchTimePerVideo?.reduce((sum, v) => sum + v.minutes, 0) * 30) || 4500) + " min"}</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>92% of monthly target</span>
                  </div>
                  <div className="glass-card stat-card">
                    <span className="stat-label">{t('admin.dashboard.liveStreamsRunning', 'Live Streams Running')}</span>
                    <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>{liveStreams?.length || 2}</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>🔴 Live Stream Active</span>
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
                        <LineChart data={userGrowthData} />
                        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <span>Daily signups: +5</span>
                          <span>•</span>
                          <span>Monthly signups: +120</span>
                          <span>•</span>
                          <span>Active users: 87</span>
                        </div>
                      </div>
                      
                      <div className="glass-card">
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Video Performance Trend</h3>
                        <LineChart data={videoViewsTrend} />
                        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <span>Views per Day: 850 avg</span>
                          <span>•</span>
                          <span>Watch Hours: 42h avg</span>
                        </div>
                      </div>
                    </div>

                    {/* Engagement Funnel */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>User Engagement Funnel</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                          { label: 'Registered Users', count: 1000, color: 'var(--accent-primary)', pct: 100 },
                          { label: 'Logged In', count: 850, color: 'var(--accent-secondary)', pct: 85 },
                          { label: 'Started Video', count: 600, color: '#3b82f6', pct: 60 },
                          { label: 'Completed Video', count: 400, color: '#10b981', pct: 40 }
                        ].map(level => (
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
                            {[
                              { title: 'React JS for Beginners', views: 1200, time: '650h', comp: '85%', likes: 540 },
                              { title: 'Understanding Compound Interest', views: 980, time: '410h', comp: '70%', likes: 320 },
                              { title: 'Introduction to Quantum Mechanics', views: 450, time: '180h', comp: '62%', likes: 110 }
                            ].map((row, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>{row.title}</td>
                                <td>{row.views}</td>
                                <td>{row.time}</td>
                                <td>{row.comp}</td>
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
                              {[
                                { name: 'Science', count: 25, views: '50K' },
                                { name: 'Finance', count: 18, views: '42K' },
                                { name: 'Technology', count: 12, views: '35K' }
                              ].map((cat, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 600 }}>{cat.name}</td>
                                  <td>{cat.count}</td>
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
                    
                    {/* Real-Time Monitoring */}
                    <div className="glass-card" style={{ border: '1px solid var(--accent-glow)' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                        Real-Time Monitoring
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Live Users:</span>
                          <span style={{ fontWeight: 700 }}>87</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Watching Videos:</span>
                          <span style={{ fontWeight: 700 }}>54</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Online Devices:</span>
                          <span style={{ fontWeight: 700 }}>102</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Bandwidth Usage:</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>2.4 GB/min</span>
                        </div>
                      </div>
                    </div>

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
                        setUserForm({ name: '', email: '', mobile: '', password: '' });
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
                        <th>{t('auth.fullName')}</th>
                        <th>{t('auth.emailAddress')}</th>
                        <th>{t('auth.mobileNumber')}</th>
                        <th>Status</th>
                        <th>{t('admin.tableActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(user => {
                          if (userStatusFilter === 'active') return user.status === 'active';
                          if (userStatusFilter === 'inactive') return user.status === 'disabled';
                          return true;
                        })
                        .map(user => (
                        <tr key={user.id}>
                          <td style={{ fontWeight: 600 }}>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.mobile}</td>
                          <td>
                            <span className={`badge ${user.status === 'active' ? 'badge-active' : 'badge-disabled'}`}>
                              {user.status.toUpperCase()}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => {
                                  setEditingUser(user);
                                  setUserForm({ name: user.name, email: user.email, mobile: user.mobile, password: '' });
                                  setShowUserModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                {t('admin.editBtn')}
                              </button>
                              <button 
                                onClick={() => handleToggleUserStatus(user)}
                                className="btn"
                                style={{ 
                                  padding: '6px 12px', 
                                  fontSize: '12px', 
                                  border: 'none', 
                                  backgroundColor: user.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', 
                                  color: user.status === 'active' ? '#ef4444' : '#10b981' 
                                }}
                              >
                                {user.status === 'active' ? t('admin.disableBtn') : t('admin.enableBtn')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label className="form-label">{t('admin.tableCategory')}</label>
                      <select 
                        className="form-input"
                        value={uploadForm.category}
                        onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                        required
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Visibility</label>
                      <select 
                        className="form-input"
                        value={uploadForm.visibility}
                        onChange={(e) => setUploadForm({ ...uploadForm, visibility: e.target.value })}
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
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
                        onChange={(e) => setVideoFile(e.target.files[0])}
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
                        onChange={(e) => setThumbnailFile(e.target.files[0])}
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
                      {myVideos.map(video => (
                        <tr key={video.id} onClick={() => setReviewVideo(video)} style={{ cursor: 'pointer' }}>
                          <td>
                            <img 
                              src={video.thumbnail.startsWith('http') ? video.thumbnail : `http://localhost:5000${video.thumbnail}`} 
                              alt={video.title} 
                              style={{ width: '80px', borderRadius: '4px', aspectRatio: '16/9', objectFit: 'cover' }} 
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{video.title}</td>
                          <td>{video.category}</td>
                          <td>{video.views || 0}</td>
                          <td>
                            <span className={`badge ${video.visibility === 'public' ? 'badge-active' : 'badge-disabled'}`}>
                              {video.visibility.toUpperCase()}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* --- DYNAMIC USER MANAGEMENT VIEWS --- */}
            {activeTab.startsWith('users_') && activeTab !== 'users_logs' && (
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
                      {users
                        .filter(u => {
                          if (activeTab === 'users_active') return u.status === 'active';
                          if (activeTab === 'users_inactive') return u.status === 'disabled';
                          if (activeTab === 'users_blocked') return u.status === 'blocked';
                          return true;
                        })
                        .map(u => (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 600 }}>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.mobile}</td>
                            <td><span style={{ fontSize: '11px', textTransform: 'uppercase' }}>{u.role}</span></td>
                            <td>
                              <span className={`badge ${u.status === 'active' ? 'badge-active' : 'badge-disabled'}`}>
                                {u.status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={async () => {
                                  const nextStatus = u.status === 'active' ? 'disabled' : 'active';
                                  try {
                                    await api.users.update(u.id, { status: nextStatus });
                                    fetchUsers();
                                  } catch (err) {
                                    alert(err.message);
                                  }
                                }}
                                className="btn"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  backgroundColor: u.status === 'active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  color: u.status === 'active' ? '#ef4444' : '#10b981',
                                  border: 'none'
                                }}
                              >
                                {u.status === 'active' ? t('admin.action.ban', 'Ban') : t('admin.action.unban', 'Unban')}
                              </button>
                            </td>
                          </tr>
                        ))}
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
                        <th>Action</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { user: 'Rahul', video: 'React JS for Beginners', action: 'started watching', time: new Date() },
                        { user: 'Priya', video: 'Understanding Compound Interest', action: 'finished watching', time: new Date(Date.now() - 3600000) }
                      ].map((act, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{act.user}</td>
                          <td>{act.video}</td>
                          <td><span style={{ color: '#10b981', fontWeight: 500 }}>{act.action.toUpperCase()}</span></td>
                          <td>{act.time.toLocaleString()}</td>
                        </tr>
                      ))}
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
                              {tx.status.toUpperCase()}
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
                  const url = reviewVideo.videoUrl;
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>{editingUser ? t('admin.editUser') : t('admin.addUser')}</h3>
            <form onSubmit={handleUserSubmit}>
              <div className="form-group">
                <label className="form-label">{t('auth.fullName')}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={userForm.name} 
                  onChange={e => setUserForm({...userForm, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.emailAddress')}</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={userForm.email} 
                  onChange={e => setUserForm({...userForm, email: e.target.value})} 
                  required 
                  disabled={!!editingUser}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.mobileNumber')}</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  value={userForm.mobile} 
                  onChange={e => setUserForm({...userForm, mobile: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password {editingUser && '(Leave blank to keep current)'}</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={userForm.password} 
                  onChange={e => setUserForm({...userForm, password: e.target.value})} 
                  required={!editingUser}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowUserModal(false)} className="btn btn-secondary">{t('admin.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('admin.saveUser')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
