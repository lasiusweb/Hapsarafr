
import { BillableEvent } from '../types';

export const SERVICE_PRICING: Record<BillableEvent, number> = {
    [BillableEvent.CROP_HEALTH_SCAN_COMPLETED]: 1, // 1 credit per scan
    [BillableEvent.APPOINTMENT_BOOKED]: 5, // 5 credits per booking
    [BillableEvent.TRANSACTION_PROCESSED]: 0, // Calculated dynamically, 0 placeholder
};

export const FREE_TIER_LIMITS: Record<BillableEvent, number> = {
    [BillableEvent.CROP_HEALTH_SCAN_COMPLETED]: 50, // 50 free scans per month
    [BillableEvent.APPOINTMENT_BOOKED]: 10, // 10 free bookings per month
    [BillableEvent.TRANSACTION_PROCESSED]: 10000, // Free processing for first 10,000 INR volume per month (simulated)
};

export const TRANSACTION_FEE_PERCENT = 0.2; // 0.2% fee

export const PRICING_MODEL = {
    PER_USER_COST_INR: 250,
    PER_RECORD_COST_INR: 0.5,
    FEATURES: [
        'Offline-First Data Sync',
        'Unlimited Farmer Records',
        'Unlimited Users',
        'Bulk Data Import/Export',
        'Role-Based Access Control',
        'Standard Reporting',
        'Hapsara Valorem Billing',
    ],
};
