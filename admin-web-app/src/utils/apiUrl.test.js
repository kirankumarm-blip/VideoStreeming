import { getApiBaseUrl, isApiBaseUrlConfigured, validateApiConfiguration } from './apiUrl';
import { getBaseUrl } from '../services/api';

describe('API URL Configuration and Security Isolation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    localStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
    localStorage.clear();
  });

  test('Security: getApiBaseUrl strictly ignores server_url and serverUrl in localStorage', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://uat-02-admin-api.darpanx.com/webhook';
    localStorage.setItem('server_url', 'https://attacker-controlled.site/api');
    localStorage.setItem('serverUrl', 'https://attacker-controlled.site/api');

    expect(getApiBaseUrl()).toBe('https://uat-02-admin-api.darpanx.com/webhook');
    expect(getApiBaseUrl()).not.toContain('attacker-controlled');
  });

  test('Security: changing localStorage.server_url does not change the destination of API requests', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://uat-02-admin-api.darpanx.com/webhook';
    const beforeUrl = getBaseUrl();

    // Attacker or rogue script attempts to redirect API traffic via localStorage
    localStorage.setItem('server_url', 'https://malicious-gateway.evil.com/webhook');
    localStorage.setItem('serverUrl', 'https://malicious-gateway.evil.com/webhook');

    const afterUrl = getBaseUrl();
    expect(afterUrl).toBe(beforeUrl);
    expect(afterUrl).toBe('https://uat-02-admin-api.darpanx.com/webhook');
  });

  test('Reads REACT_APP_API_BASE_URL from environment', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://uat-02-admin-api.darpanx.com/webhook';
    expect(getApiBaseUrl()).toBe('https://uat-02-admin-api.darpanx.com/webhook');
  });

  test('Preserves required /webhook path prefix without duplicates or missing slashes', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://uat-02-admin-api.darpanx.com/webhook///';
    expect(getApiBaseUrl()).toBe('https://uat-02-admin-api.darpanx.com/webhook');
  });

  test('getApiBaseUrl returns empty string when no config is provided without crashing', () => {
    delete process.env.REACT_APP_API_BASE_URL;
    delete process.env.VITE_API_BASE_URL;
    expect(getApiBaseUrl()).toBe('');
  });

  test('getBaseUrl always returns a valid base URL', () => {
    expect(getBaseUrl()).toBeTruthy();
    expect(isApiBaseUrlConfigured()).toBe(true);
  });

  test('validateApiConfiguration enforces valid configuration in production', () => {
    delete process.env.REACT_APP_API_BASE_URL;
    delete process.env.VITE_API_BASE_URL;
    process.env.NODE_ENV = 'production';
    expect(() => validateApiConfiguration()).toThrow('[API Configuration Error]');
  });

  test('Direct UAT routing: always resolves directly to full configured remote API URL', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://uat-02-admin-api.darpanx.com/webhook';

    expect(getApiBaseUrl()).toBe('https://uat-02-admin-api.darpanx.com/webhook');
    expect(getBaseUrl()).toBe('https://uat-02-admin-api.darpanx.com/webhook');
  });
});
