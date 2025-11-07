import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DistrictModel, MandalModel, VillageModel, FarmerModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import ConfirmationModal from './ConfirmationModal';

interface GeoManagementPageProps {
    onBack: () => void;
}

interface ModalState {
    isOpen: boolean;
    mode: 'add' | 'edit';
    type: 'district' | 'mandal' | 'village';
    item?: DistrictModel | MandalModel | VillageModel;
    parentId?: string;
}

// Reusable modal for adding/editing geo data
const GeoEditModal: React.FC<{
    state: ModalState;
    onClose: () => void;
    onSave: (data: { id?: string, code: string, name: string, parentId?: string }) => Promise<void>;
}> = ({ state, onClose, onSave }) => {
    const { isOpen, mode, type, item, parentId } = state;
    const [name, setName] = useState('');
    const [code, setCode] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setName((item as any)?.name || '');
            setCode((item as any)?.code || '');
        }
    }, [isOpen, item]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({ id: item?.id, code, name, parentId });
    };
    
    if (!isOpen) return null;

    const title = `${mode === 'edit' ? 'Edit' : 'Add'} ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">{title}</h2></div>
                <div className="p-8 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700">Code</label>
                        <input id="code" type="text" value={code} onChange={e => setCode(e.target.value)} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" disabled={mode === 'edit'} />
                         {mode === 'add' && <p className="text-xs text-gray-500 mt-1">The code must be unique within its parent and cannot be changed later.</p>}
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                </div>
            </form>
        </div>
    );
};

const GeoManagementPage: React.FC<GeoManagementPageProps> = ({ onBack }) => {
    const database = useDatabase();
    
    // Data queries
    const districts = useQuery(useMemo(() => database.get<DistrictModel>('districts').query(Q.sortBy('name')), [database]));
    const mandals = useQuery(useMemo(() => database.get<MandalModel>('mandals').query(), [database]));
    const villages = useQuery(useMemo(() => database.get<VillageModel>('villages').query(), [database]));

    // State
    const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
    const [selectedMandalId, setSelectedMandalId] = useState<string | null>(null);
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'add', type: 'district' });
    const [itemToDelete, setItemToDelete] = useState<{ type: 'district' | 'mandal' | 'village', item: any } | null>(null);

    // Derived lists
    const mandalsForSelectedDistrict = useMemo(() => mandals.filter(m => m.districtId === selectedDistrictId).sort((a,b) => a.name.localeCompare(b.name)), [mandals, selectedDistrictId]);
    const villagesForSelectedMandal = useMemo(() => villages.filter(v => v.mandalId === selectedMandalId).sort((a,b) => a.name.localeCompare(b.name)), [villages, selectedMandalId]);

    // Handlers
    const handleSelectDistrict = (id: string) => {
        setSelectedDistrictId(id);
        setSelectedMandalId(null);
    };

    const handleAddItem = (type: 'district' | 'mandal' | 'village', parentId?: string) => {
        if ((type === 'mandal' && !selectedDistrictId) || (type === 'village' && !selectedMandalId)) {
            alert(`Please select a ${type === 'mandal' ? 'district' : 'mandal'} first.`);
            return;
        }
        setModalState({ isOpen: true, mode: 'add', type, parentId });
    };

    const handleEditItem = (type: 'district' | 'mandal' | 'village', item: any) => {
        setModalState({ isOpen: true, mode: 'edit', type, item });
    };

    const handleModalSave = async (data: { id?: string, code: string, name: string, parentId?: string }) => {
        const { id, code, name, parentId } = data;
        const type = modalState.type;

        await database.write(async () => {
            if (modalState.mode === 'edit' && id) {
                const record = await database.get(type === 'district' ? 'districts' : type === 'mandal' ? 'mandals' : 'villages').find(id);
                await record.update(r => { (r as any).name = name; });
            } else {
                if (type === 'district') {
                    await database.get<DistrictModel>('districts').create(d => { d._raw.id = `district_${code}`; d.code = code; d.name = name; });
                } else if (type === 'mandal' && parentId) {
                    const newMandal = await database.get<MandalModel>('mandals').create(m => { m.code = code; m.name = name; m.districtId = parentId; });
                    setSelectedMandalId(newMandal.id);
                } else if (type === 'village' && parentId) {
                    await database.get<VillageModel>('villages').create(v => { v.code = code; v.name = name; v.mandalId = parentId; });
                }
            }
        });
        setModalState({ isOpen: false, mode: 'add', type: 'district' });
    };

    const handleDeleteItem = async (type: 'district' | 'mandal' | 'village', item: any) => {
        let farmerInUseCount = 0;
        let childrenCount = 0;

        if (type === 'district') {
            farmerInUseCount = await database.get<FarmerModel>('farmers').query(Q.where('district', item.code)).fetchCount();
            childrenCount = await database.get<MandalModel>('mandals').query(Q.where('district_id', item.id)).fetchCount();
        } else if (type === 'mandal') {
            const district = await item.district;
            farmerInUseCount = await database.get<FarmerModel>('farmers').query(Q.where('district', district.code), Q.where('mandal', item.code)).fetchCount();
            childrenCount = await database.get<VillageModel>('villages').query(Q.where('mandal_id', item.id)).fetchCount();
        } else if (type === 'village') {
            const mandal = await item.mandal;
            const district = await mandal.district;
            farmerInUseCount = await database.get<FarmerModel>('farmers').query(Q.where('district', district.code), Q.where('mandal', mandal.code), Q.where('village', item.code)).fetchCount();
        }
        
        if (farmerInUseCount > 0) {
            alert(`Cannot delete this ${type}. It is currently associated with ${farmerInUseCount} farmer record(s).`);
            return;
        }
        if (childrenCount > 0) {
             alert(`Cannot delete this ${type}. It still contains ${childrenCount} child location(s). Please delete them first.`);
            return;
        }

        setItemToDelete({ type, item });
    };
    
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        const { item } = itemToDelete;
        await database.write(async () => {
            await item.destroyPermanently();
        });
        setItemToDelete(null);
    };


    const renderColumn = (title: string, items: any[], selectedId: string | null, onSelect: ((id: string) => void) | null, onAdd: () => void, onEdit: (item: any) => void, onDelete: (item: any) => void) => (
        <div className="border rounded-lg bg-white flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-800">{title}</h3>
                <button onClick={onAdd} className="text-sm font-semibold text-green-600 hover:underline">+ Add</button>
            </div>
            <ul className="overflow-y-auto">
                {items.map(item => (
                    <li key={item.id} className={`group ${item.id === selectedId ? 'bg-green-100' : ''}`}>
                        <div className="flex justify-between items-center p-3">
                            <button onClick={() => onSelect && onSelect(item.id)} className="flex-1 text-left" disabled={!onSelect}>
                                <span className="font-medium text-gray-700">{item.name}</span>
                                <span className="text-xs text-gray-500 ml-2 font-mono">({item.code})</span>
                            </button>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                                <button onClick={() => onDelete(item)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                            </div>
                        </div>
                    </li>
                ))}
                 {items.length === 0 && <li className="p-4 text-center text-gray-500 text-sm">No items.</li>}
            </ul>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Geographic Management</h1>
                        <p className="text-gray-500">Add, edit, or remove locations.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Admin
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
                    {renderColumn('Districts', districts, selectedDistrictId, handleSelectDistrict, () => handleAddItem('district'), (item) => handleEditItem('district', item), (item) => handleDeleteItem('district', item))}
                    {renderColumn('Mandals', mandalsForSelectedDistrict, selectedMandalId, (id) => setSelectedMandalId(id), () => handleAddItem('mandal', selectedDistrictId!), (item) => handleEditItem('mandal', item), (item) => handleDeleteItem('mandal', item))}
                    {renderColumn('Villages', villagesForSelectedMandal, null, null, () => handleAddItem('village', selectedMandalId!), (item) => handleEditItem('village', item), (item) => handleDeleteItem('village', item))}
                </div>
            </div>
            
            <GeoEditModal state={modalState} onClose={() => setModalState({ ...modalState, isOpen: false })} onSave={handleModalSave} />
            {itemToDelete && (
                <ConfirmationModal 
                    isOpen={!!itemToDelete}
                    title={`Delete ${itemToDelete.type}?`}
                    message={<p>Are you sure you want to delete "<strong>{itemToDelete.item.name}</strong>"? This action cannot be undone.</p>}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setItemToDelete(null)}
                    confirmText="Delete"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}
        </div>
    );
};

export default GeoManagementPage;