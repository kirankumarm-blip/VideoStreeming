import React from 'react';

/**
 * Visual Checklist of Password Requirements
 * Dynamically updates checkmarks and colors as user types.
 */
const PasswordRequirementList = ({ requirements = [] }) => {
  if (!requirements || requirements.length === 0) return null;

  return (
    <div
      className="password-requirements-container"
      style={{
        marginTop: '8px',
        padding: '10px 12px',
        borderRadius: '10px',
        backgroundColor: 'var(--bg-tertiary, rgba(255, 255, 255, 0.04))',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        transition: 'all 0.25s ease'
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary, #94a3b8)',
          marginBottom: '6px',
          letterSpacing: '0.2px'
        }}
      >
        Password Requirements:
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '6px 10px'
        }}
      >
        {requirements.map((req) => (
          <div
            key={req.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: req.met
                ? 'var(--color-success, #10b981)'
                : 'var(--text-secondary, #94a3b8)',
              fontWeight: req.met ? 600 : 400,
              transition: 'color 0.2s ease'
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: req.met
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(148, 163, 184, 0.12)',
                color: req.met ? '#10b981' : 'var(--text-secondary, #94a3b8)',
                fontSize: '9.5px',
                fontWeight: 700,
                flexShrink: 0,
                transition: 'all 0.2s ease'
              }}
            >
              {req.met ? '✓' : '•'}
            </span>
            <span style={{ lineHeight: 1.2 }}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordRequirementList;
