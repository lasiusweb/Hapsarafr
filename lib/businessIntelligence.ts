
import { FarmPlotModel, ProductModel } from '../db';
import { farmPlotModelToPlain } from './utils';

// Simple types for the logic
interface PredictionResult {
    productId: string;
    productName: string;
    category: string;
    predictedQuantity: number;
    unit: string;
    confidence: number; // 0 to 1
    reasoning: string;
}

/**
 * Calculates inventory demand based on crop age and acreage.
 * This is a simplified heuristic engine. In production, this would query
 * pre-calculated aggregates from the server to avoid processing thousands of records on the client.
 */
export const getInventoryPredictions = (
    plots: FarmPlotModel[], 
    products: ProductModel[]
): PredictionResult[] => {
    const now = new Date();
    const predictions: PredictionResult[] = [];
    
    // 1. Calculate Total Acreage by Age Cohort
    let gestationAcreage = 0; // < 4 years
    let matureAcreage = 0;    // > 4 years

    plots.forEach(plotModel => {
        const plot = farmPlotModelToPlain(plotModel);
        if (!plot || !plot.plantation_date) return;
        
        const plantationDate = new Date(plot.plantation_date);
        const ageInYears = (now.getTime() - plantationDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        if (ageInYears < 4) {
            gestationAcreage += plot.acreage;
        } else {
            matureAcreage += plot.acreage;
        }
    });

    // 2. Heuristic Rules for Demand

    // Rule A: Urea (Nitrogen) Demand
    // Assumption: 1 kg per tree per year for young palms (approx 57 trees/acre) -> 57kg/acre
    // Simple math: Acreage * 50kg
    const ureaProduct = products.find(p => p.name.toLowerCase().includes('urea'));
    if (ureaProduct) {
        const demand = Math.round((gestationAcreage * 50) + (matureAcreage * 100)); // Mature trees need more
        if (demand > 0) {
            predictions.push({
                productId: ureaProduct.id,
                productName: ureaProduct.name,
                category: 'Fertilizer',
                predictedQuantity: demand,
                unit: 'kg',
                confidence: 0.85, // High confidence for basic fertilizer
                reasoning: `Base demand for ${gestationAcreage.toFixed(1)} ac young & ${matureAcreage.toFixed(1)} ac mature palms.`
            });
        }
    }

    // Rule B: Harvesting Tools
    // Assumption: Mature acreage implies harvesting. 1 sickle per 10 acres?
    const toolProduct = products.find(p => p.name.toLowerCase().includes('sickle') || p.name.toLowerCase().includes('cutter'));
    if (toolProduct && matureAcreage > 0) {
        const demand = Math.ceil(matureAcreage / 10);
        predictions.push({
            productId: toolProduct.id,
            productName: toolProduct.name,
            category: 'Tools',
            predictedQuantity: demand,
            unit: 'units',
            confidence: 0.6,
            reasoning: `Replacement demand estimated for ${matureAcreage.toFixed(1)} active harvest acres.`
        });
    }

    // Rule C: Boron / Micro-nutrients (Gestation focus)
    // Often needed in year 2-3. Let's just take a % of gestation acreage.
    const boronProduct = products.find(p => p.name.toLowerCase().includes('boron') || p.name.toLowerCase().includes('micro'));
    if (boronProduct && gestationAcreage > 0) {
        const demand = Math.round(gestationAcreage * 5); // 5kg/acre estimate
         predictions.push({
            productId: boronProduct.id,
            productName: boronProduct.name,
            category: 'Fertilizer',
            predictedQuantity: demand,
            unit: 'kg',
            confidence: 0.5, // Lower confidence as soil tests vary
            reasoning: `Standard micronutrient requirement for young palms.`
        });
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
};
