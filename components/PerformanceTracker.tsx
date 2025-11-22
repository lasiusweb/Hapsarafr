

import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { SeedVarietyModel, FarmPlotModel, SeedPerformanceLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, Farmer } from '../types';
import CustomSelect from './CustomSelect';

interface PerformanceTrackerProps {
    onBack: () => void;
    currentUser: User;
}

const PerformanceTracker: React.FC<PerformanceTrackerProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    const [selectedPlotId, setSelectedPlotId] = useState('');
    const [selectedSeedId, setSelectedSeedId] = useState('');
    const [formState, setFormState] = useState({
        yield: '',
        diseaseScore: '5',
        droughtScore: '5',
        notes: ''
    });

    const farmers = useQuery(useMemo(() => database.get('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const plots = useQuery(useMemo(() => selectedFarmerId ? database.get('farm_plots').query(Q.where('farmer_id', selectedFarmerId)) : database.get('farm_plots').query(Q.where('id', 'null')), [database, selectedFarmerId]));
    const seeds = useQuery(useMemo(() => database.get('seed_varieties').query(), [database]));

    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: (f as any).fullName })), [farmers]);
    const plotOptions = useMemo(() => plots.map(p => ({ value: p.id, label: (p as any).name })), [plots]);
    const seedOptions = useMemo(() => seeds.map(s => ({ value: s.id, label: (s as any).name })), [seeds]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFarmerId || !selectedPlotId || !selectedSeedId) {
            alert("Please fill all required fields.");
            return;
        }

        try {
            await database.write(async () => {
                await database.get<SeedPerformanceLogModel>('seed_performance_logs').create(log => {
                    log.seedVarietyId = selectedSeedId;
                    log.farmPlotId = selectedPlotId;
                    log.farmerId = selectedFarmerId;
                    log.season = 'Kharif'; // Simplified
                    log.year = new Date().getFullYear();
                    log.yieldPerAcre = parseFloat(formState.yield);
                    log.diseaseResistanceScore = parseInt(formState.diseaseScore);
                    log.droughtSurvivalScore = parseInt(formState.droughtScore);
                    log.notes = formState.notes;
                    log.tenantId = currentUser.tenantId;
                });
            });
            alert("Performance log saved. Thank you for contributing to the ecosystem!");
            // Reset form
            setFormState({ yield: '', diseaseScore: '5', droughtScore: '5', notes: '' });
        } catch (e) {
            console.error(e);
            alert("Failed to save log.");
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-8">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-2xl font-bold text-gray-800">Seed Performance Tracker</h1>
                    <button onClick={onBack} className="text-sm text-gray-600 hover:underline">Close</button>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
                    <p className="text-sm text-blue-800"><strong>Community Science:</strong> Your data helps other farmers choose resilient seeds. Sensitive location data is anonymized before analysis.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CustomSelect label="Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} />
                        <CustomSelect label="Plot" options={plotOptions} value={selectedPlotId} onChange={setSelectedPlotId} disabled={!selectedFarmerId} />
                    </div>
                    
                    <CustomSelect label="Seed Variety" options={seedOptions} value={selectedSeedId} onChange={setSelectedSeedId} />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Yield (Tons/Acre)</label>
                            <input type="number" step="0.1" value={formState.yield} onChange={e => setFormState(s => ({...s, yield: e.target.value}))} required className="mt-1 w-full p-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Disease Resistance (1-10)</label>
                            <input type="number" min="1" max="10" value={formState.diseaseScore} onChange={e => setFormState(s => ({...s, diseaseScore: e.target.value}))} required className="mt-1 w-full p-2 border rounded-md" />
                            <p className="text-xs text-gray-500">10 = Highly Resistant</p>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Drought Survival (1-10)</label>
                            <input type="number" min="1" max="10" value={formState.droughtScore} onChange={e => setFormState(s => ({...s, droughtScore: e.target.value}))} required className="mt-1 w-full p-2 border rounded-md" />
                            <p className="text-xs text-gray-500">10 = High Survival</p>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Observations</label>
                        <textarea value={formState.notes} onChange={e => setFormState(s => ({...s, notes: e.target.value}))} className="mt-1 w-full p-2 border rounded-md" rows={3} placeholder="Any specific pests noted? Weather conditions?"></textarea>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">Submit Log</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PerformanceTracker;
