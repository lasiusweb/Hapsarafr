
import React, { useState, useEffect, useMemo } from 'react';
import { Farmer, FarmPlot, RoadAccessType, ListingType, ListingStatus } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmPlotModel, LandListingModel, LandValuationHistoryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { calculateHVS, getHvsGrade, getHvsColor } from '../lib/valuation';

interface CreateLandListingModalProps {
    onClose: () => void;
    currentUser: any;
    onSaveSuccess: () => void;
}

const CreateLandListingModal: React.FC<CreateLandListingModalProps> = ({ onClose, currentUser, onSaveSuccess }) => {
    const database = useDatabase();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1: Select Plot
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    const [selectedPlotId, setSelectedPlotId] = useState('');

    // Step 2: Valuation Inputs
    const [avgYield, setAvgYield] = useState('8'); // Default
    const [soc, setSoc] = useState('0.8'); // Default
    const [waterDepth, setWaterDepth] = useState('150');
    const [roadAccess, setRoadAccess] = useState<RoadAccessType>(RoadAccessType.DirtRoad);
    const [hvsScore, setHvsScore] = useState<number>(0);

    // Step 3: Commercials
    const [askPrice, setAskPrice] = useState('');
    const [duration, setDuration] = useState('12'); // Months
    const [description, setDescription] = useState('');
    
    // Data Fetching
    const farmers = useQuery(useMemo(() => database.get('farmers').query(Q.where('tenant_id', currentUser.tenantId)), [database, currentUser.tenantId])) as unknown as Farmer[];
    const plots = useQuery(useMemo(() => 
        selectedFarmerId ? database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', selectedFarmerId)) : database.get<FarmPlotModel>('farm_plots').query(Q.where('id', 'null')),
    [database, selectedFarmerId]));

    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: f.fullName })), [farmers]);
    const plotOptions = useMemo(() => plots.map(p => ({ value: p.id, label: `${p.name} (${p.acreage} ac)` })), [plots]);

    // Real-time Score Calculation
    useEffect(() => {
        const score = calculateHVS(
            parseFloat(avgYield) || 0,
            parseFloat(soc) || 0,
            parseFloat(waterDepth) || 0,
            roadAccess
        );
        setHvsScore(score);
    }, [avgYield, soc, waterDepth, roadAccess]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await database.write(async () => {
                const listing = await database.get<LandListingModel>('land_listings').create(l => {
                    l.farmPlotId = selectedPlotId;
                    l.farmerId = selectedFarmerId;
                    l.listingType = ListingType.Lease;
                    l.status = ListingStatus.Active;
                    
                    // Valuation Data
                    l.soilOrganicCarbon = parseFloat(soc);
                    l.waterTableDepth = parseFloat(waterDepth);
                    l.roadAccess = roadAccess;
                    l.avgYieldHistory = parseFloat(avgYield);
                    l.hapsaraValueScore = hvsScore;
                    
                    // Commercials
                    l.askPrice = parseFloat(askPrice);
                    l.durationMonths = parseInt(duration);
                    l.availableFrom = new Date().toISOString();
                    l.description = description;
                    l.tenantId = currentUser.tenantId;
                    l.syncStatusLocal = 'pending';
                });

                // Store History
                await database.get<LandValuationHistoryModel>('land_valuation_history').create(h => {
                    h.listingId = listing.id;
                    h.score = hvsScore;
                    h.calculatedAt = new Date();
                    h.factorsJson = JSON.stringify({ avgYield, soc, waterDepth, roadAccess });
                    h.syncStatusLocal = 'pending';
                });
            });
            onSaveSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to create listing");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b flex justify-between items-center bg-amber-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-amber-900">List Land for Lease</h2>
                    <span className="text-sm font-medium text-amber-700">Step {step} of 3</span>
                </div>
                
                <div className="p-8 min-h-[300px]">
                    {step === 1 && (
                        <div className="space-y-6">
                            <CustomSelect label="Select Land Owner" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} />
                            <CustomSelect label="Select Plot" options={plotOptions} value={selectedPlotId} onChange={setSelectedPlotId} disabled={!selectedFarmerId} />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 bg-blue-50 p-4 rounded-md border border-blue-200 mb-2">
                                <p className="text-sm text-blue-800">Since IoT sensors are not connected, please input the latest ground data for <strong>Valuation Scoring</strong>.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Avg. 3Yr Yield (Tons/Ac)</label>
                                <input type="number" value={avgYield} onChange={e => setAvgYield(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Soil Organic Carbon (%)</label>
                                <input type="number" step="0.1" value={soc} onChange={e => setSoc(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Water Table Depth (ft)</label>
                                <input type="number" value={waterDepth} onChange={e => setWaterDepth(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Road Access</label>
                                <select value={roadAccess} onChange={e => setRoadAccess(e.target.value as RoadAccessType)} className="w-full p-2 border rounded-md mt-1 bg-white">
                                    <option value={RoadAccessType.Highway}>Highway</option>
                                    <option value={RoadAccessType.PavedRoad}>Paved Road</option>
                                    <option value={RoadAccessType.DirtRoad}>Dirt Road</option>
                                    <option value={RoadAccessType.NoAccess}>No Access</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 mt-4 p-4 border-2 border-amber-200 rounded-lg bg-amber-50 text-center">
                                <p className="text-sm text-amber-800 uppercase font-bold tracking-wider">Projected Hapsara Value Score</p>
                                <div className="flex items-center justify-center gap-4 mt-2">
                                    <span className="text-4xl font-extrabold text-gray-900">{hvsScore}</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getHvsColor(hvsScore)}`}>{getHvsGrade(hvsScore)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Monthly Rent Ask (₹)</label>
                                <input type="number" value={askPrice} onChange={e => setAskPrice(e.target.value)} className="w-full p-2 border rounded-md mt-1" placeholder="e.g. 5000" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Lease Duration (Months)</label>
                                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-md mt-1" rows={3} placeholder="Describe soil quality, previous crops, etc." />
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 p-4 flex justify-between rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md">Cancel</button>
                    <div className="flex gap-2">
                        {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100">Back</button>}
                        {step < 3 && <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !selectedPlotId} className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50">Next</button>}
                        {step === 3 && <button onClick={handleSubmit} disabled={isSubmitting || !askPrice} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">{isSubmitting ? 'Listing...' : 'Publish Listing'}</button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateLandListingModal;
