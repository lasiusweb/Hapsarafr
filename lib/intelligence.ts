


import { Farmer, FarmPlot, AgronomicInput, AgronomicRecommendation, InputType } from '../types';
import { calculateNeighborStats, NeighborStats } from './socialProof';

// Rule Definition Interface
interface RuleContext {
    farmer: Farmer;
    plots: FarmPlot[];
    inputs: AgronomicInput[];
    neighborStats: NeighborStats;
}

interface Rule {
    id: string;
    name: string;
    condition: (ctx: RuleContext) => boolean;
    execute: (ctx: RuleContext) => AgronomicRecommendation[];
}

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
                    // Social Proof Generation
                    const popularFert = ctx.neighborStats.popularFertilizers[0]?.name || 'Complex Fertilizer';
                    const socialProofText = ctx.neighborStats.popularFertilizers.length > 0 
                        ? `${Math.round((ctx.neighborStats.popularFertilizers[0].count / 10) * 100)}% of neighbors used ${popularFert} this season.` 
                        : undefined;

                    recs.push({
                        id: `rec_maint_${plot.id}_${Date.now()}`,
                        farmerId: ctx.farmer.id,
                        triggerSource: 'rule_gestation_maint',
                        type: 'MAINTENANCE',
                        actionType: 'MAINTENANCE',
                        title: 'Apply Maintenance Fertilizer',
                        description: `It has been >6 months since last fertilizer on "${plot.name}".`,
                        reasoning: `Young palms (${ageInYears.toFixed(1)} yrs) need consistent nutrients for growth.`,
                        priority: 'High',
                        status: 'PENDING',
                        createdAt: now.toISOString(),
                        tenantId: ctx.farmer.tenantId,
                        socialProofJson: socialProofText ? JSON.stringify({ text: socialProofText }) : undefined,
                        actionJson: JSON.stringify({ 
                            label: 'Log Application', 
                            intent: 'OPEN_INPUT_LOG', 
                            payload: { type: 'FERTILIZER', defaultName: popularFert } 
                        })
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
                 recs.push({
                     id: `rec_soil_${plot.id}_${Date.now()}`,
                     farmerId: ctx.farmer.id,
                     triggerSource: 'rule_sandy_soil',
                     type: 'INPUT_PURCHASE',
                     actionType: 'INPUT_PURCHASE',
                     title: 'Improve Sandy Soil Retention',
                     description: `Sandy soil in "${plot.name}" drains quickly. Add organic matter.`,
                     reasoning: `Organic amendments act like a sponge for water/nutrients, vital for sandy soil.`,
                     priority: 'Medium',
                     status: 'PENDING',
                     createdAt: now.toISOString(),
                     tenantId: ctx.farmer.tenantId,
                     actionJson: JSON.stringify({
                         label: 'Find Supplier',
                         intent: 'OPEN_MARKETPLACE',
                         payload: { category: 'Fertilizers', search: 'Vermicompost' }
                     })
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
        // If farmer has > 5 acres and NO drip irrigation recorded
        const totalAcres = ctx.plots.reduce((sum, p) => sum + p.acreage, 0);
        const hasDrip = ctx.inputs.some(i => i.name.toLowerCase().includes('drip'));
        return totalAcres > 5 && !hasDrip;
    },
    execute: (ctx) => {
        const now = new Date();
        const adoptionRate = ctx.neighborStats.adoptionRates['Drip Irrigation'];
        
        if (adoptionRate && adoptionRate > 0.3) { // Only recommend if > 30% neighbors use it
             return [{
                 id: `rec_drip_${ctx.farmer.id}`,
                 farmerId: ctx.farmer.id,
                 triggerSource: 'rule_drip_upsell',
                 type: 'YIELD_OPPORTUNITY',
                 actionType: 'YIELD_OPPORTUNITY',
                 title: 'Upgrade to Drip Irrigation',
                 description: `Consider installing drip irrigation to improve water efficiency.`,
                 reasoning: `Drip irrigation can increase yield by 20%.`,
                 priority: 'Medium',
                 status: 'PENDING',
                 createdAt: now.toISOString(),
                 tenantId: ctx.farmer.tenantId,
                 socialProofJson: JSON.stringify({ text: `${(adoptionRate * 100).toFixed(0)}% of farmers in your Mandal use Drip Irrigation.` }),
                 actionJson: JSON.stringify({
                     label: 'View Subsidies',
                     intent: 'OPEN_SUBSIDIES',
                     payload: { filter: 'Drip' }
                 })
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
    // In a real app, we'd pass allFarmers/allPlots here or fetch them inside. 
    // For MVP, we might rely on the caller to provide context or simple heuristics if data is missing.
    allFarmers: Farmer[] = [],
    allPlots: FarmPlot[] = [],
    allInputs: AgronomicInput[] = []
): AgronomicRecommendation[] => {
    
    // 1. Calculate Context
    const neighborStats = calculateNeighborStats(farmer, allFarmers, allPlots, allInputs);
    
    const context: RuleContext = {
        farmer,
        plots,
        inputs,
        neighborStats
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