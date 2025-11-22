
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
 * Calculates the current outstanding balance for a farmer.
 * Formula: Sum(Credit Given + Interest) - Sum(Payments Received + Discounts)
 */
export const calculateBalance = (records: KhataRecord[]): number => {
    return records.reduce((total, record) => {
        if (record.status === 'DISPUTED') return total; // Ignore disputed records for balance
        
        // Normalize transaction type check
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
 * Analyzes debt age using FIFO (First-In-First-Out) allocation.
 * Payments clear the oldest debts first. Remaining debt is aged based on its original transaction date.
 */
export const getDebtAging = (records: KhataRecord[]): AgingBuckets => {
    // 1. Sort by date ascending to apply payments to oldest debts first
    const sortedRecords = [...records].sort((a, b) => {
        const dateA = a.transactionDate ? new Date(a.transactionDate) : new Date(0);
        const dateB = b.transactionDate ? new Date(b.transactionDate) : new Date(0);
        return dateA.getTime() - dateB.getTime();
    });
    
    // 2. Calculate total payments received
    let totalPaymentsPool = sortedRecords
        .filter(r => {
            const type = r.transactionType;
            return (type === KhataTransactionType.PAYMENT_RECEIVED || type === 'PAYMENT_RECEIVED' || 
                    type === KhataTransactionType.DISCOUNT_GIVEN || type === 'DISCOUNT_GIVEN') && 
                    r.status !== 'DISPUTED';
        })
        .reduce((sum, r) => sum + r.amount, 0);

    const buckets: AgingBuckets = { current: 0, days30: 0, days60: 0, days90Plus: 0 };
    const now = new Date();

    // 3. Apply payments pool to oldest credits first (FIFO)
    for (const record of sortedRecords) {
        const type = record.transactionType;
        if (type === KhataTransactionType.CREDIT_GIVEN || type === 'CREDIT_GIVEN' || 
            type === KhataTransactionType.INTEREST_CHARGED || type === 'INTEREST_CHARGED') {
            
            if (record.status === 'DISPUTED') continue;

            let outstandingAmountOnThisRecord = record.amount;
            
            // Deduct available payments from this specific credit record
            if (totalPaymentsPool > 0) {
                const paymentCovered = Math.min(outstandingAmountOnThisRecord, totalPaymentsPool);
                outstandingAmountOnThisRecord -= paymentCovered;
                totalPaymentsPool -= paymentCovered;
            }

            // If this specific credit record is still unpaid/partially unpaid, categorize the *remaining* amount
            if (outstandingAmountOnThisRecord > 0) {
                let txDate = new Date(0);
                if (record.transactionDate) {
                    const parsedDate = new Date(record.transactionDate);
                    if (!isNaN(parsedDate.getTime())) {
                        txDate = parsedDate;
                    }
                }

                // If date is invalid, treat as Current
                if (txDate.getTime() === 0) {
                    buckets.current += outstandingAmountOnThisRecord;
                    continue;
                }

                const diffTime = Math.abs(now.getTime() - txDate.getTime());
                const daysOld = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (daysOld < 30) buckets.current += outstandingAmountOnThisRecord;
                else if (daysOld < 60) buckets.days30 += outstandingAmountOnThisRecord;
                else if (daysOld < 90) buckets.days60 += outstandingAmountOnThisRecord;
                else buckets.days90Plus += outstandingAmountOnThisRecord;
            }
        }
    }

    return buckets;
};

/**
 * Generates a smart reminder message based on context (harvest season, aging).
 */
export const generateSmartReminder = (farmer: Farmer, balance: number): { shouldRemind: boolean, message: string, urgency: 'LOW' | 'MEDIUM' | 'HIGH' } => {
    if (balance <= 0) return { shouldRemind: false, message: '', urgency: 'LOW' };

    const currentMonth = new Date().getMonth(); // 0-11
    // Heuristic: Harvest Seasons (Oct-Dec for Kharif / Mar-May for Rabi/Oil Palm Peak)
    const isHarvestSeason = (currentMonth >= 9 && currentMonth <= 11) || (currentMonth >= 2 && currentMonth <= 4); 
    
    if (isHarvestSeason) {
        return {
            shouldRemind: true,
            message: `Namaste ${farmer.fullName}. We hope the harvest is going well. This is a gentle reminder of the pending balance: ₹${balance.toLocaleString()}. Please visit the store to settle at your earliest convenience.`,
            urgency: 'MEDIUM'
        };
    }
    
    if (balance > 50000) {
        return {
             shouldRemind: true,
             message: `Namaste ${farmer.fullName}. Your account balance has exceeded ₹50,000. Please make a partial payment to ensure uninterrupted credit for inputs.`,
             urgency: 'HIGH'
        };
    }

    return {
        shouldRemind: false,
        message: '',
        urgency: 'LOW'
    };
};
