
import React, { useState, useMemo, useEffect } from 'react';
import { Farmer, FarmPlot } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, FarmPlotModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { GoogleGenAI, Type } from '@google/genai';
import { calculateResilienceScore, getMockWeatherData, ClimateRiskAssessment } from '../lib/climateEngine';
import { farmerModelToPlain, farmPlotModelToPlain } from '../lib/utils';

interface CaelusDashboardProps {
    onBack: () => void;
}

const CaelusDashboard: React.FC<CaelusDashboardProps> = ({ onBack }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'advisory' | 'actions'>('advisory');
    
    const farmers = useQuery(React.useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const farmerOptions = React.useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);

    const [riskAssessment, setRiskAssessment] = useState<ClimateRiskAssessment | null>(null);
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [weatherData, setWeatherData] = useState<any>(null);

    useEffect(() => {
        if (!selectedFarmerId) {
            setRiskAssessment(null);
            setAiAdvice(null);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const farmerModel = await database.get<FarmerModel>('farmers').find(selectedFarmerId);
                const plotModels = await database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', selectedFarmerId)).fetch();
                
                const farmer = farmerModelToPlain(farmerModel)!;
                const plots = plotModels.map(p => farmPlotModelToPlain(p)!);
                
                // 1. Get Weather Data (Mocked for MVP, but structure is ready for API)
                // In real implementation, check `climate_risk_cache` first.
                const currentWeather = getMockWeatherData();
                setWeatherData(currentWeather);

                // 2. Run Deterministic Engine
                const assessment = calculateResilienceScore(farmer, plots, currentWeather);
                setRiskAssessment(assessment);

                // 3. Run Interpretative AI Layer (Optional but recommended for "Human" touch)
                if (process.env.API_KEY) {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `
                        You are an expert agricultural advisor explaining a climate risk report to a farmer.
                        
                        Risk Assessment Data:
                        - Score: ${assessment.score}/100 (${assessment.riskLevel})
                        - Weather: Max Temp ${currentWeather.tempMax.toFixed(1)}°C, Rainfall ${currentWeather.rainfallMm.toFixed(1)}mm
                        - Key Factors: Soil Impact (${assessment.factors.soil}), Water Stress (${assessment.factors.water})
                        - Generated Recommendations: ${assessment.recommendations.join('. ')}

                        Task:
                        Write a short, encouraging, and simple paragraph (max 3 sentences) summarizing this for the farmer. 
                        Focus on the most critical action they should take. Use a helpful tone.
                    `;
                    
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                    });
                    setAiAdvice(response.text);
                }

            } catch (err: any) {
                console.error("Error calculating risk:", err);
                setError("Failed to generate climate assessment.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedFarmerId, database]);

    const RiskMeter: React.FC<{ score: number, level: string }> = ({ score, level }) => {
        // Note: In our logic, High Score = Good Resilience. Low Score = High Risk.
        // Let's adjust colors: 0-40 (Critical/Red), 40-70 (High Risk/Orange), 70-85 (Medium Risk/Yellow), 85-100 (Low Risk/Green)
        
        let gradient = 'from-gray-400 to-gray-600';
        if (score < 40) gradient = 'from-red-600 to-red-500';
        else if (score < 70) gradient = 'from-orange-500 to-yellow-500';
        else if (score < 85) gradient = 'from-yellow-400 to-green-400';
        else gradient = 'from-green-500 to-emerald-600';

        const rotation = (score / 100) * 180 - 90;

        return (
            <div className="w-64 h-32 relative mx-auto">
                <div className={`w-full h-full rounded-t-full bg-gradient-to-r ${gradient}`}></div>
                <div className="absolute bottom-0 left-1/2 w-full h-1/2 bg-gray-50 rounded-t-full transform -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 transition-transform duration-1000" style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, transformOrigin: 'bottom center' }}>
                    <div className="w-1 h-28 bg-gray-800 rounded-t-full"></div>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-gray-800 w-6 h-6 rounded-full"></div>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center">
                    <p className="text-3xl font-bold text-gray-800">{score}</p>
                    <p className="text-xs text-gray-500 font-semibold">Resilience Score</p>
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
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                            Hapsara Caelus
                        </h1>
                        <p className="text-gray-500">Climate Resilience & Sustainability Intelligence</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer --" />
                </div>

                {!selectedFarmerId && (
                     <div className="text-center py-20 bg-white rounded-lg shadow-md">
                        <p className="text-gray-500">Select a farmer to analyze their climate resilience profile.</p>
                    </div>
                )}

                {isLoading && (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p>Analyzing local climate data...</p>
                    </div>
                )}

                {!isLoading && selectedFarmerId && riskAssessment && (
                    <>
                        <div className="flex space-x-4 border-b mb-6">
                            <button onClick={() => setActiveTab('advisory')} className={`pb-2 px-4 font-semibold ${activeTab === 'advisory' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Advisory Dashboard</button>
                            <button onClick={() => setActiveTab('actions')} className={`pb-2 px-4 font-semibold ${activeTab === 'actions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Verification & Actions</button>
                        </div>

                        {activeTab === 'advisory' && (
                            <div className="space-y-6">
                                {/* Score Card */}
                                <div className="bg-white rounded-xl shadow-lg p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row items-center gap-8">
                                        <div className="md:w-1/3 text-center">
                                            <RiskMeter score={riskAssessment.score} level={riskAssessment.riskLevel} />
                                            <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-bold ${riskAssessment.riskLevel === 'Critical' ? 'bg-red-100 text-red-800' : riskAssessment.riskLevel === 'High' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                                Risk Level: {riskAssessment.riskLevel}
                                            </div>
                                        </div>
                                        <div className="md:w-2/3">
                                            <h3 className="text-lg font-bold text-gray-800 mb-2">Weather Snapshot</h3>
                                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                                    <span className="block text-gray-500">Temperature</span>
                                                    <span className="font-bold text-blue-900 text-lg">{weatherData?.tempMax.toFixed(1)}°C</span>
                                                </div>
                                                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                                    <span className="block text-gray-500">Rainfall</span>
                                                    <span className="font-bold text-blue-900 text-lg">{weatherData?.rainfallMm.toFixed(1)} mm</span>
                                                </div>
                                            </div>
                                            {aiAdvice && (
                                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                                    <div className="flex items-start gap-3">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                                        <div>
                                                            <h4 className="font-bold text-green-800 text-sm">Advisor Note</h4>
                                                            <p className="text-green-700 text-sm mt-1">{aiAdvice}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendations */}
                                <div className="grid grid-cols-1 gap-4">
                                    <h3 className="font-bold text-gray-800 text-lg">Action Plan</h3>
                                    {riskAssessment.recommendations.map((rec, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500 flex items-start gap-4">
                                            <div className="bg-yellow-100 p-2 rounded-full text-yellow-700">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">Recommendation #{idx + 1}</p>
                                                <p className="text-gray-600 text-sm mt-1">{rec}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'actions' && (
                            <div className="space-y-6">
                                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 text-center">
                                    <h3 className="font-bold text-blue-900 text-lg mb-2">Sustainability Verification</h3>
                                    <p className="text-blue-800 text-sm mb-4">
                                        Verify your climate adaptation actions to earn a higher resilience score and premium market access.
                                    </p>
                                    <div className="flex justify-center gap-4">
                                        <button disabled className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold text-sm opacity-50 cursor-not-allowed">Upload Proof</button>
                                        <button disabled className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-md font-semibold text-sm opacity-50 cursor-not-allowed">View Credentials</button>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-3">Action logging coming soon.</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CaelusDashboard;
