import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DistrictModel, MandalModel, TerritoryModel, TenantModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User } from '../types';

interface TerritoryManagementPageProps {
    onBack: () => void;
    currentUser: User;
}

const TerritoryManagementPage: React.FC<TerritoryManagementPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    
    // Data queries
    const allDistricts = useQuery(useMemo(() => database.get<DistrictModel>('districts').query(Q.sortBy('name')), [database]));
    const allMandals = useQuery(useMemo(() => database.get<MandalModel>('mandals').query(), [database]));
    const allTenants = useQuery(useMemo(() => database.get<TenantModel>('tenants').query(), [database]));
    const allTerritories = useQuery(useMemo(() => database.get<TerritoryModel>('territories').query(), [database]));

    const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedDistrictId && allDistricts.length > 0) {
            setSelectedDistrictId(allDistricts[0].id);
        }
    }, [allDistricts, selectedDistrictId]);
    
    const tenantMap = useMemo(() => new Map(allTenants.map(t => [t.id, t.name])), [allTenants]);

    const territoryMap = useMemo(() => {
        const map = new Map<string, string[]>(); // adminCode -> list of tenantIds
        allTerritories.forEach(t => {
            const tenants = map.get(t.administrativeCode) || [];
            tenants.push(t.tenantId);
            map.set(t.administrativeCode, tenants);
        });
        return map;
    }, [allTerritories]);

    const mandalsForSelectedDistrict = useMemo(() => {
        if (!selectedDistrictId) return [];
        return allMandals.filter(m => m.districtId === selectedDistrictId).sort((a, b) => a.name.localeCompare(b.name));
    }, [allMandals, selectedDistrictId]);
    
    const handleTerritoryChange = useCallback(async (districtCode: string, mandalCode: string, action: 'add' | 'remove') => {
        const adminCode = `${districtCode}-${mandalCode}`;
        
        await database.write(async () => {
            if (action === 'add') {
                await database.get<TerritoryModel>('territories').create(t => {
                    t.tenantId = currentUser.tenantId;
                    t.administrativeLevel = 'MANDAL';
                    t.administrativeCode = adminCode;
                });
            } else if (action === 'remove') {
                const myTerritoriesInMandal = await database.get<TerritoryModel>('territories').query(
                    Q.where('administrative_code', adminCode),
                    Q.where('tenant_id', currentUser.tenantId)
                ).fetch();
                
                for (const territory of myTerritoriesInMandal) {
                    await territory.destroyPermanently();
                }
            }
        });
    }, [database, currentUser.tenantId]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Service Area Definition</h1>
                        <p className="text-gray-500">Define your organization's operational areas.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Back to Admin
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-xl p-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h4 className="font-bold mb-2 p-2">Districts</h4>
                            <ul className="border rounded-md divide-y max-h-[60vh] overflow-y-auto">
                                {allDistricts.map(d => (
                                    <li key={d.id}>
                                        <button
                                            onClick={() => setSelectedDistrictId(d.id)}
                                            className={`w-full text-left p-3 ${selectedDistrictId === d.id ? 'bg-green-100 font-semibold' : 'hover:bg-gray-50'}`}
                                        >
                                            {d.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="md:col-span-2">
                            <h4 className="font-bold mb-2 p-2">Mandals in {allDistricts.find(d => d.id === selectedDistrictId)?.name}</h4>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {mandalsForSelectedDistrict.map(mandal => {
                                    const districtCode = allDistricts.find(d => d.id === mandal.districtId)!.code;
                                    const adminCode = `${districtCode}-${mandal.code}`;
                                    const servicingTenantIds = territoryMap.get(adminCode) || [];
                                    const isServicedByMe = servicingTenantIds.includes(currentUser.tenantId);
                                    
                                    return (
                                        <div key={mandal.id} className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                                            <div>
                                                <p className="font-semibold text-gray-800">{mandal.name}</p>
                                                {servicingTenantIds.length > 0 ? (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Serviced by: {servicingTenantIds.map(id => tenantMap.get(id) || 'Unknown').join(', ')}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-gray-400 mt-1">No dealers currently servicing this area.</p>
                                                )}
                                            </div>
                                            <div>
                                                {isServicedByMe ? (
                                                    <button onClick={() => handleTerritoryChange(districtCode, mandal.code, 'remove')} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 font-semibold">Remove</button>
                                                ) : (
                                                    <button onClick={() => handleTerritoryChange(districtCode, mandal.code, 'add')} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 font-semibold">Add to Service Area</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TerritoryManagementPage;