
import { Farmer, FarmPlot, AgronomicInput, AgronomicRecommendation, InputType, DealerInventorySignal } from '../types';
import { calculateNeighborStats, NeighborStats } from './socialProof';

// Rule Definition Interface
interface RuleContext {
    farmer: Farmer;
    plots: FarmPlot[];
    inputs: AgronomicInput[];
    neighborStats: NeighborStats;
    inventory: DealerInventorySignal[];
    walletBalance: number; // For financial feasibility checks
}

interface Rule {
    id: string;
    name: string;
    condition: (ctx: RuleContext) => boolean;
    execute: (ctx: RuleContext) => AgronomicRecommendation[];
}

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

// --- Rules ---

const GestationMaintenanceRule: Rule = {
    id: 'rule_gestation_maint',
    name: 'Gestation Period Maintenance',
    condition: (ctx) => {
        const now = new Date();
        return ctx.plots.some(p => {
            if (!p.plantation_date) return false;
            const ageInYears = (now.getTime() - new Date(p.plantation_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
            return ageInYears < 4;
        });
    },
    execute: (ctx) => {
        const recs: AgronomicRecommendation[] = [];
        const now = new Date();
        
        ctx.plots.forEach(plot => {
            if (!plot.plantation_date) return;
            const ageInYears = (now.getTime() - new Date(plot.plantation_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
            
            if (ageInYears < 4) {
                // Check for recent fertilizer
                const recentFertilizer = ctx.inputs
                    .filter(i => i.farm_plot_id === plot.id && i.input_type === InputType.Fertilizer)
                    .sort((a, b) => new Date(b.input_date).getTime() - new Date(a.input_date).getTime())[0];
                
                const daysSince = recentFertilizer ? (now.getTime() - new Date(recentFertilizer.input_date).getTime()) / (1000 * 3600 * 24) : 999;
                
                if (daysSince > 180) {
                    const popularFert = ctx.neighborStats.popularFertilizers[0]?.name || 'Complex Fertilizer';
                    
                    // ** INTELLECTUS UPGRADE: Inventory & Wallet Check **
                    const estCost = plot.acreage * 1500; // Approx cost per acre
                    const feasibility = checkFeasibility(ctx, ['urea', 'complex', 'npk'], estCost);

                    let title = 'Apply Maintenance Fertilizer';
                    let desc = `It has been >6 months since last fertilizer on "${plot.name}".`;
                    
                    if (feasibility.stockStatus === 'OUT_OF_STOCK') {
                        desc += ' (⚠️ Dealer Out of Stock - Consider Booking)';
                    } else if (feasibility.stockStatus === 'LOW_STOCK') {
                        desc += ' (⚠️ Low Stock - Order Soon)';
                    }

                    recs.push({
                        id: `rec_maint_${plot.id}_${Date.now()}`,
                        farmerId: ctx.farmer.id,
                        triggerSource: 'rule_gestation_maint',
                        type: 'MAINTENANCE',
                        actionType: 'MAINTENANCE',
                        title: title,
                        description: desc,
                        reasoning: `Young palms (${ageInYears.toFixed(1)} yrs) need consistent nutrients. ROI: Est. 15% yield gain in maturity.`,
                        priority: 'High',
                        status: 'PENDING',
                        createdAt: now.toISOString(),
                        tenantId: ctx.farmer.tenantId,
                        socialProofJson: ctx.neighborStats.popularFertilizers.length > 0 ? JSON.stringify({ text: `${Math.round((ctx.neighborStats.popularFertilizers[0].count / 10) * 100)}% of neighbors used ${popularFert}.` }) : undefined,
                        actionJson: JSON.stringify({ 
                            label: feasibility.stockStatus === 'OUT_OF_STOCK' ? 'Pre-book Input' : 'Buy Input', 
                            intent: 'OPEN_MARKETPLACE', 
                            payload: { category: 'Fertilizers', search: popularFert } 
                        }),
                        isFinanciallyFeasible: feasibility.isFinanciallyFeasible,
                        inventoryStatus: feasibility.stockStatus,
                        alternativeProductId: feasibility.bestProduct || undefined
                    });
                }
            }
        });
        return recs;
    }
};

const SandySoilRule: Rule = {
    id: 'rule_sandy_soil',
    name: 'Sandy Soil Amendment',
    condition: (ctx) => ctx.plots.some(p => p.soil_type === 'Sandy'),
    execute: (ctx) => {
        const recs: AgronomicRecommendation[] = [];
        const now = new Date();

        ctx.plots.filter(p => p.soil_type === 'Sandy').forEach(plot => {
             const hasOrganic = ctx.inputs.some(i => i.farm_plot_id === plot.id && (i.name.toLowerCase().includes('manure') || i.name.toLowerCase().includes('vermi')));
             
             if (!hasOrganic) {
                 const estCost = plot.acreage * 2000;
                 const feasibility = checkFeasibility(ctx, ['vermi', 'compost', 'manure'], estCost);

                 recs.push({
                     id: `rec_soil_${plot.id}_${Date.now()}`,
                     farmerId: ctx.farmer.id,
                     triggerSource: 'rule_sandy_soil',
                     type: 'INPUT_PURCHASE',
                     actionType: 'INPUT_PURCHASE',
                     title: 'Improve Sandy Soil Retention',
                     description: `Sandy soil in "${plot.name}" drains quickly. Add organic matter.`,
                     reasoning: `Organic amendments reduce water usage by ~20% in sandy soils.`,
                     priority: 'Medium',
                     status: 'PENDING',
                     createdAt: now.toISOString(),
                     tenantId: ctx.farmer.tenantId,
                     actionJson: JSON.stringify({
                         label: 'Find Supplier',
                         intent: 'OPEN_MARKETPLACE',
                         payload: { category: 'Fertilizers', search: 'Vermicompost' }
                     }),
                     isFinanciallyFeasible: feasibility.isFinanciallyFeasible,
                     inventoryStatus: feasibility.stockStatus
                 });
             }
        });
        return recs;
    }
};

const DripIrrigationUpsellRule: Rule = {
    id: 'rule_drip_upsell',
    name: 'Drip Irrigation Adoption',
    condition: (ctx) => {
        const totalAcres = ctx.plots.reduce((sum, p) => sum + p.acreage, 0);
        const hasDrip = ctx.inputs.some(i => i.name.toLowerCase().includes('drip'));
        return totalAcres > 5 && !hasDrip;
    },
    execute: (ctx) => {
        const now = new Date();
        const adoptionRate = ctx.neighborStats.adoptionRates['Drip Irrigation'];
        
        // Check Wallet - Drip is expensive!
        const canAffordDownPayment = ctx.walletBalance > 5000;

        if (adoptionRate && adoptionRate > 0.3) { 
             return [{
                 id: `rec_drip_${ctx.farmer.id}`,
                 farmerId: ctx.farmer.id,
                 triggerSource: 'rule_drip_upsell',
                 type: 'YIELD_OPPORTUNITY',
                 actionType: 'YIELD_OPPORTUNITY',
                 title: 'Upgrade to Drip Irrigation',
                 description: canAffordDownPayment ? 'Subsidy available. Downpayment affordable.' : 'Subsidy available, but requires savings plan.',
                 reasoning: `Drip irrigation can increase yield by 20% and save 40% water.`,
                 priority: 'Medium',
                 status: 'PENDING',
                 createdAt: now.toISOString(),
                 tenantId: ctx.farmer.tenantId,
                 socialProofJson: JSON.stringify({ text: `${(adoptionRate * 100).toFixed(0)}% of local farmers use Drip.` }),
                 actionJson: JSON.stringify({
                     label: 'View Subsidies',
                     intent: 'OPEN_SUBSIDIES',
                     payload: { filter: 'Drip' }
                 }),
                 isFinanciallyFeasible: canAffordDownPayment
             }];
        }
        return [];
    }
}


const RULES = [GestationMaintenanceRule, SandySoilRule, DripIrrigationUpsellRule];

// --- Engine Entry Point ---

export const runIntelligenceEngine = (
    farmer: Farmer, 
    plots: FarmPlot[], 
    inputs: AgronomicInput[],
    allFarmers: Farmer[] = [],
    allPlots: FarmPlot[] = [],
    allInputs: AgronomicInput[] = [],
    // ** NEW PARAMS **
    inventory: DealerInventorySignal[] = [],
    walletBalance: number = 0
): AgronomicRecommendation[] => {
    
    // 1. Calculate Context
    const neighborStats = calculateNeighborStats(farmer, allFarmers, allPlots, allInputs);
    
    const context: RuleContext = {
        farmer,
        plots,
        inputs,
        neighborStats,
        inventory,
        walletBalance
    };

    // 2. Execute Rules
    let recommendations: AgronomicRecommendation[] = [];
    
    RULES.forEach(rule => {
        try {
            if (rule.condition(context)) {
                const ruleRecs = rule.execute(context);
                recommendations = [...recommendations, ...ruleRecs];
            }
        } catch (e) {
            console.error(`Error executing rule ${rule.name}`, e);
        }
    });

    return recommendations;
};
