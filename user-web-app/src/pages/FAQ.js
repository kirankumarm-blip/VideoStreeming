import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const FAQ_DATA = [
  {
    id: 1,
    category: 'general',
    question: 'What is XLURN and how does it work?',
    answer: 'XLURN is an integrated video streaming and virtual classroom platform. It combines high-definition on-demand video courses, interactive live webcasts with real-time doubt clearing, timed assessments, study rooms, and verifiable completion certificates in a single web experience.'
  },
  {
    id: 2,
    category: 'general',
    question: 'Which devices and browsers are supported?',
    answer: 'XLURN works on all modern web browsers including Google Chrome, Mozilla Firefox, Microsoft Edge, and Safari. Our interface is fully responsive across desktops, laptops, tablets, and smartphones without requiring third-party plugins.'
  },
  {
    id: 3,
    category: 'security',
    question: 'Is Two-Factor Authentication (2FA) mandatory?',
    answer: 'Yes. To protect your account, purchases, and coursework, XLURN enforces 2-Step Verification. After entering your valid password, a 6-digit numeric One-Time Password (OTP) is sent to your registered email or phone, expiring after 120 seconds.'
  },
  {
    id: 4,
    category: 'security',
    question: 'Why does the video player show a moving watermark with my ID and email?',
    answer: 'XLURN uses dynamic anti-piracy watermarking to protect proprietary intellectual property. A subtle, semi-transparent watermark displaying your authenticated student ID and email moves across the screen at randomized intervals to deter unauthorized screen-recording.'
  },
  {
    id: 5,
    category: 'security',
    question: 'Why was I automatically logged out after being away?',
    answer: 'For your security—especially on shared devices or university labs—XLURN includes a cross-tab inactivity monitor. If no keyboard or mouse activity is detected across all open tabs for 10 consecutive minutes, your session is securely terminated.'
  },
  {
    id: 6,
    category: 'live',
    question: 'How does the Virtual Classroom / Live Webcast work?',
    answer: 'Instructors broadcast directly from their studio in the Admin portal using browser-native WebRTC. As a learner, you can watch in real time, participate in live text chat, answer in-stream interactive polls, and raise your hand for doubt clearing.'
  },
  {
    id: 7,
    category: 'live',
    question: 'How do I ask a question or raise my hand during a live webcast?',
    answer: 'In the live classroom player, click the "Raise Hand ✋" button. Your request will enter the instructor\'s priority doubt queue. The instructor will see your name and avatar, and can acknowledge your question or invite you to speak.'
  },
  {
    id: 8,
    category: 'live',
    question: 'Can I re-watch a live webcast if I miss the scheduled session?',
    answer: 'Yes! Once a live webcast concludes, the recorded session is automatically processed and added to the course archive for on-demand playback, complete with chapter navigation and resource attachments.'
  },
  {
    id: 9,
    category: 'courses',
    question: 'Can I download videos to watch offline?',
    answer: 'If you have an active subscription or purchased course access, you can use the in-app Download feature to save supported lectures for offline playback directly inside the XLURN app.'
  },
  {
    id: 10,
    category: 'courses',
    question: 'How do chapter markers and document previews work?',
    answer: 'The video watch screen includes a chapter sidebar for instant section jumping. Accompanying lesson PDFs, slide decks, and code samples can be previewed directly in an in-video modal without leaving your lesson.'
  },
  {
    id: 11,
    category: 'quizzes',
    question: 'How do quizzes and tests work?',
    answer: 'Quizzes test your understanding of lecture milestones. They are timed, multiple-choice assessments. You must achieve the passing percentage (typically 70% or higher) to unlock subsequent chapters and receive your certificate.'
  },
  {
    id: 12,
    category: 'quizzes',
    question: 'How do I download and verify my Certificate of Completion?',
    answer: 'Once you complete 100% of a course curriculum and pass the required assessments, a verifiable digital certificate is generated. Navigate to "Certificates" in your sidebar to view, print, or download your PDF certificate with its unique verification code.'
  },
  {
    id: 13,
    category: 'billing',
    question: 'What subscription plans are available?',
    answer: 'We offer Monthly, Annual, and Lifetime access plans, as well as team licenses for organizations. You can view all pricing tiers, features, and discount options on our Plans page.'
  },
  {
    id: 14,
    category: 'billing',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes. You can cancel your subscription at any time from your Profile > Payment Settings. Your access will remain active until the end of your current billing period, with no automatic renewal.'
  },
  {
    id: 15,
    category: 'billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards (Visa, MasterCard, American Express), Net Banking, UPI, and digital wallets through our secure payment gateway.'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Questions', icon: '❓' },
  { id: 'general', label: 'General', icon: '💡' },
  { id: 'live', label: 'Virtual Classroom', icon: '📡' },
  { id: 'courses', label: 'Courses & Video', icon: '🎬' },
  { id: 'security', label: 'Security & 2FA', icon: '🛡️' },
  { id: 'quizzes', label: 'Quizzes & Certificates', icon: '🏆' },
  { id: 'billing', label: 'Billing & Plans', icon: '💳' }
];

const FAQ = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(1); // default open first item

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        item.question.toLowerCase().includes(query) || 
        item.answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleAccordion = (id) => {
    setExpandedFaq(prev => prev === id ? null : id);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '40px 20px 80px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Top Header Banner */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'rgba(37, 99, 235, 0.12)',
            color: 'var(--accent-primary, #2563eb)',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '16px'
          }}>
            <span>💬</span> {t('faq.badge', 'Help Center & Support')}
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            margin: '0 0 12px',
            letterSpacing: '-0.5px',
            color: 'var(--text-primary)'
          }}>
            {t('faq.title', 'Frequently Asked Questions')}
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            maxWidth: '620px',
            margin: '0 auto',
            lineHeight: 1.5
          }}>
            {t('faq.subtitle', 'Find immediate answers regarding live classes, video streaming, quizzes, subscriptions, and account security.')}
          </p>

          {/* Search Input Bar */}
          <div style={{
            position: 'relative',
            maxWidth: '560px',
            margin: '28px auto 0'
          }}>
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '18px',
              color: 'var(--text-secondary)'
            }}>
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('faq.searchPlaceholder', 'Search by keyword (e.g., 2FA, live classroom, certificates)...')}
              style={{
                width: '100%',
                padding: '14px 20px 14px 48px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                outline: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '32px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid var(--accent-primary, #2563eb)' : '1px solid var(--border-color)',
                  background: isActive ? 'var(--accent-primary, #2563eb)' : 'var(--bg-secondary)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredFaqs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🔎</span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>No answers found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                Try adjusting your search terms or selecting another category.
              </p>
            </div>
          ) : (
            filteredFaqs.map(item => {
              const isOpen = expandedFaq === item.id;
              return (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '14px',
                    border: isOpen ? '1px solid var(--accent-primary, #2563eb)' : '1px solid var(--border-color)',
                    overflow: 'hidden',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isOpen ? '0 8px 24px rgba(0,0,0,0.12)' : 'none'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.id)}
                    style={{
                      width: '100%',
                      padding: '18px 24px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      gap: '16px',
                      fontSize: '15.5px',
                      fontWeight: 700
                    }}
                  >
                    <span>{item.question}</span>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isOpen ? 'var(--accent-primary, #2563eb)' : 'var(--bg-tertiary)',
                      color: isOpen ? '#ffffff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}>
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{
                      padding: '0 24px 20px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      lineHeight: 1.65,
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '16px'
                    }}>
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Help Banner */}
        <div style={{
          marginTop: '60px',
          padding: '32px 28px',
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
              Still have questions?
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
              Can't find the answer you're looking for? Reach out directly to our support team.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              to="/privacy"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--border-color)'
              }}
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--border-color)'
              }}
            >
              Terms & Conditions
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FAQ;
