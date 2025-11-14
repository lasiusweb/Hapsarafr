

import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { VisitRequestModel, FarmerModel, UserModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, VisitRequestStatus, ActivityType } from '../types';
import VisitDetailsModal from './VisitDetailsModal';

interface FieldServicePageProps {
    onBack: () => void;
    currentUser: User;
}

const VisitCard: React.FC<{
    request: VisitRequestModel;
    farmer?: FarmerModel;
    assignee?: UserModel;
    onClick: () => void;
}> = ({ request, farmer, assignee, onClick }) => {
    return (
        <div
            onClick={onClick}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('requestId', request.id);
            }}
            className="bg-white p-4 rounded-lg shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow mb-4"
        >
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-gray-800">{farmer?.fullName || 'Loading...'}</h4>
                    <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                </div>
                {assignee && <img src={assignee.avatar} alt={assignee.name} className="w-8 h-8 rounded-full flex-shrink-0" title={`Assigned to ${assignee.name}`} />}
            </div>
            <div className="mt-3 text-xs text-gray-500">
                <p>Preferred: {new Date(request.preferredDate).toLocaleDateString()}</p>
            </div>
        </div>
    );
};

const FieldServicePage: React.FC<FieldServicePageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    
    const visitRequests = useQuery(useMemo(() => database.get<VisitRequestModel>('visit_requests').query(Q.sortBy('created_at', Q.desc)), [database]));
    const users = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));

    const [selectedRequest, setSelectedRequest] = useState<VisitRequestModel | null>(null);
    
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, newStatus: VisitRequestStatus) => {
        e.preventDefault();
        const requestId = e.dataTransfer.getData('requestId');
        const request = visitRequests.find(r => r.id === requestId);
        if (request && request.status !== newStatus) {
            await database.write(async () => {
                // FIX: Cast `request` to `any` to call the `update` method, resolving a TypeScript error where the inherited method was not recognized.
                await (request as any).update(r => {
                    r.status = newStatus;
                    r.syncStatusLocal = 'pending';
                    if (newStatus === VisitRequestStatus.Scheduled && !r.scheduledDate) {
                        r.scheduledDate = new Date().toISOString();
                    }
                });
            });
        }
        e.currentTarget.classList.remove('bg-green-100');
    }, [database, visitRequests]);

    const handleSaveVisit = async (request: VisitRequestModel, updates: any) => {
        await database.write(async () => {
            // FIX: Cast `request` to `any` to call the `update` method, resolving a TypeScript error where the inherited method was not recognized.
            await (request as any).update(r => {
                Object.assign(r, updates);
                r.syncStatusLocal = 'pending';
            });
        });
        setSelectedRequest(null);
    };

    const handleCancelVisit = async (request: VisitRequestModel) => {
        await database.write(async () => {
            // FIX: Cast `request` to `any` to call the `update` method, resolving a TypeScript error where the inherited method was not recognized.
            await (request as any).update(r => {
                r.status = VisitRequestStatus.Cancelled;
                r.syncStatusLocal = 'pending';
            });
        });
        setSelectedRequest(null);
    };

    const requestsByStatus = useMemo(() => {
        const grouped: Record<string, VisitRequestModel[]> = {
            [VisitRequestStatus.Pending]: [],
            [VisitRequestStatus.Scheduled]: [],
            [VisitRequestStatus.Completed]: [],
        };
        visitRequests.forEach(request => {
            if (grouped[request.status]) {
                grouped[request.status].push(request);
            }
        });
        return grouped;
    }, [visitRequests]);

    const columns = [
        { title: VisitRequestStatus.Pending, tasks: requestsByStatus[VisitRequestStatus.Pending] },
        { title: VisitRequestStatus.Scheduled, tasks: requestsByStatus[VisitRequestStatus.Scheduled] },
        { title: VisitRequestStatus.Completed, tasks: requestsByStatus[VisitRequestStatus.Completed] },
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Field Service Hub</h1>
                        <p className="text-gray-500">Manage all farmer visit requests.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {columns.map(column => (
                        <div key={column.title} className="bg-gray-100 rounded-lg">
                            <h3 className="p-4 text-lg font-semibold text-gray-700 border-b">{column.title} ({column.tasks.length})</h3>
                            <div
                                onDrop={(e) => handleDrop(e, column.title)}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-green-100'); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove('bg-green-100'); }}
                                className="p-4 space-y-4 min-h-[60vh] transition-colors rounded-b-lg"
                            >
                                {column.tasks.map(request => (
                                    <VisitCard
                                        key={request.id}
                                        request={request}
                                        farmer={farmerMap.get(request.farmerId)}
                                        assignee={request.assigneeId ? userMap.get(request.assigneeId) : undefined}
                                        onClick={() => setSelectedRequest(request)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <VisitDetailsModal
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                onSave={handleSaveVisit}
                onCancelVisit={handleCancelVisit}
                request={selectedRequest}
                farmer={selectedRequest ? farmerMap.get(selectedRequest.farmerId) : undefined}
                users={users}
            />
        </div>
    );
};

export default FieldServicePage;