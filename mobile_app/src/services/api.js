import AsyncStorage from '@react-native-async-storage/async-storage';

let baseUrl = 'http://10.0.2.2:5000/api'; // Android Emulator default

export const getBaseUrl = async () => {
  const savedUrl = await AsyncStorage.getItem('baseUrl');
  return savedUrl || baseUrl;
};

export const setBaseUrl = async (url) => {
  baseUrl = url;
  await AsyncStorage.setItem('baseUrl', url);
};

export const getAccessToken = async () => AsyncStorage.getItem('accessToken');
export const getRefreshToken = async () => AsyncStorage.getItem('refreshToken');
export const setTokens = async (accessToken, refreshToken) => {
  await AsyncStorage.setItem('accessToken', accessToken);
  await AsyncStorage.setItem('refreshToken', refreshToken);
};
export const clearTokens = async () => {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
  await AsyncStorage.removeItem('user');
};

export const getCurrentUser = async () => {
  try {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};

export const setCurrentUser = async (user) => {
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

async function request(endpoint, options = {}) {
  let cleanEndpoint = endpoint;
  const urlBase = await getBaseUrl();
  const isUat = urlBase.includes('darpanx.com');
  
  if (isUat) {
    if (cleanEndpoint.startsWith('/auth/login')) {
      cleanEndpoint = '/vdlogin';
    } else if (cleanEndpoint.startsWith('/')) {
      cleanEndpoint = '/vd' + cleanEndpoint.substring(1);
    } else {
      cleanEndpoint = 'vd' + cleanEndpoint;
    }
  }

  const url = `${urlBase}${cleanEndpoint}`;
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };

  const activeToken = await getAccessToken();
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  const config = {
    ...options,
    method: isUat ? 'POST' : (options.method || 'GET'),
    headers,
  };

  // Inject token directly into JSON bodies for n8n compatibility
  let bodyObj = {};
  if (config.body) {
    bodyObj = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
  }
  if (activeToken) {
    bodyObj.token = activeToken;
  }
  if (config.method === 'POST' || isUat) {
    config.body = JSON.stringify(bodyObj);
  }

  const response = await fetch(url, config);

  if ((response.status === 401 || response.status === 403) && await getRefreshToken()) {
    try {
      const refreshResponse = await fetch(`${urlBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: await getRefreshToken() }),
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        await setTokens(data.accessToken, data.refreshToken);
        
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        config.headers = headers;
        if (config.body) {
          let bObj = JSON.parse(config.body);
          bObj.token = data.accessToken;
          config.body = JSON.stringify(bObj);
        }
        const retryResponse = await fetch(url, config);
        return parseResponse(retryResponse, cleanEndpoint);
      } else {
        await clearTokens();
      }
    } catch (e) {
      console.error(e);
      await clearTokens();
    }
  }

  return parseResponse(response, cleanEndpoint);
}

async function parseResponse(response, cleanEndpoint) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  const responseData = await response.json().catch(() => ({}));

  if (Array.isArray(responseData)) {
    const isList = 
      cleanEndpoint.endsWith('/vdUser') ||
      cleanEndpoint.endsWith('/admins') ||
      cleanEndpoint.endsWith('/users') ||
      cleanEndpoint.endsWith('/categories') ||
      cleanEndpoint.endsWith('/videos') ||
      cleanEndpoint.includes('/history') ||
      cleanEndpoint.includes('/favorites') ||
      cleanEndpoint.includes('analytics');

    const isN8n = responseData.length > 0 && responseData[0] && typeof responseData[0] === 'object' && 'json' in responseData[0];
    
    if (isN8n) {
      if (responseData.length === 1 && Array.isArray(responseData[0].json)) {
        return responseData[0].json;
      }
      const mapped = responseData.map(item => item.json);
      if (isList) {
        return mapped;
      }
      return mapped[0] || {};
    }
  }

  return responseData;
}

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    signup: (name, email, mobile, password) => request('/auth/signup', { method: 'POST', body: { name, email, mobile, password } }),
    otp: (email, action, code = '') => request('/otp', { method: 'POST', body: { email, action, code } })
  },
  dashboard: {
    getUserDashboard: (formStep) => request('/User', { method: 'POST', body: { formStep } }),
    fetchCategories: () => request('/categories'),
    fetchCategoryVideos: (categoryId) => request('/User', { method: 'POST', body: { formStep: 'getCategoryVideo', category_id: categoryId } }),
    fetchExploreVideos: () => request('/User', { method: 'POST', body: { formStep: 'getExplore Video' } }),
    fetchWatchLater: () => request('/User', { method: 'POST', body: { formStep: 'getwatchLaterVideos' } }),
    saveWatchLater: (payload) => request('/User', { method: 'POST', body: { formStep: 'watchLater', ...payload } }),
    fetchDownloadHistory: () => request('/User', { method: 'POST', body: { formStep: 'download_history' } }),
    trackDownload: (payload) => request('/User', { method: 'POST', body: { formStep: 'download_video', ...payload } }),
    trackWatchSession: (payload) => request('/User', { method: 'POST', body: { formStep: 'watchsession', ...payload } }),
    trackWatchHistory: (payload) => request('/User', { method: 'POST', body: { formStep: 'watchHistory', ...payload } })
  },
  admin: {
    fetchSuperAdminDashboard: () => request('/dashboard/super-admin'),
    fetchAdminDashboard: () => request('/dashboard/admin'),
    fetchAdmins: () => request('/admins'),
    fetchUsers: () => request('/users'),
    createAdmin: (name, email, mobile, password) => request('/admins', { method: 'POST', body: { name, email, mobile, password } }),
    updateAdmin: (id, name, mobile, status) => request(`/admins/${id}`, { method: 'PUT', body: { name, mobile, status } }),
    createUser: (name, email, mobile, password) => request('/users', { method: 'POST', body: { name, email, mobile, password } }),
    updateUser: (id, name, mobile, status) => request(`/users/${id}`, { method: 'PUT', body: { name, mobile, status } }),
    createCategory: (name, description) => request('/categories', { method: 'POST', body: { name, description } }),
    deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
    fetchVideos: () => request('/videos')
  }
};
