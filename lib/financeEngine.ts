


import { Farmer, FarmPlot, HarvestLog, Task, KhataRecord, TaskStatus, KhataTransactionType } from '../types';
import { calculateHVS } from './valuation';

export interface CreditScoreBreakdown {
    collateral: { score: number, max: number, label: string };
    capacity: { score: number, max: number, label: string };
    character: { score: number, max: number, label: string };
    discipline: { score: number, max: number, label: string };
}

export interface CreditScoreResult {
    totalScore: number;
    breakdown: CreditScoreBreakdown;
    rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    maxLoanEligibility: number;
    interestRateAdjustment: number; // basis points reduction
}

export const calculateCreditScore = (
    farmer: Farmer,
    plots: FarmPlot[],
    harvestLogs: HarvestLog[],
    tasks: Task[],
    khataRecords: KhataRecord[]
): CreditScoreResult => {
    
    // 1. Collateral Score (Max 300)
    // Based on Land Value and HVS (Hapsara Value Score)
    let collateralScore = 0;
    const totalAcreage = plots.reduce((sum, p) => sum + p.acreage, 0);
    
    // Calculate average HVS proxy if actual listing doesn't exist
    // Proxy: assume standard conditions if no detailed data
    // Base value of 1 acre ~ 50 points
    collateralScore = Math.min(300, totalAcreage * 50);
    
    // 2. Capacity Score (Max 300)
    // Ability to repay based on income potential (Harvests)
    let capacityScore = 0;
    // Check recent harvests (last 12 months)
    const now = new Date();
    const recentHarvests = harvestLogs.filter(h => (now.getTime() - new Date(h.harvestDate).getTime()) < 31536000000);
    
    if (recentHarvests.length > 0) {
        capacityScore += 150; // Proven track record
        // Volume bonus
        const totalYield = recentHarvests.reduce((sum, h) => sum + h.quantity, 0); // Assuming tons for simplicity
        capacityScore += Math.min(150, totalYield * 10); 
    } else if (plots.some(p => p.plantation_date && (now.getTime() - new Date(p.plantation_date).getTime()) > 126227704000)) {
        // If mature trees exist (>4 years) but no logs, give partial score for potential
        capacityScore += 100; 
    }

    // 3. Character Score (Max 200)
    // Payment history from Khata
    let characterScore = 100; // Start neutral
    const payments = khataRecords.filter(k => k.transactionType === 'PAYMENT_RECEIVED' || k.transactionType === KhataTransactionType.PAYMENT_RECEIVED);
    const debts = khataRecords.filter(k => k.transactionType === 'CREDIT_GIVEN' || k.transactionType === KhataTransactionType.CREDIT_GIVEN);
    
    if (payments.length > 0) characterScore += 50; // Has paid before
    
    // Check for overdue (heuristic)
    // If total payment < 50% of total debt generated > 6 months ago -> penalty
    const oldDebts = debts.filter(d => (now.getTime() - new Date(d.transactionDate).getTime()) > 15778800000).reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    if (oldDebts > 0 && totalPaid < oldDebts * 0.5) {
        characterScore -= 50; // Penalty for sticky debt
    }

    // 4. Discipline Score (Max 200)
    // Task completion rate
    let disciplineScore = 0;
    const assignedTasks = tasks.filter(t => t.farmerId === farmer.id);
    if (assignedTasks.length > 0) {
        const completed = assignedTasks.filter(t => t.status === TaskStatus.Done).length;
        const rate = completed / assignedTasks.length;
        disciplineScore = Math.round(rate * 200);
    } else {
        disciplineScore = 100; // Neutral if no tasks
    }

    // Final Assembly
    const totalScore = Math.min(850, Math.max(300, 
        300 + // Base Score
        (collateralScore * 0.3) + 
        (capacityScore * 0.3) + 
        (characterScore * 0.2) + 
        (disciplineScore * 0.2)
    ));

    let rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'POOR';
    let maxLoan = 0;
    let interestAdj = 0;

    if (totalScore >= 750) {
        rating = 'EXCELLENT';
        maxLoan = 500000;
        interestAdj = 100; // 1% lower rate
    } else if (totalScore >= 650) {
        rating = 'GOOD';
        maxLoan = 200000;
        interestAdj = 50; // 0.5% lower
    } else if (totalScore >= 550) {
        rating = 'FAIR';
        maxLoan = 50000;
        interestAdj = 0;
    } else {
        rating = 'POOR';
        maxLoan = 0;
        interestAdj = 0;
    }

    return {
        totalScore: Math.round(totalScore),
        breakdown: {
            collateral: { score: Math.round(collateralScore), max: 300, label: 'Land Assets' },
            capacity: { score: Math.round(capacityScore), max: 300, label: 'Yield Potential' },
            character: { score: Math.round(characterScore), max: 200, label: 'Repayment History' },
            discipline: { score: Math.round(disciplineScore), max: 200, label: 'Task Compliance' }
        },
        rating,
        maxLoanEligibility: maxLoan,
        interestRateAdjustment: interestAdj
    };
};
