import React, { useState, useMemo } from 'react';
import { User, Farmer, AgronomicAlert, AlertType, AgronomicInput, InputType } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, AgronomicAlertModel, FarmPlotModel, AgronomicInputModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { farmPlotModelToPlain, agronomicInputModelToPlain } from '../lib/utils';

interface FarmerAdvisorPageProps {
    onBack: () => void;
    currentUser: User;
    onNavigate: (view: string, param?: string) => void;
}

const PLANT_DENSITY_PER_ACRE = 57;
const DENSITY_TOLERANCE = 0.15; // 15% tolerance

const AlertCard: React.FC<{ alert: Omit<AgronomicAlert, 'id' | 'farmerId' | 'tenantId'> }> = ({ alert }) => {
    const severityClasses: Record<string, { bg: string, border: string, text: string, icon: React.ReactNode }> = {
        'High': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg> },
        'Medium': { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.636-1.214 2.863-1.214 3.5 0l5.415 10.322a1.875 1.875 0 01-1.666 2.829H4.508a1.875 1.875 0 01-1.666-2.829L8.257 3.099zM9 12a1 1 0 112 0 1 1 0 01-2 0zm1-4a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" /></svg> },
        'Low': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg> },
    };
    const sClass = severityClasses[alert.severity];

    return (
        <div className={`p-5 rounded-lg border-l-4 ${sClass.bg} ${sClass.border} ${alert.is_read ? 'opacity-70' : ''}`}>
            <div className={`flex items-center gap-3 font-bold ${sClass.text}`}>
                {sClass.icon}
                <span>{alert.alertType} ({alert.severity})</span>
            </div>
            <p className="mt-3 text-gray-800 font-semibold">{alert.message}</p>
            <p className="mt-2 text-sm text-gray-600">{alert.recommendation}</p>
            <p className="mt-3 text-xs text-gray-500 text-right">{new Date(alert.createdAt).toLocaleDateString()}</p>
        </div>
    );
};


const FarmerAdvisorPage: React.FC<FarmerAdvisorPageProps> = ({ onBack, currentUser, onNavigate }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');

    const farmersQuery = useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('tenant_id', currentUser.tenantId), Q.sortBy('full_name', 'asc')), [database, currentUser.tenantId]);
    const farmers = useQuery(farmersQuery);

    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);

    // Data fetching for selected farmer
    const farmPlotsModels = useQuery(useMemo(() => 
        selectedFarmerId ? database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', selectedFarmerId)) : database.get<FarmPlotModel>('farm_plots').query(Q.where('id', 'null')),
    [database, selectedFarmerId]));
    
    const allInputModels = useQuery(useMemo(() => database.get<AgronomicInputModel>('agronomic_inputs').query(), [database]));

    const generatedAlerts = useMemo(() => {
        if (!selectedFarmerId) return [];

        const farmPlots = farmPlotsModels.map(p => farmPlotModelToPlain(p)!);
        if (farmPlots.length === 0) return [];

        const allInputs = allInputModels.map(i => agronomicInputModelToPlain(i)!);
        
        const alerts: Omit<AgronomicAlert, 'id' | 'farmerId' | 'tenantId'>[] = [];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        farmPlots.forEach(plot => {
            // Rule 1: Plant Density
            // @ts-ignore
            if (plot.acreage > 0 && plot.number_of_plants > 0) {
                // @ts-ignore
                const density = plot.number_of_plants / plot.acreage;
                const lowerBound = PLANT_DENSITY_PER_ACRE * (1 - DENSITY_TOLERANCE);
                const upperBound = PLANT_DENSITY_PER_ACRE * (1 + DENSITY_TOLERANCE);
                if (density < lowerBound || density > upperBound) {
                    alerts.push({
                        // @ts-ignore
                        plotId: plot.id,
                        alertType: AlertType.YieldForecast, // Re-using an existing type
                        severity: 'Medium',
                        // @ts-ignore
                        message: `Unusual plant density detected in ${plot.name}.`,
                        recommendation: `The plot has ${Math.round(density)} plants/acre. The recommended range is ${Math.round(lowerBound)}-${Math.round(upperBound)}. Please verify the plant count and acreage data.`,
                        is_read: false,
                        createdAt: new Date().toISOString(),
                    });
                }
            }
            
            // Rule 2: Missing Plantation Date
            // @ts-ignore
            if (plot.number_of_plants > 0 && !plot.plantation_date) {
                 alerts.push({
                    // @ts-ignore
                    plotId: plot.id,
                    alertType: AlertType.YieldForecast,
                    severity: 'Low',
                    // @ts-ignore
                    message: `Missing plantation date for ${plot.name}.`,
                    recommendation: `Please record the plantation date for this plot to enable accurate subsidy eligibility tracking and yield predictions.`,
                    is_read: false,
                    createdAt: new Date().toISOString(),
                });
            }

            // Rule 3: Irrigation Reminder
            const plotInputs = allInputs.filter(i => i.farm_plot_id === plot.id);
            const lastIrrigation = plotInputs
                .filter(i => i.input_type === InputType.Irrigation)
                .sort((a, b) => new Date(b.input_date).getTime() - new Date(a.input_date).getTime())[0];
                
            if (!lastIrrigation || new Date(lastIrrigation.input_date) < sevenDaysAgo) {
                 alerts.push({
                    // @ts-ignore
                    plotId: plot.id,
                    alertType: AlertType.IrrigationAlert,
                    severity: 'Low',
                    // @ts-ignore
                    message: `No recent irrigation logged for ${plot.name}.`,
                    recommendation: `The last irrigation was logged over a week ago. Please check soil moisture levels and irrigate if necessary.`,
                    is_read: false,
                    createdAt: new Date().toISOString(),
                });
            }
        });

        return alerts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    }, [selectedFarmerId, farmPlotsModels, allInputModels]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Farmer Advisor</h1>
                        <p className="text-gray-500">Your personalized, AI-powered agronomic intelligence engine.</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select a Farmer to View Dashboard" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer --" />
                </div>
                
                {selectedFarmerId ? (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-800">Agronomic Alerts</h2>
                                <button onClick={() => onNavigate('farmer-details', selectedFarmerId)} className="text-sm font-semibold text-green-600 hover:underline">View Full Profile &rarr;</button>
                            </div>
                            <p className="text-gray-500 text-sm mt-1">Proactive recommendations from Hapsara Scientia.</p>
                            
                            <div className="mt-6 space-y-4">
                                {generatedAlerts.length > 0 ? (
                                    generatedAlerts.map((alert, index) => <AlertCard key={index} alert={alert} />)
                                ) : (
                                    <div className="text-center py-10 text-gray-500">
                                        <p className="font-semibold">No alerts for this farmer. Data looks good!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-white p-6 rounded-lg shadow-md text-center">
                                <h3 className="font-bold text-gray-700">Yield Prediction</h3>
                                <p className="text-4xl font-bold text-gray-400 my-4">N/A</p>
                                <p className="text-sm text-gray-500">Yield prediction model coming in a future update.</p>
                            </div>
                             <div className="bg-white p-6 rounded-lg shadow-md text-center">
                                <h3 className="font-bold text-gray-700">Log New Data</h3>
                                <p className="text-sm text-gray-500 my-4">Improve prediction accuracy by providing up-to-date information for this farmer.</p>
                                <button onClick={() => onNavigate('farmer-details', selectedFarmerId)} className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold text-sm">Go to Profile</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h2 className="text-xl font-semibold mt-4">Select a Farmer</h2>
                        <p className="mt-1">Choose a farmer from the list above to view their personalized intelligence dashboard.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FarmerAdvisorPage;