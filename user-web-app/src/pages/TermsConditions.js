import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const TermsConditions = () => {
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
            User Agreement
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            {t('terms.title', 'Terms and Conditions')}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Last Updated: October 2026 | Version 2.4 | Effective for All Users
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
          <strong style={{ color: 'var(--text-primary)' }}>Important Notice:</strong> By creating an account, accessing courses, or participating in live virtual classrooms on XLURN, you enter into a legally binding agreement. Please read these terms carefully, especially provisions regarding <strong>account security (2FA)</strong>, <strong>intellectual property & dynamic watermarking</strong>, <strong>live classroom conduct</strong>, and <strong>refund eligibility</strong>.
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', lineHeight: 1.7, fontSize: '15px' }}>
          
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              1. Acceptance of Terms & Eligibility
            </h2>
            <p style={{ margin: '0 0 10px' }}>
              These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the XLURN platform, including our websites, video streaming services, interactive virtual classrooms, mobile applications, APIs, and downloadable resources (collectively, the &quot;Services&quot;).
            </p>
            <p style={{ margin: 0 }}>
              You must be at least 16 years of age (or the legal age of majority in your jurisdiction) to create an account. If you are under the legal age, you may only access the platform under the supervision of a parent or legal guardian who agrees to be bound by these Terms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              2. Account Security & Two-Factor Authentication (2FA)
            </h2>
            <p style={{ margin: '0 0 10px' }}>
              You agree to provide accurate, current, and complete information during registration and keep your profile credentials up to date.
            </p>
            <ul style={{ margin: '0 0 10px', paddingLeft: '24px' }}>
              <li><strong>Mandatory Two-Factor Authentication:</strong> For enhanced account security and fraud prevention, XLURN requires 2-Step Verification (2FA) via numeric OTP. You are responsible for maintaining access to your registered email address or mobile device.</li>
              <li><strong>Account Non-Transferability:</strong> Accounts are strictly individual. You may not share, sell, rent, or transfer your login credentials or OTP codes to any third party.</li>
              <li><strong>Session Inactivity:</strong> For your security on public or shared terminals, our system enforces automatic cross-tab session termination after 10 minutes of continuous inactivity.</li>
              <li><strong>Security Breach:</strong> You must immediately notify XLURN security (<a href="mailto:security@xlurn.com" style={{ color: 'var(--accent-primary, #2563eb)' }}>security@xlurn.com</a>) if you suspect unauthorized access or compromise of your credentials.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              3. Intellectual Property, Video Streaming & Dynamic Watermarking
            </h2>
            <p style={{ margin: '0 0 10px' }}>
              All video streams, audio recordings, lecture slides, quizzes, code repositories, graphics, and course content available on XLURN are the exclusive proprietary property of XLURN and its accredited instructors, protected under domestic and international copyright laws.
            </p>
            <div style={{
              background: 'var(--bg-tertiary)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '12px'
            }}>
              <strong style={{ color: 'var(--text-primary)' }}>Anti-Piracy Enforcement & Watermarking:</strong>
              <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                To safeguard instructor copyrights, XLURN projects a persistent, semi-transparent, dynamic digital watermark containing your authenticated User ID, name, and email moving randomly across your video player. Any attempt to crop, tamper with, mask, or circumvent this watermark constitutes a material violation of this agreement.
              </p>
            </div>
            <p style={{ margin: 0 }}>
              <strong>Strict Prohibitions:</strong> You may not record (using screen-capture software or hardware capture cards), re-stream, re-upload, broadcast, mirror, sell, or distribute any portion of our course materials. Violators are subject to immediate account termination without refund and legal prosecution under the DMCA and applicable copyright statues.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              4. Virtual Classroom & Live Webcast Code of Conduct
            </h2>
            <p style={{ margin: '0 0 10px' }}>
              XLURN provides interactive live virtual classrooms and study rooms designed for collaborative and respectful academic learning. When participating in live broadcasts, you agree to:
            </p>
            <ul style={{ margin: '0 0 10px', paddingLeft: '24px' }}>
              <li>Maintain professional, respectful, and courteous communication in live chatrooms and Q&A sessions.</li>
              <li>Use the <strong>Raise Hand</strong> feature solely for relevant questions or doubts pertaining to the current lecture topic.</li>
              <li>Never broadcast, share, or submit defamatory, obscene, hateful, harassing, discriminatory, or unlawful materials.</li>
              <li>Respect instructors and fellow learners. Flooding, spamming, self-promotion, trolling, or disruption of the live broadcast will result in immediate dismissal from the session and potential account suspension.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              5. Subscriptions, Billing & Refund Policy
            </h2>
            <p style={{ margin: '0 0 10px' }}>
              Access to premium courses, certifications, and live classroom tiers requires payment of applicable subscription or course fees.
            </p>
            <ul style={{ margin: '0 0 10px', paddingLeft: '24px' }}>
              <li><strong>Billing Cycles:</strong> Subscriptions are billed automatically on a recurring basis (monthly or annually) until cancelled by you through your Account Settings.</li>
              <li><strong>7-Day Money-Back Guarantee:</strong> Individual on-demand course purchases qualify for a full refund within 7 days of purchase, provided you have watched less than 20% of the total course video runtime and have not downloaded any completion certificates.</li>
              <li><strong>Live Webcasts & Special Bootcamps:</strong> Once a live cohort has commenced, cohort registration fees are non-refundable.</li>
              <li><strong>Cancellation:</strong> You may cancel recurring subscriptions at any time; your access will continue through the conclusion of your current prepaid billing cycle.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              6. Assessments, Quizzes & Verifiable Certificates
            </h2>
            <p style={{ margin: '0 0 10px' }}>
              XLURN offers verifiable digital completion certificates upon fulfilling all course modules and scoring above the designated passing grade in required assessments.
            </p>
            <p style={{ margin: 0 }}>
              You agree to uphold strict academic integrity. Using automated bots, sharing answer keys, or engaging third parties to complete assessments on your behalf will result in the immediate forfeiture and revocation of any issued certificates and permanent banishment from the platform.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              7. Termination of Service
            </h2>
            <p style={{ margin: '0 0 10px' }}>
              XLURN reserves the right, in its sole discretion, to suspend or terminate your account and access to the Services with or without notice if:
            </p>
            <ul style={{ margin: '0 0 10px', paddingLeft: '24px' }}>
              <li>You breach any provision of these Terms or associated community guidelines.</li>
              <li>You engage in unauthorized distribution or copying of copyrighted content.</li>
              <li>A chargeback or fraudulent payment is disputed with your payment provider.</li>
              <li>Required by law enforcement or competent court jurisdiction.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              8. Disclaimers & Limitation of Liability
            </h2>
            <p style={{ margin: '0 0 10px' }}>
              The Services and all materials are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, either express or implied. While we strive for 99.9% uptime and optimal streaming quality, XLURN does not warrant uninterrupted or error-free transmissions.
            </p>
            <p style={{ margin: 0 }}>
              To the maximum extent permitted by applicable law, XLURN, its directors, employees, and course creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your access or inability to access the Services.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              9. Governing Law & Dispute Resolution
            </h2>
            <p style={{ margin: 0 }}>
              These Terms shall be governed by and construed in accordance with the laws of the applicable legal jurisdiction, without giving effect to any principles of conflicts of law. Any claims or disputes arising under these Terms shall be resolved through binding, confidential arbitration or through courts of competent jurisdiction.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-primary, #2563eb)' }}>
              10. Contact Us & Legal Inquiries
            </h2>
            <p style={{ margin: '0 0 10px' }}>
              If you have any questions, concerns, or requests regarding these Terms and Conditions or copyright notifications, please reach out to our legal department:
            </p>
            <div style={{
              background: 'var(--bg-tertiary)',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--text-secondary)'
            }}>
              <div><strong>XLURN Legal & Compliance Operations</strong></div>
              <div>Email: <a href="mailto:legal@xlurn.com" style={{ color: 'var(--accent-primary, #2563eb)' }}>legal@xlurn.com</a></div>
              <div>Support: <a href="mailto:support@xlurn.com" style={{ color: 'var(--accent-primary, #2563eb)' }}>support@xlurn.com</a></div>
              <div>Available Monday – Friday, 9:00 AM – 6:00 PM UTC</div>
            </div>
          </section>

        </div>

        {/* Footer Navigation */}
        <div style={{
          marginTop: '48px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <Link to="/" style={{ color: 'var(--accent-primary, #2563eb)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ← Back to Home
          </Link>
          <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
            <Link to="/faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              FAQ
            </Link>
            <Link to="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Privacy Policy
            </Link>
            <Link to="/terms" style={{ color: 'var(--accent-primary, #2563eb)', fontWeight: 600, textDecoration: 'none' }}>
              Terms & Conditions
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TermsConditions;
