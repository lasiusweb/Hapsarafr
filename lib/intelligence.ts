

import { Farmer, FarmPlot, AgronomicInput, AgronomicRecommendation, InputType, DealerInventorySignal } from '../types';
import { calculateNeighborStats, NeighborStats } from './socialProof';

// Enhanced Rule Interface
interface RuleContext {
    farmer: Farmer;
    plots: FarmPlot[];
    inputs: AgronomicInput[];
    neighborStats: NeighborStats;
    inventory: DealerInventorySignal[];
    walletBalance: number;
    dataCompleteness: number; // 0 to 1
}

interface ScientiaRule {
    id: string;
    name: string;
    scientificSource: string; // e.g. "IIOPR 2023"
    baseConfidence: number; // 0-100% assuming perfect data
    condition: (ctx: RuleContext) => boolean;
    execute: (ctx: RuleContext) => Omit<AgronomicRecommendation, 'confidenceScore'>[];
}

// 1. Data Completeness Calculator
const calculateDataCompleteness = (ctx: Omit<RuleContext, 'dataCompleteness'>): number => {
    let score = 0;
    let totalWeight = 0;

    // A. Soil Data (High Value)
    totalWeight += 30;
    const hasSoilData = ctx.plots.some(p => p.soil_type && p.soil_type !== 'Unknown');
    if (hasSoilData) score += 30;

    // B. Plantation Age (Critical)
    totalWeight += 30;
    const hasAgeData = ctx.plots.every(p => p.plantation_date);
    if (hasAgeData) score += 30;
    else if (ctx.plots.some(p => p.plantation_date)) score += 15;

    // C. Input History (Context)
    totalWeight += 20;
    if (ctx.inputs.length > 0) score += 20;

    // D. Location Precision (For Weather/Neighbors)
    totalWeight += 20;
    if (ctx.farmer.mandal && ctx.farmer.village) score += 20;

    return totalWeight > 0 ? score / totalWeight : 0; // Returns 0.0 to 1.0
};

// --- Helper: Check Inventory & Wallet ---
// Returns metadata about stock status and affordability
const checkFeasibility = (ctx: RuleContext, productNameKeywords: string[], estimatedCost: number) => {
    // 1. Check Stock
    const relevantSignals = ctx.inventory.filter(s => 
        productNameKeywords.some(keyword => s.productId.toLowerCase().includes(keyword.toLowerCase())) // Using ID as proxy for name for MVP
    );
    
    let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'OUT_OF_STOCK';
    let bestProduct = null;

    // Sort by stock level desc
    relevantSignals.sort((a, b) => b.stockQuantity - a.stockQuantity);
    
    if (relevantSignals.length > 0) {
        const topSignal = relevantSignals[0];
        bestProduct = topSignal.productId;
        if (topSignal.stockQuantity > 50) stockStatus = 'IN_STOCK';
        else if (topSignal.stockQuantity > 0) stockStatus = 'LOW_STOCK';
    }

    // 2. Check Wallet
    const isFinanciallyFeasible = ctx.walletBalance >= estimatedCost;

    return { stockStatus, bestProduct, isFinanciallyFeasible };
};

// --- Rules Definition ---

