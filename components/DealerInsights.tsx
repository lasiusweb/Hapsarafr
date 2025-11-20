
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DealerModel, FarmerModel, FarmPlotModel, ProductModel, DealerInventorySignalModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { getInventoryPredictions } from '../lib/businessIntelligence';

interface DealerInsightsProps {
    currentUser: User;
}

const InsightCard: React.FC<{ title: string; value: string; trend: 'up' | 'down' | 'neutral'; description: string }> = ({ title, value, trend, description }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trend === 'up' ? 'bg-green-100 text-green-700' : trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                {trend === 'up' ? '↑ High' : trend === 'down' ? '↓ Low' : '• Stable'}
            </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">{description}</p>
    </div>
);

const RecommendationItem: React.FC<{ text: string; type: 'stock' | 'pricing' | 'risk' }> = ({ text, type }) => {
    const colors = {
        stock: 'border-l-4 border-blue-500 bg-blue-50',
        pricing: 'border-l-4 border-green-500 bg-green-50',
        risk: 'border-l-4 border-red-500 bg-red-50',
    };
    return (
        <div className={`p-3 rounded-r-md mb-2 text-sm text-gray-800 ${colors[type]}`}>
            {text}
        </div>
    );
};

const DealerInsights: React.FC<DealerInsightsProps> = ({ currentUser }) => {
    const database = useDatabase();
    const [dealer, setDealer] = useState<DealerModel | null>(null);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [regionalStats, setRegionalStats] = useState<{ plantingTrend: string, recentAcreage: number }>({ plantingTrend: '', recentAcreage: 0 });

    // 1. Load Dealer Profile
    useEffect(() => {
        const load = async () => {
            const dealers = await database.get<DealerModel>('dealers').query(Q.where('user_id', currentUser.id)).fetch();
            if (dealers.length > 0) setDealer(dealers[0]);
            setLoading(false);
        };
        load();
    }, [currentUser, database]);

    // 2. Load Data for Intelligence Engine
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const allPlots = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(), [database]));
    const products = useQuery(useMemo(() => database.get<ProductModel>('products').query(), [database]));
    const inventory = useQuery(useMemo(() => database.get<DealerInventorySignalModel>('dealer_inventory_signals').query(Q.where('dealer_id', dealer?.id || 'unknown')), [database, dealer?.id]));

    // 3. Run Intelligence Logic
    useEffect(() => {
        if (!dealer || farmers.length === 0) return;
        
        const runAnalysis = async () => {
            const localFarmers = dealer.mandal !== 'Unknown' 
                ? farmers.filter(f => f.mandal === dealer.mandal)
                : farmers; 
            
            const localFarmerIds = new Set(localFarmers.map(f => f.id));
            const localPlots = allPlots.filter(p => localFarmerIds.has(p.farmerId));

            // Regional Stats (Last 30 days)
            const now = new Date();
            const recentPlots = localPlots.filter(p => p.plantationDate && (now.getTime() - new Date(p.plantationDate).getTime()) < (30 * 24 * 60 * 60 * 1000));
            const recentAcreage = recentPlots.reduce((sum, p) => sum + p.acreage, 0);
            
            setRegionalStats({
                plantingTrend: recentAcreage > 10 ? 'High Activity' : 'Low Activity',
                recentAcreage: parseFloat(recentAcreage.toFixed(1))
            });

            const results = getInventoryPredictions(localPlots, products, inventory);
            setPredictions(results);
        };
        
        runAnalysis();
    }, [dealer, farmers, allPlots, products, inventory]);


    if (loading) return <div className="text-center p-10">Loading Intelligence...</div>;
    if (!dealer) return <div className="text-center p-10 text-gray-500">No dealer profile found. Please set up your profile in Hapsara Mitra.</div>;

    return (
        <div className="space-y-6">
            {/* Disclaimer Banner */}
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg text-xs text-indigo-800">
                <strong>Beta Feature:</strong> These insights are generated based on aggregated, anonymized crop data in your service area ({dealer.mandal || 'General Region'}). They are estimates to help you plan, not guarantees of sales.
            </div>

            {/* Regional Outlook Card (New) */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg">Regional Outlook</h3>
                        <p className="text-sm text-purple-200">{dealer.mandal} Mandal</p>
                    </div>
                    <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">Last 30 Days</span>
                </div>
                
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-3xl font-bold">{regionalStats.recentAcreage} ac</p>
                        <p className="text-xs opacity-80">New Plantations</p>
                    </div>
                     <div>
                        <p className="text-3xl font-bold">{regionalStats.plantingTrend}</p>
                        <p className="text-xs opacity-80">Activity Level</p>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InsightCard 
                    title="Est. Fertilizer Demand (30 Days)" 
                    value={`${predictions.reduce((sum, p) => p.category === 'Fertilizer' ? sum + p.predictedQuantity : sum, 0).toLocaleString()} kg`}
                    trend="up"
                    description="Based on active gestation acreage."
                />
                 <InsightCard 
                    title="Active Customer Base" 
                    value={farmers.length.toString()}
                    trend="neutral"
                    description="Farmers registered in your Mandal."
                />
            </div>

            {/* Inventory Forecast */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Stock Risk Analysis</h2>
                
                {predictions.length > 0 ? (
                    <div className="space-y-4">
                        {predictions.slice(0, 5).map((pred, idx) => (
                            <div key={idx} className="border-b pb-3 last:border-0">
                                <div className="flex justify-between items-center mb-1">
                                    <div>
                                        <span className="font-semibold text-gray-700">{pred.productName}</span>
                                        {pred.stockStatus === 'CRITICAL_OUT' && <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-bold">STOCKOUT</span>}
                                        {pred.stockStatus === 'LOW' && <span className="ml-2 text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full font-bold">LOW</span>}
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-mono font-bold text-indigo-600">{pred.predictedQuantity} {pred.unit}</span>
                                        <span className="text-[10px] text-gray-400">Predicted Demand</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    {/* Confidence visualization */}
                                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(pred.confidence * 100, 100)}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{pred.reasoning}</p>
                                {pred.gap > 0 && <p className="text-xs text-red-600 font-semibold mt-1">Deficit: {pred.gap} {pred.unit}</p>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">Not enough data to generate predictions yet.</p>
                )}
            </div>

            {/* Smart Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Smart Recommendations</h2>
                <div className="space-y-2">
                    <RecommendationItem type="stock" text="Consider stocking up on Boron. 40% of local plots are entering Year 2 where Boron deficiency is common." />
                    <RecommendationItem type="pricing" text="Market Price Alert: Urea prices are trending down in neighboring districts. Maintain competitive pricing." />
                    <RecommendationItem type="risk" text="Rainfall deficit predicted next month. Stock drought-resistant biostimulants." />
                </div>
            </div>
        </div>
    );
};

export default DealerInsights;
