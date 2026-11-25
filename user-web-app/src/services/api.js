import { getAssetUrl, getAssetBaseUrl } from '../utils/assetUrl';
import { getApiBaseUrl, calculateBackoffDelay } from '../utils/apiUrl';
import { 
  generateCorrelationId,
  extractRequestId,
  sanitizeErrorMessage,
  formatDisplayErrorMessage,
  logFormError,
  handleFormApiError 
} from '../utils/formErrorHandler';

export { 
  getAssetUrl, 
  getAssetBaseUrl, 
  getApiBaseUrl, 
  calculateBackoffDelay,
  generateCorrelationId,
  extractRequestId,
  sanitizeErrorMessage,
  formatDisplayErrorMessage,
  logFormError,
  handleFormApiError 
};

export const getBaseUrl = () => {
  let url = '';
  try {
    url = process.env.REACT_APP_WEBHOOK_BASE_URL ||
          process.env.VITE_WEBHOOK_BASE_URL ||
          (process.env.REACT_APP_API_BASE_URL && process.env.REACT_APP_API_BASE_URL.includes('/webhook') ? process.env.REACT_APP_API_BASE_URL : '') ||
          (process.env.VITE_API_BASE_URL && process.env.VITE_API_BASE_URL.includes('/webhook') ? process.env.VITE_API_BASE_URL : '') ||
          'https://uat-02-admin-api.darpanx.com/webhook';
  } catch (e) {
    url = 'https://uat-02-admin-api.darpanx.com/webhook';
  }
  return (url || '').trim().replace(/\/+$/, '');
};

// Token validation helper
export const isValidToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (
    !trimmed || 
    trimmed === 'undefined' || 
    trimmed === 'null' || 
    trimmed.toLowerCase() === 'undefined' || 
    trimmed.toLowerCase() === 'null'
  ) {
    return false;
  }
  return true;
};

// Helper to get tokens - strictly from dedicated token storage, never resurrected from user profiles
export const getAccessToken = () => {
  const t = localStorage.getItem('learner_accessToken') || 
            localStorage.getItem('accessToken') || 
            localStorage.getItem('token') || 
            sessionStorage.getItem('accessToken') || 
            sessionStorage.getItem('token');
  return isValidToken(t) ? t.trim() : null;
};
export const getRefreshToken = () => {
  const t = localStorage.getItem('learner_refreshToken') || 
            localStorage.getItem('refreshToken') || 
            localStorage.getItem('token') || 
            sessionStorage.getItem('refreshToken') || 
            sessionStorage.getItem('token');
  return isValidToken(t) ? t.trim() : null;
};
export const setTokens = (accessToken, refreshToken) => {
  if (isValidToken(accessToken)) {
    localStorage.setItem('accessToken', accessToken.trim());
    localStorage.setItem('learner_accessToken', accessToken.trim());
  }
  if (isValidToken(refreshToken)) {
    localStorage.setItem('refreshToken', refreshToken.trim());
    localStorage.setItem('learner_refreshToken', refreshToken.trim());
  }
};
export const clearTokens = () => {
  // Centralized authentication cleanup: clears all credentials and cached session identifiers
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('learner_user');
  localStorage.removeItem('learner_accessToken');
  localStorage.removeItem('learner_refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('admin_user');
  localStorage.removeItem('admin_accessToken');
  localStorage.removeItem('admin_refreshToken');
  localStorage.removeItem('rememberedPassword');
  localStorage.removeItem('lastUserActivity');
  localStorage.removeItem('server_url');
  localStorage.removeItem('serverUrl');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('learner_user');
  sessionStorage.removeItem('admin_user');
  sessionStorage.removeItem('tempLoginData');
  sessionStorage.removeItem('rememberedPassword');
  sessionStorage.removeItem('lastUserActivity');
};

// Helper to safely parse JWT payload
export const parseJwtPayload = (token) => {
  if (!isValidToken(token)) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(pad);
    try {
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e1) {
      return JSON.parse(atob(base64));
    }
  } catch (e) {
    return null;
  }
};

