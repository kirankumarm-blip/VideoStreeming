/**
 * Utility to format metric and KPI values safely.
 *
 * Rules:
 * - Display 0 when the actual metric is 0 (or "0").
 * - Display the formatted number when a valid finite number is provided.
 * - Display the unavailable indicator ('--') when data is null, undefined, NaN, empty, or cannot be fetched.
 * - Prevents demo or hardcoded values (like 5, 12, 18, 42) from being mistaken for real metrics.
 */

export const formatMetricValue = (value, options = {}) => {
  const {
    suffix = '',
    prefix = '',
    unavailable = '--',
    decimals = undefined
  } = options;

  if (value === null || value === undefined || value === '') {
    return unavailable;
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return unavailable;
  }

  const formattedNum = decimals !== undefined ? num.toFixed(decimals) : String(num);
  return `${prefix}${formattedNum}${suffix}`;
};

export const isMetricAvailable = (value) => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  const num = typeof value === 'number' ? value : Number(value);
  return !isNaN(num) && isFinite(num);
};

export const getMetricNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const num = typeof value === 'number' ? value : Number(value);
  return isNaN(num) || !isFinite(num) ? fallback : num;
};
