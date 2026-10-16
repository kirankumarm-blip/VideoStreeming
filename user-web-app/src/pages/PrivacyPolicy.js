import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const PrivacyPolicy = () => {
  const { t } = useLanguage();

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '40px 20px 80px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        padding: '48px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: 'rgba(37, 99, 235, 0.12)',
            color: 'var(--accent-primary, #2563eb)',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: '12px'
          }}>
            Legal Compliance
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            {t('privacy.title', 'Privacy Policy')}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Last Updated: October 2026 | Effective Immediately
          </div>
        </div>

        {/* Quick Summary Notice */}
        <div style={{
          background: 'var(--bg-tertiary)',
          borderLeft: '4px solid var(--accent-primary, #2563eb)',
          padding: '16px 20px',
          borderRadius: '0 10px 10px 0',
          marginBottom: '32px',
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Privacy Summary:</strong> Your privacy and data security are our highest priorities. We collect minimal information strictly required to authenticate your account, deliver Two-Factor Authentication (2FA) OTP codes, process video streaming, issue completion certificates, and deter intellectual property theft via dynamic anti-piracy watermarks. We do not sell your personal data.
        </div>

        {/* Policy Content Sections */}
        <div style={{ fontSize: '14.5px', lineHeight: 1.7, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              1. Information We Collect
            </h2>
            <p>When you register, enroll in courses, or use our virtual classroom, we collect the following categories of information:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li><strong>Account Credentials:</strong> Full name, email address, password hash, role, and avatar.</li>
              <li><strong>Security & Authentication Data:</strong> Mobile phone number or email for One-Time Password (OTP) two-factor verification, login timestamps, and IP addresses.</li>
              <li><strong>Course & Video Progress:</strong> Watch history, playback positions, completed chapters, quiz scores, and certificate issuance records.</li>
              <li><strong>Virtual Classroom Interactions:</strong> Chat messages, raised hand inquiries, poll votes, and live broadcast attendance telemetry.</li>
              <li><strong>Payment Transactions:</strong> Subscription status, plan tier, transaction IDs, and billing receipts (payment credentials like credit card numbers are handled exclusively by certified Level 1 PCI-DSS payment gateways).</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              2. How We Use Your Data
            </h2>
            <p>We process your personal information strictly for legitimate pedagogical and platform operational purposes:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Authenticating user sessions and sending security 2FA OTP codes.</li>
              <li>Delivering low-latency video streaming, adaptive bitrate playback, and live WebRTC webcasts.</li>
              <li>Tracking individual learning progress, scoring multiple-choice quizzes, and generating digital completion certificates.</li>
              <li>Synchronizing collaborative study rooms and student-instructor doubt resolution queues.</li>
              <li>Enforcing our 10-minute inactivity security guard to automatically log out unattended sessions across open browser tabs.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              3. Anti-Piracy Watermarking & Intellectual Property Protection
            </h2>
            <p>
              To protect copyrighted educational content from unauthorized redistribution on piracy networks:
            </p>
            <p style={{ marginTop: '8px' }}>
              The video player embeds a dynamic, semi-transparent watermark displaying your authenticated student identifier and email address at randomized screen intervals. This watermark is generated in real time within your client application and does not collect any additional device metadata beyond your active session identity.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              4. Cookies & Local Storage
            </h2>
            <p>We use localized browser storage (HTML5 <code>localStorage</code> and session tokens) solely for:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Maintaining authenticated session state across navigation.</li>
              <li>Storing user interface preferences (Language, Dark/Light Mode, Theme Customizer colors and fonts).</li>
              <li>Cross-tab communication via <code>BroadcastChannel</code> for live classroom synchronization.</li>
            </ul>
            <p style={{ marginTop: '8px' }}>We do not use third-party behavioral advertising cookies.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              5. Data Security & Two-Factor Authentication
            </h2>
            <p>
              We implement comprehensive organizational and technical security measures, including bcrypt password hashing, SSL/TLS encrypted HTTPS transport, JWT access token isolation, and automated 120-second OTP expiration. While no online transmission is 100% immune, we continuously audit our infrastructure against unauthorized access.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              6. Your Rights (GDPR & CCPA Compliance)
            </h2>
            <p>Depending on your jurisdiction, you retain the following statutory rights:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li><strong>Access:</strong> The right to request an export of your personal information and course records.</li>
              <li><strong>Correction:</strong> The right to update inaccurate personal information in your Profile.</li>
              <li><strong>Erasure:</strong> The right to request permanent deletion of your account and associated watch history.</li>
              <li><strong>Withdrawal of Consent:</strong> The right to cancel your subscription or opt out of non-essential communications.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              7. Contact & Data Protection Officer
            </h2>
            <p>
              For privacy-related inquiries, data deletion requests, or questions regarding this policy, please reach out to our Data Protection Officer at:
            </p>
            <div style={{
              marginTop: '12px',
              padding: '14px 18px',
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontWeight: 600
            }}>
              📧 privacy@xlurn.platform | 📍 Legal Compliance & Data Protection Office
            </div>
          </section>

        </div>

        {/* Footer links */}
        <div style={{
          marginTop: '48px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <Link to="/terms" style={{ color: 'var(--accent-primary, #2563eb)', textDecoration: 'none', fontWeight: 600, fontSize: '13.5px' }}>
            ← View Terms & Conditions
          </Link>
          <Link to="/faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '13.5px' }}>
            Frequently Asked Questions →
          </Link>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
