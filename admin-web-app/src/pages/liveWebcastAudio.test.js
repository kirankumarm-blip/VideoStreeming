import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LiveWebcasts, { toggleStreamAudioTracks, getAudioTrackActiveState } from './LiveWebcasts';
import { LanguageProvider } from '../context/LanguageContext';

describe('Live Webcast Audio Track Muting and Badge State', () => {
  describe('Helper Functions', () => {
    test('toggleStreamAudioTracks sets all audio tracks to enabled=false when muting', () => {
      const mockTrack1 = { kind: 'audio', enabled: true };
      const mockTrack2 = { kind: 'audio', enabled: true };
      const mockStream = {
        getAudioTracks: () => [mockTrack1, mockTrack2]
      };

      const result = toggleStreamAudioTracks(mockStream, false);
      expect(result).toBe(false);
      expect(mockTrack1.enabled).toBe(false);
      expect(mockTrack2.enabled).toBe(false);
    });

    test('toggleStreamAudioTracks sets all audio tracks to enabled=true when unmuting', () => {
      const mockTrack1 = { kind: 'audio', enabled: false };
      const mockTrack2 = { kind: 'audio', enabled: false };
      const mockStream = {
        getAudioTracks: () => [mockTrack1, mockTrack2]
      };

      const result = toggleStreamAudioTracks(mockStream, true);
      expect(result).toBe(true);
      expect(mockTrack1.enabled).toBe(true);
      expect(mockTrack2.enabled).toBe(true);
    });

    test('toggleStreamAudioTracks handles null or stream without getAudioTracks gracefully', () => {
      expect(toggleStreamAudioTracks(null, false)).toBe(false);
      expect(toggleStreamAudioTracks(null, true)).toBe(true);
      expect(toggleStreamAudioTracks({}, false)).toBe(false);
    });

    test('getAudioTrackActiveState correctly derives state from active audio tracks', () => {
      const activeStream = {
        getAudioTracks: () => [{ kind: 'audio', enabled: true }]
      };
      expect(getAudioTrackActiveState(activeStream, false)).toBe(true);

      const mutedStream = {
        getAudioTracks: () => [{ kind: 'audio', enabled: false }]
      };
      expect(getAudioTrackActiveState(mutedStream, true)).toBe(false);
    });

    test('getAudioTrackActiveState falls back to state parameter when stream has no audio tracks or is null', () => {
      const emptyStream = {
        getAudioTracks: () => []
      };
      expect(getAudioTrackActiveState(emptyStream, true)).toBe(true);
      expect(getAudioTrackActiveState(emptyStream, false)).toBe(false);
      expect(getAudioTrackActiveState(null, true)).toBe(true);
      expect(getAudioTrackActiveState(null, false)).toBe(false);
    });
  });

  describe('LiveWebcasts Component Mic & Audio Track Toggle Integration', () => {
    let mockAudioTrack;
    let mockVideoTrack;
    let mockStream;

    beforeEach(() => {
      mockAudioTrack = {
        kind: 'audio',
        enabled: true,
        readyState: 'live',
        stop: jest.fn(),
        onmute: null,
        onunmute: null,
        onended: null
      };

      mockVideoTrack = {
        kind: 'video',
        enabled: true,
        readyState: 'live',
        stop: jest.fn(),
        onended: null
      };

      mockStream = {
        getAudioTracks: jest.fn(() => [mockAudioTrack]),
        getVideoTracks: jest.fn(() => [mockVideoTrack]),
        getTracks: jest.fn(() => [mockAudioTrack, mockVideoTrack])
      };

      // Mock media devices
      navigator.mediaDevices = {
        getUserMedia: jest.fn().mockResolvedValue(mockStream),
        getDisplayMedia: jest.fn().mockResolvedValue(mockStream)
      };

      // Mock HTMLMediaElement methods
      window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue();
      window.HTMLMediaElement.prototype.pause = jest.fn();

      // Mock WebSocket
      class MockWebSocket {
        constructor() {
          this.readyState = 1;
        }
        send = jest.fn();
        close = jest.fn();
      }
      global.WebSocket = MockWebSocket;

      // Mock BroadcastChannel
      class MockBroadcastChannel {
        constructor() {
          this.name = 'test';
        }
        postMessage = jest.fn();
        close = jest.fn();
      }
      global.BroadcastChannel = MockBroadcastChannel;

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('renders default Mic Live status badge and toolbar button', async () => {
      await act(async () => {
        render(
          <LanguageProvider>
            <LiveWebcasts theme="dark" />
          </LanguageProvider>
        );
      });

      const micBadge = screen.getByTestId('live-mic-badge');
      const micBtn = screen.getByTestId('mic-toggle-btn');

      expect(micBadge).toHaveTextContent(/Mic Live/i);
      expect(micBtn).toHaveTextContent(/Mic Live/i);
    });

    test('toggling mic when camera stream is active sets track.enabled=false and updates badge to Mic Muted', async () => {
      await act(async () => {
        render(
          <LanguageProvider>
            <LiveWebcasts theme="dark" />
          </LanguageProvider>
        );
      });

      // Turn camera ON to initialize mediaStreamRef with audio track
      const camBtn = screen.getByText(/Webcam Off/i);
      await act(async () => {
        fireEvent.click(camBtn);
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      expect(mockAudioTrack.enabled).toBe(true);

      const micBadge = screen.getByTestId('live-mic-badge');
      const micBtn = screen.getByTestId('mic-toggle-btn');
      expect(micBadge).toHaveTextContent(/Mic Live/i);

      // Now click Mute on the mic button
      await act(async () => {
        fireEvent.click(micBtn);
      });

      // Verifies outgoing audio track on the stream is set to enabled = false
      expect(mockAudioTrack.enabled).toBe(false);

      // Verifies badge and button reflect track state directly
      expect(micBadge).toHaveTextContent(/Mic Muted/i);
      expect(micBtn).toHaveTextContent(/Mic Muted/i);

      // Click Unmute: track is re-enabled and badge displays Mic Live
      await act(async () => {
        fireEvent.click(micBtn);
      });

      expect(mockAudioTrack.enabled).toBe(true);
      expect(micBadge).toHaveTextContent(/Mic Live/i);
      expect(micBtn).toHaveTextContent(/Mic Live/i);
    });

    test('audio track hardware mute event synchronizes badge display', async () => {
      await act(async () => {
        render(
          <LanguageProvider>
            <LiveWebcasts theme="dark" />
          </LanguageProvider>
        );
      });

      // Turn on camera
      const camBtn = screen.getByText(/Webcam Off/i);
      await act(async () => {
        fireEvent.click(camBtn);
      });

      // Simulate hardware/external track mute
      mockAudioTrack.enabled = false;
      await act(async () => {
        if (typeof mockAudioTrack.onmute === 'function') {
          mockAudioTrack.onmute();
        }
      });

      const micBadge = screen.getByTestId('live-mic-badge');
      expect(micBadge).toHaveTextContent(/Mic Muted/i);
    });
  });
});
