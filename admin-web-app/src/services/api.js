const getBaseUrl = () => {
  return 'https://uat-02-admin-api.darpanx.com/webhook';
};

// Helper to get tokens
export const getAccessToken = () => {
  let t = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('accessToken') || sessionStorage.getItem('token');
  if (!t) {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      t = u.token || u.accessToken || u.jwt;
    } catch (e) {}
  }
  return t || null;
};
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

function decryptUrl(ciphertextBase64) {
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

function decryptIfNeeded(val) {
  if (typeof val !== 'string' || !val) return val;
  if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/') || val.startsWith('data:')) {
    return val;
  }
  try {
    const decrypted = decryptUrl(val);
    if (decrypted && (decrypted.startsWith('http://') || decrypted.startsWith('https://') || decrypted.startsWith('/') || decrypted.startsWith('data:'))) {
      return decrypted;
    }
  } catch (e) {}
  return val;
}

// Helper to recursively decrypt response structures
function decryptResponseData(data) {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => decryptResponseData(item));
  }
  if (typeof data === 'object') {
    const keysToDecrypt = ['videoUrl', 'video_url', 'thumbnailUrl', 'thumbnail_url', 'thumbnail', 'banner'];
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

  // Attach Authorization Bearer token header if exists in storage
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
    let errMsg = errorData.message || errorData.error || `Request failed with status ${response.status}`;
    if (response.status === 310 || response.status === '310') {
      errMsg = 'Unable to delete, Active users are online!';
    } else if (response.status === 421 || response.status === '421') {
      errMsg = 'Unable to delete client: Active users are currently online.';
    } else if (response.status === 430 || response.status === '430') {
      errMsg = 'Your account has been deactivated. Please contact your administrator for assistance.';
    }
    const error = new Error(errMsg);
    error.status = response.status;
    error.statusCode = response.status;
    error.data = errorData;
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
      urlPath.includes('/vd_drafts') ||
      urlPath.includes('/vdDrafts') ||
      bodyObj.formstep === 'getCourseDraft' ||
      bodyObj.formStep === 'getCourseDraft' ||
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
      bodyObj.formstep === 'getAllAdmins' ||
      bodyObj.formStep === 'getMyUsers' ||
      bodyObj.formStep === 'blockedUsers' ||
      bodyObj.formStep === 'getUserLogs' ||
      bodyObj.formStep === 'getAllVideos' ||
      bodyObj.formStep === 'getAssignedVideos' ||
      bodyObj.formStep === 'getMyVideos' ||
      bodyObj.formstep === 'getAssignedVideos' ||
      bodyObj.formstep === 'getMyVideos' ||
      bodyObj.formStep === 'getAssignedCourse' ||
      bodyObj.formStep === 'getMyCourse' ||
      bodyObj.formstep === 'getAssignedCourse' ||
      bodyObj.formstep === 'getMyCourse' ||
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
      bodyObj.formstep === 'getSubCategory' ||
      bodyObj.formStep === 'getSubCategory' ||
      bodyObj.formstep === 'getSubCategories' ||
      bodyObj.formStep === 'getSubCategories' ||
      bodyObj.formstep === 'subcategory' ||
      bodyObj.formStep === 'subcategory' ||
      bodyObj.formstep === 'analytics' ||
      bodyObj.formstep === 'levels' ||
      bodyObj.formstep === 'getGender' ||
      bodyObj.formStep === 'getGender' ||
      bodyObj.formstep === 'getStates' ||
      bodyObj.formStep === 'getStates' ||
      bodyObj.formstep === 'getCity' ||
      bodyObj.formStep === 'getCity' ||
      bodyObj.formstep === 'getAthorAdmins' ||
      bodyObj.formStep === 'getAthorAdmins' ||
      bodyObj.formstep === 'getAuthorAdmins' ||
      bodyObj.formStep === 'getAuthorAdmins' ||
      bodyObj.formstep === 'getAuthorAdmin' ||
      bodyObj.formStep === 'getAuthorAdmin' ||
      bodyObj.formstep === 'GetAuthorAdmin' ||
      bodyObj.formStep === 'GetAuthorAdmin' ||
      bodyObj.formstep === 'authorAdmin' ||
      bodyObj.formStep === 'authorAdmin' ||
      bodyObj.formstep === 'getClientAdmin' ||
      bodyObj.formStep === 'getClientAdmin' ||
      bodyObj.formstep === 'GetClientAdmin' ||
      bodyObj.formStep === 'GetClientAdmin' ||
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
    getProfile: () => request('/auth/profile'),
    updateProfile: (formData) => {
      return request('/auth/profile', {
        method: 'PUT',
        body: formData, // FormData contains name, mobile, and optional avatar file
      });
    },
    logout: (logoutType = 1) => {
      const activeToken = getAccessToken();
      const deviceDetails = getDeviceDetails();
      if (activeToken) {
        request('/logout', {
          method: 'POST',
          body: JSON.stringify({ 
            formStep: 'logout', 
            logout_type: logoutType,
            device_type: deviceDetails.device_type,
            device_model: deviceDetails.device_model,
            brand: deviceDetails.brand,
            device_info: deviceDetails.device_info
          })
        }).catch(err => console.error("Backend logout error", err));
      }
      clearTokens();
      return Promise.resolve();
    }
  },
  dashboard: {
    getSuperAdmin: (formstep = 'overview', payload = {}) => {
      const expectArray = formstep === 'GetAdmins' || formstep === 'getAdminSA' || formstep === 'GetAdminSA' || formstep === 'getAllCourses' || formstep === 'users_all' || formstep === 'users_logs' || formstep === 'users_blocked' || formstep === 'getAllVidoes' || formstep === 'getCategories' || formstep === 'analytics' || formstep === 'levels' || formstep === 'getGender';
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
        if (formStep === 'recently_palyed') {
          body.formstep = 'recently_palyed';
        } else {
          body.formStep = formStep;
        }
      }
      return request('/User', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  },
  categories: {
    list: (clientId = null) => {
      const payload = { formstep: "getCategories", formStep: "getCategories" };
      if (clientId !== null && clientId !== undefined && clientId !== '') {
        payload.client_id = clientId;
        payload.admin_id = clientId;
        payload.clientId = clientId;
        payload.adminId = clientId;
      }
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
      });
    },
    create: (name, description) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "addCategory",
          name, 
          category_name: name,
          description 
        }),
      });
    },
    update: (id, name, description) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "editCategory",
          id,
          name, 
          category_name: name,
          description 
        }),
      });
    },
    delete: (id) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "deleteCategory",
          id
        })
      });
    }
  },
  vdcategories: {
    getDropdownData: (clientId = null, type = null) => {
      const payload = { formstep: "dropdown_data" };
      if (type) {
        payload.type = type;
      }
      if (clientId !== null && clientId !== undefined && clientId !== '') {
        payload.client_id = clientId;
      }
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
      });
    },
    getCategories: (clientId = null) => {
      const payload = { formstep: "getCategories" };
      if (clientId !== null && clientId !== undefined && clientId !== '') {
        payload.client_id = clientId;
        payload.admin_id = clientId;
        payload.clientId = clientId;
        payload.adminId = clientId;
      }
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
      });
    },
    addCategory: (name, description) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "addCategory",
          name,
          category_name: name,
          description
        })
      });
    },
    editCategory: (id, name, description) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "editCategory",
          id,
          name,
          category_name: name,
          description
        })
      });
    },
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
    },
    getQuizTypes: () => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "getQuizTypes"
        }),
        expectArray: true
      });
    },
    listAllSubCategories: () => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "subcategory"
        }),
        expectArray: true
      });
    },
    getSubCategories: (categoryId = null, clientId = null) => {
      const payload = {
        formstep: "getSubCategory"
      };
      if (categoryId) {
        payload.category_id = categoryId;
      }
      if (clientId !== null && clientId !== undefined && clientId !== '') {
        payload.client_id = clientId;
      }
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
      });
    },
    addSubCategory: (catId, name, description) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "addSubCategory",
          cat_id: catId,
          name,
          description
        })
      });
    },
    editSubCategory: (id, catId, name, description) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "editSubCategory",
          id,
          cat_id: catId,
          name,
          description
        })
      });
    },
    deleteSubCategory: (id) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "deleteSubCategory",
          id
        })
      });
    },
    deleteCategory: (id) => {
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "deleteCategory",
          id
        })
      });
    }
  },

  vdclients: {
    getClients: () => {
      return request('/vdClients', {
        method: 'POST',
        body: JSON.stringify({ formstep: "getClients" }),
        expectArray: true
      });
    },
    addClient: (clientData) => {
      return request('/vdClients', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "add client",
          ...clientData
        })
      });
    },
    editClient: (id, clientData) => {
      return request('/vdClients', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "edit client",
          id,
          ...clientData
        })
      });
    },
    deleteClient: (id) => {
      return request('/vdClients', {
        method: 'POST',
        body: JSON.stringify({
          formstep: "delete client",
          id
        })
      });
    }
  },
  vdadmins: {
    getAdmins: (params = {}) => {
      const payload = typeof params === 'object' ? params : { client_id: params, admin_id: params };
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "getClients",
          ...payload
        }),
        expectArray: true
      });
    },
    list: (params = {}) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const payload = typeof params === 'object' ? { ...params } : { client_id: params };
      delete payload.admin_id;

      if (isSuperAdmin) {
        return request('/vdadmins', {
          method: 'POST',
          body: JSON.stringify({ 
            formstep: "getAllAdmins",
            formStep: "getAllAdmins",
            ...payload 
          }),
        });
      }

      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "getAllAdmins",
          formStep: "getAllAdmins",
          ...payload
        }),
      });
    },
    getAuthorAdmin: (params = {}) => {
      const payload = typeof params === 'object' ? params : {};
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "getAuthorAdmin",
          ...payload
        })
      });
    },
    getClientAdmin: (data = {}) => {
      const payload = typeof data === 'object' ? data : {};
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "getClientAdmin",
          ...payload
        })
      });
    },
    assignVideo: (data = {}) => {
      const payload = typeof data === 'object' ? data : {};
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "AssignVideo",
          formStep: "AssignVideo",
          message: "video as assigned to you",
          msg: "video as assigned to you",
          notificationMessage: "video as assigned to you",
          ...payload
        })
      });
    },
    assignCourse: (data = {}) => {
      const payload = typeof data === 'object' ? data : {};
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "assignCourse",
          formStep: "assignCourse",
          message: "course as assigned to you",
          msg: "course as assigned to you",
          notificationMessage: "course as assigned to you",
          ...payload
        })
      });
    },
    addAuthorAdmin: (data = {}) => {
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "addAuthorAdmin",
          ...data
        })
      });
    },
    editAuthorAdmin: (data = {}) => {
      const payload = typeof data === 'object' ? data : {};
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "editAuthor",
          ...payload
        })
      });
    },
    deleteAdmin: (userId, clientId = null) => {
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "deleteAdmin",
          formStep: "deleteAdmin",
          user_id: userId,
          id: userId,
          client_id: clientId,
          admin_id: clientId
        })
      });
    },
    deleteAuthorAdmin: (userId, clientId = null) => {
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "deleteAuthorAdmin",
          formStep: "deleteAuthorAdmin",
          user_id: userId,
          id: userId,
          client_id: clientId,
          admin_id: clientId
        })
      });
    },
    toggleAuthorAdminStatus: (userId, nextStatus, clientId = null) => {
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "activeStatusAuthor",
          formStep: "activeStatusAuthor",
          status: nextStatus,
          user_id: userId,
          id: userId,
          client_id: clientId,
          admin_id: clientId
        })
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
    bulkUpload: (formDataOrPayload) => {
      const isFormData = typeof FormData !== 'undefined' && formDataOrPayload instanceof FormData;
      if (isFormData) {
        if (!formDataOrPayload.has('formstep')) formDataOrPayload.append('formstep', 'bulk_upload');
        if (!formDataOrPayload.has('formStep')) formDataOrPayload.append('formStep', 'bulk_upload');
        return request('/vd_bulk_upload', {
          method: 'POST',
          body: formDataOrPayload
        });
      }
      const bodyObj = { ...formDataOrPayload, formstep: 'bulk_upload', formStep: 'bulk_upload' };
      return request('/vd_bulk_upload', {
        method: 'POST',
        body: JSON.stringify(bodyObj)
      });
    },
    bulkUploadUsers: (formDataOrPayload) => {
      const isFormData = typeof FormData !== 'undefined' && formDataOrPayload instanceof FormData;
      if (isFormData) {
        if (!formDataOrPayload.has('formstep')) formDataOrPayload.append('formstep', 'bulk_upload');
        if (!formDataOrPayload.has('formStep')) formDataOrPayload.append('formStep', 'bulk_upload');
        return request('/vd_bulk_upload', {
          method: 'POST',
          body: formDataOrPayload
        });
      }
      const bodyObj = { ...formDataOrPayload, formstep: 'bulk_upload', formStep: 'bulk_upload' };
      return request('/vd_bulk_upload', {
        method: 'POST',
        body: JSON.stringify(bodyObj)
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
    },
    getGender: () => {
      return request('/adminUsers', {
        method: 'POST',
        body: JSON.stringify({ formStep: "getGender" }),
        expectArray: true
      });
    }
  },
  admins: {
    list: (params = {}) => {
      const payload = typeof params === 'object' ? params : { client_id: params, admin_id: params };
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "getAllAdmins",
          formStep: "getAllAdmins",
          ...payload
        }),
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
    toggleStatus: (userId, nextStatus, clientId = null) => {
      return request('/admins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "activeStatus",
          formStep: "activeStatus",
          user_id: userId,
          id: userId,
          status: nextStatus,
          client_id: clientId,
          admin_id: clientId
        }),
      });
    },
    deleteAdmin: (userId, clientId = null) => {
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "deleteAdmin",
          formStep: "deleteAdmin",
          user_id: userId,
          id: userId,
          client_id: clientId,
          admin_id: clientId
        }),
      });
    },
    delete: (userId, clientId = null) => {
      return request('/vdadmins', {
        method: 'POST',
        body: JSON.stringify({ 
          formstep: "deleteAdmin",
          formStep: "deleteAdmin",
          user_id: userId,
          id: userId,
          client_id: clientId,
          admin_id: clientId
        }),
      });
    }
  },
  videos: {
    list: (params = {}) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      if (isSuperAdmin) {
        const payload = {};
        if (params && (params.adminId !== undefined || params.client_id !== undefined)) {
          payload.client_id = params.adminId !== undefined ? params.adminId : params.client_id;
        }
        return request('/dashboard/super-admin', {
          method: 'POST',
          body: JSON.stringify({ formstep: "getAllVidoes", ...payload }),
          expectArray: true
        });
      }
      const payload = { formStep: "getAllVideos", formstep: "getAllVideos" };
      if (params && params.adminId) {
        payload.client_id = params.adminId;
        payload.admin_id = params.adminId;
        payload.assigned_admin = params.adminId;
      }
      return request('/vdadminVideos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getAssignedVideos: (params = {}) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const endpoint = isSuperAdmin ? '/dashboard/super-admin' : '/vdadminVideos';
      const payload = { formstep: "getAssignedVideos" };
      if (params && params.adminId) {
        payload.client_id = params.adminId;
        payload.admin_id = params.adminId;
        payload.assigned_admin = params.adminId;
      }
      return request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
      });
    },
    getMyVideos: (params = {}) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const endpoint = isSuperAdmin ? '/dashboard/super-admin' : '/vdadminVideos';
      const payload = { formstep: "getMyVideos" };
      if (params && params.adminId) {
        payload.client_id = params.adminId;
        payload.admin_id = params.adminId;
        payload.assigned_admin = params.adminId;
      }
      return request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
      });
    },
    getAssignedCourse: (params = {}) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const endpoint = isSuperAdmin ? '/dashboard/super-admin' : '/vdadminVideos';
      const payload = { formstep: "getAssignedCourse" };
      if (params && params.adminId) {
        payload.client_id = params.adminId;
        payload.admin_id = params.adminId;
        payload.assigned_admin = params.adminId;
      }
      return request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
      });
    },
    getMyCourse: (params = {}) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const endpoint = isSuperAdmin ? '/dashboard/super-admin' : '/vdadminVideos';
      const payload = { formstep: "getMyCourse" };
      if (params && params.adminId) {
        payload.client_id = params.adminId;
        payload.admin_id = params.adminId;
        payload.assigned_admin = params.adminId;
      }
      return request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
      });
    },
    getAthorAdmins: (params = {}) => {
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const endpoint = isSuperAdmin ? '/dashboard/super-admin' : '/vdadminVideos';
      return request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          formstep: "getAthorAdmins"
        }),
        expectArray: true
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
    uploadChunk: (formData, uploadId, chunkIndex) => {
      const query = (uploadId !== undefined && chunkIndex !== undefined)
        ? `?uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${encodeURIComponent(chunkIndex)}`
        : '';
      return uploadRequest(`/api/upload/chunk${query}`, {
        method: 'POST',
        headers: (uploadId !== undefined && chunkIndex !== undefined) ? {
          'X-Upload-Id': String(uploadId),
          'X-Chunk-Index': String(chunkIndex)
        } : {},
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
      return request('/vdcategories', {
        method: 'POST',
        body: JSON.stringify({
          formStep: "getSubCategory",
          formstep: "getSubCategory",
          category_id: categoryId,
          cat_id: categoryId,
          catId: categoryId
        }),
        expectArray: true
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
      const url = `${getBaseUrl()}/${isSuperAdmin ? 'vdSuperAdminVideos' : 'vdadminVideos'}`;
      const token = getAccessToken();
      const bodyObj = { ...payload };
      const step = bodyObj.formstep || bodyObj.formStep || 'uploadVideo';
      bodyObj.formstep = step;
      delete bodyObj.formStep;
      delete bodyObj.adminId;
      delete bodyObj.admin_id;
      delete bodyObj.assigned_admin;
      delete bodyObj.clientId;
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
      const user = getCurrentUser();
      const isSuperAdmin = user && user.role === 'super_admin';
      const endpoint = isSuperAdmin ? '/SuperAdminVideos' : '/adminVideos';
      const bodyObj = { ...payload };
      const step = bodyObj.formstep || bodyObj.formStep || (isSuperAdmin ? "uploadCourse" : "UploadCouse");
      bodyObj.formstep = step;
      bodyObj.formStep = step;
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

    getCourseDrafts: (adminId = null) => {
      const payload = { formstep: "getCourseDraft" };
      if (adminId !== null && adminId !== undefined && adminId !== '') {
        payload.admin_id = adminId;
      }
      return request('/vd_drafts', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
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
    list: (params = {}) => {
      const token = getAccessToken();
      const user = getCurrentUser();
      const userIdVal = user ? (user.id || user.admin_id || user.adminId || user.user_id) : null;
      const payload = {
        token: token || '',
        formstep: "getNotifications",
        formStep: "getNotifications"
      };
      if (userIdVal) {
        payload.user_id = userIdVal;
        payload.admin_id = userIdVal;
        payload.author_id = userIdVal;
        payload.id = userIdVal;
      }
      if (user && user.role) {
        payload.role = user.role;
        payload.user_role = user.role;
      }
      if (params && typeof params === 'object') {
        Object.assign(payload, params);
      }
      return request('/vdnotifications', {
        method: 'POST',
        body: JSON.stringify(payload),
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
  reports: {
    getAdminReport: (formstep = 'course_analytics', payload = {}) => {
      return request('/vdadmin/report', {
        method: 'POST',
        body: JSON.stringify({ formstep, ...payload }),
        expectArray: true
      });
    },
    getSuperAdminReport: (formstep = 'user_activity', payload = {}) => {
      const cleanPayload = { ...payload };
      delete cleanPayload.admin_id;
      delete cleanPayload.formStep;
      return request('/superadmin/report', {
        method: 'POST',
        body: JSON.stringify({ formstep, ...cleanPayload }),
        expectArray: true
      });
    },
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
  },
  drafts: {
    getCourseDrafts: (adminId = null) => {
      const payload = { formstep: "getCourseDraft" };
      if (adminId !== null && adminId !== undefined && adminId !== '') {
        payload.admin_id = adminId;
      }
      return request('/vd_drafts', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectArray: true
      });
    },
    deleteCourseDraft: (id) => {
      const payload = { formstep: "deleteDraft", formStep: "deleteDraft", id: String(id) };
      return request('/vd_drafts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  }
};
