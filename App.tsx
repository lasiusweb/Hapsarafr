import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Farmer, User, Group, Permission, PaymentStage, ActivityType, Filters, AppContent, FarmerStatus, District, Tenant } from './types';
import FilterBar from './components/FilterBar';
import FarmerList from './components/FarmerList';
import { useDatabase } from './DatabaseContext';
import { Q, Query, Model } from '@nozbe/watermelondb';
import { FarmerModel, SubsidyPaymentModel, ActivityLogModel, UserModel, GroupModel, AppContentCacheModel, DistrictModel, MandalModel, VillageModel, TenantModel } from './db';
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

// --- New Alert System ---
interface Alert {
    id: string; // farmerId + stage
    farmerId: string;
    farmerName: string;
    message: string;
    timestamp: number;
    read: boolean;
}

function timeAgo(timestamp: number): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const AlertsPanel: React.FC<{
    alerts: Alert[];
    isOpen: boolean;
    onClose: () => void;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onNavigate: (path: string) => void;
}> = ({ alerts, isOpen, onClose, onMarkAsRead, onMarkAllAsRead, onNavigate }) => {
    if (!isOpen) return null;
    
    const unreadAlerts = alerts.filter(a => !a.read);

    const handleAlertClick = (alert: Alert) => {
        onMarkAsRead(alert.id);
        onNavigate(`farmer-details/${alert.farmerId}`);
        onClose();
    };
    
    return (
        <div className="absolute top-16 right-4 z-50 w-full max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                {unreadAlerts.length > 0 && <button onClick={onMarkAllAsRead} className="text-sm text-green-600 font-semibold hover:underline">Mark all as read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        <p>No new notifications.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {alerts.map(alert => (
                            <li key={alert.id} onClick={() => handleAlertClick(alert)} className={`p-4 hover:bg-gray-50 cursor-pointer ${!alert.read ? 'bg-green-50' : ''}`}>
                                <div className="flex items-start gap-3">
                                    {!alert.read && <div className="mt-1.5 h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></div>}
                                    <div className={alert.read ? 'pl-5' : ''}>
                                        <p className="text-sm text-gray-700">{alert.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">{timeAgo(alert.timestamp)}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};


type View = 'dashboard' | 'farmer-directory' | 'profile' | 'admin' | 'billing' | 'usage-analytics' | 'content-manager' | 'subscription-management' | 'print-queue' | 'subsidy-management' | 'map-view' | 'help' | 'id-verification' | 'reports' | 'crop-health-scanner' | 'data-health' | 'geo-management' | 'schema-manager' | 'tenant-management';
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

    const simpleViews: View[] = ['farmer-directory', 'profile', 'admin', 'billing', 'usage-analytics', 'content-manager', 'subscription-management', 'print-queue', 'subsidy-management', 'map-view', 'help', 'id-verification', 'reports', 'crop-health-scanner', 'data-health', 'geo-management', 'schema-manager', 'tenant-management'];
    if (simpleViews.includes(path as View)) {
        return { view: path as View, params: {} };
    }

    if (path === '' || path === 'dashboard') {
        return { view: 'dashboard', params: {} };
    }

    return { view: 'not-found', params: {} };
};

const getViewTitle = (view: View | 'farmer-details' | 'not-found'): string => {
    const titles: Record<View | 'farmer-details' | 'not-found', string> = {
        'dashboard': 'Dashboard',
        'farmer-directory': 'Farmer Directory',
        'farmer-details': 'Farmer Details',
        'profile': 'My Profile',
        'admin': 'Admin Panel',
        'billing': 'Billing & Usage',
        'usage-analytics': 'Usage Analytics',
        'content-manager': 'Content Manager',
        'subscription-management': 'Subscription Management',
        'print-queue': 'Print Queue',
        'subsidy-management': 'Subsidy Management',
        'map-view': 'Map View',
        'help': 'Help & Support',
        'id-verification': 'ID Verification Tool',
        'reports': 'Reports & Analytics',
        'crop-health-scanner': 'Crop Health Scanner',
        'data-health': 'Data Health',
        'geo-management': 'Geographic Management',
        'schema-manager': 'Schema & Form Manager',
        'tenant-management': 'Tenant Management',
        'not-found': 'Page Not Found',
    };
    return titles[view] || 'Hapsara';
};

const ModalLoader: React.FC<{ message?: string }> = ({ message = "Loading Application..." }) => (
    <div className="fixed inset-0 bg-gray-100 flex flex-col items-center justify-center z-[100]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mb-4"></div>
        <p className="text-lg text-gray-600 font-semibold">{message}</p>
    </div>
);

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
    const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
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
    const allFarmers = useMemo(() => allFarmerModels.map(f => farmerModelToPlain(f) as Farmer), [allFarmerModels]);

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
                 <main className="flex-1 flex flex-col overflow-hidden">
                     <header className="bg-white shadow-md p-4 z-30">
                        <h1 className="text-xl font-semibold">{getViewTitle(parseHash().view)}</h1>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6">
                        <Suspense fallback={<ModalLoader />}>
                           {view === 'farmer-directory' && (
                                <FarmerList
                                    farmers={allFarmers}
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
                                    totalRecords={allFarmers.length}
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
                        </Suspense>
                    </div>
                </main>
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
                            existingFarmers={allFarmers}
                            mode={editingFarmer ? 'edit' : 'create'}
                            existingFarmer={editingFarmer}
                            setNotification={setNotification}
                        />
                    </Suspense>
                )}
            </div>
        );
    }

    return <ModalLoader message="Initializing authentication..." />;
}

export default App;
