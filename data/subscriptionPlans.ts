// FIX: Add missing SubscriptionTier import to be used in the PLANS constant.
import { SubscriptionTier } from '../types';

export const PRICING_MODEL = {
    PER_USER_COST_INR: 99,
    PER_RECORD_COST_INR: 1,
    FEATURES: [
        'No limit on Farmer Records',
        'No limit on Users',
        'Offline Access & Real-time Sync',
        'Data Export (Excel, CSV)',
        'Bulk Data Import',
        'Advanced User & Group Management',
        'Priority Email Support'
    ]
};

// FIX: Define and export the PLANS constant to resolve the import error in SubscriptionPage.tsx.
export const PLANS = [
  {
    name: 'Free',
    description: 'For individuals and small teams getting started.',
    price: '₹0',
    features: [
      'Up to 100 farmer records',
      'Up to 2 users',
      'Offline Access',
      'Data Export (CSV)',
    ],
    isPopular: false,
    tier: SubscriptionTier.Free,
  },
  {
    name: 'Basic',
    description: 'For growing teams that need more power and support.',
    price: '₹999/mo',
    features: [
      'Up to 1000 farmer records',
      'Up to 10 users',
      'Offline Access & Real-time Sync',
      'Data Export (Excel, CSV)',
      'Bulk Data Import',
      'Email Support',
    ],
    isPopular: true,
    tier: SubscriptionTier.Basic,
  },
  {
    name: 'Pro',
    description: 'For organizations that require advanced features and security.',
    price: '₹4999/mo',
    features: [
      'Unlimited Farmer Records',
      'Unlimited Users',
      'Offline Access & Real-time Sync',
      'Data Export (Excel, CSV)',
      'Bulk Data Import',
      'Advanced User & Group Management',
      'Priority Email Support',
    ],
    isPopular: false,
    tier: SubscriptionTier.Pro,
  },
  {
    name: 'Enterprise',
    description: 'For large-scale deployments with custom needs.',
    price: 'Contact Us',
    features: [
      'Everything in Pro',
      'Dedicated Account Manager',
      'Custom Integrations',
      'On-premise deployment option',
      'SLA & 24/7 Support',
    ],
    isPopular: false,
    tier: SubscriptionTier.Enterprise,
  }
];