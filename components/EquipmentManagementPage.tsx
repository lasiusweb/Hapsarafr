import React, { useState, useMemo, useCallback } from 'react';
import { User } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { EquipmentModel, EquipmentMaintenanceLogModel, UserModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import ConfirmationModal from './ConfirmationModal';
import { formatCurrency } from '../lib/utils';

interface EquipmentManagementPageProps {
    onBack: () => void;
    currentUser: User;
}

const EquipmentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any, mode: 'create' | 'edit') => Promise<void>;
    equipment?: EquipmentModel;
}> = ({ isOpen, onClose, onSave, equipment }) => {
    const isEditMode = !!equipment;
    const [formState, setFormState] = useState({
        name: equipment?.name || '',
        type: equipment?.type || '',
        location: equipment?.location || '',
        status: equipment?.status || 'operational',
    });

    if (!isOpen) return null;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formState, isEditMode ? 'edit' : 'create');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">{isEditMode ? 'Edit' : 'Add'} Equipment</h2></div>
                <div className="p-8 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                        <input value={formState.name} onChange={e => setFormState(s => ({...s, name: e.target.value}))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <input value={formState.type} onChange={e => setFormState(s => ({...s, type: e.target.value}))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Sterilizer, Press" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Location</label>
                            <input value={formState.location} onChange={e => setFormState(s => ({...s, location: e.target.value}))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Section A" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        {/* FIX: Cast the value from CustomSelect to the expected string literal type to fix the type error. */}
                        <CustomSelect value={formState.status} onChange={v => setFormState(s => ({...s, status: v as 'operational' | 'maintenance' | 'decommissioned'}))} options={[{value: 'operational', label: 'Operational'}, {value: 'maintenance', label: 'Maintenance'}, {value: 'decommissioned', label: 'Decommissioned'}]} />
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit">Save</button>
                </div>
            </form>
        </div>
    );
};

