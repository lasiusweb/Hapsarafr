
import React, { useState, useEffect, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, FarmPlotModel, ProductModel, AgronomicInputModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { getInventoryPredictions, SalesTrend } from '../lib/businessIntelligence';
import { formatCurrency } from '../lib/utils';

interface DealerSalesViewProps {
    dealerMandal?: string;
    salesTrends?: SalesTrend[];
}

const OpportunityCard: React.FC<{ title: string; count: number; potentialValue: string; action: string }> = ({ title, count, potentialValue, action }) => (
    <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-gray-800">{title}</h4>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">{count} Leads</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">Est. Value: <span className="font-semibold text-green-600">{potentialValue}</span></p>
        <button className="w-full py-2 text-sm font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition">
            {action}
        </button>
    </div>
);

const SimpleBarChart: React.FC<{ data: SalesTrend[] }> = ({ data }) => {
    const maxVal = Math.max(...data.map(d => d.revenue), 1);
    
    return (
        <div className="flex items-end justify-between h-40 gap-2 mt-4">
            {data.map(d => (
                <div key={d.period} className="flex flex-col items-center gap-1 flex-1 group relative">
                     <div className="w-full bg-indigo-50 rounded-t-md relative overflow-hidden h-full flex items-end border-b border-indigo-100">
                        <div 
                            style={{ height: `${(d.revenue / maxVal) * 100}%` }} 
                            className="w-full bg-indigo-500 transition-all duration-500 group-hover:bg-indigo-600 rounded-t-sm"
                        ></div>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        {formatCurrency(d.revenue)} ({d.count} orders)
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{d.period}</span>
                </div>
            ))}
        </div>
    );
};

const DealerSalesView: React.FC<DealerSalesViewProps> = ({ dealerMandal, salesTrends }) => {
    const database = useDatabase();
    
    // Fetch data (scoped to region if possible, here fetching all for demo logic)
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const plots = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(), [database]));
    const inputs = useQuery(useMemo(() => database.get<AgronomicInputModel>('agronomic_inputs').query(), [database]));

    // Calculated Metrics
    const opportunities = useMemo(() => {
        const localFarmers = dealerMandal ? farmers.filter(f => f.mandal === dealerMandal) : farmers;
        const localFarmerIds = new Set(localFarmers.map(f => f.id));
        
        // 1. Micronutrient Upsell (Farmers in Year 2-3 who haven't bought micronutrients recently)
        const microNutrientLeads = localFarmers.filter(f => {
            const farmerPlots = plots.filter(p => p.farmerId === f.id);
            // Check if any plot is 2-3 years old
            const hasYoungPlot = farmerPlots.some(p => {
                if(!p.plantationDate) return false;
                const age = (new Date().getTime() - new Date(p.plantationDate).getTime()) / (1000 * 3600 * 24 * 365);
                return age > 1.5 && age < 3.5;
            });
            
            if (!hasYoungPlot) return false;
            
            // Check inputs
            const hasMicroInput = inputs.some(i => 
                farmerPlots.some(p => p.id === i.farmPlotId) && 
                (i.name.toLowerCase().includes('boron') || i.name.toLowerCase().includes('zinc'))
            );
            return !hasMicroInput;
        });

        // 2. Bio-stimulant Cross-sell (Farmers who bought Fertilizer but not Bio-stimulants)
        const bioLeads = localFarmers.filter(f => {
            const farmerPlots = plots.filter(p => p.farmerId === f.id);
            // Check inputs
            const hasFert = inputs.some(i => farmerPlots.some(p => p.id === i.farmPlotId) && i.inputType === 'FERTILIZER');
            const hasBio = inputs.some(i => farmerPlots.some(p => p.id === i.farmPlotId) && i.name.toLowerCase().includes('bio'));
            return hasFert && !hasBio;
        });

        return {
            microNutrient: { count: microNutrientLeads.length, value: `₹${(microNutrientLeads.length * 1200).toLocaleString()}` },
            bioStimulant: { count: bioLeads.length, value: `₹${(bioLeads.length * 800).toLocaleString()}` }
        };
    }, [farmers, plots, inputs, dealerMandal]);

    return (
        <div className="space-y-6">
            
            {/* Sales Trend Chart */}
            {salesTrends && salesTrends.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-bold text-gray-800">Revenue Performance</h2>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Last 6 Months</span>
                    </div>
                    <SimpleBarChart data={salesTrends} />
                </div>
            )}

            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
                <h2 className="text-xl font-bold mb-2">Gap Analysis & Upsell</h2>
                <p className="opacity-90 text-sm">
                    Identify farmers in your area who are missing critical inputs for their crop stage. 
                    Use these insights to drive high-margin sales.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OpportunityCard 
                    title="Micronutrient Deficit" 
                    count={opportunities.microNutrient.count} 
                    potentialValue={opportunities.microNutrient.value}
                    action="View Target List"
                />
                <OpportunityCard 
                    title="Bio-Stimulant Cross-sell" 
                    count={opportunities.bioStimulant.count} 
                    potentialValue={opportunities.bioStimulant.value}
                    action="Send WhatsApp Promo"
                />
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-800 mb-2">Stock Alert</h4>
                <p className="text-sm text-yellow-700">
                    Based on local pest reports, demand for <strong>Chlorpyrifos</strong> is expected to rise by 40% next week. Ensure you have adequate stock.
                </p>
            </div>
        </div>
    );
};

export default DealerSalesView;
