import { clearTokens, isTokenExpired, parseJwtPayload, getCurrentUser, setCurrentUser, isValidToken, api } from './api';

describe('Auth and Route Protection Security Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('1. clearTokens functionality', () => {
    test('removes learner_user and lastUserActivity along with existing tokens and user data', () => {
      // Seed storage with all token, user, and session identifiers
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
      localStorage.setItem('learner_accessToken', 'mock-learner-access');
      localStorage.setItem('learner_refreshToken', 'mock-learner-refresh');
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'user' }));
      localStorage.setItem('learner_user', JSON.stringify({ id: 1, role: 'user', name: 'Learner' }));
      localStorage.setItem('lastUserActivity', '1700000000000');
      localStorage.setItem('admin_user', JSON.stringify({ id: 99, role: 'admin' }));
      localStorage.setItem('rememberedPassword', 'secret');

      sessionStorage.setItem('accessToken', 'mock-sess-access');
      sessionStorage.setItem('refreshToken', 'mock-sess-refresh');
      sessionStorage.setItem('learner_user', JSON.stringify({ id: 1 }));
      sessionStorage.setItem('user', JSON.stringify({ id: 1 }));
      sessionStorage.setItem('lastUserActivity', '1700000000000');
      sessionStorage.setItem('tempLoginData', 'temp');

      // Execute clearTokens
      clearTokens();

      // Assert learner_user and lastUserActivity are explicitly removed from both stores
      expect(localStorage.getItem('learner_user')).toBeNull();
      expect(localStorage.getItem('lastUserActivity')).toBeNull();
      expect(sessionStorage.getItem('learner_user')).toBeNull();
      expect(sessionStorage.getItem('lastUserActivity')).toBeNull();

      // Assert all tokens and user data are removed
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('learner_accessToken')).toBeNull();
      expect(localStorage.getItem('learner_refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('admin_user')).toBeNull();
      expect(sessionStorage.getItem('accessToken')).toBeNull();
      expect(sessionStorage.getItem('refreshToken')).toBeNull();
      expect(sessionStorage.getItem('tempLoginData')).toBeNull();
    });
  });

  describe('2. JWT Expiry and Token Validation', () => {
    // Helper to generate a test JWT string
    const createTestJwt = (payloadObj) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify(payloadObj));
      const sig = 'mockSignature';
      return `${header}.${payload}.${sig}`;
    };

    test('isTokenExpired returns true for null, empty or undefined tokens', () => {
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired(undefined)).toBe(true);
      expect(isTokenExpired('')).toBe(true);
      expect(isTokenExpired('   ')).toBe(true);
      expect(isTokenExpired('null')).toBe(true);
      expect(isTokenExpired('undefined')).toBe(true);
    });

    test('isTokenExpired returns true for expired JWT tokens', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const expiredJwt = createTestJwt({ id: 'u1', role: 'user', exp: pastExp });
      expect(isTokenExpired(expiredJwt)).toBe(true);
    });

    test('isTokenExpired returns false for active unexpired JWT tokens', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 7200; // 2 hours in future
      const activeJwt = createTestJwt({ id: 'u1', role: 'user', exp: futureExp });
      expect(isTokenExpired(activeJwt)).toBe(false);
    });

    test('parseJwtPayload correctly extracts token claims', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = createTestJwt({ id: 42, role: 'learner', email: 'test@example.com', exp });
      const payload = parseJwtPayload(token);
      expect(payload).not.toBeNull();
      expect(payload.id).toBe(42);
      expect(payload.role).toBe('learner');
      expect(payload.exp).toBe(exp);
    });
  });

  describe('3. Protected Route Security & getCurrentUser', () => {
    const createTestJwt = (payloadObj) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify(payloadObj));
      const sig = 'mockSignature';
      return `${header}.${payload}.${sig}`;
    };

    test('getCurrentUser returns null when token is expired even if user object exists', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const expiredToken = createTestJwt({ id: 'u1', exp: pastExp });
      localStorage.setItem('accessToken', expiredToken);
      localStorage.setItem('learner_user', JSON.stringify({ id: 'u1', role: 'user', name: 'Learner' }));

      // Token is expired -> user object cannot be trusted
      expect(getCurrentUser()).toBeNull();
    });

    test('getCurrentUser returns user when valid unexpired token exists', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const validToken = createTestJwt({ id: 'u1', exp: futureExp });
      localStorage.setItem('accessToken', validToken);
      localStorage.setItem('learner_user', JSON.stringify({ id: 'u1', role: 'user', name: 'Learner' }));

      const user = getCurrentUser();
      expect(user).not.toBeNull();
      expect(user.id).toBe('u1');
    });

    test('getCurrentUser returns null when token is missing', () => {
      localStorage.setItem('learner_user', JSON.stringify({ id: 'u1', role: 'user' }));
      expect(getCurrentUser()).toBeNull();
    });
  });

  describe('4. api.auth.me method exists', () => {
    test('api.auth.me is defined as a function for session verification on app load', () => {
      expect(typeof api.auth.me).toBe('function');
    });
  });
});
