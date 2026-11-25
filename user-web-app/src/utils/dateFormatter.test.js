import { formatDate, formatTime } from './dateFormatter';

describe('Universal Date Formatter utility tests', () => {
  test('formats ISO strings into human readable date and time', () => {
    const isoString = '2026-11-23T08:22:00.000Z';
    const formatted = formatDate(isoString);
    expect(formatted).toMatch(/^\d{2}\s+Nov\s+2026,\s+\d{2}:\d{2}\s+(AM|PM)$/);
  });

  test('formats date-only ISO strings into DD MMM YYYY', () => {
    const dateOnly = '2026-11-23';
    const formatted = formatDate(dateOnly);
    expect(formatted).toBe('23 Nov 2026');
  });

  test('preserves already pre-formatted backend date strings intact', () => {
    const backendPreformatted = '23 Nov 2026, 08:22 AM';
    const formatted = formatDate(backendPreformatted);
    expect(formatted).toBe('23 Nov 2026, 08:22 AM');
  });

  test('preserves already pre-formatted date without time', () => {
    const backendPreformatted = '10 Aug 2026';
    const formatted = formatDate(backendPreformatted);
    expect(formatted).toBe('10 Aug 2026');
  });

  test('handles numeric timestamps and timestamp strings', () => {
    const epoch = 1763886120000;
    const formatted = formatDate(epoch);
    expect(formatted).toMatch(/Nov\s+2025/);
  });

  test('safely falls back to N/A for null, undefined, empty or invalid values', () => {
    expect(formatDate(null)).toBe('N/A');
    expect(formatDate(undefined)).toBe('N/A');
    expect(formatDate('')).toBe('N/A');
    expect(formatDate('null')).toBe('N/A');
    expect(formatDate('N/A')).toBe('N/A');
  });

  test('formats quiz payload fields consistently with d.date, d.created_at, and d.submitted_at', () => {
    const quizItemWithIso = {
      quiz: 'Security Assessment',
      created_at: '2026-11-23T08:22:00.000Z'
    };
    const dateVal = formatDate(quizItemWithIso.date || quizItemWithIso.created_at || quizItemWithIso.submitted_at);
    expect(dateVal).toMatch(/^\d{2}\s+Nov\s+2026,\s+\d{2}:\d{2}\s+(AM|PM)$/);

    const quizItemWithPreformatted = {
      quiz: 'TypeScript Basics',
      date: '23 Nov 2026, 08:22 AM'
    };
    const dateVal2 = formatDate(quizItemWithPreformatted.date || quizItemWithPreformatted.created_at || quizItemWithPreformatted.submitted_at);
    expect(dateVal2).toBe('23 Nov 2026, 08:22 AM');
  });

  test('formatTime extracts formatted hour and minute with AM/PM', () => {
    const isoString = '2026-11-23T08:22:00.000Z';
    const timeVal = formatTime(isoString);
    expect(timeVal).toMatch(/^\d{2}:\d{2}\s+(AM|PM)$/);
  });
});
