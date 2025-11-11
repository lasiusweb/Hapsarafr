import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, AssistanceApplicationModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { AssistanceScheme, AssistanceApplicationStatus, User, ActivityType } from '../types';
import { ASSISTANCE_SCHEMES } from '../data/assistanceSchemes';
import CustomSelect from './CustomSelect';

interface AssistanceSchemesPageProps {
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const AssistanceStatusBadge: React.FC<{ status: AssistanceApplicationStatus }> = ({ status }) => {
    const colors: Record<AssistanceApplicationStatus, string> = {
        [AssistanceApplicationStatus.NotApplied]: 'bg-gray-100 text-gray-600',
        [AssistanceApplicationStatus.Applied]: 'bg-blue-100 text-blue-800',
        [AssistanceApplicationStatus.Approved]: 'bg-green-100 text-green-800',
        [AssistanceApplicationStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
};

const AssistanceSchemesPage: React.FC<AssistanceSchemesPageProps> = ({ onBack, currentUser, setNotification }) => {
    const database = useDatabase();

    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const allApplications = useQuery(useMemo(() => database.get<AssistanceApplicationModel>('assistance_applications').query(), [database]));

    const [filters, setFilters] = useState({ farmerName: '', schemeId: '', status: '' });

    const farmerMap = useMemo(() => new Map(allFarmers.map(f => [f.id, f])), [allFarmers]);
    const schemeMap = useMemo(() => new Map(ASSISTANCE_SCHEMES.map(s => [s.id, s])), []);

    const applicationsByFarmerAndScheme = useMemo(() => {
        const map = new Map<string, Map<string, AssistanceApplicationModel>>();
        allApplications.forEach(app => {
            if (!map.has(app.farmerId)) {
                map.set(app.farmerId, new Map());
            }
            map.get(app.farmerId)!.set(app.schemeId, app);
        });
        return map;
    }, [allApplications]);
    
    const filteredFarmers = useMemo(() => {
        return allFarmers.filter(farmer => {
            if (filters.farmerName && !farmer.fullName.toLowerCase().includes(filters.farmerName.toLowerCase())) {
                return false;
            }
            if (filters.schemeId || filters.status) {
                const farmerApps = applicationsByFarmerAndScheme.get(farmer.id);
                const status = farmerApps?.get(filters.schemeId)?.status || AssistanceApplicationStatus.NotApplied;

                if (filters.schemeId && filters.status) {
                    return status === filters.status;
                }
                if (filters.schemeId) {
                    // if only scheme is filtered, show all farmers but we'll highlight status
                    return true; 
                }
                if (filters.status) {
                    // If only status is filtered, check if any scheme has this status for the farmer
                    return Array.from(schemeMap.keys()).some(schemeId => {
                        const s = farmerApps?.get(schemeId)?.status || AssistanceApplicationStatus.NotApplied;
                        return s === filters.status;
                    });
                }
            }
            return true;
        });
    }, [allFarmers, filters, applicationsByFarmerAndScheme, schemeMap]);

    const handleStatusChange = useCallback(async (farmerId: string, schemeId: string, newStatus: AssistanceApplicationStatus) => {
        const farmerApps = applicationsByFarmerAndScheme.get(farmerId);
        const existingApp = farmerApps?.get(schemeId);
        const schemeTitle = schemeMap.get(schemeId)?.title || "Unknown Scheme";
        
        try {
            await database.write(async () => {
                if (existingApp) {
                    await existingApp.update(app => { app.status = newStatus; });
                } else {
                    await database.get<AssistanceApplicationModel>('assistance_applications').create(app => {
                        app.farmerId = farmerId;
                        app.schemeId = schemeId;
                        app.status = newStatus;
                        app.syncStatusLocal = 'pending';
                        app.tenantId = currentUser.tenantId;
                    });
                }
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    // FIX: Property 'farmerId' does not exist on type 'ActivityLogModel'. This is fixed by adding the field to the model in db/index.ts.
                    log.farmerId = farmerId;
                    log.activityType = ActivityType.ASSISTANCE_STATUS_CHANGE;
                    log.description = `Status for "${schemeTitle}" changed to ${newStatus}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            setNotification({ message: 'Status updated successfully.', type: 'success' });
        } catch (e) {
            console.error("Failed to update status", e);
            setNotification({ message: 'Failed to update status.', type: 'error' });
        }
    }, [database, applicationsByFarmerAndScheme, currentUser, schemeMap, setNotification]);


    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Assistance Scheme Applications</h1>
                        <p className="text-gray-500">Track and manage farmer applications for government schemes.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" placeholder="Search Farmer Name..." value={filters.farmerName} onChange={e => setFilters(f => ({...f, farmerName: e.target.value}))} className="md:col-span-2 w-full p-2 border border-gray-300 rounded-md" />
                        <CustomSelect value={filters.schemeId} onChange={v => setFilters(f => ({...f, schemeId: v}))} options={[{value: '', label: 'All Schemes'}, ...ASSISTANCE_SCHEMES.map(s => ({value: s.id, label: s.title}))]} />
                        <CustomSelect value={filters.status} onChange={v => setFilters(f => ({...f, status: v}))} options={[{value: '', label: 'All Statuses'}, ...Object.values(AssistanceApplicationStatus).map(s => ({value: s, label: s}))]} />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                                    {ASSISTANCE_SCHEMES.filter(s => !filters.schemeId || s.id === filters.schemeId).map(scheme => (
                                        <th key={scheme.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{scheme.title}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredFarmers.map(farmer => (
                                    <tr key={farmer.id}>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-gray-900">{farmer.fullName}</div><div className="text-xs font-mono text-gray-500">{farmer.farmerId}</div></td>
                                        {ASSISTANCE_SCHEMES.filter(s => !filters.schemeId || s.id === filters.schemeId).map(scheme => {
                                            const status = applicationsByFarmerAndScheme.get(farmer.id)?.get(scheme.id)?.status || AssistanceApplicationStatus.NotApplied;
                                            return (
                                                <td key={scheme.id} className="px-6 py-4 whitespace-nowrap">
                                                    <CustomSelect value={status} onChange={v => handleStatusChange(farmer.id, scheme.id, v as AssistanceApplicationStatus)} options={Object.values(AssistanceApplicationStatus).map(s => ({value: s, label: s}))} />
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredFarmers.length === 0 && <div className="text-center py-10 text-gray-500">No farmers match the current filters.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssistanceSchemesPage;