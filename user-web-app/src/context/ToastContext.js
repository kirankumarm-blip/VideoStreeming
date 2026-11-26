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
      <aside
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none',
          maxWidth: '420px',
          width: 'calc(100% - 48px)'
        }}
      >
        {toasts.map((item) => {
          const colors = getToastColors(item.type);
          return (
            <div
              key={item.id}
              role="alert"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'var(--bg-secondary, #1a1a24)',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '14px',
                lineHeight: '1.45',
                animation: 'slideInRight 0.25s ease-out',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  color: colors.color,
                  lineHeight: 1,
                  marginTop: '1px',
                  flexShrink: 0
                }}
              >
                <i className={`fa-solid ${colors.icon}`}>{colors.fallbackIcon}</i>
              </div>
              <div style={{ flex: 1, wordBreak: 'break-word' }}>
                {typeof item.message === 'string' ? item.message : JSON.stringify(item.message)}
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                aria-label="Close notification"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #a1a1aa)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '2px 4px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                  transition: 'opacity 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
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
