import React, { useState, useMemo, useCallback } from 'react';
import { User, ProcessingStatus, Farmer, Harvest } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { ProcessingBatchModel, HarvestModel, FarmerModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { harvestModelToPlain, farmerModelToPlain } from '../lib/utils';
import ProcessingBatchDetailsModal from './ProcessingBatchDetailsModal';

interface ProcessingPageProps {
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const CreateBatchModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (harvestIds: string[], notes: string) => Promise<void>;
    unbatchedHarvests: { harvest: Harvest, farmer: Farmer }[];
}> = ({ isOpen, onClose, onSave, unbatchedHarvests }) => {
    const [selectedHarvestIds, setSelectedHarvestIds] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState('');

    const handleToggleHarvest = (id: string) => {
        setSelectedHarvestIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedHarvestIds.size === 0) {
            alert('Please select at least one harvest to create a batch.');
            return;
        }
        await onSave(Array.from(selectedHarvestIds), notes);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-full">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Create New Processing Batch</h2></div>
                <div className="p-8 space-y-4 overflow-y-auto">
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Select Unbatched Harvests</h3>
                        <div className="max-h-60 overflow-y-auto border rounded-md">
                            {unbatchedHarvests.length > 0 ? (
                                unbatchedHarvests.map(({ harvest, farmer }) => (
                                <div key={harvest.id} className="flex items-center gap-4 p-3 border-b last:border-b-0">
                                    <input type="checkbox" checked={selectedHarvestIds.has(harvest.id)} onChange={() => handleToggleHarvest(harvest.id)} className="h-4 w-4 text-green-600 border-gray-300 rounded" />
                                    <div className="flex-1">
                                        <p className="font-medium">{farmer.fullName}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(harvest.harvestDate).toLocaleDateString()} - {harvest.netWeight.toFixed(2)} kg
                                        </p>
                                    </div>
                                </div>
                            ))
                            ) : (
                                <p className="text-center text-gray-500 py-6">No unbatched harvests available.</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={selectedHarvestIds.size === 0} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400">Create Batch</button>
                </div>
            </form>
        </div>
    );
};


const ProcessingPage: React.FC<ProcessingPageProps> = ({ onBack, currentUser, setNotification }) => {
    const database = useDatabase();

    const batches = useQuery(useMemo(() => database.get<ProcessingBatchModel>('processing_batches').query(Q.sortBy('start_date', Q.desc)), [database]));
    const harvests = useQuery(useMemo(() => database.get<HarvestModel>('harvests').query(), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<ProcessingBatchModel | null>(null);

    const harvestMap = useMemo(() => new Map(harvests.map(h => [h.id, h])), [harvests]);
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);

    const batchesByStatus = useMemo(() => {
        const grouped: Record<ProcessingStatus, ProcessingBatchModel[]> = {
            [ProcessingStatus.Pending]: [],
            [ProcessingStatus.InProgress]: [],
            [ProcessingStatus.Completed]: [],
            [ProcessingStatus.Cancelled]: [],
        };
        batches.forEach(batch => {
            if (grouped[batch.status]) {
                grouped[batch.status].push(batch);
            }
        });
        return grouped;
    }, [batches]);

    const unbatchedHarvests = useMemo(() => {
        const batchedHarvestIds = new Set(batches.map(b => b.harvestId));
        return harvests
            .filter(h => !batchedHarvestIds.has(h.id))
            .map(h => ({
                harvest: harvestModelToPlain(h)!,
                farmer: farmerModelToPlain(farmerMap.get(h.farmerId)!)!
            }))
            .filter(item => item.farmer);
    }, [harvests, batches, farmerMap]);
    
    const handleCreateBatches = useCallback(async (harvestIds: string[], notes: string) => {
        try {
            await database.write(async () => {
                for (const harvestId of harvestIds) {
                    const now = new Date();
                    const batchCode = `B${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-4)}`;
                    await database.get<ProcessingBatchModel>('processing_batches').create(b => {
                        b.harvestId = harvestId;
                        b.batchCode = batchCode;
                        b.startDate = now.toISOString();
                        b.status = ProcessingStatus.Pending;
                        b.notes = notes;
                        b.syncStatusLocal = 'pending';
                        b.tenantId = currentUser.tenantId;
                    });
                }
            });
            setNotification({ message: `${harvestIds.length} batch(es) created successfully.`, type: 'success'});
            setIsModalOpen(false);
        } catch(e) {
            console.error("Failed to create batch:", e);
            setNotification({ message: 'Failed to create batch.', type: 'error'});
        }
    }, [database, currentUser, setNotification]);
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Processing & Value Chain</h1>
                        <p className="text-gray-500">Track FFB batches from harvest to oil extraction.</p>
                    </div>
                     <div className="flex items-center gap-4">
                         <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Create Batch</button>
                         <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            Back
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.values(ProcessingStatus).map(status => (
                        <div key={status} className="bg-gray-100 rounded-lg">
                            <h3 className="p-4 text-lg font-semibold text-gray-700 border-b">{status} ({batchesByStatus[status].length})</h3>
                            <div className="p-4 space-y-4 min-h-[50vh]">
                                {batchesByStatus[status].map(batch => {
                                    const harvest = harvestMap.get(batch.harvestId);
                                    const farmer = harvest ? farmerMap.get(harvest.farmerId) : null;
                                    return (
                                        <div key={batch.id} onClick={() => setSelectedBatch(batch)} className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:shadow-md">
                                            <p className="font-bold text-gray-800">{batch.batchCode}</p>
                                            <p className="text-sm text-gray-600">{farmer?.fullName || 'Unknown Farmer'}</p>
                                            <p className="text-xs text-gray-400 mt-2">{new Date(batch.startDate).toLocaleDateString()}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <CreateBatchModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleCreateBatches}
                unbatchedHarvests={unbatchedHarvests}
            />
            {selectedBatch && (
                <ProcessingBatchDetailsModal
                    batch={selectedBatch}
                    onClose={() => setSelectedBatch(null)}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export default ProcessingPage;