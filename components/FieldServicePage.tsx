

import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { VisitRequestModel, FarmerModel, UserModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, VisitRequestStatus, ActivityType } from '../types';
import VisitDetailsModal from './VisitDetailsModal';
import CustomSelect from './CustomSelect';

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
    
    const visitRequests = useQuery(useMemo(() => database.get<VisitRequestModel>('visit_requests').query(Q.sortBy('priority_score', Q.desc), Q.sortBy('created_at', Q.desc)), [database]));
    const users = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));

    const [selectedRequest, setSelectedRequest] = useState<VisitRequestModel | null>(null);
    const [filters, setFilters] = useState({
        assigneeId: '',
        farmerId: '',
        dateFrom: '',
        dateTo: '',
    });
    
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    const filteredRequests = useMemo(() => {
        return visitRequests.filter(req => {
            if (filters.assigneeId && req.assigneeId !== filters.assigneeId) return false;
            if (filters.farmerId && req.farmerId !== filters.farmerId) return false;
            if (filters.dateFrom) {
                const reqDate = new Date(req.preferredDate);
                const filterDate = new Date(filters.dateFrom);
                reqDate.setHours(0,0,0,0);
                filterDate.setHours(0,0,0,0);
                if (reqDate < filterDate) return false;
            }
            if (filters.dateTo) {
                const reqDate = new Date(req.preferredDate);
                const filterDate = new Date(filters.dateTo);
                reqDate.setHours(0,0,0,0);
                filterDate.setHours(0,0,0,0);
                if (reqDate > filterDate) return false;
            }
            return true;
        });
    }, [visitRequests, filters]);

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
        filteredRequests.forEach(request => {
            if (grouped[request.status]) {
                grouped[request.status].push(request);
            }
        });
        return grouped;
    }, [filteredRequests]);

    const columns = [
        { title: VisitRequestStatus.Pending, tasks: requestsByStatus[VisitRequestStatus.Pending] },
        { title: VisitRequestStatus.Scheduled, tasks: requestsByStatus[VisitRequestStatus.Scheduled] },
        { title: VisitRequestStatus.Completed, tasks: requestsByStatus[VisitRequestStatus.Completed] },
    ];

    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ assigneeId: '', farmerId: '', dateFrom: '', dateTo: '' });
    };

    const userOptions = useMemo(() => users.map(u => ({ value: u.id, label: u.name })), [users]);
    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);

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

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <CustomSelect
                            label="Filter by Assignee"
                            options={[{ value: '', label: 'All Officers' }, ...userOptions]}
                            value={filters.assigneeId}
                            onChange={v => handleFilterChange('assigneeId', v)}
                        />
                        <CustomSelect
                            label="Filter by Farmer"
                            options={[{ value: '', label: 'All Farmers' }, ...farmerOptions]}
                            value={filters.farmerId}
                            onChange={v => handleFilterChange('farmerId', v)}
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date From</label>
                            <input
                                type="date"
                                name="dateFrom"
                                value={filters.dateFrom}
                                onChange={e => handleFilterChange('dateFrom', e.target.value)}
                                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date To</label>
                            <input
                                type="date"
                                name="dateTo"
                                value={filters.dateTo}
                                onChange={e => handleFilterChange('dateTo', e.target.value)}
                                min={filters.dateFrom}
                                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={clearFilters} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold text-sm">Clear Filters</button>
                    </div>
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