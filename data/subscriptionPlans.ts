
import { BillableEvent } from '../types';

export const SERVICE_PRICING: Record<BillableEvent, number> = {
    [BillableEvent.CROP_HEALTH_SCAN_COMPLETED]: 1, // 1 credit per scan
};

export const FREE_TIER_LIMITS: Record<BillableEvent, number> = {
    [BillableEvent.CROP_HEALTH_SCAN_COMPLETED]: 50, // 50 free scans per month
};

// FIX: Add missing PRICING_MODEL export used by SubscriptionManagementPage.
export const PRICING_MODEL = {
    PER_USER_COST_INR: 250,
    // FIX: Corrected typo in property name from 'PER_, RECORD_COST_INR'.
    PER_RECORD_COST_INR: 0.5,
    FEATURES: [
        'Offline-First Data Sync',
        'Unlimited Farmer Records',
        'Unlimited Users',
        'Bulk Data Import/Export',
        'Role-Based Access Control',
        'Standard Reporting',
    ],
};
