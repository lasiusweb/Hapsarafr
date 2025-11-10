import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Database, Q } from '@nozbe/watermelondb';
import { FarmerModel, UserModel, GroupModel, TenantModel } from './db';
import { useDatabase } from './DatabaseContext';
import { useQuery } from './hooks/useQuery';
import { useOnlineStatus } from './hooks/useOnlineStatus';
// FIX: Import FarmerStatus to resolve type errors.
import { Farmer, User, Group, Filters, Permission, Tenant, FarmerStatus } from './types';
import Sidebar from './components/Sidebar';
import FarmerList from './components/FarmerList';
import FilterBar from './components/FilterBar';
import RegistrationForm from './components/RegistrationForm';
import { synchronize } from './lib/sync';
import PrintView from './components/PrintView';
import { exportToExcel, exportToCsv } from './lib/export';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Notification from './components/Notification';
import BatchUpdateStatusModal from './components/BatchUpdateStatusModal';
import ConfirmationModal from './components/ConfirmationModal';
import { initializeSupabase, getSupabase } from './lib/supabase';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import { MOCK_USERS } from './data/userData';
import { DEFAULT_GROUPS } from './data/permissionsData';
import { farmerModelToPlain, plotModelToPlain } from './lib/utils';

const Dashboard = lazy(() => import('./components/Dashboard'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const BulkImportModal = lazy(() => import('./components/BulkImportModal'));
const FarmerDetailsPage = lazy(() => import('./components/FarmerDetailsPage'));
const PrintQueuePage = lazy(() => import('./components/PrintQueuePage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const IdVerificationPage = lazy(() => import('./components/IdVerificationPage'));
const DataHealthPage = lazy(() => import('./components/DataHealthPage'));
const HelpPage = lazy(() => import('./components/HelpPage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));
const ContentManagerPage = lazy(() => import('./components/ContentManagerPage'));
const GeoManagementPage = lazy(() => import('./components/GeoManagementPage'));
const SchemaManagerPage = lazy(() => import('./components/SchemaManagerPage'));
const TenantManagementPage = lazy(() => import('./components/TenantManagementPage'));
const CropHealthScannerPage = lazy(() => import('./components/CropHealthScannerPage'));
const SatelliteAnalysisPage = lazy(() => import('./components/SatelliteAnalysisPage'));
const YieldPredictionPage = lazy(() => import('./components/YieldPredictionPage'));
const PerformanceAnalyticsPage = lazy(() => import('./components/PerformanceAnalyticsPage'));
const TaskManagementPage = lazy(() => import('./components/TaskManagementPage'));
const FinancialLedgerPage = lazy(() => import('./components/FinancialLedgerPage'));
const MapView = lazy(() => import('./components/MapView'));
const SubsidyManagementPage = lazy(() => import('./components/SubsidyManagementPage'));
const AssistanceSchemesPage = lazy(() => import('./components/AssistanceSchemesPage'));
const QualityAssessmentPage = lazy(() => import('./components/QualityAssessmentPage'));
const ProcessingPage = lazy(() => import('./components/ProcessingPage'));
const EquipmentManagementPage = lazy(() => import('./components/EquipmentManagementPage'));
const FinancialDashboardPage = lazy(() => import('./components/FinancialDashboardPage'));
const AgriStorePage = lazy(() => import('./components/AgriStorePage'));
const EquipmentAccessProgramPage = lazy(() => import('./components/EquipmentAccessProgramPage'));


type ViewType = 'dashboard' | 'farmer-directory' | 'register-farmer' | 'profile' | 'admin' | 'farmer-details' | 'print-queue' | 'reports' | 'id-verification' | 'data-health' | 'help' | 'content-manager' | 'geo-management' | 'schema-manager' | 'tenant-management' | 'crop-health' | 'satellite-analysis' | 'yield-prediction' | 'performance-analytics' | 'task-management' | 'financial-ledger' | 'map-view' | 'subsidy-management' | 'assistance-schemes' | 'quality-assessment' | 'processing-transparency' | 'equipment-management'| 'financial-dashboard' | 'agri-store' | 'equipment-access';

const App: React.FC = () => {
    const database = useDatabase();
    const [currentView, setCurrentView] = useState<ViewType>('dashboard');
    const [viewParam, setViewParam] = useState<string | null>(null);
    const isOnline = useOnlineStatus();
    
    // Auth & User State
    const [session, setSession] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [initialAuthCheck, setInitialAuthCheck] = useState(false);
    const [showLandingPage, setShowLandingPage] = useState(true);
    
    // Data State
    const allFarmersQuery = useMemo(() => database.get<FarmerModel>('farmers').query(), [database]);
    const allFarmers = useQuery(allFarmersQuery);
    const allUsersQuery = useMemo(() => database.get<UserModel>('users').query(), [database]);
    const allUsers = useQuery(allUsersQuery);
    const allGroupsQuery = useMemo(() => database.get<GroupModel>('groups').query(), [database]);
    const allGroups = useQuery(allGroupsQuery);
    const allTenantsQuery = useMemo(() => database.get<TenantModel>('tenants').query(), [database]);
    const allTenants = useQuery(allTenantsQuery);
    
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>({ searchQuery: '', district: '', mandal: '', village: '', status: '', registrationDateFrom: '', registrationDateTo: '' });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    // Modals & Notifications
    const [showRegistrationForm, setShowRegistrationForm] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Sync state
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // PDF/Print state
    const [farmerToPrint, setFarmerToPrint] = useState<FarmerModel | null>(null);
    const [pdfExportData, setPdfExportData] = useState<{ farmer: FarmerModel, plots: any[] } | null>(null);
    const [printQueue, setPrintQueue] = useState<string[]>([]);
    
    // Edit state
    const [farmerToEdit, setFarmerToEdit] = useState<FarmerModel | null>(null);
    
    // Selection for batch actions
    const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
    const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    // Highlight new farmer
    const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [listViewMode, setListViewMode] = useState<'table' | 'grid'>('table');
    
    const supabase = useMemo(() => initializeSupabase(), []);

    // --- Auth Effects ---
    useEffect(() => {
        if (!supabase) {
            setInitialAuthCheck(true);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }: any) => {
            setSession(session);
            setInitialAuthCheck(true);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    useEffect(() => {
        if (session) {
            // In a real app, you'd fetch the user profile from your DB based on session.user.id
            // For this PoC, we'll find a mock user by email.
            const user = MOCK_USERS.find(u => u.email === session.user.email);
            setCurrentUser(user || MOCK_USERS[2]); // Default to data entry if not found
            setShowLandingPage(false);
        } else {
            setCurrentUser(null);
        }
    }, [session]);

    // --- Routing ---
    const handleNavigation = useCallback((view: ViewType, param: string | null = null) => {
        if (view === 'farmer-details' && param) {
            window.location.hash = `/${view}/${param}`;
        } else if (view === 'register-farmer') {
            setFarmerToEdit(null);
            setShowRegistrationForm(true);
        }
        else {
            window.location.hash = `/${view}`;
        }
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#/', '');
            const [view, param] = hash.split('/');
            setCurrentView((view as ViewType) || 'dashboard');
            setViewParam(param || null);
        };
        window.addEventListener('hashchange', handleHashChange, false);
        handleHashChange(); // Initial load
        return () => window.removeEventListener('hashchange', handleHashChange, false);
    }, []);

    const navigateWithFilter = (view: ViewType, newFilters: Partial<Omit<Filters, 'searchQuery' | 'registrationDateFrom' | 'registrationDateTo'>>) => {
        setFilters(prev => ({...prev, ...newFilters}));
        handleNavigation(view);
    };

    // --- User Permissions ---
    const userPermissions = useMemo(() => {
        if (!currentUser) return new Set<Permission>();
        const group = allGroups.find(g => g.id === currentUser.groupId);
        return new Set(group ? group.permissions : []);
    }, [currentUser, allGroups]);

    const canEdit = userPermissions.has(Permission.CAN_EDIT_FARMER);
    const canDelete = userPermissions.has(Permission.CAN_DELETE_FARMER);
    const isSuperAdmin = currentUser?.groupId === 'group-super-admin';
    
    // --- Data Handlers ---

    const handleRegisterFarmer = useCallback(async (farmerData: Farmer, photoFile?: File) => {
        let photoBase64 = '';
        if (photoFile) {
            photoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(photoFile);
            });
        }
        
        await database.write(async () => {
            const newFarmer = await database.get<FarmerModel>('farmers').create(farmer => {
                const { id, createdAt, updatedAt, ...rest } = farmerData;
                Object.assign(farmer, {
                    ...rest,
                    photo: photoBase64,
                    syncStatusLocal: 'pending',
                    createdBy: currentUser?.id,
                    updatedBy: currentUser?.id,
                    tenantId: currentUser?.tenantId,
                });
            });
            setNewlyAddedFarmerId(newFarmer.id);
        });
        setShowRegistrationForm(false);
        setNotification({ message: 'Farmer registered successfully!', type: 'success' });
    }, [database, currentUser]);
    
     const handleUpdateFarmer = useCallback(async (updatedFarmerData: Farmer, photoFile?: File) => {
        if (!farmerToEdit) return;

        let photoBase64 = updatedFarmerData.photo;
        if (photoFile) {
            photoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(photoFile);
            });
        }

        await database.write(async () => {
            await farmerToEdit.update(farmer => {
                const { id, createdAt, createdBy, farmerId, applicationId, asoId, ...updatableData } = updatedFarmerData;
                Object.assign(farmer, {
                    ...updatableData,
                    photo: photoBase64,
                    syncStatusLocal: 'pending',
                    updatedBy: currentUser?.id,
                });
            });
        });
        setShowRegistrationForm(false);
        setFarmerToEdit(null);
        setNotification({ message: 'Farmer details updated successfully.', type: 'success' });
    }, [database, farmerToEdit, currentUser?.id]);
    
    const handleEditFarmer = (farmerId: string) => {
        const farmer = allFarmers.find(f => f.id === farmerId);
        if (farmer) {
            setFarmerToEdit(farmer);
            setShowRegistrationForm(true);
        }
    };

    const handleDeleteSelected = () => {
        if(selectedFarmerIds.length > 0) {
            setShowDeleteConfirmation(true);
        }
    };
    
    const handleConfirmDelete = async () => {
        await database.write(async () => {
            // FIX: Import Q from watermelondb to fix query errors.
            const farmersToDelete = await database.get<FarmerModel>('farmers').query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
            for (const farmer of farmersToDelete) {
                // If synced, mark for deletion. If not, delete permanently.
                if (farmer.syncStatusLocal === 'synced') {
                    await farmer.update(f => { f.syncStatusLocal = 'pending_delete'; });
                } else {
                    await farmer.destroyPermanently();
                }
            }
        });
        setNotification({ message: `${selectedFarmerIds.length} farmer(s) marked for deletion.`, type: 'info' });
        setSelectedFarmerIds([]);
        setShowDeleteConfirmation(false);
    };


    const handleBatchUpdateStatus = async (newStatus: FarmerStatus) => {
        await database.write(async () => {
            // FIX: Import Q from watermelondb to fix query errors.
            const farmersToUpdate = await database.get<FarmerModel>('farmers').query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
            for (const farmer of farmersToUpdate) {
                await farmer.update(f => {
                    f.status = newStatus;
                    f.syncStatusLocal = 'pending';
                    f.updatedBy = currentUser?.id;
                });
            }
        });
        setNotification({ message: `Status updated for ${selectedFarmerIds.length} farmer(s).`, type: 'success' });
        setSelectedFarmerIds([]);
        setShowBatchUpdateModal(false);
    };

    // --- Sync & Export Handlers ---
    
    const handleSync = useCallback(async () => {
        if (!supabase) {
            setNotification({ message: 'Cloud sync is not configured.', type: 'error' });
            return;
        }
        setIsSyncing(true);
        try {
            const { pushed, deleted } = await synchronize(database, supabase);
            setLastSync(new Date());
            setNotification({ message: `Sync complete. Pushed ${pushed} and deleted ${deleted} records.`, type: 'success' });
        } catch (error: any) {
            setNotification({ message: `Sync failed: ${error.message}`, type: 'error' });
        } finally {
            setIsSyncing(false);
        }
    }, [database, supabase]);

    const handlePrint = useCallback((farmerId: string) => {
        const farmer = allFarmers.find(f => f.id === farmerId);
        if (farmer) {
            setFarmerToPrint(farmer);
            setTimeout(() => window.print(), 500);
        }
    }, [allFarmers]);
    
    const handleExportToPdf = useCallback(async (farmerId: string) => {
        const farmer = allFarmers.find(f => f.id === farmerId);
        if(farmer) {
            const plots = await farmer.plots.fetch();
            setPdfExportData({ farmer, plots });
            setTimeout(async () => {
                const element = document.getElementById('pdf-print-view');
                if(element) {
                    const canvas = await html2canvas(element, { scale: 2 });
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`${farmer.farmerId}_${farmer.fullName}.pdf`);
                    setPdfExportData(null);
                }
            }, 500);
        }
    }, [allFarmers]);
    
    const handleAddToPrintQueue = (farmerIds: string[]) => {
        setPrintQueue(prev => [...new Set([...prev, ...farmerIds])]);
        setNotification({ message: `${farmerIds.length} farmer(s) added to print queue.`, type: 'info' });
        setSelectedFarmerIds([]); // Clear selection after adding
    };


    // --- Render Logic ---
    if (!initialAuthCheck) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }
    
    if (!currentUser) {
        if (showLandingPage) {
            return <LandingPage onLaunch={() => setShowLandingPage(false)} appContent={null} />;
        }
        return <LoginScreen supabase={supabase} />;
    }
    
    const renderView = () => {
        const farmerListProps = {
            canEdit, canDelete,
            onPrint: handlePrint,
            onExportToPdf: handleExportToPdf,
            onEdit: handleEditFarmer,
            onBatchUpdate: () => setShowBatchUpdateModal(true),
            onDeleteSelected: handleDeleteSelected,
            onNavigate: (path: string) => handleNavigation('farmer-details', path.split('/')[1]),
        };

        switch (currentView) {
            case 'dashboard': return <Dashboard farmers={allFarmers} onNavigateWithFilter={navigateWithFilter} />;
            case 'farmer-directory': return (
                <FarmerList 
                    {...farmerListProps} 
                    farmers={[]} 
                    users={[]} 
                    selectedFarmerIds={selectedFarmerIds}
                    onSelectionChange={() => {}}
                    onSelectAll={() => {}}
                    sortConfig={null}
                    onRequestSort={() => {}}
                    newlyAddedFarmerId={null}
                    onHighlightComplete={() => {}}
                    totalRecords={0}
                    currentPage={1}
                    rowsPerPage={25}
                    onPageChange={() => {}}
                    onRowsPerPageChange={() => {}}
                    isLoading={false}
                    onAddToPrintQueue={handleAddToPrintQueue}
                    listViewMode={listViewMode}
                    onSetListViewMode={setListViewMode}
                    isSuperAdmin={isSuperAdmin}
                    tenants={[]}
                />
            );
            case 'profile': return <ProfilePage currentUser={currentUser} groups={allGroups} onSave={async() => {}} onBack={() => handleNavigation('dashboard')} setNotification={setNotification} />;
            case 'admin': return <AdminPage currentUser={currentUser} users={allUsers} groups={allGroups} onSaveUsers={async() => {}} onSaveGroups={async() => {}} onBack={() => handleNavigation('dashboard')} onNavigate={handleNavigation} setNotification={setNotification} />;
            case 'farmer-details': return viewParam ? <FarmerDetailsPage farmerId={viewParam} users={allUsers} currentUser={currentUser} onBack={() => handleNavigation('farmer-directory')} permissions={userPermissions} setNotification={setNotification} /> : <NotFoundPage onBack={() => handleNavigation('dashboard')} />;
            case 'print-queue': return <PrintQueuePage queuedFarmerIds={printQueue} users={allUsers} onRemove={(id) => setPrintQueue(q => q.filter(i => i !== id))} onClear={() => setPrintQueue([])} onBack={() => handleNavigation('farmer-directory')} />;
            case 'reports': return <ReportsPage allFarmers={allFarmers} onBack={() => handleNavigation('dashboard')} />;
            case 'id-verification': return <IdVerificationPage allFarmers={allFarmers} onBack={() => handleNavigation('dashboard')} />;
            case 'data-health': return <DataHealthPage allFarmers={allFarmers} onNavigate={(path) => handleNavigation('farmer-details', path.split('/')[1])} onBack={() => handleNavigation('dashboard')} />;
            case 'help': return <HelpPage onBack={() => handleNavigation('dashboard')} />;
            case 'content-manager': return <ContentManagerPage supabase={supabase} currentContent={null} onContentSave={() => {}} onBack={() => handleNavigation('admin')} />;
            case 'geo-management': return <GeoManagementPage onBack={() => handleNavigation('admin')} />;
            case 'schema-manager': return <SchemaManagerPage onBack={() => handleNavigation('admin')} />;
            case 'tenant-management': return <TenantManagementPage onBack={() => handleNavigation('admin')} />;
            case 'crop-health': return <CropHealthScannerPage onBack={() => handleNavigation('dashboard')} />;
            case 'satellite-analysis': return <SatelliteAnalysisPage onBack={() => handleNavigation('dashboard')} />;
            case 'yield-prediction': return <YieldPredictionPage allFarmers={allFarmers} onBack={() => handleNavigation('dashboard')} />;
            case 'performance-analytics': return <PerformanceAnalyticsPage onBack={() => handleNavigation('dashboard')} />;
            case 'task-management': return <TaskManagementPage onBack={() => handleNavigation('dashboard')} currentUser={currentUser} />;
            case 'financial-ledger': return <FinancialLedgerPage allFarmers={allFarmers} onBack={() => handleNavigation('dashboard')} currentUser={currentUser} />;
            case 'map-view': return <MapView farmers={allFarmers} onNavigate={(path) => handleNavigation('farmer-details', path.split('/')[1])} />;
            case 'subsidy-management': return <SubsidyManagementPage allFarmers={allFarmers} payments={[]} currentUser={currentUser} onBack={() => handleNavigation('dashboard')} database={database} setNotification={setNotification} />;
            case 'assistance-schemes': return <AssistanceSchemesPage onBack={() => handleNavigation('dashboard')} currentUser={currentUser} setNotification={setNotification} />;
            case 'quality-assessment': return <QualityAssessmentPage onBack={() => handleNavigation('dashboard')} currentUser={currentUser} allFarmers={allFarmers} setNotification={setNotification} />;
            case 'processing-transparency': return <ProcessingPage onBack={() => handleNavigation('dashboard')} currentUser={currentUser} setNotification={setNotification} />;
            case 'equipment-management': return <EquipmentManagementPage onBack={() => handleNavigation('dashboard')} currentUser={currentUser} />;
            case 'financial-dashboard': return <FinancialDashboardPage onBack={() => handleNavigation('dashboard')} currentUser={currentUser} />;
            case 'agri-store': return <AgriStorePage onBack={() => handleNavigation('dashboard')} />;
            case 'equipment-access': return <EquipmentAccessProgramPage onBack={() => handleNavigation('dashboard')} currentUser={currentUser} />;
            default: return <NotFoundPage onBack={() => handleNavigation('dashboard')} />;
        }
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar
                currentView={currentView}
                onNavigate={handleNavigation}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                currentUser={currentUser}
                userPermissions={userPermissions}
            />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
                <main className="flex-1 overflow-y-auto p-6">
                    <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div></div>}>
                        {renderView()}
                    </Suspense>
                </main>
            </div>

            {/* Modals and Overlays */}
            {showRegistrationForm && (
                <RegistrationForm
                    onSubmit={farmerToEdit ? handleUpdateFarmer : handleRegisterFarmer}
                    onCancel={() => { setShowRegistrationForm(false); setFarmerToEdit(null); }}
                    existingFarmers={allFarmers}
                    mode={farmerToEdit ? 'edit' : 'create'}
                    existingFarmer={farmerToEdit ? farmerModelToPlain(farmerToEdit) : null}
                    setNotification={setNotification}
                />
            )}
             {showBulkImportModal && (
                <BulkImportModal
                    onClose={() => setShowBulkImportModal(false)}
                    onSubmit={async (newFarmers) => { /* Logic to add multiple farmers */ }}
                    existingFarmers={allFarmers}
                />
            )}
            {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
            {showBatchUpdateModal && <BatchUpdateStatusModal selectedCount={selectedFarmerIds.length} onUpdate={handleBatchUpdateStatus} onCancel={() => setShowBatchUpdateModal(false)} />}
            {showDeleteConfirmation && <ConfirmationModal isOpen={showDeleteConfirmation} title="Confirm Deletion" message={`Are you sure you want to delete ${selectedFarmerIds.length} farmer(s)? This action cannot be undone.`} onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteConfirmation(false)} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" />}

            {/* Hidden print views */}
            <div className="hidden">
                {farmerToPrint && <PrintView farmer={farmerModelToPlain(farmerToPrint)} plots={[]} users={allUsers} />}
                {pdfExportData && <div id="pdf-print-view"><PrintView farmer={farmerModelToPlain(pdfExportData.farmer)} plots={pdfExportData.plots.map(p => plotModelToPlain(p))} users={allUsers} isForPdf={true} /></div>}
            </div>
        </div>
    );
};

export default App;