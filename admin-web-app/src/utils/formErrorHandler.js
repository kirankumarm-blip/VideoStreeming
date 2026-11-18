/**
 * Centralized Form Error Handling & Request Tracking Utility
 * 
 * Provides robust error parsing, sanitization, request ID / correlation ID tracking,
 * safe status code fallbacks, user-friendly message formatting, and structured logging.
 */

/**
 * Generate a unique client correlation ID for request tracing when the server
 * does not supply an X-Request-ID or X-Correlation-ID.
 * 
 * @returns {string} e.g. "client-7f3b8a1c-..." or fallback timestamp-based ID
 */
export const generateCorrelationId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `client-${crypto.randomUUID()}`;
    }
  } catch (e) {
    // Fall back to pseudo-random string generator
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `client-${timestamp}-${randomPart}`;
};

/**
 * Extract server-provided or client correlation request ID.
 * 
 * Checks in order:
 * 1. Response headers: x-request-id, x-correlation-id, request-id
 * 2. Response body: requestId, request_id, correlationId, correlation_id, id (if structured)
 * 3. Fallback: supplied client correlation ID or newly generated client ID
 * 
 * @param {Response} [response] - Fetch Response object
 * @param {object} [parsedBody] - Parsed response payload
 * @param {string} [clientCorrelationId] - Pre-generated client ID passed in headers
 * @returns {{ requestId: string, isServerId: boolean }}
 */
export const extractRequestId = (response, parsedBody, clientCorrelationId = null) => {
  // 1. Inspect response headers
  if (response && response.headers) {
    try {
      const headerId = 
        response.headers.get('x-request-id') ||
        response.headers.get('X-Request-ID') ||
        response.headers.get('x-correlation-id') ||
        response.headers.get('X-Correlation-ID') ||
        response.headers.get('request-id');
      if (headerId && typeof headerId === 'string' && headerId.trim()) {
        return { requestId: headerId.trim(), isServerId: true };
      }
    } catch (e) {
      // Header extraction error, continue to body
    }
  }

  // 2. Inspect response body fields
  if (parsedBody && typeof parsedBody === 'object') {
    const bodyId = 
      parsedBody.requestId ||
      parsedBody.request_id ||
      parsedBody.correlationId ||
      parsedBody.correlation_id ||
      (typeof parsedBody.id === 'string' && parsedBody.id.startsWith('req') ? parsedBody.id : null);
    if (bodyId && typeof bodyId === 'string' && bodyId.trim()) {
      return { requestId: bodyId.trim(), isServerId: true };
    }
  }

  // 3. Fallback to client correlation ID
  if (clientCorrelationId && typeof clientCorrelationId === 'string' && clientCorrelationId.trim()) {
    return { requestId: clientCorrelationId.trim(), isServerId: false };
  }

  return { requestId: generateCorrelationId(), isServerId: false };
};

/**
 * Patterns matching raw technical errors, database queries, stack traces, and internal file paths.
 */
const TECHNICAL_ERROR_PATTERNS = [
  /select\s+[\s\S]*?\s+from\s+/i,
  /insert\s+into\s+/i,
  /update\s+[\s\S]*?\s+set\s+/i,
  /delete\s+from\s+/i,
  /syntax\s+error\s+at\s+or\s+near/i,
  /relation\s+".*?"\s+does\s+not\s+exist/i,
  /column\s+".*?"\s+does\s+not\s+exist/i,
  /pg_catalog/i,
  /ora-\d{4,5}/i,
  /sqlite3?::/i,
  /sequelize/i,
  /prisma/i,
  /foreign\s+key\s+constraint/i,
  /unique\s+constraint/i,
  /null\s+value\s+in\s+column/i,
  /duplicate\s+key/i,
  /at\s+[\w$.<>]+\s+\(.*?\)/i,
  /\bat\s+(?:file:\/\/|[A-Za-z]:\\|\/).*?:\d+:\d+/i,
  /node_modules/i,
  /webpack:\/\//i,
  /bearer\s+[a-z0-9._-]+/i,
  /<!doctype\s+html/i,
  /<html[\s\S]*?>/i,
  /<body[\s\S]*?>/i
];

/**
 * Checks if a message string contains internal or sensitive technical details.
 * 
 * @param {string} text 
 * @returns {boolean}
 */
export const isSensitiveOrTechnicalMessage = (text) => {
  if (!text || typeof text !== 'string') return false;
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(text));
};

/**
 * Get safe, user-friendly fallback error messages based on HTTP status code.
 * 
 * @param {number} status 
 * @param {string} [formContext] - Context name e.g. "CreateStudyRoom"
 * @returns {string}
 */
export const getSafeStatusFallback = (status, formContext = '') => {
  const isStudyRoom = formContext && formContext.toLowerCase().includes('studyroom');

  switch (status) {
    case 400:
    case 422:
      return isStudyRoom
        ? 'Unable to create Study Room. Please check the entered details.'
        : 'Unable to process request. Please check the entered details.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return isStudyRoom
        ? 'Study room service was not found. Please try again later.'
        : 'Requested resource was not found.';
    case 409:
      return isStudyRoom
        ? 'A study room with this name or code already exists.'
        : 'A resource with these details already exists.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return isStudyRoom
        ? 'Unable to create Study Room right now. Please try again.'
        : 'Unable to complete request right now. Please try again.';
    default:
      if (status >= 500) {
        return isStudyRoom
          ? 'Unable to create Study Room right now. Please try again.'
          : 'Unable to complete request right now. Please try again.';
      }
      return isStudyRoom
        ? 'Unable to create Study Room. Please check the entered details.'
        : 'Unable to complete request. Please try again.';
  }
};

