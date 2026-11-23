import React, { useState, useEffect } from 'react';
import { getCurrentUser, api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const PLAN_STYLES = {
  free: {
    icon: '🌱',
    color: '#94a3b8',
    accentGradient: 'linear-gradient(135deg, #64748b, #475569)',
    border: 'var(--border-color)',
    highlightBorder: null
  },
  intermediate: {
    icon: '⭐️',
    color: '#3b82f6',
    accentGradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    border: 'rgba(59, 130, 246, 0.45)',
    highlightBorder: null
  },
  premium: {
    icon: '👑',
    color: '#eab308',
    accentGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    btnTextColor: '#000000',
    border: 'rgba(234, 179, 8, 0.55)',
    highlightBorder: '#eab308'
  }
};

const Plans = () => {
  const { t } = useLanguage();
  const currentUser = getCurrentUser();

  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [plansData, setPlansData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(null);
  const [customAlert, setCustomAlert] = useState({
    show: false,
    title: 'Coming Soon!',
    message: 'Coming soon!',
    buttonText: 'OK'
  });

  // Fetch plans from API: vd_subscriptions with formstep: getPlans
  useEffect(() => {
    let isMounted = true;
    const fetchSubscriptionPlans = async () => {
      try {
        setLoading(true);
        const res = await api.subscriptions.getPlans();
        let list = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        } else if (res && Array.isArray(res.json)) {
          list = res.json;
        }
        if (isMounted && list.length > 0) {
          setPlansData(list);
        }
      } catch (err) {
        console.warn('Could not fetch subscription plans from vd_subscriptions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSubscriptionPlans();
    return () => { isMounted = false; };
  }, []);

  // Filter plans dynamically based on selected billing interval (Monthly / Yearly)
  const filteredPlans = plansData
    .filter((p) => {
      const interval = String(p.billing_interval || '').toLowerCase();
      const intervalId = String(p.billing_interval_id || '');
      if (billingCycle === 'yearly') {
        return interval === 'yearly' || intervalId === '2';
      }
      return interval === 'monthly' || intervalId === '1';
    })
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

  // Determine if a plan is the user's current plan
  const isCurrentPlan = (plan) => {
    const currentPlanVal = String(currentUser?.user_plan ?? currentUser?.user_plan_id ?? '1').toLowerCase();
    const currentPlanName = String(currentUser?.plan_name || '').toLowerCase();
    const planName = String(plan.plan_name || '').toLowerCase();
    const planId = String(plan.plan_id || '');

    if (planId === currentPlanVal) return true;
    if (currentPlanName && planName === currentPlanName) return true;

    // Standard defaults: 1 / free, 2 / intermediate, 3 / premium
    if ((currentPlanVal === '1' || currentPlanVal === 'free' || !currentUser?.user_plan) && planName === 'free') {
      return true;
    }
    if ((currentPlanVal === '2' || currentPlanVal === 'intermediate') && planName === 'intermediate') {
      return true;
    }
    if ((currentPlanVal === '3' || currentPlanVal === 'premium') && planName === 'premium') {
      return true;
    }
    return false;
  };

  // Show "Coming soon!" alert popup on click of upgrade
  const handleUpgradeClick = (plan) => {
    if (plan && isCurrentPlan(plan)) return;
    setCustomAlert({
      show: true,
      title: 'Coming Soon!',
      message: 'Coming soon!',
      buttonText: 'OK'
    });
  };

  const faqs = [
    {
      q: 'Can I change or cancel my plan anytime?',
      a: 'Yes, absolutely! You can upgrade, downgrade, or cancel your subscription at any time from your account settings. If you cancel, you will continue to enjoy your paid plan benefits until the end of your current billing period.'
    },
    {
      q: 'What payment methods are supported?',
      a: 'We accept all major Credit and Debit cards (Visa, MasterCard, RuPay, Amex), UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking across 50+ banks, and popular digital wallets.'
    },
    {
      q: 'How does multi-device streaming work?',
      a: 'Depending on your plan tier, you can stream simultaneously on 1 device (Free), 2 devices (Intermediate), or up to 4 devices (Premium) across web browsers, smartphones, tablets, and smart TVs.'
    },
    {
      q: 'Is offline downloading available on all plans?',
      a: 'Offline downloading is available on the Intermediate and Premium plans. You can download videos, course materials, and quiz modules directly to your device for offline study.'
    },
    {
      q: 'Will my quiz scores and certificates be retained if I switch plans?',
      a: 'Yes! All your learning history, quiz achievements, watched hours, and earned certificates remain safely stored in your profile regardless of your plan changes.'
    },
    {
      q: 'How does the 20% Yearly discount work?',
      a: 'When you choose Yearly billing, you get an instant 20% discount compared to 12 monthly payments, saving you significant money while locking in your rate for the entire year.'
    }
  ];

  return (
    <div className="plans-page-wrapper" style={{
      maxWidth: '1080px',
      margin: '0 auto',
      padding: '32px 20px 80px 20px',
      color: 'var(--text-primary)',
      boxSizing: 'border-box'
    }}>
      {/* Top Header & Toggle Row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '36px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '26px' }}>👑</span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {t('plans.title', 'Upgrade Your Plan')}
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            {t('plans.subtitle', 'Choose a plan that fits your entertainment and learning needs.')}
          </p>
        </div>

        {/* Monthly / Yearly Pill Filter Toggle */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '30px',
          padding: '4px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
        }}>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 20px',
              borderRadius: '24px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: billingCycle === 'monthly' ? '#4f46e5' : 'transparent',
              color: billingCycle === 'monthly' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            {t('plans.monthly', 'Monthly')}
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 20px',
              borderRadius: '24px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: billingCycle === 'yearly' ? '#4f46e5' : 'transparent',
              color: billingCycle === 'yearly' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{t('plans.yearly', 'Yearly')}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: '10px',
              background: '#10b981',
              color: '#ffffff',
              letterSpacing: '0.3px'
            }}>
              {t('plans.discount', '20% OFF')}
            </span>
          </button>
        </div>
      </div>

      {/* 3-Column Pricing Cards Grid */}
      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '280px',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(124, 58, 237, 0.2)',
            borderTop: '3px solid #7c3aed',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {t('plans.loading', 'Loading subscription plans...')}
          </span>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-secondary)',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          marginBottom: '36px'
        }}>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0 }}>
            {t('plans.noPlans', 'No plans available for this billing interval.')}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '36px'
        }}>
          {filteredPlans.map((plan) => {
            const planKey = (plan.plan_name || '').toLowerCase();
            const styleConfig = PLAN_STYLES[planKey] || {
              icon: '💎',
              color: '#3b82f6',
              accentGradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              border: 'var(--border-color)',
              highlightBorder: null
            };

            const isCurrent = isCurrentPlan(plan);
            const rawAmount = parseFloat(plan.plan_amount || 0);
            const rawOriginal = parseFloat(plan.original_amount || 0);
            const discountPct = parseFloat(plan.discount_percentage || 0);
            const isDiscounted = rawOriginal > rawAmount;

            const displayAmount = rawAmount === 0 ? '0' : (rawAmount % 1 === 0 ? rawAmount : rawAmount.toFixed(2));
            const displayOriginal = rawOriginal % 1 === 0 ? rawOriginal : rawOriginal.toFixed(2);
            const cycleLabel = billingCycle === 'yearly' ? `/${t('plans.yearly', 'year').toLowerCase()}` : `/${t('plans.monthly', 'month').toLowerCase()}`;

            // Sort features by display_order
            const sortedFeatures = Array.isArray(plan.features)
              ? [...plan.features].sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
              : [];

            const isPopular = Boolean(plan.is_popular) || Boolean(plan.badge_text);
            const badgeText = plan.badge_text || 'POPULAR';

            return (
              <div
                key={plan.plan_id || `${plan.plan_name}-${plan.billing_interval_id}`}
                style={{
                  position: 'relative',
                  background: 'var(--bg-secondary)',
                  borderRadius: '24px',
                  border: styleConfig.highlightBorder ? `1.5px solid ${styleConfig.highlightBorder}` : `1px solid ${styleConfig.border}`,
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: styleConfig.highlightBorder
                    ? '0 12px 36px rgba(234, 179, 8, 0.12)'
                    : '0 8px 24px rgba(0,0,0,0.06)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Top Title & Popular Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{styleConfig.icon}</span>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {t(`plans.${planKey}`, plan.plan_name)}
                    </h3>
                  </div>

                  {isPopular && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: '#2563eb',
                      color: '#ffffff',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      {t(`plans.${badgeText.toLowerCase()}`, badgeText)}
                    </span>
                  )}
                </div>

                {/* Subtitle / Description */}
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0', minHeight: '38px', lineHeight: '1.4' }}>
                  {t(`plans.${planKey}Sub`, plan.description)}
                </p>

                {/* Price Row */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    ₹{displayAmount}
                  </span>

                  {isDiscounted && (
                    <span style={{ fontSize: '16px', color: 'var(--text-secondary)', textDecoration: 'line-through', fontWeight: 600 }}>
                      ₹{displayOriginal}
                    </span>
                  )}

                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {cycleLabel}
                  </span>

                  {discountPct > 0 && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      background: '#10b981',
                      color: '#ffffff',
                      marginLeft: 'auto'
                    }}>
                      {Math.round(discountPct)}% OFF
                    </span>
                  )}
                </div>

                {/* Action Button: Upgrade (shows Coming soon! popup) or Current Plan */}
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => handleUpgradeClick(plan)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent 
                      ? 'var(--bg-tertiary)' 
                      : styleConfig.accentGradient,
                    color: isCurrent 
                      ? 'var(--text-secondary)' 
                      : (styleConfig.btnTextColor || '#ffffff'),
                    boxShadow: isCurrent 
                      ? 'none' 
                      : '0 4px 16px rgba(0,0,0,0.15)',
                    marginBottom: '28px',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={e => !isCurrent && (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={e => !isCurrent && (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {isCurrent ? t('plans.currentPlan', 'Current Plan') : t('plans.upgrade', 'Upgrade')}
                </button>

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--border-color)', marginBottom: '20px' }} />

                {/* Features List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {sortedFeatures.map((feature) => (
                    <div key={feature.feature_id || feature.feature_name} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {feature.feature_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Special Offer Luxury Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 20, 60, 0.95) 0%, rgba(15, 10, 30, 0.98) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        borderRadius: '24px',
        padding: '24px 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 12px 32px rgba(124, 58, 237, 0.15)',
        marginBottom: '48px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(124, 58, 237, 0.25)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            flexShrink: 0
          }}>
            🎁
          </div>

          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>
              {t('plans.specialOffer', 'Special Offer!')}
            </h4>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', margin: 0, lineHeight: '1.4' }}>
              {t('plans.specialOfferSub', 'Upgrade to Premium yearly plan and get 20% OFF! Limited time offer. Cancel anytime.')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleUpgradeClick({ plan_name: 'Premium' })}
          style={{
            padding: '12px 26px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {t('plans.upgradeNow', 'Upgrade Now')}
        </button>
      </div>

      {/* FAQ Section */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            {t('plans.faqs', 'Frequently Asked Questions')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            {t('plans.faqsSub', "Got questions about our plans and billing? We've got answers.")}
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '820px',
          margin: '0 auto'
        }}>
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  boxShadow: isOpen ? '0 6px 20px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {faq.q}
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: isOpen ? '#7c3aed' : 'var(--text-secondary)',
                    transition: 'transform 0.2s ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}>
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div style={{
                    padding: '0 20px 18px 20px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--text-secondary)',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '14px'
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- CUSTOM ALERT POPUP MODAL (Coming Soon!) --- */}
      {customAlert.show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCustomAlert(prev => ({ ...prev, show: false }));
            }
          }}
        >
          <div style={{
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            padding: '36px 28px',
            borderRadius: '24px',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(124, 58, 237, 0.35)',
            boxShadow: '0 24px 50px rgba(0, 0, 0, 0.5), 0 0 35px rgba(124, 58, 237, 0.2)',
            animation: 'fadeIn 0.2s ease',
            color: 'var(--text-primary)'
          }}>
            {/* Animated Icon Circle Badge */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(124, 58, 237, 0.15)',
              border: '2.5px solid #8b5cf6',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 20px auto',
              fontSize: '30px',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.3)'
            }}>
              🚀
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 10px 0',
              letterSpacing: '-0.3px'
            }}>
              {customAlert.title}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: '1.55',
              margin: '0 0 24px 0'
            }}>
              {customAlert.message}
            </p>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => setCustomAlert(prev => ({ ...prev, show: false }))}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(124, 58, 237, 0.35)',
                transition: 'transform 0.15s ease, filter 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {customAlert.buttonText || 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;