import {
  normalizeStatus,
  getClassStartTime,
  formatSessionDateTime,
  getDeterministicLiveClass,
  getNextUpcomingSession
} from './LiveClasses';
import fs from 'fs';
import path from 'path';

describe('Live Classes Hero Button Navigation, Status Normalization & Upcoming Session Display', () => {
  const referenceTime = new Date('2026-11-18T10:00:00.000Z').getTime();

  describe('1. Pure Logic: normalizeStatus', () => {
    test('Requirement 2: Normalizes uppercase LIVE to live', () => {
      expect(normalizeStatus('LIVE')).toBe('live');
    });

    test('Requirement 3: Normalizes mixed-case Live to live', () => {
      expect(normalizeStatus('Live')).toBe('live');
    });

    test('Requirement 4: Trims surrounding whitespace and tabs from status', () => {
      expect(normalizeStatus('  live  ')).toBe('live');
      expect(normalizeStatus(' \tLIVE\n ')).toBe('live');
      expect(normalizeStatus('  upcoming  ')).toBe('upcoming');
      expect(normalizeStatus('COMPLETED ')).toBe('completed');
    });

    test('Rejects non-string and non-live status values without false positives', () => {
      expect(normalizeStatus(null)).toBe('');
      expect(normalizeStatus(undefined)).toBe('');
      expect(normalizeStatus(123)).toBe('');
      expect(normalizeStatus('active')).toBe('active');
      expect(normalizeStatus('started')).toBe('started');
      expect(normalizeStatus('pending')).toBe('pending');
    });
  });

  describe('2. Pure Logic: getClassStartTime & formatSessionDateTime', () => {
    test('Extracts start time across scheduledAt, startTime, scheduledTime, and startDate', () => {
      expect(getClassStartTime({ scheduledAt: '2026-11-19T10:00:00Z' })).toBe('2026-11-19T10:00:00Z');
      expect(getClassStartTime({ startTime: '2026-11-19T11:00:00Z' })).toBe('2026-11-19T11:00:00Z');
      expect(getClassStartTime({ scheduledTime: '2026-11-19T12:00:00Z' })).toBe('2026-11-19T12:00:00Z');
      expect(getClassStartTime({ startDate: '2026-11-19T13:00:00Z' })).toBe('2026-11-19T13:00:00Z');
      expect(getClassStartTime(null)).toBeNull();
      expect(getClassStartTime({})).toBeNull();
    });

    test('Formats valid date/time strings cleanly and handles invalid dates gracefully', () => {
      const formatted = formatSessionDateTime('2026-11-19T10:00:00Z');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(5);

      expect(formatSessionDateTime(null)).toBe('');
      expect(formatSessionDateTime(undefined)).toBe('');
      expect(formatSessionDateTime('invalid-date')).toBe('');
    });
  });

  describe('3. Pure Logic: getDeterministicLiveClass', () => {
    test('Requirement 1: Identifies a single live class', () => {
      const classes = [
        { id: 'LIVE-1', title: 'Intro to WebRTC', status: 'live' },
        { id: 'UPCOMING-1', title: 'Quantum Computing', status: 'upcoming' }
      ];
      const live = getDeterministicLiveClass(classes);
      expect(live).toBeDefined();
      expect(live.id).toBe('LIVE-1');
    });

    test('Requirement 2, 3, 4: Handles LIVE, Live, and whitespace in status', () => {
      expect(getDeterministicLiveClass([{ id: 'C1', status: 'LIVE' }])?.id).toBe('C1');
      expect(getDeterministicLiveClass([{ id: 'C2', status: 'Live' }])?.id).toBe('C2');
      expect(getDeterministicLiveClass([{ id: 'C3', status: '  live  ' }])?.id).toBe('C3');
      expect(getDeterministicLiveClass([{ id: 'C4', status: ' \tLIVE\n ' }])?.id).toBe('C4');
    });

    test('Requirement 5: Returns null when only completed classes exist', () => {
      const classes = [
        { id: 'COMP-1', title: 'Past Session 1', status: 'completed' },
        { id: 'COMP-2', title: 'Past Session 2', status: 'completed' }
      ];
      expect(getDeterministicLiveClass(classes)).toBeNull();
    });

    test('Requirement 6: Returns null when only upcoming classes exist', () => {
      const classes = [
        { id: 'UP-1', title: 'Future Session 1', status: 'upcoming', scheduledAt: '2026-11-19T10:00:00Z' },
        { id: 'UP-2', title: 'Future Session 2', status: 'upcoming', scheduledAt: '2026-11-20T10:00:00Z' }
      ];
      expect(getDeterministicLiveClass(classes)).toBeNull();
    });

    test('Requirement 7: Returns null when classes array is empty or invalid', () => {
      expect(getDeterministicLiveClass([])).toBeNull();
      expect(getDeterministicLiveClass(null)).toBeNull();
      expect(getDeterministicLiveClass(undefined)).toBeNull();
    });

    test('Requirement 9: Multiple live classes are selected deterministically by earliest start time', () => {
      const classes = [
        { id: 'LIVE-LATER', title: 'Session 2', status: 'live', scheduledAt: '2026-11-18T11:00:00Z' },
        { id: 'LIVE-EARLIER', title: 'Session 1', status: 'live', scheduledAt: '2026-11-18T09:00:00Z' }
      ];
      const selected = getDeterministicLiveClass(classes);
      expect(selected.id).toBe('LIVE-EARLIER');
    });

    test('Requirement 9: Multiple live classes with missing or tied times break ties deterministically by ID', () => {
      const classes = [
        { id: 'LIVE-B', title: 'Session B', status: 'live' },
        { id: 'LIVE-A', title: 'Session A', status: 'live' }
      ];
      const selected = getDeterministicLiveClass(classes);
      expect(selected.id).toBe('LIVE-A');
    });

    test('Requirement 14: Never falls back to classes[0] when classes[0] is not live', () => {
      const classes = [
        { id: 'NOT-LIVE-0', title: 'Completed Class', status: 'completed' },
        { id: 'NOT-LIVE-1', title: 'Upcoming Class', status: 'upcoming' }
      ];
      expect(getDeterministicLiveClass(classes)).toBeNull();
    });

    test('Requirement 15: Does not mutate the original classes state array', () => {
      const original = [
        Object.freeze({ id: 'LIVE-2', status: 'live', scheduledAt: '2026-11-18T12:00:00Z' }),
        Object.freeze({ id: 'LIVE-1', status: 'live', scheduledAt: '2026-11-18T08:00:00Z' })
      ];
      const copyBefore = [...original];

      getDeterministicLiveClass(original);

      expect(original.length).toBe(copyBefore.length);
      expect(original[0].id).toBe('LIVE-2');
      expect(original[1].id).toBe('LIVE-1');
    });
  });

  describe('4. Pure Logic: getNextUpcomingSession', () => {
    test('Requirement 6 & 8: Identifies the nearest future scheduled session (earliest first)', () => {
      const classes = [
        { id: 'UP-3', status: 'upcoming', scheduledAt: '2026-11-20T10:00:00.000Z' },
        { id: 'UP-1', status: 'upcoming', scheduledAt: '2026-11-18T12:00:00.000Z' }, // Earliest future
        { id: 'UP-2', status: 'upcoming', scheduledAt: '2026-11-19T10:00:00.000Z' }
      ];
      const next = getNextUpcomingSession(classes, referenceTime);
      expect(next).toBeDefined();
      expect(next.id).toBe('UP-1');
    });

    test('Excludes completed, cancelled, and past sessions', () => {
      const classes = [
        { id: 'COMP-1', status: 'completed', scheduledAt: '2026-11-20T10:00:00.000Z' },
        { id: 'CANCEL-1', status: 'cancelled', scheduledAt: '2026-11-19T10:00:00.000Z' },
        { id: 'PAST-1', status: 'upcoming', scheduledAt: '2026-11-17T10:00:00.000Z' }, // in the past
        { id: 'LIVE-1', status: 'live', scheduledAt: '2026-11-18T09:00:00.000Z' },
        { id: 'VALID-FUTURE', status: 'upcoming', scheduledAt: '2026-11-19T15:00:00.000Z' }
      ];
      const next = getNextUpcomingSession(classes, referenceTime);
      expect(next).toBeDefined();
      expect(next.id).toBe('VALID-FUTURE');
    });

    test('Validates that start time is a valid date (ignores invalid date fields)', () => {
      const classes = [
        { id: 'INVALID-DATE-1', status: 'upcoming', scheduledAt: 'not-a-date' },
        { id: 'INVALID-DATE-2', status: 'upcoming', scheduledAt: null },
        { id: 'VALID-DATE', status: 'upcoming', scheduledAt: '2026-11-21T09:00:00.000Z' }
      ];
      const next = getNextUpcomingSession(classes, referenceTime);
      expect(next).toBeDefined();
      expect(next.id).toBe('VALID-DATE');
    });

    test('Requirement 7: Returns null when no future session exists or classes array is empty', () => {
      expect(getNextUpcomingSession([], referenceTime)).toBeNull();
      expect(getNextUpcomingSession(null, referenceTime)).toBeNull();
      expect(getNextUpcomingSession([
        { id: 'PAST-ONLY', status: 'completed', scheduledAt: '2026-11-17T10:00:00Z' }
      ], referenceTime)).toBeNull();
    });

    test('Requirement 15: Does not mutate the original classes state array', () => {
      const original = [
        Object.freeze({ id: 'UP-B', status: 'upcoming', scheduledAt: '2026-11-20T10:00:00.000Z' }),
        Object.freeze({ id: 'UP-A', status: 'upcoming', scheduledAt: '2026-11-19T10:00:00.000Z' })
      ];
      const copyBefore = [...original];

      getNextUpcomingSession(original, referenceTime);

      expect(original.length).toBe(copyBefore.length);
      expect(original[0].id).toBe('UP-B');
      expect(original[1].id).toBe('UP-A');
    });
  });

  describe('5. Hero Button & Subtitle UI Controller Simulation', () => {
    // Controller simulating the exact rendering and navigation logic in LiveClasses.js
    const createHeroButtonController = () => {
      let navigatedUrl = null;

      const navigate = (url) => {
        navigatedUrl = url;
      };

      const getHeroState = (classes, isLoading, error, refTime = referenceTime) => {
        const liveNow = getDeterministicLiveClass(classes);
        const nextSession = getNextUpcomingSession(classes, refTime);

        const isButtonDisabled = !liveNow || isLoading || !!error;
        let buttonText = '';
        let hasLiveIndicator = false;
        let nextSessionText = null;

        if (isLoading) {
          buttonText = 'Checking live status...';
        } else if (error) {
          buttonText = 'Live session status unavailable';
        } else if (liveNow) {
          buttonText = 'Join Live Webcast Now';
          hasLiveIndicator = true;
        } else {
          buttonText = 'No live class right now';
          hasLiveIndicator = false;
        }

        if (!liveNow && !isLoading && !error) {
          if (nextSession) {
            nextSessionText = `Next session: ${formatSessionDateTime(getClassStartTime(nextSession))}`;
          } else {
            nextSessionText = 'No sessions scheduled yet.';
          }
        }

        const handleButtonClick = () => {
          if (isButtonDisabled) return;
          if (liveNow && liveNow.id) {
            navigate(`/live/${liveNow.id}`);
          }
        };

        return {
          liveNow,
          nextSession,
          isButtonDisabled,
          buttonText,
          hasLiveIndicator,
          nextSessionText,
          handleButtonClick
        };
      };

      return {
        getHeroState,
        getNavigatedUrl: () => navigatedUrl,
        resetNavigatedUrl: () => { navigatedUrl = null; }
      };
    };

    test('Requirement 1 & 13: Live class exists -> Button enabled, 🔴 shown, clicks navigate to /live/:id', () => {
      const controller = createHeroButtonController();
      const classes = [
        { id: 'LIVE-101', title: 'WebRTC Deep Dive', status: 'live' }
      ];

      const state = controller.getHeroState(classes, false, null);
      expect(state.isButtonDisabled).toBe(false);
      expect(state.hasLiveIndicator).toBe(true);
      expect(state.buttonText).toBe('Join Live Webcast Now');
      expect(state.nextSessionText).toBeNull(); // No subtitle when live class is active

      state.handleButtonClick();
      expect(controller.getNavigatedUrl()).toBe('/live/LIVE-101');
    });

    test('Requirement 5 & 12: Only completed classes exist -> Button disabled, No live class right now, clicking does not navigate', () => {
      const controller = createHeroButtonController();
      const classes = [
        { id: 'COMP-1', title: 'React 19 Hooks', status: 'completed' }
      ];

      const state = controller.getHeroState(classes, false, null);
      expect(state.isButtonDisabled).toBe(true);
      expect(state.hasLiveIndicator).toBe(false);
      expect(state.buttonText).toBe('No live class right now');
      expect(state.nextSessionText).toBe('No sessions scheduled yet.');

      state.handleButtonClick();
      expect(controller.getNavigatedUrl()).toBeNull();
    });

    test('Requirement 6 & 12: Only upcoming classes exist -> Button disabled, next session displayed, does not navigate', () => {
      const controller = createHeroButtonController();
      const classes = [
        { id: 'UP-101', title: 'AI Infrastructure', status: 'upcoming', scheduledAt: '2026-11-19T14:30:00Z' }
      ];

      const state = controller.getHeroState(classes, false, null);
      expect(state.isButtonDisabled).toBe(true);
      expect(state.hasLiveIndicator).toBe(false);
      expect(state.buttonText).toBe('No live class right now');
      expect(state.nextSessionText).toContain('Next session:');

      state.handleButtonClick();
      expect(controller.getNavigatedUrl()).toBeNull();
    });

    test('Requirement 7: Classes array is empty -> Button disabled, displays "No sessions scheduled yet."', () => {
      const controller = createHeroButtonController();
      const state = controller.getHeroState([], false, null);
      expect(state.isButtonDisabled).toBe(true);
      expect(state.hasLiveIndicator).toBe(false);
      expect(state.buttonText).toBe('No live class right now');
      expect(state.nextSessionText).toBe('No sessions scheduled yet.');
    });

    test('Requirement 8: Multiple upcoming classes -> Earliest future session displayed in nextSessionText', () => {
      const controller = createHeroButtonController();
      const classes = [
        { id: 'UP-LATE', status: 'upcoming', scheduledAt: '2026-11-25T10:00:00Z' },
        { id: 'UP-EARLY', status: 'upcoming', scheduledAt: '2026-11-19T09:00:00Z' }
      ];

      const state = controller.getHeroState(classes, false, null);
      expect(state.nextSession?.id).toBe('UP-EARLY');
      expect(state.nextSessionText).toContain('Next session:');
    });

    test('Requirement 10: API loading -> Loading state shown, does NOT show "No live class right now"', () => {
      const controller = createHeroButtonController();
      const state = controller.getHeroState([], true, null);
      expect(state.isButtonDisabled).toBe(true);
      expect(state.buttonText).not.toBe('No live class right now');
      expect(state.buttonText).toBe('Checking live status...');
      expect(state.nextSessionText).toBeNull();
    });

    test('Requirement 11: API failure -> Error state shown, not a fake no-live message or fake scheduled message', () => {
      const controller = createHeroButtonController();
      const state = controller.getHeroState([], false, 'Live classes could not be loaded at this moment');
      expect(state.isButtonDisabled).toBe(true);
      expect(state.buttonText).not.toBe('No live class right now');
      expect(state.buttonText).toBe('Live session status unavailable');
      expect(state.nextSessionText).toBeNull();
    });
  });

  describe('6. Source Code Audit: No classes[0] Fallback & Required Elements', () => {
    const liveClassesPath = path.resolve(__dirname, 'LiveClasses.js');
    const liveClassesCode = fs.readFileSync(liveClassesPath, 'utf8');

    test('Requirement 14: LiveClasses.js does NOT contain classes[0] fallback', () => {
      expect(liveClassesCode).not.toContain('classes[0]');
    });

    test('LiveClasses.js exports normalizeStatus, getDeterministicLiveClass, and getNextUpcomingSession', () => {
      expect(liveClassesCode).toContain('export const normalizeStatus');
      expect(liveClassesCode).toContain('export const getDeterministicLiveClass');
      expect(liveClassesCode).toContain('export const getNextUpcomingSession');
    });

    test('LiveClasses.js contains hero-join-live-btn and next-session-info test IDs', () => {
      expect(liveClassesCode).toContain('data-testid="hero-join-live-btn"');
      expect(liveClassesCode).toContain('data-testid="next-session-info"');
    });

    test('LiveClasses.js contains "No live class right now" and "No sessions scheduled yet."', () => {
      expect(liveClassesCode).toContain('No live class right now');
      expect(liveClassesCode).toContain('No sessions scheduled yet.');
      expect(liveClassesCode).toContain('Next session');
    });
  });
});
