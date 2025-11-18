import React, { useState, useMemo, useEffect } from 'react';
import { Farmer } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { GoogleGenAI, Type } from '@google/genai';

interface CaelusDashboardProps {
    onBack: () => void;
}

const CaelusDashboard: React.FC<CaelusDashboardProps> = ({ onBack }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const farmers = useQuery(React.useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const farmerOptions = React.useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);

    const [riskData, setRiskData] = useState<{
        droughtRisk: { level: string; score: number; details: string; };
        recommendations: { id: string; title: string; description: string; priority: string; relevantSubsidy?: string; }[];
        communityInsights: { summary: string; };
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedFarmerId) {
            setRiskData(null);
            setError(null);
            return;
        }

        const selectedFarmer = farmers.find(f => f.id === selectedFarmerId);

        if (!selectedFarmer) {
            setError("Selected farmer not found.");
            return;
        }

        const { latitude, longitude } = selectedFarmer;

        if (!latitude || !longitude) {
            setError("Selected farmer does not have location data. Please update the farmer's profile with GPS coordinates to enable this feature.");
            setRiskData(null);
            return;
        }

        const fetchResilienceData = async () => {
            setIsLoading(true);
            setError(null);
            setRiskData(null);
            
            if (!process.env.API_KEY) {
                setError("HapsaraAI (Gemini) API key is not configured. An administrator must set this to enable the dashboard.");
                setIsLoading(false);
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const responseSchema = {
                    type: Type.OBJECT,
                    properties: {
                        droughtRisk: {
                            type: Type.OBJECT,
                            properties: {
                                level: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
                                score: { type: Type.NUMBER, description: "A risk score from 0 to 100." },
                                details: { type: Type.STRING, description: "A 1-2 sentence summary of the forecast." }
                            },
                            required: ['level', 'score', 'details']
                        },
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                                    relevantSubsidy: { type: Type.STRING, description: "An optional ID of a relevant government subsidy if applicable."}
                                },
                                required: ['title', 'description', 'priority']
                            }
                        },
                        communityInsights: {
                            type: Type.OBJECT,
                            properties: {
                                summary: { type: Type.STRING, description: "A short paragraph about common climate adaptation strategies being successfully used by other farmers in this region of India for similar crops." }
                            },
                            required: ['summary']
                        }
                    }
                };

                const prompt = `
                    You are a world-class agricultural and climate scientist specializing in oil palm cultivation in India.
                    Given the following coordinates for a farm:
                    Latitude: ${latitude}
                    Longitude: ${longitude}

                    And the current date: ${new Date().toLocaleDateString()}

                    Please provide a climate resilience report for the next 3 months. Structure your response as a JSON object matching the provided schema.
                    The recommendations should be actionable for an oil palm farmer.
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: responseSchema,
                    },
                });
                
                const data = JSON.parse(response.text);

                // Add unique IDs to recommendations for React keys
                data.recommendations = data.recommendations.map((rec: any, index: number) => ({...rec, id: `rec${index}`}));

                setRiskData(data);

            } catch (err: any) {
                console.error("Gemini API error:", err);
                setError("Failed to fetch climate resilience data. The AI model may be temporarily unavailable or there could be an issue with your API key configuration.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchResilienceData();
    }, [selectedFarmerId, farmers]);


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
                
                {isLoading && (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold">Generating AI-Powered Forecast...</h2>
                        <p className="mt-2">Analyzing climate data for the selected location.</p>
                    </div>
                )}
                
                {error && (
                     <div className="p-6 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-md">
                        <h3 className="font-bold text-red-800">An Error Occurred</h3>
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {!isLoading && !error && selectedFarmerId && riskData && (
                    <div className="space-y-8">
                        {/* Climate Risk Profile */}
                        <div className="bg-white rounded-lg shadow-xl p-6 text-center">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">3-Month Drought Risk Forecast</h2>
                            <RiskMeter score={riskData.droughtRisk.score} level={riskData.droughtRisk.level} />
                            <p className="mt-4 text-gray-600 max-w-lg mx-auto">{riskData.droughtRisk.details}</p>
                        </div>
                        
                        {/* Adaptation Recommendations */}
                        <div className="bg-white rounded-lg shadow-xl p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Adaptation Recommendations</h2>
                            <div className="space-y-4">
                                {riskData.recommendations.map(rec => (
                                    <div key={rec.id} className={`p-4 rounded-lg border-l-4 ${rec.priority === 'High' ? 'border-red-500 bg-red-50' : rec.priority === 'Medium' ? 'border-yellow-500 bg-yellow-50' : 'border-blue-500 bg-blue-50'}`}>
                                        <h3 className="font-bold text-gray-900">{rec.title}</h3>
                                        <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                                        {rec.relevantSubsidy && <button onClick={() => alert(`Checking subsidy details for ${rec.relevantSubsidy}`)} className="mt-2 text-sm font-semibold text-green-600 hover:underline">Check Subsidy Eligibility &rarr;</button>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Peer Benchmarking */}
                         <div className="bg-white rounded-lg shadow-xl p-6">
                             <h2 className="text-xl font-bold text-gray-800 mb-4">Community Insights</h2>
                             <div className="text-left bg-blue-50 p-6 rounded-lg border border-blue-200">
                                <p className="text-blue-800">{riskData.communityInsights.summary}</p>
                            </div>
                         </div>
                    </div>
                )}

                {!isLoading && !selectedFarmerId && (
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
