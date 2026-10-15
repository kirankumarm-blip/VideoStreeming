import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Certificates = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [certificates] = useState([
    {
      id: 1,
      title: 'TypeScript Basics Masterclass',
      issuer: 'LurnAx Academy',
      issueDate: '10 Aug 2026',
      credentialId: 'CERT-TSB-2026-9481',
      score: '95%',
      badge: '🎓'
    },
    {
      id: 2,
      title: 'Advanced React & Redux Architecture',
      issuer: 'LurnAx Academy',
      issueDate: '01 Aug 2026',
      credentialId: 'CERT-RCT-2026-1102',
      score: '98%',
      badge: '🏆'
    }
  ]);

  const handleDownloadCertificate = (cert) => {
    alert(`${t('cert.downloading', 'Downloading certificate for')} "${cert.title}" (${t('cert.credentialId', 'Credential ID')}: ${cert.credentialId})`);
  };

  const handleAddToLinkedIn = (cert) => {
    const orgName = 'XLurn Learning Academy';
    const certName = cert.title;
    const certId = cert.credentialId;
    const certUrl = window.location.origin;

    const date = new Date(cert.issueDate || Date.now());
    const year = isNaN(date.getFullYear()) ? new Date().getFullYear() : date.getFullYear();
    const month = isNaN(date.getMonth()) ? new Date().getMonth() + 1 : date.getMonth() + 1;

    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(certName)}&organizationName=${encodeURIComponent(orgName)}&issueYear=${year}&issueMonth=${month}&certId=${encodeURIComponent(certId)}&certUrl=${encodeURIComponent(certUrl)}`;
    
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{
      padding: '32px 40px',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>📜</span> {t('cert.title', 'Earned Certificates & Credentials')}
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {t('cert.subtitle', 'View and download your official course completion certificates and skill verification badges.')}
        </p>
      </div>

      {/* Grid of Certificate Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '20px'
      }}>
        {certificates.map((cert) => (
          <div
            key={cert.id}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top Accent Gradient Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #6366f1, #e50914)'
            }} />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '36px' }}>{cert.badge}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: '#6366f1',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  {t('cert.verifiedScore', 'Verified Score')}: {cert.score}
                </span>
              </div>

              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700 }}>
                {cert.title}
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t('cert.issuedBy', 'Issued by')} {cert.issuer} • {cert.issueDate}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <div style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  display: 'inline-block'
                }}>
                  {t('cert.credentialId', 'Credential ID')}: {cert.credentialId}
                </div>

                <span style={{
                  fontSize: '11px',
                  color: '#10b981',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ✓ {t('cert.tamperProof', 'Cryptographically Verified')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleDownloadCertificate(cert)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                📥 {t('cert.downloadPdf', 'Download Certificate (PDF)')}
              </button>

              <button
                onClick={() => handleAddToLinkedIn(cert)}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  background: 'rgba(10, 102, 194, 0.1)',
                  color: '#0a66c2',
                  border: '1px solid rgba(10, 102, 194, 0.35)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#0a66c2';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(10, 102, 194, 0.1)';
                  e.currentTarget.style.color = '#0a66c2';
                }}
                title="Add this verified credential to your LinkedIn profile"
              >
                <i className="fa-brands fa-linkedin" style={{ fontSize: '15px' }} />
                <span>{t('cert.addToLinkedIn', 'Add to LinkedIn Profile')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Certificates;
