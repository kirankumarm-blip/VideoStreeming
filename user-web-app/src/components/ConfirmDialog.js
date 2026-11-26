import React from 'react';

/**
 * Reusable accessible Confirmation Dialog for destructive operations
 */
export const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const accentColor = isDanger ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#3b82f6');

  return (
    <div
      className="modal-overlay"
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
        className="glass-card animate-fade-in modal-dialog"
      >
        <div
          className="modal-icon-circle"
          style={{
            background: `${accentColor}1f`,
            color: accentColor
          }}
        >
          {isDanger ? (
            <i className="fa-solid fa-triangle-exclamation">⚠</i>
          ) : (
            <i className="fa-solid fa-circle-question">?</i>
          )}
        </div>

        <h3 id="confirm-dialog-title" className="modal-title">
          {title}
        </h3>

        <p id="confirm-dialog-desc" className="modal-desc">
          {message}
        </p>

        <div className="modal-actions">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="btn btn-secondary modal-btn-cancel"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="btn modal-btn-confirm"
            style={{
              background: accentColor,
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
