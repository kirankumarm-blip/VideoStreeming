/**
 * roles.js - Centralized Role Constants and RBAC Utilities
 * 
 * SECURITY ARCHITECTURE NOTE:
 * Client-side role checks serve STRICTLY as UI / navigation hints (e.g., hiding or
 * showing menu items, choosing the initial dashboard route). They are NOT a security boundary.
 * All access control is enforced on the server: every privileged endpoint re-authorizes
 * the request using the cryptographically signed session token / cookie and database record.
 */

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  AUTHOR_ADMIN: 'author_admin',
  USER: 'user',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Administrator',
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.AUTHOR_ADMIN]: 'Author Administrator',
  [ROLES.USER]: 'Learner / End User',
});

/**
 * Normalizes raw role identifiers (numeric or string) into canonical ROLES.
 * @param {string|number|object} roleOrUser
 * @returns {string} One of ROLES.* or 'unknown'
 */
export const normalizeRole = (roleOrUser) => {
  if (!roleOrUser) return 'unknown';

  let rawRole = roleOrUser;
  if (typeof roleOrUser === 'object') {
    rawRole = roleOrUser.role ?? roleOrUser.role_id;
  }

  const str = String(rawRole ?? '').trim().toLowerCase();

  // Super Admin: 1, '1', 'super_admin', 'superadmin', 'super admin'
  if (str === '1' || str === 'super_admin' || str === 'superadmin' || str === 'super admin') {
    return ROLES.SUPER_ADMIN;
  }

  // Author Admin: 4, '4', 'author_admin', 'authoradmin', 'author admin'
  if (str === '4' || str === 'author_admin' || str === 'authoradmin' || str === 'author admin') {
    return ROLES.AUTHOR_ADMIN;
  }

  // Admin: 2, '2', 'admin', 'client_admin', 'clientadmin', 'client admin'
  if (str === '2' || str === 'admin' || str === 'client_admin' || str === 'clientadmin' || str === 'client admin') {
    return ROLES.ADMIN;
  }

  // Learner / End User: 3, '3', 'user', 'student', 'learner', 'end_user'
  if (str === '3' || str === 'user' || str === 'student' || str === 'learner' || str === 'end_user') {
    return ROLES.USER;
  }

  return str || 'unknown';
};

/**
 * Checks whether a given role is allowed to access an array of permitted roles.
 * Super Admin has access to all administrative views.
 *
 * @param {string|number|object} userOrRole - The user's role or user object
 * @param {string[]} allowedRoles - Array of permitted roles
 * @returns {boolean}
 */
export const hasPermission = (userOrRole, allowedRoles = []) => {
  if (!userOrRole || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return false;
  }

  const normalizedUserRole = normalizeRole(userOrRole);

  // End users and unauthenticated guests have no admin portal permissions
  if (normalizedUserRole === ROLES.USER || normalizedUserRole === 'unknown') {
    return false;
  }

  // Normalize allowed roles
  const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

  // Super Admin has universal access to all admin views
  if (normalizedUserRole === ROLES.SUPER_ADMIN) {
    return true;
  }

  return normalizedAllowed.includes(normalizedUserRole);
};
