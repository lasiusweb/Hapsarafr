import React, { useState, useEffect, useMemo, useCallback, lazy } from 'react';
import { useDatabase } from '../DatabaseContext';
import { FarmerModel, TenantModel, UserModel, FarmerDealerConsentModel } from '../db';
import { Farmer, User, Tenant, Filters, Permission, FarmerStatus } from '../types';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
// FIX: The import for 'plotModelToPlain' was corrected to 'farmPlotModelToPlain' to match the exported function name in 'lib/utils.ts'. Additionally, the logic for fetching farmer plots was updated to use 'farmPlots.fetch()' instead of the non-existent 'plots.fetch()' to align with the database model association.
import { farmerModelToPlain, farmPlotModelToPlain } from '../lib/utils';

// Components
import FilterBar from './FilterBar';
import FarmerList from './FarmerList';
import BatchUpdateStatusModal from './BatchUpdateStatusModal';
import ConfirmationModal from './ConfirmationModal';
import BulkImportModal from './BulkImportModal';
import RawDataView from './RawDataView';
import PrintView from './PrintView';
import MapView from './MapView';

// Libs
import { exportToExcel, exportToCsv } from '../lib/export';
import { useDebounce } from '../hooks/useDebounce';
declare const jspdf: any;
declare const html2canvas: any;
declare const window: any; // for rxjs from CDN

