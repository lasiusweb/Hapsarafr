
import { KhataRecord, Farmer, KhataTransactionType } from '../types';

// --- Types ---
export interface KhataBalance {
    totalDue: number;
    lastTransactionDate: string | null;
    status: 'CLEAN' | 'OVERDUE_30' | 'OVERDUE_60' | 'CRITICAL';
}

export interface AgingBuckets {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
}

// --- Core Logic ---

/**
 * Calculates the current outstanding balance for a farmer with a specific dealer.
 * Formula: Sum(Credit Given) - Sum(Payments Received)
 */
export const calculateBalance = (records: KhataRecord[]): number => {
    return records.reduce((total, record) => {
        if (record.status === 'DISPUTED') return total; // Ignore disputed records for balance
        
        // Normalize transaction type check to handle both Enum and string literals if they come from DB
        const type = record.transactionType;
        
        if (type === KhataTransactionType.CREDIT_GIVEN || type === 'CREDIT_GIVEN' || 
            type === KhataTransactionType.INTEREST_CHARGED || type === 'INTEREST_CHARGED') {
            return total + record.amount;
        } else if (type === KhataTransactionType.PAYMENT_RECEIVED || type === 'PAYMENT_RECEIVED' || 
                   type === KhataTransactionType.DISCOUNT_GIVEN || type === 'DISCOUNT_GIVEN') {
            return total - record.amount;
        }
        return total;
    }, 0);
};

/**
 * Analyzes debt age based on transaction dates of unpaid credit.
 * This uses a FIFO (First-In-First-Out) allocation method for payments.
 */
export const getDebtAging = (records: KhataRecord[]): AgingBuckets => {
    // 1. Sort by date ascending to apply payments to oldest debts first
    const sortedRecords = [...records].sort((a, b) => {
        const dateA = a.transactionDate ? new Date(a.transactionDate) : new Date(0);
        const dateB = b.transactionDate ? new Date(b.transactionDate) : new Date(0);
        
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        
        return timeA - timeB;
    });
    
    // 2. Calculate total payments received
    let totalPayments = sortedRecords
        .filter(r => {
            const type = r.transactionType;
            return (type === KhataTransactionType.PAYMENT_RECEIVED || type === 'PAYMENT_RECEIVED' || 
                    type === KhataTransactionType.DISCOUNT_GIVEN || type === 'DISCOUNT_GIVEN') && 
                    r.status !== 'DISPUTED';
        })
        .reduce((sum, r) => sum + r.amount, 0);

    const buckets: AgingBuckets = { current: 0, days30: 0, days60: 0, days90Plus: 0 };
    const now = new Date();

    // 3. Apply payments to oldest credits first (FIFO)
    for (const record of sortedRecords) {
        const type = record.transactionType;
        if (type === KhataTransactionType.CREDIT_GIVEN || type === 'CREDIT_GIVEN' || 
            type === KhataTransactionType.INTEREST_CHARGED || type === 'INTEREST_CHARGED') {
            
            if (record.status === 'DISPUTED') continue;

            let outstandingAmount = record.amount;
            
            // Deduct available payments from this credit record
            if (totalPayments > 0) {
                const paymentCovered = Math.min(outstandingAmount, totalPayments);
                outstandingAmount -= paymentCovered;
                totalPayments -= paymentCovered;
            }

            // If still unpaid, categorize into aging bucket
            if (outstandingAmount > 0) {
                let txDate = new Date(0);
                if (record.transactionDate) {
                    const parsedDate = new Date(record.transactionDate);
                    if (!isNaN(parsedDate.getTime())) {
                        txDate = parsedDate;
                    }
                }

                // If date is 0 (invalid/missing), treat as very old or current? 
                // Let's treat invalid dates as Current to avoid false alarms on old debt
                if (txDate.getTime() === 0) {
                    buckets.current += outstandingAmount;
                    continue;
                }

                const daysOld = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 3600 * 24));
                
                if (daysOld < 30) buckets.current += outstandingAmount;
                else if (daysOld < 60) buckets.days30 += outstandingAmount;
                else if (daysOld < 90) buckets.days60 += outstandingAmount;
                else buckets.days90Plus += outstandingAmount;
            }
        }
    }

    return buckets;
};

/**
 * Generates a smart reminder message based on harvest data.
 */
export const generateSmartReminder = (farmer: Farmer, balance: number): { shouldRemind: boolean, message: string, urgency: 'LOW' | 'MEDIUM' | 'HIGH' } => {
    if (balance <= 0) return { shouldRemind: false, message: '', urgency: 'LOW' };

    // Heuristic: Check if it's harvest season (simplified for demo)
    // In real app, cross-reference Crop Calendar
    const currentMonth = new Date().getMonth(); // 0-11
    // Harvest Seasons: Oct-Dec (Kharif), Mar-May (Rabi)
    const isHarvestSeason = (currentMonth >= 9 && currentMonth <= 11) || (currentMonth >= 2 && currentMonth <= 4); 
    
    if (isHarvestSeason) {
        return {
            shouldRemind: true,
            message: `Namaste ${farmer.fullName}. Hope the harvest is going well. A gentle reminder of the pending balance: ₹${balance}.`,
            urgency: 'MEDIUM'
        };
    }
    
    return {
        shouldRemind: false,
        message: '',
        urgency: 'LOW'
    };
};