// Validates whether a token exists and is not expired
export const isTokenExpired = (token) => {
  if (!isValidToken(token)) return true;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload !== 'object') {
    // If not a parseable JWT, it may be an opaque session token - do not falsely expire
    return false;
  }
  if (typeof payload.exp !== 'number') {
    return false;
  }

  // Normalize exp and current time to seconds
  const expSeconds = payload.exp > 1e11 ? Math.floor(payload.exp / 1000) : payload.exp;
  const nowSeconds = Math.floor(Date.now() / 1000);

  // If iat (issued at) claim is present, handle client-server clock skew safely
  if (typeof payload.iat === 'number') {
    const iatSeconds = payload.iat > 1e11 ? Math.floor(payload.iat / 1000) : payload.iat;
    const tokenLifetime = expSeconds - iatSeconds;

    // Detect substantial clock skew between client and server (e.g. client clock is ahead/behind by > 1 hour)
    const clockSkew = nowSeconds - iatSeconds;
    if (tokenLifetime > 0 && Math.abs(clockSkew) > 3600) {
      // Calculate remaining validity based on elapsed local time since login activity
      const lastActivity = parseInt(localStorage.getItem('lastUserActivity') || '0', 10);
      if (lastActivity > 0) {
        const elapsedSec = (Date.now() - lastActivity) / 1000;
        return elapsedSec > tokenLifetime;
      }
      return false;
    }
  }

  // Standard absolute expiration check with 60s buffer for minor clock jitter
  return expSeconds <= (nowSeconds - 60);
};

export const getCurrentUser = () => {
  try {
    // Cached user details alone are NEVER treated as proof of authentication
    const token = getRefreshToken() || getAccessToken();
    if (!isValidToken(token) || isTokenExpired(token)) {
      return null;
    }
    const rawUser = localStorage.getItem('learner_user') || localStorage.getItem('user');
    if (!rawUser) return null;
    const u = JSON.parse(rawUser);
    if (!u || typeof u !== 'object') return null;
    const role = String(u.role || u.role_id || '').toLowerCase();
    // If the active user in localStorage is an admin, it's not a learner session
    if (role === 'admin' || role === 'super_admin' || role === 'author_admin' || role === 'author admin' || role === '4' || role === '1') {
      return null;
    }
    return u;
  } catch (e) {
    return null;
  }
};

export const setCurrentUser = (user) => {
  localStorage.setItem('learner_user', JSON.stringify(user));
  localStorage.setItem('user', JSON.stringify(user));
};

function rc4(key, str) {
  var s = [], j = 0, x, res = '';
  var i;
  for (i = 0; i < 256; i++) { s[i] = i; }
  for (i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
  }
  i = 0; j = 0;
  for (var y = 0; y < str.length; y++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
    res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
  }
  return res;
}

export function encryptPayload(plaintext) {
  if (!plaintext) return "";
  try {
    const key = "LurnAxSecretEncryptionKey2026";
    const utf8Bytes = unescape(encodeURIComponent(plaintext));
    const encryptedBytes = rc4(key, utf8Bytes);
    return btoa(encryptedBytes);
  } catch (e) {
    return plaintext;
  }
}

export function decryptUrl(ciphertextBase64) {
  if (!ciphertextBase64) return "";
  try {
    const key = "LurnAxSecretEncryptionKey2026";
    const decodedBytes = atob(ciphertextBase64);
    const decryptedBytes = rc4(key, decodedBytes);
    return decodeURIComponent(escape(decryptedBytes));
  } catch (e) {
    return ciphertextBase64;
  }
}

export function decryptIfNeeded(val) {
  if (typeof val !== 'string' || !val) return val;
  let res = val;
  if (!res.startsWith('http://') && !res.startsWith('https://') && !res.startsWith('/') && !res.startsWith('data:') && !res.startsWith('blob:')) {
    try {
      const decrypted = decryptUrl(res);
      if (decrypted && (decrypted.startsWith('http://') || decrypted.startsWith('https://') || decrypted.startsWith('/') || decrypted.startsWith('data:') || decrypted.startsWith('blob:'))) {
        res = decrypted;
      }
    } catch (e) {}
  }
  if (typeof res === 'string') {
    res = res.replace(/([^:])\/\/+/g, '/');
    if (res.includes('localhost:5000')) {
      res = res.replace('localhost:5000', 'localhost:5050');
    }
  }
  return res;
}

