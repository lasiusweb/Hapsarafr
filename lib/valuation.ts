
import { RoadAccessType } from '../types';

/**
 * Calculates the Hapsara Value Score (HVS) based on the heuristic formula:
 * HVS = (Avg_3Yr_Yield * 0.4) + (Soil_Organic_Carbon * 0.2) + (Water_Table_Stability * 0.2) + (Road_Access_Index * 0.2)
 * 
 * Normalization logic:
 * - Yield: Max expected 15 tons/acre -> score 100.
 * - SOC: Max expected 2.5% -> score 100.
 * - Water Table: 0-50ft = 100, >500ft = 0.
 */
export const calculateHVS = (
    avgYield: number, // Tons per acre
    soc: number, // Percentage (e.g. 1.2)
    waterDepth: number, // Feet
    roadAccess: RoadAccessType
): number => {
    
    // 1. Normalize Yield (40% weight)
    // Assuming 15 tons/acre is excellent (100 points)
    const yieldScore = Math.min((avgYield / 15) * 100, 100);

    // 2. Normalize Soil Organic Carbon (20% weight)
    // Assuming 2.0% or higher is excellent (100 points)
    const socScore = Math.min((soc / 2.0) * 100, 100);

    // 3. Normalize Water Table (20% weight)
    // Shallower is better. 
    // 0-50ft: 100
    // 500ft+: 0
    let waterScore = 0;
    if (waterDepth <= 50) waterScore = 100;
    else if (waterDepth >= 500) waterScore = 0;
    else {
        // Linear interpolation between 50 and 500
        waterScore = 100 - ((waterDepth - 50) / (500 - 50)) * 100;
    }

    // 4. Normalize Road Access (20% weight)
    let roadScore = 0;
    switch (roadAccess) {
        case RoadAccessType.Highway: roadScore = 100; break;
        case RoadAccessType.PavedRoad: roadScore = 80; break;
        case RoadAccessType.DirtRoad: roadScore = 40; break;
        case RoadAccessType.NoAccess: roadScore = 10; break;
    }

    // Calculate Weighted Score
    const rawScore = (yieldScore * 0.4) + (socScore * 0.2) + (waterScore * 0.2) + (roadScore * 0.2);

    return Math.round(rawScore);
};

export const getHvsGrade = (score: number): string => {
    if (score >= 85) return 'Grade A+';
    if (score >= 70) return 'Grade A';
    if (score >= 50) return 'Grade B';
    if (score >= 30) return 'Grade C';
    return 'Ungraded';
};

export const getHvsColor = (score: number): string => {
    if (score >= 85) return 'text-green-700 bg-green-100';
    if (score >= 70) return 'text-blue-700 bg-blue-100';
    if (score >= 50) return 'text-yellow-700 bg-yellow-100';
    return 'text-gray-700 bg-gray-100';
};
