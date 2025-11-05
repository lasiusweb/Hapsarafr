import React, { useState, useEffect } from 'react';
import { Farmer, FarmerStatus } from '../types';
import { FarmerModel } from '../db';
import { GEO_DATA } from '../data/geoData';

interface FarmerListProps {
    farmers: FarmerModel[];
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
    onDeleteSelected: () => void;
}

const FarmerList: React.FC<FarmerListProps> = ({ farmers, canEdit, canDelete, editingRowId, onEditRow, onCancelEditRow, onSaveRow, onPrint, onExportToPdf, selectedFarmerIds, onSelectionChange, onSelectAll, sortConfig, onRequestSort, newlyAddedFarmerId, onHighlightComplete, onDeleteSelected }) => {
    
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
    
    if (farmers.length === 0) {
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
            return <svg className="w-4 h-4 text-gray-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>;
        }
        return direction === 'ascending' 
            ? <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd"></path></svg>
            : <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>;
    };

    const SortableHeader: React.FC<{ sortKey: keyof Farmer | 'id'; children: React.ReactNode; className?: string }> = ({ sortKey, children, className }) => (
        <th 
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
            onClick={() => onRequestSort(sortKey)}
            title={`Sort by ${children}`}
        >
            <div className={`flex items-center gap-1 ${className?.includes('text-center') ? 'justify-center' : ''}`}>
                {children}
                <SortIcon direction={sortConfig?.key === sortKey ? sortConfig.direction : null} />
            </div>
        </th>
    );

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
             {canDelete && selectedFarmerIds.length > 0 && (
                <div className="p-4 bg-yellow-50 border-b border-yellow-200 flex justify-between items-center">
                    <p className="text-sm font-semibold text-yellow-800">
                        {selectedFarmerIds.length} farmer(s) selected
                    </p>
                    <button
                        onClick={onDeleteSelected}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold text-sm flex items-center gap-2"
                        title={`Delete ${selectedFarmerIds.length} selected farmer(s)`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                        Delete Selected
                    </button>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
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
                            <SortableHeader sortKey="mobileNumber">Mobile</SortableHeader>
                            <SortableHeader sortKey="status">Status</SortableHeader>
                            <SortableHeader sortKey="registrationDate">Reg. Date</SortableHeader>
                            <SortableHeader sortKey="approvedExtent" className="text-center">Extent (Ac)</SortableHeader>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {farmers.map(farmer => {
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
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                        checked={isSelected}
                                        onChange={(e) => onSelectionChange(farmer.id, e.target.checked)}
                                        aria-label={`Select farmer ${farmer.fullName}`}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800">{farmer.farmerId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {isEditing ? (
                                        <input 
                                            type="text"
                                            value={editedFarmerData.fullName || ''}
                                            onChange={e => setEditedFarmerData(d => ({ ...d, fullName: e.target.value }))}
                                            className="w-full p-1 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${farmer.syncStatus === 'synced' ? 'bg-green-500' : 'bg-yellow-400'}`}
                                                title={farmer.syncStatus === 'synced' ? 'Synced with server' : 'Pending - Saved locally'}
                                            >
                                                <span className="sr-only">{farmer.syncStatus === 'synced' ? 'Synced' : 'Pending Sync'}</span>
                                            </span>
                                            <span>{farmer.fullName}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${getGeoName('village', farmer)}, ${getGeoName('mandal', farmer)}`}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {isEditing ? (
                                        <input 
                                            type="text"
                                            value={editedFarmerData.mobileNumber || ''}
                                            onChange={e => setEditedFarmerData(d => ({ ...d, mobileNumber: e.target.value }))}
                                            className="w-full p-1 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                                        />
                                    ) : (
                                        farmer.mobileNumber
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(farmer.registrationDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {farmer.approvedExtent}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
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
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FarmerList;