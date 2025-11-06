import React, { useMemo, useState, useEffect } from 'react';
import { User, AuditLogEntry } from '../types';

interface UsageAnalyticsPageProps {
    currentUser: User;
    onBack: () => void;
    supabase: any;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-6">
        <div className="bg-green-100 p-4 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-sm font-medium text-gray-500">{title}</p>
        </div>
    </div>
);

const UsageAnalyticsPage: React.FC<UsageAnalyticsPageProps> = ({ currentUser, onBack, supabase }) => {
    const [activityLog, setActivityLog] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;
    
    useEffect(() => {
        const fetchActivity = async () => {
            if (!supabase) return;
            setIsLoading(true);
            const { data, error } = await supabase
                .from('audit_log_view') // Use the view to get user names
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching activity log:", error);
                setError("Failed to load activity log.");
            } else {
                setActivityLog(data as AuditLogEntry[]);
            }
            setIsLoading(false);
        };
        fetchActivity();
    }, [supabase]);
    
    const metrics = useMemo(() => {
        return activityLog.reduce((acc, log) => {
            switch (log.action) {
                case 'INSERT': acc.created++; break;
                case 'UPDATE': acc.updated++; break;
                case 'DELETE': acc.deleted++; break;
            }
            return acc;
        }, { created: 0, updated: 0, deleted: 0 });
    }, [activityLog]);

    // Pagination logic for the activity log
    const totalPages = Math.ceil(activityLog.length / rowsPerPage);
    const paginatedLog = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return activityLog.slice(startIndex, startIndex + rowsPerPage);
    }, [activityLog, currentPage, rowsPerPage]);
    
    const getActionBadge = (action: AuditLogEntry['action']) => {
        const styles: Record<typeof action, string> = {
            'INSERT': 'bg-green-100 text-green-800',
            'UPDATE': 'bg-yellow-100 text-yellow-800',
            'DELETE': 'bg-red-100 text-red-800',
        };
        return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[action]}`}>{action}</span>
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Usage Analytics</h1>
                        <p className="text-gray-500">A complete audit trail of all data modifications.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <StatCard 
                        title="Records Created" 
                        value={metrics.created} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                     <StatCard 
                        title="Records Updated" 
                        value={metrics.updated} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                    />
                     <StatCard 
                        title="Records Deleted" 
                        value={metrics.deleted} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                    />
                </div>

                {/* Activity Log Table */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b">
                        <h3 className="text-xl font-bold text-gray-800">Activity Log</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer ID</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-gray-500">Loading activity...</td></tr>
                                ) : error ? (
                                     <tr><td colSpan={4} className="text-center py-10 text-red-500">{error}</td></tr>
                                ) : paginatedLog.map(log => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">{log.user_name || 'Unknown User'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><div className="w-min">{getActionBadge(log.action)}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{log.record_id || 'N/A'}</td>
                                    </tr>
                                ))}
                                {!isLoading && !error && paginatedLog.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-gray-500">No activity recorded.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination for Table */}
                     <div className="p-4 border-t flex justify-between items-center">
                        <span className="text-sm text-gray-600">Showing {paginatedLog.length} of {activityLog.length} entries</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                            >
                                Previous
                            </button>
                             <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default UsageAnalyticsPage;