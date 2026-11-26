import { logger, sanitizeForLog, shouldLog } from './logger';

describe('Production Logger & Sensitive Data Redaction Utility', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleSpy = {};

  beforeEach(() => {
    consoleSpy.log = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleSpy.debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleSpy.info = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleSpy.warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleSpy.error = jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    delete window.__ENABLE_DEBUG_LOGGER__;
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    process.env.NODE_ENV = originalEnv;
  });

  describe('sanitizeForLog', () => {
    test('redacts JWT tokens in string messages', () => {
      const rawMsg = 'Received token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c for user';
      const sanitized = sanitizeForLog(rawMsg);
      expect(sanitized).toBe('Received token: [REDACTED_JWT] for user');
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    test('redacts Bearer tokens in string messages', () => {
      const rawHeader = 'Authorization: Bearer mySecretAccessToken12345';
      const sanitized = sanitizeForLog(rawHeader);
      expect(sanitized).toBe('Authorization: Bearer [REDACTED]');
    });

    test('redacts sensitive object keys (token, password, secret, otp, etc.)', () => {
      const rawObj = {
        id: 'usr_101',
        name: 'John Doe',
        email: 'john@example.com',
        token: 'sensitive_jwt_token',
        accessToken: 'xyz_access',
        refreshToken: 'xyz_refresh',
        password: 'SuperSecretPassword!123',
        otp: '123456',
        secret: 'api_secret_key'
      };

      const sanitized = sanitizeForLog(rawObj);

      expect(sanitized.id).toBe('usr_101');
      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.otp).toBe('[REDACTED]');
      expect(sanitized.secret).toBe('[REDACTED]');
    });

    test('redacts sensitive keys in nested objects and arrays', () => {
      const complexData = {
        user: {
          profile: {
            auth: 'token_val',
            credentials: {
              password: '123'
            }
          }
        },
        items: [
          { apiKey: 'public_key', secret: 'hide_me' }
        ]
      };

      const sanitized = sanitizeForLog(complexData);
      expect(sanitized.user.profile.auth).toBe('[REDACTED]');
      expect(sanitized.user.profile.credentials.password).toBe('[REDACTED]');
      expect(sanitized.items[0].secret).toBe('[REDACTED]');
      expect(sanitized.items[0].apiKey).toBe('public_key');
    });

    test('handles circular object references safely without throwing', () => {
      const circularObj = { name: 'Root' };
      circularObj.self = circularObj;

      expect(() => {
        const sanitized = sanitizeForLog(circularObj);
        expect(sanitized.self).toBe('[Circular/MaxDepth]');
      }).not.toThrow();
    });

    test('sanitizes Error messages and stacks', () => {
      const err = new Error('Auth failed for token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefg12345');
      const sanitized = sanitizeForLog(err);
      expect(sanitized.message).toContain('[REDACTED_JWT]');
      expect(sanitized.message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });

  describe('logger behavior across environments', () => {
    test('suppresses debug, log, and warn in production environment by default', () => {
      process.env.NODE_ENV = 'production';

      logger.debug('Testing debug message', { token: 'secret' });
      logger.log('Testing log message');
      logger.warn('Testing warning message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    test('allows error logging in production but sanitizes contents', () => {
      process.env.NODE_ENV = 'production';

      logger.error('Critical failure with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefg12345', {
        password: 'mySecretPassword'
      });

      expect(consoleSpy.error).toHaveBeenCalled();
      const firstArg = consoleSpy.error.mock.calls[0][0];
      const secondArg = consoleSpy.error.mock.calls[0][1];

      expect(firstArg).toContain('[REDACTED_JWT]');
      expect(secondArg.password).toBe('[REDACTED]');
    });

    test('enables logging when localStorage ENABLE_DEBUG_LOGGER is set to "true"', () => {
      process.env.NODE_ENV = 'production';
      localStorage.setItem('ENABLE_DEBUG_LOGGER', 'true');

      logger.debug('Troubleshooting in production', { token: 'secret_token_123' });

      expect(consoleSpy.debug).toHaveBeenCalled();
      const loggedObj = consoleSpy.debug.mock.calls[0][1];
      expect(loggedObj.token).toBe('[REDACTED]');
    });

    test('outputs sanitized logs in non-production environments', () => {
      process.env.NODE_ENV = 'development';

      logger.debug('Dev debug message', { password: '123' });
      expect(consoleSpy.debug).toHaveBeenCalledWith('Dev debug message', { password: '[REDACTED]' });

      logger.warn('Dev warning message', 'Bearer token123');
      expect(consoleSpy.warn).toHaveBeenCalledWith('Dev warning message', 'Bearer [REDACTED]');
    });
  });
});
