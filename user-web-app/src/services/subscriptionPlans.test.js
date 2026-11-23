import { api } from './api';

describe('Learner Subscription Plans API & Dynamic Filter', () => {
  const mockApiResponse = [
    {
      "plan_id": "2",
      "plan_name": "Free",
      "description": "Good for trying out our platform",
      "billing_interval_id": "1",
      "billing_interval": "Monthly",
      "plan_amount": "0.00",
      "original_amount": "0.00",
      "discount_percentage": "0.00",
      "duration_days": 30,
      "max_devices": 1,
      "ads_type": "Ads Supported",
      "content_access": "Limited",
      "allow_download": false,
      "allow_exclusive_content": false,
      "allow_early_access": false,
      "is_popular": false,
      "badge_text": null,
      "display_order": 1,
      "is_active": true,
      "features": [
        { "feature_id": 2, "is_included": true, "feature_name": "Watch limited content", "display_order": 1 },
        { "feature_id": 4, "is_included": true, "feature_name": "Ads supported", "display_order": 2 },
        { "feature_id": 6, "is_included": true, "feature_name": "720p Video Quality", "display_order": 3 },
        { "feature_id": 8, "is_included": true, "feature_name": "1 Device at a time", "display_order": 4 }
      ]
    },
    {
      "plan_id": "3",
      "plan_name": "Free",
      "description": "Good for trying out our platform",
      "billing_interval_id": "2",
      "billing_interval": "Yearly",
      "plan_amount": "0.00",
      "original_amount": "0.00",
      "discount_percentage": "0.00",
      "duration_days": 365,
      "max_devices": 1,
      "ads_type": "Ads Supported",
      "content_access": "Limited",
      "allow_download": false,
      "allow_exclusive_content": false,
      "allow_early_access": false,
      "is_popular": false,
      "badge_text": null,
      "display_order": 1,
      "is_active": true,
      "features": [
        { "feature_id": 1, "is_included": true, "feature_name": "Watch limited content", "display_order": 1 },
        { "feature_id": 3, "is_included": true, "feature_name": "Ads supported", "display_order": 2 },
        { "feature_id": 5, "is_included": true, "feature_name": "720p Video Quality", "display_order": 3 },
        { "feature_id": 7, "is_included": true, "feature_name": "1 Device at a time", "display_order": 4 }
      ]
    },
    {
      "plan_id": "4",
      "plan_name": "Intermediate",
      "description": "Better experience with more access",
      "billing_interval_id": "1",
      "billing_interval": "Monthly",
      "plan_amount": "149.00",
      "original_amount": "149.00",
      "discount_percentage": "0.00",
      "duration_days": 30,
      "max_devices": 2,
      "ads_type": "Fewer Ads",
      "content_access": "Most",
      "allow_download": true,
      "allow_exclusive_content": false,
      "allow_early_access": false,
      "is_popular": true,
      "badge_text": "POPULAR",
      "display_order": 2,
      "is_active": true,
      "features": [
        { "feature_id": 10, "is_included": true, "feature_name": "Watch most content", "display_order": 1 },
        { "feature_id": 12, "is_included": true, "feature_name": "Fewer ads", "display_order": 2 },
        { "feature_id": 14, "is_included": true, "feature_name": "1080p Full HD", "display_order": 3 },
        { "feature_id": 16, "is_included": true, "feature_name": "2 Devices at a time", "display_order": 4 },
        { "feature_id": 18, "is_included": true, "feature_name": "Download & Watch Offline", "display_order": 5 }
      ]
    },
    {
      "plan_id": "5",
      "plan_name": "Intermediate",
      "description": "Better experience with more access",
      "billing_interval_id": "2",
      "billing_interval": "Yearly",
      "plan_amount": "1429.00",
      "original_amount": "1788.00",
      "discount_percentage": "20.00",
      "duration_days": 365,
      "max_devices": 2,
      "ads_type": "Fewer Ads",
      "content_access": "Most",
      "allow_download": true,
      "allow_exclusive_content": false,
      "allow_early_access": false,
      "is_popular": true,
      "badge_text": "POPULAR",
      "display_order": 2,
      "is_active": true,
      "features": [
        { "feature_id": 9, "is_included": true, "feature_name": "Watch most content", "display_order": 1 },
        { "feature_id": 11, "is_included": true, "feature_name": "Fewer ads", "display_order": 2 },
        { "feature_id": 13, "is_included": true, "feature_name": "1080p Full HD", "display_order": 3 },
        { "feature_id": 15, "is_included": true, "feature_name": "2 Devices at a time", "display_order": 4 },
        { "feature_id": 17, "is_included": true, "feature_name": "Download & Watch Offline", "display_order": 5 }
      ]
    },
    {
      "plan_id": "6",
      "plan_name": "Premium",
      "description": "Ultimate experience with all access",
      "billing_interval_id": "1",
      "billing_interval": "Monthly",
      "plan_amount": "299.00",
      "original_amount": "299.00",
      "discount_percentage": "0.00",
      "duration_days": 30,
      "max_devices": 4,
      "ads_type": "Ad Free",
      "content_access": "All",
      "allow_download": true,
      "allow_exclusive_content": true,
      "allow_early_access": true,
      "is_popular": false,
      "badge_text": null,
      "display_order": 3,
      "is_active": true,
      "features": [
        { "feature_id": 20, "is_included": true, "feature_name": "All content unlocked", "display_order": 1 },
        { "feature_id": 22, "is_included": true, "feature_name": "Ad-free experience", "display_order": 2 },
        { "feature_id": 24, "is_included": true, "feature_name": "4K Ultra HD", "display_order": 3 },
        { "feature_id": 26, "is_included": true, "feature_name": "4 Devices at a time", "display_order": 4 },
        { "feature_id": 28, "is_included": true, "feature_name": "Download & Watch Offline", "display_order": 5 },
        { "feature_id": 30, "is_included": true, "feature_name": "Exclusive Originals", "display_order": 6 },
        { "feature_id": 32, "is_included": true, "feature_name": "Early Access to New Releases", "display_order": 7 }
      ]
    },
    {
      "plan_id": "7",
      "plan_name": "Premium",
      "description": "Ultimate experience with all access",
      "billing_interval_id": "2",
      "billing_interval": "Yearly",
      "plan_amount": "2870.00",
      "original_amount": "3588.00",
      "discount_percentage": "20.00",
      "duration_days": 365,
      "max_devices": 4,
      "ads_type": "Ad Free",
      "content_access": "All",
      "allow_download": true,
      "allow_exclusive_content": true,
      "allow_early_access": true,
      "is_popular": false,
      "badge_text": null,
      "display_order": 3,
      "is_active": true,
      "features": [
        { "feature_id": 19, "is_included": true, "feature_name": "All content unlocked", "display_order": 1 },
        { "feature_id": 21, "is_included": true, "feature_name": "Ad-free experience", "display_order": 2 },
        { "feature_id": 23, "is_included": true, "feature_name": "4K Ultra HD", "display_order": 3 },
        { "feature_id": 25, "is_included": true, "feature_name": "4 Devices at a time", "display_order": 4 },
        { "feature_id": 27, "is_included": true, "feature_name": "Download & Watch Offline", "display_order": 5 },
        { "feature_id": 29, "is_included": true, "feature_name": "Exclusive Originals", "display_order": 6 },
        { "feature_id": 31, "is_included": true, "feature_name": "Early Access to New Releases", "display_order": 7 }
      ]
    }
  ];

  test('api.subscriptions.getPlans exists and is a callable function', () => {
    expect(typeof api.subscriptions.getPlans).toBe('function');
  });

  test('api.plans.getPlans exists and is a callable function', () => {
    expect(typeof api.plans.getPlans).toBe('function');
  });

  test('filters monthly plans correctly', () => {
    const monthlyPlans = mockApiResponse.filter(p => {
      const interval = String(p.billing_interval || '').toLowerCase();
      const intervalId = String(p.billing_interval_id || '');
      return interval === 'monthly' || intervalId === '1';
    });

    expect(monthlyPlans).toHaveLength(3);
    expect(monthlyPlans.map(p => p.plan_name)).toEqual(['Free', 'Intermediate', 'Premium']);
    expect(monthlyPlans.map(p => p.plan_amount)).toEqual(['0.00', '149.00', '299.00']);
  });

  test('filters yearly plans correctly and shows 20% discounts', () => {
    const yearlyPlans = mockApiResponse.filter(p => {
      const interval = String(p.billing_interval || '').toLowerCase();
      const intervalId = String(p.billing_interval_id || '');
      return interval === 'yearly' || intervalId === '2';
    });

    expect(yearlyPlans).toHaveLength(3);
    expect(yearlyPlans.map(p => p.plan_name)).toEqual(['Free', 'Intermediate', 'Premium']);
    expect(yearlyPlans.map(p => p.plan_amount)).toEqual(['0.00', '1429.00', '2870.00']);
    expect(yearlyPlans[1].discount_percentage).toBe('20.00');
    expect(yearlyPlans[2].discount_percentage).toBe('20.00');
  });

  test('orders features by display_order properly', () => {
    const intermediateMonthly = mockApiResponse.find(p => p.plan_id === '4');
    const sortedFeatures = [...intermediateMonthly.features].sort((a, b) => a.display_order - b.display_order);

    expect(sortedFeatures[0].feature_name).toBe('Watch most content');
    expect(sortedFeatures[sortedFeatures.length - 1].feature_name).toBe('Download & Watch Offline');
  });

  test('api.subscriptions.getPlans sends payload with ONLY formstep: getPlans', async () => {
    const originalFetch = global.fetch;
    let interceptedBody = null;
    global.fetch = jest.fn((url, options) => {
      if (options && options.body) {
        interceptedBody = JSON.parse(options.body);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockApiResponse)),
        json: () => Promise.resolve(mockApiResponse)
      });
    });

    try {
      await api.subscriptions.getPlans();
      expect(interceptedBody).toEqual({ formstep: 'getPlans' });
      expect(interceptedBody.formStep).toBeUndefined();
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('api.plans.getPlans sends payload with ONLY formstep: getPlans', async () => {
    const originalFetch = global.fetch;
    let interceptedBody = null;
    global.fetch = jest.fn((url, options) => {
      if (options && options.body) {
        interceptedBody = JSON.parse(options.body);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockApiResponse)),
        json: () => Promise.resolve(mockApiResponse)
      });
    });

    try {
      await api.plans.getPlans();
      expect(interceptedBody).toEqual({ formstep: 'getPlans' });
      expect(interceptedBody.formStep).toBeUndefined();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
