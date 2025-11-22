
import React, { useState, useMemo, useEffect } from 'react';
import { User, Farmer, AgronomicRecommendation } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, FarmPlotModel, AgronomicInputModel, DealerInventorySignalModel, WalletModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { farmPlotModelToPlain, agronomicInputModelToPlain, farmerModelToPlain } from '../lib/utils';
import { generateScientiaInsights } from '../lib/scientia';
import RecommendationCard from './RecommendationCard';
import { ActivityType } from '../types';

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

    const farmPlotsModels = useQuery(useMemo(() => 
        selectedFarmerId ? database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', selectedFarmerId)) : database.get<FarmPlotModel>('farm_plots').query(Q.where('id', 'null')),
    [database, selectedFarmerId]));

    const walletModel = useQuery(useMemo(() => 
        selectedFarmerId ? database.get<WalletModel>('wallets').query(Q.where('farmer_id', selectedFarmerId)) : database.get<WalletModel>('wallets').query(Q.where('id', 'null')),
    [database, selectedFarmerId]))[0];
    
    const allPlotsModels = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(), [database]));
    const allInputModels = useQuery(useMemo(() => database.get<AgronomicInputModel>('agronomic_inputs').query(), [database]));
    const allInventoryModels = useQuery(useMemo(() => database.get<DealerInventorySignalModel>('dealer_inventory_signals').query(), [database]));

    const [recommendations, setRecommendations] = useState<AgronomicRecommendation[]>([]);

    useEffect(() => {
        if (selectedFarmerModel && farmPlotsModels.length > 0) {
            const plainFarmer = farmerModelToPlain(selectedFarmerModel)!;
            const plainPlots = farmPlotsModels.map(p => farmPlotModelToPlain(p)!);
            const plainAllFarmers = farmers.map(f => farmerModelToPlain(f)!);
            const plainAllPlots = allPlotsModels.map(p => farmPlotModelToPlain(p)!);
            const plainAllInputs = allInputModels.map(i => agronomicInputModelToPlain(i)!);
            const plainInventory = allInventoryModels.map(i => i._raw as any);
            const walletBalance = walletModel ? walletModel.balance : 0;
            
            // Call Hapsara Scientia
            const generated = generateScientiaInsights(
                plainFarmer, 
                plainPlots, 
                plainAllInputs.filter(i => plainPlots.some(p => p.id === i.farm_plot_id)), 
                plainAllFarmers,
                plainAllPlots,
                plainAllInputs,
                plainInventory,
                walletBalance
            );
            setRecommendations(generated);
        } else {
            setRecommendations([]);
        }
    }, [selectedFarmerModel, farmPlotsModels, allPlotsModels, allInputModels, farmers, allInventoryModels, walletModel]);

    const handleFeedback = async (rec: AgronomicRecommendation, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            await database.write(async () => {
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = rec.farmerId;
                    log.activityType = ActivityType.RECOMMENDATION_ACTION;
                    log.description = `${status} Recommendation: ${rec.title} (Conf: ${rec.confidenceScore}%)`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                    // Store logic for retraining
                    log.metadataJson = JSON.stringify({
                        recommendationId: rec.id,
                        scientiaRule: rec.triggerSource,
                        outcome: status
                    });
                });
            });
            setRecommendations(prev => prev.filter(r => r.id !== rec.id)); // Remove from view
        } catch (e) {
            console.error("Error logging feedback", e);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            Hapsara Scientia
                        </h1>
                        <p className="text-gray-500">Scientific Agronomic Intelligence Engine</p>
                    </div>
                     <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back
                    </button>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select a Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer --" />
                </div>
                
                {selectedFarmerId ? (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-indigo-900">Scientia Analysis Complete</h3>
                                <p className="text-xs text-indigo-700">Confidence scores calculated based on data fidelity.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-indigo-800">{recommendations.length}</p>
                                <p className="text-xs text-indigo-600 uppercase font-bold">Insights</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {recommendations.length > 0 ? (
                                recommendations.map((rec) => (
                                    <RecommendationCard 
                                        key={rec.id} 
                                        recommendation={rec} 
                                        onAction={() => handleFeedback(rec, 'ACCEPTED')}
                                        onDismiss={() => handleFeedback(rec, 'REJECTED')}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-sm border border-dashed">
                                    <p>No active recommendations. Current status is optimal.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                         <p>Select a farmer to initialize the Scientia Engine.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FarmerAdvisorPage;
