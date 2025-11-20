
import { FarmPlotModel, ProductModel, DealerInventorySignalModel } from '../db';
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
    stockStatus: 'OK' | 'LOW' | 'CRITICAL_OUT';
    gap: number;
}

/**
 * Calculates inventory demand based on crop age and acreage.
 * Enhanced for "Samridhi": Includes stock comparisons and improved heuristics.
 */
export const getInventoryPredictions = (
    plots: FarmPlotModel[], 
    products: ProductModel[],
    inventorySignals: DealerInventorySignalModel[] = [] // Optional for basic forecast
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

    // Helper to get current stock
    const getStock = (prodId: string) => {
        const signal = inventorySignals.find(s => s.productId === prodId);
        return signal ? signal.stockQuantity || 0 : 0;
    };

    const evaluateStock = (demand: number, stock: number) : 'OK' | 'LOW' | 'CRITICAL_OUT' => {
        if (stock <= 0) return 'CRITICAL_OUT';
        if (stock < demand * 0.5) return 'LOW'; // Less than 50% of demand covered
        return 'OK';
    }

    // 2. Heuristic Rules for Demand

    // Rule A: Urea (Nitrogen) Demand
    // Assumption: 1 kg per tree per year for young palms (approx 57 trees/acre) -> 57kg/acre
    // Simple math: Acreage * 50kg
    const ureaProduct = products.find(p => p.name.toLowerCase().includes('urea'));
    if (ureaProduct) {
        const demand = Math.round((gestationAcreage * 50) + (matureAcreage * 100)); // Mature trees need more
        if (demand > 0) {
            const stock = getStock((ureaProduct as any).id);
            predictions.push({
                productId: (ureaProduct as any).id,
                productName: ureaProduct.name,
                category: 'Fertilizer',
                predictedQuantity: demand,
                unit: 'kg',
                confidence: 0.85, // High confidence for basic fertilizer
                reasoning: `Base demand for ${gestationAcreage.toFixed(1)} ac young & ${matureAcreage.toFixed(1)} ac mature palms.`,
                stockStatus: evaluateStock(demand, stock),
                gap: Math.max(0, demand - stock)
            });
        }
    }

    // Rule B: Harvesting Tools
    // Assumption: Mature acreage implies harvesting. 1 sickle per 10 acres?
    const toolProduct = products.find(p => p.name.toLowerCase().includes('sickle') || p.name.toLowerCase().includes('cutter'));
    if (toolProduct && matureAcreage > 0) {
        const demand = Math.ceil(matureAcreage / 10);
        if (demand > 0) {
            const stock = getStock((toolProduct as any).id);
             predictions.push({
                productId: (toolProduct as any).id,
                productName: toolProduct.name,
                category: 'Tools',
                predictedQuantity: demand,
                unit: 'units',
                confidence: 0.6,
                reasoning: `Replacement demand estimated for ${matureAcreage.toFixed(1)} active harvest acres.`,
                stockStatus: evaluateStock(demand, stock),
                gap: Math.max(0, demand - stock)
            });
        }
    }

    // Rule C: Boron / Micro-nutrients (Gestation focus)
    // Often needed in year 2-3. Let's just take a % of gestation acreage.
    const boronProduct = products.find(p => p.name.toLowerCase().includes('boron') || p.name.toLowerCase().includes('micro'));
    if (boronProduct && gestationAcreage > 0) {
        const demand = Math.round(gestationAcreage * 5); // 5kg/acre estimate
        if (demand > 0) {
             const stock = getStock((boronProduct as any).id);
             predictions.push({
                productId: (boronProduct as any).id,
                productName: boronProduct.name,
                category: 'Fertilizer',
                predictedQuantity: demand,
                unit: 'kg',
                confidence: 0.5, // Lower confidence as soil tests vary
                reasoning: `Standard micronutrient requirement for young palms.`,
                stockStatus: evaluateStock(demand, stock),
                gap: Math.max(0, demand - stock)
            });
        }
    }

    return predictions.sort((a, b) => b.gap - a.gap); // Sort by biggest gap (opportunity) first
};
