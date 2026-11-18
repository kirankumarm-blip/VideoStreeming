import {
  generateCorrelationId,
  extractRequestId,
  isSensitiveOrTechnicalMessage,
  getSafeStatusFallback,
  sanitizeErrorMessage,
  formatDisplayErrorMessage,
  logFormError,
  handleFormApiError
} from '../utils/formErrorHandler';

describe('Study Room Creation Error Handling & Request ID Tracking', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('1. Correlation ID Generation', () => {
    test('generates valid client-prefixed correlation ID', () => {
      const id = generateCorrelationId();
      expect(typeof id).toBe('string');
      expect(id.startsWith('client-')).toBe(true);
      expect(id.length).toBeGreaterThan(10);
    });

    test('generates unique IDs across calls', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('2. Request ID Extraction', () => {
    test('extracts request ID from x-request-id header', () => {
      const mockResponse = {
        headers: {
          get: (name) => (name.toLowerCase() === 'x-request-id' ? 'REQ-SR-99881' : null)
        }
      };

      const result = extractRequestId(mockResponse, null, 'client-fallback');
      expect(result.requestId).toBe('REQ-SR-99881');
      expect(result.isServerId).toBe(true);
    });

    test('extracts request ID from x-correlation-id header', () => {
      const mockResponse = {
        headers: {
          get: (header) => (header.toLowerCase() === 'x-correlation-id' ? 'CORR-ALPHA-441' : null)
        }
      };

      const result = extractRequestId(mockResponse, null, 'client-fallback');
      expect(result.requestId).toBe('CORR-ALPHA-441');
      expect(result.isServerId).toBe(true);
    });

    test('extracts request ID from response body fields (requestId, request_id, correlationId)', () => {
      const result1 = extractRequestId(null, { requestId: 'SRV-REQ-123' }, 'client-fallback');
      expect(result1.requestId).toBe('SRV-REQ-123');
      expect(result1.isServerId).toBe(true);

      const result2 = extractRequestId(null, { request_id: 'SRV-REQ-456' }, 'client-fallback');
      expect(result2.requestId).toBe('SRV-REQ-456');
      expect(result2.isServerId).toBe(true);

      const result3 = extractRequestId(null, { correlationId: 'CORR-789' }, 'client-fallback');
      expect(result3.requestId).toBe('CORR-789');
      expect(result3.isServerId).toBe(true);
    });

    test('uses supplied client correlation ID when server returns no ID', () => {
      const mockResponse = { headers: { get: () => null } };
      const clientCorrelationId = 'client-uuid-112233';

      const result = extractRequestId(mockResponse, { message: 'Some error' }, clientCorrelationId);
      expect(result.requestId).toBe('client-uuid-112233');
      expect(result.isServerId).toBe(false);
    });

    test('generates client ID if neither server nor client supplied one', () => {
      const result = extractRequestId(null, null, null);
      expect(result.requestId.startsWith('client-')).toBe(true);
      expect(result.isServerId).toBe(false);
    });
  });

  describe('3. Error Sanitization and Technical Leakage Prevention', () => {
    test('detects SQL query leakages as sensitive', () => {
      expect(isSensitiveOrTechnicalMessage('SELECT * FROM study_rooms WHERE id = 123')).toBe(true);
      expect(isSensitiveOrTechnicalMessage('INSERT INTO rooms (title) VALUES ("test")')).toBe(true);
      expect(isSensitiveOrTechnicalMessage('syntax error at or near "SELECT" in query')).toBe(true);
      expect(isSensitiveOrTechnicalMessage('duplicate key value violates unique constraint "rooms_code_key"')).toBe(true);
    });

    test('detects stack traces and internal paths as sensitive', () => {
      expect(isSensitiveOrTechnicalMessage('at Object.<anonymous> (/usr/app/node_modules/express/lib/router.js:14:5)')).toBe(true);
      expect(isSensitiveOrTechnicalMessage('Error at C:\\Users\\axxonet\\Desktop\\videoStreeming\\server.js:52:10')).toBe(true);
      expect(isSensitiveOrTechnicalMessage('webpack:///src/pages/StudyRooms.js:42:1')).toBe(true);
    });

    test('detects HTML responses (502/504 Bad Gateway pages) as sensitive', () => {
      expect(isSensitiveOrTechnicalMessage('<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>')).toBe(true);
      expect(isSensitiveOrTechnicalMessage('<html><head><title>504 Gateway Timeout</title></head></html>')).toBe(true);
    });

    test('detects authentication tokens as sensitive', () => {
      expect(isSensitiveOrTechnicalMessage('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid')).toBe(true);
    });

    test('sanitizes technical errors into safe learner-facing messages', () => {
      const safe500 = sanitizeErrorMessage('syntax error at or near "SELECT"', 500, 'CreateStudyRoom');
      expect(safe500).toBe('Unable to create Study Room right now. Please try again.');
      expect(safe500).not.toContain('SELECT');

      const safe400 = sanitizeErrorMessage('at C:\\server\\db.js:12:34', 400, 'CreateStudyRoom');
      expect(safe400).toBe('Unable to create Study Room. Please check the entered details.');
      expect(safe400).not.toContain('C:\\server');
    });

    test('preserves legitimate user-safe validation messages', () => {
      const msg1 = sanitizeErrorMessage('Room title cannot exceed 100 characters.', 400, 'CreateStudyRoom');
      expect(msg1).toBe('Room title cannot exceed 100 characters.');

      const msg2 = sanitizeErrorMessage('A study room with this title is already active in your course.', 409, 'CreateStudyRoom');
      expect(msg2).toBe('A study room with this title is already active in your course.');
    });
  });

  describe('4. Safe HTTP Status Fallbacks', () => {
    test('returns appropriate status fallback for Study Room context', () => {
      expect(getSafeStatusFallback(400, 'CreateStudyRoom')).toBe('Unable to create Study Room. Please check the entered details.');
      expect(getSafeStatusFallback(401, 'CreateStudyRoom')).toBe('Your session has expired. Please sign in again.');
      expect(getSafeStatusFallback(403, 'CreateStudyRoom')).toBe('You do not have permission to perform this action.');
      expect(getSafeStatusFallback(404, 'CreateStudyRoom')).toBe('Study room service was not found. Please try again later.');
      expect(getSafeStatusFallback(409, 'CreateStudyRoom')).toBe('A study room with this name or code already exists.');
      expect(getSafeStatusFallback(429, 'CreateStudyRoom')).toBe('Too many requests. Please wait a moment and try again.');
      expect(getSafeStatusFallback(500, 'CreateStudyRoom')).toBe('Unable to create Study Room right now. Please try again.');
      expect(getSafeStatusFallback(502, 'CreateStudyRoom')).toBe('Unable to create Study Room right now. Please try again.');
      expect(getSafeStatusFallback(503, 'CreateStudyRoom')).toBe('Unable to create Study Room right now. Please try again.');
    });
  });

  describe('5. Error Message Display Formatting with Request ID', () => {
    test('formats server request ID with "Reference ID:"', () => {
      const display = formatDisplayErrorMessage({
        message: 'Unable to create Study Room right now. Please try again.',
        requestId: 'REQ-12345',
        isServerId: true
      });
      expect(display).toBe('Unable to create Study Room right now. Please try again. Reference ID: REQ-12345');
    });

    test('formats client correlation ID with "Client Ref:"', () => {
      const display = formatDisplayErrorMessage({
        message: 'Network error. Please check your internet connection and try again.',
        requestId: 'client-88124',
        isServerId: false
      });
      expect(display).toBe('Network error. Please check your internet connection and try again. Client Ref: client-88124');
    });

    test('returns base message if no request ID is available', () => {
      const display = formatDisplayErrorMessage({
        message: 'Unable to create Study Room. Please check the entered details.',
        requestId: null
      });
      expect(display).toBe('Unable to create Study Room. Please check the entered details.');
    });
  });

  describe('6. Structured Error Logging', () => {
    test('logs structured error object to console without leaking form inputs', () => {
      logFormError({
        form: 'CreateStudyRoom',
        requestId: 'REQ-99001',
        status: 400,
        message: 'Unable to create Study Room. Please check the entered details.'
      });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const [logTitle, logDetails] = consoleErrorSpy.mock.calls[0];
      expect(logTitle).toBe('Form submission failed');
      expect(logDetails).toMatchObject({
        form: 'CreateStudyRoom',
        requestId: 'REQ-99001',
        status: 400,
        message: 'Unable to create Study Room. Please check the entered details.'
      });
      expect(logDetails.timestamp).toBeDefined();
    });
  });

  describe('7. Unified handleFormApiError Handler Scenarios', () => {
    test('Scenario A: HTTP 400 validation error with server request ID', async () => {
      const mockResponse = {
        status: 400,
        headers: {
          get: (name) => (name.toLowerCase() === 'x-request-id' ? 'REQ-VAL-400' : null)
        },
        text: async () => JSON.stringify({ message: 'Room name must be between 3 and 100 characters.' })
      };

      const result = await handleFormApiError(mockResponse, null, {
        formName: 'CreateStudyRoom',
        clientCorrelationId: 'client-temp-1'
      });

      expect(result.status).toBe(400);
      expect(result.isServerId).toBe(true);
      expect(result.requestId).toBe('REQ-VAL-400');
      expect(result.rawMessage).toBe('Room name must be between 3 and 100 characters.');
      expect(result.displayMessage).toBe('Room name must be between 3 and 100 characters. Reference ID: REQ-VAL-400');
    });

    test('Scenario B: HTTP 409 room conflict with body request ID', async () => {
      const mockResponse = {
        status: 409,
        headers: { get: () => null },
        text: async () => JSON.stringify({
          error: 'A study room with this code already exists.',
          requestId: 'REQ-CONF-409'
        })
      };

      const result = await handleFormApiError(mockResponse, null, {
        formName: 'CreateStudyRoom'
      });

      expect(result.status).toBe(409);
      expect(result.requestId).toBe('REQ-CONF-409');
      expect(result.displayMessage).toBe('A study room with this code already exists. Reference ID: REQ-CONF-409');
    });

    test('Scenario C: HTTP 500 server error with database crash and client correlation ID', async () => {
      const mockResponse = {
        status: 500,
        headers: { get: () => null },
        text: async () => JSON.stringify({
          error: 'pg_catalog syntax error at or near SELECT * FROM study_rooms'
        })
      };

      const clientCorrelationId = 'client-uuid-500';
      const result = await handleFormApiError(mockResponse, null, {
        formName: 'CreateStudyRoom',
        clientCorrelationId
      });

      expect(result.status).toBe(500);
      expect(result.isServerId).toBe(false);
      expect(result.requestId).toBe(clientCorrelationId);
      // Sanitized: internal SQL query replaced with learner safe fallback
      expect(result.rawMessage).toBe('Unable to create Study Room right now. Please try again.');
      expect(result.displayMessage).toBe(`Unable to create Study Room right now. Please try again. Client Ref: ${clientCorrelationId}`);
    });

    test('Scenario D: HTTP 502 Bad Gateway with raw HTML response', async () => {
      const mockResponse = {
        status: 502,
        headers: { get: () => null },
        text: async () => '<html><body><h1>502 Bad Gateway</h1><p>nginx/1.24</p></body></html>'
      };

      const clientCorrelationId = 'client-502-html';
      const result = await handleFormApiError(mockResponse, null, {
        formName: 'CreateStudyRoom',
        clientCorrelationId
      });

      expect(result.status).toBe(502);
      expect(result.rawMessage).toBe('Unable to create Study Room right now. Please try again.');
      expect(result.displayMessage).toBe(`Unable to create Study Room right now. Please try again. Client Ref: ${clientCorrelationId}`);
    });

    test('Scenario E: Network Failure (fetch threw TypeError)', async () => {
      const networkError = new TypeError('Failed to fetch');
      const clientCorrelationId = 'client-net-fail';

      const result = await handleFormApiError(null, networkError, {
        formName: 'CreateStudyRoom',
        clientCorrelationId
      });

      expect(result.status).toBe(0);
      expect(result.isServerId).toBe(false);
      expect(result.requestId).toBe(clientCorrelationId);
      expect(result.rawMessage).toBe('Network error. Please check your internet connection and try again.');
      expect(result.displayMessage).toBe(`Network error. Please check your internet connection and try again. Client Ref: ${clientCorrelationId}`);
    });
  });

  describe('8. Study Room Form Submission Controller Workflow Simulation', () => {
    // Simulates the exact state lifecycle in handleCreateRoom
    const simulateCreateRoomWorkflow = async ({
      fetchMock,
      initialTitle = 'React Study Group',
      initialCourse = '2'
    }) => {
      let showCreateModal = true;
      let newRoomTitle = initialTitle;
      let selectedCourse = initialCourse;
      let creating = false;
      let createError = '';
      let navigatedUrl = null;
      let fetchRoomsCalled = false;

      const navigate = (url) => { navigatedUrl = url; };
      const fetchRooms = () => { fetchRoomsCalled = true; };

      const handleCreateRoom = async () => {
        if (creating) return;
        creating = true;
        createError = '';

        const clientCorrelationId = generateCorrelationId();

        try {
          const payload = {
            title: newRoomTitle.trim() || 'Learner Study Room',
            courseId: selectedCourse,
            videoId: selectedCourse === '1' ? '1' : '2'
          };

          const res = await fetchMock(payload, clientCorrelationId);

          if (res.ok) {
            const data = await res.json();
            showCreateModal = false;
            newRoomTitle = '';
            selectedCourse = '1';
            createError = '';
            fetchRooms();
            const roomId = data.roomId || (data.room && data.room.id);
            navigate(`/watch/${payload.videoId}?room=${roomId}`);
          } else {
            const errResult = await handleFormApiError(res, null, {
              formName: 'CreateStudyRoom',
              clientCorrelationId
            });
            createError = errResult.displayMessage;
          }
        } catch (err) {
          const errResult = await handleFormApiError(null, err, {
            formName: 'CreateStudyRoom',
            clientCorrelationId
          });
          createError = errResult.displayMessage;
        } finally {
          creating = false;
        }
      };

      await handleCreateRoom();

      return {
        showCreateModal,
        newRoomTitle,
        selectedCourse,
        creating,
        createError,
        navigatedUrl,
        fetchRoomsCalled
      };
    };

    test('Failure Scenario: API returns 500 -> modal stays open, inputs preserved, error displayed with request ID', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 500,
        headers: {
          get: (name) => (name.toLowerCase() === 'x-request-id' ? 'REQ-SRV-5001' : null)
        },
        text: async () => JSON.stringify({ message: 'Internal room creation error' })
      });

      const state = await simulateCreateRoomWorkflow({
        fetchMock: mockFetch,
        initialTitle: 'Advanced State Machine Prep',
        initialCourse: '2'
      });

      // Modal must NOT close on error!
      expect(state.showCreateModal).toBe(true);
      // User inputs MUST be preserved for correction / retry!
      expect(state.newRoomTitle).toBe('Advanced State Machine Prep');
      expect(state.selectedCourse).toBe('2');
      // Button must re-enable
      expect(state.creating).toBe(false);
      // Error message with Reference ID must be visible
      expect(state.createError).toContain('Internal room creation error Reference ID: REQ-SRV-5001');
      // Navigation must not occur
      expect(state.navigatedUrl).toBeNull();
      expect(state.fetchRoomsCalled).toBe(false);
    });

    test('Failure Scenario: Network error -> modal stays open, inputs preserved, client ref displayed', async () => {
      const mockFetch = async () => {
        throw new TypeError('Network request failed');
      };

      const state = await simulateCreateRoomWorkflow({
        fetchMock: mockFetch,
        initialTitle: 'Python Algorithms Discussion',
        initialCourse: '1'
      });

      expect(state.showCreateModal).toBe(true);
      expect(state.newRoomTitle).toBe('Python Algorithms Discussion');
      expect(state.selectedCourse).toBe('1');
      expect(state.creating).toBe(false);
      expect(state.createError).toContain('Network error. Please check your internet connection and try again. Client Ref: client-');
      expect(state.navigatedUrl).toBeNull();
    });

    test('Success Scenario: API returns 200 -> modal closes, form resets, rooms refreshed, navigates', async () => {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, roomId: 'STUDY-5544' })
      });

      const state = await simulateCreateRoomWorkflow({
        fetchMock: mockFetch,
        initialTitle: 'New Watch Party',
        initialCourse: '2'
      });

      // Modal closes on confirmed success
      expect(state.showCreateModal).toBe(false);
      // Inputs reset to clean state
      expect(state.newRoomTitle).toBe('');
      expect(state.selectedCourse).toBe('1');
      expect(state.createError).toBe('');
      expect(state.creating).toBe(false);
      // Refresh triggered & navigated
      expect(state.fetchRoomsCalled).toBe(true);
      expect(state.navigatedUrl).toBe('/watch/2?room=STUDY-5544');
    });
  });
});
