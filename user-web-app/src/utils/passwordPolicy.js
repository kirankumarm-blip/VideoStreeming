/**
 * Unified Password Policy & Validation Utility
 * 
 * Enforces the approved password policy across:
 * - Signup
 * - Reset Password (Forgot Password)
 * - Change Password (User Profile)
 */

export const MIN_PASSWORD_LENGTH = 6;

export const PASSWORD_REQUIREMENTS = [
  {
    id: 'length',
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (pwd) => typeof pwd === 'string' && pwd.length >= MIN_PASSWORD_LENGTH
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter (A-Z)',
    test: (pwd) => typeof pwd === 'string' && /[A-Z]/.test(pwd)
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter (a-z)',
    test: (pwd) => typeof pwd === 'string' && /[a-z]/.test(pwd)
  },
  {
    id: 'number',
    label: 'At least one number (0-9)',
    test: (pwd) => typeof pwd === 'string' && /[0-9]/.test(pwd)
  },
  {
    id: 'special',
    label: 'At least one special character (!@#$%^&*...)',
    test: (pwd) => typeof pwd === 'string' && /[^A-Za-z0-9]/.test(pwd)
  }
];

/**
 * Validate password against all mandatory rules
 * @param {string} password - Raw password (exact, untrimmed)
 * @returns {object} Validation result
 */
export function validatePassword(password) {
  if (!password) {
    return {
      isValid: false,
      firstError: 'Please fill out password',
      errors: ['Password is required'],
      requirements: PASSWORD_REQUIREMENTS.map((r) => ({
        id: r.id,
        label: r.label,
        met: false
      }))
    };
  }

  const results = PASSWORD_REQUIREMENTS.map((req) => ({
    id: req.id,
    label: req.label,
    met: req.test(password)
  }));

  const unmet = results.filter((r) => !r.met);
  const isValid = unmet.length === 0;

  let firstError = '';
  if (unmet.length > 0) {
    if (unmet.some((r) => r.id === 'length')) {
      firstError = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
    } else if (unmet.some((r) => r.id === 'uppercase')) {
      firstError = 'Password must contain at least one uppercase letter (A-Z)';
    } else if (unmet.some((r) => r.id === 'lowercase')) {
      firstError = 'Password must contain at least one lowercase letter (a-z)';
    } else if (unmet.some((r) => r.id === 'number')) {
      firstError = 'Password must contain at least one number (0-9)';
    } else if (unmet.some((r) => r.id === 'special')) {
      firstError = 'Password must contain at least one special character (!@#$%^&*...)';
    }
  }

  return {
    isValid,
    firstError,
    errors: unmet.map((r) => r.label),
    requirements: results
  };
}

/**
 * Calculate password strength score and visual feedback
 * Separates strength evaluation from minimum acceptance requirements.
 * Ensures the meter NEVER implies a password meets requirements when validation will reject it.
 * 
 * @param {string} password - Raw password
 * @returns {object} Strength details { score, label, color, pct, isValid, requirements }
 */
export function calculatePasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: 'Empty',
      color: '#888888',
      pct: 0,
      isValid: false,
      requirements: PASSWORD_REQUIREMENTS.map((r) => ({
        id: r.id,
        label: r.label,
        met: false
      }))
    };
  }

  const validation = validatePassword(password);
  const metCount = validation.requirements.filter((r) => r.met).length;

  // If not all mandatory requirements are satisfied, the meter reflects incomplete state
  // and NEVER shows "Good" or "Strong" when validation would reject submission
  if (!validation.isValid) {
    // Weak (score 1-2, 20-35%) or Incomplete (score 3-4, 45-55%)
    const isVeryWeak = metCount <= 2;
    return {
      score: metCount,
      label: isVeryWeak ? 'Weak' : 'Incomplete',
      color: isVeryWeak ? '#ef4444' : '#f59e0b',
      pct: isVeryWeak ? 25 : 50,
      isValid: false,
      requirements: validation.requirements
    };
  }

  // All mandatory requirements are met! Score is evaluated by length and entropy
  const len = password.length;
  if (len >= 10) {
    return {
      score: 5,
      label: 'Very Strong',
      color: '#10b981',
      pct: 100,
      isValid: true,
      requirements: validation.requirements
    };
  } else if (len >= 8) {
    return {
      score: 4,
      label: 'Strong',
      color: '#10b981',
      pct: 85,
      isValid: true,
      requirements: validation.requirements
    };
  } else {
    // 6-7 characters meeting all character categories
    return {
      score: 3,
      label: 'Good',
      color: '#3b82f6',
      pct: 70,
      isValid: true,
      requirements: validation.requirements
    };
  }
}