interface FarmerDirectoryPageProps {
    users: User[];
    tenants: Tenant[];
    currentUser: User;
    permissions: Set<Permission>;
    newlyAddedFarmerId: string | null;
    onHighlightComplete: () => void;
    onNavigate: (path: string) => void;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const initialFilters: Filters = {
    searchQuery: '',
    district: '',
    mandal: '',
    village: '',
    status: '',
    registrationDateFrom: '',
    registrationDateTo: '',
};

const FarmerDirectoryPage: React.FC<FarmerDirectoryPageProps & { farmers: FarmerModel[] }> = ({
    farmers: rawFarmers, users, tenants, currentUser, permissions, newlyAddedFarmerId,
    onHighlightComplete, onNavigate, setNotification
}) => {
    const database = useDatabase();
    
    // State Management
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Farmer | 'id' | 'tenantId'; direction: 'ascending' | 'descending' }>({ key: 'registrationDate', direction: 'descending' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
    const [listViewMode, setListViewMode] = useState<'table' | 'grid' | 'map'>('table');

    // Modal States
    const [isBatchUpdateModalOpen, setIsBatchUpdateModalOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [isRawDataViewOpen, setIsRawDataViewOpen] = useState(false);
    
    // Print & PDF states
    const [farmerToPrint, setFarmerToPrint] = useState<Farmer | null>(null);
    const [plotsForPrint, setPlotsForPrint] = useState<any[]>([]);

    const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

    // Data Processing Pipeline
    const processedFarmers = useMemo(() => {
        let plainFarmers = rawFarmers.map(f => farmerModelToPlain(f)!);

        // 1. Filtering
        if (debouncedSearchQuery) {
            const lowercasedQuery = debouncedSearchQuery.toLowerCase();
            plainFarmers = plainFarmers.filter(f =>
                f.fullName.toLowerCase().includes(lowercasedQuery) ||
                f.mobileNumber.includes(lowercasedQuery) ||
                f.hap_id?.toLowerCase().includes(lowercasedQuery)
            );
        }
        if (filters.district) plainFarmers = plainFarmers.filter(f => f.district === filters.district);
        if (filters.mandal) plainFarmers = plainFarmers.filter(f => f.mandal === filters.mandal);
        if (filters.village) plainFarmers = plainFarmers.filter(f => f.village === filters.village);
        if (filters.status) plainFarmers = plainFarmers.filter(f => f.status === filters.status);
        if (filters.registrationDateFrom) plainFarmers = plainFarmers.filter(f => new Date(f.registrationDate) >= new Date(filters.registrationDateFrom));
        if (filters.registrationDateTo) plainFarmers = plainFarmers.filter(f => new Date(f.registrationDate) <= new Date(filters.registrationDateTo));

        // 2. Sorting
        plainFarmers.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return plainFarmers;
    }, [rawFarmers, debouncedSearchQuery, filters, sortConfig]);

    // 3. Pagination
    const paginatedFarmers = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return processedFarmers.slice(startIndex, startIndex + rowsPerPage);
    }, [processedFarmers, currentPage, rowsPerPage]);

    // Handlers
    const handleFilterChange = (newFilters: Filters) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handleSortRequest = (key: keyof Farmer | 'id' | 'tenantId') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    // Selection Handlers
    const handleSelectionChange = (farmerId: string, isSelected: boolean) => {
        setSelectedFarmerIds(prev => isSelected ? [...prev, farmerId] : prev.filter(id => id !== farmerId));
    };

    const handleSelectAll = (allSelected: boolean) => {
        setSelectedFarmerIds(allSelected ? paginatedFarmers.map(f => f.id) : []);
    };

    // Action Handlers
    const handleDeleteSelected = () => {
        if (selectedFarmerIds.length > 0) {
            setIsDeleteConfirmationOpen(true);
        }
    };

    const handleConfirmDelete = async () => {
        const farmersCollection = database.get<FarmerModel>('farmers');
        const farmersToDelete = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
        
        await database.write(async () => {
            for (const farmer of farmersToDelete) {
                await farmer.update(f => {
                    f.syncStatusLocal = 'pending_delete';
                });
            }
        });

        setNotification({ message: `${selectedFarmerIds.length} farmer(s) marked for deletion.`, type: 'info' });
        setSelectedFarmerIds([]);
        setIsDeleteConfirmationOpen(false);
    };

    const handleConfirmBatchUpdate = async (newStatus: FarmerStatus) => {
        const farmersCollection = database.get<FarmerModel>('farmers');
        const farmersToUpdate = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();

        await database.write(async () => {
            for (const farmer of farmersToUpdate) {
                await farmer.update(f => {
                    f.status = newStatus;
                    f.syncStatusLocal = 'pending';
                });
            }
        });
        
        setNotification({ message: `Status updated for ${selectedFarmerIds.length} farmer(s).`, type: 'success' });
        setSelectedFarmerIds([]);
        setIsBatchUpdateModalOpen(false);
    };

    // Print & PDF
    const prepareForPrint = async (farmerId: string) => {
        const farmerModel = rawFarmers.find(f => f.id === farmerId);
        if (farmerModel) {
            // FIX: The association on the FarmerModel is 'farmPlots', not 'plots'.
            const plots = await farmerModel.farmPlots.fetch();
            setFarmerToPrint(farmerModelToPlain(farmerModel));
            // FIX: The import for 'plotModelToPlain' was corrected to 'farmPlotModelToPlain' to match the exported function name in 'lib/utils.ts'. Additionally, the logic for fetching farmer plots was updated to use 'farmPlots.fetch()' instead of the non-existent 'plots.fetch()' to align with the database model association.
            setPlotsForPrint(plots.map(p => farmPlotModelToPlain(p as any)!));
        }
    };
    
    useEffect(() => {
        if (farmerToPrint) {
            // This timeout allows the PrintView to render before window.print is called
            setTimeout(() => window.print(), 100);
            // Reset after printing
            setTimeout(() => setFarmerToPrint(null), 500);
        }
    }, [farmerToPrint]);

    const handlePrint = (farmerId: string) => prepareForPrint(farmerId);
    
    const handleExportToPdf = async (farmerId: string) => {
        await prepareForPrint(farmerId);
        // Timeout to ensure the component is rendered with the new data
        setTimeout(() => {
            const input = document.querySelector('.print-only');
            if (input) {
                html2canvas(input as HTMLElement).then((canvas: any) => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;
                    const ratio = canvasWidth / canvasHeight;
                    const width = pdfWidth;
                    const height = width / ratio;

                    pdf.addImage(imgData, 'PNG', 0, 0, width, height > pdfHeight ? pdfHeight : height);
                    pdf.save(`${farmerToPrint?.hap_id || 'farmer'}.pdf`);
                    setFarmerToPrint(null);
                });
            }
        }, 200);
    };
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Farmer Directory</h1>
            <FilterBar filters={filters} onFilterChange={handleFilterChange} />
            
