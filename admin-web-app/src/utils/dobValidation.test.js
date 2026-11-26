import { isValidDob, formatDobForSubmission } from './dateFormatter';

describe('Date of Birth (DOB) Validation & Timezone-Safe Formatting', () => {
  describe('1. isValidDob validation', () => {
    test('accepts valid YYYY-MM-DD date strings', () => {
      expect(isValidDob('1995-05-15')).toBe(true);
      expect(isValidDob('1988-12-31')).toBe(true);
      expect(isValidDob('2010-01-01')).toBe(true);
    });

    test('validates leap years correctly', () => {
      // 2000 was a leap year
      expect(isValidDob('2000-02-29')).toBe(true);
      // 2024 was a leap year
      expect(isValidDob('2024-02-29')).toBe(true);
      // 2023 was not a leap year
      expect(isValidDob('2023-02-29')).toBe(false);
      // 1900 was not a leap year (divisible by 100 but not 400)
      expect(isValidDob('1900-02-29')).toBe(false);
    });

    test('rejects non-existent calendar days for a given month', () => {
      expect(isValidDob('2023-02-30')).toBe(false);
      expect(isValidDob('2023-04-31')).toBe(false); // April has 30 days
      expect(isValidDob('2023-06-31')).toBe(false); // June has 30 days
      expect(isValidDob('2023-09-31')).toBe(false); // September has 30 days
      expect(isValidDob('2023-11-31')).toBe(false); // November has 30 days
      expect(isValidDob('2023-01-32')).toBe(false);
    });

    test('rejects invalid month numbers', () => {
      expect(isValidDob('2020-00-15')).toBe(false);
      expect(isValidDob('2020-13-15')).toBe(false);
    });

    test('rejects future dates', () => {
      const nextYear = new Date().getFullYear() + 1;
      expect(isValidDob(`${nextYear}-01-01`)).toBe(false);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      expect(isValidDob(tomorrowStr)).toBe(false);
    });

    test('rejects dates before 1900', () => {
      expect(isValidDob('1899-12-31')).toBe(false);
      expect(isValidDob('1800-05-15')).toBe(false);
    });

    test('handles malformed inputs safely without throwing RangeError', () => {
      expect(() => isValidDob('not-a-date')).not.toThrow();
      expect(isValidDob('not-a-date')).toBe(false);
      expect(isValidDob('2020/05/15')).toBe(false);
      expect(isValidDob('15-05-2020')).toBe(false);
      expect(isValidDob('2020-5-15')).toBe(false);
      expect(isValidDob('')).toBe(false);
      expect(isValidDob('   ')).toBe(false);
      expect(isValidDob(null)).toBe(false);
      expect(isValidDob(undefined)).toBe(false);
      expect(isValidDob(12345)).toBe(false);
      expect(isValidDob({})).toBe(false);
    });
  });

  describe('2. formatDobForSubmission formatting & timezone safety', () => {
    test('preserves exact YYYY-MM-DD string without timezone shifts', () => {
      const selectedDob = '1995-05-15';
      const formatted = formatDobForSubmission(selectedDob);
      
      // Must equal original YYYY-MM-DD string
      expect(formatted).toBe('1995-05-15');
      // Must NOT shift to previous day (which happened with toISOString() in IST/UTC+ offsets)
      expect(formatted).not.toBe('1995-05-14');
    });

    test('does not throw RangeError on malformed or incomplete dates and returns null', () => {
      // In the legacy code, `new Date("invalid").toISOString()` threw RangeError: Invalid time value
      expect(() => formatDobForSubmission('invalid-date')).not.toThrow();
      expect(formatDobForSubmission('invalid-date')).toBeNull();

      expect(() => formatDobForSubmission('2020-02-30')).not.toThrow();
      expect(formatDobForSubmission('2020-02-30')).toBeNull();
    });

    test('returns null for empty, null, or undefined inputs', () => {
      expect(formatDobForSubmission(null)).toBeNull();
      expect(formatDobForSubmission(undefined)).toBeNull();
      expect(formatDobForSubmission('')).toBeNull();
      expect(formatDobForSubmission('   ')).toBeNull();
    });

    test('safely extracts date from ISO string if valid without timezone shift', () => {
      expect(formatDobForSubmission('1990-08-20T00:00:00.000Z')).toBe('1990-08-20');
    });
  });
});
