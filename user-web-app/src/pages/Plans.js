import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const Plans = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const currentUser = getCurrentUser();

  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [activeFaq, setActiveFaq] = useState(null);
  const [selectedPlanModal, setSelectedPlanModal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const userPlan = String(currentUser?.user_plan ?? currentUser?.user_plan_id ?? '1');

  const plans = [
    {
      id: 'free',
      planId: '1',
      name: 'Free',
      subtitle: 'Good for trying out our platform',
      priceMonthly: 0,
      priceYearly: 0,
      color: '#94a3b8',
      accentGradient: 'linear-gradient(135deg, #64748b, #475569)',
      border: 'var(--border-color)',
      isCurrent: userPlan === '1',
      features: [
        'Watch limited content',
        'Ads supported',
        '720p Video Quality',
        '1 Device at a time'
      ]
    },
    {
      id: 'intermediate',
      planId: '2',
      name: 'Intermediate',
      popular: true,
      icon: '⭐️',
      subtitle: 'Better experience with more access',
      priceMonthly: 149,
      priceYearly: 1429, // 20% discount
      color: '#3b82f6',
      accentGradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
      border: 'rgba(59, 130, 246, 0.45)',
      isCurrent: userPlan === '2',
      features: [
        'Watch most content',
        'Fewer ads',
        '1080p Full HD',
        '2 Devices at a time',
        'Download & Watch Offline'
      ]
    },
    {
      id: 'premium',
      planId: '3',
      name: 'Premium',
      icon: '👑',
      subtitle: 'Ultimate experience with all access',
      priceMonthly: 299,
      priceYearly: 2870, // 20% discount
      color: '#eab308',
      accentGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      btnTextColor: '#000000',
      border: 'rgba(234, 179, 8, 0.55)',
      highlightBorder: '#eab308',
      isCurrent: userPlan === '3',
      features: [
        'All content unlocked',
        'Ad-free experience',
        '4K Ultra HD',
        '4 Devices at a time',
        'Download & Watch Offline',
        'Exclusive Originals',
        'Early Access to New Releases'
      ]
    }
  ];

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

  const handleSelectPlan = (plan) => {
    if (plan.isCurrent) return;
    setSelectedPlanModal(plan);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlanModal) return;
    setIsProcessing(true);

    try {
      // Simulate upgrade / call backend subscription
      const price = billingCycle === 'yearly' ? selectedPlanModal.priceYearly : selectedPlanModal.priceMonthly;
      
      // Update local storage user plan
      const user = getCurrentUser() || {};
      user.user_plan = selectedPlanModal.planId;
      user.user_plan_id = selectedPlanModal.planId;
      localStorage.setItem('user', JSON.stringify(user));

      setToastMessage({
        type: 'success',
        text: `🎉 Congratulations! Successfully upgraded to ${selectedPlanModal.name} Plan (${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}).`
      });

      setSelectedPlanModal(null);
      setTimeout(() => {
        setToastMessage(null);
        window.location.reload();
      }, 2000);
    } catch (e) {
      setToastMessage({
        type: 'error',
        text: 'Failed to process upgrade. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="plans-page-wrapper" style={{
      maxWidth: '1080px',
      margin: '0 auto',
      padding: '32px 20px 80px 20px',
      color: 'var(--text-primary)',
      boxSizing: 'border-box'
    }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          fontWeight: 600,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <span>{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

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
              Upgrade Your Plan
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Choose a plan that fits your entertainment and learning needs.
          </p>
        </div>

        {/* Monthly / Yearly Pill Toggle */}
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
            Monthly
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
            <span>Yearly</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: '10px',
              background: '#10b981',
              color: '#ffffff',
              letterSpacing: '0.3px'
            }}>
              20% OFF
            </span>
          </button>
        </div>
      </div>

      {/* 3-Column Pricing Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '36px'
      }}>
        {plans.map((plan) => {
          const displayPrice = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const cycleLabel = billingCycle === 'yearly' ? '/year' : '/month';

          return (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                background: 'var(--bg-secondary)',
                borderRadius: '24px',
                border: plan.highlightBorder ? `1.5px solid ${plan.highlightBorder}` : `1px solid ${plan.border}`,
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: plan.highlightBorder
                  ? '0 12px 36px rgba(234, 179, 8, 0.12)'
                  : '0 8px 24px rgba(0,0,0,0.06)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              {/* Top Title & Popular Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {plan.icon && <span style={{ fontSize: '18px' }}>{plan.icon}</span>}
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {plan.name}
                  </h3>
                </div>

                {plan.popular && (
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
                    POPULAR
                  </span>
                )}
              </div>

              {/* Subtitle */}
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0', minHeight: '38px', lineHeight: '1.4' }}>
                {plan.subtitle}
              </p>

              {/* Price Row */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
                <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  ₹{displayPrice}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {cycleLabel}
                </span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={plan.isCurrent}
                onClick={() => handleSelectPlan(plan)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: plan.isCurrent ? 'default' : 'pointer',
                  background: plan.isCurrent 
                    ? 'var(--bg-tertiary)' 
                    : plan.accentGradient,
                  color: plan.isCurrent 
                    ? 'var(--text-secondary)' 
                    : (plan.btnTextColor || '#ffffff'),
                  boxShadow: plan.isCurrent 
                    ? 'none' 
                    : '0 4px 16px rgba(0,0,0,0.15)',
                  marginBottom: '28px',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={e => !plan.isCurrent && (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={e => !plan.isCurrent && (e.currentTarget.style.transform = 'scale(1)')}
              >
                {plan.isCurrent ? 'Current Plan' : 'Upgrade'}
              </button>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border-color)', marginBottom: '20px' }} />

              {/* Features List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {plan.features.map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
          {/* 3D Gift Box Icon Bubble */}
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
              Special Offer!
            </h4>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', margin: 0, lineHeight: '1.4' }}>
              Upgrade to Premium yearly plan and get 20% OFF! Limited time offer. Cancel anytime.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setBillingCycle('yearly');
            setSelectedPlanModal(plans.find(p => p.id === 'premium'));
          }}
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
          Upgrade Now
        </button>
      </div>

      {/* --- FAQ SECTION --- */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Got questions about our plans and billing? We've got answers.
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

      {/* --- CHECKOUT / CONFIRMATION MODAL --- */}
      {selectedPlanModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }} onClick={(e) => e.target === e.currentTarget && setSelectedPlanModal(null)}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '460px',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{selectedPlanModal.icon || '👑'}</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                  Confirm Upgrade to {selectedPlanModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Billing Summary
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                    {selectedPlanModal.name} Plan ({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>
                    ₹{billingCycle === 'yearly' ? selectedPlanModal.priceYearly : selectedPlanModal.priceMonthly}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 24px 0' }}>
                You will get immediate access to all {selectedPlanModal.name} features, 4K HD streaming, and full downloads. Cancel anytime.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPlanModal(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmUpgrade}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: selectedPlanModal.accentGradient || '#4f46e5',
                    color: selectedPlanModal.btnTextColor || '#ffffff',
                    fontWeight: 800,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                  }}
                >
                  {isProcessing ? 'Activating...' : 'Confirm & Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;
