import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let globalToastEmitter = null;

export const setGlobalToastEmitter = (emitter) => {
  globalToastEmitter = emitter;
};

export const toast = {
  success: (message, duration = 4000) => {
    if (globalToastEmitter) globalToastEmitter('success', message, duration);
  },
  error: (message, duration = 5000) => {
    if (globalToastEmitter) globalToastEmitter('error', message, duration);
  },
  warn: (message, duration = 4500) => {
    if (globalToastEmitter) globalToastEmitter('warning', message, duration);
  },
  info: (message, duration = 4000) => {
    if (globalToastEmitter) globalToastEmitter('info', message, duration);
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = ++toastIdRef.current;
    const newToast = { id, type, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  // Connect global emitter
  React.useEffect(() => {
    setGlobalToastEmitter(addToast);
    return () => {
      setGlobalToastEmitter(null);
    };
  }, [addToast]);

  const value = {
    toast,
    addToast,
    removeToast,
    success: (msg, dur) => addToast('success', msg, dur),
    error: (msg, dur) => addToast('error', msg, dur),
    warn: (msg, dur) => addToast('warning', msg, dur),
    info: (msg, dur) => addToast('info', msg, dur)
  };

  const getToastColors = (type) => {
    switch (type) {
      case 'success':
        return {
          border: '#10b981',
          bg: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          icon: 'fa-circle-check',
          fallbackIcon: '✓'
        };
      case 'error':
        return {
          border: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          icon: 'fa-circle-exclamation',
          fallbackIcon: '✕'
        };
      case 'warning':
        return {
          border: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.12)',
          color: '#f59e0b',
          icon: 'fa-triangle-exclamation',
          fallbackIcon: '⚠'
        };
      case 'info':
      default:
        return {
          border: '#3b82f6',
          bg: 'rgba(59, 130, 246, 0.12)',
          color: '#3b82f6',
          icon: 'fa-circle-info',
          fallbackIcon: 'ℹ'
        };
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Notification Container */}
      <aside
        aria-label="Notifications"
        className="toast-container-aside"
      >
        {toasts.map((item) => {
          const colors = getToastColors(item.type);
          return (
            <div
              key={item.id}
              role="alert"
              className="toast-item-card"
              style={{
                border: `1px solid ${colors.border}`
              }}
            >
              <div
                className="toast-icon-box"
                style={{
                  color: colors.color
                }}
              >
                <i className={`fa-solid ${colors.icon}`}>{colors.fallbackIcon}</i>
              </div>
              <div className="toast-message-text">
                {typeof item.message === 'string' ? item.message : JSON.stringify(item.message)}
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                aria-label="Close notification"
                className="toast-close-button"
              >
                ✕
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast,
      addToast: () => {},
      removeToast: () => {},
      success: toast.success,
      error: toast.error,
      warn: toast.warn,
      info: toast.info
    };
  }
  return context;
};

export default ToastContext;
