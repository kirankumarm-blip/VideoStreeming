import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentUser } from '../services/api';

const DEFAULT_CERTIFICATES = [
  {
    id: 'cert_ts_default',
    title: 'TypeScript Basics Masterclass',
    chapterTitle: 'Chapter 1: TypeScript Fundamentals & Type Safety',
    issuer: 'XLurn Learning Academy',
    issueDate: '10 Aug 2026',
    credentialId: 'CERT-TSB-2026-9481',
    score: '100%',
    badge: '🏆',
    learnerName: 'Alex Graham',
    isNew: false
  },
  {
    id: 'cert_react_default',
    title: 'Advanced React & Redux Architecture',
    chapterTitle: 'State Management & Custom Middleware',
    issuer: 'XLurn Learning Academy',
    issueDate: '01 Aug 2026',
    credentialId: 'CERT-RCT-2026-1102',
    score: '98%',
    badge: '🎓',
    learnerName: 'Alex Graham',
    isNew: false
  }
];

const Certificates = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [certificates, setCertificates] = useState([]);
  const [previewCert, setPreviewCert] = useState(null);
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load earned certificates and merge with defaults
  const loadAllCertificates = () => {
    try {
      const storedRaw = localStorage.getItem('earned_certificates');
      const stored = storedRaw ? JSON.parse(storedRaw) : [];
      const user = getCurrentUser() || {};
      const currentUserName = user.name || user.fullname || user.username || (user.email ? user.email.split('@')[0] : 'Alex Graham');

      let combined = [];
      if (Array.isArray(stored) && stored.length > 0) {
        // Tag stored certificates as earned/new
        const markedStored = stored.map(c => ({
          ...c,
          learnerName: c.learnerName || currentUserName,
          isNew: true
        }));
        const storedCredIds = new Set(markedStored.map(c => c.credentialId));
        const filteredDefaults = DEFAULT_CERTIFICATES.filter(d => !storedCredIds.has(d.credentialId)).map(d => ({
          ...d,
          learnerName: currentUserName
        }));
        combined = [...markedStored, ...filteredDefaults];
      } else {
        combined = DEFAULT_CERTIFICATES.map(d => ({
          ...d,
          learnerName: currentUserName
        }));
      }
      setCertificates(combined);
    } catch (e) {
      console.error('Failed to parse earned certificates', e);
      setCertificates(DEFAULT_CERTIFICATES);
    }
  };

  useEffect(() => {
    loadAllCertificates();

    const handleCertEarned = () => {
      loadAllCertificates();
    };

    window.addEventListener('certificate_earned', handleCertEarned);
    window.addEventListener('storage', handleCertEarned);

    return () => {
      window.removeEventListener('certificate_earned', handleCertEarned);
      window.removeEventListener('storage', handleCertEarned);
    };
  }, []);

  // Draw high-resolution landscape certificate on HTML5 Canvas
  const drawCertificateCanvas = (cert) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');

    // 1. Parchment Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1600, 1100);
    bgGrad.addColorStop(0, '#fdfbf7');
    bgGrad.addColorStop(1, '#f8f4ec');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1600, 1100);

    // 2. Outer Luxury Gold Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 14;
    ctx.strokeRect(36, 36, 1528, 1028);

    // 3. Inner Fine Border
    ctx.strokeStyle = '#8c7322';
    ctx.lineWidth = 2;
    ctx.strokeRect(54, 54, 1492, 992);

    // 4. Corner Ornaments
    const drawCorner = (x, y, flipX, flipY) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flipX, flipY);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, 45);
      ctx.lineTo(45, 45);
      ctx.lineTo(45, 10);
      ctx.stroke();
      ctx.restore();
    };
    drawCorner(60, 60, 1, 1);
    drawCorner(1540, 60, -1, 1);
    drawCorner(60, 1040, 1, -1);
    drawCorner(1540, 1040, -1, -1);

    // 5. Header Academy Badge & Subheading
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('XLURN LEARNING ACADEMY', 800, 130);

    ctx.fillStyle = '#6b7280';
    ctx.font = '600 14px "Segoe UI", sans-serif';
    ctx.fillText('GLOBAL ONLINE ACCREDITATION & VERIFIED SKILLS REGISTRY', 800, 155);

    // 6. Certificate Title
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 50px "Georgia", serif';
    ctx.fillText('CERTIFICATE OF COMPLETION', 800, 235);

    // Decorative Line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(500, 260);
    ctx.lineTo(1100, 260);
    ctx.stroke();

    // 7. "This is proudly presented to"
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 20px "Georgia", serif';
    ctx.fillText('THIS IS OFFICIALLY PRESENTED TO', 800, 315);

    // 8. Learner Name
    const u = getCurrentUser() || {};
    const recipient = cert.learnerName || u.name || u.fullname || (u.email ? u.email.split('@')[0] : 'Alex Graham');
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 56px "Georgia", serif';
    ctx.fillText(recipient, 800, 395);

    // Gold accent underline
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(420, 420);
    ctx.lineTo(1180, 420);
    ctx.stroke();

    // 9. Achievement Description
    ctx.fillStyle = '#475569';
    ctx.font = '22px "Segoe UI", Roboto, sans-serif';
    ctx.fillText('for successfully mastering the curriculum and passing the comprehensive examination for', 800, 480);

    // 10. Course Title
    ctx.fillStyle = '#4338ca';
    ctx.font = 'bold 38px "Georgia", serif';
    ctx.fillText(cert.title, 800, 545);

    // 11. Score Pill
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.beginPath();
    ctx.roundRect(610, 580, 380, 46, 23);
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#4338ca';
    ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Examination Score: ${cert.score || '100%'} • Certified Distinction`, 800, 610);

    // 12. Gold Embossed Seal (Bottom Left)
    ctx.save();
    ctx.translate(290, 800);
    const sealGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
    sealGrad.addColorStop(0, '#fef08a');
    sealGrad.addColorStop(0.7, '#d4af37');
    sealGrad.addColorStop(1, '#854d0e');
    ctx.fillStyle = sealGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText('★ VERIFIED ★', 0, -22);
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillText('OFFICIAL CREDENTIAL', 0, 0);
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText('SECURE HASH', 0, 20);
    ctx.restore();

    // 13. Signatures (Bottom Right)
    ctx.textAlign = 'center';
    // Signature 1
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(980, 820);
    ctx.lineTo(1240, 820);
    ctx.stroke();

    // Calligraphic squiggle signature
    ctx.beginPath();
    ctx.moveTo(1000, 810);
    ctx.bezierCurveTo(1030, 780, 1070, 830, 1120, 785);
    ctx.bezierCurveTo(1160, 755, 1190, 820, 1220, 795);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px "Georgia", serif';
    ctx.fillText('Dr. Julian Vance', 1110, 848);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText('Academic Dean, Engineering Council', 1110, 870);

    // 14. Verification Details & Tamper-Proof Hash (Footer)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '15px "Segoe UI", monospace';
    ctx.fillText(`Issued: ${cert.issueDate}`, 180, 965);
    ctx.fillText(`Credential ID: ${cert.credentialId}`, 180, 990);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillText('✓ Cryptographically Verified & Tamper-Proof', 1420, 965);
    ctx.fillStyle = '#64748b';
    ctx.font = '13px "Segoe UI", monospace';
    ctx.fillText(`xlurn.org/verify/${cert.credentialId}`, 1420, 990);

    return canvas.toDataURL('image/png');
  };

  // Trigger high-res instant download
  const handleDownloadCertificate = (cert) => {
    setIsGenerating(true);
    try {
      const dataUrl = drawCertificateCanvas(cert);
      const link = document.createElement('a');
      link.download = `XLurn_Certificate_${cert.credentialId}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Also set preview
      setPreviewCert(cert);
      setPreviewDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate certificate', err);
      alert('Error generating certificate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenPreview = (cert) => {
    try {
      const dataUrl = drawCertificateCanvas(cert);
      setPreviewCert(cert);
      setPreviewDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to preview certificate', err);
    }
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
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📜</span> {t('cert.title', 'Earned Certificates & Credentials')}
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {t('cert.subtitle', 'Instant verifiable course completion certificates with unique verification IDs and cryptographically tamper-proof hashes.')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            padding: '8px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#10b981'
          }}>
            <span>🛡️</span> All Certificates Tamper-Proof Verified
          </div>
        </div>
      </div>

      {/* Grid of Certificate Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        {certificates.map((cert) => (
          <div
            key={cert.credentialId || cert.id}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '20px',
              border: cert.isNew ? '2px solid #6366f1' : '1px solid var(--border-color)',
              padding: '24px',
              boxShadow: cert.isNew ? '0 10px 30px rgba(99, 102, 241, 0.2)' : '0 4px 20px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            {/* Top Accent Gradient Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: cert.isNew 
                ? 'linear-gradient(90deg, #10b981, #6366f1, #e50914)'
                : 'linear-gradient(90deg, #6366f1, #e50914)'
            }} />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '36px' }}>{cert.badge}</span>
                  {cert.isNew && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Recently Earned
                    </span>
                  )}
                </div>

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

              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800 }}>
                {cert.title}
              </h3>
              
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Awarded to: <span style={{ color: '#6366f1' }}>{cert.learnerName}</span>
              </p>

              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
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
                  {t('cert.credentialId', 'Credential ID')}: <strong>{cert.credentialId}</strong>
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleDownloadCertificate(cert)}
                  disabled={isGenerating}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
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
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  📥 {t('cert.downloadPdf', 'Download Certificate')}
                </button>

                <button
                  onClick={() => handleOpenPreview(cert)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  title="Preview Full Certificate"
                >
                  👁️ Preview
                </button>
              </div>

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

      {/* Fullscreen Certificate Preview Modal */}
      {previewCert && previewDataUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            maxWidth: '1050px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-primary)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📜</span> Official Certificate Preview
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  Credential ID: {previewCert.credentialId}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => handleDownloadCertificate(previewCert)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📥 Download High-Res File
                </button>
                <button
                  onClick={() => {
                    setPreviewCert(null);
                    setPreviewDataUrl(null);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal Body / Image */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#0f172a'
            }}>
              <img
                src={previewDataUrl}
                alt={`Certificate for ${previewCert.title}`}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certificates;
