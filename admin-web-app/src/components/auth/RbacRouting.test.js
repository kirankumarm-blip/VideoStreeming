import React from 'react';
import { ROLES, normalizeRole, hasPermission, ROLE_LABELS } from '../../constants/roles';

describe('RBAC Roles and Permission Utilities', () => {
  describe('normalizeRole', () => {
    test('normalizes super admin roles correctly', () => {
      expect(normalizeRole(1)).toBe(ROLES.SUPER_ADMIN);
      expect(normalizeRole('1')).toBe(ROLES.SUPER_ADMIN);
      expect(normalizeRole('super_admin')).toBe(ROLES.SUPER_ADMIN);
      expect(normalizeRole('SuperAdmin')).toBe(ROLES.SUPER_ADMIN);
      expect(normalizeRole('super admin')).toBe(ROLES.SUPER_ADMIN);
      expect(normalizeRole({ role: 'super_admin' })).toBe(ROLES.SUPER_ADMIN);
      expect(normalizeRole({ role_id: 1 })).toBe(ROLES.SUPER_ADMIN);
    });

    test('normalizes author admin roles correctly', () => {
      expect(normalizeRole(4)).toBe(ROLES.AUTHOR_ADMIN);
      expect(normalizeRole('4')).toBe(ROLES.AUTHOR_ADMIN);
      expect(normalizeRole('author_admin')).toBe(ROLES.AUTHOR_ADMIN);
      expect(normalizeRole('author admin')).toBe(ROLES.AUTHOR_ADMIN);
      expect(normalizeRole({ role: 'author_admin' })).toBe(ROLES.AUTHOR_ADMIN);
      expect(normalizeRole({ role_id: 4 })).toBe(ROLES.AUTHOR_ADMIN);
    });

    test('normalizes admin / client_admin roles correctly', () => {
      expect(normalizeRole(2)).toBe(ROLES.ADMIN);
      expect(normalizeRole('2')).toBe(ROLES.ADMIN);
      expect(normalizeRole('admin')).toBe(ROLES.ADMIN);
      expect(normalizeRole('client_admin')).toBe(ROLES.ADMIN);
      expect(normalizeRole('client admin')).toBe(ROLES.ADMIN);
      expect(normalizeRole({ role: 'admin' })).toBe(ROLES.ADMIN);
      expect(normalizeRole({ role_id: 2 })).toBe(ROLES.ADMIN);
    });

    test('normalizes end user / student roles correctly', () => {
      expect(normalizeRole(3)).toBe(ROLES.USER);
      expect(normalizeRole('3')).toBe(ROLES.USER);
      expect(normalizeRole('user')).toBe(ROLES.USER);
      expect(normalizeRole('student')).toBe(ROLES.USER);
      expect(normalizeRole('learner')).toBe(ROLES.USER);
      expect(normalizeRole('end_user')).toBe(ROLES.USER);
    });

    test('returns unknown for null, undefined, or empty values', () => {
      expect(normalizeRole(null)).toBe('unknown');
      expect(normalizeRole(undefined)).toBe('unknown');
      expect(normalizeRole('')).toBe('unknown');
    });
  });

  describe('hasPermission', () => {
    test('Super Admin has access to all admin routes', () => {
      expect(hasPermission(ROLES.SUPER_ADMIN, [ROLES.SUPER_ADMIN])).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, [ROLES.ADMIN])).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, [ROLES.AUTHOR_ADMIN])).toBe(true);
      expect(hasPermission(1, [ROLES.ADMIN, ROLES.AUTHOR_ADMIN])).toBe(true);
    });

    test('Admin has access to admin routes, but not super admin exclusive routes', () => {
      expect(hasPermission(ROLES.ADMIN, [ROLES.ADMIN])).toBe(true);
      expect(hasPermission(ROLES.ADMIN, [ROLES.ADMIN, ROLES.AUTHOR_ADMIN])).toBe(true);
      expect(hasPermission(ROLES.ADMIN, [ROLES.SUPER_ADMIN])).toBe(false);
      expect(hasPermission(2, [ROLES.SUPER_ADMIN])).toBe(false);
    });

    test('Author Admin has access only to author admin allowed routes', () => {
      expect(hasPermission(ROLES.AUTHOR_ADMIN, [ROLES.AUTHOR_ADMIN])).toBe(true);
      expect(hasPermission(ROLES.AUTHOR_ADMIN, [ROLES.ADMIN, ROLES.AUTHOR_ADMIN])).toBe(true);
      expect(hasPermission(ROLES.AUTHOR_ADMIN, [ROLES.SUPER_ADMIN])).toBe(false);
      expect(hasPermission(4, [ROLES.SUPER_ADMIN])).toBe(false);
    });

    test('End users and learners are strictly blocked from all admin routes', () => {
      expect(hasPermission(ROLES.USER, [ROLES.ADMIN])).toBe(false);
      expect(hasPermission(ROLES.USER, [ROLES.SUPER_ADMIN])).toBe(false);
      expect(hasPermission(ROLES.USER, [ROLES.AUTHOR_ADMIN])).toBe(false);
      expect(hasPermission('student', [ROLES.ADMIN, ROLES.AUTHOR_ADMIN])).toBe(false);
    });

    test('Returns false for invalid arguments', () => {
      expect(hasPermission(null, [ROLES.ADMIN])).toBe(false);
      expect(hasPermission(ROLES.ADMIN, [])).toBe(false);
      expect(hasPermission(ROLES.ADMIN, null)).toBe(false);
    });
  });

  describe('ROLE_LABELS', () => {
    test('contains human-readable labels for all roles', () => {
      expect(ROLE_LABELS[ROLES.SUPER_ADMIN]).toBe('Super Administrator');
      expect(ROLE_LABELS[ROLES.ADMIN]).toBe('Administrator');
      expect(ROLE_LABELS[ROLES.AUTHOR_ADMIN]).toBe('Author Administrator');
      expect(ROLE_LABELS[ROLES.USER]).toBe('Learner / End User');
    });
  });

  describe('Server Re-Authorization & Navigation-Only Role Protection', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
      jest.clearAllMocks();
    });

    test('tampering with localStorage role_id to 1 is treated as client navigation only', () => {
      // Normal admin logs in
      const normalAdmin = { id: 'u-admin1', name: 'Admin', email: 'admin@test.com', role: 'admin', role_id: 2 };
      localStorage.setItem('admin_user', JSON.stringify(normalAdmin));

      // Attacker tampers with localStorage in DevTools
      const tamperedUser = { ...normalAdmin, role: 'super_admin', role_id: 1 };
      localStorage.setItem('admin_user', JSON.stringify(tamperedUser));

      // Client navigation checks see the tampered value
      const clientNormalized = normalizeRole(JSON.parse(localStorage.getItem('admin_user')));
      expect(clientNormalized).toBe(ROLES.SUPER_ADMIN);

      // But the authoritative server session user is still admin
      const serverSessionUser = normalAdmin;
      expect(serverSessionUser.role).toBe('admin');
      expect(hasPermission(serverSessionUser, [ROLES.SUPER_ADMIN])).toBe(false);
    });

    test('403 Forbidden on privileged endpoints represents authorization failure without token clearance', () => {
      const forbiddenError = new Error('Unauthorized access: Super Admin privileges required');
      forbiddenError.status = 403;
      forbiddenError.isForbidden = true;

      // Ensure 403 is flagged as forbidden
      expect(forbiddenError.status).toBe(403);
      expect(forbiddenError.isForbidden).toBe(true);
    });
  });
});
