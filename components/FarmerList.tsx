import React, { useState, useEffect, useMemo } from 'react';
// FIX: Import from the newly created types.ts file
import { Farmer, FarmerStatus, User, Tenant } from '../types';
import { getGeoName } from '../lib/utils';
import StatusBadge from './StatusBadge';
import FarmerCard from './FarmerCard';

interface FarmerListProps {
    farmers: Farmer[];
    users: User[];
    canEdit: boolean;
    canDelete: boolean;
    onPrint: (farmerId: string) => void;
    onExportToPdf: (farmerId: string) => void;
    selectedFarmerIds: string[];
    onSelectionChange: (farmerId: string, isSelected: boolean) => void;
    onSelectAll: (allSelected: boolean) => void;
    sortConfig: { key: keyof Farmer | 'id' | 'tenantId'; direction: 'ascending' | 'descending' } | null;
    onRequestSort: (key: keyof Farmer | 'id' | 'tenantId') => void;
    newlyAddedFarmerId: string | null;
    onHighlightComplete: () => void;
    onBatchUpdate: () => void;
    onDeleteSelected: () => void;
    totalRecords: number;
    currentPage: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rows: number) => void;
    isLoading: boolean;
    onAddToPrintQueue: (farmerIds: string[]) => void;
    onNavigate: (path: string) => void;
    listViewMode: 'table' | 'grid';
    onSetListViewMode: (mode: 'table' | 'grid') => void;
    isSuperAdmin: boolean;
    tenants: Tenant[];
}

export default function FarmerList({ 
    farmers, users, canEdit, canDelete, 
    onPrint, onExportToPdf, selectedFarmerIds, onSelectionChange, onSelectAll, 
    sortConfig, onRequestSort, newlyAddedFarmerId, onHighlightComplete, onBatchUpdate, onDeleteSelected,
    totalRecords, currentPage, rowsPerPage, onPageChange, onRowsPerPageChange, isLoading, onAddToPrintQueue,
    onNavigate, listViewMode, onSetListViewMode, isSuperAdmin, tenants
}: FarmerListProps) {
    
    useEffect(() => {
        if (newlyAddedFarmerId) {
            const timer = setTimeout(() => {
                onHighlightComplete();
            }, 3000); // Highlight duration: 3 seconds

            return () => clearTimeout(timer);
        }
    }, [newlyAddedFarmerId, onHighlightComplete]);

    const getUserName = (userId?: string) => {
        if (!userId) return 'System';
        const user = users.find(u => u.id === userId);
        return user ? user.name : 'Unknown User';
    };

    const tenantNameMap = useMemo(() => new Map(tenants.map(t => [t.id, t.name])), [tenants]);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white shadow-md rounded-lg">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
            </div>
        );
    }

    if (totalRecords === 0 && !isLoading) {
        return (
            <div className="text-center py-20 text-gray-500 bg-white shadow-md rounded-lg">
                <h2 className="text-2xl font-semibold">No Farmers Found</h2>
                <p className="mt-2">Try adjusting your search criteria, or click "Register Farmer" to add one.</p>
            </div>
        );
    }
    
    const allVisibleSelected = farmers.length > 0 && farmers.every(f => selectedFarmerIds.includes(f.id));

    const SortIcon: React.FC<{ direction: 'ascending' | 'descending' | null }> = ({ direction }) => {
        if (!direction) {
            return (
                <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                </svg>
            );
        }
        return direction === 'ascending' 
            ? <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
            : <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>;
    };
    
    const SortableHeader: React.FC<{ sortKey: keyof Farmer | 'id' | 'tenantId', children: React.ReactNode }> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <button onClick={() => onRequestSort(sortKey)} className="group flex items-center gap-2">
                <span>{children}</span>
                <SortIcon direction={sortConfig?.key === sortKey ? sortConfig.direction : null} />
            </button>
        </th>
    );

    const paginationControls = (
        <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <select value={rowsPerPage} onChange={e => onRowsPerPageChange(Number(e.target.value))} className="p-1 border border-gray-300 rounded-md">
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                    Page {currentPage} of {Math.ceil(totalRecords / rowsPerPage)}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Prev</button>
                    <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage * rowsPerPage >= totalRecords} className="px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Next</button>
                </div>
            </div>
        </div>
    );
    
    return (
        <div>
            {listViewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {farmers.map(farmer => (
                         <FarmerCard
                            key={farmer.id}
                            farmer={farmer}
                            isSelected={selectedFarmerIds.includes(farmer.id)}
                            onSelectionChange={onSelectionChange}
                            onPrint={onPrint}
                            onExportToPdf={onExportToPdf}
                            onNavigate={onNavigate}
                            isNewlyAdded={farmer.id === newlyAddedFarmerId}
                        />
                    ))}
                </div>
            )}

            {listViewMode === 'table' && (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 responsive-table">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">
                                        <input type="checkbox" className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" checked={allVisibleSelected} onChange={(e) => onSelectAll(e.target.checked)} />
                                    </th>
                                    <SortableHeader sortKey="hap_id">Hap ID</SortableHeader>
                                    <SortableHeader sortKey="fullName">Name</SortableHeader>
                                    <SortableHeader sortKey="district">Location</SortableHeader>
                                    <SortableHeader sortKey="status">Status</SortableHeader>
                                    <SortableHeader sortKey="approvedExtent">Area (Ac)</SortableHeader>
                                    <SortableHeader sortKey="registrationDate">Reg. Date</SortableHeader>
                                    {isSuperAdmin && <SortableHeader sortKey="tenantId">Tenant</SortableHeader>}
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {farmers.map(farmer => {
                                    const isSelected = selectedFarmerIds.includes(farmer.id);
                                    const isNewlyAdded = farmer.id === newlyAddedFarmerId;
                                    const trClass = `transition-colors duration-1000 ${isNewlyAdded ? 'bg-green-100' : isSelected ? 'bg-green-50' : ''}`;

                                    return (
                                    <tr key={farmer.id} className={`${trClass} hover:bg-gray-50 cursor-pointer`} onClick={() => onNavigate(`farmer-details/${farmer.id}`)}>
                                        <td data-label="Select" className="px-6 py-4 whitespace-nowrap td-checkbox" onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" checked={isSelected} onChange={(e) => onSelectionChange(farmer.id, e.target.checked)} />
                                        </td>
                                        <td data-label="Hap ID" className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{farmer.hap_id || 'N/A'}</td>
                                        <td data-label="Name" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{farmer.fullName}</td>
                                        <td data-label="Location" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getGeoName('village', farmer)}, {getGeoName('mandal', farmer)}</td>
                                        <td data-label="Status" className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={farmer.status as FarmerStatus} /></td>
                                        <td data-label="Area" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{farmer.approvedExtent || 0}</td>
                                        <td data-label="Reg. Date" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(farmer.registrationDate).toLocaleDateString()}</td>
                                        {isSuperAdmin && <td data-label="Tenant" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenantNameMap.get(farmer.tenantId) || farmer.tenantId}</td>}
                                        <td data-label="Actions" className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium td-actions" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => onPrint(farmer.id)} className="text-green-600 hover:text-green-900 mr-4">Print</button>
                                            <button onClick={() => onExportToPdf(farmer.id)} className="text-green-600 hover:text-green-900">PDF</button>
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                     {paginationControls}
                </div>
            )}
            
            {listViewMode === 'grid' && paginationControls}

        </div>
    );
}
