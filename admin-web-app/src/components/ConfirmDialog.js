import React from 'react';

/**
 * Reusable accessible Confirmation Dialog for destructive operations (delete, deactivate, etc.)
 */
export const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'primary'
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const accentColor = isDanger ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#3b82f6');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20000,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading && onCancel) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '28px 24px',
          textAlign: 'center',
          background: 'var(--bg-secondary, #1a1a24)',
          color: 'var(--text-primary, #ffffff)',
          border: `1px solid var(--border-color, rgba(255, 255, 255, 0.1))`,
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)'
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `${accentColor}1f`,
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            fontSize: '26px'
          }}
        >
          {isDanger ? (
            <i className="fa-solid fa-triangle-exclamation">⚠</i>
          ) : (
            <i className="fa-solid fa-circle-question">?</i>
          )}
        </div>

        <h3
          id="confirm-dialog-title"
          style={{
            fontSize: '19px',
            fontWeight: 700,
            marginBottom: '10px',
            color: 'var(--text-primary, #ffffff)'
          }}
        >
          {title}
        </h3>

        <p
          id="confirm-dialog-desc"
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary, #a1a1aa)',
            marginBottom: '26px',
            lineHeight: '1.5'
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="btn btn-secondary"
            style={{
              flex: 1,
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="btn"
            style={{
              flex: 1,
              padding: '10px 18px',
              fontSize: '13px',
              background: accentColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: `0 4px 14px ${accentColor}40`
            }}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
