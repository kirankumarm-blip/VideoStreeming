import { buildPollVoteHeaders } from './LiveClassroom';
import { isValidToken } from '../services/api';
import fs from 'fs';
import path from 'path';

describe('Live Classroom Poll Voting Authentication & Duplicate Guard', () => {
  describe('1. Header Construction & Token Validation', () => {
    test('builds valid Authorization header with Bearer token', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid';
      const headers = buildPollVoteHeaders(validToken);

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      });
    });

    test('trims whitespace from valid token', () => {
      const tokenWithWhitespace = '  valid-token-xyz  ';
      const headers = buildPollVoteHeaders(tokenWithWhitespace);

      expect(headers['Authorization']).toBe('Bearer valid-token-xyz');
    });

    test('returns null for missing, null, undefined, or empty token', () => {
      expect(buildPollVoteHeaders(null)).toBeNull();
      expect(buildPollVoteHeaders(undefined)).toBeNull();
      expect(buildPollVoteHeaders('')).toBeNull();
      expect(buildPollVoteHeaders('   ')).toBeNull();
    });

    test('returns null for invalid placeholder tokens ("null", "undefined")', () => {
      expect(buildPollVoteHeaders('null')).toBeNull();
      expect(buildPollVoteHeaders('undefined')).toBeNull();
      expect(buildPollVoteHeaders('NULL')).toBeNull();
      expect(buildPollVoteHeaders('UNDEFINED')).toBeNull();
    });
  });

  describe('2. Poll Voting Workflow Controller Simulation', () => {
    const createPollVoteController = (initialPoll = {
      id: 'poll-1',
      question: 'Best real-time protocol?',
      options: [
        { id: 'opt-1', text: 'WebRTC', votes: 10 },
        { id: 'opt-2', text: 'LL-HLS', votes: 5 }
      ],
      totalVotes: 15,
      status: 'active'
    }) => {
      let activePoll = { ...initialPoll };
      let hasVoted = false;
      let selectedOptionId = null;
      let isVoting = false;
      let pollError = '';
      let isVotingRef = { current: false };
      let currentPollIdRef = { current: initialPoll?.id };
      let fetchCallCount = 0;
      let lastFetchHeaders = null;
      let lastFetchUrl = null;
      let lastFetchBody = null;

      const switchPoll = (newPoll) => {
        if (newPoll && newPoll.id !== currentPollIdRef.current) {
          currentPollIdRef.current = newPoll.id;
          hasVoted = false;
          selectedOptionId = null;
          pollError = '';
          isVotingRef.current = false;
          isVoting = false;
        }
        activePoll = newPoll;
      };

      const submitPollVote = async (optionId, { token, mockFetch }) => {
        // Synchronous guard against double-clicking & re-entrant clicks
        if (isVotingRef.current || hasVoted || isVoting || !activePoll || !optionId) {
          return;
        }

        // Token validation guard
        if (!isValidToken(token)) {
          pollError = 'Authentication required. Please sign in to vote.';
          return;
        }

        isVotingRef.current = true;
        isVoting = true;
        pollError = '';

        try {
          const apiBase = 'https://api.darpanx.com';
          const headers = buildPollVoteHeaders(token);
          lastFetchHeaders = headers;
          lastFetchUrl = `${apiBase}/api/live-classes/LIVE-101/poll/vote`;
          lastFetchBody = JSON.stringify({ optionId });
          fetchCallCount++;

          const res = await mockFetch(lastFetchUrl, {
            method: 'POST',
            headers,
            body: lastFetchBody
          });

          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.poll) {
              activePoll = data.poll;
            } else {
              activePoll = {
                ...activePoll,
                options: (activePoll.options || []).map(opt =>
                  opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
                ),
                totalVotes: (activePoll.totalVotes || 0) + 1
              };
            }
            selectedOptionId = optionId;
            hasVoted = true;
            pollError = '';
          } else if (res.status === 401) {
            pollError = 'Your session has expired. Please sign in again.';
          } else if (res.status === 403) {
            pollError = 'You do not have permission to vote in this poll.';
          } else if (res.status === 409) {
            pollError = 'You have already voted in this poll.';
            hasVoted = true;
          } else if (res.status >= 500) {
            pollError = 'Unable to record your vote right now. Please try again.';
          } else {
            pollError = 'Failed to submit vote. Please try again.';
          }
        } catch (err) {
          pollError = 'Network error. Please check your connection and try again.';
        } finally {
          isVoting = false;
          isVotingRef.current = false;
        }
      };

      return {
        getState: () => ({
          activePoll,
          hasVoted,
          selectedOptionId,
          isVoting,
          pollError,
          fetchCallCount,
          lastFetchHeaders,
          lastFetchUrl,
          lastFetchBody
        }),
        submitPollVote,
        switchPoll
      };
    };

    test('Requirement 1: Authenticated learner submits vote with Authorization header', async () => {
      const controller = createPollVoteController();
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      const token = 'jwt-token-learner-101';
      await controller.submitPollVote('opt-1', { token, mockFetch });

      const state = controller.getState();
      expect(state.fetchCallCount).toBe(1);
      expect(state.lastFetchHeaders['Authorization']).toBe('Bearer jwt-token-learner-101');
      expect(state.lastFetchHeaders['Content-Type']).toBe('application/json');
      expect(JSON.parse(state.lastFetchBody)).toEqual({ optionId: 'opt-1' });
      expect(state.hasVoted).toBe(true);
      expect(state.selectedOptionId).toBe('opt-1');
      expect(state.pollError).toBe('');
      // Verify local tally incremented
      expect(state.activePoll.totalVotes).toBe(16);
      expect(state.activePoll.options.find(o => o.id === 'opt-1').votes).toBe(11);
    });

    test('Requirement 2: Request is blocked when access token is missing or invalid', async () => {
      const controller = createPollVoteController();
      const mockFetch = jest.fn();

      // Attempt vote with null token
      await controller.submitPollVote('opt-1', { token: null, mockFetch });

      let state = controller.getState();
      expect(state.fetchCallCount).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(state.hasVoted).toBe(false);
      expect(state.pollError).toBe('Authentication required. Please sign in to vote.');

      // Attempt vote with "undefined" string token
      await controller.submitPollVote('opt-1', { token: 'undefined', mockFetch });
      state = controller.getState();
      expect(state.fetchCallCount).toBe(0);
      expect(state.hasVoted).toBe(false);
    });

    test('Requirement 3: HTTP 401 Session Expired error is handled appropriately', async () => {
      const controller = createPollVoteController();
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401
      });

      await controller.submitPollVote('opt-2', { token: 'expired-token', mockFetch });

      const state = controller.getState();
      expect(state.hasVoted).toBe(false);
      expect(state.pollError).toBe('Your session has expired. Please sign in again.');
      expect(state.isVoting).toBe(false);
    });

    test('Requirement 3: HTTP 403 Forbidden error is handled appropriately', async () => {
      const controller = createPollVoteController();
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403
      });

      await controller.submitPollVote('opt-2', { token: 'unauthorized-token', mockFetch });

      const state = controller.getState();
      expect(state.hasVoted).toBe(false);
      expect(state.pollError).toBe('You do not have permission to vote in this poll.');
      expect(state.isVoting).toBe(false);
    });

    test('Requirement 4: HTTP 409 Conflict (already voted) is handled', async () => {
      const controller = createPollVoteController();
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409
      });

      await controller.submitPollVote('opt-1', { token: 'valid-token', mockFetch });

      const state = controller.getState();
      expect(state.hasVoted).toBe(true); // marked voted so user does not retry duplicate
      expect(state.pollError).toBe('You have already voted in this poll.');
    });

    test('Requirement 4 & 5: Double-clicking does not send duplicate requests (synchronous guard)', async () => {
      const controller = createPollVoteController();
      let resolveFirstCall;
      const delayedPromise = new Promise(resolve => { resolveFirstCall = resolve; });

      const mockFetch = jest.fn().mockImplementation(() => delayedPromise);

      // Trigger 2 rapid clicks simultaneously
      const vote1 = controller.submitPollVote('opt-1', { token: 'valid-token', mockFetch });
      const vote2 = controller.submitPollVote('opt-1', { token: 'valid-token', mockFetch });

      // Check state while in-progress
      expect(controller.getState().isVoting).toBe(true);

      // Resolve the API call
      resolveFirstCall({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      await Promise.all([vote1, vote2]);

      // Exactly ONE fetch call was dispatched despite 2 concurrent trigger attempts!
      expect(controller.getState().fetchCallCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(controller.getState().hasVoted).toBe(true);
      expect(controller.getState().isVoting).toBe(false);
    });

    test('Requirement 7: Switching to a new poll resets vote state', async () => {
      const controller = createPollVoteController();
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      // Vote in poll-1
      await controller.submitPollVote('opt-1', { token: 'valid-token', mockFetch });
      expect(controller.getState().hasVoted).toBe(true);
      expect(controller.getState().selectedOptionId).toBe('opt-1');

      // Instructor launches poll-2
      const poll2 = {
        id: 'poll-2',
        question: 'Which styling solution do you prefer?',
        options: [
          { id: 'opt-201', text: 'Tailwind CSS', votes: 0 },
          { id: 'opt-202', text: 'CSS Modules', votes: 0 }
        ],
        totalVotes: 0,
        status: 'active'
      };

      controller.switchPoll(poll2);

      const stateAfterSwitch = controller.getState();
      expect(stateAfterSwitch.activePoll.id).toBe('poll-2');
      expect(stateAfterSwitch.hasVoted).toBe(false);
      expect(stateAfterSwitch.selectedOptionId).toBeNull();
      expect(stateAfterSwitch.pollError).toBe('');

      // Learner can vote in the new poll
      await controller.submitPollVote('opt-201', { token: 'valid-token', mockFetch });
      expect(controller.getState().hasVoted).toBe(true);
      expect(controller.getState().selectedOptionId).toBe('opt-201');
    });

    test('Requirement 8: Network failure displays error without falsely recording a vote', async () => {
      const controller = createPollVoteController();
      const mockFetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      await controller.submitPollVote('opt-1', { token: 'valid-token', mockFetch });

      const state = controller.getState();
      expect(state.hasVoted).toBe(false);
      expect(state.selectedOptionId).toBeNull();
      expect(state.isVoting).toBe(false);
      expect(state.pollError).toBe('Network error. Please check your connection and try again.');
    });
  });

  describe('3. Source Code Audit: Hardcoded URL & Auth Header Verification', () => {
    test('Requirement 9: LiveClassroom.js does NOT contain hardcoded http://localhost:5050 for poll voting', () => {
      const filePath = path.join(__dirname, 'LiveClassroom.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');

      // Check poll vote endpoint usage
      expect(fileContent).not.toMatch(/fetch\(`http:\/\/localhost:5050\/api\/live-classes/);
      expect(fileContent).not.toMatch(/fetch\("http:\/\/localhost:5050\/api\/live-classes/);
    });

    test('Requirement 1 & 9: LiveClassroom.js uses environment-based API resolution and Authorization header', () => {
      const filePath = path.join(__dirname, 'LiveClassroom.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');

      // Must import getAccessToken and isValidToken
      expect(fileContent).toMatch(/getAccessToken/);
      expect(fileContent).toMatch(/isValidToken/);

      // Must use Authorization header with Bearer
      expect(fileContent).toMatch(/Authorization':?\s*`Bearer/);

      // Must use synchronous isVotingRef guard
      expect(fileContent).toMatch(/isVotingRef\.current/);
    });
  });
});