function decryptResponseData(data) {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => decryptResponseData(item));
  }
  if (typeof data === 'object') {
    const keysToDecrypt = ['videoUrl', 'video_url', 'thumbnailUrl', 'thumbnail_url', 'thumbnail', 'banner', 'file_url', 'fileUrl', 'url', 'download_url', 'file'];
    const result = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (keysToDecrypt.includes(key)) {
          result[key] = decryptIfNeeded(data[key]);
        } else {
          result[key] = decryptResponseData(data[key]);
        }
      }
    }
    return result;
  }
  return data;
}

// Custom Fetch Wrapper with Auto Token Refresh
async function request(endpoint, options = {}) {
  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('/auth/login')) {
    cleanEndpoint = '/vdlogin';
  } else if (cleanEndpoint.startsWith('/vd')) {
    // Already has /vd prefix
  } else if (cleanEndpoint.startsWith('vd')) {
    cleanEndpoint = '/' + cleanEndpoint;
  } else if (cleanEndpoint.startsWith('/')) {
    cleanEndpoint = '/vd' + cleanEndpoint.substring(1);
  } else {
    cleanEndpoint = '/vd' + cleanEndpoint;
  }
  const url = `${getBaseUrl()}${cleanEndpoint}`;
  const headers = {
    ...options.headers,
  };

  // Attach Authorization Bearer token header: using token (refreshToken) only, not access token
  const token = getRefreshToken();
  if (isValidToken(token)) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  } else {
    delete headers['Authorization'];
  }
  if (headers['Authorization']) {
    const authVal = String(headers['Authorization']).trim();
    if (
      authVal === 'Bearer' ||
      authVal === 'Bearer undefined' ||
      authVal === 'Bearer null' ||
      authVal.toLowerCase() === 'bearer undefined' ||
      authVal.toLowerCase() === 'bearer null'
    ) {
      delete headers['Authorization'];
    }
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

  // Ensure no token key is ever present in the JSON body payload
  if (!(config.body instanceof FormData)) {
    let bodyObj = {};
    if (config.body && typeof config.body === 'string') {
      try {
        bodyObj = JSON.parse(config.body);
        if (bodyObj.token !== undefined) {
          delete bodyObj.token;
          config.body = JSON.stringify(bodyObj);
        }
      } catch (e) {}
    }
  }

  let response = await fetch(url, config);

  const isLoginRequest = 
    url.includes('/login') || 
    url.includes('/vdlogin') || 
    cleanEndpoint.includes('login') || 
    cleanEndpoint.includes('/vdlogin');

  // If unauthorized, try to refresh token (skip on login requests)
  if ((response.status === 401 || response.status === 403) && getRefreshToken() && !isLoginRequest) {
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
        config.headers['Authorization'] = `Bearer ${data.token || data.refreshToken || getRefreshToken()}`;
        response = await fetch(url, config);
      }
    } catch (e) {
      console.error("Token refresh failed", e);
    }
  }

  const responseRawText = await response.text().catch(() => '');
  let responseData = {};
  try {
    responseData = JSON.parse(responseRawText);
  } catch (e) {
    responseData = responseRawText;
  }

  const isUnauthorized = 
    response.status === 401 ||
    (typeof responseData === 'string' && responseData.toLowerCase().includes('not logged in')) ||
    (responseData && typeof responseData === 'object' && String(responseData.message || responseData.error || '').toLowerCase().includes('not logged in'));

  // Global 401 handling (except login): clear all authentication data and redirect to /login
  if (isUnauthorized && !isLoginRequest) {
    clearTokens();
    const currentHash = typeof window !== 'undefined' ? (window.location.hash || '') : '';
    const isAuthPage = currentHash.includes('/login') || 
                       currentHash.includes('/signup') || 
                       currentHash.includes('/forgot-password') || 
                       currentHash.includes('/reset-password');
    if (!isAuthPage && typeof window !== 'undefined') {
      sessionStorage.setItem('sessionExpired', 'true');
      window.location.hash = '#/login';
      window.dispatchEvent(new Event('hashchange'));
    }
    const errMsg = (responseData && (responseData.message || responseData.error)) || 'Session expired or unauthorized. Please log in again.';
    const error = new Error(errMsg);
    error.status = 401;
    error.statusCode = 401;
    throw error;
  }

  if (!response.ok) {
    let errMsg = (typeof responseData === 'object' && (responseData.message || responseData.error)) || (typeof responseData === 'string' && responseData) || `Request failed with status ${response.status}`;
    if (response.status === 430 || response.status === '430') {
      errMsg = 'Your account has been deactivated. Please contact your administrator for assistance.';
    }
    const error = new Error(errMsg);
    error.status = response.status;
    error.statusCode = response.status;
    throw error;
  }
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
      urlPath.includes('/vd_subscriptions') ||
      urlPath.includes('/vdsubscriptions') ||
      urlPath.endsWith('/plans') ||
      urlPath.includes('/history') ||
      urlPath.includes('/favorites') ||
      urlPath.includes('/transactions') ||
      urlPath.includes('/reports') ||
      urlPath.includes('/admin-logs') ||
      urlPath.includes('/monitoring') ||
      urlPath.includes('analytics') ||
      bodyObj.formstep === 'getPlans' ||
      bodyObj.formStep === 'getPlans' ||
      bodyObj.formStep === 'getAllAdmins' ||
      bodyObj.formStep === 'getMyUsers' ||
      bodyObj.formStep === 'blockedUsers' ||
      bodyObj.formStep === 'getUserLogs' ||
      bodyObj.formStep === 'getAllVideos' ||
      bodyObj.formStep === 'getCategories' ||
      bodyObj.formStep === 'getVisibilities' ||
      bodyObj.formStep === 'analytics' ||
      bodyObj.formStep === 'getAdmin' ||
      bodyObj.formStep === 'getAdmins' ||
      bodyObj.formstep === 'GetAdmins' ||
      bodyObj.formStep === 'GetAdmins' ||
      bodyObj.formstep === 'getAdminSA' ||
      bodyObj.formStep === 'getAdminSA' ||
      bodyObj.formstep === 'GetAdminSA' ||
      bodyObj.formStep === 'GetAdminSA' ||
      bodyObj.formstep === 'getAllCourses' ||
      bodyObj.formStep === 'getAllCourses' ||
      bodyObj.formstep === 'users_all' ||
      bodyObj.formstep === 'users_logs' ||
      bodyObj.formstep === 'users_blocked' ||
      bodyObj.formstep === 'getAllVidoes' ||
      bodyObj.formstep === 'getCategories' ||
      bodyObj.formstep === 'analytics' ||
      bodyObj.formstep === 'levels' ||
      bodyObj.formstep === 'getGender' ||
      bodyObj.formStep === 'getGender' ||
      bodyObj.formstep === 'getStates' ||
      bodyObj.formStep === 'getStates' ||
      bodyObj.formstep === 'getCity' ||
      bodyObj.formStep === 'getCity' ||
      bodyObj.formStep === 'list';

    const isN8n = responseData.length > 0 && responseData[0] && typeof responseData[0] === 'object' && 'json' in responseData[0];
    let result;
    if (isN8n) {
      // Check if it's a single item containing an array: [{ json: [...] }]
      if (responseData.length === 1 && Array.isArray(responseData[0].json)) {
        result = responseData[0].json;
      } else {
        const mapped = responseData.map(item => item.json);
        if (isList || (options && options.expectArray)) {
          result = mapped;
        } else {
          result = mapped[0] || {};
        }
      }
    } else {
      // Standard array or object (like from mock server or flat UAT webhook responses)
      if (Array.isArray(responseData)) {
        if (isList || (options && options.expectArray)) {
          result = responseData;
        } else {
          result = responseData[0] || {};
        }
      } else {
        result = responseData;
      }
    }
    return decryptResponseData(result);
  }
  return decryptResponseData(responseData);
}

