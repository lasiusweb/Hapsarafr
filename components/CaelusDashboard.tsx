
import React, { useState, useMemo, useEffect } from 'react';
import { Farmer, FarmPlot } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, FarmPlotModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { GoogleGenAI } from '@google/genai';
import { calculateResilienceScore, getMockWeatherData, ClimateRiskAssessment, WeatherData } from '../lib/climateEngine';
import { farmerModelToPlain, farmPlotModelToPlain } from '../lib/utils';

interface CaelusDashboardProps {
    onBack: () => void;
}

// --- Helper Components ---

const WeatherCard: React.FC<{ weather: WeatherData }> = ({ weather }) => {
    const isRainy = weather.rainfallMm > 5;
    const isHot = weather.tempMax > 35;
    
    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-blue-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                    Live Weather
                </h3>
                <span className="text-xs font-semibold text-gray-500">{new Date(weather.date).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center justify-between mb-6">
                <div className="text-center">
                    <p className="text-sm text-gray-500">Max Temp</p>
                    <p className={`text-2xl font-bold ${isHot ? 'text-red-600' : 'text-gray-800'}`}>{weather.tempMax.toFixed(1)}°C</p>
                </div>
                <div className="text-center border-l border-r px-4">
                    <p className="text-sm text-gray-500">Rainfall</p>
                    <p className={`text-2xl font-bold ${isRainy ? 'text-blue-600' : 'text-gray-800'}`}>{weather.rainfallMm.toFixed(1)} <span className="text-sm font-normal">mm</span></p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-500">Humidity</p>
                    <p className="text-2xl font-bold text-gray-800">{weather.humidity.toFixed(0)}%</p>
                </div>
            </div>

            {weather.forecast && (
                <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">3-Day Forecast</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        {weather.forecast.map((day, idx) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded">
                                <p className="text-gray-500 mb-1">{new Date(day.date).toLocaleDateString('en-US', {weekday: 'short'})}</p>
                                <p className="font-bold text-gray-800">{day.tempMax.toFixed(0)}°C</p>
                                <p className="text-blue-500">{day.rainfallMm > 0 ? `${day.rainfallMm.toFixed(0)}mm` : '-'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const RecommendationCard: React.FC<{ rec: ClimateRiskAssessment['recommendations'][0] }> = ({ rec }) => {
    const urgencyColor = {
        'Critical': 'border-red-500 bg-red-50 text-red-900',
        'High': 'border-orange-500 bg-orange-50 text-orange-900',
        'Medium': 'border-yellow-500 bg-yellow-50 text-yellow-900',
        'Low': 'border-blue-500 bg-blue-50 text-blue-900',
    };
    
    const icons = {
        'Water': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
        'Soil': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>, // Placeholder for layers
        'Pest': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 17h.01M19.07 4.93L17.07 6.93M5.07 4.93L7.07 6.93" /></svg>,
        'Heat': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
        'General': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };

    return (
        <div className={`p-4 rounded-lg border-l-4 ${urgencyColor[rec.urgency]} shadow-sm mb-3`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 mb-1">
                    {icons[rec.category]}
                    <h4 className="font-bold">{rec.title}</h4>
                </div>
                <span className="text-xs font-bold uppercase tracking-wide opacity-70">{rec.urgency}</span>
            </div>
            <p className="text-sm opacity-90 mt-1">{rec.description}</p>
            {rec.impactOnScore > 0 && <p className="text-xs mt-2 font-semibold opacity-75">Impact on Resilience: -{rec.impactOnScore} pts</p>}
        </div>
    );
};

const RiskMeter: React.FC<{ score: number, level: string }> = ({ score, level }) => {
    let gradient = 'from-gray-400 to-gray-600';
    let color = 'text-gray-800';
    
    if (score < 40) { gradient = 'from-red-600 to-red-500'; color = 'text-red-600'; }
    else if (score < 70) { gradient = 'from-orange-500 to-yellow-500'; color = 'text-orange-600'; }
    else if (score < 85) { gradient = 'from-yellow-400 to-green-400'; color = 'text-yellow-600'; }
    else { gradient = 'from-green-500 to-emerald-600'; color = 'text-green-600'; }

    const rotation = (score / 100) * 180 - 90;

    return (
        <div className="w-full h-40 relative flex flex-col items-center justify-center">
            <div className="w-48 h-24 relative overflow-hidden">
                <div className={`w-full h-full bg-gray-200 rounded-t-full absolute`}></div>
                <div className={`w-full h-full rounded-t-full bg-gradient-to-r ${gradient}`} style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 0)' }}></div>
            </div>
            
            {/* Needle */}
            <div className="absolute top-24 left-1/2 w-full h-1" style={{ transform: `translateX(-50%)` }}>
                 <div 
                    className="w-1 h-20 bg-gray-800 origin-bottom absolute bottom-0 left-1/2 -translate-x-1/2 transition-transform duration-1000 ease-out rounded-full"
                    style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                 ></div>
                 <div className="w-4 h-4 bg-gray-900 rounded-full absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
            </div>
            
            <div className="mt-4 text-center">
                <p className={`text-4xl font-extrabold ${color}`}>{score}</p>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{level} Resilience</p>
            </div>
        </div>
    );
};


const CaelusDashboard: React.FC<CaelusDashboardProps> = ({ onBack }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'advisory' | 'actions'>('advisory');
    
    const farmers = useQuery(React.useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const farmerOptions = React.useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);

    const [riskAssessment, setRiskAssessment] = useState<ClimateRiskAssessment | null>(null);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [simulatedMode, setSimulatedMode] = useState(false);

    const loadAnalysis = async (forceSimulation = false) => {
        if (!selectedFarmerId) return;
        setIsLoading(true);
        setAiSummary(null);

        try {
            const farmerModel = await database.get<FarmerModel>('farmers').find(selectedFarmerId);
            const plotModels = await database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', selectedFarmerId)).fetch();
            const farmer = farmerModelToPlain(farmerModel)!;
            const plots = plotModels.map(p => farmPlotModelToPlain(p)!);
            
            // Get weather (mocked)
            const weather = getMockWeatherData();
            
            // Simulation Override for Demo
            if (forceSimulation || simulatedMode) {
                weather.tempMax = 38; // Force Heat
                weather.rainfallMm = 0; // Force Drought
                weather.humidity = 40;
            }
            setWeatherData(weather);

            // Run Logic
            const assessment = calculateResilienceScore(farmer, plots, weather);
            setRiskAssessment(assessment);

            // Optional AI Summary
            if (process.env.API_KEY) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `
                    Summarize this climate risk assessment for a farmer in 2 simple sentences.
                    Score: ${assessment.score}/100.
                    Key Risks: ${assessment.recommendations.map(r => r.title).join(', ')}.
                    Tone: Urgent if score < 50, otherwise informative.
                `;
                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                });
                setAiSummary(res.text);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if(selectedFarmerId) loadAnalysis();
        else { setRiskAssessment(null); setWeatherData(null); }
    }, [selectedFarmerId]);

    const toggleSimulation = () => {
        const newMode = !simulatedMode;
        setSimulatedMode(newMode);
        loadAnalysis(newMode); // Reload with new mode
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                            Hapsara Caelus
                        </h1>
                        <p className="text-gray-500">Climate Intelligence & Advisory</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 bg-white rounded-lg shadow-sm p-4">
                        <CustomSelect label="Select Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer --" />
                    </div>
                    {selectedFarmerId && (
                        <div className="flex items-end pb-2">
                             <button 
                                onClick={toggleSimulation} 
                                className={`px-4 py-2.5 rounded-md font-semibold text-sm transition-colors ${simulatedMode ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}
                            >
                                {simulatedMode ? '⚠️ Simulation: Extreme Heat' : 'Run Extreme Weather Simulation'}
                            </button>
                        </div>
                    )}
                </div>

                {!selectedFarmerId && (
                     <div className="text-center py-20 bg-white rounded-lg shadow-md border border-gray-200 border-dashed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <p className="text-gray-500 text-lg">Select a farmer to generate a climate risk profile.</p>
                    </div>
                )}

                {isLoading && (
                    <div className="text-center py-20 text-gray-500">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p>Analyzing satellite data & local forecasts...</p>
                    </div>
                )}

                {!isLoading && selectedFarmerId && riskAssessment && weatherData && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Col: Weather & Score */}
                        <div className="space-y-6">
                             <WeatherCard weather={weatherData} />
                             
                             <div className="bg-white rounded-xl shadow-md p-6">
                                <h3 className="font-bold text-gray-800 mb-4">Resilience Score</h3>
                                <RiskMeter score={riskAssessment.score} level={riskAssessment.riskLevel} />
                                
                                <div className="mt-6 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Water Stress</span>
                                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${riskAssessment.breakdown.waterStress < 50 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${riskAssessment.breakdown.waterStress}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Pest Pressure</span>
                                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${riskAssessment.breakdown.pestPressure < 60 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${riskAssessment.breakdown.pestPressure}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Soil Health</span>
                                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${riskAssessment.breakdown.soilResilience < 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${riskAssessment.breakdown.soilResilience}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Right Col: Advisory */}
                        <div className="lg:col-span-2 space-y-6">
                            {aiSummary && (
                                <div className="bg-blue-600 text-white p-4 rounded-lg shadow-md flex items-start gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    <div>
                                        <p className="font-bold text-sm uppercase opacity-80 mb-1">AI Summary</p>
                                        <p className="text-sm leading-relaxed">{aiSummary}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Active Advisories ({riskAssessment.recommendations.length})</h3>
                                {riskAssessment.recommendations.length > 0 ? (
                                    riskAssessment.recommendations.map(rec => <RecommendationCard key={rec.id} rec={rec} />)
                                ) : (
                                    <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
                                        <p className="text-green-800 font-semibold">No urgent risks detected.</p>
                                        <p className="text-green-600 text-sm mt-1">Conditions are favorable. Continue standard maintenance.</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Placeholder for Sustainability Actions */}
                             <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-gray-800">Sustainability Actions</h4>
                                        <p className="text-xs text-gray-500">Log verified actions to improve score.</p>
                                    </div>
                                    <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-sm font-medium hover:bg-gray-200">View History</button>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <button className="p-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:border-gray-400 flex items-center justify-center gap-2">
                                        <span>+ Log Mulching</span>
                                    </button>
                                     <button className="p-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:border-gray-400 flex items-center justify-center gap-2">
                                        <span>+ Log Bio-Control</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CaelusDashboard;
