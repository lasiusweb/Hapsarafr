// lib/reputation.ts
import { KhataRecord } from '../types';

export const calculateReputationScore = (khataRecords: KhataRecord[]): number => {
    if (khataRecords.length === 0) return 50; // Start neutral

    let score = 50;
    const paidOnTime = khataRecords.filter(r => r.status === 'PAID').length;
    const pending = khataRecords.filter(r => r.status === 'PENDING' || r.status === 'ACKNOWLEDGED').length;
    const disputed = khataRecords.filter(r => r.status === 'DISPUTED').length;
    
    // Basic heuristic
    score += (paidOnTime * 5);
    score -= (disputed * 10);
    
    // Cap between 0 and 100
    return Math.max(0, Math.min(100, score));
};