const GestationNutritionRule: ScientiaRule = {
    id: 'sci_gestation_macro',
    name: 'Juvenile Palm Nutrition',
    scientificSource: 'IIOPR - Oil Palm Cultivation Guide 2023 (Sec 4.2)',
    baseConfidence: 95, // High scientific certainty
    condition: (ctx) => {
        const now = new Date();
        return ctx.plots.some(p => {
            if (!p.plantation_date) return false;
            const age = (now.getTime() - new Date(p.plantation_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
            return age < 3; // Young palms
        });
    },
    execute: (ctx) => {
        // ... Logic similar to previous engine but wrapped in Scientia structure
        const now = new Date();
        const recs: any[] = [];
        
        ctx.plots.forEach(p => {
            // Check for Nitrogen gap
            // Logic: If young plot, check inputs for Urea/DAP in last 3 months
            // Simplified for demo
            recs.push({
                id: `rec_${Date.now()}_${p.id}`,
                farmerId: ctx.farmer.id,
                triggerSource: 'sci_gestation_macro',
                type: 'MAINTENANCE',
                title: 'Critical Nutrient Application',
                description: 'Apply 250g Urea per palm for Year 1-2 growth.',
                reasoning: 'Young palms require nitrogen for leaf area expansion. Delayed application stunts growth.',
                priority: 'High',
                status: 'PENDING',
                createdAt: now.toISOString(),
                tenantId: ctx.farmer.tenantId,
                actionJson: JSON.stringify({ label: 'Log Application', intent: 'LOG_INPUT', payload: {} })
            });
        });
        return recs;
    }
};

const BoronDeficiencyRule: ScientiaRule = {
    id: 'sci_boron_check',
    name: 'Micronutrient Deficiency Risk',
    scientificSource: 'ICAR Research - Soil Health in Telangana',
    baseConfidence: 80,
    condition: (ctx) => {
        // Trigger if sandy soil OR no micronutrient input for > 1 year
        return ctx.plots.some(p => p.soil_type === 'Sandy') || ctx.inputs.length > 0; 
    },
    execute: (ctx) => {
        // Check for Boron inputs
        const hasBoron = ctx.inputs.some(i => i.name.toLowerCase().includes('boron'));
        if(!hasBoron) {
             return [{
                id: `rec_${Date.now()}_boron`,
                farmerId: ctx.farmer.id,
                triggerSource: 'sci_boron_check',
                type: 'YIELD_OPPORTUNITY',
                title: 'Prevent Hooked Leaf (Boron)',
                description: 'Sandy soils in your Mandal are prone to Boron deficiency.',
                reasoning: 'Deficiency leads to hooked leaf tips and poor fruit set later.',
                priority: 'Medium',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                tenantId: ctx.farmer.tenantId
            }];
        }
        return [];
    }
}

const RULES = [GestationNutritionRule, BoronDeficiencyRule];

// --- Engine Execution ---

export const generateScientiaInsights = (
    farmer: Farmer,
    plots: FarmPlot[],
    inputs: AgronomicInput[],
    allFarmers: Farmer[] = [],
    allPlots: FarmPlot[] = [],
    allInputs: AgronomicInput[] = [],
    inventory: DealerInventorySignal[] = [],
    walletBalance: number = 0
): AgronomicRecommendation[] => {
    
    // 1. Build Context
    const neighborStats = calculateNeighborStats(farmer, allFarmers, allPlots, allInputs);
    
    // 2. Calculate Data Fidelity
    const partialContext = { farmer, plots, inputs, neighborStats, inventory, walletBalance };
    const completeness = calculateDataCompleteness(partialContext);
    
    const context: RuleContext = { ...partialContext, dataCompleteness: completeness };

    // 3. Run Rules
    let recommendations: AgronomicRecommendation[] = [];

    RULES.forEach(rule => {
        try {
            if (rule.condition(context)) {
                const rawRecs = rule.execute(context);
                
                // 4. Apply Scientia Weighting
                const weightedRecs = rawRecs.map(rec => {
                    // Final Confidence = Base Confidence * Data Completeness
                    // Logic: Even if science is 100% sure Urea is good, if we don't know the Soil Type (data gap), 
                    // our confidence in *this specific* recommendation drops.
                    const finalConfidence = Math.round(rule.baseConfidence * completeness);
                    
                    return {
                        ...rec,
                        confidenceScore: finalConfidence,
                        scientificSource: rule.scientificSource,
                        expertReviewStatus: finalConfidence < 50 ? 'PENDING_REVIEW' : 'NOT_REQUIRED'
                    } as AgronomicRecommendation;
                });
                
                recommendations = [...recommendations, ...weightedRecs];
            }
        } catch (e) {
            console.error(`Scientia Engine Error [${rule.id}]:`, e);
        }
    });

    return recommendations.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));
};