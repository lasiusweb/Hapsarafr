import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DistrictModel, MandalModel, VillageModel, TerritoryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface TerritoryManagementPageProps {
    onBack: () => void;
    currentUser: User;
}

const TerritoryManagementPage: React.FC<TerritoryManagementPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    
    // Data queries for geo structure and existing territories
    const districts = useQuery(useMemo(() => database.get<DistrictModel>('districts').query(Q.sortBy('name')), [database]));
    const mandals = useQuery(useMemo(() => database.get<MandalModel>('mandals').query(), [database]));
    const villages = useQuery(useMemo(() => database.get<VillageModel>('villages').query(), [database]));
    const territories = useQuery(useMemo(() => database.get<TerritoryModel>('territories').query(Q.where('tenant_id', currentUser.tenantId)), [database, currentUser.tenantId]));

    const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
    const [claimedTerritories, setClaimedTerritories] = useState<Set<string>>(new Set());

    // Initialize claimed territories from DB
    React.useEffect(() => {
        setClaimedTerritories(new Set(territories.map(t => t.administrativeCode)));
    }, [territories]);

    // Derived lists based on selections
    const mandalsForSelectedDistrict = useMemo(() => mandals.filter(m => m.districtId === selectedDistrictId).sort((a,b) => a.name.localeCompare(b.name)), [mandals, selectedDistrictId]);
    
    const handleToggleClaim = (level: 'MANDAL' | 'VILLAGE', code: string) => {
        setClaimedTerritories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(code)) {
                newSet.delete(code);
                // If un-claiming a mandal, also un-claim all its villages
                if (level === 'MANDAL') {
                    villages.filter(v => v.mandalId === mandals.find(m => `${m.districtId.split('_')[1]}-${m.code}` === code)?.id)
                            .forEach(v => newSet.delete(`${code}-${v.code}`));
                }
            } else {
                newSet.add(code);
                // If claiming a mandal, also claim all its villages
                if (level === 'MANDAL') {
                    villages.filter(v => v.mandalId === mandals.find(m => `${m.districtId.split('_')[1]}-${m.code}` === code)?.id)
                            .forEach(v => newSet.add(`${code}-${v.code}`));
                }
            }
            return newSet;
        });
    };

    const handleSaveChanges = async () => {
        const existingCodes = new Set(territories.map(t => t.administrativeCode));
        const newCodes = claimedTerritories;
        
        const toAdd = [...newCodes].filter(code => !existingCodes.has(code));
        const toRemove = [...existingCodes].filter(code => !newCodes.has(code));

        await database.write(async () => {
            // Remove territories that were unclaimed
            for (const code of toRemove) {
                const record = territories.find(t => t.administrativeCode === code);
                if (record) {
                    await record.destroyPermanently();
                }
            }

            // Add newly claimed territories
            for (const code of toAdd) {
                const parts = code.split('-');
                const level = parts.length === 1 ? 'DISTRICT' : parts.length === 2 ? 'MANDAL' : 'VILLAGE';
                await database.get<TerritoryModel>('territories').create(t => {
                    t.tenantId = currentUser.tenantId;
                    t.administrativeLevel = level as 'DISTRICT' | 'MANDAL' | 'VILLAGE';
                    t.administrativeCode = code;
                });
            }
        });
        alert('Territories saved successfully!');
    };

    const GeoColumn: React.FC<{ title: string; items: any[]; onSelect: (id: string) => void; selectedId: string | null; }> = ({ title, items, onSelect, selectedId }) => (
        <div className="border rounded-lg bg-white flex flex-col">
            <h3 className="p-4 border-b font-bold text-gray-800">{title}</h3>
            <ul className="overflow-y-auto">
                {items.map(item => (
                    <li key={item.id}>
                        <button onClick={() => onSelect(item.id)} className={`w-full text-left p-3 ${item.id === selectedId ? 'bg-green-100 font-semibold' : 'hover:bg-gray-50'}`}>
                            {item.name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Territory Management</h1>
                        <p className="text-gray-500">Claim operational areas for your organization.</p>
                    </div>
                     <div className="flex items-center gap-4">
                        <button onClick={handleSaveChanges} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">Save Changes</button>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            Back to Admin
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-[70vh]">
                    <GeoColumn title="Districts" items={districts} onSelect={setSelectedDistrictId} selectedId={selectedDistrictId} />

                    <div className="border rounded-lg bg-white flex flex-col col-span-2">
                        <h3 className="p-4 border-b font-bold text-gray-800">Mandals & Villages</h3>
                        <div className="overflow-y-auto">
                            {selectedDistrictId ? mandalsForSelectedDistrict.map(mandal => {
                                const districtCode = districts.find(d => d.id === mandal.districtId)?.code;
                                const mandalCode = `${districtCode}-${mandal.code}`;
                                const isMandalClaimed = claimedTerritories.has(mandalCode);
                                const childVillages = villages.filter(v => v.mandalId === mandal.id);

                                return (
                                    <div key={mandal.id} className="p-4 border-b">
                                        <div className="flex items-center">
                                            <input type="checkbox" checked={isMandalClaimed} onChange={() => handleToggleClaim('MANDAL', mandalCode)} className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                                            <label className="ml-3 font-semibold text-lg text-gray-700">{mandal.name}</label>
                                        </div>
                                        <div className="pl-8 pt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {childVillages.map(village => {
                                                const villageCode = `${mandalCode}-${village.code}`;
                                                const isVillageClaimed = claimedTerritories.has(villageCode);
                                                return (
                                                    <div key={village.id} className="flex items-center">
                                                        <input type="checkbox" checked={isVillageClaimed} onChange={() => handleToggleClaim('VILLAGE', villageCode)} className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                                                        <label className="ml-2 text-sm text-gray-600">{village.name}</label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            }) : <p className="p-10 text-center text-gray-500">Select a district to view its mandals and villages.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TerritoryManagementPage;
