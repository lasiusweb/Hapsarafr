
import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { VisitRequestModel, FarmerModel, UserModel, ActivityLogModel } from '../db';
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
    const isCompleted = request.status === VisitRequestStatus.Completed;

    return (
        <div
            onClick={onClick}
            draggable={!isCompleted}
            onDragStart={(e) => {
                e.dataTransfer.setData('requestId', request.id);
            }}
            className={`bg-white p-4 rounded-lg shadow-sm border ${isCompleted ? 'bg-gray-50 opacity-80' : 'cursor-grab active:cursor-grabbing hover:shadow-md'} transition-shadow mb-4`}
        >
            <div className="flex justify-between items-start">
                 <div className="flex items-center gap-2 flex-1">
                    {isCompleted && (
                        <div className="p-1 bg-green-100 rounded-full flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <h4 className="font-bold text-gray-800">{farmer?.fullName || 'Loading...'}</h4>
                        <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                    </div>
                </div>
                {assignee && <img src={assignee.avatar} alt={assignee.name} className="w-8 h-8 rounded-full flex-shrink-0" title={`Assigned to ${assignee.name}`} />}
            </div>
            <div className="mt-3 text-xs text-gray-500">
                <p>Preferred: {new Date(request.preferredDate).toLocaleDateString()}</p>
                {request.scheduledDate && <p>Scheduled: {new Date(request.scheduledDate).toLocaleDateString()}</p>}
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
        e.currentTarget.classList.remove('bg-green-100');
        const requestId = e.dataTransfer.getData('requestId');
        const request = visitRequests.find(r => r.id === requestId);
        if (request && request.status !== newStatus) {
            await database.write(async () => {
                await (request as any).update(r => {
                    r.status = newStatus;
                    r.syncStatusLocal = 'pending';
                    if (newStatus === VisitRequestStatus.Scheduled && !r.scheduledDate) {
                        r.scheduledDate = new Date().toISOString();
                    }
                });
            });
        }
    }, [database, visitRequests]);

    const handleSaveVisit = async (request: VisitRequestModel, updates: any) => {
        await database.write(async () => {
            await (request as any).update(r => {
                Object.assign(r, updates);
                r.syncStatusLocal = 'pending';
            });
        });
        setSelectedRequest(null);
    };

    const handleCancelVisit = async (request: VisitRequestModel) => {
        await database.write(async () => {
            await (request as any).update(r => {
                r.status = VisitRequestStatus.Cancelled;
                r.syncStatusLocal = 'pending';
            });
        });
        setSelectedRequest(null);
    };

    const handleCompleteVisit = async (request: VisitRequestModel, updates: any) => {
        await database.write(async () => {
            await (request as any).update(r => {
                Object.assign(r, updates);
                r.status = VisitRequestStatus.Completed;
                r.syncStatusLocal = 'pending';
            });
            await database.get<ActivityLogModel>('activity_logs').create(log => {
                log.farmerId = request.farmerId;
                log.activityType = ActivityType.VISIT_COMPLETED;
                log.description = `Visit for "${request.reason}" completed.`;
                log.createdBy = currentUser.id;
                log.tenantId = currentUser.tenantId;
            });
        });
        setSelectedRequest(null);
        // Assuming setNotification is passed down in a real scenario
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {columns.map(column => (
                        <div key={column.title} className="bg-gray-100 rounded-lg">
                            <h3 className="p-4 text-lg font-semibold text-gray-700 border-b">{column.title} ({column.tasks.length})</h3>
                            <div
                                onDrop={(e) => handleDrop(e, column.title as VisitRequestStatus)}
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
                onCompleteVisit={handleCompleteVisit}
                request={selectedRequest}
                farmer={selectedRequest ? farmerMap.get(selectedRequest.farmerId) : undefined}
                users={users}
            />
        </div>
    );
};

export default FieldServicePage;
