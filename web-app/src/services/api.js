const getBaseUrl = () => {
  return 'https://uat-02-admin-api.darpanx.com/webhook';
};

// Helper to get tokens
export const getAccessToken = () => localStorage.getItem('accessToken');
export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    return null;
  }
};

export const setCurrentUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// Custom Fetch Wrapper with Auto Token Refresh
async function request(endpoint, options = {}) {
  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('/auth/login')) {
    cleanEndpoint = '/vdlogin';
  } else if (cleanEndpoint.startsWith('/')) {
    cleanEndpoint = '/vd' + cleanEndpoint.substring(1);
  } else {
    cleanEndpoint = 'vd' + cleanEndpoint;
  }
  const url = `${getBaseUrl()}${cleanEndpoint}`;
  const headers = {
    ...options.headers,
  };

  // Attach token if exists
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set Content-Type only if it's not a FormData (multer handles boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const config = {
    ...options,
    method: 'POST', // Force POST for all UAT n8n Webhook APIs
    headers,
  };

  // Inject the stored JWT token directly into the request payload body for ease of use in n8n
  if (!(config.body instanceof FormData)) {
    let bodyObj = {};
    if (config.body && typeof config.body === 'string') {
      try {
        bodyObj = JSON.parse(config.body);
      } catch (e) {}
    }
    const activeToken = getAccessToken();
    if (activeToken) {
      bodyObj.token = activeToken;
    }
    config.body = JSON.stringify(bodyObj);
  } else {
    const activeToken = getAccessToken();
    if (activeToken) {
      config.body.append('token', activeToken);
    }
  }

  let response = await fetch(url, config);

  // If unauthorized, try to refresh token
  if ((response.status === 401 || response.status === 403) && getRefreshToken()) {
    try {
      const refreshResponse = await fetch(`${getBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setTokens(data.accessToken, data.refreshToken);
        
        // Retry original request with new token
        config.headers['Authorization'] = `Bearer ${data.accessToken}`;
        response = await fetch(url, config);
      } else {
        // Refresh token failed, logout user
        clearTokens();
        window.location.hash = '/login';
      }
    } catch (e) {
      console.error("Token refresh failed", e);
      clearTokens();
      window.location.hash = '/login';
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errMsg = errorData.message || `Request failed with status ${response.status}`;
    const error = new Error(errMsg);
    error.status = response.status;
    throw error;
  }

  const responseData = await response.json().catch(() => ({}));
  if (Array.isArray(responseData)) {
    // Determine if the URL or formStep/payload indicates a list
    const urlPath = cleanEndpoint.split('?')[0];
    let bodyObj = {};
    if (options.body && typeof options.body === 'string') {
      try {
        bodyObj = JSON.parse(options.body);
      } catch (e) {}
    }
    
    const isList = 
      urlPath.endsWith('/vdUser') ||
      urlPath.endsWith('/admins') ||
      urlPath.endsWith('/users') ||
      urlPath.endsWith('/adminUsers') ||
      urlPath.includes('/vdadminUsers') ||
      urlPath.endsWith('/adminVideos') ||
      urlPath.includes('/vdadminVideos') ||
      urlPath.endsWith('/categories') ||
      urlPath.endsWith('/videos') ||
      urlPath.endsWith('/notifications') ||
      urlPath.endsWith('/subscriptions') ||
      urlPath.endsWith('/plans') ||
      urlPath.includes('/history') ||
      urlPath.includes('/favorites') ||
      urlPath.includes('/transactions') ||
      urlPath.includes('/reports') ||
      urlPath.includes('/admin-logs') ||
      urlPath.includes('/monitoring') ||
      urlPath.includes('analytics') ||
      bodyObj.formStep === 'getAllAdmins' ||
      bodyObj.formStep === 'getMyUsers' ||
      bodyObj.formStep === 'blockedUsers' ||
      bodyObj.formStep === 'getUserLogs' ||
      bodyObj.formStep === 'getAllVideos' ||
      bodyObj.formStep === 'getCategories' ||
      bodyObj.formStep === 'getVisibilities' ||
      bodyObj.formStep === 'analytics' ||
      bodyObj.formStep === 'getAdmin' ||
      bodyObj.formstep === 'GetAdmins' ||
      bodyObj.formStep === 'GetAdmins' ||
      bodyObj.formstep === 'users_all' ||
      bodyObj.formstep === 'users_logs' ||
      bodyObj.formstep === 'users_blocked' ||
      bodyObj.formstep === 'getAllVidoes' ||
      bodyObj.formstep === 'getCategories' ||
      bodyObj.formstep === 'analytics' ||
      bodyObj.formstep === 'levels' ||
      bodyObj.formStep === 'list';

    // Check if it's n8n style wrapping: [{ json: ... }]
    const isN8n = responseData.length > 0 && responseData[0] && typeof responseData[0] === 'object' && 'json' in responseData[0];
    
    if (isN8n) {
      // Check if it's a single item containing an array: [{ json: [...] }]
      if (responseData.length === 1 && Array.isArray(responseData[0].json)) {
        return responseData[0].json;
      }
      
      const mapped = responseData.map(item => item.json);
      if (isList || (options && options.expectArray)) {
        return mapped;
      }
      return mapped[0] || {};
    } else {
      // Standard array or object (like from mock server or flat UAT webhook responses)
      if (Array.isArray(responseData)) {
        if (isList || (options && options.expectArray)) {
          return responseData;
        }
        return responseData[0] || {};
      }
      return responseData;
    }
  }
  return responseData;
}

const UPLOAD_SERVICE_URL = 'http://localhost:5050';

async function uploadRequest(endpoint, options = {}) {
  const url = `${UPLOAD_SERVICE_URL}${endpoint}`;
  const headers = {
    ...options.headers,
  };
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  const config = {
    ...options,
    headers,
  };
  const response = await fetch(url, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload request failed with status ${response.status}`);
  }
  return response.json();
}

