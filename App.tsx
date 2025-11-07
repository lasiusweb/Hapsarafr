import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Farmer, User, Group, Permission, PaymentStage, ActivityType, Filters, AppContent, FarmerStatus } from './types';
import FilterBar from './components/FilterBar';
import FarmerList from './components/FarmerList';
import { useDatabase } from './DatabaseContext';
import { Q, Query, Model } from '@nozbe/watermelondb';
import { FarmerModel, SubsidyPaymentModel, ActivityLogModel, UserModel, GroupModel } from './db';
import { initializeSupabase } from './lib/supabase';
import { DEFAULT_GROUPS } from './data/permissionsData';
import { MOCK_USERS } from './data/userData';
import Sidebar from './components/Sidebar';
import Notification from './components/Notification';
import { synchronize } from './lib/sync';
import { exportToExcel, exportToCsv } from './lib/export';
import PrintView from './components/PrintView';
import { farmerModelToPlain, getGeoName } from './lib/utils';
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


type View = 'dashboard' | 'farmer-directory' | 'profile' | 'admin' | 'billing' | 'usage-analytics' | 'content-manager' | 'subscription-management' | 'print-queue' | 'subsidy-management' | 'map-view' | 'help' | 'id-verification' | 'reports' | 'crop-health-scanner';
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

    const simpleViews: View[] = ['farmer-directory', 'profile', 'admin', 'billing', 'usage-analytics', 'content-manager', 'subscription-management', 'print-queue', 'subsidy-management', 'map-view', 'help', 'id-verification', 'reports', 'crop-health-scanner'];
    if (simpleViews.includes(path as View)) {
        return { view: path as View, params: {} };
    }

    if (path === '' || path === 'dashboard') {
        return { view: 'dashboard', params: {} };
    }

    return { view: 'not-found', params: {} };
};

const ModalLoader: React.FC = () => (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[100]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
    </div>
);

