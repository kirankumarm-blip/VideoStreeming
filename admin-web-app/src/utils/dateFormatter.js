/**
 * Universal Date & Time Formatter
 * Converts ISO 8601 strings, UNIX timestamps, SQL datetimes, or Date objects
 * into clean, consistent, human-readable date strings (e.g. "23 Nov 2026, 08:22 AM").
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(input, options = {}) {
  if (!input || input === 'N/A' || input === 'null' || input === 'undefined' || input === 'None') {
    return 'N/A';
  }

  // If already formatted like "23 Nov 2026, 08:22 AM" or "23 Nov 2026"
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}(,\s+\d{1,2}:\d{2}(\s*(AM|PM))?)?$/i.test(trimmed)) {
      return trimmed;
    }
  }

  let d;
  if (input instanceof Date) {
    d = input;
  } else if (typeof input === 'number') {
    d = new Date(input);
  } else if (typeof input === 'string') {
    const num = Number(input);
    if (!isNaN(num) && input.length >= 10 && !input.includes('-') && !input.includes('/') && !input.includes(':')) {
      d = new Date(num);
    } else {
      d = new Date(input);
    }
  }

  if (!d || isNaN(d.getTime())) {
    return String(input || 'N/A');
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();

  const isDateOnly = options.dateOnly || (
    typeof input === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.trim())
  );

  if (isDateOnly) {
    return `${day} ${month} ${year}`;
  }

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm}`;
}

export function formatTime(input) {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Validates that dobStr is in valid YYYY-MM-DD format,
 * represents a real calendar date (e.g. not Feb 30),
 * year is between 1900 and current year, and is not in the future.
 */
export function isValidDob(dobStr) {
  try {
    if (!dobStr || typeof dobStr !== 'string') return false;
    const trimmed = dobStr.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    if (!match) return false;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (year < 1900) return false;
    const now = new Date();
    if (year > now.getFullYear()) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    const dateObj = new Date(year, month - 1, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateObj > today) return false;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Returns original YYYY-MM-DD string without timezone conversion,
 * or null if invalid / empty.
 */
export function formatDobForSubmission(rawDob) {
  if (!rawDob) return null;
  const str = String(rawDob).trim();
  const dateOnly = str.includes('T') ? str.split('T')[0] : str;
  if (!isValidDob(dateOnly)) return null;
  return dateOnly;
}

export default formatDate;
