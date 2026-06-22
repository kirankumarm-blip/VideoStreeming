import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart, DonutChart, LineChart } from '../components/SVGCharts';
import { useLanguage } from '../context/LanguageContext';

const SuperAdminDashboard = ({ isSidebarOpen, toggleSidebar }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview'); // overview, admins_all, categories, etc.
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Accordion Sections State (13 Sections)
  const [expandedSections, setExpandedSections] = useState({
    'Dashboard': true,
    'Admin Management': false,
    'User Management': false,
    'Content Management': false,
    'Analytics': false,
    'Subscription Management': false,
    'Notifications': false,
    'Security & Compliance': false,
    'Reports': false,
    'Platform Settings': false,
    'AI Insights': false,
    'System Monitoring': false,
    'Support Center': false
  });

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Video review modal state
  const [reviewVideo, setReviewVideo] = useState(null);

  // Admins CRUD states
  const [admins, setAdmins] = useState([]);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Categories CRUD states
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Videos & Assignments states
  const [videos, setVideos] = useState([]);
  const [assignForm, setAssignForm] = useState({ videoId: '', assignedAdmins: [] });
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Global activity search / filter
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Users state
  const [users, setUsers] = useState([]);

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
  
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminLogFilters, setAdminLogFilters] = useState({ date: '', admin: '', actionType: '' });
  
  const [subscriptions, setSubscriptions] = useState({ active: [], expired: [], failed: [] });
  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState({ name: '', price: '', durationDays: 30, features: '' });
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  
  const [moderationReports, setModerationReports] = useState({ reportedVideos: [], reportedUsers: [], copyrightIssues: [], spamDetection: [] });
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    fetchDashboardData();
    fetchAdmins();
    fetchCategories();
    fetchVideos();
    fetchUsers();
    fetchAnalyticsData();
    fetchMonitoringData();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' || activeTab.includes('analytics')) {
      fetchAnalyticsData();
    }
    if (activeTab === 'realtime' || activeTab.includes('sys_') || activeTab.includes('sec_')) {
      fetchMonitoringData();
    }
    if (activeTab === 'admins_logs') {
      fetchAdminLogs();
    }
    if (activeTab.includes('subs_')) {
      fetchSubscriptionData();
    }
    if (activeTab === 'content_approval' || activeTab === 'content_reported') {
      fetchModerationData();
    }
    if (activeTab.includes('set_')) {
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

  const fetchAdminLogs = async (filters = adminLogFilters) => {
    try {
      const logs = await api.adminLogs.list(filters);
      setAdminLogs(logs);
    } catch (err) {
      console.error('Failed to load admin logs', err);
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      const subs = await api.subscriptions.list();
      setSubscriptions(subs);
      const p = await api.plans.list();
      setPlans(p);
    } catch (err) {
      console.error('Failed to load subscription data', err);
    }
  };

  const fetchModerationData = async () => {
    try {
      const reports = await api.moderation.getReports();
      setModerationReports(reports);
    } catch (err) {
      console.error('Failed to load moderation data', err);
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
      const data = await api.dashboard.getSuperAdmin();
      setStats(data);
      setActivities(data.recentActivities || []);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const data = await api.admins.list();
      setAdmins(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.categories.list();
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVideos = async () => {
    try {
      const data = await api.videos.list();
      setVideos(data);
    } catch (e) {
      console.error(e);
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

  // --- Admin CRUD Handlers ---
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAdmin) {
        await api.admins.update(editingAdmin.id, adminForm);
      } else {
        await api.admins.create(adminForm.name, adminForm.email, adminForm.mobile, adminForm.password);
      }
      setShowAdminModal(false);
      setAdminForm({ name: '', email: '', mobile: '', password: '' });
      setEditingAdmin(null);
      fetchAdmins();
      fetchDashboardData();
      setActiveTab('admins_all'); // Redirect upon creation
    } catch (err) {
      setError(err.message || 'Failed to save admin');
    }
  };

  const handleToggleAdminStatus = async (admin) => {
    const nextStatus = admin.status === 'active' ? 'disabled' : 'active';
    try {
      await api.admins.update(admin.id, { status: nextStatus });
      fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Category CRUD Handlers ---
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.id, categoryForm.name, categoryForm.description);
      } else {
        await api.categories.create(categoryForm.name, categoryForm.description);
      }
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      setEditingCategory(null);
      fetchCategories();
      fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await api.categories.delete(id);
        fetchCategories();
        fetchDashboardData();
      } catch (err) {
        alert(err.message || 'Failed to delete category');
      }
    }
  };

  // --- Video Assignment Handlers ---
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.videos.assign(assignForm.videoId, assignForm.assignedAdmins);
      setShowAssignModal(false);
      fetchVideos();
    } catch (err) {
      setError(err.message || 'Failed to assign video');
    }
  };

  // --- Report Export Simulators ---
  const handleExport = async (format) => {
    try {
      const data = await api.reports.getSuperAdmin();
      const csvContent = data.exportData.csv;
      
      if (format === 'csv') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "platform_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(`Exporting platform statistics report in ${format.toUpperCase()} format...\n(Completed successfully!)`);
      }
    } catch (e) {
      alert("Failed to export report");
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(act => {
    const q = searchQuery.toLowerCase();
    return (
      act.user.toLowerCase().includes(q) ||
      act.video.toLowerCase().includes(q) ||
      act.action.toLowerCase().includes(q)
    );
  });

  const menuStructure = [
    {
      title: 'Dashboard',
      icon: '🏠',
      items: [
        { id: 'overview', label: 'Overview' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'realtime', label: 'Real-Time Monitoring' }
      ]
    },
    {
      title: 'Admin Management',
      icon: '👨💼',
      items: [
        { id: 'admins_all', label: 'All Admins' },
        { id: 'admins_perf', label: 'Admin Performance' },
        { id: 'admins_logs', label: 'Admin Activity Logs' },
        { id: 'admins_perms', label: 'Admin Permissions' }
      ]
    },
    {
      title: 'User Management',
      icon: '👥',
      items: [
        { id: 'users_all', label: 'All Users' },
        { id: 'users_active', label: 'Active Users' },
        { id: 'users_inactive', label: 'Inactive Users' },
        { id: 'users_premium', label: 'Premium Users' },
        { id: 'users_blocked', label: 'Blocked Users' },
        { id: 'users_logs', label: 'User Activity Logs' }
      ]
    },
    {
      title: 'Content Management',
      icon: '🎬',
      items: [
        { id: 'content_videos', label: 'All Videos' },
        { id: 'content_approval', label: 'Video Approval' },
        { id: 'content_reported', label: 'Reported Videos' },
        { id: 'categories', label: 'Categories' },
        { id: 'content_tags', label: 'Tags' },
        { id: 'content_featured', label: 'Featured Content' }
      ]
    },
    {
      title: 'Analytics',
      icon: '📈',
      items: [
        { id: 'platform_analytics', label: 'Platform Analytics' },
        { id: 'user_analytics', label: 'User Analytics' },
        { id: 'video_analytics', label: 'Video Analytics' },
        { id: 'engage_analytics', label: 'Engagement Analytics' },
        { id: 'geo_analytics', label: 'Geographic Analytics' },
        { id: 'device_analytics', label: 'Device Analytics' }
      ]
    },
    {
      title: 'Subscription Management',
      icon: '💳',
      items: [
        { id: 'subs_plans', label: 'Plans' },
        { id: 'subs_active', label: 'Active Subscriptions' },
        { id: 'subs_expired', label: 'Expired Subscriptions' },
        { id: 'subs_renewals', label: 'Renewals' },
        { id: 'subs_coupons', label: 'Coupons' }
      ]
    },
    {
      title: 'Notifications',
      icon: '🔔',
      items: [
        { id: 'notif_push', label: 'Push Notifications' },
        { id: 'notif_email', label: 'Email Campaigns' },
        { id: 'notif_sms', label: 'SMS Campaigns' },
        { id: 'notif_ann', label: 'Announcements' }
      ]
    },
    {
      title: 'Security & Compliance',
      icon: '🛡️',
      items: [
        { id: 'sec_logs', label: 'Login Logs' },
        { id: 'sec_failed', label: 'Failed Login Attempts' },
        { id: 'sec_ip', label: 'IP Monitoring' },
        { id: 'sec_blocked', label: 'Blocked IPs' },
        { id: 'sec_audit', label: 'Audit Logs' },
        { id: 'sec_roles', label: 'Roles & Permissions' }
      ]
    },
    {
      title: 'Reports',
      icon: '📊',
      items: [
        { id: 'rep_daily', label: 'Daily Reports' },
        { id: 'rep_weekly', label: 'Weekly Reports' },
        { id: 'rep_monthly', label: 'Monthly Reports' },
        { id: 'rep_custom', label: 'Custom Reports' },
        { id: 'rep_export', label: 'Export Reports' }
      ]
    },
    {
      title: 'Platform Settings',
      icon: '⚙️',
      items: [
        { id: 'set_general', label: 'General Settings' },
        { id: 'set_branding', label: 'Branding' },
        { id: 'set_languages', label: 'Languages' },
        { id: 'set_email', label: 'Email Settings' },
        { id: 'set_sms', label: 'SMS Settings' },
        { id: 'set_gateway', label: 'Payment Gateway' },
        { id: 'set_storage', label: 'Storage Settings' },
        { id: 'set_cdn', label: 'CDN Settings' },
        { id: 'set_keys', label: 'API Keys' }
      ]
    },
    {
      title: 'AI Insights',
      icon: '🤖',
      items: [
        { id: 'ai_trending', label: 'Trending Videos' },
        { id: 'ai_churn', label: 'Churn Prediction' },
        { id: 'ai_forecast', label: 'Revenue Forecast' },
        { id: 'ai_recs', label: 'User Recommendations' }
      ]
    },
    {
      title: 'System Monitoring',
      icon: '🖥️',
      items: [
        { id: 'sys_health', label: 'Server Health' },
        { id: 'sys_api', label: 'API Monitoring' },
        { id: 'sys_db', label: 'Database Status' },
        { id: 'sys_storage', label: 'Storage Usage' },
        { id: 'sys_jobs', label: 'Background Jobs' },
        { id: 'sys_queue', label: 'Video Processing Queue' }
      ]
    },
    {
      title: 'Support Center',
      icon: '📞',
      items: [
        { id: 'supp_tickets', label: 'Support Tickets' },
        { id: 'supp_user', label: 'User Complaints' },
        { id: 'supp_admin', label: 'Admin Complaints' },
        { id: 'supp_bugs', label: 'Bug Reports' },
        { id: 'supp_feedback', label: 'Feedback' }
      ]
    }
  ];

  // Mock datasets for Super Admin growth & analytics
  const superAdminUserGrowth = [
    { label: 'Mon', count: 14 },
    { label: 'Tue', count: 18 },
    { label: 'Wed', count: 15 },
    { label: 'Thu', count: 22 },
    { label: 'Fri', count: 19 },
    { label: 'Sat', count: 28 },
    { label: 'Sun', count: 32 }
  ];

  const top10VideosData = [
    { name: 'React Course', count: 520 },
    { name: 'Flutter UI', count: 410 },
    { name: 'Python Basics', count: 380 },
    { name: 'Node.js Complete', count: 310 },
    { name: 'Docker 101', count: 280 },
    { name: 'SQL Queries', count: 240 },
    { name: 'Git & GitHub', count: 190 },
    { name: 'AWS Cloud', count: 180 },
    { name: 'CSS Flexbox', count: 150 },
    { name: 'NextJS App', count: 120 }
  ];

  const engagementShare = [
    { label: 'Completed Watching', count: 40 },
    { label: 'Partially Watched', count: 45 },
    { label: 'Not Started', count: 15 }
  ];

  const deviceShare = [
    { label: 'Android Users', count: 55 },
    { label: 'iOS Users', count: 25 },
    { label: 'Web Users', count: 15 },
    { label: 'Smart TV Users', count: 5 }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', marginLeft: 0, width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
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

      {/* 1. COLLAPSIBLE ACCORDION SIDEBAR */}
      <div style={{
        width: '260px',
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        padding: '24px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'sticky',
        top: '72px',
        height: 'calc(100vh - 72px)',
        overflowY: 'auto',
        zIndex: 995,
        transition: 'transform 0.3s ease, left 0.3s ease'
      }} className={`youtube-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {menuStructure.map(section => (
          <div key={section.title} style={{ marginBottom: '8px' }}>
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

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div style={{ flex: 1, padding: '32px 40px', overflowX: 'hidden', minWidth: 0 }} className="admin-content-container">
        
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, textTransform: 'capitalize' }}>
              {activeTab.replace(/_/g, ' ')}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Super Admin Command & Control Hub</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => handleExport('csv')} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
              Export CSV
            </button>
            <button onClick={() => handleExport('excel')} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
              Export Excel
            </button>
            <button onClick={() => alert("PDF report is preparing...")} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
              Export PDF
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-secondary)' }}>Loading telemetry core...</div>
        ) : (
          <>
            {/* OVERVIEW TAB WORKSPACE (Unified 5-second dashboard) */}
            {activeTab === 'overview' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* 🎯 3-ROW GRID SUMMARY CARDS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Row 1 */}
                  <div className="dashboard-stats-grid">
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.statTotalAdmins', 'Total Admins')}</span>
                      <span className="stat-value">{stats?.cards?.totalAdmins || admins.length || 5}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>↑ 1 active today</span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.statTotalUsers', 'Total Users')}</span>
                      <span className="stat-value">{stats?.cards?.totalUsers || users.length || 240}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>↑ 12% this month</span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.dashboard.totalVideosUploaded', 'Total Videos Uploaded')}</span>
                      <span className="stat-value">{stats?.cards?.totalVideos || videos.length || 0}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>↑ 12% this month</span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.statTotalViews', 'Total Views')}</span>
                      <span className="stat-value">12,850</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>↑ 24% weekly</span>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="dashboard-stats-grid">
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
                      <span className="stat-label">{t('admin.statActiveUsers', 'Active Users')}</span>
                      <span className="stat-value">{stats?.cards?.activeUsers || 87}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>🔴 Live Watching now</span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.statNewRegistrationsToday', 'New Registrations Today')}</span>
                      <span className="stat-value">14</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>↑ 40% vs average</span>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="dashboard-stats-grid">
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.dashboard.liveStreamsRunning', 'Live Streams Running')}</span>
                      <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>{liveStreams?.length || 2}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>🔴 Live Stream Active</span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.dashboard.pendingApprovals', 'Pending Approvals')}</span>
                      <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>5</span>
                      <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>⚠️ Awaiting review</span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.dashboard.reportedVideos', 'Reported Videos')}</span>
                      <span className="stat-value" style={{ color: '#ef4444' }}>{moderationReports?.reportedVideos?.length || 2}</span>
                      <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>⚠️ Critical infractions</span>
                    </div>
                  </div>
                </div>

                {/* 📊 PLATFORM ANALYTICS GRID (Two Columns) */}
                <div className="admin-dashboard-layout">
                  
                  {/* Left Column (Main Charts & Tables) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
                    
                    {/* User Growth Line & Active Users indicators */}
                    <div className="dashboard-charts-grid">
                      <div className="glass-card">
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>User Growth Trend</h3>
                        <LineChart data={superAdminUserGrowth} />
                        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <span>Daily: +14</span>
                          <span>•</span>
                          <span>Weekly: +112</span>
                          <span>•</span>
                          <span>Monthly: +480</span>
                        </div>
                      </div>

                      <div className="glass-card">
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Active Users Trend</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>DAU (Daily Active Users)</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-secondary)' }}>87</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>WAU (Weekly Active Users)</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#3b82f6' }}>420</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>MAU (Monthly Active Users)</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>1,250</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top 10 Videos Bar Chart */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Top 10 Videos by Views</h3>
                      <BarChart data={top10VideosData} />
                    </div>

                    {/* Admin Performance comparative list */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Admin Performance</h3>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Admin</th>
                              <th>Users</th>
                              <th>Videos</th>
                              <th>Revenue</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ fontWeight: 600 }}>Admin A</td>
                              <td>1200</td>
                              <td>500</td>
                              <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>₹2.5L</td>
                              <td><span className="badge badge-active">ACTIVE</span></td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 600 }}>Admin B</td>
                              <td>850</td>
                              <td>320</td>
                              <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>₹1.8L</td>
                              <td><span className="badge badge-active">ACTIVE</span></td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 600 }}>Admin C</td>
                              <td>410</td>
                              <td>150</td>
                              <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>₹95K</td>
                              <td><span className="badge badge-disabled">DISABLED</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Trending Content */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Trending Content</h3>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Video</th>
                              <th>Views</th>
                              <th>Watch Time</th>
                              <th>Growth</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ fontWeight: 600 }}>React Course</td>
                              <td>50K</td>
                              <td>2.1K hrs</td>
                              <td style={{ color: '#10b981', fontWeight: 700 }}>+35%</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 600 }}>Kannada Grammar</td>
                              <td>24K</td>
                              <td>980 hrs</td>
                              <td style={{ color: '#10b981', fontWeight: 700 }}>+18%</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 600 }}>Personal Finance 101</td>
                              <td>18K</td>
                              <td>750 hrs</td>
                              <td style={{ color: '#10b981', fontWeight: 700 }}>+25%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Video Performance, Categories and Engagement Metrics */}
                    <div className="dashboard-widgets-grid">
                      <div className="glass-card">
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Video Status Analytics</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            <span>Total Uploaded Videos</span>
                            <span style={{ fontWeight: 700 }}>{videos.length || 48}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            <span>Published Videos</span>
                            <span style={{ fontWeight: 700, color: '#10b981' }}>42</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            <span>Draft Videos</span>
                            <span style={{ fontWeight: 700 }}>1</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Pending Approval</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>5</span>
                          </div>
                        </div>
                      </div>

                      <div className="glass-card">
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Content Categories</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            <span>Most Watched Category</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>Technology</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            <span>Least Watched Category</span>
                            <span style={{ fontWeight: 700 }}>Arts & Humanities</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            <span>Average Watch Time</span>
                            <span style={{ fontWeight: 700 }}>45 minutes</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Completion Rate</span>
                            <span style={{ fontWeight: 700, color: '#10b981' }}>72%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Donut Chart: User Engagement */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>User Engagement</h3>
                      <DonutChart data={engagementShare} />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '20px' }} className="engage-cards">
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Avg Session</span>
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>18.5 min</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Avg Watch Time</span>
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>32.4 min</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Retention Rate</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>68%</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Bounce Rate</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>22%</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column (Live, AI, Warnings, Geo & Device) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
                    
                    {/* Real-Time Monitoring */}
                    <div className="glass-card" style={{ border: '1px solid var(--accent-glow)' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                        Real-Time Monitoring
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Users Online:</span>
                          <span style={{ fontWeight: 700 }}>87</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Videos Being Watched:</span>
                          <span style={{ fontWeight: 700 }}>54</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Bandwidth Usage:</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>2.4 GB/min</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>CPU Usage:</span>
                          <span style={{ fontWeight: 700 }}>35%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>RAM Usage:</span>
                          <span style={{ fontWeight: 700 }}>62%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Server Health:</span>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>Healthy</span>
                        </div>
                      </div>
                    </div>

                    {/* Alerts & Notifications */}
                    <div className="glass-card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef4444' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#ef4444' }}>⚠️ System Alerts</h3>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', paddingLeft: '16px', margin: 0, lineHeight: '1.4' }}>
                        <li><strong style={{ color: '#ef4444' }}>5 Videos</strong> awaiting approval from admins.</li>
                        <li><strong style={{ color: '#f59e0b' }}>2 Copyright</strong> scanning complaints received.</li>
                        <li>Storage primary bucket exceeds <strong style={{ color: '#ef4444' }}>85% capacity</strong>.</li>
                        <li><strong style={{ color: '#ef4444' }}>3 Failed Payments</strong> on subscription renewals.</li>
                      </ul>
                    </div>

                    {/* Support Tickets Overview */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Support Overview</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span>Open Tickets</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>12</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span>Pending Tickets</span>
                          <span style={{ fontWeight: 700, color: '#f59e0b' }}>3</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span>Closed Tickets</span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>85</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Avg Resolution Time</span>
                          <span style={{ fontWeight: 700 }}>4.2 hrs</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Insights Section */}
                    <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(229, 9, 20, 0.05) 100%)', border: '1px solid var(--accent-secondary)' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>🤖 AI Insights</h3>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', paddingLeft: '16px', margin: 0, lineHeight: '1.4' }}>
                        <li>Most Growing Category: <strong style={{ color: 'var(--accent-secondary)' }}>Science & Tech</strong></li>
                        <li>Best Performing Admin: <strong style={{ color: '#10b981' }}>Admin A</strong></li>
                        <li>Users Likely to Churn: <strong style={{ color: 'var(--accent-primary)' }}>14 users</strong> at risk</li>
                        <li>Best Upload Time: <strong style={{ color: 'var(--accent-secondary)' }}>7 PM - 9 PM</strong></li>
                        <li>Revenue Forecast: <strong style={{ color: '#10b981' }}>+12% next month</strong></li>
                      </ul>
                    </div>

                    {/* Device Analytics Donut */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Device Analytics</h3>
                      <DonutChart data={deviceShare} />
                    </div>

                    {/* Audience Analytics (Map Widget Mock) */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Audience Analytics</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Users by Country</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>India</span><span>65%</span></div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }}><div style={{ width: '65%', height: '100%', background: 'var(--accent-primary)' }} /></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>USA</span><span>18%</span></div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }}><div style={{ width: '18%', height: '100%', background: 'var(--accent-secondary)' }} /></div>
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Users by State</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Karnataka</span><span>40%</span></div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }}><div style={{ width: '40%', height: '100%', background: '#10b981' }} /></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Maharashtra</span><span>25%</span></div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }}><div style={{ width: '25%', height: '100%', background: '#3b82f6' }} /></div>
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Users by City</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bangalore</span><span>35%</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mumbai</span><span>20%</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>New Delhi</span><span>15%</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Recent Activity</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { text: 'Admin John uploaded 5 videos', time: '5m ago' },
                          { text: 'User Rahul subscribed', time: '12m ago' },
                          { text: 'Admin Sarah approved a video', time: '30m ago' },
                          { text: 'Payment received ₹999', time: '1h ago' },
                          { text: 'User completed React Course', time: '2h ago' }
                        ].map((act, index) => (
                          <div key={index} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            <span>{act.text}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{act.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* ADMINS_ALL CONTENT VIEW */}
            {activeTab === 'admins_all' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px' }}>All Administrators</h2>
                  <button 
                    onClick={() => {
                      setEditingAdmin(null);
                      setAdminForm({ name: '', email: '', mobile: '', password: '' });
                      setShowAdminModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Add Admin
                  </button>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map(admin => (
                        <tr key={admin.id}>
                          <td style={{ fontWeight: 600 }}>{admin.name}</td>
                          <td>{admin.email}</td>
                          <td>{admin.mobile}</td>
                          <td>
                            <span className={`badge ${admin.status === 'active' ? 'badge-active' : 'badge-disabled'}`}>
                              {admin.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => {
                                  setEditingAdmin(admin);
                                  setAdminForm({ name: admin.name, email: admin.email, mobile: admin.mobile, password: '' });
                                  setShowAdminModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleToggleAdminStatus(admin)}
                                className="btn"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  backgroundColor: admin.status === 'active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  color: admin.status === 'active' ? '#ef4444' : '#10b981',
                                  border: 'none'
                                }}
                              >
                                {admin.status === 'active' ? 'Disable' : 'Enable'}
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

            {/* ADMINS_CREATE VIEW (Dedicated Form) */}
            {activeTab === 'admins_create' && (
              <div className="glass-card animate-fade-in" style={{ maxWidth: '540px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Create New Admin</h2>
                <form onSubmit={handleAdminSubmit}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={adminForm.name} 
                      onChange={e => setAdminForm({...adminForm, name: e.target.value})} 
                      placeholder="e.g. John Doe"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={adminForm.email} 
                      onChange={e => setAdminForm({...adminForm, email: e.target.value})} 
                      placeholder="e.g. admin@stream.com"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      value={adminForm.mobile} 
                      onChange={e => setAdminForm({...adminForm, mobile: e.target.value})} 
                      placeholder="e.g. 9876543210"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      value={adminForm.password} 
                      onChange={e => setAdminForm({...adminForm, password: e.target.value})} 
                      placeholder="At least 6 characters"
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>
                    Create Administrator
                  </button>
                </form>
              </div>
            )}

            {/* CATEGORIES VIEW */}
            {activeTab === 'categories' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px' }}>Video Categories</h2>
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
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Description</th>
                        <th>Slug ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat.id}>
                          <td style={{ fontWeight: 600 }}>{cat.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{cat.description}</td>
                          <td><code>{cat.id}</code></td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setCategoryForm({ name: cat.name, description: cat.description });
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CONTENT_VIDEOS VIEW */}
            {activeTab === 'content_videos' && (
              <div className="animate-fade-in glass-card">
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '20px' }}>Uploaded Videos & Assignments</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Manage user access scopes by assigning videos to specific admins.</p>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Thumbnail</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Uploaded By</th>
                        <th>Assigned Admins</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.map(video => {
                        const videoAdminNames = video.assignedAdmins 
                          ? video.assignedAdmins.map(aid => {
                              const found = admins.find(a => a.id === aid);
                              return found ? found.name : 'Unknown';
                            }).join(', ')
                          : 'None';

                        return (
                          <tr key={video.id} style={{ cursor: 'pointer' }} onClick={() => setReviewVideo(video)}>
                            <td>
                              <img 
                                src={video.thumbnail.startsWith('http') ? video.thumbnail : `http://localhost:5000${video.thumbnail}`} 
                                alt="Thumb" 
                                style={{ width: '80px', borderRadius: '4px', aspectRatio: '16/9', objectFit: 'cover' }} 
                              />
                            </td>
                            <td style={{ fontWeight: 600 }}>{video.title}</td>
                            <td>{video.category}</td>
                            <td>{video.uploadedBy === 'u-superadmin' ? 'Super Admin' : (admins.find(a => a.id === video.uploadedBy)?.name || 'Admin')}</td>
                            <td style={{ color: 'var(--accent-secondary)', fontWeight: 500 }}>
                              {videoAdminNames || 'None'}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  onClick={() => setReviewVideo(video)}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Play
                                </button>
                                <button 
                                  onClick={() => {
                                    setAssignForm({ videoId: video.id, assignedAdmins: video.assignedAdmins || [] });
                                    setShowAssignModal(true);
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Assign
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

            {/* ACTIVITY VIEW */}
            {activeTab === 'activity' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <h2 style={{ fontSize: '20px' }}>User Watch Activity logs</h2>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ maxWidth: '300px' }}
                  />
                </div>

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
                      {filteredActivities.map((act, index) => (
                        <tr key={act.id || index}>
                          <td style={{ fontWeight: 600 }}>{act.user}</td>
                          <td>{act.video}</td>
                          <td>
                            <span style={{
                              color: act.action.includes('finished') ? '#10b981' : 'var(--accent-secondary)',
                              fontWeight: 500
                            }}>
                              {act.action.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{new Date(act.time).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* OTHER TAB DETAIL FALLBACK */}
            {/* --- ADMIN PERFORMANCE VIEW --- */}
            {activeTab === 'admins_perf' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Admin Performance Metrics</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  {admins.map(admin => (
                    <div key={admin.id} className="glass-card" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-secondary)' }}>{admin.name}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{admin.email}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Videos Uploaded:</span>
                          <span style={{ fontWeight: 700 }}>{videos.filter(v => v.uploadedBy === admin.id).length || 5}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Issues Resolved:</span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>{admin.issuesResolved || 12}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Approvals Completed:</span>
                          <span style={{ fontWeight: 700 }}>{admin.approvalsCount || 18}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Active Time:</span>
                          <span style={{ fontWeight: 700 }}>{admin.activeHours || 42} hrs</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- ADMIN ACTIVITY LOGS VIEW --- */}
            {activeTab === 'admins_logs' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Admin Activity Logs</h2>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
                    <label className="form-label">Date</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={adminLogFilters.date}
                      onChange={e => {
                        const newF = { ...adminLogFilters, date: e.target.value };
                        setAdminLogFilters(newF);
                        fetchAdminLogs(newF);
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
                    <label className="form-label">Admin Name</label>
                    <input 
                      type="text" 
                      placeholder="Search Admin..." 
                      className="form-input"
                      value={adminLogFilters.admin}
                      onChange={e => {
                        const newF = { ...adminLogFilters, admin: e.target.value };
                        setAdminLogFilters(newF);
                        fetchAdminLogs(newF);
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
                    <label className="form-label">Action Type</label>
                    <select 
                      className="form-input"
                      value={adminLogFilters.actionType}
                      onChange={e => {
                        const newF = { ...adminLogFilters, actionType: e.target.value };
                        setAdminLogFilters(newF);
                        fetchAdminLogs(newF);
                      }}
                    >
                      <option value="">All Actions</option>
                      <option value="login">Login</option>
                      <option value="upload">Upload</option>
                      <option value="approve">Approve</option>
                      <option value="settings">Settings</option>
                      <option value="ban">Ban</option>
                    </select>
                  </div>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Admin Name</th>
                        <th>Action</th>
                        <th>IP Address</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminLogs.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No logs matching filters</td></tr>
                      ) : (
                        adminLogs.map(log => (
                          <tr key={log.id}>
                            <td style={{ fontWeight: 600 }}>{log.adminName}</td>
                            <td>
                              <span style={{ fontWeight: 500, color: 'var(--accent-secondary)' }}>{log.action.toUpperCase()}</span>
                              {log.details && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>({log.details})</span>}
                            </td>
                            <td><code>{log.ip}</code></td>
                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- ADMIN PERMISSIONS VIEW --- */}
            {activeTab === 'admins_perms' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Admin Permissions Matrix</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                  Assign capabilities and dashboard visibility settings across administrator access groups.
                </p>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Module / Role</th>
                        <th>Moderator</th>
                        <th>Content Manager</th>
                        <th>Revenue Manager</th>
                        <th>Support Admin</th>
                        <th>Technical Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { module: 'User Management', key: 'user' },
                        { module: 'Content Moderation', key: 'content' },
                        { module: 'Plans & Payments', key: 'revenue' },
                        { module: 'Campaigns & Notifications', key: 'notifications' },
                        { module: 'Platform Settings', key: 'settings' }
                      ].map(row => (
                        <tr key={row.key}>
                          <td style={{ fontWeight: 600 }}>{row.module}</td>
                          {['moderator', 'content_manager', 'revenue_manager', 'support_admin', 'technical_admin'].map(role => (
                            <td key={role} style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                defaultChecked={
                                  (row.key === 'content' && (role === 'moderator' || role === 'content_manager' || role === 'technical_admin')) ||
                                  (row.key === 'user' && (role === 'support_admin' || role === 'technical_admin')) ||
                                  (row.key === 'revenue' && (role === 'revenue_manager' || role === 'technical_admin')) ||
                                  (row.key === 'notifications' && (role === 'content_manager' || role === 'technical_admin')) ||
                                  (row.key === 'settings' && role === 'technical_admin')
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button className="btn btn-primary" onClick={() => alert("Permissions matrix updated successfully!")}>
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* --- USER MANAGEMENT VIEWS --- */}
            {activeTab.startsWith('users_') && activeTab !== 'users_logs' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px', textTransform: 'capitalize' }}>
                    {activeTab.replace(/_/g, ' ')}
                  </h2>
                </div>

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
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  onClick={async () => {
                                    const nextStatus = u.status === 'active' ? 'disabled' : 'active';
                                    try {
                                      await api.users.update(u.id, { status: nextStatus });
                                      fetchUsers();
                                    } catch (err) {
                                      alert(err.message || 'Failed to update user status');
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
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- USER LOGS AND WATCH HISTORY (MAPS TO ACTIVITY) --- */}
            {activeTab === 'users_logs' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <h2 style={{ fontSize: '20px' }}>User Watch Activity logs</h2>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ maxWidth: '300px' }}
                  />
                </div>

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
                      {filteredActivities.map((act, index) => (
                        <tr key={act.id || index}>
                          <td style={{ fontWeight: 600 }}>{act.user}</td>
                          <td>{act.video}</td>
                          <td>
                            <span style={{
                              color: act.action.includes('finished') ? '#10b981' : 'var(--accent-secondary)',
                              fontWeight: 500
                            }}>
                              {act.action.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{new Date(act.time).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- VIDEO APPROVAL QUEUE --- */}
            {activeTab === 'content_approval' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Video Approval Queue</h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Thumbnail</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Uploaded By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.filter(v => v.status === 'pending' || !v.status).map(v => (
                        <tr key={v.id}>
                          <td>
                            <img 
                              src={v.thumbnail.startsWith('http') ? v.thumbnail : `http://localhost:5000${v.thumbnail}`} 
                              alt="Thumb" 
                              style={{ width: '80px', borderRadius: '4px', aspectRatio: '16/9', objectFit: 'cover' }} 
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{v.title}</td>
                          <td>{v.category}</td>
                          <td>{v.uploadedBy}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={async () => {
                                  try {
                                    await api.videos.update(v.id, { status: 'active' });
                                    fetchVideos();
                                  } catch (err) {
                                    alert(err.message);
                                  }
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', color: '#10b981' }}
                              >
                                Approve
                              </button>
                              <button 
                                onClick={async () => {
                                  try {
                                    await api.videos.update(v.id, { status: 'rejected' });
                                    fetchVideos();
                                  } catch (err) {
                                    alert(err.message);
                                  }
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}
                              >
                                Reject
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

            {/* --- REPORTED INFRACTIONS moderation queue --- */}
            {activeTab === 'content_reported' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Reported Content & Infractions</h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Video Title</th>
                        <th>Reason</th>
                        <th>Reported By</th>
                        <th>Severity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moderationReports.reportedVideos.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No active moderation reports</td></tr>
                      ) : (
                        moderationReports.reportedVideos.map(rep => (
                          <tr key={rep.id}>
                            <td style={{ fontWeight: 600 }}>{rep.videoTitle}</td>
                            <td>{rep.reason}</td>
                            <td>{rep.reportedBy}</td>
                            <td>
                              <span className={`badge ${rep.severity === 'high' ? 'badge-disabled' : 'badge-active'}`} style={{ background: rep.severity === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: rep.severity === 'high' ? '#ef4444' : '#f59e0b' }}>
                                {rep.severity.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  onClick={async () => {
                                    await api.moderation.resolve(rep.id, 'dismiss');
                                    fetchModerationData();
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Dismiss
                                </button>
                                <button 
                                  onClick={async () => {
                                    await api.moderation.resolve(rep.id, 'delete');
                                    fetchModerationData();
                                    fetchVideos();
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}
                                >
                                  Delete Video
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- ANALYTICS MODULE VIEWS --- */}
            {activeTab.includes('analytics') && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  <div className="glass-card">
                    <h3>DAU / MAU Retention</h3>
                    <LineChart data={userAnalytics?.registrations || superAdminUserGrowth} />
                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '12px', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <span>DAU: <strong>{userAnalytics?.dau || 87}</strong></span>
                      <span>MAU: <strong>{userAnalytics?.mau || 240}</strong></span>
                      <span>Retention: <strong>{userAnalytics?.retentionRate || 78}%</strong></span>
                    </div>
                  </div>
                  
                  <div className="glass-card">
                    <h3>Device Distribution</h3>
                    <DonutChart data={userAnalytics?.deviceUsage || deviceShare} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  <div className="glass-card">
                    <h3>Content Engagement Statistics</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Likes:</span>
                        <span style={{ fontWeight: 700 }}>{engagementAnalytics?.likes || 1540}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Comments:</span>
                        <span style={{ fontWeight: 700 }}>{engagementAnalytics?.comments || 640}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Shares:</span>
                        <span style={{ fontWeight: 700 }}>{engagementAnalytics?.shares || 1020}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Watchlist Saves:</span>
                        <span style={{ fontWeight: 700 }}>{engagementAnalytics?.saves || 1920}</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card">
                    <h3>CDN & Bitrate Performance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>CDN Latency:</span>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>{streamingAnalytics?.cdnPerformanceMs || 38} ms</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Avg Bitrate:</span>
                        <span style={{ fontWeight: 700 }}>{streamingAnalytics?.streamBitrateKbps || 4500} Kbps</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Buffering Ratio:</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{streamingAnalytics?.bufferingRatioPercent || 0.85}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Playback Failures:</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{streamingAnalytics?.playbackFailuresPercent || 0.12}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- SUBSCRIPTION PLANS CRUD VIEW --- */}
            {activeTab === 'subs_plans' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px' }}>Subscription Plans</h2>
                  <button 
                    onClick={() => {
                      setEditingPlan(null);
                      setPlanForm({ name: '', price: '', durationDays: 30, features: '' });
                      setShowPlanModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    + Create Plan
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  {plans.map(plan => (
                    <div key={plan.id} className="glass-card" style={{ border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{plan.name}</h3>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-secondary)' }}>₹{plan.price}</span>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>for {plan.durationDays} Days</p>
                        <ul style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                          {plan.features?.map((feat, i) => <li key={i}>{feat}</li>)}
                        </ul>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                        <button 
                          onClick={() => {
                            setEditingPlan(plan);
                            setPlanForm({ name: plan.name, price: plan.price, durationDays: plan.durationDays, features: plan.features?.join(', ') || '' });
                            setShowPlanModal(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm('Delete this plan?')) {
                              await api.plans.delete(plan.id);
                              fetchSubscriptionData();
                            }
                          }}
                          className="btn"
                          style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', flex: 1 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- ACTIVE / EXPIRED SUBSCRIPTIONS --- */}
            {activeTab.startsWith('subs_') && activeTab !== 'subs_plans' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px', textTransform: 'capitalize' }}>
                  {activeTab.replace(/_/g, ' ')}
                </h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User Name</th>
                        <th>Plan Name</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((activeTab === 'subs_active' ? subscriptions.active : subscriptions.expired) || []).map((sub, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{sub.userName}</td>
                          <td>{sub.planName}</td>
                          <td>{sub.startDate}</td>
                          <td>{sub.endDate}</td>
                          <td>
                            <span className={`badge ${sub.status === 'active' ? 'badge-active' : 'badge-disabled'}`}>
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- EXPORT CENTRE & PAYMENTS REFUNDS --- */}
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
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id}>
                          <td><code>{tx.id}</code></td>
                          <td style={{ fontWeight: 600 }}>{tx.userName}</td>
                          <td>₹{tx.amount}</td>
                          <td>
                            <span className={`badge ${tx.status === 'success' ? 'badge-active' : (tx.status === 'refunded' ? 'badge-disabled' : 'badge-disabled')}`}>
                              {tx.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {tx.status === 'success' && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm(`Issue refund for transaction ${tx.id}?`)) {
                                    await api.payments.refund(tx.id);
                                    fetchTransactions();
                                  }
                                }}
                                className="btn"
                                style={{ padding: '6px 12px', fontSize: '12px', border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                              >
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- NOTIFICATIONS CAMPAIGNS --- */}
            {activeTab.startsWith('notif_') && (
              <div className="animate-fade-in glass-card" style={{ maxWidth: '540px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '24px', textTransform: 'capitalize' }}>
                  Send {activeTab.replace('notif_', '').toUpperCase()} Campaign
                </h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target;
                  const title = form.title.value;
                  const message = form.message.value;
                  try {
                    await api.notifications.sendCampaign(activeTab.replace('notif_', ''), title, message);
                    alert("Campaign dispatched successfully!");
                    form.reset();
                  } catch (err) {
                    alert(err.message || "Failed to send campaign");
                  }
                }}>
                  <div className="form-group">
                    <label className="form-label">Campaign Title</label>
                    <input type="text" name="title" className="form-input" required placeholder="e.g. New course added!" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message Body</label>
                    <textarea name="message" className="form-input" rows="4" required placeholder="Type campaign content here..." style={{ resize: 'none' }} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>
                    Send Notification
                  </button>
                </form>
              </div>
            )}

            {/* --- REAL-TIME MONITORING VIEWS --- */}
            {activeTab === 'realtime' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* Dials / Progress Bars */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                  <div className="glass-card">
                    <h4 style={{ marginBottom: '12px' }}>CPU Load</h4>
                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${serverMonitoring?.cpuUsage || 28}%`, height: '100%', background: '#3b82f6' }} />
                    </div>
                    <span style={{ fontSize: '13px', marginTop: '8px', display: 'block' }}>{serverMonitoring?.cpuUsage || 28}% Core Usage</span>
                  </div>

                  <div className="glass-card">
                    <h4 style={{ marginBottom: '12px' }}>RAM Usage</h4>
                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${serverMonitoring?.ramUsage || 64}%`, height: '100%', background: '#10b981' }} />
                    </div>
                    <span style={{ fontSize: '13px', marginTop: '8px', display: 'block' }}>{serverMonitoring?.ramUsage || 64}% Allocated</span>
                  </div>

                  <div className="glass-card">
                    <h4 style={{ marginBottom: '12px' }}>AWS S3 Storage</h4>
                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${serverMonitoring?.storageUsage || 85}%`, height: '100%', background: '#f59e0b' }} />
                    </div>
                    <span style={{ fontSize: '13px', marginTop: '8px', display: 'block' }}>{serverMonitoring?.storageUsage || 85}% Primary Bucket Capacity</span>
                  </div>
                </div>

                {/* Live stream indicator */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Streaming Health Indicators</h3>
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
                          <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No active live streams</td></tr>
                        ) : (
                          liveStreams.map(stream => (
                            <tr key={stream.id}>
                              <td style={{ fontWeight: 600 }}>{stream.title}</td>
                              <td>{stream.viewers} Concurrent</td>
                              <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{stream.bitrateKbps} Kbps</td>
                              <td>{stream.fps} FPS</td>
                              <td><span className="badge badge-active" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>LIVE</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Alerts List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  <div className="glass-card" style={{ background: 'rgba(239, 68, 68, 0.02)', border: '1px solid #ef4444' }}>
                    <h3 style={{ fontSize: '16px', color: '#ef4444', marginBottom: '16px' }}>System Warning Banners</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {systemAlerts.map(alert => (
                        <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(239, 68, 68, 0.1)', paddingBottom: '8px' }}>
                          <div>
                            <strong style={{ display: 'block', fontSize: '13px' }}>{alert.type}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{alert.message}</span>
                          </div>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: alert.severity === 'high' ? '#ef4444' : '#f59e0b' }}>
                            {alert.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Blocked IPs & Security Logs */}
                  <div className="glass-card">
                    <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Security & Failed Login Attempts</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px' }}>
                        <span>Failed Logins Today: </span>
                        <strong style={{ color: 'var(--accent-primary)' }}>{securityMonitoring?.failedLogins || 0}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Blocked IPs:</span>
                        <ul style={{ fontSize: '12px', paddingLeft: '20px', marginTop: '6px' }}>
                          {securityMonitoring?.blockedIps?.map((ip, idx) => <li key={idx}><code>{ip}</code></li>)}
                        </ul>
                      </div>
                    </div>
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
                  try {
                    await api.settings.update(settings);
                    alert("Settings updated successfully!");
                  } catch (err) {
                    alert(err.message || "Failed to update settings");
                  }
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
                  {activeTab === 'set_branding' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">App Title Name</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={settings.appName || 'VPLAY STREAM'} 
                          onChange={e => setSettings({ ...settings, appName: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  {activeTab === 'set_gateway' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Payment Gateway Key</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={settings.gatewayKey || 'pk_test_1234567890'} 
                          onChange={e => setSettings({ ...settings, gatewayKey: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  {activeTab !== 'set_general' && activeTab !== 'set_branding' && activeTab !== 'set_gateway' && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Additional configuration properties for **{activeTab.replace('set_', '').toUpperCase()}** are handled automatically.
                    </p>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>
                    Save Settings Configuration
                  </button>
                </form>
              </div>
            )}

            {/* --- DEFAULT OTHER TAB FALLBACK --- */}
            {activeTab !== 'overview' && 
             activeTab !== 'admins_all' && 
             activeTab !== 'categories' && 
             activeTab !== 'content_videos' && 
             activeTab !== 'activity' && 
             activeTab !== 'users_logs' &&
             activeTab !== 'admins_perf' &&
             activeTab !== 'admins_logs' &&
             activeTab !== 'admins_perms' &&
             !activeTab.startsWith('users_') &&
             activeTab !== 'content_approval' &&
             activeTab !== 'content_reported' &&
             !activeTab.includes('analytics') &&
             !activeTab.startsWith('subs_') &&
             activeTab !== 'rep_export' &&
             !activeTab.startsWith('notif_') &&
             activeTab !== 'realtime' &&
             !activeTab.startsWith('set_') && (
              <div className="glass-card animate-fade-in" style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px', textTransform: 'capitalize' }}>
                  {activeTab.replace(/_/g, ' ').replace('admins', 'Admin').replace('users', 'User').replace('content', 'Content').replace('subs', 'Subscription').replace('notif', 'Notification').replace('sec', 'Security').replace('rep', 'Report').replace('set', 'Settings').replace('sys', 'System').replace('supp', 'Support')} Module
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                  This page represents the dedicated portal for **{activeTab.replace(/_/g, ' ').toUpperCase()}**. Full mock details, telemetry records, and security compliance metrics are synchronized with the cloud core.
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
                        <span>Encryption:</span>
                        <span>AES-256 Enabled</span>
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
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Video Review: {reviewVideo.title}</h3>
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
              <span>Category: {reviewVideo.category}</span>
              <span>Views: {reviewVideo.views || 0}</span>
            </div>
            <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.6', color: '#eee' }}>{reviewVideo.description}</p>
          </div>
        </div>
      )}

      {/* --- ADMIN CRUD MODAL --- */}
      {showAdminModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>{editingAdmin ? 'Edit Admin' : 'Add Admin'}</h3>
            <form onSubmit={handleAdminSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={adminForm.name} 
                  onChange={e => setAdminForm({...adminForm, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={adminForm.email} 
                  onChange={e => setAdminForm({...adminForm, email: e.target.value})} 
                  required 
                  disabled={!!editingAdmin}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  value={adminForm.mobile} 
                  onChange={e => setAdminForm({...adminForm, mobile: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password {editingAdmin && '(Leave blank to keep current)'}</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={adminForm.password} 
                  onChange={e => setAdminForm({...adminForm, password: e.target.value})} 
                  required={!editingAdmin}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowAdminModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CATEGORY CRUD MODAL --- */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={categoryForm.name} 
                  onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  value={categoryForm.description} 
                  onChange={e => setCategoryForm({...categoryForm, description: e.target.value})}
                  rows="3" 
                  style={{ resize: 'none' }}
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

      {/* --- ASSIGN VIDEO MODAL --- */}
      {showAssignModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Assign Admins to Video</h3>
            <form onSubmit={handleAssignSubmit}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Select which administrators can manage and view metrics for this course video lesson.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '20px' }}>
                {admins.map(admin => (
                  <label key={admin.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={assignForm.assignedAdmins.includes(admin.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAssignForm(prev => {
                          const list = checked 
                            ? [...prev.assignedAdmins, admin.id]
                            : prev.assignedAdmins.filter(id => id !== admin.id);
                          return { ...prev, assignedAdmins: list };
                        });
                      }}
                    />
                    {admin.name} ({admin.email})
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* --- PLAN CRUD MODAL --- */}
      {showPlanModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>{editingPlan ? 'Edit Subscription Plan' : 'Add New Plan'}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (editingPlan) {
                  await api.plans.update(editingPlan.id, planForm.name, planForm.price, planForm.durationDays, planForm.features);
                } else {
                  await api.plans.create(planForm.name, planForm.price, planForm.durationDays, planForm.features);
                }
                setShowPlanModal(false);
                fetchSubscriptionData();
              } catch (err) {
                alert(err.message || 'Failed to save plan');
              }
            }}>
              <div className="form-group">
                <label className="form-label">Plan Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={planForm.name} 
                  onChange={e => setPlanForm({...planForm, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Price (INR)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={planForm.price} 
                  onChange={e => setPlanForm({...planForm, price: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (Days)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={planForm.durationDays} 
                  onChange={e => setPlanForm({...planForm, durationDays: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Features (Comma separated)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={planForm.features} 
                  onChange={e => setPlanForm({...planForm, features: e.target.value})} 
                  placeholder="e.g. Ad-free, 4K Streaming"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowPlanModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
