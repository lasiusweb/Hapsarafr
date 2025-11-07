import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Farmer, User, Group, Permission, PaymentStage, ActivityType, Filters, AppContent, FarmerStatus, District, Tenant } from './types';
import FilterBar from './components/FilterBar';
import FarmerList from './components/FarmerList';
import { useDatabase } from './DatabaseContext';
import { Q, Query, Model, Database } from '@nozbe/watermelondb';
import { FarmerModel, SubsidyPaymentModel, ActivityLogModel, UserModel, GroupModel, AppContentCacheModel, DistrictModel, MandalModel, VillageModel, TenantModel, ResourceModel } from './db';
import { initializeSupabase } from './lib/supabase';
import { DEFAULT_GROUPS } from './data/permissionsData';
import { MOCK_USERS } from './data/userData';
import { GEO_DATA } from './data/geoData';
import Sidebar from './components/Sidebar';
import Notification from './components/Notification';
import { synchronize } from './lib/sync';
import { exportToExcel, exportToCsv } from './lib/export';
import PrintView from './components/PrintView';
import { farmerModelToPlain, getGeoName, buildGeoNameMap } from './lib/utils';
import { useQuery } from './hooks/useQuery';
import { useDebounce } from './hooks/useDebounce';
import { useOnlineStatus } from './hooks/useOnlineStatus';

