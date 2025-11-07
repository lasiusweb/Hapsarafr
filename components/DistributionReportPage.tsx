import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, UserModel, ResourceModel, ResourceDistributionModel } from '../db';
import { Q } from '@nozbe/watermelondb';

interface DistributionReportPageProps {
    onBack: () => void;
}

const DistributionReportPage: React.FC<DistributionReportPageProps> = ({ onBack }) => {
    const database = useDatabase();
    
    // Data queries
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const users = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));
    const resources = useQuery(useMemo(() => database.get<ResourceModel>('resources').query(), [database]));
    const distributions = useQuery(useMemo(() => database.get<ResourceDistributionModel>('resource_distributions').query(Q.sortBy('distribution_date', Q.desc)), [database]));
    
    // Name maps for efficient lookups
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f.fullName])), [farmers]);
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const resourceMap = useMemo(() => new Map(resources.map(r => [r.id, r])), [resources]);
    
    // State
    const [filters, setFilters] = useState({ resourceId: '', dateFrom: '', dateTo: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 15;

    const filteredDistributions = useMemo(() => {
        return distributions.filter(d => {
            if (filters.resourceId && d.resourceId !== filters.resourceId) return false;
            if (filters.dateFrom && d.distributionDate < filters.dateFrom) return false;
            if (filters.dateTo && d.distributionDate > filters.dateTo) return false;
            return true;
        });
    }, [distributions, filters]);

    const paginatedDistributions = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredDistributions.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredDistributions, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(filteredDistributions.length / rowsPerPage);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setCurrentPage(1);
    };
    
    const clearFilters = () => {
        setFilters({ resourceId: '', dateFrom: '', dateTo: '' });
        setCurrentPage(1);
    }

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Distribution Log</h1>
                        <p className="text-gray-500">A complete audit trail of all distributed resources.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                            <select name="resourceId" value={filters.resourceId} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md">
                                <option value="">All Resources</option>
                                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                            <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                            <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} min={filters.dateFrom} className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <button onClick={clearFilters} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold">Clear Filters</button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distributed By</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedDistributions.map(d => {
                                    const resource = resourceMap.get(d.resourceId);
                                    return (
                                        <tr key={d.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.distributionDate}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{farmerMap.get(d.farmerId) || 'Unknown'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{resource?.name || 'Unknown'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.quantity} {resource?.unit}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userMap.get(d.createdBy) || 'Unknown'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="p-4 border-t flex justify-between items-center">
                            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Previous</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DistributionReportPage;