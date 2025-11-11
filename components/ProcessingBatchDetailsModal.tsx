import React, { useState, useMemo, useCallback } from 'react';
import { ProcessingBatchModel, ProcessingStepModel, HarvestModel, FarmerModel, EquipmentModel, UserModel } from '../db';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { Q } from '@nozbe/watermelondb';
// FIX: Import 'ProcessingStatus' to resolve type error when updating batch status.
import { User, ProcessingStatus } from '../types';
import CustomSelect from './CustomSelect';

interface ProcessingBatchDetailsModalProps {
    batch: ProcessingBatchModel;
    onClose: () => void;
    currentUser: User;
}

const AddStepModal: React.FC<{
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    equipment: EquipmentModel[];
    users: UserModel[];
}> = ({ onClose, onSave, equipment, users }) => {
    const [formState, setFormState] = useState({
        stepName: '',
        parameters: '',
        operatorId: '',
        equipmentId: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formState, startDate: new Date().toISOString() });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Add Processing Step</h2></div>
                <div className="p-8 space-y-4">
                    <input value={formState.stepName} onChange={e => setFormState(s => ({...s, stepName: e.target.value}))} required placeholder="Step Name (e.g., Sterilization)" className="w-full p-2 border rounded-md" />
                    <CustomSelect value={formState.operatorId} onChange={v => setFormState(s => ({...s, operatorId: v}))} options={users.map(u => ({value: u.id, label: u.name}))} placeholder="Select Operator" />
                    <CustomSelect value={formState.equipmentId} onChange={v => setFormState(s => ({...s, equipmentId: v}))} options={equipment.map(e => ({value: e.id, label: e.name}))} placeholder="Select Equipment (Optional)" />
                    <textarea value={formState.parameters} onChange={e => setFormState(s => ({...s, parameters: e.target.value}))} placeholder="Parameters (JSON format)" rows={3} className="w-full p-2 border rounded-md font-mono text-sm"></textarea>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit">Save Step</button>
                </div>
            </form>
        </div>
    );
};


const ProcessingBatchDetailsModal: React.FC<ProcessingBatchDetailsModalProps> = ({ batch, onClose, currentUser }) => {
    const database = useDatabase();
    const [isAddStepOpen, setIsAddStepOpen] = useState(false);
    
    // Data fetching
    const steps = useQuery(useMemo(() => database.get<ProcessingStepModel>('processing_steps').query(Q.where('batch_id', batch.id), Q.sortBy('start_date', Q.asc)), [database, batch.id]));
    const harvest = useQuery(useMemo(() => database.get<HarvestModel>('harvests').query(Q.where('id', batch.harvestId)), [database, batch.harvestId]))[0];
    const farmer = useQuery(useMemo(() => harvest ? database.get<FarmerModel>('farmers').query(Q.where('id', harvest.farmerId)) : database.get<FarmerModel>('farmers').query(Q.where('id', 'null')), [database, harvest]))[0];
    const equipment = useQuery(useMemo(() => database.get<EquipmentModel>('equipment').query(), [database]));
    const users = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));
    
    // Memoized maps for performance
    const equipmentMap = useMemo(() => new Map(equipment.map(e => [e.id, e.name])), [equipment]);
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    const handleAddStep = useCallback(async (data: any) => {
        await database.write(async () => {
            await database.get<ProcessingStepModel>('processing_steps').create(step => {
                step.batchId = batch.id;
                Object.assign(step, data);
                step.syncStatusLocal = 'pending';
                step.tenantId = currentUser.tenantId;
            });
            await batch.update(b => {
                // FIX: Use the ProcessingStatus enum to correctly assign the status value and fix the type error.
                b.status = ProcessingStatus.InProgress;
                b.syncStatusLocal = 'pending';
            })
        });
        setIsAddStepOpen(false);
    }, [database, batch, currentUser]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-full">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Batch: {batch.batchCode}</h2>
                    <p className="text-sm text-gray-500">
                        Farmer: {farmer?.fullName || '...'} | Harvest Date: {harvest ? new Date(harvest.harvestDate).toLocaleDateString() : '...'}
                    </p>
                </div>
                <div className="p-8 space-y-4 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-700">Processing Steps</h3>
                        <button onClick={() => setIsAddStepOpen(true)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 font-semibold">+ Add Step</button>
                    </div>
                    {steps.length > 0 ? (
                        <div className="relative border-l-2 border-gray-200 ml-3">
                            {steps.map(step => (
                                <div key={step.id} className="mb-6 ml-6">
                                    <span className="absolute -left-3.5 flex items-center justify-center w-7 h-7 bg-green-200 rounded-full ring-8 ring-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    </span>
                                    <div className="p-4 bg-gray-50 border rounded-lg">
                                        <h4 className="font-bold text-gray-800">{step.stepName}</h4>
                                        <p className="text-xs text-gray-500">
                                            {new Date(step.startDate).toLocaleString()}
                                        </p>
                                        <div className="text-sm mt-2 space-y-1">
                                            <p><strong>Operator:</strong> {userMap.get(step.operatorId) || 'N/A'}</p>
                                            <p><strong>Equipment:</strong> {equipmentMap.get(step.equipmentId!) || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No processing steps have been logged for this batch yet.</p>
                    )}
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
                </div>
                {isAddStepOpen && (
                    <AddStepModal 
                        onClose={() => setIsAddStepOpen(false)}
                        onSave={handleAddStep}
                        equipment={equipment}
                        users={users}
                    />
                )}
            </div>
        </div>
    );
};

export default ProcessingBatchDetailsModal;