async function uploadRequest(endpoint, options = {}) {
  const baseUrl = getAssetBaseUrl() || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5050' : 'http://localhost:5050');
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    ...options.headers,
  };
  const token = getRefreshToken();
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

export const getDeviceDetails = () => {
  if (typeof window === 'undefined' || !window.navigator) {
    return {
      device_type: 'web',
      device_model: 'Unknown',
      brand: null,
      device_info: {}
    };
  }

  const nav = window.navigator;
  const ua = nav.userAgent || '';

  let browserName = 'unknown';
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) {
    browserName = 'chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browserName = 'safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browserName = 'firefox';
  } else if (/edg/i.test(ua)) {
    browserName = 'edge';
  } else if (/msie|trident/i.test(ua)) {
    browserName = 'ie';
  }

  let deviceModel = nav.platform || 'Unknown';
  const match = ua.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    deviceModel = match[1];
  }

  let deviceType = 'web';
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    deviceType = 'tablet';
  }

  const deviceInfoObj = {
    Vendor: nav.vendor || 'Google Inc.',
    appName: nav.appName || 'Netscape',
    product: nav.product || 'Gecko',
    language: nav.language || 'en-US',
    platform: nav.platform || 'Win32',
    userAgent: ua,
    appVersion: nav.appVersion || ua,
    appCodeName: nav.appCodeName || 'Mozilla',
    browserName: browserName,
    deviceMemory: nav.deviceMemory || 8,
    hardwareConcurrency: nav.hardwareConcurrency || 8
  };

  return {
    device_type: deviceType,
    device_model: deviceModel,
    brand: null,
    device_info: deviceInfoObj
  };
};

