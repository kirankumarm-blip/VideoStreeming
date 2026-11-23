import React from 'react';
import App from './App';
import { isSessionExpired, getCurrentUser } from './services/api';

describe('App Component and Authentication Guards', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('App component is defined and exports correctly', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  test('Expired session prevents access and is caught by session guards', () => {
    sessionStorage.setItem('admin_session_expires_at', (Date.now() - 1000).toString());
    expect(isSessionExpired()).toBe(true);
    expect(getCurrentUser()).toBeNull();
  });

  test('Active session is recognized by session guards', () => {
    sessionStorage.setItem('admin_session_expires_at', (Date.now() + 3600000).toString());
    sessionStorage.setItem('admin_session_user', JSON.stringify({ id: '1', role: 'admin' }));
    expect(isSessionExpired()).toBe(false);
    expect(getCurrentUser()).toEqual({ id: '1', role: 'admin' });
  });
});
