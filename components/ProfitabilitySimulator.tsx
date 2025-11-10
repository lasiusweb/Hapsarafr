import React, { useState, useMemo, useEffect } from 'react';
import { Plot } from '../types';

// Constants for calculation, can be moved to a config file later
const HECTARE_TO_ACRE = 2.471;
const MAINTENANCE_SUBSIDY_PER_HA = 5250;
const INTERCROPPING_SUBSIDY_PER_HA = 5250;
const GESTATION_COST_PER_ACRE = 15000;
const MATURE_COST_PER_ACRE = 20000;
const YIELD_TONS_PER_ACRE = 10;
const FFB_PRICE_PER_TON = 11000;

interface ProfitabilitySimulatorProps {
    plots: Plot[];
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

const YearCard: React.FC<{ yearData: any }> = ({ yearData }) => {
    const isProfit = yearData.net >= 0;
    return (
        <div className="bg-white rounded-lg shadow-md p-4 border flex flex-col">
            <h4 className="font-bold text-lg text-gray-800">Year {yearData.year}</h4>
            <p className="text-sm text-gray-500 mb-3">{yearData.phase}</p>
            
            <div className="space-y-2 text-sm flex-grow">
                <div className="flex justify-between"><span className="text-gray-600">Maintenance Subsidy</span> <span className="font-medium">{formatCurrency(yearData.maintenanceSubsidy)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Intercropping Subsidy</span> <span className="font-medium">{formatCurrency(yearData.intercroppingSubsidy)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">FFB Revenue</span> <span className="font-medium">{formatCurrency(yearData.ffbRevenue)}</span></div>
                <div className="flex justify-between pt-2 border-t"><strong className="text-gray-700">Total Income</strong> <strong className="text-green-600">{formatCurrency(yearData.totalIncome)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-600">Est. Farm Costs</span> <span className="font-medium text-red-600">-{formatCurrency(yearData.costs)}</span></div>
            </div>

            <div className={`mt-4 pt-3 border-t text-center rounded-b-md -mx-4 -mb-4 p-3 ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-sm font-semibold text-gray-500">Net Profit / Loss</p>
                <p className={`text-xl font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(yearData.net)}</p>
            </div>
        </div>
    );
};


const ProfitabilitySimulator: React.FC<ProfitabilitySimulatorProps> = ({ plots }) => {
    const totalAcreage = useMemo(() => plots.reduce((sum, p) => sum + p.acreage, 0), [plots]);
    const [acreage, setAcreage] = useState(totalAcreage > 0.5 ? totalAcreage : 5);

    useEffect(() => {
        setAcreage(totalAcreage > 0.5 ? totalAcreage : 5);
    }, [totalAcreage]);

    const financialData = useMemo(() => {
        return Array.from({ length: 10 }, (_, i) => {
            const year = i + 1;
            const isGestation = year <= 4;
            
            const maintenanceSubsidy = isGestation ? acreage * (MAINTENANCE_SUBSIDY_PER_HA / HECTARE_TO_ACRE) : 0;
            const intercroppingSubsidy = isGestation ? acreage * (INTERCROPPING_SUBSIDY_PER_HA / HECTARE_TO_ACRE) : 0;
            const ffbRevenue = !isGestation ? acreage * YIELD_TONS_PER_ACRE * FFB_PRICE_PER_TON : 0;
            const totalIncome = maintenanceSubsidy + intercroppingSubsidy + ffbRevenue;
            const costs = isGestation ? acreage * GESTATION_COST_PER_ACRE : acreage * MATURE_COST_PER_ACRE;
            const net = totalIncome - costs;
            
            return {
                year,
                phase: isGestation ? 'Gestation Period' : 'Mature Harvest',
                maintenanceSubsidy,
                intercroppingSubsidy,
                ffbRevenue,
                totalIncome,
                costs,
                net
            };
        });
    }, [acreage]);
    
    const summary = useMemo(() => {
        const totalSubsidy = financialData.slice(0, 4).reduce((sum, year) => sum + year.maintenanceSubsidy + year.intercroppingSubsidy, 0);
        const totalNetProfit10Y = financialData.reduce((sum, year) => sum + year.net, 0);
        return { totalSubsidy, totalNetProfit10Y };
    }, [financialData]);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-800">Profitability & Subsidy Simulator</h3>
                <p className="text-sm text-gray-500">Project potential income and expenses. Use the slider to explore different scenarios.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border">
                <label htmlFor="acreage-slider" className="block font-medium text-gray-700 mb-2">Simulated Acreage: <span className="font-bold text-green-600 text-lg">{acreage.toFixed(2)} Acres</span></label>
                <input
                    id="acreage-slider"
                    type="range"
                    min="0.5"
                    max={Math.max(25, Math.ceil(totalAcreage * 2))}
                    step="0.1"
                    value={acreage}
                    onChange={(e) => setAcreage(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
                    <p className="text-sm font-semibold text-blue-700">Total Government Subsidy (First 4 Years)</p>
                    <p className="text-3xl font-bold text-blue-800 mt-2">{formatCurrency(summary.totalSubsidy)}</p>
                </div>
                 <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
                    <p className="text-sm font-semibold text-green-700">Est. Total Net Profit (10 Years)</p>
                    <p className="text-3xl font-bold text-green-800 mt-2">{formatCurrency(summary.totalNetProfit10Y)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {financialData.map(yearData => (
                    <YearCard key={yearData.year} yearData={yearData} />
                ))}
            </div>
             <p className="text-xs text-gray-500 text-center mt-4">
                * All figures are estimates based on standard subsidy amounts and average market conditions. Actual results may vary.
             </p>
        </div>
    );
};

export default ProfitabilitySimulator;
