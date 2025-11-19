
import { Farmer, FarmPlot, AgronomicInput, AgronomicRecommendation, PlantationMethod, PlantType, InputType } from '../types';

// Helper to calculate days difference
const daysBetween = (date1: Date, date2: Date) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
};

export const runIntelligenceEngine = (farmer: Farmer, plots: FarmPlot[], inputs: AgronomicInput[]): AgronomicRecommendation[] => {
    const recommendations: AgronomicRecommendation[] = [];
    const now = new Date();

    // --- Rule 1: Gestation Period Maintenance (Offline Heuristic) ---
    // Logic: If plot age < 4 years (approx 1460 days), recommend maintenance fertilizer if not applied in last 6 months.
    plots.forEach(plot => {
        if (plot.plantation_date) {
            const plantationDate = new Date(plot.plantation_date);
            const ageInDays = daysBetween(now, plantationDate);
            const ageInYears = ageInDays / 365;

            if (ageInYears < 4) {
                // Check for recent fertilizer input on this plot
                const recentFertilizer = inputs
                    .filter(i => i.farm_plot_id === plot.id && i.input_type === InputType.Fertilizer)
                    .sort((a, b) => new Date(b.input_date).getTime() - new Date(a.input_date).getTime())[0];

                const daysSinceLastInput = recentFertilizer ? daysBetween(now, new Date(recentFertilizer.input_date)) : 9999;

                if (daysSinceLastInput > 180) {
                    recommendations.push({
                        id: `rec_maint_${plot.id}_${Date.now()}`,
                        farmerId: farmer.id,
                        triggerSource: 'heuristic_engine_v1',
                        actionType: 'MAINTENANCE',
                        title: 'Apply Maintenance Fertilizer',
                        description: `It has been over 6 months since the last fertilizer application for plot "${plot.name}". Young palms need consistent nutrients.`,
                        reasoning: `Your palm trees in "${plot.name}" are ${ageInYears.toFixed(1)} years old (Gestation Phase). Consistent nutrient application every 6 months is critical for reaching maturity by year 4.`,
                        priority: 'High',
                        status: 'PENDING',
                        createdAt: now.toISOString(),
                        tenantId: farmer.tenantId,
                    });
                }
            }
        }
    });

    // --- Rule 2: Intercropping Opportunity ---
    // Logic: If crop age < 3 years and no 'Intercropping' activity recorded, suggest it.
    // Note: Ideally we'd check crop_assignments, but for this heuristic we'll use a simplified check or assume inputs might reflect it.
    // Let's assume if we see no inputs related to 'Intercrop' seeds/labor.
    plots.forEach(plot => {
        if (plot.plantation_date) {
            const ageInYears = daysBetween(now, new Date(plot.plantation_date)) / 365;
            if (ageInYears < 3) {
                 // Simple heuristic: has the farmer ever logged an input with "Maize", "Pulse", "Groundnut"?
                 const hasIntercropInput = inputs.some(i => {
                     const name = i.name.toLowerCase();
                     return i.farm_plot_id === plot.id && (name.includes('maize') || name.includes('pulse') || name.includes('groundnut') || name.includes('intercrop'));
                 });

                 if (!hasIntercropInput) {
                     recommendations.push({
                         id: `rec_inter_${plot.id}_${Date.now()}`,
                         farmerId: farmer.id,
                         triggerSource: 'heuristic_engine_v1',
                         actionType: 'GENERAL',
                         title: 'Intercropping Opportunity',
                         description: `Consider planting Maize or Pulses in the wide spaces between young palms in "${plot.name}".`,
                         reasoning: `Your palms are young (${ageInYears.toFixed(1)} years), leaving significant land area unused. Intercropping can generate additional income of ₹20,000-₹40,000/acre before the canopy closes.`,
                         priority: 'Medium',
                         status: 'PENDING',
                         createdAt: now.toISOString(),
                         tenantId: farmer.tenantId,
                     });
                 }
            }
        }
    });

    // --- Rule 3: Soil Health Correction ---
    // Logic: If soil type is 'Sandy', recommend organic amendments.
    plots.forEach(plot => {
        if (plot.soil_type === 'Sandy') {
             const hasOrganicInput = inputs.some(i => {
                 const name = i.name.toLowerCase();
                 return i.farm_plot_id === plot.id && (name.includes('manure') || name.includes('vermi') || name.includes('compost'));
             });

             if (!hasOrganicInput) {
                 recommendations.push({
                     id: `rec_soil_${plot.id}_${Date.now()}`,
                     farmerId: farmer.id,
                     triggerSource: 'heuristic_engine_v1',
                     actionType: 'INPUT_PURCHASE',
                     title: 'Improve Sandy Soil',
                     description: `Apply Vermicompost or Farm Yard Manure to plot "${plot.name}".`,
                     reasoning: `Sandy soil drains water and nutrients too quickly. Adding organic matter acts like a sponge, retaining moisture and fertilizer for the roots to absorb, potentially increasing yield by 15-20%.`,
                     priority: 'Medium',
                     status: 'PENDING',
                     createdAt: now.toISOString(),
                     tenantId: farmer.tenantId,
                 });
             }
        }
    });

    return recommendations;
};
