import React, { useState, useMemo } from 'react';
import { Farmer } from '../types';
import { GEO_DATA } from '../data/geoData';
import CustomSelect from './CustomSelect';
import { getGeoName } from '../lib/utils';
import { GoogleGenAI } from '@google/genai';

// Constants for prediction model
const YIELD_TONS_PER_ACRE = 10; // Average yield for mature palms
const GESTATION_YEARS = 4;
const FFB_PRICE_PER_TON = 11000; // Fresh Fruit Bunch price

interface YieldPredictionPageProps {
    allFarmers: Farmer[];
    onBack: () => void;
}

// Reusable components
const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
);

const BarChart: React.FC<{ data: { label: string, value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const colors = ['#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#fb923c'];
    return (
        <div className="space-y-4">
            {data.length > 0 ? data.map((item, index) => (
                <div key={item.label} className="group">
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-medium text-gray-600">{item.label}</span>
                        <span className="font-semibold text-gray-800">{item.value.toLocaleString()} Tons</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                        <div
                            className="h-4 rounded-full transition-all duration-500"
                            style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: colors[index % colors.length] }}
                        ></div>
                    </div>
                </div>
            )) : <p className="text-gray-500 text-center py-8">No data for this selection.</p>}
        </div>
    );
};

const YieldPredictionPage: React.FC<YieldPredictionPageProps> = ({ allFarmers, onBack }) => {
    const currentYear = new Date().getFullYear();
    const [filters, setFilters] = useState({
        district: '',
        year: String(currentYear)
    });
    const [prediction, setPrediction] = useState<any>(null);
    const [aiInsights, setAiInsights] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setPrediction(null);
        setAiInsights(null);
    };

    const mandals = useMemo(() => {
        if (!filters.district) return [];
        return GEO_DATA.find(d => d.code === filters.district)?.mandals || [];
    }, [filters.district]);

    const generatePrediction = async () => {
        setIsLoading(true);
        setError(null);
        setAiInsights(null);

        const predictionYear = parseInt(filters.year);
        
        // 1. Filter mature farmers for the selected district and year
        const matureFarms = allFarmers.filter(f => {
            const isDistrictMatch = !filters.district || f.district === filters.district;
            if (!isDistrictMatch || !f.plantationDate || !f.approvedExtent) {
                return false;
            }
            const plantationYear = new Date(f.plantationDate).getFullYear();
            return (predictionYear - plantationYear) > GESTATION_YEARS;
        });

        // 2. Calculate metrics
        const totalMatureAcreage = matureFarms.reduce((sum, f) => sum + f.approvedExtent!, 0);
        const totalPredictedYield = totalMatureAcreage * YIELD_TONS_PER_ACRE;
        const avgYield = matureFarms.length > 0 ? YIELD_TONS_PER_ACRE : 0;
        
        const yieldByMandal = mandals.map(mandal => {
            const mandalAcreage = matureFarms
                .filter(f => f.mandal === mandal.code)
                .reduce((sum, f) => sum + f.approvedExtent!, 0);
            return {
                label: mandal.name,
                value: parseFloat((mandalAcreage * YIELD_TONS_PER_ACRE).toFixed(2))
            };
        }).sort((a, b) => b.value - a.value);

        const currentPrediction = {
            totalFarms: matureFarms.length,
            totalAcreage: totalMatureAcreage.toFixed(2),
            totalYield: totalPredictedYield.toFixed(2),
            avgYield: avgYield.toFixed(2),
            marketValue: (totalPredictedYield * FFB_PRICE_PER_TON),
            yieldByMandal
        };
        setPrediction(currentPrediction);
        
        // 3. Generate AI Insights with Gemini
        if (!process.env.API_KEY) {
            setError("Gemini API key is not configured. Cannot generate insights.");
            setIsLoading(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                You are an agricultural program analyst for India's Oil Palm Mission. 
                Based on the following yield prediction data for the year ${filters.year} in ${getGeoName('district', { district: filters.district }) || 'all districts'}, provide a concise executive summary.
                
                Data:
                - Total Mature Farms Analyzed: ${currentPrediction.totalFarms}
                - Total Mature Acreage: ${currentPrediction.totalAcreage} acres
                - Total Predicted Yield: ${currentPrediction.totalYield} tons
                - Estimated Market Value: ${formatCurrency(currentPrediction.marketValue)}
                - Yield Breakdown by Mandal: ${JSON.stringify(currentPrediction.yieldByMandal.slice(0, 5))}
                
                Your Task:
                Write a brief, insightful report in markdown format. Include a title (e.g., using '#'), a short summary paragraph, and 2-3 bullet points for key takeaways. 
                Focus on the most productive mandals and suggest where field officers might focus their efforts for logistics or support.
                Do not invent any data.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setAiInsights(response.text);

        } catch (err) {
            console.error("Gemini API error:", err);
            setError("Failed to generate AI insights. The model may be unavailable.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const formatCurrency = (value: number) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    
    const renderMarkdown = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/# (.*?)(?:\n|$)/g, '<h3 class="text-lg font-bold text-gray-800 mb-2">$1</h3>')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                if (line.startsWith('* ') || line.startsWith('- ')) {
                    return `<li class="list-disc list-inside">${line.substring(2)}</li>`;
                }
                if (line.startsWith('#')) return ''; // Already handled
                return `<p>${line}</p>`;
            }).join('');
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">AI-Powered Yield Prediction</h1>
                        <p className="text-gray-500">Forecast oil palm yield based on mature plantation data.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>
                
                {/* Controls */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <CustomSelect label="District" options={[{value: '', label: 'All Districts'}, ...GEO_DATA.map(d => ({value: d.code, label: d.name}))]} value={filters.district} onChange={v => handleFilterChange('district', v)} placeholder="Select District" />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prediction Year</label>
                            <input type="number" name="year" value={filters.year} onChange={e => handleFilterChange('year', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <button onClick={generatePrediction} disabled={isLoading || !filters.district} className="w-full px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-gray-400">
                            {isLoading ? 'Generating...' : 'Generate Prediction'}
                        </button>
                    </div>
                </div>

                {prediction ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Predicted Yield (Tons)" value={parseFloat(prediction.totalYield).toLocaleString()} />
                            <StatCard title="Est. Market Value" value={formatCurrency(prediction.marketValue)} />
                            <StatCard title="Mature Farms Analyzed" value={prediction.totalFarms} />
                            <StatCard title="Avg. Yield (Tons/Acre)" value={prediction.avgYield} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Predicted Yield by Mandal</h3>
                                <BarChart data={prediction.yieldByMandal} />
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.45 1.18a1 1 0 01.548 1.564l-3.6 3.296 1.056 4.882a1 1 0 01-1.479 1.054L12 16.222l-4.12 2.85a1 1 0 01-1.479-1.054l1.056-4.882-3.6-3.296a1 1 0 01.548-1.564L8.854 7.2 10.033 2.744A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                                    AI Insights
                                </h3>
                                {isLoading && !aiInsights ? (
                                    <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div></div>
                                ) : error ? (
                                    <div className="p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
                                ) : aiInsights ? (
                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(aiInsights) }} />
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold">Select a District and Year</h2>
                        <p className="mt-2">Choose your filters and click "Generate Prediction" to view the forecast.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default YieldPredictionPage;