// API Endpoints
export const api = {
  auth: {
    login: (email, password) => {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    otp: (email, formStep, otpCode = null) => {
      return request('/otp', {
        method: 'POST',
        body: JSON.stringify({ email, formStep, otp: otpCode }),
      });
    },
    signup: (data) => {
      return request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ 
          name: `${data.firstName} ${data.lastName}`,
          first_name: data.firstName,
          last_name: data.lastName,
          gender: data.gender,
          date_of_birth: data.dob,
          email: data.email,
          mobile: data.mobile || '0000000000',
          password: data.password
        }),
      });
    },
    changePassword: (oldPassword, newPassword) => {
      return request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
    },
    getProfile: () => request('/auth/profile'),
    updateProfile: (formData) => {
      return request('/auth/profile', {
        method: 'PUT',
        body: formData, // FormData contains name, mobile, and optional avatar file
      });
    },
    logout: () => {
      clearTokens();
      return Promise.resolve();
    }
  },
  dashboard: {
    getSuperAdmin: (formstep = 'overview', payload = {}) => {
      const expectArray = formstep === 'GetAdmins' || formstep === 'users_all' || formstep === 'users_logs' || formstep === 'users_blocked' || formstep === 'getAllVidoes' || formstep === 'getCategories' || formstep === 'analytics' || formstep === 'levels';
      return request('/dashboard/super-admin', {
        method: 'POST',
        body: JSON.stringify({ formstep, ...payload }),
        expectArray
      });
    },
    getAdmin: (formStep = 'overview') => {
      return request('/dashboard/admin', {
        method: 'POST',
        body: JSON.stringify({ formStep }),
      });
    },
    getUser: (formStep = null, payload = {}) => {
      const body = { ...payload };
      if (formStep) {
        body.formStep = formStep;
      }
      return request('/User', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  },
  categories: {
    list: () => {
      return request('/adminVideos', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getCategories" }),
      });
    },
    create: (name, description) => {
      return request('/categories', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "addCategory",
          name, 
          description 
        }),
      });
    },
    update: (id, name, description) => {
      return request('/categories', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "editCategory",
          id,
          name, 
          description 
        }),
      });
    },
    delete: (id) => {
      return request(`/categories/${id}`, {
        method: 'DELETE',
      });
    }
  },
  users: {
    list: () => {
      return request('/adminUsers', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getMyUsers" }),
      });
    },
    listBlocked: () => {
      return request('/adminUsers', {
        method: 'POST',
        body: JSON.stringify({ formStep: "blockedUsers" }),
      });
    },
    create: (data) => {
      return request('/adminUsers', {
        method: 'POST',
        body: JSON.stringify({ formStep: "AddUser", ...data }),
      });
    },
    update: (userId, data) => {
      return request('/adminUsers', {
        method: 'POST',
        body: JSON.stringify({ formStep: "AddUser", user_id: userId, ...data }),
      });
    },
    get: (userId) => {
      return request('/adminUsers', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getUser", user_id: userId }),
      });
    },
    changeStatus: (userId, statusVal, isBlock = false) => {
      return request('/adminUsers', {
        method: 'POST',
        body: JSON.stringify({
          formStep: isBlock ? "BlockUser" : "activeStatus",
          user_id: userId,
          status: statusVal
        }),
      });
    },
    unblock: (userId) => {
      return request('/adminUsers', {
        method: 'POST',
        body: JSON.stringify({
          formStep: "unBlockUser",
          user_id: userId,
          status: "UnBlock"
        }),
      });
    },
    getUserLogs: () => {
      return request('/adminUsers', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getUserLogs" }),
      });
    }
  },
  admins: {
    list: () => {
      return request('/admins', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getAllAdmins" }),
      });
    },
    create: (data) => {
      return request('/admins', {
        method: 'POST',
        body: JSON.stringify({ formStep: "AddAdmin", ...data }),
      });
    },
    update: (id, data) => {
      return request('/admins', {
        method: 'POST',
        body: JSON.stringify({ formStep: "AddAdmin", id, user_id: id, ...data }),
      });
    },
    get: (userId) => {
      return request('/admins', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getAdmin", user_id: userId }),
      });
    },
    toggleStatus: (userId, nextStatus) => {
      return request('/admins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "activeStatus",
          user_id: userId,
          status: nextStatus
        }),
      });
    }
  },
  videos: {
    list: (params = {}) => {
      return request('/adminVideos', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getAllVideos" }),
      });
    },
    getLevels: () => {
      return request('/adminVideos', {
        method: 'POST',
        body: JSON.stringify({ formstep: "levels" }),
      });
    },
    get: (id) => request(`/videos/${id}`),
    upload: (formData) => {
      formData.append('formStep', 'uploadVideo');
      return request('/adminVideos', {
        method: 'POST',
        body: formData,
      });
    },
    initiateChunkUpload: (fileName, fileSize, fileType) => {
      return uploadRequest('/api/upload/initiate', {
        method: 'POST',
        body: JSON.stringify({ fileName, fileSize, fileType })
      });
    },
    uploadChunk: (formData) => {
      return uploadRequest('/api/upload/chunk', {
        method: 'POST',
        body: formData
      });
    },
    completeChunkUpload: (uploadId, fileName, totalChunks) => {
      return uploadRequest('/api/upload/complete', {
        method: 'POST',
        body: JSON.stringify({ uploadId, fileName, totalChunks })
      });
    },
    registerVideo: async (payload) => {
      const url = `${getBaseUrl()}/vdadminVideos`;
      const token = getAccessToken();
      const bodyObj = {
        ...payload,
        formStep: 'uploadVideo'
      };
      if (token) {
        bodyObj.token = token;
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(bodyObj)
      });
      if (!response.ok) {
        throw new Error(`Failed to register video metadata: ${response.status}`);
      }
      return response.json();
    },

    uploadCourse: (payload) => {
      return request('/adminVideos', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          formStep: "UploadCouse"
        })
      });
    },

    listCourses: () => {
      return request('/adminVideos', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getAllCourses" }),
      });
    },

    listVisibilities: () => {
      return request('/adminVideos', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getVisibilities" }),
      });
    },
    update: (id, data) => {
      return request(`/videos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: (id) => {
      return request(`/videos/${id}`, {
        method: 'DELETE',
      });
    },
    assign: (videoId, assignedAdmins) => {
      return request('/videos/assign', {
        method: 'POST',
        body: JSON.stringify({ videoId, assignedAdmins }),
      });
    },
    track: (videoId, trackingData) => {
      return request('/videos/track', {
        method: 'POST',
        body: JSON.stringify({ videoId, ...trackingData }),
      });
    },
    getHistory: () => request('/videos/history'),
    getFavorites: () => request('/videos/favorites'),
    toggleFavorite: (id) => {
      return request(`/videos/${id}/favorite`, {
        method: 'POST',
      });
    }
  },
  notifications: {
    list: () => request('/notifications'),
    markAsRead: (id) => {
      return request(`/notifications/${id}/read`, {
        method: 'PUT',
      });
    },
    sendCampaign: (type, title, message) => {
      return request('/notifications/campaign', {
        method: 'POST',
        body: JSON.stringify({ type, title, message }),
      });
    }
  },
  reports: {
    getSuperAdmin: () => request('/reports/super-admin'),
    getAdmin: () => request('/reports/admin'),
  },
  analytics: {
    getUser: () => request('/analytics/user'),
    getContent: () => request('/analytics/content'),
    getRevenue: () => request('/analytics/revenue'),
    getEngagement: () => request('/analytics/engagement'),
    getStreaming: () => request('/analytics/streaming')
  },
  monitoring: {
    getLive: () => request('/monitoring/live'),
    getServer: () => request('/monitoring/server'),
    getSecurity: () => request('/monitoring/security'),
    getAlerts: () => request('/monitoring/alerts')
  },
  adminLogs: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.date) query.append('date', params.date);
      if (params.admin) query.append('admin', params.admin);
      if (params.actionType) query.append('actionType', params.actionType);
      const queryString = query.toString();
      return request(`/admin-logs${queryString ? `?${queryString}` : ''}`);
    }
  },
  subscriptions: {
    list: () => request('/subscriptions')
  },
  plans: {
    list: () => request('/plans'),
    create: (name, price, durationDays, features) => {
      return request('/plans', {
        method: 'POST',
        body: JSON.stringify({ name, price, durationDays, features })
      });
    },
    update: (id, name, price, durationDays, features) => {
      return request(`/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, price, durationDays, features })
      });
    },
    delete: (id) => {
      return request(`/plans/${id}`, {
        method: 'DELETE'
      });
    }
  },
  moderation: {
    getReports: () => request('/moderation/reports'),
    resolve: (reportId, action) => {
      return request('/moderation/resolve', {
        method: 'POST',
        body: JSON.stringify({ reportId, action })
      });
    }
  },
  payments: {
    getTransactions: () => request('/payments/transactions'),
    refund: (transactionId) => {
      return request('/payments/refund', {
        method: 'POST',
        body: JSON.stringify({ transactionId })
      });
    }
  },
  settings: {
    get: () => request('/settings'),
    update: (settingsData) => {
      return request('/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsData)
      });
    }
  }
};
