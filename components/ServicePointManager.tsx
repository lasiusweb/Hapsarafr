
import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { ServicePointModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { User } from '../types';

interface ServicePointManagerProps {
    currentUser: User;
}

const ServicePointManager: React.FC<ServicePointManagerProps> = ({ currentUser }) => {
    const database = useDatabase();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<ServicePointModel | null>(null);

    const servicePoints = useQuery(useMemo(() => 
        database.get<ServicePointModel>('service_points')
            .query(Q.where('tenant_id', currentUser.tenantId)), 
    [database, currentUser.tenantId]));

    const handleSave = async (data: any) => {
        try {
            await database.write(async () => {
                if (editingPoint) {
                    await editingPoint.update(sp => {
                        sp.name = data.name;
                        sp.location = data.location;
                        sp.serviceType = data.serviceType;
                        sp.capacityPerSlot = parseInt(data.capacityPerSlot);
                        sp.isActive = data.isActive;
                    });
                } else {
                    await database.get<ServicePointModel>('service_points').create(sp => {
                        sp.name = data.name;
                        sp.location = data.location;
                        sp.serviceType = data.serviceType;
                        sp.capacityPerSlot = parseInt(data.capacityPerSlot);
                        sp.isActive = data.isActive;
                        sp.tenantId = currentUser.tenantId;
                    });
                }
            });
            setIsModalOpen(false);
            setEditingPoint(null);
        } catch (error) {
            console.error("Failed to save service point:", error);
            alert("Failed to save service point.");
        }
    };

    const handleDelete = async (point: ServicePointModel) => {
        if(confirm("Are you sure you want to delete this service point?")) {
             await database.write(async () => {
                await (point as any).destroyPermanently();
             });
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Logistics Infrastructure</h2>
                <button onClick={() => { setEditingPoint(null); setIsModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">+ Add Service Point</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servicePoints.map(sp => (
                    <div key={sp.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-800">{sp.name}</h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${sp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {sp.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{sp.serviceType.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {sp.location}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">Capacity: <strong>{sp.capacityPerSlot || 5}</strong> / 30min</p>
                        </div>
                        <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                             <button onClick={() => { setEditingPoint(sp); setIsModalOpen(true); }} className="text-sm text-blue-600 hover:underline">Edit</button>
                             <button onClick={() => handleDelete(sp)} className="text-sm text-red-600 hover:underline">Delete</button>
                        </div>
                    </div>
                ))}
                 {servicePoints.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                        No service points defined. Add Collection Centers or Field Hubs.
                    </div>
                )}
            </div>

            {isModalOpen && (
                <ServicePointModal 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSave} 
                    initialData={editingPoint} 
                />
            )}
        </div>
    );
};

const ServicePointModal: React.FC<{ onClose: () => void, onSave: (data: any) => void, initialData: ServicePointModel | null }> = ({ onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        location: initialData?.location || '',
        serviceType: initialData?.serviceType || 'COLLECTION_CENTER',
        capacityPerSlot: initialData?.capacityPerSlot?.toString() || '5',
        isActive: initialData?.isActive ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
             <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">{initialData ? 'Edit' : 'Add'} Service Point</h2></div>
                <div className="p-8 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-2 border rounded-md mt-1" placeholder="e.g., Central Collection Point A" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <CustomSelect 
                            value={formData.serviceType} 
                            onChange={v => setFormData({...formData, serviceType: v})} 
                            options={[{value: 'COLLECTION_CENTER', label: 'Collection Center'}, {value: 'FIELD_HUB', label: 'Field Hub'}]} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required className="w-full p-2 border rounded-md mt-1" placeholder="e.g., Near Market Yard" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Capacity per 30min Slot</label>
                        <input type="number" value={formData.capacityPerSlot} onChange={e => setFormData({...formData, capacityPerSlot: e.target.value})} required className="w-full p-2 border rounded-md mt-1" />
                    </div>
                     <div className="flex items-center">
                        <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <label className="ml-2 block text-sm text-gray-900">Active</label>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold">Save</button>
                </div>
            </form>
        </div>
    );
}

export default ServicePointManager;
