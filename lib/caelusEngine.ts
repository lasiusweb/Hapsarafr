
import { Farmer, FarmPlot, AgronomicInput, InputType, SensorReading } from '../types';

// Constants for estimation (Ground Reality: Validated against regional research)
const CO2_SEQUESTRATION_RATES = {
    'Oil Palm': 1.5, // tons per hectare per year (conservative)
    'Intercropping': 0.5, // Additional
    'Cover Crop': 0.3,
    'Organic Mulch': 0.2
};

const CROP_WATER_REQUIREMENT = {
    'Oil Palm': 150, // liters per palm per day (peak)
    'Maize': 500, // mm per season
    'Paddy': 1200 // mm per season
};

export interface CarbonAssessment {
    totalCarbonSequestered: number; // Tons
    potentialCredits: number; // Units
    estimatedRevenue: number; // INR
    breakdown: { source: string, value: number }[];
}

export interface WaterEfficiencyMetric {
    efficiencyScore: number; // 0-100
    usageStatus: 'OPTIMAL' | 'UNDER_IRRIGATED' | 'OVER_IRRIGATED';
    savings: number; // Liters saved vs baseline
    recommendation: string;
}

// --- Carbon Logic ---

export const calculateCarbonSequestration = (
    plots: FarmPlot[], 
    inputs: AgronomicInput[],
    actions: any[] // SustainabilityActions
): CarbonAssessment => {
    let totalSeq = 0;
    const breakdown = [];
    
    // 1. Biomass Sequestration
    plots.forEach(p => {
        if (!p.plantation_date) return;
        const age = (new Date().getTime() - new Date(p.plantation_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        // Carbon accumulation curve logic (S-curve proxy)
        let rate = CO2_SEQUESTRATION_RATES['Oil Palm'];
        if (age < 3) rate *= 0.4; // Young palms store less
        
        const plotSeq = rate * (p.acreage * 0.4047); // Convert acres to hectares
        totalSeq += plotSeq;
        breakdown.push({ source: `Biomass: ${p.name}`, value: parseFloat(plotSeq.toFixed(2)) });
    });

    // 2. Soil Carbon (Practices)
    const uniquePlots = new Set(actions.map(a => a.farmPlotId)); // Assuming actions are linked to plots implicitly or explicitly
    // For MVP, assume actions apply generally if verified
    const verifiedMulching = actions.filter(a => a.actionType === 'Mulching' && a.status === 'Verified').length;
    
    if (verifiedMulching > 0) {
        const mulchSeq = verifiedMulching * 0.5; // Simplified ton/year boost
        totalSeq += mulchSeq;
        breakdown.push({ source: 'Soil Practice: Mulching', value: mulchSeq });
    }

    // 3. Financials
    const creditPrice = 750; // INR per ton (approx $9)
    
    return {
        totalCarbonSequestered: parseFloat(totalSeq.toFixed(2)),
        potentialCredits: Math.floor(totalSeq),
        estimatedRevenue: Math.floor(totalSeq) * creditPrice,
        breakdown
    };
};

// --- Water Logic ---

export const calculateWaterEfficiency = (
    readings: SensorReading[], 
    plots: FarmPlot[]
): WaterEfficiencyMetric => {
    if (readings.length === 0) return { efficiencyScore: 0, usageStatus: 'OPTIMAL', savings: 0, recommendation: 'No sensor data available.' };
    
    // Mock Calculation: Compare last reading to standard
    // Assuming readings are "Liters per day" total for the farm
    const latestReading = readings.sort((a,b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    const actualUsage = latestReading.value; 
    
    let theoreticalNeed = 0;
    plots.forEach(p => {
        if(p.plant_type === 'Oil Palm' && p.number_of_plants) {
            theoreticalNeed += p.number_of_plants * 150; // 150L/plant standard
        }
    });

    if (theoreticalNeed === 0) return { efficiencyScore: 0, usageStatus: 'OPTIMAL', savings: 0, recommendation: 'No crop data.' };

    const ratio = actualUsage / theoreticalNeed;
    let score = 0;
    let status: 'OPTIMAL' | 'UNDER_IRRIGATED' | 'OVER_IRRIGATED' = 'OPTIMAL';
    let recommendation = "";

    if (ratio > 1.2) {
        status = 'OVER_IRRIGATED';
        score = Math.max(0, 100 - ((ratio - 1) * 100));
        recommendation = "Reduce irrigation duration by 20%.";
    } else if (ratio < 0.8) {
        status = 'UNDER_IRRIGATED';
        score = Math.max(0, 100 - ((1 - ratio) * 100));
        recommendation = "Increase water flow to prevent stress.";
    } else {
        status = 'OPTIMAL';
        score = 95;
        recommendation = "Water usage is efficient.";
    }

    return {
        efficiencyScore: Math.round(score),
        usageStatus: status,
        savings: Math.max(0, theoreticalNeed - actualUsage),
        recommendation
    };
};