/**
 * Sanitize error message: strips database queries, stack traces, paths, and HTML,
 * returning a clean learner-safe message.
 * 
 * @param {string} rawMessage - Message from server or error object
 * @param {number} [status] - HTTP status code
 * @param {string} [formContext] - Context name
 * @returns {string}
 */
export const sanitizeErrorMessage = (rawMessage, status = 0, formContext = '') => {
  if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
    return getSafeStatusFallback(status, formContext);
  }

  const trimmed = rawMessage.trim();

  // If message contains internal technical leakages or HTML, substitute with safe fallback
  if (isSensitiveOrTechnicalMessage(trimmed)) {
    return getSafeStatusFallback(status, formContext);
  }

  // Remove trailing internal error codes if present, but keep human text
  const clean = trimmed
    .replace(/^Error:\s*/i, '')
    .replace(/\s*\(status:\s*\d+\)$/i, '')
    .trim();

  return clean || getSafeStatusFallback(status, formContext);
};

/**
 * Format error message with request ID for user-facing display.
 * Server-verified IDs are displayed as "Reference ID: <ID>".
 * Client-generated correlation IDs are displayed as "Client Ref: <ID>".
 * 
 * @param {object} params
 * @param {string} params.message
 * @param {string} [params.requestId]
 * @param {boolean} [params.isServerId]
 * @returns {string}
 */
export const formatDisplayErrorMessage = ({ message, requestId, isServerId = true }) => {
  const baseMessage = (message || 'An error occurred. Please try again.').trim();
  if (!requestId) {
    return baseMessage;
  }
  const label = isServerId ? 'Reference ID:' : 'Client Ref:';
  return `${baseMessage} ${label} ${requestId}`;
};

/**
 * Log structured error information to console without leaking sensitive credentials or passwords.
 * 
 * @param {object} params
 * @param {string} params.form - Form name (e.g. "CreateStudyRoom")
 * @param {string} [params.requestId] - Request or correlation ID
 * @param {number|string} [params.status] - HTTP status code
 * @param {string} params.message - Sanitized error message
 */
export const logFormError = ({ form = 'Form', requestId = 'N/A', status = 'N/A', message = 'Error' }) => {
  try {
    console.error('Form submission failed', {
      form,
      requestId,
      status,
      message,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    // Avoid crashing if console.error is mocked or restricted
  }
};

/**
 * Unified async helper for handling form API errors.
 * Safely parses JSON / non-JSON responses, extracts request IDs, sanitizes error messages,
 * formats learner display messages, and logs structured error details.
 * 
 * @param {Response|null} response - Fetch Response object if available
 * @param {Error|null} error - Caught JavaScript/Network error if thrown
 * @param {object} options
 * @param {string} [options.formName="CreateStudyRoom"]
 * @param {string} [options.clientCorrelationId]
 * @returns {Promise<{
 *   displayMessage: string,
 *   rawMessage: string,
 *   requestId: string,
 *   isServerId: boolean,
 *   status: number,
 *   payload: any
 * }>}
 */
export const handleFormApiError = async (response, error = null, options = {}) => {
  const { formName = 'CreateStudyRoom', clientCorrelationId = null } = options;

  let status = 0;
  let parsedBody = null;
  let rawMessage = '';

  if (response) {
    status = response.status || 0;
    try {
      const text = await response.text();
      if (text && text.trim()) {
        try {
          parsedBody = JSON.parse(text);
          rawMessage = parsedBody.message || 
                       parsedBody.error || 
                       parsedBody.detail || 
                       parsedBody.msg || 
                       (typeof parsedBody === 'string' ? parsedBody : '');
        } catch (jsonErr) {
          // Response body was not JSON (e.g. HTML or plain text)
          rawMessage = text;
        }
      }
    } catch (readErr) {
      // Failed to read response body
    }
  } else if (error) {
    // Caught network or client runtime error
    rawMessage = error.name === 'AbortError'
      ? 'Request timed out. Please try again.'
      : 'Network error. Please check your internet connection and try again.';
  }

  // Extract or generate request ID
  const { requestId, isServerId } = extractRequestId(response, parsedBody, clientCorrelationId);

  // Sanitize message
  const sanitizedMessage = sanitizeErrorMessage(rawMessage, status, formName);

  // Format learner display string
  const displayMessage = formatDisplayErrorMessage({
    message: sanitizedMessage,
    requestId,
    isServerId
  });

  // Structured logging
  logFormError({
    form: formName,
    requestId,
    status: status || (error ? 'NETWORK_ERROR' : 'UNKNOWN'),
    message: sanitizedMessage
  });

  return {
    displayMessage,
    rawMessage: sanitizedMessage,
    requestId,
    isServerId,
    status,
    payload: parsedBody
  };
};
