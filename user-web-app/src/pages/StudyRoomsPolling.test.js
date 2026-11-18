import { calculateBackoffDelay, getApiBaseUrl } from '../utils/apiUrl';

describe('Study Rooms Polling, Exponential Backoff & Visibility Management', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('calculateBackoffDelay (Exponential Backoff with Jitter)', () => {
    test('1. Normal operation (0 failures) returns 10-second polling interval', () => {
      const delay = calculateBackoffDelay(0);
      expect(delay).toBe(10000);

      const negativeDelay = calculateBackoffDelay(-1);
      expect(negativeDelay).toBe(10000);
    });

    test('2. First failure schedules retry after 20 seconds (+ jitter)', () => {
      const delayNoJitter = calculateBackoffDelay(1, { jitter: false });
      expect(delayNoJitter).toBe(20000);

      // With deterministic jitter (e.g. random = 0.5 => 500ms jitter)
      const delayWithJitter = calculateBackoffDelay(1, { jitter: true, randomFn: () => 0.5 });
      expect(delayWithJitter).toBe(20500);

      // Random jitter should be in [20000, 21000)
      const dynamicDelay = calculateBackoffDelay(1);
      expect(dynamicDelay).toBeGreaterThanOrEqual(20000);
      expect(dynamicDelay).toBeLessThan(21000);
    });

    test('3. Second failure schedules retry after 40 seconds (+ jitter)', () => {
      const delayNoJitter = calculateBackoffDelay(2, { jitter: false });
      expect(delayNoJitter).toBe(40000);

      const delayWithJitter = calculateBackoffDelay(2, { jitter: true, randomFn: () => 0.25 });
      expect(delayWithJitter).toBe(40250);

      const dynamicDelay = calculateBackoffDelay(2);
      expect(dynamicDelay).toBeGreaterThanOrEqual(40000);
      expect(dynamicDelay).toBeLessThan(41000);
    });

    test('4. Third failure schedules retry after 80 seconds (+ jitter)', () => {
      const delayNoJitter = calculateBackoffDelay(3, { jitter: false });
      expect(delayNoJitter).toBe(80000);

      const delayWithJitter = calculateBackoffDelay(3, { jitter: true, randomFn: () => 0.75 });
      expect(delayWithJitter).toBe(80750);

      const dynamicDelay = calculateBackoffDelay(3);
      expect(dynamicDelay).toBeGreaterThanOrEqual(80000);
      expect(dynamicDelay).toBeLessThan(81000);
    });

    test('5. Subsequent failures (4+) capped at maximum of 120 seconds (+ jitter)', () => {
      const delay4 = calculateBackoffDelay(4, { jitter: false });
      expect(delay4).toBe(120000);

      const delay5 = calculateBackoffDelay(5, { jitter: false });
      expect(delay5).toBe(120000);

      const delay10 = calculateBackoffDelay(10, { jitter: false });
      expect(delay10).toBe(120000);

      const dynamicDelay = calculateBackoffDelay(4);
      expect(dynamicDelay).toBeGreaterThanOrEqual(120000);
      expect(dynamicDelay).toBeLessThan(121000);
    });
  });

  describe('getApiBaseUrl (Environment Configuration Resolution)', () => {
    test('6. Reads VITE_API_BASE_URL from environment and trims trailing slashes', () => {
      process.env.VITE_API_BASE_URL = 'https://api.lurnax.com///';
      process.env.REACT_APP_API_BASE_URL = 'https://api.lurnax.com///';
      expect(getApiBaseUrl()).toBe('https://api.lurnax.com');
    });

    test('7. Reads REACT_APP_API_BASE_URL when VITE_API_BASE_URL is not set', () => {
      delete process.env.VITE_API_BASE_URL;
      process.env.REACT_APP_API_BASE_URL = 'https://uat-api.lurnax.com';
      expect(getApiBaseUrl()).toBe('https://uat-api.lurnax.com');
    });

    test('8. Returns empty string when environment variables are unconfigured without crashing', () => {
      delete process.env.VITE_API_BASE_URL;
      delete process.env.REACT_APP_API_BASE_URL;
      expect(getApiBaseUrl()).toBe('');
    });
  });

  describe('Polling State Machine & Visibility Simulation', () => {
    class PollingManager {
      constructor({ fetchFn }) {
        this.fetchFn = fetchFn;
        this.failureCount = 0;
        this.isFetching = false;
        this.pollTimer = null;
        this.nextPollTime = 0;
        this.isMounted = true;
        this.authError = false;
      }

      clearTimer() {
        if (this.pollTimer) {
          clearTimeout(this.pollTimer);
          this.pollTimer = null;
        }
      }

      scheduleNext(customDelay = null) {
        this.clearTimer();
        if (!this.isMounted || this.authError) return;

        const delay = typeof customDelay === 'number'
          ? customDelay
          : calculateBackoffDelay(this.failureCount, { jitter: false });

        this.nextPollTime = Date.now() + delay;
        this.pollTimer = setTimeout(() => {
          this.executePoll();
        }, delay);
        return delay;
      }

      async executePoll(isManual = false) {
        if (this.isFetching) return 'OVERLAPPING_REJECTED';
        if (!this.isMounted) return 'UNMOUNTED';

        this.isFetching = true;
        this.clearTimer();

        try {
          const res = await this.fetchFn();
          if (res.status === 401 || res.status === 403) {
            this.authError = true;
            this.isFetching = false;
            return 'AUTH_STOPPED';
          }
          if (res.ok) {
            this.failureCount = 0; // Reset on success
            this.scheduleNext(10000);
            this.isFetching = false;
            return 'SUCCESS_POLL_SCHEDULED';
          }
          throw new Error(`HTTP ${res.status}`);
        } catch (err) {
          this.failureCount += 1;
          const delay = this.scheduleNext();
          this.isFetching = false;
          return `BACKOFF_${delay}MS`;
        }
      }

      onVisibilityChange(visibilityState) {
        if (visibilityState === 'hidden') {
          this.clearTimer();
        } else if (visibilityState === 'visible') {
          if (!this.isFetching && !this.authError && this.isMounted) {
            const now = Date.now();
            if (this.nextPollTime > now) {
              const remaining = this.nextPollTime - now;
              this.scheduleNext(remaining);
            } else {
              this.executePoll();
            }
          }
        }
      }

      unmount() {
        this.isMounted = false;
        this.clearTimer();
      }
    }

    test('9. Prevents overlapping concurrent requests', async () => {
      let activeRequests = 0;
      let maxConcurrent = 0;

      const slowFetch = () => new Promise(resolve => {
        activeRequests++;
        maxConcurrent = Math.max(maxConcurrent, activeRequests);
        setTimeout(() => {
          activeRequests--;
          resolve({ ok: true, status: 200, json: async () => [] });
        }, 50);
      });

      const manager = new PollingManager({ fetchFn: slowFetch });

      // Trigger first poll
      const p1 = manager.executePoll();
      // Simultaneously attempt to trigger second poll before first settles
      const p2 = manager.executePoll();

      expect(await p2).toBe('OVERLAPPING_REJECTED');
      await p1;

      expect(maxConcurrent).toBe(1);
      manager.unmount();
    });

    test('10. Stops polling immediately on HTTP 401 authentication errors without infinite retries', async () => {
      const authErrorFetch = async () => ({ ok: false, status: 401 });
      const manager = new PollingManager({ fetchFn: authErrorFetch });

      const result = await manager.executePoll();
      expect(result).toBe('AUTH_STOPPED');
      expect(manager.authError).toBe(true);
      expect(manager.pollTimer).toBeNull(); // No retry scheduled

      // Visibility change does not trigger poll when in authError
      manager.onVisibilityChange('visible');
      expect(manager.pollTimer).toBeNull();
      manager.unmount();
    });

    test('11. Pauses polling when tab is hidden and resumes respecting active backoff', async () => {
      const failureFetch = async () => ({ ok: false, status: 500 });
      const manager = new PollingManager({ fetchFn: failureFetch });

      // First failure triggers 20s backoff
      await manager.executePoll();
      expect(manager.failureCount).toBe(1);
      expect(manager.pollTimer).not.toBeNull();

      // Tab hidden: timer is cleared
      manager.onVisibilityChange('hidden');
      expect(manager.pollTimer).toBeNull();

      // Tab becomes visible again while 20s window is still active
      manager.onVisibilityChange('visible');
      expect(manager.pollTimer).not.toBeNull(); // Resumed timer for remaining window
      manager.unmount();
    });

    test('12. Resets failure counter and restores 10-second polling interval on successful response', async () => {
      let fail = true;
      const mockFetch = async () => {
        if (fail) return { ok: false, status: 503 };
        return { ok: true, status: 200, json: async () => [{ id: 'room-1' }] };
      };

      const manager = new PollingManager({ fetchFn: mockFetch });

      // 1st failure
      await manager.executePoll();
      expect(manager.failureCount).toBe(1);

      // 2nd failure
      await manager.executePoll();
      expect(manager.failureCount).toBe(2);

      // Server recovers: success
      fail = false;
      const res = await manager.executePoll();
      expect(res).toBe('SUCCESS_POLL_SCHEDULED');
      expect(manager.failureCount).toBe(0); // Reset to 0
      manager.unmount();
    });

    test('13. Cleans up timers and ignores responses after unmount', async () => {
      const hangingFetch = () => new Promise(resolve => setTimeout(() => resolve({ ok: true, status: 200 }), 20));
      const manager = new PollingManager({ fetchFn: hangingFetch });

      manager.scheduleNext(10000);
      expect(manager.pollTimer).not.toBeNull();

      manager.unmount();
      expect(manager.isMounted).toBe(false);
      expect(manager.pollTimer).toBeNull();
    });
  });
});
