import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DistrictModel, MandalModel, FarmerModel, TerritoryTransferRequestModel, TenantModel, TerritoryDisputeModel, TerritoryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, TerritoryTransferStatus, TerritoryDisputeStatus } from '../types';
import DisputeModal from './DisputeModal';

interface TerritoryManagementPageProps {
    onBack: () => void;
    currentUser: User;
}

const TerritoryManagementPage: React.FC<TerritoryManagementPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [activeTab, setActiveTab] = useState<'map' | 'requests' | 'disputes' | 'my-territories'>('map');
    const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
    
    // Data queries
    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const allDistricts = useQuery(useMemo(() => database.get<DistrictModel>('districts').query(Q.sortBy('name')), [database]));
    const allMandals = useQuery(useMemo(() => database.get<MandalModel>('mandals').query(), [database]));
    const allTenants = useQuery(useMemo(() => database.get<TenantModel>('tenants').query(), [database]));
    const allRequests = useQuery(useMemo(() => database.get<TerritoryTransferRequestModel>('territory_transfer_requests').query(Q.sortBy('created_at', Q.desc)), [database]));
    const allDisputes = useQuery(useMemo(() => database.get<TerritoryDisputeModel>('territory_disputes').query(Q.sortBy('created_at', Q.desc)), [database]));
    const allTerritories = useQuery(useMemo(() => database.get<TerritoryModel>('territories').query(), [database]));

    const tenantMap = useMemo(() => new Map(allTenants.map(t => [t.id, t.name])), [allTenants]);

    // Opportunity Map Data
    const farmerDensityByMandal = useMemo(() => {
        const density = new Map<string, number>();
        allFarmers.forEach(farmer => {
            const mandalCode = `${farmer.district}-${farmer.mandal}`;
            density.set(mandalCode, (density.get(mandalCode) || 0) + 1);
        });
        const maxDensity = Math.max(...density.values(), 1);
        return { density, maxDensity };
    }, [allFarmers]);
    
    // Transfer Requests Data
    const requests = useMemo(() => allRequests.map(req => {
        const farmer = allFarmers.find(f => f.id === req.farmerId);
        return {
            id: req.id,
            farmerId: req.farmerId,
            fromTenantId: req.fromTenantId,
            toTenantId: req.toTenantId,
            status: req.status,
            createdAt: req.createdAt,
            farmerName: farmer?.fullName || 'Unknown Farmer',
            fromTenantName: tenantMap.get(req.fromTenantId) || 'Unknown Tenant',
            toTenantName: tenantMap.get(req.toTenantId) || 'Unknown Tenant',
        };
    }), [allRequests, allFarmers, tenantMap]);

    const handleUpdateRequestStatus = useCallback(async (request: any, newStatus: TerritoryTransferStatus) => {
        if (!window.confirm(`Are you sure you want to ${newStatus.toLowerCase()} this transfer request?`)) return;

        await database.write(async () => {
            const reqToUpdate = await database.get<TerritoryTransferRequestModel>('territory_transfer_requests').find(request.id);
            await reqToUpdate.update(r => {
                r.status = newStatus;
                r.syncStatusLocal = 'pending';
            });

            if (newStatus === TerritoryTransferStatus.Approved) {
                const farmerToUpdate = await database.get<FarmerModel>('farmers').find(request.farmerId);
                await farmerToUpdate.update(f => {
                    f.tenantId = request.toTenantId;
                    f.syncStatusLocal = 'pending';
                });
            }
        });
    }, [database]);

    const handleResolveDispute = useCallback(async (disputeId: string) => {
        if (!window.confirm(`Are you sure you want to mark this dispute as resolved?`)) return;

        await database.write(async () => {
            const disputeToUpdate = await database.get<TerritoryDisputeModel>('territory_disputes').find(disputeId);
            await disputeToUpdate.update(d => {
                d.status = TerritoryDisputeStatus.Resolved;
                d.syncStatusLocal = 'pending';
            });
        });
    }, [database]);
    
    // --- "My Territories" Tab State & Logic ---
    const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedDistrictId && allDistricts.length > 0) {
            setSelectedDistrictId(allDistricts[0].id);
        }
    }, [allDistricts, selectedDistrictId]);
    
    const territoryMap = useMemo(() => {
        const map = new Map<string, string>(); // adminCode -> tenantId
        allTerritories.forEach(t => {
            map.set(t.administrativeCode, t.tenantId);
        });
        return map;
    }, [allTerritories]);

    const mandalsForSelectedDistrict = useMemo(() => {
        if (!selectedDistrictId) return [];
        return allMandals.filter(m => m.districtId === selectedDistrictId).sort((a, b) => a.name.localeCompare(b.name));
    }, [allMandals, selectedDistrictId]);
    
    const handleTerritoryChange = useCallback(async (districtCode: string, mandalCode: string, action: 'claim' | 'release') => {
        const adminCode = `${districtCode}-${mandalCode}`;
        
        await database.write(async () => {
            if (action === 'claim') {
                await database.get<TerritoryModel>('territories').create(t => {
                    t.tenantId = currentUser.tenantId;
                    t.administrativeLevel = 'MANDAL';
                    t.administrativeCode = adminCode;
                });
            } else if (action === 'release') {
                const existingTerritories = await database.get<TerritoryModel>('territories').query(Q.where('administrative_code', adminCode)).fetch();
                if (existingTerritories.length > 0) {
                    await existingTerritories[0].destroyPermanently();
                }
            }
        });
    }, [database, currentUser.tenantId]);


    const TabButton: React.FC<{ tabId: 'map' | 'requests' | 'disputes' | 'my-territories'; label: string }> = ({ tabId, label }) => (
        <button onClick={() => setActiveTab(tabId)} className={`px-4 py-3 font-semibold ${activeTab === tabId ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>{label}</button>
    );

    const MyTerritoriesView = () => (
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
                        const claimingTenantId = territoryMap.get(adminCode);
                        const isClaimedByMe = claimingTenantId === currentUser.tenantId;
                        const isClaimedByOther = claimingTenantId && !isClaimedByMe;
                        const claimingTenantName = isClaimedByOther ? tenantMap.get(claimingTenantId) : null;

                        return (
                            <div key={mandal.id} className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                                <div>
                                    <p className="font-semibold text-gray-800">{mandal.name}</p>
                                    {isClaimedByMe && <p className="text-xs font-bold text-green-600">Claimed by You</p>}
                                    {isClaimedByOther && <p className="text-xs font-semibold text-yellow-600">Claimed by {claimingTenantName}</p>}
                                </div>
                                <div>
                                    {isClaimedByMe ? (
                                        <button onClick={() => handleTerritoryChange(districtCode, mandal.code, 'release')} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 font-semibold">Release</button>
                                    ) : isClaimedByOther ? (
                                        <button disabled className="px-3 py-1.5 bg-gray-300 text-gray-500 text-sm rounded-md cursor-not-allowed">Claimed</button>
                                    ) : (
                                        <button onClick={() => handleTerritoryChange(districtCode, mandal.code, 'claim')} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 font-semibold">Claim</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Territory Expansion</h1>
                        <p className="text-gray-500">Analyze farmer density and manage territory transfers.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Back to Admin
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-xl p-2">
                    <div className="flex border-b">
                        <TabButton tabId="map" label="Opportunity Map" />
                        <TabButton tabId="my-territories" label="My Territories" />
                        <TabButton tabId="requests" label="Transfer Requests" />
                        <TabButton tabId="disputes" label="Territorial Disputes" />
                    </div>
                    <div className="p-6">
                        {activeTab === 'map' && (
                            <div>
                                {allDistricts.map(district => (
                                    <div key={district.id} className="mb-8">
                                        <h3 className="text-xl font-bold text-gray-800 mb-4">{district.name}</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {allMandals.filter(m => m.districtId === district.id).map(mandal => {
                                                const mandalCode = `${district.code}-${mandal.code}`;
                                                const count = farmerDensityByMandal.density.get(mandalCode) || 0;
                                                const opacity = Math.max(0.1, count / farmerDensityByMandal.maxDensity);
                                                return (
                                                    <div key={mandal.id} className="p-3 border rounded-lg text-center" style={{ backgroundColor: `rgba(34, 197, 94, ${opacity})` }}>
                                                        <p className="font-bold text-gray-800">{mandal.name}</p>
                                                        <p className="text-2xl font-extrabold text-gray-900">{count}</p>
                                                        <p className="text-xs text-gray-700">Farmers</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                <p className="text-xs text-gray-500 mt-4">* This view simulates a choropleth map by coloring mandals based on farmer density. A real implementation would use a mapping library like Leaflet with GeoJSON boundaries.</p>
                            </div>
                        )}
                        
                        {activeTab === 'my-territories' && <MyTerritoriesView />}

                        {activeTab === 'requests' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Farmer</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">From Tenant</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">To Tenant</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {requests.map(req => (
                                            <tr key={req.id}>
                                                <td className="px-4 py-3 font-medium">{req.farmerName}</td>
                                                <td className="px-4 py-3 text-sm">{req.fromTenantName}</td>
                                                <td className="px-4 py-3 text-sm">{req.toTenantName}</td>
                                                <td className="px-4 py-3 text-sm">{new Date(req.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-sm font-semibold">{req.status}</td>
                                                <td className="px-4 py-3 text-sm space-x-2">
                                                    {req.status === TerritoryTransferStatus.Pending && (
                                                        <>
                                                            <button onClick={() => handleUpdateRequestStatus(req, TerritoryTransferStatus.Approved)} className="font-semibold text-green-600 hover:underline">Approve</button>
                                                            <button onClick={() => handleUpdateRequestStatus(req, TerritoryTransferStatus.Rejected)} className="font-semibold text-red-600 hover:underline">Reject</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {activeTab === 'disputes' && (
                             <div>
                                <div className="flex justify-end mb-4">
                                    <button onClick={() => setIsDisputeModalOpen(true)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold text-sm">+ Raise New Dispute</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Requesting Tenant</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Contested Tenant</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Area</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {allDisputes.map(d => (
                                                <tr key={d.id}>
                                                    <td className="px-4 py-3 font-medium">{tenantMap.get(d.requestingTenantId) || d.requestingTenantId}</td>
                                                    <td className="px-4 py-3 text-sm">{tenantMap.get(d.contestedTenantId) || d.contestedTenantId}</td>
                                                    <td className="px-4 py-3 text-sm font-mono">{d.administrativeCode}</td>
                                                    <td className="px-4 py-3 text-sm max-w-xs truncate">{d.reason}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold">{d.status}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {d.status === TerritoryDisputeStatus.Open && (
                                                            <button onClick={() => handleResolveDispute(d.id)} className="font-semibold text-green-600 hover:underline">Resolve</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isDisputeModalOpen && (
                <DisputeModal 
                    onClose={() => setIsDisputeModalOpen(false)} 
                    onSave={() => setIsDisputeModalOpen(false)} 
                    currentUser={currentUser} 
                />
            )}
        </div>
    );
};

export default TerritoryManagementPage;