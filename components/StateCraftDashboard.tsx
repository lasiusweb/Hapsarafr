import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DirectiveModel, TenantModel, UserModel, TerritoryModel, DirectiveAssignmentModel } from '../db';
import { DirectiveStatus, User, TaskPriority } from '../types';

const CreateDirectiveModal = lazy(() => import('./CreateDirectiveModal'));

const StatCard: React.FC<{ title: string; value: string | number; subValue: string; }> = ({ title, value, subValue }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="mt-1 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-gray-500">{subValue}</p>
        </div>
    </div>
);

const DirectiveStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        Open: 'bg-blue-100 text-blue-800',
        Claimed: 'bg-yellow-100 text-yellow-800',
        InProgress: 'bg-purple-100 text-purple-800',
        Completed: 'bg-green-100 text-green-800',
        Cancelled: 'bg-red-100 text-red-800',
        Pending: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
};

const EvidenceModal: React.FC<{ 
    assignment: DirectiveAssignmentModel | null; 
    tenantName: string;
    onClose: () => void;
}> = ({ assignment, tenantName, onClose }) => {
    if (!assignment) return null;

    let evidence: { notes?: string; photoUrl?: string } | null = null;
    try {
        if (assignment.completionDetailsJson) {
            evidence = JSON.parse(assignment.completionDetailsJson);
        }
    } catch (e) {
        console.error("Failed to parse evidence JSON", e);
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold text-gray-800">Completion Evidence</h3>
                    <p className="text-sm text-gray-500">From: {tenantName}</p>
                </div>
                <div className="p-8 space-y-4">
                    {evidence ? (
                        <>
                            <div>
                                <h4 className="font-semibold text-gray-700">Officer Notes:</h4>
                                <p className="mt-1 text-gray-600 bg-gray-50 p-3 rounded-md border">{evidence.notes || 'No notes provided.'}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-700">Evidence Photo:</h4>
                                {evidence.photoUrl ? (
                                    <img src={evidence.photoUrl} alt="Completion Evidence" className="mt-2 rounded-md border max-h-80 w-auto mx-auto" />
                                ) : (
                                    <p className="mt-1 text-gray-500">No photo provided.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500">No completion evidence available.</p>
                    )}
                </div>
                <div className="bg-gray-100 p-4 flex justify-end rounded-b-lg">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Close</button>
                </div>
            </div>
        </div>
    );
};

interface StateCraftDashboardProps {
    onBack: () => void;
    currentUser: User;
    allDirectives: DirectiveModel[];
    allDirectiveAssignments: DirectiveAssignmentModel[];
    allTenants: TenantModel[];
    allUsers: UserModel[];
    allTerritories: TerritoryModel[];
}

const StateCraftDashboard: React.FC<StateCraftDashboardProps> = ({ onBack, currentUser, allDirectives, allDirectiveAssignments, allTenants, allTerritories, allUsers }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [evidenceModalAssignment, setEvidenceModalAssignment] = useState<DirectiveAssignmentModel | null>(null);

    
    const tenantMap = useMemo(() => new Map(allTenants.map(t => [t.id, t.name])), [allTenants]);

    // Filter for directives created by the current government user
    const myDirectives = useMemo(() => 
        allDirectives.filter(d => d.createdByGovUserId === currentUser.id)
        .sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())
    , [allDirectives, currentUser.id]);

    const assignmentsByDirective = useMemo(() => {
        return allDirectiveAssignments.reduce((acc, assignment) => {
            const directiveId = assignment.directiveId;
            if (!acc[directiveId]) {
                acc[directiveId] = [];
            }
            acc[directiveId].push(assignment);
            return acc;
        }, {} as Record<string, DirectiveAssignmentModel[]>);
    }, [allDirectiveAssignments]);

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
                                <h2 className="text-2xl font-bold text-gray-700">My Directives ({myDirectives.length})</h2>
                                <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Create New Directive</button>
                            </div>
                            <div className="p-6">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area Code</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignments</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {myDirectives.map(d => {
                                            const assignments = assignmentsByDirective[d.id] || [];
                                            return (
                                                <tr key={d.id}>
                                                     <td className="px-4 py-3 whitespace-nowrap">
                                                        <DirectiveStatusBadge status={d.status} />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <p className="font-medium text-gray-800">{d.taskType}</p>
                                                        <p className={`text-xs font-semibold ${d.priority === TaskPriority.High ? 'text-red-600' : 'text-gray-500'}`}>{d.priority}</p>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-mono text-sm text-gray-600">{d.administrativeCode}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                        {assignments.length > 0 ? (
                                                            <div className="flex flex-col gap-2">
                                                                {assignments.map(a => (
                                                                    <div key={a.id} className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <DirectiveStatusBadge status={a.status} />
                                                                            <span>{tenantMap.get(a.tenantId) || 'Unknown Tenant'}</span>
                                                                        </div>
                                                                        {a.status === 'Completed' && (
                                                                            <button 
                                                                                onClick={() => setEvidenceModalAssignment(a)}
                                                                                className="text-xs font-semibold text-blue-600 hover:underline"
                                                                            >
                                                                                View Evidence
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : 'No tenants in area'}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {myDirectives.length === 0 && (
                                            <tr><td colSpan={5} className="text-center py-10 text-gray-500">You have not created any directives yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
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
                        allTerritories={allTerritories}
                    />
                </Suspense>
            )}
            <EvidenceModal 
                assignment={evidenceModalAssignment} 
                tenantName={evidenceModalAssignment ? tenantMap.get(evidenceModalAssignment.tenantId) || 'Unknown' : ''}
                onClose={() => setEvidenceModalAssignment(null)}
            />
        </>
    );
};

export default StateCraftDashboard;