import React, { useState } from 'react';
import { Farmer } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel } from '../db';
import { Q } from '@nozbe/watermelondb';

// Mock Data for Phase 1
const mockDroughtRisk = {
    level: 'Medium',
    score: 65, // out of 100
    details: "Slightly below-average rainfall expected in the next 3 months. Soil moisture is currently adequate but may decline."
};

const mockRecommendations = [
    { id: 'rec1', title: "Consider Mulching", description: "Apply mulch to your primary plot to conserve soil moisture. This could reduce water needs by up to 20%.", priority: 'High', relevantSubsidy: 'water-harvesting' },
    { id: 'rec2', title: "Check Drip Irrigation Eligibility", description: "Your plot size and crop type may make you eligible for a government subsidy on drip irrigation systems.", priority: 'Medium', relevantSubsidy: 'drip-irrigation' },
    { id: 'rec3', title: "Plan for Intercropping", description: "Planting drought-resistant ground cover can protect soil and provide a secondary income source.", priority: 'Low', relevantSubsidy: 'gestation-management' },
];

const mockPeerBenchmark = {
    neighborsImplemented: 8,
    yieldIncrease: '15-20%',
};

interface CaelusDashboardProps {
    onBack: () => void;
}

const CaelusDashboard: React.FC<CaelusDashboardProps> = ({ onBack }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const farmers = useQuery(React.useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const farmerOptions = React.useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);

    const RiskMeter: React.FC<{ score: number, level: string }> = ({ score, level }) => {
        const colorStops: Record<string, string> = { 'Low': 'from-green-400 to-green-600', 'Medium': 'from-yellow-400 to-yellow-600', 'High': 'from-red-400 to-red-600', 'Critical': 'from-red-600 to-red-800' };
        const rotation = (score / 100) * 180 - 90;

        return (
            <div className="w-64 h-32 relative mx-auto">
                <div className={`w-full h-full rounded-t-full bg-gradient-to-r ${colorStops[level] || 'from-gray-400 to-gray-600'}`}></div>
                <div className="absolute bottom-0 left-1/2 w-full h-1/2 bg-gray-50 rounded-t-full transform -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 transition-transform duration-1000" style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, transformOrigin: 'bottom center' }}>
                    <div className="w-1 h-28 bg-gray-800 rounded-t-full"></div>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-gray-800 w-6 h-6 rounded-full"></div>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center">
                    <p className="text-2xl font-bold text-gray-800">{level}</p>
                    <p className="text-xs text-gray-500">Drought Risk</p>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara Caelus</h1>
                        <p className="text-gray-500">Your Personalized Climate Resilience Dashboard.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select a Farmer to View Dashboard" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer --" />
                </div>
                
                {selectedFarmerId ? (
                    <div className="space-y-8">
                        {/* Climate Risk Profile */}
                        <div className="bg-white rounded-lg shadow-xl p-6 text-center">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">3-Month Drought Risk Forecast</h2>
                            <RiskMeter score={mockDroughtRisk.score} level={mockDroughtRisk.level} />
                            <p className="mt-4 text-gray-600 max-w-lg mx-auto">{mockDroughtRisk.details}</p>
                        </div>
                        
                        {/* Adaptation Recommendations */}
                        <div className="bg-white rounded-lg shadow-xl p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Adaptation Recommendations</h2>
                            <div className="space-y-4">
                                {mockRecommendations.map(rec => (
                                    <div key={rec.id} className={`p-4 rounded-lg border-l-4 ${rec.priority === 'High' ? 'border-red-500 bg-red-50' : rec.priority === 'Medium' ? 'border-yellow-500 bg-yellow-50' : 'border-blue-500 bg-blue-50'}`}>
                                        <h3 className="font-bold text-gray-900">{rec.title}</h3>
                                        <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                                        <button onClick={() => alert(`Checking subsidy details for ${rec.relevantSubsidy}`)} className="mt-2 text-sm font-semibold text-green-600 hover:underline">Check Subsidy Eligibility &rarr;</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Peer Benchmarking */}
                         <div className="bg-white rounded-lg shadow-xl p-6">
                             <h2 className="text-xl font-bold text-gray-800 mb-4">Community Insights</h2>
                             <div className="text-center bg-blue-50 p-6 rounded-lg border border-blue-200">
                                <p className="text-3xl font-bold text-blue-800">{mockPeerBenchmark.neighborsImplemented}</p>
                                <p className="font-semibold text-blue-700">farmers in your village have implemented similar water-saving measures.</p>
                                <p className="mt-2 text-sm text-gray-600">They have reported an average yield increase of <span className="font-bold">{mockPeerBenchmark.yieldIncrease}</span> during dry spells.</p>
                            </div>
                         </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <h2 className="text-xl font-semibold mt-4">Select a Farmer</h2>
                        <p className="mt-1">Choose a farmer to view their personalized climate dashboard.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CaelusDashboard;