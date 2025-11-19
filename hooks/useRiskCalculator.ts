import { useMemo } from 'react';
import { ProtectionProductModel } from '../db';

export interface RiskCalculationResult {
    premium: number;
    riskFactor: number;
    rateApplied: string;
    breakdown: { label: string; value: string }[];
}

export const useRiskCalculator = (
    product: ProtectionProductModel | null,
    coverageAmount: number
): RiskCalculationResult => {
    return useMemo(() => {
        if (!product || coverageAmount <= 0) {
            return { premium: 0, riskFactor: 1.0, rateApplied: '0%', breakdown: [] };
        }

        // 1. Base Rate from Product Definition (Basis Points)
        // 100 basis points = 1%
        const basisPoints = product.premiumBasisPoints || 200; // Default to 2% if not set
        const baseRate = basisPoints / 10000;

        // 2. Risk Factor (Placeholder for client-side logic)
        // This is where we can implement "Parametric First" logic later.
        // For example: checking if the farmer's district is currently flagged as high risk locally.
        const riskFactor = 1.0;

        // 3. Calculate Final Premium
        const finalRate = baseRate * riskFactor;
        const estimatedPremium = Math.round(coverageAmount * finalRate);

        return {
            premium: estimatedPremium,
            riskFactor,
            rateApplied: `${(finalRate * 100).toFixed(2)}%`,
            breakdown: [
                { label: 'Base Rate', value: `${(basisPoints / 100).toFixed(2)}%` },
                { label: 'Risk Multiplier', value: `${riskFactor}x` },
            ]
        };
    }, [product, coverageAmount]);
};