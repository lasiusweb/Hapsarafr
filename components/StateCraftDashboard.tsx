import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DirectiveModel, TenantModel, UserModel } from '../db';
import { DirectiveStatus, User } from '../types';
import withObservables from '@nozbe/with-observables';

const CreateDirectiveModal = lazy(() => import('./CreateDirectiveModal'));

const StatCard: React.FC<{ title: string; value: string; subValue: string; }> = ({ title, value, subValue }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="mt-1 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-gray-500">{subValue}</p>
        </div>
    </div>
);

const DirectiveStatusBadge: React.FC<{ status: DirectiveStatus }> = ({ status }) => {
    const colors: Record<DirectiveStatus, string> = {
        [DirectiveStatus.Open]: 'bg-blue-100 text-blue-800',
        [DirectiveStatus.Claimed]: 'bg-yellow-100 text-yellow-800',
        [DirectiveStatus.InProgress]: 'bg-purple-100 text-purple-800',
        [DirectiveStatus.Completed]: 'bg-green-100 text-green-800',
        [DirectiveStatus.Cancelled]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
};

const StateCraftDashboard: React.FC<{ onBack: () => void; currentUser: User, allDirectives: DirectiveModel[], allTenants: TenantModel[], allUsers: UserModel[] }> = ({ onBack, currentUser, allDirectives, allTenants, allUsers }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const tenantMap = useMemo(() => new Map(allTenants.map(t => [t.id, t.name])), [allTenants]);

    return (
        <>
            <div className="p-6 bg-gray-50 min-h-full">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">StateCraft Command Dashboard</h1>
                            <p className="text-gray-500">Real-time agricultural program performance for government officials.</p>
                        </div>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            &larr; Back to Main Dashboard
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Hapsara Directives Section */}
                        <div className="bg-white rounded-lg shadow-xl">
                             <div className="p-6 border-b flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-700">Hapsara Directives</h2>
                                <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Create New Directive</button>
                            </div>
                            <div className="p-6">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claimed By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {allDirectives.map(d => (
                                            <tr key={d.id}>
                                                <td className="px-4 py-3 whitespace-nowrap"><DirectiveStatusBadge status={d.status as DirectiveStatus} /></td>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{d.taskType}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{d.claimedByTenantId ? tenantMap.get(d.claimedByTenantId) : 'Unclaimed'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Key Metrics Section */}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-700 mb-4">Key Mission Metrics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <StatCard title="Total Acreage vs. Target" value="1,234" subValue="/ 2,000 Ac" />
                                <StatCard title="Farmers Registered vs. Target" value="850" subValue="/ 1,500" />
                                <StatCard title="Subsidy Disbursed vs. Budget" value="₹1.2 Cr" subValue="/ ₹2.5 Cr" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isCreateModalOpen && (
                <Suspense fallback={<div/>}>
                    <CreateDirectiveModal
                        onClose={() => setIsCreateModalOpen(false)}
                        currentUser={currentUser}
                    />
                </Suspense>
            )}
        </>
    );
};

export default StateCraftDashboard;