
import React, { useState, useMemo, useEffect } from 'react';
import { User, Farmer, AgronomicRecommendation } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, FarmPlotModel, AgronomicInputModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { farmPlotModelToPlain, agronomicInputModelToPlain, farmerModelToPlain } from '../lib/utils';
import { runIntelligenceEngine } from '../lib/intelligence';
import RecommendationCard from './RecommendationCard';

interface FarmerAdvisorPageProps {
    onBack: () => void;
    currentUser: User;
    onNavigate: (view: string, param?: string) => void;
}

const FarmerAdvisorPage: React.FC<FarmerAdvisorPageProps> = ({ onBack, currentUser, onNavigate }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');

    const farmersQuery = useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('tenant_id', currentUser.tenantId), Q.sortBy('full_name', 'asc')), [database, currentUser.tenantId]);
    const farmers = useQuery(farmersQuery);

    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);
    
    const selectedFarmerModel = useMemo(() => farmers.find(f => f.id === selectedFarmerId), [farmers, selectedFarmerId]);

    // Data fetching for selected farmer
    const farmPlotsModels = useQuery(useMemo(() => 
        selectedFarmerId ? database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', selectedFarmerId)) : database.get<FarmPlotModel>('farm_plots').query(Q.where('id', 'null')),
    [database, selectedFarmerId]));
    
    // Fetch ALL data to support Social Proof logic in the intelligence engine
    const allPlotsModels = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(), [database]));
    const allInputModels = useQuery(useMemo(() => database.get<AgronomicInputModel>('agronomic_inputs').query(), [database]));

    const [recommendations, setRecommendations] = useState<AgronomicRecommendation[]>([]);

    useEffect(() => {
        if (selectedFarmerModel && farmPlotsModels.length > 0) {
            const plainFarmer = farmerModelToPlain(selectedFarmerModel)!;
            const plainPlots = farmPlotsModels.map(p => farmPlotModelToPlain(p)!);
            
            // Convert all models to plain objects for the engine
            const plainAllFarmers = farmers.map(f => farmerModelToPlain(f)!);
            const plainAllPlots = allPlotsModels.map(p => farmPlotModelToPlain(p)!);
            const plainAllInputs = allInputModels.map(i => agronomicInputModelToPlain(i)!);
            
            // Run engine with full context
            const generated = runIntelligenceEngine(
                plainFarmer, 
                plainPlots, 
                plainAllInputs.filter(i => plainPlots.some(p => p.id === i.farm_plot_id)), // Current farmer inputs
                plainAllFarmers,
                plainAllPlots,
                plainAllInputs
            );
            setRecommendations(generated);
        } else {
            setRecommendations([]);
        }
    }, [selectedFarmerModel, farmPlotsModels, allPlotsModels, allInputModels, farmers]);


    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara Intellectus</h1>
                        <p className="text-gray-500">AI-driven agronomic intelligence and advisory.</p>
                    </div>
                     <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back
                    </button>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select a Farmer to Advise" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer --" />
                </div>
                
                {selectedFarmerId ? (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">Actionable Insights</h2>
                                <button onClick={() => onNavigate('farmer-details', selectedFarmerId)} className="text-sm font-semibold text-green-600 hover:underline">View Full Profile &rarr;</button>
                            </div>
                            
                            <div className="space-y-4">
                                {recommendations.length > 0 ? (
                                    recommendations.map((rec) => (
                                        <RecommendationCard 
                                            key={rec.id} 
                                            recommendation={rec} 
                                            onAction={() => {
                                                // Basic routing based on intent from new actionJson
                                                if (rec.actionJson) {
                                                    try {
                                                        const action = JSON.parse(rec.actionJson);
                                                        if (action.intent === 'OPEN_INPUT_LOG') {
                                                            // Navigate or open modal - for now just simple routing
                                                            onNavigate('farmer-details', selectedFarmerId); 
                                                        } else if (action.intent === 'OPEN_MARKETPLACE') {
                                                            onNavigate('marketplace');
                                                        }
                                                    } catch(e) { console.error(e); }
                                                }
                                                
                                                // Fallback
                                                if (rec.type === 'MAINTENANCE' || rec.type === 'INPUT_PURCHASE') {
                                                    onNavigate('farmer-details', selectedFarmerId); 
                                                }
                                            }}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="font-semibold">All good!</p>
                                        <p className="text-sm">No immediate actions required for this farmer based on current data.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="font-bold text-gray-700 mb-2">Yield Prediction</h3>
                                <div className="flex items-center justify-center h-32 bg-gray-50 rounded border border-dashed">
                                     <p className="text-sm text-gray-500">AI Model Training in Progress...</p>
                                </div>
                            </div>
                             <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="font-bold text-gray-700 mb-2">Log New Data</h3>
                                <p className="text-sm text-gray-500 mb-4">Keep the intelligence engine accurate by logging the latest field activities.</p>
                                <button onClick={() => onNavigate('farmer-details', selectedFarmerId)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700">Go to Farmer Profile</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <h2 className="text-xl font-semibold mt-4">Hapsara Intellectus</h2>
                        <p className="mt-1">Select a farmer to generate real-time agronomic advice.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FarmerAdvisorPage;
