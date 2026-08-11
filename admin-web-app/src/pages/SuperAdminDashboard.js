import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart, DonutChart, LineChart } from '../components/SVGCharts';
import { useLanguage } from '../context/LanguageContext';
import AdminDashboard from './AdminDashboard';
import PaginatedTable from '../components/PaginatedTable';
import ThreeDLoader from '../components/ThreeDLoader';

const getFormattedSeconds = (sec) => {
  if (sec === undefined || sec === null) return '';
  const s = parseFloat(sec);
  if (isNaN(s)) return sec;
  if (s >= 3600) return `${(s / 3600).toFixed(1)} hrs`;
  if (s >= 60) return `${Math.round(s / 60)} min`;
  return `${Math.round(s)} sec`;
};

const SuperAdminDashboard = ({ isSidebarOpen, toggleSidebar, theme }) => {
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
  const [adminForm, setAdminForm] = useState({ firstName: '', lastName: '', email: '', mobile: '', gender: '', dob: '', city: '', state: '', zipcode: '', address: '' });
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminFormLoading, setAdminFormLoading] = useState(false);

  const [customAlert, setCustomAlert] = useState({
    show: false,
    type: 'success', // success or error
    title: '',
    message: '',
    buttonText: 'OK',
    onConfirm: null
  });

  const showSuccess = (message, onConfirm = null) => {
    setCustomAlert({
      show: true,
      type: 'success',
      title: 'Success!',
      message,
      buttonText: 'Continue',
      onConfirm
    });
  };

  const showError = (message, onConfirm = null) => {
    setCustomAlert({
      show: true,
      type: 'error',
      title: 'Oooops!',
      message,
      buttonText: 'Try Again',
      onConfirm
    });
  };

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

  // Responsive state for mobile layout
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [moderationReports, setModerationReports] = useState({ reportedVideos: [], reportedUsers: [], copyrightIssues: [], spamDetection: [] });
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({});
  const [dropdownAdmins, setDropdownAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [genders, setGenders] = useState([]);
  const [selectedReportType, setSelectedReportType] = useState('user_activity');
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    // Initial fetch based on current activeTab (defaults to overview)
    if (activeTab === 'overview') {
      fetchDashboardData('overview');
    } else if (activeTab === 'analytics') {
      fetchDashboardData('analytics');
    } else if (activeTab === 'admins_all') {
      fetchAdmins();
    }
    fetchDropdownAdmins();
    fetchCategories();
    fetchVideos();
    fetchUsers();
    fetchGenders();
  }, []);

  useEffect(() => {
    fetchDropdownAdmins(activeTab);
    if (activeTab === 'overview') {
      fetchDashboardData('overview', selectedAdminId);
    }
    if (activeTab === 'analytics' || activeTab.includes('analytics')) {
      fetchDashboardData('analytics', selectedAdminId);
      fetchAnalyticsData();
    }
    if (activeTab === 'admins_all') {
      fetchAdmins();
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
      fetchReportData(selectedReportType, selectedAdminId);
    }
    if (activeTab === 'users_all' || activeTab.startsWith('users_')) {
      fetchUsers();
    }
    if (activeTab === 'content_videos') {
      fetchVideos();
    }
    if (activeTab === 'categories') {
      fetchCategories();
    }
  }, [activeTab, selectedAdminId, selectedReportType]);

  useEffect(() => {
    if (showAdminModal) {
      fetchGenders();
    }
  }, [showAdminModal]);

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

  const fetchReportData = async (reportType = selectedReportType, adminId = selectedAdminId) => {
    setReportLoading(true);
    try {
      const payload = {};
      if (adminId) {
        payload.admin_id = adminId;
      }
      const res = await api.reports.getSuperAdminReport(reportType, payload);
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray(res.data)) {
        list = res.data;
      } else if (res && Array.isArray(res.report)) {
        list = res.report;
      } else if (res && Array.isArray(res.result)) {
        list = res.result;
      } else if (res && typeof res === 'object') {
        const arrayProp = Object.values(res).find(val => Array.isArray(val));
        if (arrayProp) list = arrayProp;
      }
      const unpackedList = (list || []).map(item => (item && item.json ? item.json : item));
      setReportData(unpackedList);
    } catch (e) {
      console.error('Failed to fetch report data:', e);
      setReportData([]);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchDashboardData = async (formStep = 'overview', adminId = selectedAdminId) => {
    setLoading(true);
    try {
      const payload = {};
      if (adminId) {
        payload.admin_id = adminId;
      }
      
      let data;
      if (formStep === 'content_videos') {
        data = await api.dashboard.getSuperAdmin('getAllVidoes', payload);
        setVideos(Array.isArray(data) ? data : []);
      } else if (formStep === 'categories') {
        data = await api.dashboard.getSuperAdmin('getCategories', payload);
        setCategories(Array.isArray(data) ? data : []);
      } else {
        data = await api.dashboard.getSuperAdmin(formStep, payload);
        if (formStep === 'users_all' || formStep === 'users_blocked') {
          setUsers(Array.isArray(data) ? data : []);
        } else if (formStep === 'users_logs') {
          setActivities(Array.isArray(data) ? data : []);
        } else if (formStep === 'analytics') {
          const watchHistoryList = Array.isArray(data) ? data : [];
          setStats(prev => ({
            ...prev,
            watchHistoryDetails: watchHistoryList
          }));
        } else {
          const dashboardStats = Array.isArray(data) ? data[0] : data;
          setStats(dashboardStats);
          setActivities(dashboardStats?.recentActivities || []);
        }
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownAdmins = async (currentTab = activeTab) => {
    try {
      const formstep = (currentTab === 'content_videos' || currentTab === 'course_all') ? 'getAdminSA' : 'GetAdmins';
      const res = await api.dashboard.getSuperAdmin(formstep);
      console.log(`Fetched dropdown admins (${formstep}):`, res);
      let list = [];
      if (Array.isArray(res)) {
        list = res.map(item => item.json || item);
      } else if (res && Array.isArray(res.admins)) {
        list = res.admins.map(item => item.json || item);
      } else if (res && Array.isArray(res.data)) {
        list = res.data.map(item => item.json || item);
      } else if (res && typeof res === 'object') {
        const arrayProp = Object.values(res).find(val => Array.isArray(val));
        if (arrayProp) list = arrayProp.map(item => item.json || item);
      }
      setDropdownAdmins(list);
      
      // Auto-select the first admin if none selected
      if (list.length > 0 && !selectedAdminId) {
        const firstId = list[0].id || list[0].alpha_id || list[0].admin_id;
        if (firstId) {
          setSelectedAdminId(firstId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dropdown admins', err);
    }
  };

  const handleAdminChange = (e) => {
    const value = e.target.value;
    setSelectedAdminId(value);
    if (!['video_upload', 'course_upload', 'course_all'].includes(activeTab)) {
      fetchDashboardData(activeTab, value);
    }
  };

  const fetchAdmins = async () => {
    try {
      const data = await api.admins.list();
      let list = [];
      if (Array.isArray(data)) {
        list = data.map(item => item.json || item);
      } else if (data && Array.isArray(data.admins)) {
        list = data.admins.map(item => item.json || item);
      } else if (data && Array.isArray(data.data)) {
        list = data.data.map(item => item.json || item);
      } else if (data && typeof data === 'object') {
        const arrayProp = Object.values(data).find(val => Array.isArray(val));
        if (arrayProp) list = arrayProp.map(item => item.json || item);
      }
      setAdmins(list);
    } catch (e) {
      console.error(e);
      setAdmins([]);
    }
  };

  const fetchCategories = async () => {
    fetchDashboardData('categories', selectedAdminId);
  };

  const fetchVideos = async () => {
    fetchDashboardData('content_videos', selectedAdminId);
  };

  const fetchUsers = async () => {
    if (activeTab === 'users_all' || activeTab === 'users_blocked' || activeTab === 'users_logs') {
      fetchDashboardData(activeTab, selectedAdminId);
    } else {
      try {
        const data = await api.users.list();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setUsers([]);
      }
    }
  };

  const fetchGenders = async () => {
    try {
      const res = await api.dashboard.getSuperAdmin('getGender');
      console.log('Fetched genders:', res);
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
    } catch (e) {
      console.error('Failed to fetch genders', e);
      setGenders([]);
    }
  };

  // --- Admin CRUD Handlers ---
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    
    // Email regex validation (e.g. marco@gmail.com)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(adminForm.email)) {
      showError('Please enter a valid email address with a valid domain suffix (e.g. name@domain.com)');
      return;
    }

    // Phone number length validation
    if (adminForm.mobile.length !== 10) {
      showError('Phone number must be exactly 10 digits');
      return;
    }

    // Zipcode length validation
    if (adminForm.zipcode.length !== 6) {
      showError('Zipcode must be exactly 6 digits');
      return;
    }

    setAdminFormLoading(true);
    try {
      const dataToSave = {
        first_name: adminForm.firstName,
        last_name: adminForm.lastName,
        email: adminForm.email,
        phonenumber: adminForm.mobile,
        gender_id: adminForm.gender ? (parseInt(adminForm.gender, 10) || adminForm.gender) : null,
        date_of_birth: adminForm.dob ? new Date(adminForm.dob).toISOString() : null,
        address: adminForm.address,
        city: adminForm.city,
        state: adminForm.state,
        zipcode: adminForm.zipcode
      };

      if (editingAdmin) {
        await api.admins.update(editingAdmin.id, dataToSave);
        showSuccess('Admin updated successfully');
      } else {
        await api.admins.create(dataToSave);
        showSuccess('Admin added successfully');
      }
      setShowAdminModal(false);
      setAdminForm({ firstName: '', lastName: '', email: '', mobile: '', gender: '', dob: '', city: '', state: '', zipcode: '', address: '' });
      setEditingAdmin(null);
      fetchAdmins();
      fetchDashboardData();
      setActiveTab('admins_all'); // Redirect upon creation
    } catch (err) {
      if (err.status === 422) {
        showError('Phone Number Already exist');
      } else if (err.status === 433) {
        showError('Email Already exist');
      } else {
        showError(err.message || 'Failed to save admin');
      }
    } finally {
      setAdminFormLoading(false);
    }
  };

  const handleEditClick = async (admin) => {
    setEditingAdmin(admin);
    let adminData = admin;
    try {
      const res = await api.admins.get(admin.id);
      if (res && (res.id || res.email)) {
        adminData = res;
      }
    } catch (e) {
      console.warn("Failed to fetch admin details, using local data", e);
    }
    
    const matchedGender = genders.find(g => 
      String(g.name).toLowerCase() === String(adminData.gender).toLowerCase() || 
      String(g.id) === String(adminData.gender_id || adminData.gender)
    );
    const genderVal = matchedGender ? matchedGender.id : (adminData.gender_id || adminData.gender || '');

    let formattedDob = '';
    const dobRaw = adminData.date_of_birth || adminData.dob;
    if (dobRaw) {
      try {
        const d = new Date(dobRaw);
        if (!isNaN(d.getTime())) {
          formattedDob = d.toISOString().split('T')[0];
        }
      } catch (e) {
        formattedDob = dobRaw;
      }
    }

    setAdminForm({
      firstName: adminData.first_name || adminData.firstName || '',
      lastName: adminData.last_name || adminData.lastName || '',
      email: adminData.email || '',
      mobile: adminData.phonenumber || adminData.mobile || '',
      gender: genderVal,
      dob: formattedDob,
      city: adminData.city || '',
      state: adminData.state || '',
      zipcode: adminData.zipcode || '',
      address: adminData.address || ''
    });
    setShowAdminModal(true);
  };

  const handleToggleAdminStatus = async (admin) => {
    const isAdminActive = admin.status === true || String(admin.status).toLowerCase() === 'true' || String(admin.status).toLowerCase() === 'active';
    const nextStatus = !isAdminActive;
    try {
      await api.admins.toggleStatus(admin.id, nextStatus);
      fetchAdmins();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update admin status');
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

  // --- Report Export Handlers ---
  const handleExport = async (format) => {
    if (activeTab === 'rep_export') {
      try {
        setLoading(true);
        // Call the exact same API (vdsuperadmin/report) passing formstep and admin_id
        const res = await api.reports.getSuperAdminReport(selectedReportType, {
          admin_id: selectedAdminId,
          type: 'Report',
          export_type: format,
          format: format
        });

        const filename = `${selectedReportType}_report_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'csv' : format}`;

        // 1. If API returned a direct download URL string or object with file URL
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

        // 2. If API returned raw text / CSV data string
        if (typeof res === 'string' && res.trim().length > 0) {
          let mimeType = 'text/csv;charset=utf-8;';
          if (format === 'excel') mimeType = 'application/vnd.ms-excel;charset=utf-8;';
          if (format === 'pdf') mimeType = 'application/pdf;';

          const blob = new Blob([res], { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          return;
        }

        // 3. Construct file download from dataset array (API response or active reportData)
        const dataToExport = Array.isArray(res) && res.length > 0 
          ? res 
          : (reportData && reportData.length > 0 ? reportData : []);

        if (dataToExport.length === 0) {
          showError("No details available");
          return;
        }

        if (format === 'csv' || format === 'excel') {
          const headers = Object.keys(dataToExport[0]).filter(k => k !== 'pairedItem');
          const csvRows = [headers.join(',')];

          for (const row of dataToExport) {
            const values = headers.map(h => {
              const val = row[h];
              const escaped = ('' + (val ?? '')).replace(/"/g, '""');
              return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
          }

          const csvString = csvRows.join('\n');
          const mime = format === 'excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
          const ext = format === 'excel' ? 'csv' : 'csv';

          const blob = new Blob([csvString], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `${selectedReportType}_report_${new Date().toISOString().slice(0, 10)}.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } else if (format === 'pdf') {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            const headers = Object.keys(dataToExport[0]).filter(k => k !== 'pairedItem');
            let tableHtml = `<table border="1" style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:12px;"><thead><tr style="background:#f2f2f2;">`;
            headers.forEach(h => { tableHtml += `<th style="padding:8px;">${h}</th>`; });
            tableHtml += `</tr></thead><tbody>`;
            dataToExport.forEach(row => {
              tableHtml += `<tr>`;
              headers.forEach(h => { tableHtml += `<td style="padding:8px;">${row[h] ?? ''}</td>`; });
              tableHtml += `</tr>`;
            });
            tableHtml += `</tbody></table>`;

            printWindow.document.write(`
              <html>
                <head><title>${selectedReportType.toUpperCase()} REPORT PDF</title></head>
                <body style="padding:20px;">
                  <h2>${selectedReportType.replace('_', ' ').toUpperCase()} REPORT</h2>
                  <p style="color:#666;font-size:12px;">Generated on: ${new Date().toLocaleString()}</p>
                  ${tableHtml}
                  <script>window.onload = function() { window.print(); window.close(); }</script>
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        }
      } catch (err) {
        console.error("Report export error:", err);
        showError(err.message || "No details available");
      } finally {
        setLoading(false);
      }
      return;
    }

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
        showError(`Exporting platform statistics report in ${format.toUpperCase()} format...`);
      }
    } catch (e) {
      showError("Failed to export report");
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(act => {
    if (!act) return false;
    const userVal = String(act.user_name || act.user || '');
    const videoVal = String(act.video_name || act.video || act.videoLesson || '');
    const actionVal = String(act.watch_activity || act.action || '');
    const q = searchQuery.toLowerCase();
    return (
      userVal.toLowerCase().includes(q) ||
      videoVal.toLowerCase().includes(q) ||
      actionVal.toLowerCase().includes(q)
    );
  });

  const menuStructure = [
    {
      title: 'Dashboard',
      icon: '🏠',
      items: []
    },
    {
      title: 'Admin Management',
      icon: '👨💼',
      items: [
        { id: 'admins_all', label: 'All Admins' },
        { id: 'admins_perms', label: 'Admin Permissions' }
      ]
    },
    {
      title: 'User Management',
      icon: '👥',
      items: [
        { id: 'users_all', label: 'All Users' },
        { id: 'users_logs', label: 'User Activity Logs' },
        { id: 'users_blocked', label: 'Blocked Users' }
      ]
    },
    {
      title: 'Content Management',
      icon: '🎬',
      items: [
        { id: 'video_upload', label: 'Upload Video' },
        { id: 'course_upload', label: 'Upload Course' },
        { id: 'content_videos', label: 'All Videos' },
        { id: 'course_all', label: 'All Courses' },
        { id: 'categories', label: 'Categories' }
      ]
    },
    {
      title: 'Analytics',
      icon: '📈',
      items: [
        { id: 'user_analytics', label: 'User Analytics' },
        { id: 'video_analytics', label: 'Video Analytics' }
      ]
    },
    {
      title: 'Reports',
      icon: '📊',
      items: []
    },
    {
      title: 'Platform Settings',
      icon: '⚙️',
      items: [
        { id: 'set_general', label: 'General Settings' },
        { id: 'set_languages', label: 'Languages' }
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

      {/* 1. COLLAPSIBLE ACCORDION SIDEBAR */}
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
          const isReports = section.title === 'Reports';
          const isSelected = (isDashboard && activeTab === 'overview') || (isReports && (activeTab === 'rep_export' || activeTab.startsWith('rep_')));
          return (
            <div key={section.title} style={{ marginBottom: '8px', marginTop: idx === 0 ? '0px' : undefined }}>
              <button 
                onClick={() => {
                  if (isDashboard) {
                    setActiveTab('overview');
                    fetchDropdownAdmins();
                    setError('');
                    if (isSidebarOpen && toggleSidebar) {
                      toggleSidebar();
                    }
                  } else if (isReports) {
                    if (activeTab !== 'rep_export') {
                      setActiveTab('rep_export');
                    }
                    setError('');
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
                {!isDashboard && !isReports && (
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

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', height: '100%', minWidth: 0 }} className="admin-content-container">
        
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, textTransform: 'capitalize' }}>
              {(() => {
                if (activeTab === 'video_upload') return 'Upload Video';
                if (activeTab === 'course_upload') return 'Upload Course';
                if (activeTab === 'content_videos') return 'All Videos';
                if (activeTab === 'course_all') return 'All Courses';
                if (activeTab === 'admins_all') return 'All Admins';
                if (activeTab === 'users_all') return 'All Users';
                return activeTab.replace(/_/g, ' ');
              })()}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Super Admin Command & Control Hub</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {!['course_upload', 'admins_all'].includes(activeTab) && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Admin:</span>
                  <select 
                    value={selectedAdminId} 
                    onChange={handleAdminChange} 
                    className="btn btn-secondary" 
                    style={{ 
                      fontSize: '13px', 
                      padding: '8px 16px', 
                      background: 'rgba(255, 255, 255, 0.08)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-primary)', 
                      borderRadius: '8px', 
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {dropdownAdmins.map(admin => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name || admin.username || admin.email || `Admin ${admin.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                {activeTab === 'rep_export' && (
                  <>
                    <button onClick={() => handleExport('csv')} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                      Export CSV
                    </button>
                    <button onClick={() => handleExport('excel')} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                      Export Excel
                    </button>
                    <button onClick={() => handleExport('pdf')} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                      Export PDF
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <ThreeDLoader text="Loading telemetry core..." />
        ) : (
          <>
            {/* Embed Video Upload / Course Upload / All Courses from AdminDashboard */}
            {['video_upload', 'course_upload', 'course_all'].includes(activeTab) && (
              <AdminDashboard justContent={true} activeTabOverride={activeTab} selectedAdminId={selectedAdminId} theme={theme} />
            )}

            {/* OVERVIEW TAB WORKSPACE (Unified 5-second dashboard) */}
            {activeTab === 'overview' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* 🎯 3-ROW GRID SUMMARY CARDS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Row 1 */}
                  <div className="dashboard-stats-grid">
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.statActiveLearners', 'Active Learners')}</span>
                      <span className="stat-value">{stats?.active_lerners ?? stats?.active_learners ?? 0}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                        {stats?.active_leraners_percenatge !== undefined ? `+${stats.active_leraners_percenatge}% today` : ''}
                      </span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.statTotalUsers', 'Total Users')}</span>
                      <span className="stat-value">{stats?.total_users ?? stats?.cards?.totalUsers ?? users.length ?? 0}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                        {stats?.users_growth_percent ? `↑ ${stats.users_growth_percent}% this month` : ''}
                      </span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.dashboard.totalVideosUploaded', 'Total Videos Uploaded')}</span>
                      <span className="stat-value">{stats?.total_videos ?? stats?.cards?.totalVideos ?? videos.length ?? 0}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                        {stats?.upload_change !== undefined ? `+${stats.upload_change} today` : ''}
                      </span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.statTotalViews', 'Total Views')}</span>
                      <span className="stat-value">{stats?.total_video_views ?? 0}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                        {stats?.video_views_growth_percent ? `↑ ${stats.video_views_growth_percent}% weekly` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="dashboard-stats-grid">
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.dashboard.dailyWatchTime', 'Daily Watch Time')}</span>
                      <span className="stat-value">
                        {stats?.today_watch_sec !== undefined ? getFormattedSeconds(stats.today_watch_sec) : '0 min'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                        {stats?.daily_watch_growth_percent ? `↑ ${stats.daily_watch_growth_percent}% vs yesterday` : ''}
                      </span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.dashboard.monthlyWatchTime', 'Monthly Watch Time')}</span>
                      <span className="stat-value">
                        {stats?.month_watch_sec !== undefined ? getFormattedSeconds(stats.month_watch_sec) : '0 min'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                        {stats?.monthly_target_percent ? `${stats.monthly_target_percent}% of monthly target` : ''}
                      </span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.statTotalCourses', 'Total Courses')}</span>
                      <span className="stat-value">{stats?.total_courses ?? stats?.totalCourses ?? stats?.cards?.totalCourses ?? 0}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>🟢 Active catalog</span>
                    </div>
                    <div className="glass-card stat-card">
                      <span className="stat-label">{t('admin.statVideosUploadedToday', 'Videos Uploaded Today')}</span>
                      <span className="stat-value">{stats?.today_uploads ?? 0}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                        {stats?.upload_change !== undefined ? `${stats.upload_change >= 0 ? '+' : ''}${stats.upload_change} vs yesterday` : ''}
                      </span>
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
                        <LineChart data={stats?.user_growth || superAdminUserGrowth} />
                        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <span>Daily: {stats?.daily_signups !== undefined ? stats.daily_signups : 0}</span>
                          <span>•</span>
                          <span>Weekly: {stats?.weekly_signups !== undefined ? stats.weekly_signups : 0}</span>
                          <span>•</span>
                          <span>Monthly: {stats?.monthly_signups !== undefined ? stats.monthly_signups : 0}</span>
                        </div>
                      </div>

                      <div className="glass-card">
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Active Users Trend</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>DAU (Daily Active Users)</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-secondary)' }}>{stats?.dau ?? 0}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>WAU (Weekly Active Users)</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#3b82f6' }}>{stats?.wau ?? 0}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>MAU (Monthly Active Users)</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>{stats?.mau ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top 10 Videos Bar Chart */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Top 10 Videos by Views</h3>
                      <BarChart data={stats?.top_videos || []} />
                    </div>

                    {/* Trending Content */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Trending Content</h3>
                      <div className="table-container">
                        <PaginatedTable
                          headers={['Video', 'Views', 'Watch Time', 'Growth']}
                          data={stats?.top_content || []}
                          emptyMessage="No trending content found"
                          renderRow={(content, idx) => (
                            <tr key={content.id || idx}>
                              <td style={{ fontWeight: 600 }}>{content.videoLesson || content.title}</td>
                              <td>{content.views}</td>
                              <td>{content.watchTime}</td>
                              <td style={{ color: '#10b981', fontWeight: 700 }}>{content.completionPercentage}%</td>
                            </tr>
                          )}
                        />
                      </div>
                    </div>

                    {/* Donut Chart: User Engagement */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>User Engagement</h3>
                      <DonutChart data={stats?.engagement_donut_graph?.engagementShare || []} />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '20px' }} className="engage-cards">
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Avg Session</span>
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>{stats?.engagement_donut_graph?.engagementMetrics?.avgSession || '0 min'}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Avg Watch Time</span>
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>{stats?.engagement_donut_graph?.engagementMetrics?.avgWatchTime || '0 min'}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Retention Rate</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>{stats?.engagement_donut_graph?.engagementMetrics?.retentionRate || '0%'}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Bounce Rate</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>{stats?.engagement_donut_graph?.engagementMetrics?.bounceRate || '0%'}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column (Live, AI, Warnings, Geo & Device) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
                    



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
                      setAdminForm({ firstName: '', lastName: '', email: '', mobile: '', gender: '', dob: '', city: '', state: '', zipcode: '', address: '' });
                      setShowAdminModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Add Admin
                  </button>
                </div>

                <div className="table-container">
                  <PaginatedTable
                    headers={['Name', 'Email', 'Mobile', 'Status', 'Actions']}
                    data={admins}
                    emptyMessage="No administrators registered yet"
                    renderRow={(admin, index) => {
                      const isAdminActive = admin.status === true || String(admin.status).toLowerCase() === 'true' || String(admin.status).toLowerCase() === 'active';
                      return (
                        <tr key={admin.id || index}>
                          <td style={{ fontWeight: 600 }}>{admin.first_name ? `${admin.first_name} ${admin.last_name || ''}` : admin.name || 'Admin'}</td>
                          <td>{admin.email}</td>
                          <td>{admin.phonenumber || admin.mobile}</td>
                          <td>
                            <span className={`badge ${isAdminActive ? 'badge-active' : 'badge-disabled'}`}>
                              {isAdminActive ? 'Active' : 'InActive'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => handleEditClick(admin)}
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
                                  backgroundColor: isAdminActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  color: isAdminActive ? '#ef4444' : '#10b981',
                                  border: 'none'
                                }}
                              >
                                {isAdminActive ? 'Disable' : 'Enable'}
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
                  <PaginatedTable
                    headers={['Category Name', 'Description', 'Slug ID', 'Actions']}
                    data={categories}
                    emptyMessage="No categories found"
                    renderRow={(cat, index) => (
                      <tr key={cat.id || index}>
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
                    )}
                  />
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
                  <PaginatedTable
                    headers={['Thumbnail', 'Title', 'Category', 'Uploaded By', 'Assigned Admins', 'Actions']}
                    data={videos}
                    emptyMessage="No uploaded videos found"
                    renderRow={(video, index) => {
                      const videoAdminNames = video.assignedAdmins 
                        ? video.assignedAdmins.map(aid => {
                            const found = admins.find(a => a.id === aid);
                            return found ? found.name : 'Unknown';
                          }).join(', ')
                        : 'None';

                      return (
                        <tr key={video.id || index} style={{ cursor: 'pointer' }} onClick={() => setReviewVideo(video)}>
                          <td>
                            <img 
                              src={video.thumbnail && video.thumbnail.startsWith('http') ? video.thumbnail : (video.thumbnail ? `http://localhost:5000${video.thumbnail}` : 'https://placehold.co/180x101?text=No+Thumbnail')} 
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
                    }}
                  />
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
                  <PaginatedTable
                    headers={['User', 'Video', 'Action', 'Timestamp']}
                    data={filteredActivities}
                    emptyMessage="No activity logs found"
                    renderRow={(act, index) => (
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
                    )}
                  />
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
                  <PaginatedTable
                    headers={['Admin Name', 'Action', 'IP Address', 'Timestamp']}
                    data={adminLogs}
                    emptyMessage="No activity logs found matching the filters"
                    renderRow={(log, index) => (
                      <tr key={log.id || index}>
                        <td style={{ fontWeight: 600 }}>{log.adminName}</td>
                        <td>
                          <span style={{ fontWeight: 500, color: 'var(--accent-secondary)' }}>{log.action.toUpperCase()}</span>
                          {log.details && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>({log.details})</span>}
                        </td>
                        <td><code>{log.ip}</code></td>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    )}
                  />
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
                    {activeTab === 'users_all' ? 'All Users' : (activeTab === 'users_blocked' ? 'Blocked Users' : activeTab.replace(/_/g, ' '))}
                  </h2>
                </div>

                <div className="table-container">
                  <PaginatedTable
                    headers={['Name', 'Email', 'Mobile', 'Role', 'Status']}
                    data={(Array.isArray(users) ? users : [])
                      .filter(u => {
                        if (!u) return false;
                        if (activeTab === 'users_all' || activeTab === 'users_blocked') return true;
                        const uStatus = String(u.status || '').toLowerCase();
                        if (activeTab === 'users_active') return uStatus === 'active';
                        if (activeTab === 'users_inactive') return uStatus === 'disabled';
                        return true;
                      })
                    }
                    emptyMessage="No users found"
                    renderRow={(u, idx) => {
                      const nameVal = u.user_name || u.name || `User ${u.id || u.user_id || ''}`;
                      const emailVal = u.user_email || u.email || '';
                      const mobileVal = u.phonenumber || u.mobile || '';
                      const roleVal = u.role || 'user';
                      const statusVal = String(u.status || '').toLowerCase();
                      const isActive = statusVal === 'active' || statusVal === 'blocked';
                      const idVal = u.id || u.user_id || idx;
                      return (
                        <tr key={idVal}>
                          <td style={{ fontWeight: 600 }}>{nameVal}</td>
                          <td>{emailVal}</td>
                          <td>{mobileVal}</td>
                          <td><span style={{ fontSize: '11px', textTransform: 'uppercase' }}>{roleVal}</span></td>
                          <td>
                            <span className={`badge ${statusVal === 'blocked' ? 'badge-disabled' : (isActive ? 'badge-active' : 'badge-disabled')}`}>
                              {statusVal ? statusVal.toUpperCase() : 'ACTIVE'}
                            </span>
                          </td>
                        </tr>
                      );
                    }}
                  />
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
                  <PaginatedTable
                    headers={['User', 'Video', 'Action', 'Timestamp']}
                    data={filteredActivities}
                    emptyMessage="No activity logs found"
                    renderRow={(act, index) => {
                      const userVal = act.user_name || act.user || 'N/A';
                      const videoVal = act.video_name || act.video || act.videoLesson || 'N/A';
                      const actionVal = act.watch_activity || act.action || 'N/A';
                      const timeVal = act.created_at || act.time || act.timestamp || '';
                      return (
                        <tr key={act.id || index}>
                          <td style={{ fontWeight: 600 }}>{userVal}</td>
                          <td>{videoVal}</td>
                          <td>
                            <span style={{
                              color: String(actionVal).toLowerCase().includes('finished') || String(actionVal).toLowerCase().includes('completed') ? '#10b981' : 'var(--accent-secondary)',
                              fontWeight: 500
                            }}>
                              {String(actionVal).toUpperCase()}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{timeVal ? new Date(timeVal).toLocaleString() : 'N/A'}</td>
                        </tr>
                      );
                    }}
                  />
                </div>
              </div>
            )}

            {/* --- VIDEO APPROVAL QUEUE --- */}
            {activeTab === 'content_approval' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Video Approval Queue</h2>
                <div className="table-container">
                  <PaginatedTable
                    headers={['Thumbnail', 'Title', 'Category', 'Uploaded By', 'Actions']}
                    data={videos.filter(v => v.status === 'pending' || !v.status)}
                    emptyMessage="No pending videos in the approval queue"
                    renderRow={(v, index) => (
                      <tr key={v.id || index}>
                        <td>
                          <img 
                            src={v.thumbnail && v.thumbnail.startsWith('http') ? v.thumbnail : (v.thumbnail ? `http://localhost:5000${v.thumbnail}` : 'https://placehold.co/180x101?text=No+Thumbnail')} 
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
                    )}
                  />
                </div>
              </div>
            )}

            {/* --- REPORTED INFRACTIONS moderation queue --- */}
            {activeTab === 'content_reported' && (
              <div className="animate-fade-in glass-card">
                <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Reported Content & Infractions</h2>
                <div className="table-container">
                  <PaginatedTable
                    headers={['Video Title', 'Reason', 'Reported By', 'Severity', 'Actions']}
                    data={moderationReports?.reportedVideos || []}
                    emptyMessage="No active moderation reports"
                    renderRow={(rep, index) => (
                      <tr key={rep.id || index}>
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
                    )}
                  />
                </div>
              </div>
            )}

            {/* --- ANALYTICS MODULE VIEWS --- */}
            {activeTab.includes('analytics') && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* --- USER PLAYBACK BEHAVIOR METRICS --- */}
                <div className="glass-card">
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
                      data={stats?.watchHistoryDetails || []}
                      emptyMessage="No playback logs registered yet"
                      renderRow={(item, idx) => {
                        const formatWatchTime = (seconds) => {
                          if (!seconds) return '0s';
                          const secNum = parseInt(seconds, 10) || 0;
                          const mins = Math.floor(secNum / 60);
                          const secs = secNum % 60;
                          if (mins > 0) {
                            return `${mins}m ${secs > 0 ? secs + 's' : ''}`;
                          }
                          return `${secs}s`;
                        };

                        const formatPosition = (seconds) => {
                          if (!seconds) return '00:00';
                          if (typeof seconds === 'string' && seconds.includes(':')) return seconds;
                          const secNum = parseInt(seconds, 10) || 0;
                          const mins = Math.floor(secNum / 60);
                          const secs = secNum % 60;
                          return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
                        };

                        const userNameVal = item.userName || item.user_name || 'N/A';
                        const userEmailVal = item.userEmail || item.user_email || 'N/A';
                        const categoryVal = item.videoCategory || item.category_name || 'N/A';
                        const titleVal = item.videoTitle || item.title || 'N/A';
                        const viewsVal = item.views || 0;
                        const isCompleted = item.completed === 'Yes' || item.status === true || String(item.status).toLowerCase() === 'true' || parseFloat(item.completion_percentage || 0) >= 95;
                        const completionPct = item.completionPercentage || (item.completion_percentage ? parseFloat(item.completion_percentage).toFixed(0) : '0');
                        const watchTimeSec = item.watchTime || item.watch_duration_sec || 0;
                        const pauseCount = item.pausedCount || item.total_pause_count || 0;
                        const forwardCount = item.forwardedCount || item.total_seek_forward || 0;
                        const backwardCount = item.backwardCount || item.total_seek_backward || 0;
                        const lastPositionSec = item.lastPosition || item.last_position_sec || 0;

                        return (
                          <tr key={item.id || idx}>
                            <td style={{ fontWeight: 600 }}>
                              <div>{userNameVal}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>{userEmailVal}</div>
                            </td>
                            <td>
                              <span className="category-tag" style={{ fontSize: '12px' }}>
                                {categoryVal}
                              </span>
                            </td>
                            <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {titleVal}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{viewsVal}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '11px', 
                                fontWeight: 600,
                                background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: isCompleted ? '#10b981' : '#ef4444'
                              }}>
                                {isCompleted ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                                  <div style={{ 
                                    width: `${completionPct}%`, 
                                    height: '100%', 
                                    background: parseFloat(completionPct) >= 95 ? '#10b981' : 'var(--accent-primary)',
                                    borderRadius: '3px'
                                  }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{completionPct}%</span>
                              </div>
                            </td>
                            <td style={{ fontWeight: 500 }}>{formatWatchTime(watchTimeSec)}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{pauseCount}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{forwardCount}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{backwardCount}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600, fontFamily: 'monospace' }}>
                              {isCompleted ? '100%' : formatPosition(lastPositionSec)}
                            </td>
                          </tr>
                        );
                      }}
                    />
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
                  <PaginatedTable
                    headers={['User Name', 'Plan Name', 'Start Date', 'End Date', 'Status']}
                    data={(activeTab === 'subs_active' ? subscriptions.active : subscriptions.expired) || []}
                    emptyMessage="No subscription records found"
                    renderRow={(sub, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{sub.userName}</td>
                        <td>{sub.planName}</td>
                        <td>{sub.startDate}</td>
                        <td>{sub.endDate}</td>
                        <td>
                          <span className={`badge ${sub.status === 'active' ? 'badge-active' : 'badge-disabled'}`}>
                            {String(sub.status || '').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    )}
                  />
                </div>
              </div>
            )}

            {/* --- SUPER ADMIN REPORTS PAGE --- */}
            {activeTab === 'rep_export' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0 }}>
                    {selectedReportType === 'user_activity' && 'User Activity Report'}
                    {selectedReportType === 'video_performance' && 'Video Performance Report'}
                    {selectedReportType === 'revenue' && 'Revenue Report'}
                    {selectedReportType === 'subsription' && 'Subscription Report'}
                  </h2>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label htmlFor="superAdminReportSelect" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>
                      Report:
                    </label>
                    <select
                      id="superAdminReportSelect"
                      name="report"
                      value={selectedReportType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedReportType(val);
                        fetchReportData(val, selectedAdminId);
                      }}
                      className="form-input"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        minWidth: '220px',
                        background: 'var(--bg-tertiary, #f5f5f5)',
                        color: 'var(--text-primary, #333333)',
                        border: '1px solid var(--border-color, #dddddd)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="user_activity">User Activity</option>
                      <option value="video_performance">Video Performance</option>
                      <option value="revenue">Revenue</option>
                      <option value="subsription">Subscription</option>
                    </select>
                  </div>
                </div>

                <div className="table-container">
                  {/* --- 1. USER ACTIVITY REPORT TABLE --- */}
                  {selectedReportType === 'user_activity' && (
                    <PaginatedTable
                      headers={['User', 'Plan', 'Courses Started', 'Courses Completed', 'Videos Watched', 'Watch Time', 'Completion %', 'Last Login']}
                      data={reportData || []}
                      emptyMessage="No details available"
                      renderRow={(item, idx) => {
                        const compVal = item.completion_percentage ?? item.completionPercentage ?? item.comp_percentage ?? item.completion;
                        const formattedComp = compVal !== undefined && compVal !== null && compVal !== '' ? `${Math.round(parseFloat(compVal))}%` : '0%';
                        
                        let formattedWatchTime = item.watchTime || item.watch_time;
                        if (!formattedWatchTime || !isNaN(Number(formattedWatchTime))) {
                          const sec = item.watch_duration_sec ?? item.watch_duration ?? item.watch_sec ?? item.watch_time;
                          if (sec !== undefined && sec !== null && !isNaN(Number(sec))) {
                            const totalSec = Number(sec);
                            if (totalSec === 0) formattedWatchTime = '0m';
                            else if (totalSec < 60) formattedWatchTime = `${totalSec}s`;
                            else {
                              const hrs = Math.floor(totalSec / 3600);
                              const mins = Math.floor((totalSec % 3600) / 60);
                              const remSec = totalSec % 60;
                              formattedWatchTime = hrs > 0 ? `${hrs}h ${mins}m` : (remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`);
                            }
                          } else {
                            formattedWatchTime = '0h 0m';
                          }
                        }

                        return (
                          <tr key={item.id || idx}>
                            <td style={{ fontWeight: 600 }}>{item.user_name || item.user || item.name || item.userName || '—'}</td>
                            <td><span className="badge badge-active" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>{item.plan || item.status || item.subscription_plan || 'Basic'}</span></td>
                            <td>{item.course_started ?? item.courses_started ?? item.coursesStarted ?? 0}</td>
                            <td>{item.course_completed ?? item.courses_completed ?? item.coursesCompleted ?? 0}</td>
                            <td>{item.video_watched ?? item.videos_watched ?? item.videosWatched ?? item.videos_count ?? 0}</td>
                            <td>{formattedWatchTime}</td>
                            <td style={{ fontWeight: 700, color: '#10b981' }}>{formattedComp}</td>
                            <td>{item.last_login || item.lastLogin || '—'}</td>
                          </tr>
                        );
                      }}
                    />
                  )}

                  {/* --- 2. VIDEO PERFORMANCE REPORT TABLE --- */}
                  {selectedReportType === 'video_performance' && (
                    <PaginatedTable
                      headers={['User', 'Category', 'Video', 'Views', 'Status', 'Compte %', 'Watch Time']}
                      data={reportData || []}
                      emptyMessage="No details available"
                      renderRow={(item, idx) => {
                        const compVal = item.completion_percentage ?? item.completionPercentage ?? item.comp_percentage ?? item.completion;
                        const formattedComp = compVal !== undefined && compVal !== null && compVal !== '' ? `${Math.round(parseFloat(compVal))}%` : '0%';
                        
                        let formattedWatchTime = item.watchTime;
                        if (!formattedWatchTime || (!isNaN(Number(formattedWatchTime)) && item.watch_duration_sec !== undefined)) {
                          const sec = item.watch_duration_sec ?? item.watch_duration ?? item.watch_sec ?? item.watch_time;
                          if (sec !== undefined && sec !== null && !isNaN(Number(sec))) {
                            const totalSec = Number(sec);
                            if (totalSec === 0) formattedWatchTime = '0m';
                            else if (totalSec < 60) formattedWatchTime = `${totalSec}s`;
                            else {
                              const hrs = Math.floor(totalSec / 3600);
                              const mins = Math.floor((totalSec % 3600) / 60);
                              const remSec = totalSec % 60;
                              formattedWatchTime = hrs > 0 ? `${hrs}h ${mins}m` : (remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`);
                            }
                          } else {
                            formattedWatchTime = item.watch_time || '0m';
                          }
                        }

                        return (
                          <tr key={item.id || idx}>
                            <td style={{ fontWeight: 600 }}>{item.user_name || item.user || item.name || item.userName || '—'}</td>
                            <td>{item.category_name || item.category || '—'}</td>
                            <td style={{ fontWeight: 600 }}>{item.video || item.video_name || item.title || item.video_title || '—'}</td>
                            <td>{item.views ?? item.views_count ?? 0}</td>
                            <td><span className={`badge ${String(item.status || '').toLowerCase() === 'completed' ? 'badge-active' : 'badge-disabled'}`}>{item.status || 'Active'}</span></td>
                            <td style={{ color: '#10b981', fontWeight: 700 }}>{formattedComp}</td>
                            <td>{formattedWatchTime}</td>
                          </tr>
                        );
                      }}
                    />
                  )}

                  {/* --- 3. REVENUE REPORT TABLE --- */}
                  {selectedReportType === 'revenue' && (
                    <PaginatedTable
                      headers={['Payment Date', 'Invoice No', 'Transaction ID', 'User', 'Plan', 'Amount', 'Discount', 'Tax', 'Net Amount', 'Payment Method', 'Gateway', 'Status']}
                      data={reportData || []}
                      emptyMessage="No details available"
                      renderRow={(item, idx) => (
                        <tr key={item.id || item.transactionId || idx}>
                          <td>{item.paymentDate || item.payment_date || item.date || '—'}</td>
                          <td><code>{item.invoiceNo || item.invoice_no || '—'}</code></td>
                          <td><code>{item.transactionId || item.transaction_id || item.id || '—'}</code></td>
                          <td style={{ fontWeight: 600 }}>{item.user || item.userName || item.name || '—'}</td>
                          <td>{item.plan || item.plan_name || '—'}</td>
                          <td>{item.amount || '₹0'}</td>
                          <td>{item.discount || '₹0'}</td>
                          <td>{item.tax || '₹0'}</td>
                          <td style={{ fontWeight: 700, color: '#10b981' }}>{item.netAmount || item.net_amount || '₹0'}</td>
                          <td>{item.paymentMethod || item.payment_method || '—'}</td>
                          <td>{item.gateway || '—'}</td>
                          <td><span className={`badge ${String(item.status || '').toLowerCase() === 'success' ? 'badge-active' : 'badge-disabled'}`}>{item.status || 'Success'}</span></td>
                        </tr>
                      )}
                    />
                  )}

                  {/* --- 4. SUBSCRIPTION REPORT TABLE --- */}
                  {selectedReportType === 'subsription' && (
                    <PaginatedTable
                      headers={['User Name', 'Email', 'Plan', 'Billing Cycle', 'Amount', 'Currency', 'Start Date', 'Expiry Date', 'Status', 'Payment Status', 'Payment Method', 'Auto Renewal', 'Days Remaining', 'Created By']}
                      data={reportData || []}
                      emptyMessage="No details available"
                      renderRow={(item, idx) => (
                        <tr key={item.id || idx}>
                          <td style={{ fontWeight: 600 }}>{item.userName || item.user_name || item.name || item.user || '—'}</td>
                          <td><a href={`mailto:${item.email}`} style={{ color: '#3b82f6' }}>{item.email || '—'}</a></td>
                          <td><span className="badge badge-active" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>{item.plan || '—'}</span></td>
                          <td>{item.billingCycle || item.billing_cycle || '—'}</td>
                          <td>{item.amount || '₹0'}</td>
                          <td>{item.currency || 'INR'}</td>
                          <td>{item.startDate || item.start_date || '—'}</td>
                          <td>{item.expiryDate || item.expiry_date || item.end_date || '—'}</td>
                          <td><span className={`badge ${String(item.status || '').toLowerCase() === 'active' ? 'badge-active' : 'badge-disabled'}`}>{item.status || 'Active'}</span></td>
                          <td><span className="badge badge-active">{item.paymentStatus || item.payment_status || 'Paid'}</span></td>
                          <td>{item.paymentMethod || item.payment_method || '—'}</td>
                          <td>{item.autoRenewal || item.auto_renewal || 'No'}</td>
                          <td style={{ fontWeight: 700, color: (item.daysRemaining ?? item.days_remaining) > 0 ? '#10b981' : '#f5222d' }}>{item.daysRemaining ?? item.days_remaining ?? 0}</td>
                          <td>{item.createdBy || item.created_by || 'Admin'}</td>
                        </tr>
                      )}
                    />
                  )}
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
                    <PaginatedTable
                      headers={['Stream Title', 'Viewers', 'Bitrate', 'FPS', 'Status']}
                      data={liveStreams}
                      emptyMessage="No active live streams"
                      renderRow={(stream, index) => (
                        <tr key={stream.id || index}>
                          <td style={{ fontWeight: 600 }}>{stream.title}</td>
                          <td>{stream.viewers} Concurrent</td>
                          <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{stream.bitrateKbps} Kbps</td>
                          <td>{stream.fps} FPS</td>
                          <td><span className="badge badge-active" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>LIVE</span></td>
                        </tr>
                      )}
                    />
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
                          value={settings.appName || 'LurnAx'} 
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
             activeTab !== 'video_upload' &&
             activeTab !== 'course_upload' &&
             activeTab !== 'course_all' &&
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
                  const url = reviewVideo.video_url || reviewVideo.videoUrl;
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
                })()} 
                controls 
                autoPlay
                onContextMenu={(e) => e.preventDefault()}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animate-fade-in" style={{
            width: isMobile ? '90%' : '100%',
            maxWidth: '640px',
            padding: isMobile ? '24px 16px' : '32px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            color: '#333333',
            maxHeight: isMobile ? '85vh' : 'auto',
            overflowY: isMobile ? 'auto' : 'visible'
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#111111' }}>{editingAdmin ? 'Edit Admin' : 'Add Admin'}</h3>
            <form onSubmit={handleAdminSubmit}>
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
                    value={adminForm.firstName} 
                    onChange={e => setAdminForm({...adminForm, firstName: e.target.value})} 
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
                    value={adminForm.lastName} 
                    onChange={e => setAdminForm({...adminForm, lastName: e.target.value})} 
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
                    value={adminForm.email} 
                    onChange={e => setAdminForm({...adminForm, email: e.target.value})} 
                    required 
                    disabled={!!editingAdmin}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="Enter phone number"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={adminForm.mobile} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setAdminForm({...adminForm, mobile: value});
                    }} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Gender</label>
                  <select 
                    className="form-input" 
                    value={adminForm.gender} 
                    onChange={e => setAdminForm({...adminForm, gender: e.target.value})}
                    required
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                  >
                    <option value="">Select Gender</option>
                    {genders.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Date of Birth</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={adminForm.dob} 
                    onChange={e => setAdminForm({...adminForm, dob: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter address"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={adminForm.address} 
                    onChange={e => setAdminForm({...adminForm, address: e.target.value})} 
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
                    value={adminForm.city} 
                    onChange={e => setAdminForm({...adminForm, city: e.target.value})} 
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
                    value={adminForm.state} 
                    onChange={e => setAdminForm({...adminForm, state: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Zipcode</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter zipcode"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={adminForm.zipcode} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setAdminForm({...adminForm, zipcode: value});
                    }} 
                    required 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAdminModal(false)} className="btn btn-secondary" style={{ background: '#e0e0e0', color: '#333333', border: 'none' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={adminFormLoading}>
                  {adminFormLoading ? (
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
                  ) : 'Save Admin'}
                </button>
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
          zIndex: 10000,
          animation: 'fadeIn 0.25s ease'
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
            color: '#333333',
            animation: 'scaleIn 0.25s ease'
          }}>
            {/* Circle Icon */}
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

            {/* Title */}
            <h3 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: customAlert.type === 'success' ? '#1890ff' : '#f5222d',
              margin: '0 0 12px 0'
            }}>
              {customAlert.title}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.5',
              margin: '0 0 28px 0'
            }}>
              {customAlert.message}
            </p>

            {/* Button */}
            <button
              onClick={() => {
                setCustomAlert(prev => ({ ...prev, show: false }));
                if (customAlert.onConfirm) customAlert.onConfirm();
              }}
              style={{
                background: customAlert.type === 'success' ? '#3a78f2' : '#de2424',
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

export default SuperAdminDashboard;
