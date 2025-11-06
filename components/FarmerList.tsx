import React, { useState, useEffect } from 'react';
import { Farmer, FarmerStatus, User } from '../types';
import { FarmerModel } from '../db';
import { GEO_DATA } from '../data/geoData';

interface FarmerListProps {
    farmers: FarmerModel[];
    users: User[];
    canEdit: boolean;
    canDelete: boolean;
    editingRowId: string | null;
    onEditRow: (farmerId: string) => void;
    onCancelEditRow: () => void;
    onSaveRow: (farmerToUpdate: FarmerModel, updatedData: Partial<Pick<Farmer, 'fullName' | 'mobileNumber' | 'status'>>) => Promise<void>;
    onPrint: (farmer: FarmerModel) => void;
    onExportToPdf: (farmer: FarmerModel) => void;
    selectedFarmerIds: string[];
    onSelectionChange: (farmerId: string, isSelected: boolean) => void;
    onSelectAll: (allSelected: boolean) => void;
    sortConfig: { key: keyof Farmer | 'id'; direction: 'ascending' | 'descending' } | null;
    onRequestSort: (key: keyof Farmer | 'id') => void;
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
}

const FarmerList: React.FC<FarmerListProps> = ({ 
    farmers, users, canEdit, canDelete, editingRowId, onEditRow, onCancelEditRow, onSaveRow, 
    onPrint, onExportToPdf, selectedFarmerIds, onSelectionChange, onSelectAll, 
    sortConfig, onRequestSort, newlyAddedFarmerId, onHighlightComplete, onBatchUpdate, onDeleteSelected,
    totalRecords, currentPage, rowsPerPage, onPageChange, onRowsPerPageChange, isLoading 
}) => {
    
    const [editedFarmerData, setEditedFarmerData] = useState<Partial<Pick<Farmer, 'fullName' | 'mobileNumber' | 'status'>>>({});
    
    useEffect(() => {
        if (newlyAddedFarmerId) {
            const timer = setTimeout(() => {
                onHighlightComplete();
            }, 3000); // Highlight duration: 3 seconds

            return () => clearTimeout(timer);
        }
    }, [newlyAddedFarmerId, onHighlightComplete]);

    const handleEditClick = (farmer: FarmerModel) => {
        setEditedFarmerData({
            fullName: farmer.fullName,
            mobileNumber: farmer.mobileNumber,
            status: farmer.status as FarmerStatus,
        });
        onEditRow(farmer.id);
    };

    const handleSaveClick = (farmer: FarmerModel) => {
        // Basic validation
        if (!editedFarmerData.fullName?.trim()) {
            alert("Full Name cannot be empty.");
            return;
        }
        if (editedFarmerData.mobileNumber && !/^[6-9]\d{9}$/.test(editedFarmerData.mobileNumber)) {
            alert("Mobile number must be 10 digits and start with 6-9.");
            return;
        }
        onSaveRow(farmer, editedFarmerData);
    };

    const StatusBadge: React.FC<{status: FarmerStatus}> = ({ status }) => {
        const colors: Record<FarmerStatus, string> = {
            [FarmerStatus.Registered]: 'bg-blue-100 text-blue-800',
            [FarmerStatus.Sanctioned]: 'bg-yellow-100 text-yellow-800',
            [FarmerStatus.Planted]: 'bg-green-100 text-green-800',
            [FarmerStatus.PaymentDone]: 'bg-purple-100 text-purple-800',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
    };

    const getGeoName = (type: 'district'|'mandal'|'village', farmer: FarmerModel) => {
        try {
            if(type === 'district') return GEO_DATA.find(d => d.code === farmer.district)?.name || farmer.district;
            const district = GEO_DATA.find(d => d.code === farmer.district);
            if(type === 'mandal') return district?.mandals.find(m => m.code === farmer.mandal)?.name || farmer.mandal;
            const mandal = district?.mandals.find(m => m.code === farmer.mandal);
            if(type === 'village') return mandal?.villages.find(v => v.code === farmer.village)?.name || farmer.village;
        } catch(e) {
            return 'N/A';
        }
    };
    
    const getUserName = (userId?: string) => {
        if (!userId) return 'System';
        const user = users.find(u => u.id === userId);
        return user ? user.name : 'Unknown User';
    };
    
    // Fix: Added isLoading prop to show a loading indicator.
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white shadow-md rounded-lg">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
            </div>
        );
    }

    if (totalRecords === 0) {
        return (
            <div className="text-center py-20 text-gray-500 bg-white shadow-md rounded-lg">
                <h2 className="text-2xl font-semibold">No Farmers Found</h2>
                <p className="mt-2">Try adjusting your search criteria, or click "Register New Farmer" to add one.</p>
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

    const SortableHeader: React.FC<{ sortKey: keyof Farmer | 'id'; children: React.ReactNode; className?: string }> = ({ sortKey, children, className }) => {
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
             {selectedFarmerIds.length > 0 && (
                <div className="p-4 bg-blue-50 border-b border-blue-200 flex justify-between items-center animate-fade-in-down">
                    <p className="text-sm font-semibold text-blue-800">
                        {selectedFarmerIds.length} farmer(s) selected
                    </p>
                    <div className="flex items-center gap-2">
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
            )}
             <div className="md:hidden px-4 pt-4">
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
            </div>
            <div className="overflow-x-auto p-0 md:p-0">
                <table className="min-w-full divide-y divide-gray-200 responsive-table">
                    <thead className="bg-gray-50 hidden md:table-header-group">
                        <tr>
                            <th className="px-6 py-3">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                    checked={allVisibleSelected}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                    aria-label="Select all farmers"
                                />
                            </th>
                            <SortableHeader sortKey="farmerId">Hap ID</SortableHeader>
                            <SortableHeader sortKey="fullName">Name</SortableHeader>
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
                        const isEditing = editingRowId === farmer.id;
                        const isSelected = selectedFarmerIds.includes(farmer.id);
                        const isNewlyAdded = newlyAddedFarmerId === farmer.id;
                        
                        let rowBgClass = '';
                        if (isNewlyAdded) {
                            rowBgClass = 'bg-green-200';
                        } else if (isEditing) {
                            rowBgClass = 'bg-yellow-50';
                        } else if (isSelected) {
                            rowBgClass = 'bg-green-50';
                        }

                        return (
                            <tr key={farmer.id} className={`transition-colors duration-1000 ${rowBgClass}`}>
                                <td data-label="" className="px-6 py-4 whitespace-nowrap td-checkbox">
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
                                    {isEditing ? (
                                        <input 
                                            type="text"
                                            value={editedFarmerData.fullName || ''}
                                            onChange={e => setEditedFarmerData(d => ({ ...d, fullName: e.target.value }))}
                                            className="w-full p-1 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {farmer.syncStatusLocal === 'synced' ? (
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
                                            <span>{farmer.fullName}</span>
                                        </div>
                                    )}
                                </td>
                                <td data-label="Location" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${getGeoName('village', farmer)}, ${getGeoName('mandal', farmer)}`}</td>
                                <td data-label="Status" className="px-6 py-4 whitespace-nowrap text-sm">
                                    {isEditing ? (
                                        <select
                                            value={editedFarmerData.status || ''}
                                            onChange={e => setEditedFarmerData(d => ({ ...d, status: e.target.value as FarmerStatus }))}
                                            className="w-full p-1 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                                        >
                                            {Object.values(FarmerStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <StatusBadge status={farmer.status as FarmerStatus} />
                                    )}
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
                                <td data-label="Actions" className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2 td-actions">
                                {isEditing ? (
                                    <>
                                        <button onClick={() => handleSaveClick(farmer)} className="text-green-600 hover:text-green-900">Save</button>
                                        <button onClick={onCancelEditRow} className="text-gray-600 hover:text-gray-900">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        {canEdit && <button onClick={() => handleEditClick(farmer)} className="text-indigo-600 hover:text-indigo-900">Edit</button>}
                                        <button onClick={() => onPrint(farmer)} className="text-green-600 hover:text-green-900">Print</button>
                                        <button onClick={() => onExportToPdf(farmer)} className="text-blue-600 hover:text-blue-900">PDF</button>
                                    </>
                                )}
                                </td>
                                {/* Hidden data for responsive view */}
                                <td data-label="Mobile" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{farmer.mobileNumber}</td>
                                <td data-label="Extent (Ac)" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center md:text-right">{farmer.approvedExtent}</td>
                            </tr>
                        );
                    }) : (
                         <tr>
                            <td colSpan={9} className="text-center py-10 text-gray-500">
                                No records match your current filters on this page.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
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