const App: React.FC = () => {
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const [appState, setAppState] = useState<string>('LANDING'); // 'LANDING', 'LOGIN', 'APP'
    const [supabase, setSupabase] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
  
    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [currentHash, setCurrentHash] = useState(window.location.hash);
    const [isShowingRegistrationForm, setIsShowingRegistrationForm] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  
    // Modals visibility
    const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [showRawDataView, setShowRawDataView] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showSupabaseSettings, setShowSupabaseSettings] = useState(false);
  
    // Data and list state
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Farmer | 'id'; direction: 'ascending' | 'descending' } | null>({ key: 'createdAt', direction: 'descending' });
    const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
    const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [printQueue, setPrintQueue] = useState<string[]>([]);
    const [farmerForPrinting, setFarmerForPrinting] = useState<Farmer | null>(null);

    // Sync & Notification State
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [appContent, setAppContent] = useState<Partial<AppContent> | null>(null);

    // Alert System State
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false);
    
    // --- WatermelonDB Queries ---
    const farmersQuery = useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('syncStatus', Q.notEq('pending_delete'))), [database]);
    const allFarmers = useQuery(farmersQuery);
    const paymentsQuery = useMemo(() => database.get<SubsidyPaymentModel>('subsidy_payments').query(), [database]);
    const allPayments = useQuery(paymentsQuery);
    const usersQuery = useMemo(() => database.get<UserModel>('users').query(), [database]);
    const dbUsers = useQuery(usersQuery);
    const groupsQuery = useMemo(() => database.get<GroupModel>('groups').query(), [database]);
    const dbGroups = useQuery(groupsQuery);

    const users = useMemo(() => dbUsers.map(u => ({ id: u.id, name: u.name, avatar: u.avatar, groupId: u.groupId })), [dbUsers]);
    const groups = useMemo(() => dbGroups.map(g => ({ id: g.id, name: g.name, permissions: g.permissions })), [dbGroups]);

    const allPlainFarmers = useMemo(() => allFarmers.map(f => farmerModelToPlain(f)).filter(Boolean) as Farmer[], [allFarmers]);
    
    // --- Database Seeding Effect ---
    useEffect(() => {
        const seedDatabase = async () => {
            const groupsCount = await database.collections.get('groups').query().fetchCount();
            if (groupsCount === 0) {
                console.log('Seeding database with default groups and users...');
                await database.write(async () => {
                    const groupCollection = database.collections.get('groups');
                    for (const group of DEFAULT_GROUPS) {
                        await groupCollection.create(g => {
                            (g as any)._raw.id = group.id;
                            (g as GroupModel).name = group.name;
                            (g as GroupModel).permissionsStr = JSON.stringify(group.permissions);
                        });
                    }
                    const userCollection = database.collections.get('users');
                    for (const user of MOCK_USERS) {
                         await userCollection.create(u => {
                            (u as any)._raw.id = user.id;
                            (u as UserModel).name = user.name;
                            (u as UserModel).avatar = user.avatar;
                            (u as UserModel).groupId = user.groupId;
                        });
                    }
                });
                console.log('Database seeding complete.');
            }
        };
        seedDatabase();
    }, [database]);


    const handleLogin = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setCurrentUser(user);
            setAppState('APP');
            window.location.hash = 'dashboard';
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setAppState('LOGIN');
    };
    
    const handleSupabaseConnect = useCallback(() => {
        const sup = initializeSupabase();
        setSupabase(sup);
    }, []);

    const fetchAppContent = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('app_content').select('key, value');
            if (error) {
                console.error("Error fetching app content:", error);
                setNotification({ message: 'Could not load site content.', type: 'error' });
                return;
            }
            if (!data) return;

            const content = data.reduce((acc: Partial<AppContent>, row: any) => {
                if (row.key === 'landing_page') {
                    acc.landing_hero_title = row.value.hero_title;
                    acc.landing_hero_subtitle = row.value.hero_subtitle;
                    acc.landing_about_us = row.value.about_us;
                } else if (row.key === 'privacy_policy') {
                    acc.privacy_policy = row.value.content;
                } else if (row.key === 'faqs') {
                    acc.faqs = row.value.items;
                }
                return acc;
            }, {} as Partial<AppContent>);
            setAppContent(content);
        } catch (e: any) {
            console.error("Error processing app content:", e);
        }
    }, [supabase]);

    useEffect(() => {
        handleSupabaseConnect();
    }, [handleSupabaseConnect]);

    useEffect(() => {
        if (supabase) {
            fetchAppContent();
        }
    }, [supabase, fetchAppContent]);

    // Effect for Alert Generation
    useEffect(() => {
        const ALERT_STORAGE_KEY = 'hapsara-alerts';
        const storedAlerts: Alert[] = JSON.parse(localStorage.getItem(ALERT_STORAGE_KEY) || '[]');
        const newAlerts: Alert[] = [];
        
        const paymentsByFarmerId = new Map<string, SubsidyPaymentModel[]>();
        allPayments.forEach(p => {
            const list = paymentsByFarmerId.get(p.farmerId) || [];
            list.push(p);
            paymentsByFarmerId.set(p.farmerId, list);
        });

        allPlainFarmers.forEach(farmer => {
            const farmerPayments = paymentsByFarmerId.get(farmer.id) || [];
            const now = new Date();
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
            const plantationDate = farmer.plantationDate ? new Date(farmer.plantationDate) : null;

            const year1Payment = farmerPayments.find(p => p.paymentStage === PaymentStage.Year1);
            const year2Payment = farmerPayments.find(p => p.paymentStage === PaymentStage.Year2);
            const year3Payment = farmerPayments.find(p => p.paymentStage === PaymentStage.Year3);
            
            const isEligibleForYear2 = year1Payment && plantationDate && plantationDate <= oneYearAgo;
            if (!year2Payment && isEligibleForYear2) {
                const alertId = `${farmer.id}-${PaymentStage.Year2}`;
                if (!storedAlerts.some(a => a.id === alertId) && !newAlerts.some(a => a.id === alertId)) {
                    newAlerts.push({
                        id: alertId,
                        farmerId: farmer.id,
                        farmerName: farmer.fullName,
                        message: `${farmer.fullName} is now eligible for Year 2 Subsidy.`,
                        timestamp: Date.now(),
                        read: false,
                    });
                }
            }

            const isEligibleForYear3 = year2Payment && plantationDate && plantationDate <= twoYearsAgo;
            if (!year3Payment && isEligibleForYear3) {
                 const alertId = `${farmer.id}-${PaymentStage.Year3}`;
                if (!storedAlerts.some(a => a.id === alertId) && !newAlerts.some(a => a.id === alertId)) {
                    newAlerts.push({
                        id: alertId,
                        farmerId: farmer.id,
                        farmerName: farmer.fullName,
                        message: `${farmer.fullName} is now eligible for Year 3 Subsidy.`,
                        timestamp: Date.now(),
                        read: false,
                    });
                }
            }
        });

        if (newAlerts.length > 0) {
            const updatedAlerts = [...newAlerts, ...storedAlerts].sort((a,b) => b.timestamp - a.timestamp);
            setAlerts(updatedAlerts);
            localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(updatedAlerts));
        } else {
            setAlerts(storedAlerts.sort((a,b) => b.timestamp - a.timestamp));
        }
    }, [allPlainFarmers, allPayments]);

    // Effect to count pending sync items
    useEffect(() => {
        const farmersPendingQuery = database.collections.get('farmers').query(Q.where('syncStatus', Q.notEq('synced')));
        const paymentsPendingQuery = database.collections.get('subsidy_payments').query(Q.where('syncStatus', Q.notEq('synced')));
        
        const farmerSub = farmersPendingQuery.observeCount().subscribe(farmerCount => {
            paymentsPendingQuery.observeCount().subscribe(paymentCount => {
                setPendingSyncCount(farmerCount + paymentCount);
            });
        });

        return () => farmerSub.unsubscribe();
    }, [database]);

    const handleNavigate = (path: string) => {
        window.location.hash = path;
    };

    const handleNavigateWithFilter = (view: 'farmer-directory', newFilters: Partial<Filters>) => {
        setFilters({ ...initialFilters, ...newFilters });
        handleNavigate(view);
        setCurrentPage(1);
    };

    const parsedHash = useMemo(() => parseHash(), [currentHash]);

    useEffect(() => {
      const handleHashChange = () => setCurrentHash(window.location.hash);
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const permissions = useMemo(() => {
        if (!currentUser) return new Set();
        const userGroup = groups.find(g => g.id === currentUser.groupId);
        return new Set(userGroup?.permissions || []);
    }, [currentUser, groups]);

    const handleSaveFarmer = useCallback(async (farmerData: Farmer, photoFile?: File) => {
        const farmersCollection = database.get<FarmerModel>('farmers');
        const activityLogsCollection = database.get<ActivityLogModel>('activity_logs');
        let photoBase64 = farmerData.photo;

        if (photoFile) {
            photoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(photoFile);
            });
        }
        
        await database.write(async writer => {
            if (editingFarmer) {
                const farmerToUpdate = await farmersCollection.find(editingFarmer.id);
                const oldStatus = farmerToUpdate.status;

                if (oldStatus !== farmerData.status) {
                    await activityLogsCollection.create(log => {
                        log.farmerId = farmerToUpdate.id;
                        log.activityType = ActivityType.STATUS_CHANGE;
                        log.description = `Status changed from ${oldStatus} to ${farmerData.status}.`;
                        log.createdBy = currentUser?.id;
                    }, writer);
                }

                await farmerToUpdate.update(record => {
                    const { id, createdAt, updatedAt, createdBy, ...updatableData } = farmerData;
                    Object.assign(record, { ...updatableData, photo: photoBase64, syncStatusLocal: 'pending', updatedBy: currentUser?.id });
                }, writer);
            } else {
                await farmersCollection.create(record => {
                    Object.assign(record, { ...farmerData, photo: photoBase64, syncStatusLocal: 'pending', createdBy: currentUser?.id, updatedBy: currentUser?.id });
                    record._raw.id = farmerData.id;
                }, writer);

                await activityLogsCollection.create(log => {
                    log.farmerId = farmerData.id;
                    log.activityType = ActivityType.REGISTRATION;
                    const villageName = getGeoName('village', { district: farmerData.district, mandal: farmerData.mandal, village: farmerData.village });
                    log.description = `Farmer registered in ${villageName}.`;
                    log.createdBy = currentUser?.id;
                }, writer);
                setNewlyAddedFarmerId(farmerData.id);
            }
        });

        setIsShowingRegistrationForm(false);
        setEditingFarmer(null);
    }, [database, editingFarmer, currentUser]);

    const handleBatchUpdateStatus = useCallback(async (newStatus: FarmerStatus) => {
        if (selectedFarmerIds.length === 0 || !currentUser) return;

        await database.write(async writer => {
            const farmersToUpdate = await database.get<FarmerModel>('farmers').query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
            const activityLogsCollection = database.get<ActivityLogModel>('activity_logs');

            for (const farmer of farmersToUpdate) {
                const oldStatus = farmer.status;
                if (oldStatus !== newStatus) {
                    await farmer.update(record => {
                        record.status = newStatus;
                        record.syncStatusLocal = 'pending';
                        record.updatedBy = currentUser.id;
                    }, writer);
                    
                    await activityLogsCollection.create(log => {
                        log.farmerId = farmer.id;
                        log.activityType = ActivityType.STATUS_CHANGE;
                        log.description = `Status changed from ${oldStatus} to ${newStatus} in a batch update.`;
                        log.createdBy = currentUser.id;
                    }, writer);
                }
            }
        });

        setShowBatchUpdateModal(false);
        setNotification({ message: `${selectedFarmerIds.length} farmer(s) updated to "${newStatus}".`, type: 'success' });
        setSelectedFarmerIds([]);
    }, [database, selectedFarmerIds, currentUser]);

    const handleBulkImport = useCallback(async (newFarmers: Farmer[]) => {
        if (newFarmers.length === 0 || !currentUser) return;
        
        await database.write(async writer => {
            const farmersCollection = database.get<FarmerModel>('farmers');
            const activityLogsCollection = database.get<ActivityLogModel>('activity_logs');

            for (const farmerData of newFarmers) {
                await farmersCollection.create(record => {
                    Object.assign(record, { ...farmerData, syncStatusLocal: 'pending', createdBy: currentUser.id, updatedBy: currentUser.id });
                    record._raw.id = farmerData.id;
                }, writer);

                await activityLogsCollection.create(log => {
                    log.farmerId = farmerData.id;
                    log.activityType = ActivityType.REGISTRATION;
                    const villageName = getGeoName('village', { district: farmerData.district, mandal: farmerData.mandal, village: farmerData.village });
                    log.description = `Farmer bulk imported into ${villageName}.`;
                    log.createdBy = currentUser.id;
                }, writer);
            }
        });
        
        setNotification({ message: `${newFarmers.length} farmer(s) imported successfully.`, type: 'success' });
    }, [database, currentUser]);


    const handleSaveUsers = useCallback(async (updatedUsers: User[]) => {
        await database.write(async () => {
            for (const updatedUser of updatedUsers) {
                const userRecord = await database.get<UserModel>('users').find(updatedUser.id);
                await userRecord.update(record => {
                    record.groupId = updatedUser.groupId;
                });
            }
        });
        setNotification({ message: 'User roles saved successfully!', type: 'success' });
    }, [database]);

    const handleSaveGroups = useCallback(async (updatedGroups: Group[]) => {
        await database.write(async () => {
            const groupCollection = database.get<GroupModel>('groups');
            const existingGroupIds = dbGroups.map(g => g.id);
            const updatedGroupIds = updatedGroups.map(g => g.id);
            
            // Handle creations and updates
            for (const updatedGroup of updatedGroups) {
                if (existingGroupIds.includes(updatedGroup.id)) {
                    // Update
                    const groupRecord = await groupCollection.find(updatedGroup.id);
                    await groupRecord.update(record => {
                        record.name = updatedGroup.name;
                        record.permissionsStr = JSON.stringify(updatedGroup.permissions);
                    });
                } else {
                    // Create
                    await groupCollection.create(record => {
                        record._raw.id = updatedGroup.id;
                        record.name = updatedGroup.name;
                        record.permissionsStr = JSON.stringify(updatedGroup.permissions);
                    });
                }
            }

            // Handle deletions
            const groupsToDeleteIds = existingGroupIds.filter(id => !updatedGroupIds.includes(id));
            for (const groupId of groupsToDeleteIds) {
                const groupRecord = await groupCollection.find(groupId);
                await groupRecord.destroyPermanently();
            }
        });
        setNotification({ message: 'Group settings saved successfully!', type: 'success' });
    }, [database, dbGroups]);

    const handleSync = useCallback(async () => {
        if (!isOnline) {
            setNotification({ message: 'Cannot sync while offline.', type: 'error' });
            return;
        }
        if (!supabase) {
            setNotification({ message: 'Supabase connection not available. Please configure it in the settings.', type: 'error' });
            return;
        }
        setIsSyncing(true);
        setNotification({ message: 'Syncing data...', type: 'info' });
        try {
            const { pushed, deleted } = await synchronize(database, supabase);
            setNotification({ message: `Sync complete! Pushed ${pushed} and deleted ${deleted} records.`, type: 'success' });
        } catch (error: any) {
            console.error("Sync failed:", error);
            setNotification({ message: `Sync failed: ${error.message}`, type: 'error' });
        } finally {
            setIsSyncing(false);
        }
    }, [database, supabase, isOnline]);

    const handleDeleteSelectedFarmers = () => {
        if (selectedFarmerIds.length > 0) {
            setShowDeleteConfirmation(true);
        }
    };

    const confirmDelete = async () => {
        await database.write(async () => {
            const farmersToMark = await database.get<FarmerModel>('farmers').query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
            for (const farmer of farmersToMark) {
                await farmer.update(record => {
                    record.syncStatusLocal = 'pending_delete';
                });
            }
        });
        setShowDeleteConfirmation(false);
        setNotification({ message: `${selectedFarmerIds.length} farmer(s) marked for deletion.`, type: 'info' });
        setSelectedFarmerIds([]);
    };

    const handlePrintFarmer = useCallback((farmerId: string) => {
        const farmer = allPlainFarmers.find(f => f.id === farmerId);
        if (farmer) {
            setFarmerForPrinting(farmer);
        }
    }, [allPlainFarmers]);

    useEffect(() => {
        if (farmerForPrinting) {
            const handleAfterPrint = () => {
                setFarmerForPrinting(null);
                window.removeEventListener('afterprint', handleAfterPrint);
            };
            window.addEventListener('afterprint', handleAfterPrint);
            const timer = setTimeout(() => window.print(), 100);
            return () => clearTimeout(timer);
        }
    }, [farmerForPrinting]);

    const handleExportPdf = useCallback(async (farmerId: string) => {
        const farmer = allPlainFarmers.find(f => f.id === farmerId);
        if (!farmer) return;

        setNotification({ message: `Generating PDF for ${farmer.fullName}...`, type: 'info' });
        const container = document.getElementById('pdf-export-container');
        if (!container) {
            setNotification({ message: 'PDF container element not found.', type: 'error' });
            return;
        }

        const root = ReactDOM.createRoot(container);
        root.render(<PrintView farmer={farmer} users={users} isForPdf={true} />);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            const contentToCapture = container.firstElementChild as HTMLElement;
            if (!contentToCapture) throw new Error("Rendered PDF content not found.");

            const canvas = await html2canvas(contentToCapture, { scale: 2.5 });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            const { jsPDF } = jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgProps= pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
            pdf.save(`${farmer.farmerId}_${farmer.fullName}.pdf`);
            setNotification({ message: 'PDF downloaded successfully.', type: 'success' });
        } catch (e: any) {
            setNotification({ message: `Failed to generate PDF: ${e.message}`, type: 'error' });
            console.error(e);
        } finally {
            root.unmount();
        }
    }, [allPlainFarmers, users]);
    
    // --- Data Processing for Farmer Directory ---
    const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);
    const effectiveFilters = useMemo(() => ({
      ...filters,
      searchQuery: debouncedSearchQuery,
    }), [filters, debouncedSearchQuery]);

    const processedFarmers = useMemo(() => {
        let filtered = [...allPlainFarmers];

        const