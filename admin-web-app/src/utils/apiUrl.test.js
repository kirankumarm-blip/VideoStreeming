import { getApiBaseUrl, isApiBaseUrlConfigured } from './apiUrl';
import { getBaseUrl } from '../services/api';

describe('API URL Configuration and Runtime Overrides', () => {
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

  test('getApiBaseUrl reads from server_url or serverUrl in localStorage', () => {
    localStorage.setItem('server_url', 'http://localhost:5000/api');
    expect(getApiBaseUrl()).toBe('http://localhost:5000/api');
  });

  test('getApiBaseUrl falls back to environment variable when localStorage is empty', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://uat-02-admin-api.darpanx.com/webhook';
    expect(getApiBaseUrl()).toBe('https://uat-02-admin-api.darpanx.com/webhook');
  });

  test('getApiBaseUrl returns empty string when no config is provided', () => {
    delete process.env.REACT_APP_API_BASE_URL;
    delete process.env.VITE_API_BASE_URL;
    expect(getApiBaseUrl()).toBe('');
  });

  test('getBaseUrl always returns a valid base URL', () => {
    expect(getBaseUrl()).toBeTruthy();
    expect(isApiBaseUrlConfigured()).toBe(true);
  });
});
