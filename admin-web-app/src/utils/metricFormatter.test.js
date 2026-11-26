import { formatMetricValue, isMetricAvailable, getMetricNumber } from './metricFormatter';
import fs from 'fs';
import path from 'path';

describe('Metric Formatter Utility', () => {
  describe('formatMetricValue', () => {
    test('displays 0 when the actual metric is 0', () => {
      expect(formatMetricValue(0)).toBe('0');
      expect(formatMetricValue('0')).toBe('0');
    });

    test('displays 0 with suffix when metric is 0', () => {
      expect(formatMetricValue(0, { suffix: ' hrs' })).toBe('0 hrs');
      expect(formatMetricValue(0, { suffix: '%' })).toBe('0%');
      expect(formatMetricValue(0, { suffix: ' ms' })).toBe('0 ms');
    });

    test('displays real positive metrics correctly', () => {
      expect(formatMetricValue(5)).toBe('5');
      expect(formatMetricValue(12)).toBe('12');
      expect(formatMetricValue(18)).toBe('18');
      expect(formatMetricValue(42, { suffix: ' hrs' })).toBe('42 hrs');
      expect(formatMetricValue(78, { suffix: '%' })).toBe('78%');
      expect(formatMetricValue(38, { suffix: ' ms' })).toBe('38 ms');
    });

    test('displays unavailable placeholder (default "--") when value is null or undefined', () => {
      expect(formatMetricValue(null)).toBe('--');
      expect(formatMetricValue(undefined)).toBe('--');
      expect(formatMetricValue(null, { suffix: ' hrs' })).toBe('--');
      expect(formatMetricValue(undefined, { suffix: ' hrs' })).toBe('--');
      expect(formatMetricValue(null, { suffix: '%' })).toBe('--');
    });

    test('displays unavailable placeholder when value is empty string, NaN, or non-finite', () => {
      expect(formatMetricValue('')).toBe('--');
      expect(formatMetricValue(NaN)).toBe('--');
      expect(formatMetricValue('not-a-number')).toBe('--');
      expect(formatMetricValue(Infinity)).toBe('--');
      expect(formatMetricValue(-Infinity)).toBe('--');
    });

    test('allows custom unavailable placeholder', () => {
      expect(formatMetricValue(null, { unavailable: 'N/A' })).toBe('N/A');
      expect(formatMetricValue(undefined, { unavailable: '—' })).toBe('—');
    });

    test('supports decimals option when formatting numbers', () => {
      expect(formatMetricValue(0.854, { decimals: 2, suffix: '%' })).toBe('0.85%');
      expect(formatMetricValue(0, { decimals: 1, suffix: ' hrs' })).toBe('0.0 hrs');
    });

    test('supports prefix option', () => {
      expect(formatMetricValue(150, { prefix: '$' })).toBe('$150');
      expect(formatMetricValue(0, { prefix: 'Total: ' })).toBe('Total: 0');
    });
  });

  describe('isMetricAvailable', () => {
    test('returns true for 0 and numeric values', () => {
      expect(isMetricAvailable(0)).toBe(true);
      expect(isMetricAvailable('0')).toBe(true);
      expect(isMetricAvailable(42)).toBe(true);
      expect(isMetricAvailable(-10)).toBe(true);
      expect(isMetricAvailable(3.14)).toBe(true);
    });

    test('returns false for missing, null, undefined, NaN, or invalid values', () => {
      expect(isMetricAvailable(null)).toBe(false);
      expect(isMetricAvailable(undefined)).toBe(false);
      expect(isMetricAvailable('')).toBe(false);
      expect(isMetricAvailable(NaN)).toBe(false);
      expect(isMetricAvailable('invalid')).toBe(false);
      expect(isMetricAvailable(Infinity)).toBe(false);
    });
  });

  describe('getMetricNumber', () => {
    test('returns the number when valid', () => {
      expect(getMetricNumber(0)).toBe(0);
      expect(getMetricNumber(42)).toBe(42);
      expect(getMetricNumber('28')).toBe(28);
    });

    test('returns the fallback when invalid or missing', () => {
      expect(getMetricNumber(null)).toBe(0);
      expect(getMetricNumber(undefined)).toBe(0);
      expect(getMetricNumber(undefined, 10)).toBe(10);
      expect(getMetricNumber(NaN, 5)).toBe(5);
    });
  });

  describe('Source Code Verification: No Invented Numbers in Admin Performance View', () => {
    test('SuperAdminDashboard.js does not contain hardcoded "|| 42", "|| 12", "|| 18", or "|| 5" fallbacks in performance metrics', () => {
      const superAdminCode = fs.readFileSync(
        path.resolve(__dirname, '../pages/SuperAdminDashboard.js'),
        'utf-8'
      );

      // Verify that invented numbers 5, 12, 18, 42 are NOT hardcoded fallbacks
      expect(superAdminCode).not.toMatch(/activeHours\s*\|\|\s*42/);
      expect(superAdminCode).not.toMatch(/issuesResolved\s*\|\|\s*12/);
      expect(superAdminCode).not.toMatch(/approvalsCount\s*\|\|\s*18/);
      expect(superAdminCode).not.toMatch(/uploadedBy === admin\.id\)\.length\s*\|\|\s*5/);

      // Verify server monitoring does not use hardcoded 28, 64, 85 fallbacks
      expect(superAdminCode).not.toMatch(/cpuUsage\s*\|\|\s*28/);
      expect(superAdminCode).not.toMatch(/ramUsage\s*\|\|\s*64/);
      expect(superAdminCode).not.toMatch(/storageUsage\s*\|\|\s*85/);
    });

    test('AdminDashboard.js does not contain hardcoded invented numbers in KPI metrics', () => {
      const adminCode = fs.readFileSync(
        path.resolve(__dirname, '../pages/AdminDashboard.js'),
        'utf-8'
      );

      expect(adminCode).not.toMatch(/dau\s*\|\|\s*87/);
      expect(adminCode).not.toMatch(/mau\s*\|\|\s*240/);
      expect(adminCode).not.toMatch(/retentionRate\s*\|\|\s*78/);
      expect(adminCode).not.toMatch(/likes\s*\|\|\s*154/);
      expect(adminCode).not.toMatch(/comments\s*\|\|\s*64/);
      expect(adminCode).not.toMatch(/shares\s*\|\|\s*102/);
      expect(adminCode).not.toMatch(/cdnPerformanceMs\s*\|\|\s*38/);
      expect(adminCode).not.toMatch(/bufferingRatioPercent\s*\|\|\s*0\.85/);
      expect(adminCode).not.toMatch(/activeUsers\s*\|\|\s*87/);
    });
  });
});
