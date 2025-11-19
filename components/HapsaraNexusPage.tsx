
import React, { useState, lazy, Suspense } from 'react';
import { User } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { VisitRequestModel, FarmerModel, UserModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { VisitRequestStatus } from '../types';
import VisitDetailsModal from './VisitDetailsModal';


const AppointmentScheduler = lazy(() => import('./AppointmentScheduler'));
const ServicePointManager = lazy(() => import('./ServicePointManager'));

const FieldVisitsView: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const database = useDatabase();
    const [selectedRequest, setSelectedRequest] = useState<VisitRequestModel | null>(null);

    const visitRequests = useQuery(React.useMemo(() => 
        database.get<VisitRequestModel>('visit_requests').query(
            Q.where('tenant_id', currentUser.tenantId),
            Q.sortBy('created_at', 'desc')
        ), [database, currentUser.tenantId]));
    
    const farmers = useQuery(React.useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const users = useQuery(React.useMemo(() => database.get<UserModel>('users').query(), [database]));

    const farmerMap = React.useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);
    
    const StatusBadge: React.FC<{ status: VisitRequestStatus }> = ({ status }) => {
        const colors: Record<VisitRequestStatus, string> = {
            [VisitRequestStatus.Pending]: 'bg-yellow-100 text-yellow-800',
            [VisitRequestStatus.Scheduled]: 'bg-blue-100 text-blue-800',
            [VisitRequestStatus.Completed]: 'bg-green-100 text-green-800',
            [VisitRequestStatus.Cancelled]: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">All Field Visit Requests</h2>
            <div className="bg-white rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preferred Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {visitRequests.map(req => {
                                const farmer = farmerMap.get(req.farmerId);
                                return (
                                <tr key={req.id} onClick={() => setSelectedRequest(req)} className="hover:bg-gray-50 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{farmer?.fullName || '...'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{req.reason}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(req.preferredDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={req.status as VisitRequestStatus} /></td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
             {selectedRequest && (
                <VisitDetailsModal
                    isOpen={!!selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onSave={async (req, updates) => { await database.write(async () => await (req as any).update((r:any) => Object.assign(r, updates))); setSelectedRequest(null); }}
                    onCancelVisit={async (req) => { await database.write(async () => await (req as any).update((r:any) => r.status = 'Cancelled')); setSelectedRequest(null); }}
                    onCompleteVisit={async (req, updates) => { await database.write(async () => await (req as any).update((r:any) => {Object.assign(r, updates); r.status = 'Completed';})); setSelectedRequest(null); }}
                    request={selectedRequest}
                    farmer={farmerMap.get(selectedRequest.farmerId)}
                    users={users}
                />
            )}
        </div>
    );
}

interface HapsaraNexusPageProps {
    onBack: () => void;
    currentUser: User;
}

const HapsaraNexusPage: React.FC<HapsaraNexusPageProps> = ({ onBack, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'collection' | 'visits' | 'admin'>('collection');
    
    // Check if user can manage logistics (simple check for admin group)
    const isAdmin = currentUser.groupId.includes('admin');

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara Nexus</h1>
                        <p className="text-gray-500">Farmer-centric logistics and service coordination.</p>
                    </div>
                     <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </button>
                </div>
                
                 <div className="bg-white rounded-lg shadow-xl p-2">
                    <div className="flex border-b">
                        <button onClick={() => setActiveTab('collection')} className={`px-4 py-3 font-semibold ${activeTab === 'collection' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Collection Center Booking</button>
                        <button onClick={() => setActiveTab('visits')} className={`px-4 py-3 font-semibold ${activeTab === 'visits' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Field Officer Visits</button>
                        {isAdmin && <button onClick={() => setActiveTab('admin')} className={`px-4 py-3 font-semibold ${activeTab === 'admin' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Logistics Admin</button>}
                    </div>

                    <div className="p-6">
                        <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
                            {activeTab === 'collection' && <AppointmentScheduler currentUser={currentUser} />}
                            {activeTab === 'visits' && <FieldVisitsView currentUser={currentUser} />}
                            {activeTab === 'admin' && <ServicePointManager currentUser={currentUser} />}
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HapsaraNexusPage;
