import React from 'react';
import ReactDOM from 'react-dom';

const CertificatePanel = ({
  certificate,
  isOpen,
  onClose,
  onViewAllCertificates
}) => {
  if (!isOpen || !certificate) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '680px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderRadius: '20px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Certificate Header Bar */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏆</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                Official Course Certificate
              </h4>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Verified & Issued by XLurn Academy</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Certificate Body Container */}
        <div style={{
          padding: '36px 32px',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          borderBottom: '1px solid #e2e8f0',
          position: 'relative'
        }}>
          {/* Decorative Corner Borders */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '24px',
            height: '24px',
            borderTop: '2px solid #d97706',
            borderLeft: '2px solid #d97706'
          }} />
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '24px',
            height: '24px',
            borderTop: '2px solid #d97706',
            borderRight: '2px solid #d97706'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            width: '24px',
            height: '24px',
            borderBottom: '2px solid #d97706',
            borderLeft: '2px solid #d97706'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            width: '24px',
            height: '24px',
            borderBottom: '2px solid #d97706',
            borderRight: '2px solid #d97706'
          }} />

          <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '2px', color: '#b45309', textTransform: 'uppercase', marginBottom: '8px' }}>
            Certificate of Completion
          </span>

          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
            This certifies that
          </p>

          <h2 style={{ margin: '0 0 14px 0', fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
            {certificate.learnerName || 'Learner'}
          </h2>

          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#475569', maxWidth: '480px', lineHeight: 1.5 }}>
            has successfully mastered the chapter assessment and curriculum for:
          </p>

          <div style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#1e3a8a',
            padding: '10px 24px',
            background: 'rgba(37, 99, 235, 0.08)',
            borderRadius: '10px',
            marginBottom: '20px',
            border: '1px solid rgba(37, 99, 235, 0.2)'
          }}>
            {certificate.title || 'Course Certificate'}
          </div>

          {/* Details Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: '520px',
            marginTop: '8px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Grade / Score</span>
              <strong style={{ fontSize: '15px', color: '#059669' }}>{certificate.score || '100%'}</strong>
            </div>

            <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Issued Date</span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{certificate.issueDate || 'Today'}</strong>
            </div>

            <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Credential ID</span>
              <code style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                {certificate.credentialId || 'CERT-VERIFIED-2026'}
              </code>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🖨️ Print / Save PDF
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onViewAllCertificates && (
              <button
                onClick={() => {
                  onClose();
                  onViewAllCertificates();
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Go to My Certificates ➔
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#0f172a',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CertificatePanel;
