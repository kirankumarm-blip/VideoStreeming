import { processLiveClassesApiResponse } from './LiveClasses';
import fs from 'fs';
import path from 'path';

describe('Live Classes API Error Handling, Loading, Empty, and Retry States', () => {
  describe('1. Pure Logic: processLiveClassesApiResponse', () => {
    test('Requirement 1: API success with classes returns classes array with no error', () => {
      const mockClasses = [
        { id: 'LIVE-201', title: 'React 19 Deep Dive', status: 'live' },
        { id: 'LIVE-202', title: 'Cloud Native Microservices', status: 'upcoming' }
      ];
      const res = { ok: true, status: 200 };

      const result = processLiveClassesApiResponse(res, mockClasses);
      expect(result.classes).toEqual(mockClasses);
      expect(result.error).toBeNull();
    });

    test('Requirement 2: API success with empty array returns empty classes array without error', () => {
      const res = { ok: true, status: 200 };

      const result = processLiveClassesApiResponse(res, []);
      expect(result.classes).toEqual([]);
      expect(result.error).toBeNull();
    });

    test('Requirement 3 & 4: HTTP 500 and 503 return empty array and exact error message', () => {
      const res500 = { ok: false, status: 500 };
      const res503 = { ok: false, status: 503 };

      const result500 = processLiveClassesApiResponse(res500, null);
      expect(result500.classes).toEqual([]);
      expect(result500.error).toBe('Live classes could not be loaded at this moment');

      const result503 = processLiveClassesApiResponse(res503, null);
      expect(result503.classes).toEqual([]);
      expect(result503.error).toBe('Live classes could not be loaded at this moment');
    });

    test('Requirement 2: Non-array or invalid API response returns error', () => {
      const res = { ok: true, status: 200 };

      const resultNull = processLiveClassesApiResponse(res, null);
      expect(resultNull.classes).toEqual([]);
      expect(resultNull.error).toBe('Live classes could not be loaded at this moment');

      const resultObj = processLiveClassesApiResponse(res, { message: 'unexpected object' });
      expect(resultObj.classes).toEqual([]);
      expect(resultObj.error).toBe('Live classes could not be loaded at this moment');
    });
  });

  describe('2. Live Classes Component State Lifecycle & Controller Simulation', () => {
    const createLiveClassesController = () => {
      let classes = [];
      let isLoading = true;
      let error = null;
      let isFetchingRef = { current: false };
      let fetchCount = 0;
      let lastFetchedUrl = null;

      const fetchClasses = async (isManual = false, mockFetchFn = null) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        if (isManual || classes.length === 0) {
          isLoading = true;
        }

        try {
          const apiBase = 'https://api.darpanx.com';
          lastFetchedUrl = `${apiBase}/api/live-classes`;
          fetchCount++;

          const res = await mockFetchFn(lastFetchedUrl);
          if (res && res.ok) {
            const data = await res.json();
            const processed = processLiveClassesApiResponse(res, data);
            classes = processed.classes;
            error = processed.error;
          } else {
            classes = [];
            error = 'Live classes could not be loaded at this moment';
          }
        } catch (err) {
          classes = [];
          error = 'Live classes could not be loaded at this moment';
        } finally {
          isLoading = false;
          isFetchingRef.current = false;
        }
      };

      return {
        getState: () => ({
          classes,
          isLoading,
          error,
          fetchCount,
          lastFetchedUrl
        }),
        fetchClasses
      };
    };

    test('Initial state: isLoading is true, classes empty, error null', () => {
      const controller = createLiveClassesController();
      const state = controller.getState();

      expect(state.isLoading).toBe(true);
      expect(state.classes).toEqual([]);
      expect(state.error).toBeNull();
    });

    test('Scenario 1: API success with classes displays actual data and clears previous errors', async () => {
      const controller = createLiveClassesController();
      const mockData = [
        { id: 'LIVE-1', title: 'System Architecture', status: 'live' },
        { id: 'LIVE-2', title: 'Database Optimization', status: 'upcoming' }
      ];

      await controller.fetchClasses(true, async () => ({
        ok: true,
        status: 200,
        json: async () => mockData
      }));

      const state = controller.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.classes).toEqual(mockData);
      expect(state.classes.length).toBe(2);
    });

    test('Scenario 2: API success with empty array sets classes=[] with error=null (empty state)', async () => {
      const controller = createLiveClassesController();

      await controller.fetchClasses(true, async () => ({
        ok: true,
        status: 200,
        json: async () => []
      }));

      const state = controller.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.classes).toEqual([]);
    });

    test('Scenario 3: HTTP 500 error displays error state and does NOT use fallback classes', async () => {
      const controller = createLiveClassesController();

      await controller.fetchClasses(true, async () => ({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' })
      }));

      const state = controller.getState();
      expect(state.isLoading).toBe(false);
      expect(state.classes).toEqual([]);
      expect(state.error).toBe('Live classes could not be loaded at this moment');
    });

    test('Scenario 4: HTTP 503 error displays error state', async () => {
      const controller = createLiveClassesController();

      await controller.fetchClasses(true, async () => ({
        ok: false,
        status: 503
      }));

      const state = controller.getState();
      expect(state.isLoading).toBe(false);
      expect(state.classes).toEqual([]);
      expect(state.error).toBe('Live classes could not be loaded at this moment');
    });

    test('Scenario 5: Network failure displays error state without mock data', async () => {
      const controller = createLiveClassesController();

      await controller.fetchClasses(true, async () => {
        throw new TypeError('Failed to fetch');
      });

      const state = controller.getState();
      expect(state.isLoading).toBe(false);
      expect(state.classes).toEqual([]);
      expect(state.error).toBe('Live classes could not be loaded at this moment');
    });

    test('Scenario 6: API Timeout (AbortError) displays error state', async () => {
      const controller = createLiveClassesController();

      await controller.fetchClasses(true, async () => {
        const abortErr = new Error('The operation was aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      });

      const state = controller.getState();
      expect(state.isLoading).toBe(false);
      expect(state.classes).toEqual([]);
      expect(state.error).toBe('Live classes could not be loaded at this moment');
    });

    test('Scenario 7 & 8: Retry triggers new request and succeeds', async () => {
      const controller = createLiveClassesController();

      // First call fails
      await controller.fetchClasses(true, async () => ({
        ok: false,
        status: 500
      }));
      expect(controller.getState().error).toBe('Live classes could not be loaded at this moment');
      expect(controller.getState().fetchCount).toBe(1);

      // User clicks Retry -> API now succeeds
      const realData = [{ id: 'LIVE-99', title: 'Live Streaming Systems', status: 'live' }];
      await controller.fetchClasses(true, async () => ({
        ok: true,
        status: 200,
        json: async () => realData
      }));

      const state = controller.getState();
      expect(state.fetchCount).toBe(2);
      expect(state.error).toBeNull();
      expect(state.classes).toEqual(realData);
    });

    test('Scenario 9: Retry fails and preserves the exact error message', async () => {
      const controller = createLiveClassesController();

      // Initial failure
      await controller.fetchClasses(true, async () => ({ ok: false, status: 500 }));
      expect(controller.getState().error).toBe('Live classes could not be loaded at this moment');

      // Retry failure
      await controller.fetchClasses(true, async () => ({ ok: false, status: 502 }));

      const state = controller.getState();
      expect(state.fetchCount).toBe(2);
      expect(state.error).toBe('Live classes could not be loaded at this moment');
      expect(state.classes).toEqual([]);
    });

    test('Scenario 10: Repeated rapid clicks on Retry prevent duplicate requests', async () => {
      const controller = createLiveClassesController();
      let resolveCall;
      const delayedPromise = new Promise(resolve => { resolveCall = resolve; });

      // Trigger 2 rapid clicks while the first request is pending
      const call1 = controller.fetchClasses(true, () => delayedPromise);
      const call2 = controller.fetchClasses(true, () => delayedPromise);

      expect(controller.getState().isLoading).toBe(true);

      resolveCall({
        ok: true,
        status: 200,
        json: async () => [{ id: 'LIVE-1', title: 'Session' }]
      });

      await Promise.all([call1, call2]);

      // Exactly 1 network fetch was dispatched
      expect(controller.getState().fetchCount).toBe(1);
      expect(controller.getState().classes.length).toBe(1);
    });
  });

  describe('3. Source Code Audit: Removal of Mock Fallbacks & Hardcoded URLs', () => {
    test('Requirement 1 & 10: LiveClasses.js does NOT import or use FALLBACK_LIVE_CLASSES', () => {
      const filePath = path.join(__dirname, 'LiveClasses.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');

      // Must not contain FALLBACK_LIVE_CLASSES import or assignment
      expect(fileContent).not.toMatch(/FALLBACK_LIVE_CLASSES/);
      expect(fileContent).not.toMatch(/setClasses\(\s*FALLBACK_LIVE_CLASSES\s*\)/);
    });

    test('LiveClasses.js does NOT contain hardcoded http://localhost:5000', () => {
      const filePath = path.join(__dirname, 'LiveClasses.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');

      expect(fileContent).not.toMatch(/fetch\(['"`]http:\/\/localhost:5000/);
    });

    test('LiveClasses.js contains separate classes, isLoading, and error state variables', () => {
      const filePath = path.join(__dirname, 'LiveClasses.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');

      expect(fileContent).toMatch(/const\s*\[\s*classes\s*,\s*setClasses\s*\]\s*=\s*useState\(\s*\[\]\s*\)/);
      expect(fileContent).toMatch(/const\s*\[\s*isLoading\s*,\s*setIsLoading\s*\]\s*=\s*useState\(\s*true\s*\)/);
      expect(fileContent).toMatch(/const\s*\[\s*error\s*,\s*setError\s*\]\s*=\s*useState\(\s*null\s*\)/);
    });

    test('LiveClasses.js contains exact error and empty messages and retry button', () => {
      const filePath = path.join(__dirname, 'LiveClasses.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');

      expect(fileContent).toContain('Live classes could not be loaded at this moment');
      expect(fileContent).toContain('No live classes available');
      expect(fileContent).toContain('data-testid="retry-btn"');
    });
  });
});
