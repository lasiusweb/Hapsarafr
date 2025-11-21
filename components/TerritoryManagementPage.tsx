
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DistrictModel, MandalModel, TerritoryModel, TenantModel, FarmerModel, FarmerDealerConsentModel, TerritoryDisputeModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, TerritoryDisputeStatus } from '../types';
import DisputeModal from './DisputeModal';
import CustomSelect from './CustomSelect';
import { formatCurrency } from '../lib/utils';

interface TerritoryManagementPageProps {
    onBack: () => void;
    currentUser: User;
}

const StatBox: React.FC<{ label: string; value: string | number; color?: string; icon?: React.ReactNode }> = ({ label, value, color = 'text-gray-800', icon }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        {icon && <div className="opacity-20 text-gray-500">{icon}</div>}
    </div>
);

const TerritoryManagementPage: React.FC<TerritoryManagementPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    
    // Data queries
    const allDistricts = useQuery(useMemo(() => database.get<DistrictModel>('districts').query(Q.sortBy('name')), [database]));
    const allMandals = useQuery(useMemo(() => database.get<MandalModel>('mandals').query(), [database]));
    const allTenants = useQuery(useMemo(() => database.get<TenantModel>('tenants').query(), [database]));
    const allTerritories = useQuery(useMemo(() => database.get<TerritoryModel>('territories').query(), [database]));
    const allDisputes = useQuery(useMemo(() => database.get<TerritoryDisputeModel>('territory_disputes').query(Q.where('status', TerritoryDisputeStatus.Open)), [database]));
    
    // Aegis Intelligence Data
    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const allConsents = useQuery(useMemo(() => database.get<FarmerDealerConsentModel>('farmer_dealer_consents').query(
        Q.where('tenant_id', currentUser.tenantId),
        Q.where('is_active', true)
    ), [database, currentUser.tenantId]));

    const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
    const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
    const [serviceType, setServiceType] = useState('INPUT_SALES');

    useEffect(() => {
        if (!selectedDistrictId && allDistricts.length > 0) {
            setSelectedDistrictId(allDistricts[0].id);
        }
    }, [allDistricts, selectedDistrictId]);
    
    const tenantMap = useMemo(() => new Map(allTenants.map(t => [t.id, t.name])), [allTenants]);

    const territoryMap = useMemo(() => {
        const map = new Map<string, { tenantId: string, service: string }[]>(); 
        allTerritories.forEach(t => {
            const existing = map.get(t.administrativeCode) || [];
            existing.push({ tenantId: t.tenantId, service: t.serviceType || 'General' });
            map.set(t.administrativeCode, existing);
        });
        return map;
    }, [allTerritories]);
    
    const disputeMap = useMemo(() => {
        const map = new Set<string>();
        allDisputes.forEach(d => map.add(d.administrativeCode));
        return map;
    }, [allDisputes]);

    // Aegis: Calculate Density & Penetration
    const metricsMap = useMemo(() => {
        const map = new Map<string, { farmerCount: number, consentedCount: number }>();
        
        allFarmers.forEach(f => {
            const adminCode = `${f.district}-${f.mandal}`;
            const current = map.get(adminCode) || { farmerCount: 0, consentedCount: 0 };
            current.farmerCount++;
            
            if (allConsents.some(c => c.farmerId === f.id)) {
                current.consentedCount++;
            }
            
            map.set(adminCode, current);
        });
        return map;
    }, [allFarmers, allConsents]);

    const mandalsForSelectedDistrict = useMemo(() => {
        if (!selectedDistrictId) return [];
        return allMandals.filter(m => m.districtId === selectedDistrictId).sort((a, b) => a.name.localeCompare(b.name));
    }, [allMandals, selectedDistrictId]);
    
    // Command Stats
    const stats = useMemo(() => {
        let coverageCount = 0;
        let totalMarketReach = 0;
        
        allTerritories.filter(t => t.tenantId === currentUser.tenantId && t.serviceType === serviceType).forEach(t => {
            coverageCount++;
            const metrics = metricsMap.get(t.administrativeCode);
            if (metrics) totalMarketReach += metrics.farmerCount;
        });

        const myDisputes = allDisputes.filter(d => d.requestingTenantId === currentUser.tenantId || d.contestedTenantId === currentUser.tenantId).length;

        return { coverageCount, totalMarketReach, myDisputes };
    }, [allTerritories, currentUser.tenantId, serviceType, metricsMap, allDisputes]);

    const handleTerritoryChange = useCallback(async (districtCode: string, mandalCode: string, action: 'add' | 'remove') => {
        const adminCode = `${districtCode}-${mandalCode}`;
        
        await database.write(async () => {
            if (action === 'add') {
                const existing = await database.get<TerritoryModel>('territories').query(
                    Q.where('administrative_code', adminCode),
                    Q.where('tenant_id', currentUser.tenantId),
                    Q.where('service_type', serviceType)
                ).fetchCount();

                if (existing === 0) {
                    await database.get<TerritoryModel>('territories').create(t => {
                        t.tenantId = currentUser.tenantId;
                        t.administrativeLevel = 'MANDAL';
                        t.administrativeCode = adminCode;
                        t.serviceType = serviceType;
                    });
                }
            } else if (action === 'remove') {
                const myTerritoriesInMandal = await database.get<TerritoryModel>('territories').query(
                    Q.where('administrative_code', adminCode),
                    Q.where('tenant_id', currentUser.tenantId),
                    Q.where('service_type', serviceType)
                ).fetch();
                
                const deletions = myTerritoriesInMandal.map(territory => territory.prepareDestroyPermanently());
                await database.batch(...deletions);
            }
        });
    }, [database, currentUser.tenantId, serviceType]);

    const getDensityTag = (count: number) => {
        if (count > 50) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">High Density</span>;
        if (count > 10) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">Medium Density</span>;
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">Low Density</span>;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Service Area Command</h1>
                        <p className="text-gray-500">Hapsara Aegis: Define Operational Zones & Monitor Penetration.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsDisputeModalOpen(true)} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-semibold text-sm shadow-sm">Raise Dispute</button>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            Back to Admin
                        </button>
                    </div>
                </div>

                {/* Command Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <StatBox 
                        label="Operational Coverage" 
                        value={`${stats.coverageCount} Mandals`} 
                        color="text-indigo-600" 
                        icon={<svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM15.116 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708z" /></svg>}
                    />
                    <StatBox 
                        label="Total Farmer Reach" 
                        value={stats.totalMarketReach.toLocaleString()} 
                        color="text-green-600"
                        icon={<svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    />
                     <StatBox 
                        label="Active Disputes" 
                        value={stats.myDisputes} 
                        color={stats.myDisputes > 0 ? "text-red-600" : "text-gray-600"}
                        icon={<svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                    />
                </div>

                <div className="bg-white rounded-lg shadow-xl p-6">
                    {/* Service Config Header */}
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-gray-800">Strategic Service Layer</h3>
                            <p className="text-sm text-gray-500">Define which service you are deploying territory claims for.</p>
                        </div>
                        <div className="w-72">
                             <CustomSelect 
                                value={serviceType} 
                                onChange={setServiceType} 
                                options={[
                                    {value: 'INPUT_SALES', label: 'Input Sales & Distribution'},
                                    {value: 'PROCUREMENT', label: 'Procurement (Harvest Buyback)'},
                                    {value: 'ADVISORY', label: 'Agronomic Advisory'},
                                    {value: 'FINANCE', label: 'Credit & Financial Services'}
                                ]} 
                                label=""
                            />
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Col: Districts */}
                        <div className="md:col-span-1 border-r border-gray-100 pr-4">
                            <h4 className="font-bold mb-3 text-gray-700 text-sm uppercase tracking-wide">Districts</h4>
                            <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
                                {allDistricts.map(d => (
                                    <li key={d.id}>
                                        <button
                                            onClick={() => setSelectedDistrictId(d.id)}
                                            className={`w-full text-left p-3 rounded-md transition-all flex justify-between items-center ${selectedDistrictId === d.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
                                        >
                                            <span className="font-medium">{d.name}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${selectedDistrictId === d.id ? 'text-indigo-200' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Right Col: Mandals */}
                        <div className="md:col-span-2">
                            <h4 className="font-bold mb-3 text-gray-700 text-sm uppercase tracking-wide flex justify-between items-center">
                                <span>Mandals in {allDistricts.find(d => d.id === selectedDistrictId)?.name}</span>
                                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded border text-gray-500">Market Intel Active</span>
                            </h4>
                            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
                                {mandalsForSelectedDistrict.map(mandal => {
                                    const districtCode = allDistricts.find(d => d.id === mandal.districtId)!.code;
                                    const adminCode = `${districtCode}-${mandal.code}`;
                                    const territoryData = territoryMap.get(adminCode) || [];
                                    
                                    // Market Intel
                                    const metrics = metricsMap.get(adminCode) || { farmerCount: 0, consentedCount: 0 };
                                    const penetration = metrics.farmerCount > 0 ? Math.round((metrics.consentedCount / metrics.farmerCount) * 100) : 0;
                                    
                                    const isServicedByMe = territoryData.some(t => t.tenantId === currentUser.tenantId && t.service === serviceType);
                                    const competitors = territoryData.filter(t => t.tenantId !== currentUser.tenantId && t.service === serviceType);
                                    const hasDispute = disputeMap.has(adminCode);

                                    return (
                                        <div key={mandal.id} className={`p-4 border rounded-lg flex flex-col bg-white shadow-sm transition-all group ${isServicedByMe ? 'border-green-500 ring-1 ring-green-50' : 'hover:border-gray-400'}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-bold text-gray-800 text-lg">{mandal.name}</p>
                                                        {hasDispute && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-red-200"><svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>DISPUTED</span>}
                                                        {getDensityTag(metrics.farmerCount)}
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 mt-2">
                                                        <div>
                                                            <p className="uppercase text-[10px] text-gray-400 font-bold">Market Size</p>
                                                            <p className="font-semibold text-gray-800">{metrics.farmerCount} Farmers</p>
                                                        </div>
                                                        <div>
                                                             <p className="uppercase text-[10px] text-gray-400 font-bold">Competition</p>
                                                             <p className={`font-semibold ${competitors.length > 2 ? 'text-red-600' : 'text-gray-800'}`}>{competitors.length} Others</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                    {isServicedByMe ? (
                                                        <button onClick={() => handleTerritoryChange(districtCode, mandal.code, 'remove')} className="px-4 py-2 bg-white border border-red-200 text-red-600 text-xs rounded-md hover:bg-red-50 font-bold shadow-sm transition-colors">
                                                            Withdraw
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleTerritoryChange(districtCode, mandal.code, 'add')} className="px-4 py-2 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 font-bold shadow-md transition-transform transform hover:scale-105">
                                                            Claim Area
                                                        </button>
                                                    )}
                                                    <div className="text-[10px] text-gray-400">
                                                        Penetration: <strong className={`${penetration > 50 ? 'text-green-600' : penetration > 20 ? 'text-yellow-600' : 'text-red-600'}`}>{penetration}%</strong>
                                                    </div>
                                                </div>
                                            </div>

                                            {territoryData.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                                                    {territoryData.map((t, idx) => (
                                                        <span key={idx} className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 ${t.tenantId === currentUser.tenantId ? 'bg-green-50 text-green-700 border-green-200 font-bold' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                            {t.tenantId === currentUser.tenantId ? '★ You' : tenantMap.get(t.tenantId) || 'Unknown'}: {t.service.replace('_', ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
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
