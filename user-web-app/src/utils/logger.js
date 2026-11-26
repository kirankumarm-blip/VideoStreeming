/**
 * Production-ready logger with automatic sensitive data redaction.
 *
 * Rules:
 * 1. In production (NODE_ENV === 'production'), debug, log, and warn are suppressed by default.
 * 2. Tokens, passwords, secrets, authorization headers, and JWTs are automatically redacted.
 * 3. Incase of troubleshooting in UAT/Staging, debug logging can be activated with localStorage.setItem('ENABLE_DEBUG_LOGGER', 'true').
 */

const SENSITIVE_KEY_REGEX = /^(token|access_?token|refresh_?token|auth(orization)?|password|passwd|secret|otp|pin|credentials?|credit_?card|card_?number|cvv|jwt|private_?key)$/i;
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi;

/**
 * Redacts sensitive tokens, headers, and object keys recursively.
 */
export const sanitizeForLog = (item, depth = 0, seen = new WeakSet()) => {
  if (item === null || item === undefined) {
    return item;
  }

  if (typeof item === 'string') {
    let sanitized = item.replace(JWT_REGEX, '[REDACTED_JWT]');
    sanitized = sanitized.replace(BEARER_REGEX, 'Bearer [REDACTED]');
    return sanitized;
  }

  if (typeof item !== 'object') {
    return item;
  }

  // Handle Error instances
  if (item instanceof Error) {
    const sanitizedError = new Error(sanitizeForLog(item.message, depth + 1, seen));
    sanitizedError.name = item.name;
    if (item.stack) {
      sanitizedError.stack = sanitizeForLog(item.stack, depth + 1, seen);
    }
    return sanitizedError;
  }

  // Guard against circular references and deep recursion
  if (depth > 6 || seen.has(item)) {
    return '[Circular/MaxDepth]';
  }
  seen.add(item);

  if (Array.isArray(item)) {
    return item.map(entry => sanitizeForLog(entry, depth + 1, seen));
  }

  const sanitizedObj = {};
  for (const [key, val] of Object.entries(item)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Error)) {
        sanitizedObj[key] = sanitizeForLog(val, depth + 1, seen);
      } else {
        sanitizedObj[key] = '[REDACTED]';
      }
    } else {
      sanitizedObj[key] = sanitizeForLog(val, depth + 1, seen);
    }
  }

  return sanitizedObj;
};

const isProductionEnv = () => {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
};

const isDebugExplicitlyEnabled = () => {
  if (typeof window !== 'undefined') {
    if (window.__ENABLE_DEBUG_LOGGER__ === true) return true;
    try {
      if (window.localStorage?.getItem('ENABLE_DEBUG_LOGGER') === 'true') {
        return true;
      }
    } catch (_) {
      // localStorage may be restricted in some iframe / sandboxed modes
    }
  }
  return false;
};

export const shouldLog = (level) => {
  if (level === 'error') return true;
  if (!isProductionEnv()) return true;
  return isDebugExplicitlyEnabled();
};

export const logger = {
  debug: (...args) => {
    if (shouldLog('debug')) {
      const sanitized = args.map(arg => sanitizeForLog(arg));
      // Route debug to console.debug if available, else console.log
      const out = console.debug || console.log;
      out.apply(console, sanitized);
    }
  },

  log: (...args) => {
    if (shouldLog('log')) {
      const sanitized = args.map(arg => sanitizeForLog(arg));
      console.log.apply(console, sanitized);
    }
  },

  info: (...args) => {
    if (shouldLog('info')) {
      const sanitized = args.map(arg => sanitizeForLog(arg));
      console.info.apply(console, sanitized);
    }
  },

  warn: (...args) => {
    if (shouldLog('warn')) {
      const sanitized = args.map(arg => sanitizeForLog(arg));
      console.warn.apply(console, sanitized);
    }
  },

  error: (...args) => {
    if (shouldLog('error')) {
      const sanitized = args.map(arg => sanitizeForLog(arg));
      console.error.apply(console, sanitized);
    }
  }
};

export default logger;