const MaintenanceLogModal: React.FC<{
    equipment: EquipmentModel;
    onClose: () => void;
    onAddLog: (logData: any) => Promise<void>;
    currentUser: User;
}> = ({ equipment, onClose, onAddLog, currentUser }) => {
    const database = useDatabase();
    const logs = useQuery(useMemo(() => database.get<EquipmentMaintenanceLogModel>('equipment_maintenance_logs').query(Q.where('equipment_id', equipment.id), Q.sortBy('maintenance_date', Q.desc)), [database, equipment.id]));
    const [showAddForm, setShowAddForm] = useState(false);
    const [formState, setFormState] = useState({ description: '', cost: '', maintenanceDate: new Date().toISOString().split('T')[0] });

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        onAddLog({
            ...formState,
            cost: parseFloat(formState.cost) || 0,
            performedById: currentUser.id
        }).then(() => {
            setFormState({ description: '', cost: '', maintenanceDate: new Date().toISOString().split('T')[0] });
            setShowAddForm(false);
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-full">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Maintenance Log for {equipment.name}</h2></div>
                <div className="p-8 space-y-4 overflow-y-auto">
                    {!showAddForm && <button onClick={() => setShowAddForm(true)} className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">+ Add New Log</button>}
                    {showAddForm && (
                        <form onSubmit={handleAddLog} className="p-4 border rounded-md bg-gray-50 space-y-3">
                            <h4 className="font-semibold">New Log Entry</h4>
                            <input value={formState.maintenanceDate} onChange={e => setFormState(s => ({...s, maintenanceDate: e.target.value}))} type="date" required className="w-full p-2 border rounded-md" />
                            <textarea value={formState.description} onChange={e => setFormState(s => ({...s, description: e.target.value}))} required placeholder="Description of work performed..." rows={3} className="w-full p-2 border rounded-md"></textarea>
                            <input value={formState.cost} onChange={e => setFormState(s => ({...s, cost: e.target.value}))} type="number" placeholder="Cost (₹)" className="w-full p-2 border rounded-md" />
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
                                <button type="submit">Save Log</button>
                            </div>
                        </form>
                    )}
                    <h3 className="font-semibold text-gray-700 pt-4">History</h3>
                    <ul className="divide-y">
                        {logs.map(log => (
                            <li key={log.id} className="py-3">
                                <p className="font-medium">{new Date(log.maintenanceDate).toLocaleDateString()}</p>
                                <p className="text-sm text-gray-600">{log.description}</p>
                                <p className="text-xs text-gray-500 mt-1">Cost: {formatCurrency(log.cost)}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end rounded-b-lg"><button onClick={onClose}>Close</button></div>
            </div>
        </div>
    );
};


const EquipmentManagementPage: React.FC<EquipmentManagementPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const equipmentList = useQuery(useMemo(() => database.get<EquipmentModel>('equipment').query(Q.sortBy('name', Q.asc)), [database]));

    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; item?: EquipmentModel }>({ isOpen: false, mode: 'add' });
    const [logModalEquipment, setLogModalEquipment] = useState<EquipmentModel | null>(null);

    const handleSave = useCallback(async (data: any, mode: 'create' | 'edit') => {
        await database.write(async () => {
            if (mode === 'edit' && modalState.item) {
                await modalState.item.update(eq => { Object.assign(eq, data); eq.syncStatusLocal = 'pending'; });
            } else {
                await database.get<EquipmentModel>('equipment').create(eq => {
                    Object.assign(eq, data);
                    eq.syncStatusLocal = 'pending';
                    eq.tenantId = currentUser.tenantId;
                });
            }
        });
        setModalState({ isOpen: false, mode: 'add' });
    }, [database, currentUser, modalState.item]);

    const handleAddLog = useCallback(async (logData: any) => {
        await database.write(async () => {
            await database.get<EquipmentMaintenanceLogModel>('equipment_maintenance_logs').create(log => {
                log.equipmentId = logModalEquipment!.id;
                Object.assign(log, logData);
                log.syncStatusLocal = 'pending';
                log.tenantId = currentUser.tenantId;
            });
            await logModalEquipment!.update(eq => {
                eq.lastMaintenanceDate = logData.maintenanceDate;
                eq.syncStatusLocal = 'pending';
            });
        });
    }, [database, currentUser, logModalEquipment]);

    const StatusBadge = ({ status }: { status: string }) => {
        const colors = {
            operational: 'bg-green-100 text-green-800',
            maintenance: 'bg-yellow-100 text-yellow-800',
            decommissioned: 'bg-gray-100 text-gray-600',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status as keyof typeof colors]}`}>{status}</span>;
    };
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Equipment & Asset Management</h1>
                        <p className="text-gray-500">Manage processing equipment, and track maintenance.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setModalState({ isOpen: true, mode: 'add'})} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Add Equipment</button>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                           Back
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Maintenance</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {equipmentList.map(eq => (
                                    <tr key={eq.id}>
                                        <td className="px-6 py-4 font-medium">{eq.name}</td>
                                        <td>{eq.type}</td>
                                        <td>{eq.location}</td>
                                        <td><StatusBadge status={eq.status} /></td>
                                        <td>{eq.lastMaintenanceDate ? new Date(eq.lastMaintenanceDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="text-right space-x-4">
                                            <button onClick={() => setLogModalEquipment(eq)} className="text-blue-600 hover:underline">Logs</button>
                                            <button onClick={() => setModalState({ isOpen: true, mode: 'edit', item: eq})} className="text-green-600 hover:underline">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <EquipmentModal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, mode: 'add'})} onSave={handleSave} equipment={modalState.item} />
            {logModalEquipment && <MaintenanceLogModal equipment={logModalEquipment} onClose={() => setLogModalEquipment(null)} onAddLog={handleAddLog} currentUser={currentUser} />}
        </div>
    );
};

export default EquipmentManagementPage;
