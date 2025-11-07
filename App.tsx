import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Farmer, User, Group, Permission, PaymentStage, ActivityType, Filters, AppContent, FarmerStatus } from './types';
import FilterBar from './components/FilterBar';
import FarmerList from './components/FarmerList';
import { useDatabase } from './DatabaseContext';
import { Q, Query, Model } from '@nozbe/watermelondb';
import { FarmerModel, SubsidyPaymentModel, ActivityLogModel, UserModel, GroupModel, AppContentCacheModel } from './db';
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
        'not-found': 'Page Not Found',
    };
    return titles[view] || 'Hapsara';
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
    // FIX: Use the renamed `parsedPermissions` getter on GroupModel.
    const groups = useMemo(() => dbGroups.map(g => ({ id: g.id, name: g.name, permissions: g.parsedPermissions })), [dbGroups]);

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

            // Cache the newly fetched content
            const contentCacheCollection = database.get<AppContentCacheModel>('app_content_cache');
            await database.write(async () => {
                try {
                    const existingCache = await contentCacheCollection.find('main_content');
                    await existingCache.update(record => {
                        record.value = JSON.stringify(content);
                    });
                } catch (error) {
                    // Cache doesn't exist, create it
                    await contentCacheCollection.create(record => {
                        record._raw.id = 'main_content'; // WatermelonDB requires an ID for creation
                        (record as any).key = 'main_content';
                        record.value = JSON.stringify(content);
                    });
                }
            });

        } catch (e: any) {
            console.error("Error processing app content:", e);
        }
    }, [supabase, database]);
    
    // Load cached content on startup
    useEffect(() => {
        const loadCachedContent = async () => {
            const contentCacheCollection = database.get<AppContentCacheModel>('app_content_cache');
            try {
                const cachedContent = await contentCacheCollection.find('main_content');
                if (cachedContent && cachedContent.value) {
                    setAppContent(JSON.parse(cachedContent.value));
                }
            } catch (error) {
                console.log('No cached content found. Will fetch from network.');
            }
        };
        if (database) {
            loadCachedContent();
        }
    }, [database]);


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
        setIsSidebarOpen(false); // Close mobile sidebar on navigation
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

        if (effectiveFilters.searchQuery) {
            const lowercasedQuery = effectiveFilters.searchQuery.toLowerCase();
            filtered = filtered.filter(f =>
                f.fullName.toLowerCase().includes(lowercasedQuery) ||
                f.farmerId.toLowerCase().includes(lowercasedQuery) ||
                f.mobileNumber.includes(lowercasedQuery)
            );
        }

        if (effectiveFilters.district) {
            filtered = filtered.filter(f => f.district === effectiveFilters.district);
        }
        if (effectiveFilters.mandal) {
            filtered = filtered.filter(f => f.mandal === effectiveFilters.mandal);
        }
        if (effectiveFilters.village) {
            filtered = filtered.filter(f => f.village === effectiveFilters.village);
        }
        if (effectiveFilters.status) {
            filtered = filtered.filter(f => f.status === effectiveFilters.status);
        }
        if (effectiveFilters.registrationDateFrom) {
            const fromDate = new Date(effectiveFilters.registrationDateFrom);
            if (!isNaN(fromDate.getTime())) {
                filtered = filtered.filter(f => new Date(f.registrationDate) >= fromDate);
            }
        }
        if (effectiveFilters.registrationDateTo) {
            const toDate = new Date(effectiveFilters.registrationDateTo);
            if (!isNaN(toDate.getTime())) {
                toDate.setHours(23, 59, 59, 999); // Include the whole day
                filtered = filtered.filter(f => new Date(f.registrationDate) <= toDate);
            }
        }

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue == null || bValue == null) return 0;

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [allPlainFarmers, effectiveFilters, sortConfig]);

    const totalRecords = processedFarmers.length;
    const paginatedFarmers = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return processedFarmers.slice(startIndex, startIndex + rowsPerPage);
    }, [processedFarmers, currentPage, rowsPerPage]);

    // Handlers for list interactions
    const handleSelectionChange = (farmerId: string, isSelected: boolean) => {
        setSelectedFarmerIds(prev =>
            isSelected ? [...prev, farmerId] : prev.filter(id => id !== farmerId)
        );
    };
    const handleSelectAll = (isAllSelected: boolean) => {
        setSelectedFarmerIds(isAllSelected ? paginatedFarmers.map(f => f.id) : []);
    };
    const handleSortRequest = (key: keyof Farmer | 'id') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    const handleAddToPrintQueue = (ids: string[]) => {
        setPrintQueue(prev => [...new Set([...prev, ...ids])]);
        setNotification({ message: `${ids.length} farmer(s) added to print queue.`, type: 'info' });
        setSelectedFarmerIds([]);
    };
    
    const handleMarkAlertAsRead = (id: string) => {
        const updatedAlerts = alerts.map(a => a.id === id ? { ...a, read: true } : a);
        setAlerts(updatedAlerts);
        localStorage.setItem('hapsara-alerts', JSON.stringify(updatedAlerts));
    };

    const handleMarkAllAlertsAsRead = () => {
        const updatedAlerts = alerts.map(a => ({ ...a, read: true }));
        setAlerts(updatedAlerts);
        localStorage.setItem('hapsara-alerts', JSON.stringify(updatedAlerts));
    };

    const renderCurrentView = () => {
      if (!currentUser) return null;
      switch (parsedHash.view) {
        case 'dashboard':
            return <Dashboard farmers={allPlainFarmers} onNavigateWithFilter={handleNavigateWithFilter} />;
        case 'farmer-directory':
            return <>
                <FilterBar filters={filters} onFilterChange={setFilters} />
                <FarmerList
                    farmers={paginatedFarmers}
                    users={users}
                    canEdit={permissions.has(Permission.CAN_EDIT_FARMER)}
                    canDelete={permissions.has(Permission.CAN_DELETE_FARMER)}
                    onPrint={handlePrintFarmer}
                    onExportToPdf={handleExportPdf}
                    selectedFarmerIds={selectedFarmerIds}
                    onSelectionChange={handleSelectionChange}
                    onSelectAll={handleSelectAll}
                    sortConfig={sortConfig}
                    onRequestSort={handleSortRequest}
                    newlyAddedFarmerId={newlyAddedFarmerId}
                    onHighlightComplete={() => setNewlyAddedFarmerId(null)}
                    onBatchUpdate={() => setShowBatchUpdateModal(true)}
                    onDeleteSelected={handleDeleteSelectedFarmers}
                    totalRecords={totalRecords}
                    currentPage={currentPage}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setCurrentPage}
                    onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); }}
                    isLoading={allFarmers.length === 0 && pendingSyncCount > 0}
                    onAddToPrintQueue={handleAddToPrintQueue}
                    onNavigate={handleNavigate}
                />
            </>;
        case 'farmer-details':
            return <FarmerDetailsPage farmerId={parsedHash.params.farmerId} users={users} currentUser={currentUser} onBack={() => handleNavigate('farmer-directory')} permissions={permissions} setNotification={setNotification} />;
        case 'profile':
            return <ProfilePage currentUser={currentUser} groups={groups} onBack={() => handleNavigate('dashboard')} onSave={async () => {}} />;
        case 'admin':
            return <AdminPage users={users} groups={groups} currentUser={currentUser} onSaveUsers={handleSaveUsers} onSaveGroups={handleSaveGroups} onBack={() => handleNavigate('dashboard')} invitations={[]} onInviteUser={async () => ''} />;
        case 'billing':
            return <BillingPage currentUser={currentUser} onBack={() => handleNavigate('dashboard')} userCount={users.length} recordCount={allFarmers.length} onNavigate={handleNavigate} />;
        case 'usage-analytics':
            return <UsageAnalyticsPage currentUser={currentUser} onBack={() => handleNavigate('dashboard')} supabase={supabase} />;
        case 'content-manager':
            return <ContentManagerPage supabase={supabase} currentContent={appContent} onContentSave={fetchAppContent} onBack={() => handleNavigate('dashboard')} />;
        case 'subscription-management':
            return <SubscriptionManagementPage currentUser={currentUser} onBack={() => handleNavigate('billing')} />;
        case 'print-queue':
            return <PrintQueuePage queuedFarmerIds={printQueue} users={users} onRemove={(id) => setPrintQueue(q => q.filter(i => i !== id))} onClear={() => setPrintQueue([])} onBack={() => handleNavigate('farmer-directory')} />;
        case 'subsidy-management':
            return <SubsidyManagementPage farmers={allPlainFarmers} payments={allPayments} currentUser={currentUser} onBack={() => handleNavigate('dashboard')} database={database} setNotification={setNotification} />;
        case 'map-view':
            return <MapView farmers={allPlainFarmers} onNavigate={handleNavigate} />;
        case 'help':
            return <HelpPage appContent={appContent} onBack={() => handleNavigate('dashboard')} />;
        case 'id-verification':
            return <IdVerificationPage allFarmers={allPlainFarmers} onBack={() => handleNavigate('dashboard')} />;
        case 'reports':
            return <ReportsPage allFarmers={allPlainFarmers} onBack={() => handleNavigate('dashboard')} />;
        case 'crop-health-scanner':
            return <CropHealthScannerPage onBack={() => handleNavigate('dashboard')} />;
        default:
            return <NotFoundPage onBack={() => handleNavigate('dashboard')} />;
      }
    };

    return (
        <>
            <div id="pdf-export-container" className="hidden" aria-hidden="true"></div>
            {farmerForPrinting && <PrintView farmer={farmerForPrinting} users={users} />}
            {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}

            <Suspense fallback={<ModalLoader />}>
                {appState === 'LANDING' && <LandingPage onLaunch={() => setAppState('LOGIN')} appContent={appContent} />}
                {appState === 'LOGIN' && <LoginScreen onLogin={handleLogin} users={users} />}
                
                {appState === 'APP' && currentUser && (
                    <div className="flex h-screen bg-gray-100 font-sans" onClick={() => isAlertsPanelOpen && setIsAlertsPanelOpen(false)}>
                        <Sidebar
                            isOpen={isSidebarOpen}
                            isCollapsed={isSidebarCollapsed}
                            onToggleCollapse={() => setIsSidebarCollapsed(c => !c)}
                            currentUser={currentUser}
                            onLogout={handleLogout}
                            onNavigate={handleNavigate}
                            currentView={parsedHash.view as View}
                            permissions={permissions}
                            onImport={() => setShowBulkImportModal(true)}
                            onExportExcel={() => exportToExcel(processedFarmers, `Hapsara_Export_${new Date().toISOString().split('T')[0]}`)}
                            onExportCsv={() => exportToCsv(processedFarmers, `Hapsara_Export_${new Date().toISOString().split('T')[0]}`)}
                            onViewRawData={() => setShowRawDataView(true)}
                            onShowPrivacy={() => setShowPrivacy(true)}
                            onShowChangelog={() => setShowChangelog(true)}
                            printQueueCount={printQueue.length}
                            onShowSupabaseSettings={() => setShowSupabaseSettings(true)}
                        />
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <header className="bg-white shadow-sm z-30 p-4 flex justify-between items-center flex-shrink-0">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setIsSidebarOpen(o => !o)} className="lg:hidden p-2 text-gray-500 hover:text-gray-800">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </button>
                                    <h1 className="text-2xl font-bold text-gray-800">{getViewTitle(parsedHash.view)}</h1>
                                </div>
                                <div className="flex items-center gap-4">
                                    {permissions.has(Permission.CAN_SYNC_DATA) && (
                                        <button onClick={handleSync} disabled={isSyncing || !isOnline} className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isSyncing ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isOnline ? 'text-green-500' : 'text-red-500'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM6.24 7.24a.75.75 0 011.06 0L10 9.94l2.7-2.7a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L6.24 8.3a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>}
                                            <span>{isSyncing ? 'Syncing...' : isOnline ? 'Synced' : 'Offline'}</span>
                                            {pendingSyncCount > 0 && !isSyncing && <span className="text-xs bg-yellow-400 text-yellow-900 font-bold px-1.5 py-0.5 rounded-full">{pendingSyncCount}</span>}
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setIsAlertsPanelOpen(o => !o); }} className="relative p-2 text-gray-500 hover:text-gray-800">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                        {alerts.filter(a => !a.read).length > 0 && <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>}
                                    </button>
                                    <AlertsPanel alerts={alerts} isOpen={isAlertsPanelOpen} onClose={() => setIsAlertsPanelOpen(false)} onMarkAsRead={handleMarkAlertAsRead} onMarkAllAsRead={handleMarkAllAlertsAsRead} onNavigate={handleNavigate} />
                                    {permissions.has(Permission.CAN_REGISTER_FARMER) && parsedHash.view === 'farmer-directory' && (
                                        <button onClick={() => { setIsShowingRegistrationForm(true); setEditingFarmer(null); }} className="hidden sm:inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">Register Farmer</button>
                                    )}
                                </div>
                            </header>
                            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
                                {renderCurrentView()}
                            </main>
                        </div>
                    </div>
                )}
                
                {isShowingRegistrationForm && (
                    <RegistrationForm
                        onSubmit={handleSaveFarmer}
                        onCancel={() => setIsShowingRegistrationForm(false)}
                        existingFarmers={allPlainFarmers}
                        mode={editingFarmer ? 'edit' : 'create'}
                        existingFarmer={editingFarmer}
                    />
                )}
                {showBatchUpdateModal && <BatchUpdateStatusModal selectedCount={selectedFarmerIds.length} onUpdate={handleBatchUpdateStatus} onCancel={() => setShowBatchUpdateModal(false)} />}
                {showBulkImportModal && <BulkImportModal onClose={() => setShowBulkImportModal(false)} onSubmit={handleBulkImport} existingFarmers={allPlainFarmers} />}
                {showDeleteConfirmation && <ConfirmationModal isOpen={showDeleteConfirmation} title="Delete Farmers?" message={`Are you sure you want to mark ${selectedFarmerIds.length} farmer(s) for deletion? They will be removed permanently on the next sync.`} onConfirm={confirmDelete} onCancel={() => setShowDeleteConfirmation(false)} confirmText="Yes, Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" />}
                {showRawDataView && <RawDataView farmers={allFarmers} onClose={() => setShowRawDataView(false)} />}
                {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} appContent={appContent} />}
                {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
                {showSupabaseSettings && <SupabaseSettingsModal isOpen={showSupabaseSettings} onClose={() => setShowSupabaseSettings(false)} onConnect={handleSupabaseConnect} />}
            </Suspense>
        </>
    );
};

export default App;
