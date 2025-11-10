import React, { useState, useEffect, useMemo } from 'react';
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

const FarmerList: React.FC<FarmerListProps> = ({ 
    farmers, users, canEdit, canDelete, 
    onPrint, onExportToPdf, selectedFarmerIds, onSelectionChange, onSelectAll, 
    sortConfig, onRequestSort, newlyAddedFarmerId, onHighlightComplete, onBatchUpdate, onDeleteSelected,
    totalRecords, currentPage, rowsPerPage, onPageChange, onRowsPerPageChange, isLoading, onAddToPrintQueue,
    onNavigate, listViewMode, onSetListViewMode, isSuperAdmin, tenants
}) => {
    
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
            ? <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd"></path></svg>
            : <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>;
    };

    const SortableHeader: React.FC<{ sortKey: keyof Farmer | 'id' | 'tenantId'; children: React.ReactNode; className?: string }> = ({ sortKey, children, className }) => {
        const isActive = sortConfig?.key === sortKey;
        const headerClasses = `
            px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group
            ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-500'}
            ${className || ''}
        `;
        return (
            <th 
                className={headerClasses.trim()}
                onClick={() => onRequestSort(sortKey)}
                title={`Sort by ${children}`}
            >
                <div className={`flex items-center gap-1.5 ${className?.includes('text-center') ? 'justify-center' : ''}`}>
                    {children}
                    <SortIcon direction={isActive ? sortConfig.direction : null} />
                </div>
            </th>
        );
    };

    const totalPages = Math.ceil(totalRecords / rowsPerPage);
    const startRecord = Math.min((currentPage - 1) * rowsPerPage + 1, totalRecords);
    const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);
    
    const PaginationControls = () => {
        const pageNumbers = [];
        const maxPagesToShow = 7; // Show up to 7 page items (e.g., 1 ... 4 5 6 ... 10)
        
        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            pageNumbers.push(1); // Always show first page
            if (currentPage > 3) {
                pageNumbers.push('...');
            }
            
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) {
                start = 2;
                end = 4;
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
                end = totalPages - 1;
            }

            for (let i = start; i <= end; i++) {
                pageNumbers.push(i);
            }

            if (currentPage < totalPages - 2) {
                pageNumbers.push('...');
            }
            pageNumbers.push(totalPages); // Always show last page
        }
        
        const pageButtonClass = "px-3 py-1.5 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold";
        const activePageClass = "bg-green-600 text-white border border-green-600";
        const inactivePageClass = "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300";
        const ellipsisClass = "px-2 py-1.5 text-sm text-gray-500";

        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`${pageButtonClass} ${inactivePageClass}`}
                >
                    Previous
                </button>
                <div className="hidden sm:flex items-center gap-1">
                    {pageNumbers.map((page, index) =>
                        typeof page === 'number' ? (
                            <button
                                key={`${page}-${index}`}
                                onClick={() => onPageChange(page)}
                                className={`${pageButtonClass} ${currentPage === page ? activePageClass : inactivePageClass}`}
                            >
                                {page}
                            </button>
                        ) : (
                            <span key={`ellipsis-${index}`} className={ellipsisClass}>...</span>
                        )
                    )}
                </div>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`${pageButtonClass} ${inactivePageClass}`}
                >
                    Next
                </button>
            </div>
        )
    }


    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
             {selectedFarmerIds.length > 0 ? (
                <div className="p-4 bg-blue-50 border-b border-blue-200 flex justify-between items-center animate-fade-in-down">
                    <p className="text-sm font-semibold text-blue-800">
                        {selectedFarmerIds.length} farmer(s) selected
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onAddToPrintQueue(selectedFarmerIds)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold text-sm flex items-center gap-2"
                            title={`Add ${selectedFarmerIds.length} selected farmer(s) to the print queue`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                            Add to Print Queue
                        </button>
                        {canEdit && (
                            <button
                                onClick={onBatchUpdate}
                                className="px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition font-semibold text-sm flex items-center gap-2"
                                title={`Update status for ${selectedFarmerIds.length} selected farmer(s)`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Update Status
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={onDeleteSelected}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold text-sm flex items-center gap-2"
                                title={`Delete ${selectedFarmerIds.length} selected farmer(s)`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete Selected
                            </button>
                        )}
                    </div>
                </div>
             ) : (
                <div className="p-4 border-b flex justify-between items-center">
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            checked={allVisibleSelected}
                            onChange={(e) => onSelectAll(e.target.checked)}
                            aria-label="Select all visible farmers"
                        />
                        <span className="ml-2 text-sm font-semibold text-gray-700">Select All Visible</span>
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">View as:</span>
                        <div className="flex items-center rounded-md border p-0.5 bg-gray-100">
                             <button onClick={() => onSetListViewMode('table')} title="Table View" className={`p-1 rounded-md text-sm font-semibold ${listViewMode === 'table' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg></button>
                             <button onClick={() => onSetListViewMode('grid')} title="Grid View" className={`p-1 rounded-md text-sm font-semibold ${listViewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></button>
                        </div>
                    </div>
                </div>
             )}
            
            {listViewMode === 'table' ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 responsive-table">
                        <thead className="bg-gray-50 hidden md:table-header-group">
                            <tr>
                                <th className="px-6 py-3"><!-- Empty for spacing --></th>
                                <SortableHeader sortKey="farmerId">Hap ID</SortableHeader>
                                <SortableHeader sortKey="fullName">Name</SortableHeader>
                                {isSuperAdmin && <SortableHeader sortKey="tenantId">Tenant</SortableHeader>}
                                <SortableHeader sortKey="village">Location</SortableHeader>
                                <SortableHeader sortKey="status">Status</SortableHeader>
                                <SortableHeader sortKey="registrationDate">Reg. Date</SortableHeader>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 md:divide-y-0">
                        {farmers.length > 0 ? farmers.map(farmer => {
                            const isSelected = selectedFarmerIds.includes(farmer.id);
                            const isNewlyAdded = newlyAddedFarmerId === farmer.id;
                            
                            let rowBgClass = isNewlyAdded ? 'bg-green-100' : isSelected ? 'bg-green-50' : '';

                            return (
                                <tr key={farmer.id} onClick={() => onNavigate(`farmer-details/${farmer.id}`)} className={`transition-colors duration-1000 cursor-pointer hover:bg-gray-50 ${rowBgClass}`}>
                                    <td data-label="" className="px-6 py-4 whitespace-nowrap td-checkbox" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                            checked={isSelected}
                                            onChange={(e) => onSelectionChange(farmer.id, e.target.checked)}
                                            aria-label={`Select farmer ${farmer.fullName}`}
                                        />
                                    </td>
                                    <td data-label="Hap ID" className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800">{farmer.farmerId}</td>
                                    <td data-label="Name" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div className="flex items-center gap-2">
                                            {farmer.syncStatus === 'synced' ? (
                                                <div title="Synced with server" className="flex-shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div title="Pending - Saved locally" className="flex-shrink-0">
                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div>
                                                <span>{farmer.fullName}</span>
                                                <div className="md:hidden text-xs text-gray-500 font-normal">{farmer.mobileNumber}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {isSuperAdmin && (
                                        <td data-label="Tenant" className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                            {tenantNameMap.get(farmer.tenantId) || 'Unknown'}
                                        </td>
                                    )}
                                    <td data-label="Location" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{`${getGeoName('village', farmer)}, ${getGeoName('mandal', farmer)}`}</div>
                                        <div className="md:hidden font-semibold text-gray-600">{farmer.approvedExtent} Acres</div>
                                    </td>
                                    <td data-label="Status" className="px-6 py-4 whitespace-nowrap text-sm">
                                        <StatusBadge status={farmer.status as FarmerStatus} />
                                    </td>
                                     <td data-label="Reg. Date" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(farmer.registrationDate).toLocaleDateString()}</td>
                                     <td data-label="Created" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{getUserName(farmer.createdBy)}</div>
                                        <div className="text-xs text-gray-400" title={new Date(farmer.createdAt).toLocaleString()}>{new Date(farmer.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td data-label="Last Updated" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{getUserName(farmer.updatedBy)}</div>
                                        <div className="text-xs text-gray-400" title={new Date(farmer.updatedAt).toLocaleString()}>{new Date(farmer.updatedAt).toLocaleDateString()}</div>
                                    </td>
                                    <td data-label="Actions" className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2 td-actions" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => onPrint(farmer.id)} className="text-green-600 hover:text-green-900">Print</button>
                                        <button onClick={() => onExportToPdf(farmer.id)} className="text-blue-600 hover:text-blue-900">PDF</button>
                                    </td>
                                </tr>
                            );
                        }) : (
                             <tr>
                                <td colSpan={isSuperAdmin ? 10 : 9} className="text-center py-10 text-gray-500">
                                    No records match your current filters on this page.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-4 md:p-6">
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
                                isNewlyAdded={newlyAddedFarmerId === farmer.id}
                            />
                        ))}
                    </div>
                </div>
            )}
            <div className="p-4 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex-1 text-center md:text-left">
                    <label htmlFor="rowsPerPage" className="text-sm text-gray-600 mr-2">Rows per page:</label>
                    <select
                        id="rowsPerPage"
                        value={rowsPerPage}
                        onChange={e => onRowsPerPageChange(Number(e.target.value))}
                        className="p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <div className="flex-1 hidden md:block text-center text-sm text-gray-600">
                    Showing {totalRecords > 0 ? startRecord : 0}-{endRecord} of {totalRecords}
                </div>

                <div className="flex-1 flex justify-center md:justify-end">
                    <PaginationControls />
                </div>
            </div>
        </div>
    );
};

export default FarmerList;