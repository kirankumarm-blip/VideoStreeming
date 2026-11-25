import { getApiBaseUrl, isApiBaseUrlConfigured, validateApiConfiguration } from './apiUrl';
import { getBaseUrl } from '../services/api';

describe('user-web-app: API URL Configuration and Security Isolation', () => {
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
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:5000';
    localStorage.setItem('server_url', 'https://attacker-controlled.site/api');
    localStorage.setItem('serverUrl', 'https://attacker-controlled.site/api');

    expect(getApiBaseUrl()).toBe('http://localhost:5000');
    expect(getApiBaseUrl()).not.toContain('attacker-controlled');
  });

  test('Security: changing localStorage.server_url does not change the destination of webhook or REST API requests', () => {
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:5000';
    process.env.REACT_APP_WEBHOOK_BASE_URL = 'https://uat-02-admin-api.darpanx.com/webhook';

    const beforeRestUrl = getApiBaseUrl();
    const beforeWebhookUrl = getBaseUrl();

    // Attacker attempts to override API via localStorage injection
    localStorage.setItem('server_url', 'https://rogue-api.hacker.io');
    localStorage.setItem('serverUrl', 'https://rogue-api.hacker.io');

    const afterRestUrl = getApiBaseUrl();
    const afterWebhookUrl = getBaseUrl();

    expect(afterRestUrl).toBe(beforeRestUrl);
    expect(afterRestUrl).toBe('http://localhost:5000');

    expect(afterWebhookUrl).toBe(beforeWebhookUrl);
    expect(afterWebhookUrl).toBe('https://uat-02-admin-api.darpanx.com/webhook');
  });

  test('Preserves required path prefixes without duplicate slashes', () => {
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:5000///';
    expect(getApiBaseUrl()).toBe('http://localhost:5000');
  });

  test('Returns empty string when no config is provided without crashing', () => {
    delete process.env.REACT_APP_API_BASE_URL;
    delete process.env.VITE_API_BASE_URL;
    expect(getApiBaseUrl()).toBe('');
  });

  test('getBaseUrl always returns a valid webhook base URL', () => {
    expect(getBaseUrl()).toBeTruthy();
    expect(getBaseUrl()).toContain('/webhook');
  });

  test('validateApiConfiguration enforces valid configuration in production', () => {
    delete process.env.REACT_APP_API_BASE_URL;
    delete process.env.VITE_API_BASE_URL;
    process.env.NODE_ENV = 'production';
    expect(() => validateApiConfiguration()).toThrow('[API Configuration Error]');
  });

  test('Direct UAT routing: always resolves directly to full configured remote API URL', () => {
    process.env.REACT_APP_WEBHOOK_BASE_URL = 'https://uat-02-admin-api.darpanx.com/webhook';

    expect(getBaseUrl()).toBe('https://uat-02-admin-api.darpanx.com/webhook');
  });
});
