
import React, { useState, useMemo, useEffect } from 'react';
import { Farmer, FarmPlot } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, FarmPlotModel, SustainabilityActionModel, SensorReadingModel, AgronomicInputModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { GoogleGenAI } from '@google/genai';
import { calculateResilienceScore, getMockWeatherData, ClimateRiskAssessment, WeatherData } from '../lib/climateEngine';
import { calculateCarbonSequestration, calculateWaterEfficiency, CarbonAssessment, WaterEfficiencyMetric } from '../lib/caelusEngine';
import { farmerModelToPlain, farmPlotModelToPlain, formatCurrency, agronomicInputModelToPlain } from '../lib/utils';
import SustainabilityActionLogger from './SustainabilityActionLogger';

interface CaelusDashboardProps {
    onBack: () => void;
    currentUser: any;
}

const CaelusDashboard: React.FC<CaelusDashboardProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'overview' | 'carbon' | 'water'>('overview');
    const [isLoggerOpen, setIsLoggerOpen] = useState(false);

    // Data
    const farmers = useQuery(React.useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const plotModels = useQuery(React.useMemo(() => selectedFarmerId ? database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', selectedFarmerId)) : database.get<FarmPlotModel>('farm_plots').query(Q.where('id', 'null')), [database, selectedFarmerId]));
    const actionModels = useQuery(React.useMemo(() => selectedFarmerId ? database.get<SustainabilityActionModel>('sustainability_actions').query(Q.where('farmer_id', selectedFarmerId)) : database.get<SustainabilityActionModel>('sustainability_actions').query(Q.where('id', 'null')), [database, selectedFarmerId]));
    const sensorModels = useQuery(React.useMemo(() => selectedFarmerId ? database.get<SensorReadingModel>('sensor_readings').query() : database.get<SensorReadingModel>('sensor_readings').query(Q.where('id', 'null')), [database, selectedFarmerId]));
    const inputModels = useQuery(React.useMemo(() => selectedFarmerId ? database.get<AgronomicInputModel>('agronomic_inputs').query() : database.get<AgronomicInputModel>('agronomic_inputs').query(Q.where('id', 'null')), [database, selectedFarmerId]));

    // Plain Objects
    const plots = useMemo(() => plotModels.map(p => farmPlotModelToPlain(p)!), [plotModels]);
    const actions = useMemo(() => actionModels.map(a => a._raw as any), [actionModels]);
    const readings = useMemo(() => sensorModels.map(s => s._raw as any), [sensorModels]);
    const inputs = useMemo(() => inputModels.map(i => agronomicInputModelToPlain(i)!), [inputModels]);
    const selectedFarmer = useMemo(() => farmers.find(f => f.id === selectedFarmerId), [farmers, selectedFarmerId]);

    // Metrics
    const [carbonData, setCarbonData] = useState<CarbonAssessment | null>(null);
    const [waterData, setWaterData] = useState<WaterEfficiencyMetric | null>(null);

    useEffect(() => {
        if (plots.length > 0) {
            setCarbonData(calculateCarbonSequestration(plots, inputs, actions));
            setWaterData(calculateWaterEfficiency(readings, plots));
        }
    }, [plots, inputs, actions, readings]);

    const farmerOptions = React.useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM15.116 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM5.337 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM17.663 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708z" /></svg>
                            Hapsara Caelus
                        </h1>
                        <p className="text-gray-500">Sustainability Verification & Carbon Ledger</p>
                    </div>
                    <button onClick={onBack} className="px-4 py-2 bg-white border rounded-md hover:bg-gray-50">Back</button>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
                    <CustomSelect label="Select Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Select Farmer --" />
                </div>

                {selectedFarmerId && carbonData && waterData ? (
                    <div className="space-y-8">
                        {/* Hero Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Carbon Card */}
                            <div className="bg-gradient-to-br from-green-800 to-emerald-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-20"><svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg></div>
                                <p className="text-green-200 text-sm font-bold uppercase tracking-wide">Verified Carbon Potential</p>
                                <h2 className="text-4xl font-extrabold mt-2">{carbonData.totalCarbonSequestered} Tons</h2>
                                <p className="mt-4 text-2xl font-mono">{formatCurrency(carbonData.estimatedRevenue)}</p>
                                <p className="text-xs text-green-300 mt-1">Estimated Annual Revenue</p>
                            </div>

                            {/* Water Card */}
                            <div className="bg-white rounded-xl p-6 shadow-md border border-blue-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-gray-500 text-sm font-bold uppercase">Water Efficiency</p>
                                        <h2 className="text-4xl font-extrabold text-blue-600 mt-2">{waterData.efficiencyScore}/100</h2>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${waterData.usageStatus === 'OPTIMAL' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {waterData.usageStatus}
                                    </div>
                                </div>
                                <p className="mt-4 text-sm text-gray-600">{waterData.recommendation}</p>
                            </div>

                            {/* Action Card */}
                            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 flex flex-col justify-center items-center text-center">
                                <button 
                                    onClick={() => setIsLoggerOpen(true)}
                                    className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 hover:bg-green-200 transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </button>
                                <h3 className="font-bold text-gray-800">Log Sustainability Action</h3>
                                <p className="text-xs text-gray-500 mt-1">Upload proof of mulching, cover cropping, etc.</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="flex border-b">
                                <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 font-bold text-sm ${activeTab === 'overview' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Carbon Ledger</button>
                                <button onClick={() => setActiveTab('water')} className={`px-6 py-3 font-bold text-sm ${activeTab === 'water' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Water Security</button>
                            </div>
                            
                            <div className="p-6">
                                {activeTab === 'overview' && (
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-4">Sequestration Breakdown</h3>
                                        <ul className="space-y-3">
                                            {carbonData.breakdown.map((item, idx) => (
                                                <li key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                                    <span className="text-gray-700">{item.source}</span>
                                                    <span className="font-mono font-bold text-green-700">{item.value} Tons CO2e</span>
                                                </li>
                                            ))}
                                        </ul>
                                        
                                        <h3 className="font-bold text-gray-800 mt-8 mb-4">Verification History</h3>
                                        {actions.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {actions.map((a, idx) => (
                                                    <div key={idx} className="border rounded-lg p-4 flex gap-4">
                                                        {a.verificationPhotoUrl && <img src={a.verificationPhotoUrl} className="w-16 h-16 object-cover rounded" />}
                                                        <div>
                                                            <p className="font-bold text-gray-800">{a.actionType}</p>
                                                            <p className="text-xs text-gray-500">{new Date(a.submittedAt).toLocaleDateString()}</p>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.status}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <p className="text-gray-500 italic">No actions logged yet.</p>}
                                    </div>
                                )}

                                {activeTab === 'water' && (
                                    <div>
                                        <div className="bg-blue-50 p-4 rounded border border-blue-100 mb-6">
                                            <h4 className="font-bold text-blue-900">Water Usage Analysis</h4>
                                            <p className="text-sm text-blue-800 mt-1">
                                                Your farm is saving roughly <strong>{waterData.savings.toLocaleString()} Liters</strong> compared to the regional baseline this season.
                                            </p>
                                        </div>
                                        {readings.length === 0 && <p className="text-center text-gray-500 py-10">No sensor readings available. Please connect IoT devices or log manually.</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">Select a farmer to view sustainability metrics.</div>
                )}
            </div>

            {isLoggerOpen && selectedFarmerId && (
                <SustainabilityActionLogger 
                    farmer={selectedFarmer!} 
                    currentUser={currentUser}
                    onClose={() => setIsLoggerOpen(false)}
                    onSaveSuccess={() => { /* Refresh logic */ }}
                />
            )}
        </div>
    );
};

export default CaelusDashboard;
