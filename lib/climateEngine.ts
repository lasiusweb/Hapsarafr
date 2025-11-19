
import { Farmer, FarmPlot } from '../types';

export interface WeatherData {
    date: string;
    tempMax: number;
    tempMin: number;
    rainfallMm: number;
    humidity: number; // Percentage 0-100
    windSpeedKm: number;
    ndvi?: number; // Normalized Difference Vegetation Index, range -1 to 1
    forecast?: WeatherData[]; // Future days
}

export interface AdvisoryRecommendation {
    id: string;
    category: 'Water' | 'Soil' | 'Pest' | 'Heat' | 'General';
    title: string;
    description: string;
    urgency: 'Critical' | 'High' | 'Medium' | 'Low';
    impactOnScore: number; // Negative number indicating how much this hurts the score
}

export interface ClimateRiskAssessment {
    score: number; // 0 (Critical Risk) to 100 (High Resilience)
    riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
    breakdown: {
        soilResilience: number; // 0-100
        waterStress: number; // 0-100 (100 is no stress)
        pestPressure: number; // 0-100 (100 is no pressure)
    };
    recommendations: AdvisoryRecommendation[];
}

export const calculateResilienceScore = (farmer: Farmer, plots: FarmPlot[], weather: WeatherData): ClimateRiskAssessment => {
    let baseScore = 100;
    const recommendations: AdvisoryRecommendation[] = [];
    
    // Sub-scores (100 = Good, 0 = Bad)
    let waterScore = 100;
    let soilScore = 100;
    let pestScore = 100;

    // --- 1. Water Stress Logic ---
    // High Temp + Low Rain = Drought Risk
    if (weather.tempMax > 35) {
        if (weather.rainfallMm < 2) {
            const deduction = 25;
            waterScore -= deduction;
            recommendations.push({
                id: 'wat_1',
                category: 'Water',
                title: 'Severe Heat & Dry Spell',
                description: `Temperatures are peaking at ${weather.tempMax.toFixed(1)}°C with negligible rainfall. Soil moisture will deplete rapidly.`,
                urgency: 'Critical',
                impactOnScore: deduction
            });
        } else if (weather.rainfallMm < 10) {
            const deduction = 10;
            waterScore -= deduction;
            recommendations.push({
                id: 'wat_2',
                category: 'Water',
                title: 'High Evaporation Rate',
                description: 'Heat is causing faster evaporation than current rainfall can replenish. Monitor irrigation.',
                urgency: 'Medium',
                impactOnScore: deduction
            });
        }
    }
    
    // --- 2. Pest & Disease Logic ---
    // High Humidity + Moderate/High Temp = Fungal Risk (e.g., Basal Stem Rot / Ganoderma)
    if (weather.humidity > 80 && weather.tempMax > 28) {
        const deduction = 30;
        pestScore -= deduction;
        recommendations.push({
            id: 'pest_1',
            category: 'Pest',
            title: 'High Fungal Disease Risk',
            description: `Humidity is at ${weather.humidity.toFixed(0)}% with warm temps. Conditions are ideal for fungal growth. Inspect trunk bases immediately.`,
            urgency: 'High',
            impactOnScore: deduction
        });
    }

    // --- 3. Soil Vulnerability ---
    const hasSandySoil = plots.some(p => p.soil_type === 'Sandy');
    if (hasSandySoil) {
        const deduction = 15;
        soilScore -= deduction;
        recommendations.push({
            id: 'soil_1',
            category: 'Soil',
            title: 'Sandy Soil Vulnerability',
            description: 'Your plots with Sandy soil lose nutrients quickly. Apply organic mulch to improve retention.',
            urgency: 'Medium',
            impactOnScore: deduction
        });
    }

    // --- 4. Crop Stage Vulnerability ---
    const now = new Date();
    const hasYoungPalms = plots.some(p => {
        if (!p.plantation_date) return false;
        const planted = new Date(p.plantation_date);
        const ageYears = (now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return ageYears < 3;
    });

    if (hasYoungPalms && waterScore < 80) {
         const deduction = 20;
         // Young palms suffer more from water stress
         recommendations.push({
             id: 'gen_1',
             category: 'Heat',
             title: 'Protect Young Saplings',
             description: 'Young palms (<3 years) are at critical risk from current heat stress. Prioritize watering them over mature trees.',
             urgency: 'Critical',
             impactOnScore: deduction
         });
         // This impacts the overall score additionally
         baseScore -= deduction;
    }

    // Calculate Weighted Total Score
    // Weights: Water 40%, Pest 30%, Soil 30%
    const calculatedScore = (waterScore * 0.4) + (pestScore * 0.3) + (soilScore * 0.3);
    
    // Apply any general deductions (like young palm extra risk)
    const finalScore = Math.max(0, Math.min(100, Math.round(Math.min(calculatedScore, baseScore))));

    let riskLevel: ClimateRiskAssessment['riskLevel'] = 'Low';
    if (finalScore < 40) riskLevel = 'Critical';
    else if (finalScore < 70) riskLevel = 'High';
    else if (finalScore < 85) riskLevel = 'Medium';

    return {
        score: finalScore,
        riskLevel,
        breakdown: {
            waterStress: waterScore,
            pestPressure: pestScore,
            soilResilience: soilScore
        },
        recommendations
    };
};

export const getMockWeatherData = (): WeatherData => {
    // Generate a base weather state
    const baseTemp = 30 + Math.random() * 10; // 30-40C
    const baseRain = Math.random() > 0.7 ? Math.random() * 20 : 0; // 30% chance of rain
    const baseHumid = 50 + Math.random() * 40; // 50-90%

    const generateDay = (offset: number): WeatherData => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return {
            date: d.toISOString().split('T')[0],
            tempMax: baseTemp + (Math.random() * 4 - 2),
            tempMin: baseTemp - 10 + (Math.random() * 2 - 1),
            rainfallMm: Math.max(0, baseRain + (Math.random() * 10 - 5)),
            humidity: Math.min(100, Math.max(30, baseHumid + (Math.random() * 20 - 10))),
            windSpeedKm: 5 + Math.random() * 15,
            ndvi: 0.4 + Math.random() * 0.4
        };
    };

    const current = generateDay(0);
    current.forecast = [generateDay(1), generateDay(2), generateDay(3)];
    
    return current;
};
