
import { Farmer, FarmPlot } from '../types';

export interface WeatherData {
    date: string;
    tempMax: number;
    rainfallMm: number;
    ndvi?: number; // Normalized Difference Vegetation Index, range -1 to 1
}

export interface ClimateRiskAssessment {
    score: number; // 0 (Critical Risk) to 100 (High Resilience)
    riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
    factors: {
        soil: number; // Score impact
        water: number;
        cropHealth: number;
    };
    recommendations: string[];
}

export const calculateResilienceScore = (farmer: Farmer, plots: FarmPlot[], weather: WeatherData): ClimateRiskAssessment => {
    let totalScore = 100;
    const factors = { soil: 0, water: 0, cropHealth: 0 };
    const recommendations: string[] = [];

    // 1. Water Stress (High Temp + Low Rain)
    if (weather.tempMax > 35) {
        if (weather.rainfallMm < 5) {
            const deduction = 15;
            totalScore -= deduction;
            factors.water -= deduction;
            recommendations.push("High temperature and low rainfall detected. Immediate irrigation required to prevent crop stress.");
        } else {
            const deduction = 5;
            totalScore -= deduction;
            factors.water -= deduction;
             recommendations.push("Temperatures are high. Monitor soil moisture levels daily.");
        }
    }

    // 2. Soil Vulnerability (Sandy + Heat)
    const hasSandySoil = plots.some(p => p.soil_type === 'Sandy');
    if (hasSandySoil && weather.tempMax > 32 && weather.rainfallMm < 10) {
        const deduction = 20;
        totalScore -= deduction;
        factors.soil -= deduction;
        recommendations.push("Sandy soil detected in high heat conditions. Apply mulching immediately to retain soil moisture.");
    }

    // 3. Crop Stage (Young palms are vulnerable)
    // Mocking age check based on plantation date
    const now = new Date();
    const hasYoungPalms = plots.some(p => {
        if (!p.plantation_date) return false;
        const planted = new Date(p.plantation_date);
        const ageYears = (now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return ageYears < 3;
    });

    if (hasYoungPalms && factors.water < -10) {
         const deduction = 15;
         totalScore -= deduction;
         factors.cropHealth -= deduction;
         recommendations.push("Young palms are at critical risk due to heat stress. Prioritize watering saplings over mature trees.");
    }
    
    // 4. NDVI Check
    if (weather.ndvi !== undefined && weather.ndvi < 0.3) {
         const deduction = 25;
         totalScore -= deduction;
         factors.cropHealth -= deduction;
         recommendations.push("Satellite data indicates poor vegetation health (low NDVI). Check for pest infestations or severe nutrient deficiency.");
    }

    // Clamp
    totalScore = Math.max(0, Math.min(100, totalScore));

    let riskLevel: ClimateRiskAssessment['riskLevel'] = 'Low';
    if (totalScore < 40) riskLevel = 'Critical';
    else if (totalScore < 70) riskLevel = 'High';
    else if (totalScore < 85) riskLevel = 'Medium';

    return {
        score: totalScore,
        riskLevel,
        factors,
        recommendations
    };
};

export const getMockWeatherData = (): WeatherData => {
    // Randomize slightly to show dynamic UI
    const isHot = Math.random() > 0.5;
    return {
        date: new Date().toISOString().split('T')[0],
        tempMax: isHot ? 38 : 28,
        rainfallMm: isHot ? 0 : 15,
        ndvi: 0.4 + Math.random() * 0.4
    };
};
