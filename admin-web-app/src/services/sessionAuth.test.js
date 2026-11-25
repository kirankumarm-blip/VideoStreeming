import {
  isSessionExpired,
  setSessionData,
  clearTokens,
  getCurrentUser,
  getAccessToken,
  getRefreshToken
} from './api';

describe('Admin Session Security & Expiry Management', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('isSessionExpired returns true when no expiry timestamp exists', () => {
    expect(isSessionExpired()).toBe(true);
  });

  test('isSessionExpired returns true when expiry timestamp is in the past', () => {
    sessionStorage.setItem('admin_session_expires_at', (Date.now() - 5000).toString());
    expect(isSessionExpired()).toBe(true);
  });

  test('isSessionExpired returns false when expiry timestamp is in the future', () => {
    sessionStorage.setItem('admin_session_expires_at', (Date.now() + 3600000).toString());
    expect(isSessionExpired()).toBe(false);
  });

  test('setSessionData stores user and expiry in session and local storage', () => {
    const adminUser = {
      id: 'a1',
      name: 'Super Admin',
      email: 'admin@example.com',
      role: 'super_admin'
    };
    const futureExpiry = Date.now() + 3600000;
    setSessionData(adminUser, futureExpiry);

    // Verify session data
    expect(isSessionExpired()).toBe(false);
    expect(getCurrentUser()).toEqual(adminUser);

    // Verify user profile is saved in localStorage for persistent route guarding
    expect(localStorage.getItem('admin_user')).toEqual(JSON.stringify(adminUser));

    // Verify token getters return null when tokens were not passed
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  test('setSessionData with tokens stores tokens in memory, session storage, and local storage', () => {
    const adminUser = {
      id: 'a1',
      name: 'Super Admin',
      email: 'admin@example.com',
      role: 'super_admin'
    };
    const futureExpiry = Date.now() + 3600000;
    setSessionData(adminUser, futureExpiry, {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token'
    });

    expect(isSessionExpired()).toBe(false);
    expect(getCurrentUser()).toEqual(adminUser);
    expect(getAccessToken()).toBe('test-access-token');
    expect(getRefreshToken()).toBe('test-refresh-token');

    // Tokens are safely available for authorized API calls
    expect(localStorage.getItem('admin_accessToken')).toBe('test-access-token');
    expect(localStorage.getItem('admin_refreshToken')).toBe('test-refresh-token');
    expect(localStorage.getItem('accessToken')).toBe('test-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token');
    expect(localStorage.getItem('admin_user')).toEqual(JSON.stringify(adminUser));
  });

  test('getCurrentUser returns null if session is expired even if user was previously stored', () => {
    const adminUser = { id: 'a2', name: 'Admin', email: 'admin2@test.com', role: 'admin' };
    sessionStorage.setItem('admin_session_user', JSON.stringify(adminUser));
    sessionStorage.setItem('admin_session_expires_at', (Date.now() - 1000).toString());

    expect(isSessionExpired()).toBe(true);
    expect(getCurrentUser()).toBeNull();
  });

  test('clearTokens completely cleans up session and local keys, and triggers cookie logout', () => {
    const adminUser = { id: 'a3', name: 'Admin', email: 'admin3@test.com', role: 'admin' };
    setSessionData(adminUser, Date.now() + 3600000);

    // Set local backend environment and dummy legacy tokens
    const prevApiBase = process.env.REACT_APP_API_BASE_URL;
    const prevWebhook = process.env.REACT_APP_WEBHOOK_BASE_URL;
    delete process.env.REACT_APP_WEBHOOK_BASE_URL;
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:5000';
    localStorage.setItem('server_url', 'http://localhost:5000');
    localStorage.setItem('serverUrl', 'http://localhost:5000');
    localStorage.setItem('admin_accessToken', 'dummy-token');
    localStorage.setItem('admin_refreshToken', 'dummy-refresh');

    const originalFetch = global.fetch;
    const mockFetch = jest.fn().mockImplementation(() => Promise.resolve({ ok: true }));
    global.fetch = mockFetch;

    try {
      clearTokens();

      expect(isSessionExpired()).toBe(true);
      expect(getCurrentUser()).toBeNull();
      expect(localStorage.getItem('admin_accessToken')).toBeNull();
      expect(localStorage.getItem('admin_refreshToken')).toBeNull();
      expect(localStorage.getItem('server_url')).toBeNull();
      expect(localStorage.getItem('serverUrl')).toBeNull();
      expect(sessionStorage.getItem('admin_session_user')).toBeNull();
      expect(sessionStorage.getItem('admin_session_expires_at')).toBeNull();

      // Ensure logout fetch was called with credentials: 'include'
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      );
    } finally {
      global.fetch = originalFetch;
      if (prevApiBase !== undefined) {
        process.env.REACT_APP_API_BASE_URL = prevApiBase;
      } else {
        delete process.env.REACT_APP_API_BASE_URL;
      }
      if (prevWebhook !== undefined) {
        process.env.REACT_APP_WEBHOOK_BASE_URL = prevWebhook;
      } else {
        delete process.env.REACT_APP_WEBHOOK_BASE_URL;
      }
    }
  });
});
