import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { BarChart, DonutChart, LineChart } from '../components/SVGCharts';
import { useLanguage } from '../context/LanguageContext';
import AdminDashboard from './AdminDashboard';
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
  const [adminForm, setAdminForm] = useState({ firstName: '', lastName: '', email: '', client_id: '', mobile: '', gender: '', dob: '', city: '', state: '', state_id: '', city_id: '', zipcode: '', address: '' });
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminFormLoading, setAdminFormLoading] = useState(false);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [adminClientsList, setAdminClientsList] = useState([]);
  const [loadingAdminClients, setLoadingAdminClients] = useState(false);

  // Clients CRUD states
  const [clients, setClients] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientFormLoading, setClientFormLoading] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    mobile: '',
    address_line1: '',
    address_line2: '',
    state_id: '',
    state: '',
    city_id: '',
    city: '',
    zipcode: ''
  });

  // Author Admin CRUD states
  const [authorAdmins, setAuthorAdmins] = useState([]);
  const [showAuthorAdminModal, setShowAuthorAdminModal] = useState(false);
  const [editingAuthorAdmin, setEditingAuthorAdmin] = useState(null);
  const [authorAdminFormLoading, setAuthorAdminFormLoading] = useState(false);
  const [clientAdminsList, setClientAdminsList] = useState([]);
  const [loadingClientAdmins, setLoadingClientAdmins] = useState(false);
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
    zipcode: '',
    client_id: '',
    admin_id: ''
  });

  useEffect(() => {
    if (showAdminModal) {
      fetchStates();
    }
  }, [showAdminModal]);

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
    
    setAdminForm(prev => ({
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
    const clients = dropdownClients.length > 0 ? dropdownClients : (await fetchDropdownClients() || []);
    const actualClients = (clients || []).filter(c => String(c.id) !== '0');
    const initialClientId = (selectedClientId && selectedClientId !== '0') ? selectedClientId : (actualClients[0]?.id || '');

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
      zipcode: '',
      client_id: initialClientId,
      admin_id: ''
    });
    setCitiesList([]);
    setShowAuthorAdminModal(true);
    fetchStates();
    fetchGenders();
    fetchDropdownClients();
    if (initialClientId) {
      fetchClientAdmins(initialClientId);
    } else {
      setClientAdminsList([]);
    }
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

    const initialClientId = String(rawRecord.client_id || rawRecord.clientId || rawRecord.client || (selectedClientId !== '0' ? selectedClientId : ''));
    
    let fetchedClientAdmins = [];
    if (initialClientId) {
      fetchedClientAdmins = await fetchClientAdmins(initialClientId);
    } else {
      setClientAdminsList([]);
    }

    const rawAdmin = String(rawRecord.admin_id || rawRecord.adminId || rawRecord.admin || rawRecord.admin_name || rawRecord.assigned_admin_id || rawRecord.assigned_admin || '').trim();
    const matchedAdmin = (fetchedClientAdmins || []).find(a => 
      String(a.id) === rawAdmin || 
      String(a.name).toLowerCase() === rawAdmin.toLowerCase() ||
      (a.name && rawAdmin && rawAdmin.toLowerCase().includes(String(a.name).toLowerCase())) ||
      (a.name && rawAdmin && String(a.name).toLowerCase().includes(rawAdmin.toLowerCase()))
    );
    const resolvedAdminId = matchedAdmin ? String(matchedAdmin.id) : rawAdmin;

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
      zipcode: rawRecord.zipcode || '',
      client_id: initialClientId,
      admin_id: resolvedAdminId
    });

    setShowAuthorAdminModal(true);
    fetchDropdownClients();
  };

  const handleToggleAuthorAdminStatus = async (admin) => {
    const isAdminActive = admin.status === true || String(admin.status).toLowerCase() === 'true' || String(admin.status).toLowerCase() === 'active';
    const nextStatus = !isAdminActive;
    const resolvedClientId = admin.client_id || admin.clientId || selectedClientId || null;
    try {
      await api.vdadmins.toggleAuthorAdminStatus(admin.id || admin.user_id, nextStatus, resolvedClientId);
      fetchAuthorAdmins();
      showSuccess(`Author Admin ${nextStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Failed to update author admin status');
    }
  };

  const handleDeleteAuthorAdmin = (admin) => {
    showConfirmDelete('Are you sure you want to delete this author admin?', async () => {
      try {
        const resolvedClientId = admin.client_id || admin.clientId || selectedClientId || null;
        await api.vdadmins.deleteAuthorAdmin(admin.id || admin.user_id, resolvedClientId);
        fetchAuthorAdmins();
        showSuccess('Author admin deleted successfully!');
      } catch (err) {
        console.error('Failed to delete author admin:', err);
        let msg = err?.message || 'Failed to delete author admin';
        const status = err?.status || err?.statusCode || err?.response?.status;
        if (
          status === 310 || 
          status === '310' || 
          String(msg).includes('310') || 
          String(err).includes('310')
        ) {
          msg = 'Unable to delete, Active users are online!';
        }
        showError(msg);
      }
    });
  };

  const fetchClientAdmins = async (clientId = selectedClientId) => {
    setLoadingClientAdmins(true);
    try {
      const res = await api.vdadmins.getClientAdmin({ formstep: 'getClientAdmin', client_id: clientId || '0' });
      let list = [];
      if (Array.isArray(res)) {
        list = res.flat ? res.flat(Infinity) : res;
      } else if (res && typeof res === 'object') {
        const rawList = res.data || res.admins || res.clientAdmins || res.result || res.json;
        if (Array.isArray(rawList)) {
          list = rawList;
        } else {
          list = [res];
        }
      }

      const mapped = list.map(rawItem => {
        const itemObj = (rawItem && typeof rawItem === 'object' && rawItem.json) ? rawItem.json : rawItem;
        const adminId = itemObj?.id ?? itemObj?.admin_id ?? itemObj?.user_id ?? itemObj?.value ?? rawItem?.id ?? '';
        const adminName = itemObj?.name || itemObj?.username || (itemObj?.firstName ? `${itemObj.firstName} ${itemObj.lastName || ''}`.trim() : '') || itemObj?.title || itemObj?.label || itemObj?.email || rawItem?.name || (adminId ? `Admin ${adminId}` : '');
        return {
          id: String(adminId),
          name: adminName,
          client_id: String(itemObj?.client_id || itemObj?.clientId || '')
        };
      }).filter(a => a.id !== '' && a.name !== '');
      setClientAdminsList(mapped);
      return mapped;
    } catch (err) {
      console.error('Failed to fetch client admins via getClientAdmin API:', err);
      setClientAdminsList([]);
      return [];
    } finally {
      setLoadingClientAdmins(false);
    }
  };

  const fetchAuthorAdmins = async (clientId = selectedClientId) => {
    setAuthorAdmins([]);
    setLoading(true);
    try {
      const payload = {
        client_id: clientId ?? '0'
      };
      const res = await api.vdadmins.getAuthorAdmin(payload);
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
    } finally {
      setLoading(false);
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
    if (!authorAdminForm.client_id) {
      showError('Please select client');
      return;
    }
    if (!authorAdminForm.admin_id) {
      showError('Please select admin');
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
      const isEditing = Boolean(editingAuthorAdmin);
      const payload = {
        formstep: isEditing ? 'editAuthor' : 'addAuthorAdmin',
        id: isEditing ? (editingAuthorAdmin.id || editingAuthorAdmin.user_id || editingAuthorAdmin.admin_id || editingAuthorAdmin._id) : undefined,
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
        zipcode: authorAdminForm.zipcode.trim(),
        client_id: authorAdminForm.client_id || selectedClientId || '0',
        admin_id: authorAdminForm.admin_id || ''
      };

      if (isEditing) {
        await api.vdadmins.editAuthorAdmin(payload);
        showSuccess('Author Admin updated successfully!');
      } else {
        await api.vdadmins.addAuthorAdmin(payload);
        showSuccess('Author Admin added successfully!');
      }

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
        zipcode: '',
        client_id: '',
        admin_id: ''
      });
      fetchAuthorAdmins();
    } catch (err) {
      console.error('Failed to submit author admin:', err);
      const status = err?.status || err?.statusCode || err?.response?.status;
      const errMsg = String(err?.message || err || '');
      if (status === 422 || status === '422' || errMsg.includes('422')) {
        showError('Phone number already exist');
      } else if (status === 433 || status === '433' || errMsg.includes('433')) {
        showError('Email Already exist');
      } else {
        showError(err?.message || 'Failed to save author admin');
      }
    } finally {
      setAuthorAdminFormLoading(false);
    }
  };

  const fetchAdminClientsOptions = async () => {
    setLoadingAdminClients(true);
    try {
      const res = await api.vdadmins.getAdmins();
      const list = Array.isArray(res) ? res : (res?.data || res?.clients || res?.result || []);
      const formatted = list.map(item => ({
        id: String(item.id || item.client_id || item.value || ''),
        name: item.name || item.client_name || item.title || item.label || ''
      })).filter(item => item.id && item.name);
      setAdminClientsList(formatted);
    } catch (err) {
      console.error("Failed to fetch admin clients options:", err);
      setAdminClientsList([]);
    } finally {
      setLoadingAdminClients(false);
    }
  };

  const [customAlert, setCustomAlert] = useState({
    show: false,
    type: 'success', // success or error
    title: '',
    message: '',
    buttonText: 'OK',
    onConfirm: null
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
      title: 'Oops!',
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

  // Sub Categories CRUD states
  const [subCategories, setSubCategories] = useState([]);
  const [subCategoryForm, setSubCategoryForm] = useState({ id: '', cat_id: '', name: '', description: '' });
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);

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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [moderationReports, setModerationReports] = useState({ reportedVideos: [], reportedUsers: [], copyrightIssues: [], spamDetection: [] });
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({});
  const [dropdownClients, setDropdownClients] = useState([{ id: '0', name: 'Super Admin' }]);
  const [selectedClientId, setSelectedClientId] = useState('0');
  const selectedAdminId = selectedClientId;
  const setSelectedAdminId = setSelectedClientId;
  const dropdownAdmins = dropdownClients;
  const setDropdownAdmins = setDropdownClients;
  const handleAdminChange = (e) => handleClientChange(e);
  const fetchDropdownAdmins = (currentTab) => fetchDropdownClients(currentTab);
  const [genders, setGenders] = useState([]);
  const [selectedReportType, setSelectedReportType] = useState('user_activity');
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const isFetchingDashboardRef = useRef(false);
  const lastFetchedDashboardRef = useRef(null);

  useEffect(() => {
    if (['categories', 'sub_categories', 'video_upload', 'course_upload', 'course_draft', 'course_all'].includes(activeTab)) {
      setLoading(false);
      return;
    }
    if (dropdownClients.length === 0) {
      fetchDropdownClients(activeTab);
    }
    if (activeTab === 'overview') {
      fetchDashboardData('overview', selectedClientId);
    }
    if (activeTab === 'analytics' || activeTab.includes('analytics')) {
      fetchDashboardData('analytics', selectedClientId);
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
      fetchReportData(selectedReportType, selectedClientId);
    }
    if (activeTab === 'users_all' || activeTab.startsWith('users_')) {
      setUsers([]);
      fetchUsers();
    }
    if (activeTab === 'client_management') {
      fetchClients();
    }
    if (activeTab === 'author_admin') {
      fetchAuthorAdmins();
    }
  }, [activeTab, selectedClientId, selectedReportType]);

  useEffect(() => {
    if (showClientModal || showAuthorAdminModal) {
      fetchStates();
    }
    if (showAuthorAdminModal) {
      fetchGenders();
      if (authorAdminForm.state_id || authorAdminForm.state) {
        fetchCities(authorAdminForm.state_id || authorAdminForm.state);
      }
    }
  }, [showClientModal, showAuthorAdminModal]);

  useEffect(() => {
    if (showAdminModal || activeTab === 'admins_create') {
      fetchAdminClientsOptions();
    }
  }, [showAdminModal, activeTab]);

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

  const fetchReportData = async (reportType = selectedReportType, clientId = selectedClientId) => {
    setReportLoading(true);
    try {
      const payload = {};
      if (clientId) {
        payload.client_id = clientId;
        payload.admin_id = clientId;
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

  const fetchDashboardData = async (formStep = 'overview', clientId = selectedClientId) => {
    const key = `${formStep}_${clientId || '0'}`;
    if (isFetchingDashboardRef.current) return;
    if (lastFetchedDashboardRef.current === key && formStep === 'overview' && stats) return;

    isFetchingDashboardRef.current = true;
    lastFetchedDashboardRef.current = key;

    setLoading(true);
    try {
      const payload = {};
      if (clientId) {
        payload.client_id = clientId;
        payload.admin_id = clientId;
      }
      
      let data;
      if (formStep === 'content_videos') {
        data = await api.dashboard.getSuperAdmin('getAllVidoes', payload);
        setVideos(Array.isArray(data) ? data : []);
      } else if (formStep === 'categories') {
        data = await api.vdcategories.getCategories();
        const rawList = Array.isArray(data) ? data : [];
        const normalized = rawList.map(item => {
          let jsonObj = {};
          if (item && item.json) {
            try {
              jsonObj = typeof item.json === 'string' ? JSON.parse(item.json) : item.json;
            } catch (err) {
              jsonObj = {};
            }
          }
          return {
            ...item,
            ...jsonObj,
            id: String(item.id || jsonObj.id || item.category_id || jsonObj.category_id || ''),
            name: item.name || jsonObj.name || item.category_name || jsonObj.category_name || '',
            description: item.description || jsonObj.description || ''
          };
        });
        setCategories(normalized);
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
      isFetchingDashboardRef.current = false;
      setLoading(false);
    }
  };

  const fetchDropdownClients = async (currentTab = activeTab) => {
    try {
      const res = await api.vdclients.getClients();
      const list = Array.isArray(res) ? res : (res?.data || res?.clients || []);
      const formatted = list.map(item => ({
        id: String(item.id ?? item.client_id ?? item.value ?? ''),
        name: item.name || item.client_name || item.title || item.label || `Client ${item.id}`
      })).filter(c => c.id !== '' && c.name);

      const defaultOption = { id: '0', name: 'Super Admin' };
      const filteredList = formatted.filter(c => String(c.id) !== '0');
      const finalDropdownList = [defaultOption, ...filteredList];

      setDropdownClients(finalDropdownList);
      return finalDropdownList;
    } catch (err) {
      console.error('Failed to fetch dropdown clients', err);
      setDropdownClients([{ id: '0', name: 'Super Admin' }]);
      return [{ id: '0', name: 'Super Admin' }];
    }
  };

  const handleClientChange = (e) => {
    const value = e.target.value;
    lastFetchedDashboardRef.current = null;
    setSelectedClientId(value);
  };

  const fetchAdmins = async (clientId = selectedClientId) => {
    setAdmins([]);
    setLoading(true);
    try {
      const data = await api.vdadmins.list({ 
        client_id: clientId || null,
        admin_id: clientId || null
      });
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
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    fetchDashboardData('categories', selectedAdminId);
  };

  const fetchSubCategories = async () => {
    try {
      const data = await api.vdcategories.getSubCategories();
      let list = [];
      if (Array.isArray(data)) {
        list = data.map(item => item.json || item);
      } else if (data && Array.isArray(data.data)) {
        list = data.data.map(item => item.json || item);
      } else if (data && typeof data === 'object') {
        const arrayProp = Object.values(data).find(val => Array.isArray(val));
        if (arrayProp) list = arrayProp.map(item => item.json || item);
      }
      setSubCategories(list);
    } catch (e) {
      console.error("Error fetching subcategories:", e);
      setSubCategories([]);
    }
  };

  const fetchVideos = async () => {
    fetchDashboardData('content_videos', selectedAdminId);
  };

  const fetchUsers = async () => {
    setUsers([]);
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
      return list;
    } catch (e) {
      console.error('Failed to fetch user genders', e);
      setGenders([]);
      return [];
    }
  };

  // --- Admin CRUD Handlers ---
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    
    if (!adminForm.firstName || !adminForm.firstName.trim()) {
      showError('Please fill out first name');
      return;
    }
    if (!adminForm.lastName || !adminForm.lastName.trim()) {
      showError('Please fill out last name');
      return;
    }
    if (!adminForm.email || !adminForm.email.trim()) {
      showError('Please fill out email address');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(adminForm.email)) {
      showError('Please enter a valid email address with a valid domain suffix (e.g. name@domain.com)');
      return;
    }
    if (!adminForm.mobile || !adminForm.mobile.trim()) {
      showError('Please fill out phone number');
      return;
    }
    if (adminForm.mobile.length !== 10) {
      showError('Phone number must be exactly 10 digits');
      return;
    }
    if (!adminForm.gender) {
      showError('Please select gender');
      return;
    }
    if (!adminForm.dob) {
      showError('Please select date of birth');
      return;
    }
    if (!adminForm.address || !adminForm.address.trim()) {
      showError('Please fill out address');
      return;
    }
    if (!adminForm.state_id && !adminForm.state) {
      showError('Please select state');
      return;
    }
    if (!adminForm.city_id && !adminForm.city) {
      showError('Please select city');
      return;
    }
    if (!adminForm.zipcode || !adminForm.zipcode.trim()) {
      showError('Please fill out zipcode');
      return;
    }
    if (adminForm.zipcode.length !== 6) {
      showError('Zipcode must be exactly 6 digits');
      return;
    }

    setAdminFormLoading(true);
    try {
      const resolvedClientId = adminForm.client_id || 
                               editingAdmin?.client_id || 
                               editingAdmin?.clientId || 
                               selectedClientId || 
                               null;

      const dataToSave = {
        first_name: adminForm.firstName.trim(),
        last_name: adminForm.lastName.trim(),
        email: adminForm.email.trim(),
        client_id: resolvedClientId,
        admin_id: resolvedClientId,
        phonenumber: adminForm.mobile.trim(),
        gender_id: adminForm.gender ? (parseInt(adminForm.gender, 10) || adminForm.gender) : null,
        date_of_birth: adminForm.dob ? new Date(adminForm.dob).toISOString() : null,
        address: adminForm.address.trim(),
        stat_id: adminForm.state_id || adminForm.state,
        state_id: adminForm.state_id || adminForm.state,
        city_id: adminForm.city_id || adminForm.city,
        state: String(adminForm.state || adminForm.state_id).trim(),
        city: String(adminForm.city || adminForm.city_id).trim(),
        zipcode: adminForm.zipcode.trim()
      };

      if (editingAdmin) {
        await api.admins.update(editingAdmin.id, dataToSave);
        showSuccess('Admin updated successfully');
      } else {
        await api.admins.create(dataToSave);
        showSuccess('Admin added successfully');
      }
      setShowAdminModal(false);
      setAdminForm({ firstName: '', lastName: '', email: '', mobile: '', gender: '', dob: '', city: '', state: '', state_id: '', city_id: '', zipcode: '', address: '' });
      setEditingAdmin(null);
      fetchAdmins();
      fetchDashboardData();
      setActiveTab('admins_all'); // Redirect upon creation
    } catch (err) {
      if (err.status === 422) {
        showError('Phone number already exist');
      } else if (err.status === 433) {
        showError('Email Already exist');
      } else {
        showError(err.message || 'Failed to save admin');
      }
    } finally {
      setAdminFormLoading(false);
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

    const formattedDob = formatDateToYYYYMMDD(adminData.date_of_birth || adminData.dob);

    // Ensure states list is available
    let currentStates = statesList;
    if (!currentStates || currentStates.length === 0) {
      try {
        const res = await api.vdcategories.getStates();
        const list = Array.isArray(res) ? res : (res?.data || res?.result || []);
        currentStates = list.map(item => ({
          id: String(item.state_id || item.id || item.stat_id || item.name),
          name: item.name || item.state_name || item.title || item.state
        }));
        setStatesList(currentStates);
      } catch (err) {
        console.error("Failed to fetch states:", err);
      }
    }

    const rawState = adminData.stat_id || adminData.state_id || adminData.state || '';
    const matchedState = currentStates.find(s => 
      String(s.id).toLowerCase() === String(rawState).toLowerCase() ||
      String(s.name).toLowerCase() === String(rawState).toLowerCase()
    );
    const stateIdVal = matchedState ? matchedState.id : rawState;
    const stateNameVal = matchedState ? matchedState.name : rawState;

    // Fetch cities for stateIdVal
    let currentCities = [];
    if (stateIdVal) {
      try {
        const res = await api.vdcategories.getCity(stateIdVal);
        const list = Array.isArray(res) ? res : (res?.data || res?.result || []);
        currentCities = list.map(item => ({
          id: String(item.city_id || item.id || item.name),
          name: item.name || item.city_name || item.title || item.city
        }));
        setCitiesList(currentCities);
      } catch (err) {
        console.error("Failed to fetch cities:", err);
      }
    }

    const rawCity = adminData.city_id || adminData.city || '';
    const matchedCity = currentCities.find(c => 
      String(c.id).toLowerCase() === String(rawCity).toLowerCase() ||
      String(c.name).toLowerCase() === String(rawCity).toLowerCase()
    );
    const cityIdVal = matchedCity ? matchedCity.id : rawCity;
    const cityNameVal = matchedCity ? matchedCity.name : rawCity;

    const resolvedClientId = adminData.client_id || adminData.clientId || admin.client_id || admin.clientId || selectedClientId || '';

    setAdminForm({
      firstName: adminData.first_name || adminData.firstName || '',
      lastName: adminData.last_name || adminData.lastName || '',
      email: adminData.email || '',
      client_id: resolvedClientId,
      mobile: adminData.phonenumber || adminData.mobile || '',
      gender: genderVal,
      dob: formattedDob,
      city: cityNameVal,
      city_id: cityIdVal,
      state: stateNameVal,
      state_id: stateIdVal,
      zipcode: adminData.zipcode || '',
      address: adminData.address || ''
    });

    setShowAdminModal(true);
  };

  const handleToggleAdminStatus = async (admin) => {
    const isAdminActive = admin.status === true || String(admin.status).toLowerCase() === 'true' || String(admin.status).toLowerCase() === 'active';
    const nextStatus = !isAdminActive;
    const resolvedClientId = admin.client_id || admin.clientId || selectedClientId || null;
    try {
      await api.admins.toggleStatus(admin.id, nextStatus, resolvedClientId);
      fetchAdmins();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update admin status');
    }
  };

  const handleDeleteAdmin = (admin) => {
    showConfirmDelete('Are you sure you want to delete this admin?', async () => {
      try {
        const resolvedClientId = admin.client_id || admin.clientId || selectedClientId || null;
        await api.vdadmins.deleteAdmin(admin.id || admin.user_id, resolvedClientId);
        fetchAdmins();
        showSuccess('Admin deleted successfully!');
      } catch (err) {
        console.error('Failed to delete admin:', err);
        let msg = err?.message || 'Failed to delete admin';
        const status = err?.status || err?.statusCode || err?.response?.status;
        if (
          status === 310 || 
          status === '310' || 
          String(msg).includes('310') || 
          String(err).includes('310')
        ) {
          msg = 'Unable to delete, Active users are online!';
        }
        showError(msg);
      }
    });
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

  // --- Client Management Handlers ---
  const fetchClients = async () => {
    setClients([]);
    setLoading(true);
    try {
      const res = await api.vdclients.getClients();
      const list = Array.isArray(res) ? res : (res?.data || res?.clients || []);
      setClients(list);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();

    if (!clientForm.name || !clientForm.name.trim()) {
      showError('Please fill out client name');
      return;
    }
    if (!clientForm.mobile || !clientForm.mobile.trim()) {
      showError('Please fill out phone number');
      return;
    }
    if (clientForm.mobile.replace(/\D/g, '').length !== 10) {
      showError('Phone number must be exactly 10 digits');
      return;
    }
    if (!clientForm.address_line1 || !clientForm.address_line1.trim()) {
      showError('Please fill out address line 1');
      return;
    }
    if (!clientForm.state_id && !clientForm.state) {
      showError('Please select state');
      return;
    }
    if (!clientForm.city_id && !clientForm.city) {
      showError('Please select city');
      return;
    }
    if (!clientForm.zipcode || !clientForm.zipcode.trim()) {
      showError('Please fill out zipcode');
      return;
    }
    if (clientForm.zipcode.replace(/\D/g, '').length !== 6) {
      showError('Zipcode must be exactly 6 digits');
      return;
    }

    setClientFormLoading(true);
    try {
      const payload = {
        name: clientForm.name.trim(),
        phonenumber: clientForm.mobile.trim(),
        mobile: clientForm.mobile.trim(),
        address_line1: clientForm.address_line1.trim(),
        address_line2: clientForm.address_line2 ? clientForm.address_line2.trim() : '',
        state_id: clientForm.state_id || null,
        state: clientForm.state ? clientForm.state.trim() : '',
        city_id: clientForm.city_id || null,
        city: clientForm.city ? clientForm.city.trim() : '',
        zipcode: clientForm.zipcode.trim()
      };

      if (editingClient) {
        await api.vdclients.editClient(editingClient.id, payload);
        showSuccess('Client updated successfully!');
      } else {
        await api.vdclients.addClient(payload);
        showSuccess('Client added successfully!');
      }

      setShowClientModal(false);
      setClientForm({
        name: '',
        mobile: '',
        address_line1: '',
        address_line2: '',
        state_id: '',
        state: '',
        city_id: '',
        city: '',
        zipcode: ''
      });
      setEditingClient(null);
      fetchClients();
    } catch (err) {
      console.error('Failed to submit client:', err);
      showError(err?.message || 'Failed to save client');
    } finally {
      setClientFormLoading(false);
    }
  };

  const handleEditClient = async (client) => {
    setEditingClient(client);

    const curStatesList = statesList.length > 0 ? statesList : await fetchStates();

    const matchedState = curStatesList.find(s => 
      String(s.id) === String(client.state_id || client.state) ||
      String(s.name).toLowerCase() === String(client.state).toLowerCase()
    );
    const stateIdVal = matchedState ? matchedState.id : (client.state_id || client.state || '');
    const stateNameVal = matchedState ? matchedState.name : (client.state || '');

    let curCitiesList = [];
    if (stateIdVal) {
      curCitiesList = await fetchCities(stateIdVal);
    }

    const matchedCity = curCitiesList.find(c => 
      String(c.id) === String(client.city_id || client.city) ||
      String(c.name).toLowerCase() === String(client.city).toLowerCase()
    );
    const cityIdVal = matchedCity ? matchedCity.id : (client.city_id || client.city || '');
    const cityNameVal = matchedCity ? matchedCity.name : (client.city || '');

    setClientForm({
      name: client.name || client.client_name || '',
      mobile: client.phonenumber || client.mobile || client.phone_number || '',
      address_line1: client.address_line1 || client.address1 || '',
      address_line2: client.address_line2 || client.address2 || '',
      state_id: stateIdVal,
      state: stateNameVal,
      city_id: cityIdVal,
      city: cityNameVal,
      zipcode: client.zipcode || ''
    });

    setShowClientModal(true);
  };

  const handleDeleteClient = (id) => {
    showConfirmDelete('Are you sure you want to delete this client?', async () => {
      try {
        await api.vdclients.deleteClient(id);
        fetchClients();
        showSuccess('Client deleted successfully!');
      } catch (err) {
        let msg = err?.message || 'Failed to delete client';
        const status = err?.status || err?.statusCode || err?.response?.status;
        if (
          status === 310 || 
          status === '310' || 
          String(msg).includes('310') || 
          String(err).includes('310')
        ) {
          msg = 'Unable to delete, Active users are online!';
        } else if (
          status === 421 || 
          status === '421' || 
          String(msg).includes('421') || 
          String(err).includes('421')
        ) {
          msg = 'Unable to delete client: Active users are currently online.';
        }
        showError(msg);
      }
    });
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
      iconClass: 'fa-solid fa-house',
      iconColor: '#e50914',
      items: []
    },
    {
      title: 'Author Management',
      iconClass: 'fa-solid fa-user-pen',
      iconColor: '#f59e0b',
      items: []
    },
    {
      title: 'Client Management',
      iconClass: 'fa-solid fa-building-user',
      iconColor: '#10b981',
      items: []
    },
    {
      title: 'Admin Management',
      iconClass: 'fa-solid fa-user-shield',
      iconColor: '#6366f1',
      items: [
        { id: 'admins_all', label: 'All Admins', iconClass: 'fa-solid fa-users-gear' }
      ]
    },
    {
      title: 'User Management',
      iconClass: 'fa-solid fa-users',
      iconColor: '#38bdf8',
      items: [
        { id: 'users_all', label: 'All Users', iconClass: 'fa-solid fa-user-group' },
        { id: 'users_logs', label: 'User Activity Logs', iconClass: 'fa-solid fa-clock-rotate-left' },
        { id: 'users_blocked', label: 'Blocked Users', iconClass: 'fa-solid fa-user-slash' }
      ]
    },
    {
      title: 'Content Management',
      iconClass: 'fa-solid fa-film',
      iconColor: '#ec4899',
      items: [
        { id: 'video_upload', label: 'Upload Video', iconClass: 'fa-solid fa-cloud-arrow-up' },
        { id: 'course_upload', label: 'Upload Course', iconClass: 'fa-solid fa-folder-plus' },
        { id: 'content_videos', label: 'All Videos', iconClass: 'fa-solid fa-video' },
        { id: 'course_all', label: 'All Courses', iconClass: 'fa-solid fa-layer-group' },
        { id: 'categories', label: 'Categories', iconClass: 'fa-solid fa-list-check' },
        { id: 'sub_categories', label: 'Sub Category', iconClass: 'fa-solid fa-sitemap' },
        { id: 'course_draft', label: 'Course Draft', iconClass: 'fa-solid fa-file-pen' }
      ]
    },
    {
      title: 'Analytics',
      iconClass: 'fa-solid fa-chart-line',
      iconColor: '#10b981',
      items: [
        { id: 'user_analytics', label: 'User Analytics', iconClass: 'fa-solid fa-chart-pie' },
        { id: 'video_analytics', label: 'Video Analytics', iconClass: 'fa-solid fa-chart-column' }
      ]
    },
    {
      title: 'Reports',
      iconClass: 'fa-solid fa-file-invoice-dollar',
      iconColor: '#f59e0b',
      items: []
    },
    {
      title: 'Platform Settings',
      iconClass: 'fa-solid fa-sliders',
      iconColor: '#8b5cf6',
      items: [
        { id: 'set_general', label: 'General Settings', iconClass: 'fa-solid fa-gear' },
        { id: 'set_languages', label: 'Languages', iconClass: 'fa-solid fa-language' }
      ]
    },
    {
      title: 'AI Insights',
      iconClass: 'fa-solid fa-brain',
      iconColor: '#06b6d4',
      items: [
        { id: 'ai_trending', label: 'Trending Videos', iconClass: 'fa-solid fa-fire' },
        { id: 'ai_churn', label: 'Churn Prediction', iconClass: 'fa-solid fa-user-minus' },
        { id: 'ai_forecast', label: 'Revenue Forecast', iconClass: 'fa-solid fa-arrow-trend-up' },
        { id: 'ai_recs', label: 'User Recommendations', iconClass: 'fa-solid fa-wand-magic-sparkles' }
      ]
    },
    {
      title: 'Support Center',
      iconClass: 'fa-solid fa-headset',
      iconColor: '#f43f5e',
      items: [
        { id: 'supp_tickets', label: 'Support Tickets', iconClass: 'fa-solid fa-ticket' },
        { id: 'supp_user', label: 'User Complaints', iconClass: 'fa-solid fa-circle-exclamation' },
        { id: 'supp_admin', label: 'Admin Complaints', iconClass: 'fa-solid fa-shield-cat' },
        { id: 'supp_bugs', label: 'Bug Reports', iconClass: 'fa-solid fa-bug' },
        { id: 'supp_feedback', label: 'Feedback', iconClass: 'fa-solid fa-comment-dots' }
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

        {menuStructure.map((section, idx) => {
          const isDashboard = section.title === 'Dashboard';
          const isAuthorAdmin = section.title === 'Author Management' || section.title === 'Author Admin';
          const isClientMgmt = section.title === 'Client Management';
          const isReports = section.title === 'Reports';
          const isSelected = (isDashboard && activeTab === 'overview') || 
                             (isAuthorAdmin && activeTab === 'author_admin') ||
                             (isClientMgmt && activeTab === 'client_management') || 
                             (isReports && (activeTab === 'rep_export' || activeTab.startsWith('rep_')));
          return (
            <div key={section.title} style={{ marginBottom: '6px', marginTop: '0px' }}>
              <button 
                onClick={() => {
                  if (isDashboard) {
                    setActiveTab('overview');
                    fetchDropdownAdmins();
                    setError('');
                    if (isSidebarOpen && toggleSidebar) {
                      toggleSidebar();
                    }
                  } else if (isAuthorAdmin) {
                    setActiveTab('author_admin');
                    setError('');
                    if (isSidebarOpen && toggleSidebar) {
                      toggleSidebar();
                    }
                  } else if (isClientMgmt) {
                    setActiveTab('client_management');
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className={section.iconClass || 'fa-solid fa-circle'} style={{ fontSize: '15px', color: section.iconColor || 'var(--accent-primary)', width: '18px', textAlign: 'center' }}></i>
                  <span>{t('admin.menu.' + section.title.toLowerCase().replace(/ & /g, '_and_').replace(/\s+/g, '_'), section.title)}</span>
                </span>
                {!isDashboard && !isReports && !isClientMgmt && !isAuthorAdmin && (
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

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div style={{
        marginLeft: '260px',
        padding: '15px',
        width: 'calc(100% - 260px)',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }} className="admin-content-container">
        
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800 }}>
              {(() => {
                if (activeTab === 'author_admin') return 'Author Management';
                if (activeTab === 'video_upload') return 'Upload Video';
                if (activeTab === 'course_upload') return 'Upload Course';
                if (activeTab === 'content_videos') return 'All Videos';
                if (activeTab === 'course_all') return 'All Courses';
                if (activeTab === 'course_draft') return 'Course Draft';
                if (activeTab === 'admins_all') return 'All Admins';
                if (activeTab === 'users_all') return 'All Users';
                if (activeTab === 'categories') return 'Categories';
                if (activeTab === 'sub_categories') return 'Sub Category';
                if (activeTab === 'client_management') return 'Client Management';
                if (activeTab === 'rep_export' || activeTab.startsWith('rep_')) return 'Reports';
                return activeTab.replace(/_/g, ' ');
              })()}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Super Admin Command & Control Hub</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {!['video_upload', 'content_upload', 'course_upload', 'categories', 'categories_all', 'sub_categories', 'client_management'].includes(activeTab) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Client:</span>
                <PremiumSelect
                  options={dropdownClients.map(client => ({
                    id: String(client.id ?? client.client_id ?? '0'),
                    name: client.name || client.client_name || client.username || client.email || 'Super Admin'
                  }))}
                  value={String(selectedClientId)}
                  onChange={handleClientChange}
                  searchable={dropdownClients.length > 5}
                  icon="fa-solid fa-building-user"
                  placeholder="Select Client"
                  style={{ minWidth: '170px', height: '38px', borderRadius: '8px' }}
                />
              </div>
            )}
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
            {/* Embed Video Upload / Course Upload / All Courses / Course Draft / Video All / Categories / Sub Categories from AdminDashboard */}
            {['video_upload', 'course_upload', 'course_all', 'course_draft', 'video_all', 'content_videos', 'categories', 'sub_categories'].includes(activeTab) && (
              <AdminDashboard justContent={true} activeTabOverride={activeTab === 'content_videos' ? 'video_all' : activeTab} selectedAdminId={selectedAdminId} theme={theme} />
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
                    headers={['Name', 'Email', 'Mobile', 'Status', 'Role', 'Actions']}
                    data={admins}
                    loading={loading}
                    emptyMessage="No administrators registered yet"
                    renderRow={(admin, index) => {
                      const isAdminActive = admin.status === true || String(admin.status).toLowerCase() === 'true' || String(admin.status).toLowerCase() === 'active';
                      const fullName = admin.first_name ? `${admin.first_name} ${admin.last_name || ''}` : admin.name || 'Admin';
                      const roleName = admin.role || (admin.isSuperAdmin ? 'Super Admin' : 'Admin');
                      return (
                        <tr key={admin.id || index}>
                          <td>
                            <UserAvatar name={fullName} index={index} />
                          </td>
                          <td style={{ color: '#475569' }}>{admin.email}</td>
                          <td style={{ color: '#475569' }}>{admin.phonenumber || admin.mobile}</td>
                          <td>
                            <TableStatusBadge status={isAdminActive} />
                          </td>
                          <td>
                            <TableRoleBadge role={roleName} />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <TableActionButton
                                icon="fa-solid fa-pen"
                                title="Edit Admin"
                                onClick={() => handleEditClick(admin)}
                              />
                              <button
                                type="button"
                                onClick={() => handleToggleAdminStatus(admin)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: isAdminActive ? '#fee2e2' : '#dcfce7',
                                  color: isAdminActive ? '#dc2626' : '#16a34a',
                                  transition: 'all 0.2s ease',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title={isAdminActive ? "Deactivate Admin" : "Activate Admin"}
                              >
                                {isAdminActive ? 'InActive' : 'Active'}
                              </button>
                              <TableActionButton
                                icon="fa-solid fa-trash-can"
                                type="delete"
                                title="Delete Admin"
                                onClick={() => handleDeleteAdmin(admin)}
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

            {/* CLIENT MANAGEMENT VIEW */}
            {activeTab === 'client_management' && (
              <div className="animate-fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Client Management</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Manage client profiles, contact numbers, and registered locations.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingClient(null);
                      setClientForm({
                        name: '',
                        mobile: '',
                        address_line1: '',
                        address_line2: '',
                        state_id: '',
                        state: '',
                        city_id: '',
                        city: '',
                        zipcode: ''
                      });
                      setShowClientModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <i className="fa-solid fa-plus"></i> Add Client
                  </button>
                </div>

                <div className="table-container">
                  <PaginatedTable
                    headers={['Client Name', 'Phone Number', 'Address Line 1', 'Address Line 2', 'State', 'City', 'Zipcode', 'Actions']}
                    data={clients}
                    loading={loading}
                    emptyMessage="No clients found"
                    renderRow={(client, index) => (
                      <tr key={client.id || index}>
                        <td style={{ fontWeight: 600 }}>{client.name || client.client_name}</td>
                        <td>{client.phonenumber || client.mobile || client.phone_number || '-'}</td>
                        <td>{client.address_line1 || client.address1 || '-'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{client.address_line2 || client.address2 || '-'}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#3b82f6'
                          }}>
                            {client.state || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981'
                          }}>
                            {client.city || 'N/A'}
                          </span>
                        </td>
                        <td>{client.zipcode || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleEditClient(client)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteClient(client.id)}
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
                    headers={['Name', 'Email', 'Mobile', 'Status', 'Client', 'Actions']}
                    data={authorAdmins}
                    loading={loading}
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
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <TableActionButton
                                icon="fa-solid fa-pen"
                                title="Edit Author Admin"
                                onClick={() => handleEditAuthorAdminClick(admin)}
                              />
                              <button
                                type="button"
                                onClick={() => handleToggleAuthorAdminStatus(admin)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: isAdminActive ? '#fee2e2' : '#dcfce7',
                                  color: isAdminActive ? '#dc2626' : '#16a34a',
                                  transition: 'all 0.2s ease',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title={isAdminActive ? "Deactivate Author Admin" : "Activate Author Admin"}
                              >
                                {isAdminActive ? 'InActive' : 'Active'}
                              </button>
                              <TableActionButton
                                icon="fa-solid fa-trash-can"
                                type="delete"
                                title="Delete Author Admin"
                                onClick={() => handleDeleteAuthorAdmin(admin)}
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
                    <label className="form-label">Client</label>
                    <PremiumSelect
                      options={adminClientsList}
                      value={adminForm.client_id}
                      onChange={e => setAdminForm({...adminForm, client_id: e.target.value})}
                      placeholder={loadingAdminClients ? "Loading clients..." : "Select Client"}
                      searchable={true}
                      icon="fa-solid fa-building-user"
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
                    headers={['User', 'Video', 'Action', 'Date']}
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
                    <PremiumDatePicker
                      value={adminLogFilters.date}
                      onChange={e => {
                        const newF = { ...adminLogFilters, date: e.target.value };
                        setAdminLogFilters(newF);
                        fetchAdminLogs(newF);
                      }}
                      placeholder="Select Date"
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
                    headers={['Admin Name', 'Action', 'IP Address', 'Date']}
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
                    headers={['User', 'Video', 'Action', 'Date']}
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
                          onClick={() => {
                            showConfirmDelete('Are you sure you want to delete this plan?', async () => {
                              try {
                                await api.plans.delete(plan.id);
                                fetchSubscriptionData();
                                showSuccess("Plan deleted successfully!");
                              } catch (err) {
                                showError(err.message || 'Failed to delete plan');
                              }
                            });
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
             activeTab !== 'author_admin' &&
             activeTab !== 'admins_all' && 
             activeTab !== 'client_management' && 
             activeTab !== 'categories' && 
             activeTab !== 'sub_categories' && 
             activeTab !== 'content_videos' && 
             activeTab !== 'activity' && 
             activeTab !== 'users_logs' &&
             activeTab !== 'admins_perf' &&
             activeTab !== 'admins_logs' &&
             activeTab !== 'admins_perms' &&
             activeTab !== 'video_upload' &&
             activeTab !== 'course_upload' &&
             activeTab !== 'course_all' &&
             activeTab !== 'course_draft' &&
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
                    onChange={e => setAdminForm({...adminForm, firstName: e.target.value.replace(/^\s+/, '')})} 
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
                    value={adminForm.lastName} 
                    onChange={e => setAdminForm({...adminForm, lastName: e.target.value.replace(/^\s+/, '')})} 
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
                    value={adminForm.email} 
                    onChange={e => setAdminForm({...adminForm, email: e.target.value.trim()})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out email address')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                    disabled={!!editingAdmin}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Client</label>
                  <PremiumSelect
                    options={adminClientsList}
                    value={adminForm.client_id}
                    onChange={e => setAdminForm({...adminForm, client_id: e.target.value})}
                    placeholder={loadingAdminClients ? "Loading clients..." : "Select Client"}
                    searchable={true}
                    icon="fa-solid fa-building-user"
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
                    onInvalid={e => e.target.setCustomValidity('Please fill out phone number')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Gender</label>
                  <PremiumSelect
                    options={genders}
                    value={adminForm.gender}
                    onChange={e => setAdminForm({...adminForm, gender: e.target.value})}
                    placeholder="Select Gender"
                    icon="fa-solid fa-venus-mars"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Date of Birth</label>
                  <PremiumDatePicker
                    value={adminForm.dob}
                    onChange={e => setAdminForm({...adminForm, dob: e.target.value})}
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
                    value={adminForm.address} 
                    onChange={e => setAdminForm({...adminForm, address: e.target.value.replace(/^\s+/, '')})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out address')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>State *</label>
                  <PremiumSelect
                    options={statesList}
                    value={adminForm.state_id || adminForm.state}
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
                    value={adminForm.city_id || adminForm.city}
                    onChange={e => {
                      const selectedCityObj = citiesList.find(c => String(c.id) === String(e.target.value));
                      setAdminForm({
                        ...adminForm,
                        city_id: e.target.value,
                        city: selectedCityObj ? selectedCityObj.name : e.target.value
                      });
                    }}
                    placeholder={loadingCities ? "Loading cities..." : (!adminForm.state_id && !adminForm.state ? "Select State First" : "Select City")}
                    icon="fa-solid fa-city"
                    disabled={loadingCities || (!adminForm.state_id && !adminForm.state)}
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
                    onInvalid={e => e.target.setCustomValidity('Please fill out zipcode')}
                    onInput={e => e.target.setCustomValidity('')}
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
                    style={{ background: editingAuthorAdmin ? '#e9ecef' : '#f5f5f5', color: editingAuthorAdmin ? '#6c757d' : '#333333', border: '1px solid #dddddd', cursor: editingAuthorAdmin ? 'not-allowed' : 'text' }}
                    value={authorAdminForm.email} 
                    onChange={e => {
                      if (!editingAuthorAdmin) {
                        setAuthorAdminForm({...authorAdminForm, email: e.target.value.trim()});
                      }
                    }} 
                    readOnly={Boolean(editingAuthorAdmin)}
                    onInvalid={e => e.target.setCustomValidity('Please fill out email address')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>

                {/* Client Selection Dropdown */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <i className="fa-solid fa-building" style={{ color: '#f59e0b', fontSize: '13px' }}></i>
                    Client *
                  </label>
                  <PremiumSelect
                    options={(dropdownClients || []).filter(c => String(c.id) !== '0').map(c => ({ id: c.id, name: c.name }))}
                    value={authorAdminForm.client_id}
                    placeholder="Select Client"
                    icon="fa-solid fa-building"
                    disabled={Boolean(editingAuthorAdmin)}
                    onChange={(e) => {
                      const newClientId = e.target.value;
                      setAuthorAdminForm(prev => ({
                        ...prev,
                        client_id: newClientId,
                        admin_id: ''
                      }));
                      if (newClientId) {
                        fetchClientAdmins(newClientId);
                      } else {
                        setClientAdminsList([]);
                      }
                    }}
                  />
                </div>

                {/* Admin Selection Dropdown */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <i className="fa-solid fa-user-shield" style={{ color: '#6366f1', fontSize: '13px' }}></i>
                    Admin *
                  </label>
                  <PremiumSelect
                    options={clientAdminsList.map(a => ({ id: a.id, name: a.name }))}
                    value={authorAdminForm.admin_id}
                    placeholder={loadingClientAdmins ? "Loading Admins..." : (clientAdminsList.length === 0 ? "No admins found for selected client" : "Select Admin")}
                    disabled={Boolean(editingAuthorAdmin) || loadingClientAdmins || clientAdminsList.length === 0}
                    icon="fa-solid fa-user-shield"
                    onChange={(e) => {
                      const newAdminId = e.target.value;
                      setAuthorAdminForm(prev => ({
                        ...prev,
                        admin_id: newAdminId
                      }));
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Phone Number *</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="Enter phone number"
                    style={{ background: editingAuthorAdmin ? '#e9ecef' : '#f5f5f5', color: editingAuthorAdmin ? '#6c757d' : '#333333', border: '1px solid #dddddd', cursor: editingAuthorAdmin ? 'not-allowed' : 'text' }}
                    value={authorAdminForm.mobile} 
                    onChange={e => {
                      if (!editingAuthorAdmin) {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setAuthorAdminForm({...authorAdminForm, mobile: value});
                      }
                    }} 
                    readOnly={Boolean(editingAuthorAdmin)} 
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

      {/* --- ADD / EDIT CLIENT MODAL --- */}
      {showClientModal && (
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
              {editingClient ? 'Edit Client' : 'Add Client'}
            </h3>
            <form onSubmit={handleClientSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Client Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter client name"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={clientForm.name} 
                    onChange={e => setClientForm({...clientForm, name: e.target.value.replace(/^\s+/, '')})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out client name')}
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
                    value={clientForm.mobile} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setClientForm({...clientForm, mobile: value});
                    }} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out phone number')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Address Line 1 *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter address line 1"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={clientForm.address_line1} 
                    onChange={e => setClientForm({...clientForm, address_line1: e.target.value.replace(/^\s+/, '')})} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out address line 1')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Address Line 2</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Suite, apartment, unit, building (optional)"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={clientForm.address_line2} 
                    onChange={e => setClientForm({...clientForm, address_line2: e.target.value.replace(/^\s+/, '')})} 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>State *</label>
                  <PremiumSelect
                    options={statesList}
                    value={clientForm.state_id || clientForm.state}
                    onChange={e => {
                      const selectedStateId = e.target.value;
                      const selectedStateObj = statesList.find(s => String(s.id) === String(selectedStateId));
                      setClientForm(prev => ({
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
                    value={clientForm.city_id || clientForm.city}
                    onChange={e => {
                      const selectedCityObj = citiesList.find(c => String(c.id) === String(e.target.value));
                      setClientForm(prev => ({
                        ...prev,
                        city_id: e.target.value,
                        city: selectedCityObj ? selectedCityObj.name : e.target.value
                      }));
                    }}
                    placeholder={loadingCities ? "Loading cities..." : (!clientForm.state_id && !clientForm.state ? "Select State First" : "Select City")}
                    icon="fa-solid fa-city"
                    disabled={loadingCities || (!clientForm.state_id && !clientForm.state)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#444444', fontWeight: 600 }}>Zipcode *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter zipcode"
                    style={{ background: '#f5f5f5', color: '#333333', border: '1px solid #dddddd' }}
                    value={clientForm.zipcode} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setClientForm({...clientForm, zipcode: value});
                    }} 
                    onInvalid={e => e.target.setCustomValidity('Please fill out zipcode')}
                    onInput={e => e.target.setCustomValidity('')}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowClientModal(false)} className="btn btn-secondary" style={{ background: '#e0e0e0', color: '#333333', border: 'none' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={clientFormLoading}>
                  {clientFormLoading ? 'Saving...' : 'Save Client'}
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
                  placeholder="e.g., Technology, Entertainment, Science & Tech"
                  value={categoryForm.name} 
                  onChange={e => setCategoryForm({...categoryForm, name: e.target.value.replace(/^\s+/, '')})} 
                  onInvalid={(e) => e.target.setCustomValidity('Please fill out category name')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  placeholder="Enter category description (optional)..."
                  value={categoryForm.description} 
                  onChange={e => setCategoryForm({...categoryForm, description: e.target.value.replace(/^\s+/, '')})}
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

      {/* --- SUB CATEGORY CRUD MODAL --- */}
      {showSubCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>
              {editingSubCategory ? 'Edit Sub Category' : 'Add Sub Category'}
            </h3>
            <form onSubmit={handleSubCategorySubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Category</label>
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
                  style={{ height: '48px', borderRadius: '12px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Sub Category Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g., Mobile Development, Machine Learning, Web Design"
                  value={subCategoryForm.name} 
                  onChange={e => setSubCategoryForm({...subCategoryForm, name: e.target.value.replace(/^\s+/, '')})} 
                  onInvalid={(e) => e.target.setCustomValidity('Please fill out sub category name')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  placeholder="Enter sub category description (optional)..."
                  value={subCategoryForm.description} 
                  onChange={e => setSubCategoryForm({...subCategoryForm, description: e.target.value.replace(/^\s+/, '')})}
                  rows="3" 
                  style={{ resize: 'none' }}
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
      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {confirmModal.show && (
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
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            width: '100%',
            maxWidth: '400px',
            padding: '36px 28px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'var(--text-primary, #333333)',
            animation: 'scaleIn 0.25s ease',
            border: '1px solid var(--border-color, rgba(0,0,0,0.1))'
          }}>
            {/* Warning Circle Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '3px solid #ef4444',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '26px', color: '#ef4444' }}></i>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary, #111827)',
              margin: '0 0 10px 0'
            }}>
              {confirmModal.title || 'Confirm Action'}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary, #6b7280)',
              lineHeight: '1.5',
              margin: '0 0 28px 0'
            }}>
              {confirmModal.message}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '10px'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const onConf = confirmModal.onConfirm;
                  setConfirmModal(prev => ({ ...prev, show: false }));
                  if (onConf) onConf();
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                {confirmModal.confirmText || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
