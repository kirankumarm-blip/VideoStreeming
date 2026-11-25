/**
 * Single source of truth for User Status definitions, badges, labels, and colors.
 */

export const USER_STATUS_CONFIG = {
  active: {
    key: 'active',
    label: 'Active',
    className: 'badge-active',
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.15)',
    style: { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }
  },
  inactive: {
    key: 'inactive',
    label: 'Inactive',
    className: 'badge-disabled',
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.15)',
    style: { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
  },
  disabled: {
    key: 'disabled',
    label: 'Disabled',
    className: 'badge-disabled',
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.15)',
    style: { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
  },
  blocked: {
    key: 'blocked',
    label: 'Blocked',
    className: 'badge-disabled',
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.15)',
    style: { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
  },
  pending: {
    key: 'pending',
    label: 'Pending',
    className: 'badge-pending',
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.15)',
    style: { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }
  },
  unknown: {
    key: 'unknown',
    label: 'Unknown',
    className: 'badge-unknown',
    color: '#6b7280',
    background: 'rgba(107, 114, 128, 0.15)',
    style: { background: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' }
  }
};

export const USER_STATUS_MAP = USER_STATUS_CONFIG;

/**
 * Resolves a raw status value through multiple condition checks to its canonical configuration.
 * Missing, null, undefined, or unrecognised statuses return the 'unknown' configuration.
 *
 * @param {any} rawStatus
 * @returns {typeof USER_STATUS_CONFIG[keyof typeof USER_STATUS_CONFIG]}
 */
export const getUserStatusConfig = (rawStatus) => {
  // 1. Missing, null, or undefined status
  if (rawStatus === undefined || rawStatus === null) {
    return USER_STATUS_CONFIG.unknown;
  }

  // 2. Boolean checks
  if (typeof rawStatus === 'boolean') {
    return rawStatus ? USER_STATUS_CONFIG.active : USER_STATUS_CONFIG.inactive;
  }

  // 3. Numeric checks
  if (typeof rawStatus === 'number') {
    if (rawStatus === 1) return USER_STATUS_CONFIG.active;
    if (rawStatus === 0) return USER_STATUS_CONFIG.inactive;
    return USER_STATUS_CONFIG.unknown;
  }

  // 4. String checks
  if (typeof rawStatus === 'string') {
    const trimmed = rawStatus.trim().toLowerCase();
    if (!trimmed) {
      return USER_STATUS_CONFIG.unknown;
    }

    if (trimmed === 'active' || trimmed === 'true' || trimmed === '1' || trimmed === 'enabled') {
      return USER_STATUS_CONFIG.active;
    }

    if (trimmed === 'blocked' || trimmed === 'is_blocked' || trimmed === 'block') {
      return USER_STATUS_CONFIG.blocked;
    }

    if (trimmed === 'inactive' || trimmed === 'false' || trimmed === '0') {
      return USER_STATUS_CONFIG.inactive;
    }

    if (trimmed === 'disabled') {
      return USER_STATUS_CONFIG.disabled;
    }

    if (trimmed === 'pending') {
      return USER_STATUS_CONFIG.pending;
    }
  }

  // 5. Unrecognised / unexpected value
  return USER_STATUS_CONFIG.unknown;
};

export const resolveUserStatus = getUserStatusConfig;