            {/* Action Bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 shadow-md rounded-lg">
                <div className="flex items-center gap-4">
                     <span className="text-sm font-semibold text-gray-600">{selectedFarmerIds.length} selected</span>
                     {permissions.has(Permission.CAN_DELETE_FARMER) && <button onClick={handleDeleteSelected} disabled={selectedFarmerIds.length === 0} className="text-sm font-semibold text-red-600 hover:underline disabled:text-gray-400">Delete</button>}
                     {permissions.has(Permission.CAN_EDIT_FARMER) && <button onClick={() => setIsBatchUpdateModalOpen(true)} disabled={selectedFarmerIds.length === 0} className="text-sm font-semibold text-blue-600 hover:underline disabled:text-gray-400">Update Status</button>}
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={() => setListViewMode('table')} className={`p-2 rounded-md ${listViewMode === 'table' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>Table</button>
                     <button onClick={() => setListViewMode('grid')} className={`p-2 rounded-md ${listViewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>Grid</button>
                     <button onClick={() => setListViewMode('map')} className={`p-2 rounded-md ${listViewMode === 'map' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>Map</button>
                </div>
            </div>
            
            {listViewMode === 'map' ? (
                <MapView farmers={rawFarmers} onNavigate={onNavigate} />
            ) : (
                <FarmerList 
                    farmers={paginatedFarmers}
                    users={users}
                    canEdit={permissions.has(Permission.CAN_EDIT_FARMER)}
                    canDelete={permissions.has(Permission.CAN_DELETE_FARMER)}
                    onPrint={handlePrint}
                    onExportToPdf={handleExportToPdf}
                    selectedFarmerIds={selectedFarmerIds}
                    onSelectionChange={handleSelectionChange}
                    onSelectAll={handleSelectAll}
                    sortConfig={sortConfig}
                    onRequestSort={handleSortRequest}
                    newlyAddedFarmerId={newlyAddedFarmerId}
                    onHighlightComplete={onHighlightComplete}
                    onBatchUpdate={() => setIsBatchUpdateModalOpen(true)}
                    onDeleteSelected={handleDeleteSelected}
                    totalRecords={processedFarmers.length}
                    currentPage={currentPage}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setCurrentPage}
                    onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); }}
                    isLoading={false} // Loading handled by parent observable
                    onAddToPrintQueue={() => {}}
                    onNavigate={onNavigate}
                    listViewMode={listViewMode}
                    onSetListViewMode={setListViewMode}
                    isSuperAdmin={currentUser.groupId === 'group-super-admin'}
                    tenants={tenants}
                />
            )}
            
            {/* Modals */}
             {isBatchUpdateModalOpen && <BatchUpdateStatusModal selectedCount={selectedFarmerIds.length} onUpdate={handleConfirmBatchUpdate} onCancel={() => setIsBatchUpdateModalOpen(false)} />}
             {isDeleteConfirmationOpen && <ConfirmationModal isOpen={isDeleteConfirmationOpen} title="Delete Farmers?" message={`Are you sure you want to delete ${selectedFarmerIds.length} farmer(s)? This action cannot be undone.`} onConfirm={handleConfirmDelete} onCancel={() => setIsDeleteConfirmationOpen(false)} confirmText="Delete" confirmButtonVariant="destructive" />}
             {isBulkImportModalOpen && <BulkImportModal onClose={() => setIsBulkImportModalOpen(false)} onSubmit={async () => {}} existingFarmers={processedFarmers} />}
             {isRawDataViewOpen && <RawDataView farmers={rawFarmers} onClose={() => setIsRawDataViewOpen(false)} />}
             {farmerToPrint && <PrintView farmer={farmerToPrint} plots={plotsForPrint} users={users} />}
        </div>
    )
};

const enhance = withObservables(['currentUser'], ({ currentUser }: { currentUser: User }) => {
    const database = useDatabase();
    const { of } = window.rxjs;
    const { map, switchMap } = window.rxjs.operators;

    const isSuperAdmin = currentUser.groupId === 'group-super-admin';
    
    // For super admin, fetch all farmers directly.
    if (isSuperAdmin) {
        return {
            farmers: database.get<FarmerModel>('farmers').query(Q.where('sync_status', Q.notEq('pending_delete'))).observe(),
        };
    }

    // For regular users, fetch based on consent.
    // 1. Get an observable of farmer IDs from the consent table.
    const farmerIds$ = database.get<FarmerDealerConsentModel>('farmer_dealer_consents').query(
        Q.where('tenant_id', currentUser.tenantId),
        Q.where('is_active', true)
    ).observe().pipe(
        map(consents => consents.map(c => c.farmerId))
    );

    // 2. Use the farmer IDs to get an observable of farmer records.
    const farmers$ = farmerIds$.pipe(
        switchMap((ids: string[]) => {
            if (ids.length === 0) {
                return of([]); // Return an observable of an empty array if no consents.
            }
            return database.get<FarmerModel>('farmers').query(
                Q.where('id', Q.oneOf(ids)),
                Q.where('sync_status', Q.notEq('pending_delete'))
            ).observe();
        })
    );
    
    return {
        farmers: farmers$,
    };
});


export default enhance(FarmerDirectoryPage as React.FC<FarmerDirectoryPageProps>);
