
import { Farmer } from '../types';

// Mock external market data (In prod, this comes from Gov APIs like Agmarknet)
const BASE_MARKET_RATES: Record<string, number> = {
    'Oil Palm': 14500, // Per Ton
    'Paddy': 2200,     // Per Quintal
    'Maize': 1950,
    'Cotton': 6800,
    'Chilli': 18000,
    'Turmeric': 7500,
    'Red Gram': 6000,
    'Green Gram': 7200,
    'Black Gram': 6500
};

export interface PriceComponent {
    label: string;
    value: number;
    weight: string;
    description: string;
}

export interface PriceAnalysis {
    low: number;
    high: number;
    fair: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
    components: PriceComponent[]; // New detailed breakdown
    factors: {
        name: string;
        impact: 'positive' | 'negative' | 'neutral';
        value: string;
    }[];
}

export interface DemandForecast {
    crop: string;
    region: string;
    trend: 'rising' | 'falling' | 'stable';
    percentage: number;
    reason: string;
    confidence: number;
}

/**
 * Calculates a fair price range based on a weighted multi-factor model.
 * Formula: Price = (Local * 0.4) + (National * 0.3) + (Quality * 0.2) + (Demand * 0.1)
 */
export const getFairPriceRange = (
    crop: string, 
    region: string, 
    quality: string = 'Grade A'
): PriceAnalysis => {
    // 1. Base Price Lookup (Local Mandi Proxy)
    const localMandiPrice = BASE_MARKET_RATES[crop] || 2000;

    // 2. National Spot Price Proxy (Usually has less variance than local)
    // Mocking a slight difference based on crop
    const nationalSpotPrice = localMandiPrice * (1 + (Math.random() * 0.1 - 0.05)); 

    // 3. Quality Multiplier
    let qualityScore = 1.0;
    let qualityImpactMsg = "Standard";
    
    switch (quality) {
        case 'Grade A+': 
            qualityScore = 1.15; 
            qualityImpactMsg = "Superior";
            break;
        case 'Grade A': 
            qualityScore = 1.0; 
            qualityImpactMsg = "Standard";
            break;
        case 'Grade B': 
            qualityScore = 0.85; 
            qualityImpactMsg = "Discounted";
            break;
        case 'Grade C': 
            qualityScore = 0.70; 
            qualityImpactMsg = "Low Grade";
            break;
    }
    const qualityPrice = localMandiPrice * qualityScore;

    // 4. Demand Velocity (Mocked)
    // 1.05 means 5% higher demand than supply
    const demandVelocity = 1.08; 
    const demandPrice = localMandiPrice * demandVelocity;

    // 5. Weighted Calculation
    const wLocal = 0.4;
    const wNational = 0.3;
    const wQuality = 0.2;
    const wDemand = 0.1;

    const weightedPrice = (localMandiPrice * wLocal) + 
                          (nationalSpotPrice * wNational) + 
                          (qualityPrice * wQuality) + 
                          (demandPrice * wDemand);
    
    // 6. Regional/Logistics Adjustment (Ground Reality: Distance to hub)
    const isRemoteRegion = region === 'Mulugu'; // Mock logic
    const logisticsCost = isRemoteRegion ? 0.03 : 0.0; // 3% logistics cost
    
    const finalPrice = weightedPrice * (1 - logisticsCost);
    
    // 7. Generate Spread (Market Volatility)
    const spread = 0.05; // +/- 5%
    const low = Math.round(finalPrice * (1 - spread));
    const high = Math.round(finalPrice * (1 + spread));
    const fair = Math.round(finalPrice);

    return {
        low,
        high,
        fair,
        confidence: 0.88, // High confidence due to multi-factor
        trend: demandVelocity > 1 ? 'up' : 'down',
        components: [
            { label: 'Local Mandi', value: localMandiPrice, weight: '40%', description: 'Current rates in your district' },
            { label: 'National Spot', value: nationalSpotPrice, weight: '30%', description: 'MCX/NCDEX trends' },
            { label: 'Quality Score', value: qualityPrice, weight: '20%', description: `Based on ${quality} grading` },
            { label: 'Demand', value: demandPrice, weight: '10%', description: 'Buyer velocity index' },
        ],
        factors: [
            { name: 'Composite Base', impact: 'neutral', value: `₹${Math.round(weightedPrice)}` },
            { name: 'Logistics', impact: isRemoteRegion ? 'negative' : 'neutral', value: isRemoteRegion ? '-3% (Remote Location)' : 'Standard' },
            { name: 'Quality Premium', impact: qualityScore > 1 ? 'positive' : 'negative', value: qualityImpactMsg }
        ]
    };
};

export const getPriceTrend = (crop: string) => {
    return Math.random() > 0.5 ? 'up' : 'down';
};

export const getDemandForecast = (crop: string, region: string): DemandForecast => {
    // Mock logic based on crop seasonality and random factors
    const trends = ['rising', 'falling', 'stable'] as const;
    const trend = trends[Math.floor(Math.random() * trends.length)];
    let reason = '';
    
    if (crop === 'Oil Palm') {
        reason = trend === 'rising' ? 'Industrial demand peaking before festival season.' : 'Processing units currently at capacity.';
    } else if (crop === 'Paddy') {
        reason = trend === 'rising' ? 'Government procurement targets increased.' : 'High moisture levels reported in region.';
    } else if (crop === 'Chilli') {
         reason = trend === 'rising' ? 'Export demand surging.' : 'Local oversupply expected.';
    } else {
        reason = 'Seasonal market adjustments.';
    }

    return {
        crop,
        region,
        trend,
        percentage: Math.floor(Math.random() * 15) + 5,
        reason,
        confidence: 0.85
    };
};

/**
 * Calculates the premium a buyer is willing to pay for aggregated bulk volume.
 * Used for Community Lots.
 */
export const getBulkPremium = (quantity: number, commodity: string): number => {
    if (commodity !== 'Oil Palm') return 0;
    
    // Oil Palm Logistics Logic:
    // 3 tons = 1 small truck. >10 tons = 1 large truck (cheaper per ton).
    if (quantity > 15) return 0.05; // 5% premium for very large lots
    if (quantity > 10) return 0.03; // 3% premium
    if (quantity > 5) return 0.015; // 1.5% premium
    return 0;
};
