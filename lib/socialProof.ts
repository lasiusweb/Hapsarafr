
import { Farmer, FarmPlot, AgronomicInput, InputType } from '../types';

export interface NeighborStats {
    popularFertilizers: { name: string; count: number }[];
    avgYield: number;
    commonPests: { name: string; count: number }[];
    adoptionRates: Record<string, number>; // e.g., "Drip Irrigation": 0.45
}

export const calculateNeighborStats = (
    targetFarmer: Farmer,
    allFarmers: Farmer[],
    allPlots: FarmPlot[],
    allInputs: AgronomicInput[]
): NeighborStats => {
    // 1. Filter neighbors (Same Mandal)
    const neighborIds = new Set(
        allFarmers
            .filter(f => f.mandal === targetFarmer.mandal && f.id !== targetFarmer.id)
            .map(f => f.id)
    );

    if (neighborIds.size === 0) {
        return { popularFertilizers: [], avgYield: 0, commonPests: [], adoptionRates: {} };
    }

    // 2. Filter relevant data
    const neighborPlots = allPlots.filter(p => neighborIds.has(p.farmerId));
    const neighborPlotIds = new Set(neighborPlots.map(p => p.id));
    const neighborInputs = allInputs.filter(i => neighborPlotIds.has(i.farm_plot_id));

    // 3. Calculate Popular Fertilizers
    const fertCounts: Record<string, number> = {};
    neighborInputs
        .filter(i => i.input_type === InputType.Fertilizer)
        .forEach(i => {
            const name = i.name.toLowerCase();
            // Normalize names (simple heuristic)
            let key = name;
            if (name.includes('urea')) key = 'Urea';
            else if (name.includes('dap')) key = 'DAP';
            else if (name.includes('potash') || name.includes('mop')) key = 'MOP';
            else if (name.includes('boron')) key = 'Boron';
            
            fertCounts[key] = (fertCounts[key] || 0) + 1;
        });
    
    const popularFertilizers = Object.entries(fertCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    // 4. Adoption Rates (e.g., Drip Irrigation)
    // Check how many neighbor farmers have at least one input of type 'IRRIGATION'
    const farmersWithDrip = new Set();
    neighborInputs
        .filter(i => i.input_type === InputType.Irrigation && i.name.toLowerCase().includes('drip'))
        .forEach(i => {
             const plot = neighborPlots.find(p => p.id === i.farm_plot_id);
             if (plot) farmersWithDrip.add(plot.farmerId);
        });
    
    const adoptionRates = {
        'Drip Irrigation': farmersWithDrip.size / neighborIds.size
    };

    // 5. Common Pests (from Pesticide inputs)
    const pestCounts: Record<string, number> = {};
    neighborInputs
        .filter(i => i.input_type === InputType.Pesticide)
        .forEach(i => {
            // Assuming input name might mention the target pest, e.g., "Pesticide for Scale"
            // This is weak without structured pest data, but good for MVP
            const name = i.name; 
            pestCounts[name] = (pestCounts[name] || 0) + 1;
        });
    
    const commonPests = Object.entries(pestCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    return {
        popularFertilizers,
        avgYield: 0, // Placeholder until Harvest data is integrated here
        commonPests,
        adoptionRates
    };
};