// API Endpoints
export const api = {
  auth: {
    login: (email, password) => {
      const deviceDetails = getDeviceDetails();
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ 
          email: encryptPayload(email), 
          password: encryptPayload(password),
          portal_type: 'learner',
          device_type: deviceDetails.device_type,
          device_model: deviceDetails.device_model,
          brand: deviceDetails.brand,
          device_info: deviceDetails.device_info
        }),
      });
    },
    otp: (email, formStep, otpCode = null) => {
      const deviceDetails = getDeviceDetails();
      return request('/otp', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          formStep, 
          otp: otpCode,
          portal_type: 'learner',
          device_type: deviceDetails.device_type,
          device_model: deviceDetails.device_model,
          brand: deviceDetails.brand,
          device_info: deviceDetails.device_info
        }),
      });
    },
    signup: (data) => {
      return request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ 
          name: `${data.firstName} ${data.lastName}`,
          first_name: data.firstName,
          last_name: data.lastName,
          gender_id: data.genderId,
          date_of_birth: data.dob,
          email: data.email,
          country_code: data.country_code || data.countryCode || '+91',
          dial_code: data.dial_code || data.dialCode || data.country_code || '+91',
          country_iso: data.country_iso || data.countryIso || 'IN',
          mobile: data.mobile || '0000000000',
          password: data.password,
          type: data.type
        }),
      });
    },
    getGenders: () => {
      return request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ formstep: 'getGender' }),
        expectArray: true
      });
    },
    changePassword: (oldPassword, newPassword) => {
      return request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
    },
    forgotPassword: (email) => {
      return request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, formstep: 'forgotPassword' }),
      });
    },
    resetPassword: (email, newPassword) => {
      return request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          password: encryptPayload(newPassword),
          newPassword: encryptPayload(newPassword),
          formstep: 'vdresetPassword'
        }),
      });
    },
    me: async () => {
      try {
        return await request('/auth/me', {
          method: 'POST',
          body: JSON.stringify({ formstep: 'me' })
        });
      } catch (err) {
        // If /auth/me is not recognized or returns 404 (e.g. on UAT n8n webhook),
        // gracefully verify session via /vdUser with getProfile (standard UAT profile webhook)
        if (err && (err.status === 404 || err.statusCode === 404 || String(err.message).includes('404') || String(err.message).includes('not registered'))) {
          const token = getAccessToken();
          return await request('/vdUser', {
            method: 'POST',
            body: JSON.stringify({
              token: token || '',
              formstep: 'getProfile',
              formStep: 'getProfile'
            })
          });
        }
        throw err;
      }
    },
    getProfile: () => request('/auth/profile'),
    updateProfile: (formData) => {
      return request('/auth/profile', {
        method: 'PUT',
        body: formData, // FormData contains name, mobile, and optional avatar file
      });
    },
    saveProfile: (payload = {}) => {
      const token = getAccessToken();
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: 'saveProfile',
          formStep: 'saveProfile',
          name: payload.name || '',
          phonenumber: payload.phonenumber || payload.mobile || '',
          mobile: payload.mobile || payload.phonenumber || '',
          bio: payload.bio !== undefined ? payload.bio : '',
          ...payload
        })
      });
    },
    logout: async (logoutType = 1) => {
      const activeToken = getAccessToken() || getRefreshToken();
      const deviceDetails = getDeviceDetails();
      if (activeToken && isValidToken(activeToken)) {
        try {
          await request('/logout', {
            method: 'POST',
            body: JSON.stringify({ 
              formStep: 'logout', 
              logout_type: logoutType,
              device_type: deviceDetails.device_type,
              device_model: deviceDetails.device_model,
              brand: deviceDetails.brand,
              device_info: deviceDetails.device_info
            })
          });
        } catch (err) {
          console.error("Backend logout error", err);
        }
      }
      clearTokens();
      return Promise.resolve();
    }
  },
  dashboard: {
    getSuperAdmin: (formstep = 'overview', payload = {}) => {
      const expectArray = formstep === 'GetAdmins' || formstep === 'getAdminSA' || formstep === 'GetAdminSA' || formstep === 'getAllCourses' || formstep === 'users_all' || formstep === 'users_logs' || formstep === 'users_blocked' || formstep === 'getAllVidoes' || formstep === 'getCategories' || formstep === 'analytics' || formstep === 'levels';
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
        if (formStep === 'recently_palyed' || formStep === 'getQuizDetails' || formStep === 'getQuizHistory') {
          body.formstep = formStep;
        } else {
          body.formStep = formStep;
        }
      }

      // Ensure course_id and chapter_id parameters exist for vdUser API tracking
      if (body.course_id === undefined && body.courseId === undefined) {
        body.course_id = 0;
      } else if (body.course_id === undefined && body.courseId !== undefined) {
        body.course_id = body.courseId;
      }

      if (body.chapter_id === undefined && body.chapterId === undefined) {
        body.chapter_id = 0;
      } else if (body.chapter_id === undefined && body.chapterId !== undefined) {
        body.chapter_id = body.chapterId;
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
  vdcategories: {
    getStates: () => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({ formstep: "getStates" }),
        expectArray: true
      });
    },
    getCity: (stateId) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({ formstep: "getCity", state_id: stateId }),
        expectArray: true
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
    getSubCategories: (categoryId) => {
      return request('/adminVideos', {
        method: 'POST',
        body: JSON.stringify({
          formStep: "getSubCategory",
          category_id: categoryId
        })
      });
    },
    getPlans: () => {
      return request('/adminVideos', {
        method: 'POST',
        body: JSON.stringify({
          formStep: "getPlans"
        })
      });
    },
    getLanguages: () => {
      return request('/adminVideos', {
        method: 'POST',
        body: JSON.stringify({
          formStep: "getLanguage"
        })
      });
    },
    getAdmins: () => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const endpoint = isSuperAdmin ? '/SuperAdminVideos' : '/adminVideos';
      return request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          formStep: "getAdmins"
        }),
        expectArray: true
      });
    },
    registerVideo: async (payload) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const cleanBase = (getBaseUrl() || '').trim().replace(/\/+$/, '');
      const endpoint = isSuperAdmin ? 'vdSuperAdminVideos' : 'vdadminVideos';
      const url = `${cleanBase}/${endpoint}`;
      const token = getRefreshToken();
      const bodyObj = {
        ...payload,
        formStep: 'uploadVideo'
      };
      if (token) {
        bodyObj.token = token;
      }
      const isDarpanx = url.includes('darpanx.com');
      const isRelativeWebhook = url.startsWith('/webhook');
      const shouldUseCredentials = !isDarpanx && !isRelativeWebhook;
      const headers = {
        'Content-Type': 'application/json',
      };
      if (isValidToken(token)) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }
      const fetchConfig = {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyObj),
        ...(shouldUseCredentials ? { credentials: 'include' } : {})
      };
      let response;
      try {
        response = await fetch(url, fetchConfig);
      } catch (fetchErr) {
        if (fetchConfig.credentials === 'include') {
          const fallbackConfig = { ...fetchConfig };
          delete fallbackConfig.credentials;
          response = await fetch(url, fallbackConfig);
        } else {
          throw fetchErr;
        }
      }
      if (!response.ok) {
        throw new Error(`Failed to register video metadata: ${response.status}`);
      }
      return response.json();
    },

    uploadCourse: (payload) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const endpoint = isSuperAdmin ? '/SuperAdminVideos' : '/adminVideos';
      const bodyObj = { ...payload };
      const step = bodyObj.formstep || bodyObj.formStep || (isSuperAdmin ? "uploadCourse" : "UploadCouse");
      delete bodyObj.formstep;
      delete bodyObj.formStep;
      bodyObj.formstep = step;
      return request(endpoint, {
        method: 'POST',
        body: JSON.stringify(bodyObj)
      });
    },

    listCourses: (adminId = null) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      if (isSuperAdmin) {
        const payload = { formstep: "getAllCourses" };
        if (adminId) {
          payload.admin_id = adminId;
        }
        return request('/dashboard/super-admin', {
          method: 'POST',
          body: JSON.stringify(payload),
          expectArray: true
        });
      }
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
    list: () => {
      const token = getAccessToken();
      return request('/vdnotifications', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: "getNotifications",
          formStep: "getNotifications"
        }),
        expectArray: true
      });
    },
    markAsRead: (id) => {
      const token = getAccessToken();
      return request('/vdnotifications', {
        method: 'POST',
        body: JSON.stringify({
          id,
          token: token || '',
          formstep: "markAsRead",
          formStep: "markAsRead"
        })
      });
    },
    saveNotification: (notificationId, status = 'read') => {
      const token = getAccessToken();
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: "saveNotification",
          notification_id: notificationId,
          status: status
        })
      });
    },
    saveAllNotifications: (notificationIds, status = 'read') => {
      const token = getAccessToken();
      const idsParam = Array.isArray(notificationIds) ? notificationIds.join(',') : notificationIds;
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: "saveNotification",
          notification_id: idsParam,
          status: status
        })
      });
    },
    sendCampaign: (type, title, message) => {
      const token = getAccessToken();
      return request('/vdnotifications', {
        method: 'POST',
        body: JSON.stringify({
          type,
          title,
          message,
          token: token || '',
          formstep: "sendCampaign",
          formStep: "sendCampaign"
        })
      });
    }
  },
  user: {
    getProfile: (payload = {}) => {
      const token = getAccessToken();
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: 'getProfile',
          formStep: 'getProfile',
          ...payload
        })
      });
    },
    saveProfile: (payload = {}) => {
      const token = getAccessToken();
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: 'saveProfile',
          formStep: 'saveProfile',
          name: payload.name || '',
          phonenumber: payload.phonenumber || payload.mobile || '',
          mobile: payload.mobile || payload.phonenumber || '',
          bio: payload.bio !== undefined ? payload.bio : '',
          ...payload
        })
      });
    },
    getPlayList: (payload = {}) => {
      const token = getAccessToken();
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: 'getPlayList',
          ...payload
        })
      });
    },
    getWatchHistory: (payload = {}) => {
      const token = getAccessToken();
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: 'getWatchHistory',
          ...payload
        })
      });
    },
    addPlaylist: (data = {}) => {
      const token = getAccessToken();
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: 'addPlaylist',
          video_id: data.video_id || data.videoId || data.id,
          title: data.title || '',
          thumbnail: data.thumbnail || data.image || '',
          video_url: data.video_url || data.videoUrl || data.url || '',
          ...data
        })
      });
    },
    getAllCategories: (payload = {}) => {
      const token = getAccessToken();
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: 'getAllCategories',
          ...payload
        })
      });
    },
    getSubCategories: (categoryId, payload = {}) => {
      const token = getAccessToken();
      return request('/vdUser', {
        method: 'POST',
        body: JSON.stringify({
          token: token || '',
          formstep: 'getSubCategory',
          category_id: categoryId,
          categoryId: categoryId,
          ...payload
        })
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
    list: () => request('/subscriptions'),
    getPlans: () => {
      return request('/vd_subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          formstep: 'getPlans'
        }),
        expectArray: true
      });
    }
  },
  plans: {
    list: () => request('/plans'),
    getPlans: () => {
      return request('/vd_subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          formstep: 'getPlans'
        }),
        expectArray: true
      });
    },
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