// Lazily import components to enable code-splitting
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const BatchUpdateStatusModal = lazy(() => import('./components/BatchUpdateStatusModal'));
const BulkImportModal = lazy(() => import('./components/BulkImportModal'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const ConfirmationModal = lazy(() => import('./components/ConfirmationModal'));
const AcceptInvitation = lazy(() => import('./components/AcceptInvitation'));
const RawDataView = lazy(() => import('./components/RawDataView'));
const BillingPage = lazy(() => import('./components/BillingPage'));
const UsageAnalyticsPage = lazy(() => import('./components/UsageAnalyticsPage'));
const PrivacyModal = lazy(() => import('./components/PrivacyModal'));
const HelpPage = lazy(() => import('./components/HelpPage'));
const ChangelogModal = lazy(() => import('./components/ChangelogModal'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));
const ContentManagerPage = lazy(() => import('./components/ContentManagerPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const SubscriptionManagementPage = lazy(() => import('./components/SubscriptionManagementPage'));
const PrintQueuePage = lazy(() => import('./components/PrintQueuePage'));
const FarmerDetailsPage = lazy(() => import('./components/FarmerDetailsPage'));
const SubsidyManagementPage = lazy(() => import('./components/SubsidyManagementPage'));
const MapView = lazy(() => import('./components/MapView'));
const IdVerificationPage = lazy(() => import('./components/IdVerificationPage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const CropHealthScannerPage = lazy(() => import('./components/CropHealthScannerPage'));
const SupabaseSettingsModal = lazy(() => import('./components/SupabaseSettingsModal'));
const DataHealthPage = lazy(() => import('./components/DataHealthPage'));
const GeoManagementPage = lazy(() => import('./components/GeoManagementPage'));
const SchemaManagerPage = lazy(() => import('./components/SchemaManagerPage'));
const TenantManagementPage = lazy(() => import('./components/TenantManagementPage'));
const ResourceManagementPage = lazy(() => import('./components/ResourceManagementPage'));
const DistributionReportPage = lazy(() => import('./components/DistributionReportPage'));
const DiscussModeModal = lazy(() => import('./components/DiscussModeModal'));
// Phase 3 Placeholders
const YieldPredictionPage = lazy(() => import('./components/YieldPredictionPage'));
const SatelliteAnalysisPage = lazy(() => import('./components/SatelliteAnalysisPage'));
const FinancialLedgerPage = lazy(() => import('./components/FinancialLedgerPage'));
// Phase 2 Placeholders
const TaskManagementPage = lazy(() => import('./components/TaskManagementPage'));


// Type declarations for CDN libraries
declare const html2canvas: any;
declare const jspdf: any;

const initialFilters: Filters = {
  searchQuery: '',
  district: '',
  mandal: '',
  village: '',
  status: '',
  registrationDateFrom: '',
  registrationDateTo: '',
};

type View = 'dashboard' | 'farmer-directory' | 'profile' | 'admin' | 'billing' | 'usage-analytics' | 'content-manager' | 'subscription-management' | 'print-queue' | 'subsidy-management' | 'map-view' | 'help' | 'id-verification' | 'reports' | 'crop-health-scanner' | 'data-health' | 'geo-management' | 'schema-manager' | 'tenant-management' | 'resource-management' | 'distribution-report' | 'yield-prediction' | 'satellite-analysis' | 'financial-ledger' | 'task-management';
type ParsedHash = 
    | { view: View; params: {} }
    | { view: 'farmer-details'; params: { farmerId: string } }
    | { view: 'not-found', params: {} };


// Helper function to get view from hash
const parseHash = (): ParsedHash => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const [path, id] = hash.split('/');
    
    if (path === 'farmer-details' && id) {
        return { view: 'farmer-details', params: { farmerId: id } };
    }

    const simpleViews: View[] = ['farmer-directory', 'profile', 'admin', 'billing', 'usage-analytics', 'content-manager', 'subscription-management', 'print-queue', 'subsidy-management', 'map-view', 'help', 'id-verification', 'reports', 'crop-health-scanner', 'data-health', 'geo-management', 'schema-manager', 'tenant-management', 'resource-management', 'distribution-report', 'yield-prediction', 'satellite-analysis', 'financial-ledger', 'task-management'];
    if (simpleViews.includes(path as View)) {
        return { view: path as View, params: {} };
    }

    if (path === '' || path === 'dashboard') {
        return { view: 'dashboard', params: {} };
    }

    return { view: 'not-found', params: {} };
};

const ModalLoader: React.FC<{ message?: string }> = ({ message = "Loading Application..." }) => (
    <div className="fixed inset-0 bg-gray-100 flex flex-col items-center justify-center z-[100]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mb-4"></div>
        <p className="text-lg text-gray-600 font-semibold">{message}</p>
    </div>
);

const seedInitialData = async (database: Database, tenantId: string) => {
    try {
        const resourcesCollection = database.get<ResourceModel>('resources');
        const existingResources = await resourcesCollection.query(Q.where('tenant_id', tenantId)).fetch();
        
        if (existingResources.length > 0) {
            return; // Data already seeded for this tenant
        }

        const defaultResources = [
            { name: 'Manually Handled Oil Palm Cutter', unit: 'unit', description: 'Assistance: up to ₹2,500/unit' },
            { name: 'Protective Wire Mesh', unit: 'unit', description: 'Assistance: up to ₹20,000/unit' },
            { name: 'Motorized Chisel', unit: 'unit', description: 'Assistance: up to ₹15,000/unit' },
            { name: 'Aluminium Portable Ladder', unit: 'unit', description: 'Assistance: up to ₹5,000/unit' },
            { name: 'Chaff Cutter', unit: 'unit', description: 'Assistance: up to ₹50,000/unit' },
            { name: 'Tractor with Trolley (up to 20 HP)', unit: 'unit', description: 'As per SMAM guidelines' },
        ];

        await database.write(async () => {
            for (const resource of defaultResources) {
                await resourcesCollection.create(r => {
                    r.name = resource.name;
                    r.unit = resource.unit;
                    r.description = resource.description;
                    r.tenantId = tenantId;
                });
            }
        });

        console.log('Default resources seeded successfully.');

    } catch (error) {
        console.error("Failed to seed initial data:", error);
    }
};

const App: React.FC = () => {
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const [appState, setAppState] = useState<string>('LOADING'); // LOADING, LANDING, AUTH, APP
    const [supabase, setSupabase] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentTenantName, setCurrentTenantName] = useState<string | null>(null);
  
    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [currentHash, setCurrentHash] = useState(window.location.hash);
    const [isShowingRegistrationForm, setIsShowingRegistrationForm] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState<FarmerModel | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [farmerToPrint, setFarmerToPrint] = useState<Farmer | null>(null);
    const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
    const [isBatchUpdateModalOpen, setIsBatchUpdateModalOpen] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [isRawDataViewOpen, setIsRawDataViewOpen] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showChangelogModal, setShowChangelogModal] = useState(false);
    const [printQueue, setPrintQueue] = useState<string[]>([]);
    const [showSupabaseSettingsModal, setShowSupabaseSettingsModal] = useState(false);
    const [listViewMode, setListViewMode] = useState<'table' | 'grid'>('table');
    const [isDiscussModeOpen, setIsDiscussModeOpen] = useState(false);

    // Data State
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Farmer | 'id' | 'tenantId'; direction: 'ascending' | 'descending' } | null>({ key: 'registrationDate', direction: 'descending' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);

    // Data Queries
    const allGroups = useQuery(useMemo(() => database.get<GroupModel>('groups').query(), [database]));
    const allTenants = useQuery(useMemo(() => database.get<TenantModel>('tenants').query(), [database]));
    const allFarmerModels = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const allPaymentModels = useQuery(useMemo(() => database.get<SubsidyPaymentModel>('subsidy_payments').query(), [database]));
    const allActivityLogModels = useQuery(useMemo(() => database.get<ActivityLogModel>('activity_logs').query(), [database]));
    const appContentRecord = useQuery(useMemo(() => database.get<AppContentCacheModel>('app_content_cache').query(), [database]));
    
    // Derived plain data
    const allUsersFromDB = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));
    const plainUsers = useMemo(() => allUsersFromDB.map(u => ({ id: u.id, name: u.name, email: u.email!, avatar: u.avatar, groupId: u.groupId, tenantId: u.tenantId, is_verified: u.isVerified! })), [allUsersFromDB]);
    const plainGroups = useMemo(() => allGroups.map(g => ({ id: g.id, name: g.name, permissions: g.parsedPermissions, tenantId: g.tenantId })), [allGroups]);
    // FIX: Convert FarmerModel[] to Farmer[] to satisfy component prop types.
    const plainFarmers: Farmer[] = useMemo(() => allFarmerModels.map(farmerModelToPlain).filter((f): f is Farmer => f !== null), [allFarmerModels]);

    // Seed initial data effect
    useEffect(() => {
        if (database && currentUser) {
            seedInitialData(database, currentUser.tenantId);
        }
    }, [database, currentUser]);
    
    useEffect(() => {
      const sp = initializeSupabase();
      setSupabase(sp);
  
      if (!sp) {
        setAppState('LANDING'); // Fallback if Supabase isn't configured
        return;
      }
  
      const { data: { subscription } } = sp.auth.onAuthStateChange(async (_event: string, session: any) => {
        if (session?.user) {
          const userEmail = session.user.email;
          if (userEmail) {
            const users = await database.get<UserModel>('users').query(Q.where('email', userEmail)).fetch();
            if (users.length > 0) {
              const userModel = users[0];
              const plainUser: User = { id: userModel.id, name: userModel.name, email: userModel.email!, avatar: userModel.avatar, groupId: userModel.groupId, tenantId: userModel.tenantId, is_verified: userModel.isVerified! };
              
              if (!userModel.isVerified) {
                  await database.write(async () => {
                      await userModel.update(u => { u.isVerified = true; });
                  });
              }

              setCurrentUser(plainUser);
              const tenantModel = await database.get<TenantModel>('tenants').find(plainUser.tenantId);
              setCurrentTenantName(tenantModel.name);
              setAppState('APP');

            } else {
              setNotification({ message: 'User profile not found locally. Contact admin.', type: 'error' });
              await sp.auth.signOut();
            }
          }
        } else {
          setCurrentUser(null);
          setCurrentTenantName(null);
          setAppState('AUTH');
        }
      });
  
      sp.auth.getSession().then(({ data: { session } }: any) => {
        if (!session) {
          setAppState('LANDING');
        }
      });
  
      return () => subscription.unsubscribe();
    }, [database]);


    const handleLogout = async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
        setAppState('AUTH');
    };

    const handleRegisterFarmer = async (farmerData: Farmer, photoFile?: File) => {
        const farmersCollection = database.get<FarmerModel>('farmers');
        await database.write(async () => {
            let photoBase64 = farmerData.photo;
            if (photoFile) {
                photoBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(photoFile);
                });
            }

            await farmersCollection.create(f => {
                Object.assign(f, {
                    ...farmerData,
                    id: farmerData.id,
                    photo: photoBase64,
                    syncStatusLocal: 'pending',
                    createdBy: currentUser!.id,
                    updatedBy: currentUser!.id,
                    tenantId: currentUser!.tenantId
                });
                f._raw.id = farmerData.id;
            });
        });
        setNewlyAddedFarmerId(farmerData.id);
    };
    
    const handleSaveProfile = async (updatedUser: User) => {
        const usersCollection = database.get<UserModel>('users');
        const userToUpdate = await usersCollection.find(updatedUser.id);
        await database.write(async () => {
            await userToUpdate.update(user => {
                user.name = updatedUser.name;
                user.avatar = updatedUser.avatar;
            });
        });
        setCurrentUser(updatedUser);
    };

    const handleSaveUsers = async (updatedUsers: User[]) => {
        const usersCollection = database.get<UserModel>('users');
        await database.write(async () => {
            for (const updatedUser of updatedUsers) {
                const userToUpdate = await usersCollection.find(updatedUser.id);
                await userToUpdate.update(user => {
                    user.groupId = updatedUser.groupId;
                });
            }
        });
    };
    const handleSaveGroups = async (updatedGroups: Group[]) => {
        const groupsCollection = database.get<GroupModel>('groups');
        await database.write(async () => {
            for (const updatedGroup of updatedGroups) {
                try {
                    const groupToUpdate = await groupsCollection.find(updatedGroup.id);
                    await groupToUpdate.update(group => {
                        group.name = updatedGroup.name;
                        group.permissionsStr = JSON.stringify(updatedGroup.permissions);
                    });
                } catch (error) { // It might be a new group
                    if (String(error).includes('not found')) {
                        await groupsCollection.create(group => {
                            group._raw.id = updatedGroup.id;
                            group.name = updatedGroup.name;
                            group.permissionsStr = JSON.stringify(updatedGroup.permissions);
                            group.tenantId = updatedGroup.tenantId;
                        });
                    } else {
                        throw error;
                    }
                }
            }
        });
    };

    if (appState === 'LOADING') {
        return <ModalLoader />;
    }

    if (appState === 'LANDING') {
        return (
            <Suspense fallback={<ModalLoader />}>
                <LandingPage onLaunch={() => setAppState('AUTH')} appContent={null} />
            </Suspense>
        );
    }
    
    if (appState === 'AUTH') {
        return (
            <Suspense fallback={<ModalLoader />}>
                <LoginScreen supabase={supabase} />
            </Suspense>
        );
    }
    
    if (appState === 'APP' && currentUser) {
        const parsed = parseHash();
        const { view, params } = parsed;
        const isSuperAdmin = currentUser.groupId === 'group-super-admin';
        const tenants: Tenant[] = allTenants.map(t => ({ id: t.id, name: t.name, subscriptionStatus: t.subscriptionStatus, createdAt: new Date(t.createdAt).toISOString() }));

        return (
            <div className="flex h-screen bg-gray-100">
                <Suspense fallback={<div />}>
                    <Sidebar 
                        isOpen={isSidebarOpen}
                        isCollapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(c => !c)}
                        currentUser={currentUser}
                        currentTenantName={currentTenantName}
                        onLogout={handleLogout}
                        onNavigate={(path) => window.location.hash = path}
                        currentView={parseHash().view as View}
                        permissions={new Set(plainGroups.find(g => g.id === currentUser.groupId)?.permissions)}
                        onImport={() => {}}
                        onExportExcel={() => {}}
                        onExportCsv={() => {}}
                        onViewRawData={() => {}}
                        onShowPrivacy={() => {}}
                        onShowChangelog={() => {}}
                        printQueueCount={0}
                        onShowSupabaseSettings={() => {}}
                    />
                </Suspense>
                <div className="flex-1 flex flex-col overflow-auto p-6">
                    <Suspense fallback={<ModalLoader />}>
                       {view === 'dashboard' && (
                            <Dashboard 
                                farmers={plainFarmers}
                                onNavigateWithFilter={() => {
                                    // This will be implemented in a future phase
                                }}
                            />
                        )}
                       {view === 'farmer-directory' && (
                            <FarmerList
                                farmers={plainFarmers}
                                users={plainUsers}
                                tenants={tenants}
                                isSuperAdmin={isSuperAdmin}
                                canEdit={true}
                                canDelete={true}
                                onPrint={() => {}}
                                onExportToPdf={() => {}}
                                selectedFarmerIds={[]}
                                onSelectionChange={() => {}}
                                onSelectAll={() => {}}
                                sortConfig={sortConfig}
                                onRequestSort={(key) => {}}
                                newlyAddedFarmerId={null}
                                onHighlightComplete={() => {}}
                                onBatchUpdate={() => {}}
                                onDeleteSelected={() => {}}
                                totalRecords={allFarmerModels.length}
                                currentPage={1}
                                rowsPerPage={10}
                                onPageChange={() => {}}
                                onRowsPerPageChange={() => {}}
                                isLoading={false}
                                onAddToPrintQueue={() => {}}
                                onNavigate={(path) => window.location.hash = path}
                                listViewMode={listViewMode}
                                onSetListViewMode={setListViewMode}
                            />
                        )}
                        {view === 'profile' && (
                            <ProfilePage
                                currentUser={currentUser}
                                groups={plainGroups}
                                onSave={handleSaveProfile}
                                onBack={() => window.location.hash = 'dashboard'}
                                setNotification={setNotification}
                            />
                        )}
                        {view === 'admin' && (
                            <AdminPage
                                users={plainUsers}
                                groups={plainGroups}
                                currentUser={currentUser}
                                onSaveUsers={handleSaveUsers}
                                onSaveGroups={handleSaveGroups}
                                onBack={() => window.location.hash = 'dashboard'}
                                onNavigate={(v) => window.location.hash = v}
                                setNotification={setNotification}
                            />
                        )}
                        {view === 'help' && (
                           <HelpPage onBack={() => window.location.hash = 'dashboard'} />
                        )}
                        {view === 'reports' && (
                            <ReportsPage allFarmers={plainFarmers} onBack={() => window.location.hash = 'dashboard'} />
                        )}
                        {view === 'crop-health-scanner' && (
                            <CropHealthScannerPage onBack={() => window.location.hash = 'dashboard'} />
                        )}
                        {view === 'resource-management' && (
                            <ResourceManagementPage onBack={() => window.location.hash = 'admin'} />
                        )}
                        {view === 'distribution-report' && (
                            <DistributionReportPage onBack={() => window.location.hash = 'dashboard'} />
                        )}
                        {view === 'farmer-details' && 'farmerId' in params && (
                            <FarmerDetailsPage
                                farmerId={params.farmerId}
                                users={plainUsers}
                                currentUser={currentUser}
                                onBack={() => window.location.hash = 'farmer-directory'}
                                permissions={new Set(plainGroups.find(g => g.id === currentUser.groupId)?.permissions)}
                                setNotification={setNotification}
                            />
                        )}
                        {/* Phase 3 Placeholders */}
                        {view === 'yield-prediction' && <YieldPredictionPage onBack={() => window.location.hash = 'dashboard'} />}
                        {view === 'satellite-analysis' && <SatelliteAnalysisPage onBack={() => window.location.hash = 'dashboard'} />}
                        {view === 'financial-ledger' && <FinancialLedgerPage onBack={() => window.location.hash = 'dashboard'} />}
                        {/* Phase 2 Placeholders */}
                        {view === 'task-management' && <TaskManagementPage onBack={() => window.location.hash = 'dashboard'} currentUser={currentUser} />}
                    </Suspense>
                </div>
                {notification && (
                    <Notification
                        message={notification.message}
                        type={notification.type}
                        onDismiss={() => setNotification(null)}
                    />
                )}
                 {isShowingRegistrationForm && (
                    <Suspense fallback={<ModalLoader />}>
                        <RegistrationForm
                            onSubmit={handleRegisterFarmer}
                            onCancel={() => {
                                setIsShowingRegistrationForm(false);
                                setEditingFarmer(null);
                            }}
                            existingFarmers={plainFarmers}
                            mode={editingFarmer ? 'edit' : 'create'}
                            existingFarmer={farmerModelToPlain(editingFarmer)}
                            setNotification={setNotification}
                        />
                    </Suspense>
                )}
                 {/* --- Floating Action Buttons --- */}
                <button
                    onClick={() => setIsDiscussModeOpen(true)}
                    className="fixed bottom-6 right-6 bg-green-600 text-white rounded-full p-4 shadow-lg hover:bg-green-700 transition-transform transform hover:scale-110 z-30"
                    title="Open Discuss Mode"
                    aria-label="Open Discuss Mode"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.45 1.18a1 1 0 01.548 1.564l-3.6 3.296 1.056 4.882a1 1 0 01-1.479 1.054L12 16.222l-4.12 2.85a1 1 0 01-1.479-1.054l1.056-4.882-3.6-3.296a1 1 0 01.548-1.564L8.854 7.2 10.033 2.744A1 1 0 0112 2z" clipRule="evenodd" />
                    </svg>
                </button>
                <Suspense fallback={<div/>}>
                    {isDiscussModeOpen && <DiscussModeModal onClose={() => setIsDiscussModeOpen(false)} />}
                </Suspense>
            </div>
        );
    }

    return <ModalLoader message="Initializing authentication..." />;
}

export default App;