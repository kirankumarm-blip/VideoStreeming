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
    headers,
  };

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
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  const responseData = await response.json().catch(() => ({}));
  if (Array.isArray(responseData)) {
    return responseData[0] || {};
  }
  return responseData;
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
    signup: (name, email, mobile, password) => {
      return request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, mobile, password }),
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
    getSuperAdmin: () => request('/dashboard/super-admin'),
    getAdmin: () => request('/dashboard/admin'),
    getUser: () => request('/dashboard/user'),
  },
  categories: {
    list: () => request('/categories'),
    create: (name, description) => {
      return request('/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
    },
    update: (id, name, description) => {
      return request(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description }),
      });
    },
    delete: (id) => {
      return request(`/categories/${id}`, {
        method: 'DELETE',
      });
    }
  },
  users: {
    list: () => request('/users'),
    create: (name, email, mobile, password) => {
      return request('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, mobile, password }),
      });
    },
    update: (id, data) => {
      return request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  admins: {
    list: () => request('/admins'),
    create: (name, email, mobile, password) => {
      return request('/admins', {
        method: 'POST',
        body: JSON.stringify({ name, email, mobile, password }),
      });
    },
    update: (id, data) => {
      return request(`/admins/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  videos: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.category) query.append('category', params.category);
      const queryString = query.toString();
      return request(`/videos${queryString ? `?${queryString}` : ''}`);
    },
    get: (id) => request(`/videos/${id}`),
    upload: (formData) => {
      return request('/videos/upload', {
        method: 'POST',
        body: formData, // FormData contains title, description, category, video, thumbnail, tags, assignedAdmins
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
