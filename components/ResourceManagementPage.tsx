import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { ResourceModel, ResourceDistributionModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import ConfirmationModal from './ConfirmationModal';
import { formatCurrency } from '../lib/utils';

interface ResourceManagementPageProps {
    onBack: () => void;
}

const ResourceManagementPage: React.FC<ResourceManagementPageProps> = ({ onBack }) => {
    const database = useDatabase();
    const resources = useQuery(useMemo(() => database.get<ResourceModel>('resources').query(Q.sortBy('name', Q.asc)), [database]));

    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; item?: ResourceModel }>({ isOpen: false, mode: 'add' });
    const [formState, setFormState] = useState({ name: '', unit: '', description: '', cost: '' });
    const [itemToDelete, setItemToDelete] = useState<ResourceModel | null>(null);

    const handleOpenModal = (mode: 'add' | 'edit', item?: ResourceModel) => {
        setModalState({ isOpen: true, mode, item });
        setFormState({
            name: item?.name || '',
            unit: item?.unit || '',
            description: item?.description || '',
            cost: String(item?.cost || ''),
        });
    };

    const handleCloseModal = () => {
        setModalState({ isOpen: false, mode: 'add' });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await database.write(async () => {
            if (modalState.mode === 'edit' && modalState.item) {
                await modalState.item.update(r => {
                    r.name = formState.name;
                    r.unit = formState.unit;
                    r.description = formState.description;
                    r.cost = parseFloat(formState.cost) || 0;
                });
            } else {
                await database.get<ResourceModel>('resources').create(r => {
                    r.name = formState.name;
                    r.unit = formState.unit;
                    r.description = formState.description;
                    r.cost = parseFloat(formState.cost) || 0;
                    r.tenantId = 'default-tenant'; // This should be dynamic in a multi-tenant app
                });
            }
        });
        handleCloseModal();
    };

    const handleDelete = async (resource: ResourceModel) => {
        const usageCount = await database.get<ResourceDistributionModel>('resource_distributions').query(Q.where('resource_id', resource.id)).fetchCount();
        if (usageCount > 0) {
            alert(`Cannot delete "${resource.name}". It has been distributed ${usageCount} time(s).`);
            return;
        }
        setItemToDelete(resource);
    };

    const confirmDelete = async () => {
        if (itemToDelete) {
            await database.write(async () => {
                await itemToDelete.destroyPermanently();
            });
            setItemToDelete(null);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Resource Definitions</h1>
                        <p className="text-gray-500">Define inventory items that can be distributed to farmers.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Admin Panel
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Available Resources ({resources.length})</h2>
                        <button onClick={() => handleOpenModal('add')} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Add New Resource</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost (₹)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {resources.map(r => (
                                    <tr key={r.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.unit}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">{formatCurrency(r.cost || 0)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{r.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenModal('edit', r)} className="text-green-600 hover:text-green-900">Edit</button>
                                            <button onClick={() => handleDelete(r)} className="text-red-600 hover:text-red-900 ml-4">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {modalState.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleSave} className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">{modalState.mode === 'edit' ? 'Edit' : 'Add'} Resource</h2></div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input value={formState.name} onChange={e => setFormState(s => ({ ...s, name: e.target.value }))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Imported Saplings" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Unit of Measurement</label>
                                    <input value={formState.unit} onChange={e => setFormState(s => ({ ...s, unit: e.target.value }))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., sapling, kg, bag" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cost (₹)</label>
                                    <input type="number" step="0.01" value={formState.cost} onChange={e => setFormState(s => ({ ...s, cost: e.target.value }))} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., 250.50" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                                <textarea value={formState.description} onChange={e => setFormState(s => ({ ...s, description: e.target.value }))} className="mt-1 w-full p-2 border border-gray-300 rounded-md" rows={3}></textarea>
                            </div>
                        </div>
                        <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                            <button type="button" onClick={handleCloseModal} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                        </div>
                    </form>
                </div>
            )}
            
            {itemToDelete && (
                <ConfirmationModal 
                    isOpen={!!itemToDelete}
                    title="Delete Resource?"
                    message={<p>Are you sure you want to delete "<strong>{itemToDelete.name}</strong>"? This action cannot be undone.</p>}
                    onConfirm={confirmDelete}
                    onCancel={() => setItemToDelete(null)}
                    confirmText="Delete"
                    confirmButtonVariant="destructive"
                />
            )}
        </div>
    );
};

export default ResourceManagementPage;