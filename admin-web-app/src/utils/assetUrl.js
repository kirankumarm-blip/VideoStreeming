/**
 * assetUrl.js - Centralized Asset URL Utility
 * Resolves video thumbnails, avatars, resources, and video stream URLs
 * based on environment configuration (Vite & Webpack/CRA).
 */

export const getAssetBaseUrl = () => {
  let url = '';

  // 1. Check Vite environment variable (using safe dynamic evaluation to avoid Webpack/Node parse error)
  try {
    // eslint-disable-next-line no-new-func
    const metaEnv = (new Function("try { return import.meta.env; } catch(e) { return null; }"))();
    if (metaEnv && (metaEnv.VITE_ASSET_BASE_URL || metaEnv.REACT_APP_ASSET_BASE_URL)) {
      url = metaEnv.VITE_ASSET_BASE_URL || metaEnv.REACT_APP_ASSET_BASE_URL || '';
    }
  } catch (e) {}

  // 2. Check Webpack / CRA / Node environment variable
  if (!url) {
    try {
      if (typeof process !== 'undefined' && process && process.env) {
        url = process.env.REACT_APP_ASSET_BASE_URL || process.env.VITE_ASSET_BASE_URL || '';
      }
    } catch (e) {}
  }

  // 3. Check window runtime override if present
  if (!url && typeof window !== 'undefined') {
    url = window.__ASSET_BASE_URL__ || window.VITE_ASSET_BASE_URL || '';
  }

  return (url || '').trim().replace(/\/+$/, '');
};

/**
 * Transforms an asset path into a fully qualified environment-based URL.
 * - Preserves absolute HTTP/HTTPS URLs.
 * - Preserves blob: and data: URLs.
 * - Handles relative paths and avoids duplicate slashes.
 * - Preserves query parameters.
 * - Rejects unsupported URI schemes (e.g. javascript:, ftp:).
 * - Avoids hardcoded localhost fallbacks.
 *
 * @param {string} path - The asset path, relative or absolute.
 * @param {string} [fallbackUrl=''] - Optional fallback URL when path is empty or invalid.
 * @returns {string} - The resolved asset URL or fallback.
 */
export const getAssetUrl = (path, fallbackUrl = '') => {
  if (!path || typeof path !== 'string' || !path.trim()) {
    return fallbackUrl;
  }

  const trimmed = path.trim();

  // Preserve valid absolute HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Preserve valid blob: and data: URLs
  if (/^(blob:|data:)/i.test(trimmed)) {
    return trimmed;
  }

  // Reject unsupported / dangerous URL schemes (e.g. javascript:, file:, ftp:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallbackUrl;
  }

  const baseUrl = getAssetBaseUrl();
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (!baseUrl) {
    // If no asset base URL is configured in environment, return relative path
    return cleanPath;
  }

  return `${baseUrl}${cleanPath}`;
};

export default getAssetUrl;
