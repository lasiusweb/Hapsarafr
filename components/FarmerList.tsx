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
            ? <svg className="w-4 h-4