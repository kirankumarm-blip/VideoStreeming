import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth, normalizeRole, normalizePlan } from './AuthContext';

// Helper component that consumes useAuth
const TestConsumer = () => {
  const { user, isAuthenticated, plan, theme, login, logout, updateUser, updatePlan, setTheme } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-name">{user?.name || 'no-user'}</div>
      <div data-testid="user-plan">{plan}</div>
      <div data-testid="user-bio">{user?.bio || 'no-bio'}</div>
      <div data-testid="current-theme">{theme}</div>
      <button 
        data-testid="login-btn" 
        onClick={() => login(
          { id: 'u123', name: 'Learner User', email: 'learner@xlurn.com', role: 'user', user_plan: '1' },
          { accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }
        )}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
      <button 
        data-testid="update-profile-btn" 
        onClick={() => updateUser({ name: 'Updated Learner', bio: 'Passionate student' })}
      >
        Update Profile
      </button>
      <button 
        data-testid="upgrade-plan-btn" 
        onClick={() => updatePlan({ plan_id: '3', plan_name: 'premium' })}
      >
        Upgrade Plan
      </button>
      <button 
        data-testid="toggle-theme-btn" 
        onClick={() => setTheme('light')}
      >
        Toggle Theme
      </button>
    </div>
  );
};

describe('AuthContext and AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('normalizes role and plan correctly', () => {
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole({ role: 'admin' })).toBe('admin');
    expect(normalizeRole({ role: 'super_admin' })).toBe('super_admin');
    expect(normalizeRole({ role: 'author_admin' })).toBe('author_admin');
    expect(normalizeRole({ role: 'user' })).toBe('user');
    expect(normalizeRole({ role: 'student' })).toBe('user');

    expect(normalizePlan(null)).toBe('1');
    expect(normalizePlan({ user_plan: '2' })).toBe('2');
    expect(normalizePlan({ user_plan_id: 3 })).toBe('3');
    expect(normalizePlan({})).toBe('1');
  });

  test('throws error when useAuth is used outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    consoleError.mockRestore();
  });

  test('provides initial unauthenticated state when storage is empty', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('no-user');
    expect(screen.getByTestId('user-plan').textContent).toBe('1');
  });

  test('login updates authentication state, user, tokens and plan reactively', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');

    act(() => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('Learner User');
    expect(screen.getByTestId('user-plan').textContent).toBe('1');

    // Storage should also be updated
    expect(localStorage.getItem('accessToken')).toBe('test-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    expect(storedUser.name).toBe('Learner User');
  });

  test('updateUser updates user state reactively and persists changes', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('user-name').textContent).toBe('Learner User');
    expect(screen.getByTestId('user-bio').textContent).toBe('no-bio');

    act(() => {
      screen.getByTestId('update-profile-btn').click();
    });

    // Components immediately reflect updated profile without reload
    expect(screen.getByTestId('user-name').textContent).toBe('Updated Learner');
    expect(screen.getByTestId('user-bio').textContent).toBe('Passionate student');

    // Storage is kept in sync
    const storedUser = JSON.parse(localStorage.getItem('user'));
    expect(storedUser.name).toBe('Updated Learner');
    expect(storedUser.bio).toBe('Passionate student');
  });

  test('updatePlan upgrades plan reactively and persists plan across reloads', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('user-plan').textContent).toBe('1');

    act(() => {
      screen.getByTestId('upgrade-plan-btn').click();
    });

    // Plan is updated reactively in state
    expect(screen.getByTestId('user-plan').textContent).toBe('3');

    // Persisted to storage so upgrade does not disappear on reload
    expect(localStorage.getItem('user_plan')).toBe('3');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    expect(storedUser.user_plan).toBe('3');
    expect(storedUser.plan_name).toBe('premium');
  });

  test('logout clears user, tokens and resets state to unauthenticated', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('login-btn').click();
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');

    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('no-user');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  test('setTheme updates theme reactively and persists to storage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('toggle-theme-btn').click();
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
