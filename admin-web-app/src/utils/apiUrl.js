/**
 * apiUrl.js - Centralized API URL and Polling Utility
 * Reads VITE_API_BASE_URL (Vite) and REACT_APP_API_BASE_URL (Webpack / CRA)
 * with support for exponential backoff and strict security isolation (no localStorage overrides).
 */

export const getApiBaseUrl = () => {
  let url = '';

  // 1. Check Vite environment variable
  try {
    // eslint-disable-next-line no-new-func
    const metaEnv = (new Function("try { return import.meta.env; } catch(e) { return null; }"))();
    if (metaEnv && (metaEnv.VITE_API_BASE_URL || metaEnv.REACT_APP_API_BASE_URL)) {
      url = metaEnv.VITE_API_BASE_URL || metaEnv.REACT_APP_API_BASE_URL || '';
    }
  } catch (e) {}

  // 2. Check Webpack / CRA direct compile-time substitution
  if (!url) {
    try {
      url = process.env.REACT_APP_API_BASE_URL || process.env.VITE_API_BASE_URL || '';
    } catch (e) {}
  }

  // 3. Check window runtime override if present (for test harnesses, not localStorage)
  if (!url && typeof window !== 'undefined') {
    url = window.__API_BASE_URL__ || window.VITE_API_BASE_URL || '';
  }

  return (url || '').trim().replace(/\/+$/, '');
};

/**
 * Validates whether an API base URL is available.
 * @returns {boolean}
 */
export const isApiBaseUrlConfigured = () => {
  return Boolean(getApiBaseUrl() || (typeof process !== 'undefined' && (process.env?.REACT_APP_API_BASE_URL || process.env?.REACT_APP_WEBHOOK_BASE_URL)));
};

/**
 * Validates that required API base URL configuration is present.
 * Fails with a clear configuration error if required configuration is missing in production.
 * @returns {boolean}
 */
export const validateApiConfiguration = () => {
  const url = getApiBaseUrl();
  if (!url && typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    const errorMsg = '[API Configuration Error] Required API base URL is missing. Please define REACT_APP_API_BASE_URL in your environment.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return true;
};

/**
 * Calculates next polling interval with exponential backoff and jitter:
 * - Normal success (0 failures): 10 seconds (10,000ms)
 * - 1st failure: 20 seconds + jitter
 * - 2nd failure: 40 seconds + jitter
 * - 3rd failure: 80 seconds + jitter
 * - 4th+ failures: max 120 seconds + jitter
 *
 * @param {number} failureCount - Consecutive failure count
 * @param {object} [options]
 * @param {boolean} [options.jitter=true] - Whether to add random jitter (0 to 1000ms)
 * @param {function} [options.randomFn=Math.random] - Random generator for deterministic testing
 * @returns {number} Delay in milliseconds
 */
export const calculateBackoffDelay = (failureCount, options = {}) => {
  const { jitter = true, randomFn = Math.random } = options;
  if (!failureCount || failureCount <= 0) {
    return 10000;
  }

  let baseDelay;
  switch (failureCount) {
    case 1:
      baseDelay = 20000;
      break;
    case 2:
      baseDelay = 40000;
      break;
    case 3:
      baseDelay = 80000;
      break;
    default:
      baseDelay = 120000;
      break;
  }

  const jitterMs = jitter ? Math.floor(randomFn() * 1000) : 0;
  return baseDelay + jitterMs;
};

export default getApiBaseUrl;
