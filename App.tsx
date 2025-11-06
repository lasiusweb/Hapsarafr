import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Farmer, User, Group, Permission, PaymentStage } from './types';
import FilterBar, { Filters } from './components/FilterBar';
import FarmerList from './components/FarmerList';
import { useDatabase } from './DatabaseContext';
import { Q, Query, Model } from '@nozbe/watermelondb';
import { FarmerModel, SubsidyPaymentModel } from './db';
import { initializeSupabase } from './lib/supabase';
import { DEFAULT_GROUPS } from './data/permissionsData';
import { AVATARS } from './data/avatars';
import Sidebar from './components/Sidebar';
import Notification from './components/Notification';
import { synchronize } from './lib/sync';
import { exportToExcel, exportToCsv } from './lib/export';
import PrintView from './components/PrintView';

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


// Custom hooks to observe WatermelonDB queries
const useQuery = <T extends Model>(query: Query<T>): T[] => {
  const [data, setData] = useState<T[]>([]);
  useEffect(() => {
    const subscription = query.observe().subscribe(setData);
    return () => subscription.unsubscribe();
  }, [query]);
  return data;
};

type View = 'dashboard' | 'farmer-directory' | 'profile' | 'admin' | 'billing' | 'usage-analytics' | 'content-manager' | 'subscription-management' | 'print-queue' | 'subsidy-management' | 'map-view' | 'help' | 'id-verification' | 'reports';
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

    const simpleViews: View[] = ['farmer-directory', 'profile', 'admin', 'billing', 'usage-analytics', 'content-manager', 'subscription-management', 'print-queue', 'subsidy-management', 'map-view', 'help', 'id-verification', 'reports'];
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

// Custom hook to track online status
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
};

const farmerModelToPlain = (f: FarmerModel): Farmer => ({
    id: f.id,
    fullName: f.fullName,
    fatherHusbandName: f.fatherHusbandName,
    aadhaarNumber: f.aadhaarNumber,
    mobileNumber: f.mobileNumber,
    gender: f.gender,
    address: f.address,
    ppbRofrId: f.ppbRofrId,
    photo: f.photo,
    bankAccountNumber: f.bankAccountNumber,
    ifscCode: f.ifscCode,
    accountVerified: f.accountVerified,
    appliedExtent: f.appliedExtent,
    approvedExtent: f.approvedExtent,
    numberOfPlants: f.numberOfPlants,
    methodOfPlantation: f.methodOfPlantation,
    plantType: f.plantType,
    plantationDate: f.plantationDate,
    mlrdPlants: f.mlrdPlants,
    fullCostPlants: f.fullCostPlants,
    latitude: f.latitude,
    longitude: f.longitude,
    applicationId: f.applicationId,
    farmerId: f.farmerId,
    proposedYear: f.proposedYear,
    registrationDate: f.registrationDate,
    asoId: f.asoId,
    paymentUtrDd: f.paymentUtrDd,
    status: f.status,
    district: f.district,
    mandal: f.mandal,
    village: f.village,
    syncStatus: f.syncStatusLocal,
    createdBy: f.createdBy,
    updatedBy: f.updatedBy,
    createdAt: new Date(f.createdAt).toISOString(),
    updatedAt: new Date(f.updatedAt).toISOString(),
});


const App: React.FC = () => {
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const [appState, setAppState] = useState<string>('APP'); 
    const [supabase, setSupabase] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<User>({ id: 'user-1', name: 'Field Officer', groupId: 'group-data-entry', avatar: AVATARS[4]});
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  
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

    // Alert System State
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false);
    
    // WatermelonDB Queries - filter out soft-deleted records from the main view
    const farmersQuery = useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('syncStatus', Q.notEq('pending_delete'))), [database]);
    const allFarmers = useQuery(farmersQuery);
    const paymentsQuery = useMemo(() => database.get<SubsidyPaymentModel>('subsidy_payments').query(), [database]);
    const allPayments = useQuery(paymentsQuery);

    const allPlainFarmers = useMemo(() => allFarmers.map(farmerModelToPlain), [allFarmers]);

    useEffect(() => {
        const sup = initializeSupabase();
        setSupabase(sup);
    }, []);

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

    const parsedHash = useMemo(() => parseHash(), [currentHash]);

    useEffect(() => {
      const handleHashChange = () => setCurrentHash(window.location.hash);
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const permissions = useMemo(() => {
        const userGroup = groups.find(g => g.id === currentUser?.groupId);
        return new Set(userGroup?.permissions || []);
    }, [currentUser, groups]);

    const handleSaveFarmer = useCallback(async (farmerData: Farmer, photoFile?: File) => {
        const farmersCollection = database.get<FarmerModel>('farmers');
        let photoBase64 = farmerData.photo;

        if (photoFile) {
            photoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(photoFile);
            });
        }
        
        await database.write(async () => {
            if (editingFarmer) {
                const farmerToUpdate = await farmersCollection.find(editingFarmer.id);
                await farmerToUpdate.update(record => {
                    const { id, createdAt, updatedAt, createdBy, ...updatableData } = farmerData;
                    Object.assign(record, { ...updatableData, photo: photoBase64, syncStatusLocal: 'pending', updatedBy: currentUser?.id });
                });
            } else {
                await farmersCollection.create(record => {
                    Object.assign(record, { ...farmerData, photo: photoBase64, syncStatusLocal: 'pending', createdBy: currentUser?.id, updatedBy: currentUser?.id });
                    record._raw.id = farmerData.id;
                });
                setNewlyAddedFarmerId(farmerData.id);
            }
        });

        setIsShowingRegistrationForm(false);
        setEditingFarmer(null);
    }, [database, editingFarmer, currentUser]);

    const handleEditFarmer = (farmer: Farmer) => {
        setEditingFarmer(farmer);
        setIsShowingRegistrationForm(true);
    };

    const handleSync = useCallback(async () => {
        if (!isOnline) {
            setNotification({ message: 'Cannot sync while offline.', type: 'error' });
            return;
        }
        if (!supabase) {
            setNotification({ message: 'Supabase connection not available.', type: 'error' });
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
    const processedFarmers = useMemo(() => {
        let filtered = [...allPlainFarmers];

        const query = filters.searchQuery.toLowerCase().trim();
        if (query) {
            filtered = filtered.filter(f => 
                f.fullName.toLowerCase().includes(query) ||
                f.farmerId.toLowerCase().includes(query) ||
                f.mobileNumber.includes(query)
            );
        }
        
        if (filters.district) filtered = filtered.filter(f => f.district === filters.district);
        if (filters.mandal) filtered = filtered.filter(f => f.mandal === filters.mandal);
        if (filters.village) filtered = filtered.filter(f => f.village === filters.village);
        if (filters.status) filtered = filtered.filter(f => f.status === filters.status);

        if (filters.registrationDateFrom) {
            const fromDate = new Date(filters.registrationDateFrom).getTime();
            filtered = filtered.filter(f => new Date(f.registrationDate).getTime() >= fromDate);
        }
        if (filters.registrationDateTo) {
            const toDate = new Date(filters.registrationDateTo).getTime();
            filtered = filtered.filter(f => new Date(f.registrationDate).getTime() <= toDate);
        }
        
        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof Farmer] as any;
                const bValue = b[sortConfig.key as keyof Farmer] as any;
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [allPlainFarmers, filters, sortConfig]);
    
    const handleExportExcel = () => {
        if (processedFarmers.length === 0) {
            setNotification({ message: 'No farmers to export. Clear filters to export all data.', type: 'info' });
            return;
        }
        exportToExcel(processedFarmers);
        setNotification({ message: `Exporting ${processedFarmers.length} farmers to Excel.`, type: 'success' });
    };

    const handleExportCsv = () => {
        if (processedFarmers.length === 0) {
            setNotification({ message: 'No farmers to export. Clear filters to export all data.', type: 'info' });
            return;
        }
        exportToCsv(processedFarmers);
        setNotification({ message: `Exporting ${processedFarmers.length} farmers to CSV.`, type: 'success' });
    };

    const paginatedFarmers = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return processedFarmers.slice(startIndex, startIndex + rowsPerPage);
    }, [processedFarmers, currentPage, rowsPerPage]);

    const handleSelectFarmer = (farmerId: string, isSelected: boolean) => {
        setSelectedFarmerIds(prev => isSelected ? [...prev, farmerId] : prev.filter(id => id !== farmerId));
    };

    const handleSelectAll = (allSelected: boolean) => {
        setSelectedFarmerIds(allSelected ? paginatedFarmers.map(f => f.id) : []);
    };

    // Alert Handlers
    const handleMarkAsRead = (alertId: string) => {
        const updatedAlerts = alerts.map(a => a.id === alertId ? { ...a, read: true } : a);
        setAlerts(updatedAlerts);
        localStorage.setItem('hapsara-alerts', JSON.stringify(updatedAlerts));
    };

    const handleMarkAllAsRead = () => {
        const updatedAlerts = alerts.map(a => ({ ...a, read: true }));
        setAlerts(updatedAlerts);
        localStorage.setItem('hapsara-alerts', JSON.stringify(updatedAlerts));
    };
    
    // --- Main Content Renderer ---
    const renderContent = () => {
        switch (parsedHash.view) {
            case 'dashboard':
                return <Dashboard supabase={supabase} />;
            case 'farmer-directory':
                return (
                    <>
                        <FilterBar onFilterChange={setFilters} />
                        <FarmerList
                            farmers={paginatedFarmers}
                            users={users}
                            canEdit={permissions.has(Permission.CAN_EDIT_FARMER)}
                            canDelete={permissions.has(Permission.CAN_DELETE_FARMER)}
                            onPrint={handlePrintFarmer}
                            onExportToPdf={handleExportPdf}
                            selectedFarmerIds={selectedFarmerIds}
                            onSelectionChange={handleSelectFarmer}
                            onSelectAll={handleSelectAll}
                            sortConfig={sortConfig}
                            onRequestSort={(key) => {
                                const direction = sortConfig?.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
                                setSortConfig({ key, direction });
                            }}
                            newlyAddedFarmerId={newlyAddedFarmerId}
                            onHighlightComplete={() => setNewlyAddedFarmerId(null)}
                            onBatchUpdate={() => setShowBatchUpdateModal(true)}
                            onDeleteSelected={handleDeleteSelectedFarmers}
                            totalRecords={processedFarmers.length}
                            currentPage={currentPage}
                            rowsPerPage={rowsPerPage}
                            onPageChange={setCurrentPage}
                            onRowsPerPageChange={setRowsPerPage}
                            isLoading={false}
                            onAddToPrintQueue={(ids) => setPrintQueue(q => [...new Set([...q, ...ids])])}
                            onNavigate={handleNavigate}
                        />
                    </>
                );
             case 'farmer-details':
                return <FarmerDetailsPage 
                            farmerId={parsedHash.params.farmerId} 
                            database={database}
                            users={users}
                            currentUser={currentUser}
                            onBack={() => handleNavigate('farmer-directory')}
                            permissions={permissions}
                            setNotification={setNotification}
                        />;
            case 'map-view':
                return <MapView farmers={allPlainFarmers} onNavigate={handleNavigate} />;
            case 'subsidy-management':
                 return <SubsidyManagementPage 
                            farmers={allPlainFarmers}
                            payments={allPayments}
                            currentUser={currentUser}
                            onBack={() => handleNavigate('dashboard')}
                            database={database}
                            setNotification={setNotification}
                        />;
            case 'reports':
                return <ReportsPage allFarmers={allPlainFarmers} onBack={() => handleNavigate('dashboard')} />;
            case 'admin':
                return <AdminPage 
                            users={users} 
                            groups={groups} 
                            currentUser={currentUser} 
                            onSaveUsers={async (u) => setUsers(u)}
                            onSaveGroups={async (g) => setGroups(g)}
                            onBack={() => handleNavigate('dashboard')}
                            invitations={[]}
                            onInviteUser={async () => 'mock-code'}
                        />;
            case 'profile':
                return <ProfilePage 
                            currentUser={currentUser} 
                            groups={groups} 
                            onSave={async (u) => setCurrentUser(u)}
                            onBack={() => handleNavigate('dashboard')} 
                        />;
            case 'print-queue':
                return <PrintQueuePage
                            queuedFarmerIds={printQueue}
                            users={users}
                            onRemove={(id) => setPrintQueue(q => q.filter(farmerId => farmerId !== id))}
                            onClear={() => setPrintQueue([])}
                            onBack={() => handleNavigate('farmer-directory')}
                            database={database}
                       />;
            case 'help':
                return <HelpPage 
                            appContent={null}
                            onBack={() => handleNavigate('dashboard')}
                        />;
            case 'id-verification':
                return <IdVerificationPage allFarmers={allPlainFarmers} onBack={() => handleNavigate('dashboard')} />;
            default:
                return <NotFoundPage onBack={() => handleNavigate('dashboard')} />;
        }
    };

    if (appState === 'LOADING') return <ModalLoader />;
    
    return (
        <Suspense fallback={<ModalLoader />}>
            {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
            <div className="flex h-screen bg-gray-100">
                <Sidebar
                    isOpen={isSidebarOpen}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(c => !c)}
                    currentUser={currentUser}
                    onLogout={() => {}}
                    onNavigate={handleNavigate}
                    currentView={parsedHash.view as View}
                    permissions={permissions}
                    onImport={() => setShowBulkImportModal(true)}
                    onExportExcel={handleExportExcel}
                    onExportCsv={handleExportCsv}
                    onViewRawData={() => setShowRawDataView(true)}
                    onShowPrivacy={() => {}}
                    onShowChangelog={() => {}}
                    printQueueCount={printQueue.length}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header
                        onToggleSidebar={() => setIsSidebarOpen(o => !o)}
                        currentView={parsedHash.view}
                        onRegister={() => { setEditingFarmer(null); setIsShowingRegistrationForm(true); }}
                        onSync={handleSync}
                        syncLoading={isSyncing}
                        pendingSyncCount={pendingSyncCount}
                        isOnline={isOnline}
                        permissions={permissions}
                        unreadAlertsCount={alerts.filter(a => !a.read).length}
                        onToggleAlertsPanel={() => setIsAlertsPanelOpen(p => !p)}
                    />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                       {renderContent()}
                    </main>
                    <AlertsPanel
                        alerts={alerts}
                        isOpen={isAlertsPanelOpen}
                        onClose={() => setIsAlertsPanelOpen(false)}
                        onMarkAsRead={handleMarkAsRead}
                        onMarkAllAsRead={handleMarkAllAsRead}
                        onNavigate={handleNavigate}
                    />
                </div>

                {isShowingRegistrationForm && (
                     <RegistrationForm 
                        onSubmit={handleSaveFarmer}
                        onCancel={() => setIsShowingRegistrationForm(false)}
                        existingFarmers={allPlainFarmers}
                        mode={editingFarmer ? 'edit' : 'create'}
                        existingFarmer={editingFarmer}
                    />
                )}
                {showDeleteConfirmation && (
                    <ConfirmationModal
                        isOpen={showDeleteConfirmation}
                        title={`Delete ${selectedFarmerIds.length} Farmer(s)?`}
                        message={<>
                            <p>Are you sure you want to delete the selected farmer(s)?</p>
                            <p className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md font-semibold">
                                This action will mark them for deletion. The records will be permanently removed after the next sync. This cannot be undone.
                            </p>
                        </>}
                        onConfirm={confirmDelete}
                        onCancel={() => setShowDeleteConfirmation(false)}
                        confirmText="Yes, Delete"
                        confirmButtonClass="bg-red-600 hover:bg-red-700"
                    />
                )}
                {showRawDataView && (
                    <RawDataView
                        farmers={allFarmers}
                        onClose={() => setShowRawDataView(false)}
                    />
                )}
                {farmerForPrinting && <PrintView farmer={farmerForPrinting} users={users} />}
                <div id="pdf-export-container" style={{ position: 'absolute', left: '-9999px', top: 0 }}></div>
            </div>
        </Suspense>
    );
};

const Header: React.FC<{
    onToggleSidebar: () => void;
    currentView: ParsedHash['view'];
    onRegister: () => void;
    onSync: () => void;
    syncLoading: boolean;
    pendingSyncCount: number;
    isOnline: boolean;
    permissions: Set<Permission>;
    unreadAlertsCount: number;
    onToggleAlertsPanel: () => void;
}> = ({ onToggleSidebar, currentView, onRegister, onSync, syncLoading, pendingSyncCount, isOnline, permissions, unreadAlertsCount, onToggleAlertsPanel }) => {
    const canRegister = permissions.has(Permission.CAN_REGISTER_FARMER);
    const viewTitles: Record<ParsedHash['view'], string> = {
        dashboard: 'Dashboard',
        'farmer-directory': 'Farmer Directory',
        'farmer-details': 'Farmer Details',
        profile: 'My Profile',
        admin: 'Admin Panel',
        billing: 'Billing & Usage',
        'usage-analytics': 'Usage Analytics',
        'content-manager': 'Content Manager',
        'subscription-management': 'Subscription Management',
        'print-queue': 'Print Queue',
        'subsidy-management': 'Subsidy Management',
        'map-view': 'Farmer Map View',
        'help': 'Help & Support',
        'id-verification': 'ID Verification Tool',
        reports: 'Reports & Analytics',
        'not-found': 'Page Not Found',
    };

    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center flex-shrink-0 z-20">
            <div className="flex items-center gap-4">
                <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-gray-100 lg:hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-gray-800 hidden sm:block">{viewTitles[currentView]}</h1>
            </div>
            <div className="flex items-center gap-4">
                {isOnline && (
                    <button onClick={onSync} disabled={syncLoading} className="relative flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${syncLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.885-.666A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566z" clipRule="evenodd" /></svg>
                        <span className="hidden md:inline">{syncLoading ? 'Syncing...' : 'Sync Now'}</span>
                        {pendingSyncCount > 0 && !syncLoading && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 text-yellow-900 text-xs items-center justify-center font-bold">{pendingSyncCount > 9 ? '9+' : pendingSyncCount}</span></span>
                        )}
                    </button>
                )}
                 <button onClick={onToggleAlertsPanel} className="relative p-2 rounded-full hover:bg-gray-100 transition text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    {unreadAlertsCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center text-xs rounded-full bg-red-500 text-white font-bold">{unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}</span>
                    )}
                </button>
                {canRegister && currentView === 'farmer-directory' && (
                    <button onClick={onRegister} className="flex items-center gap-2 px-4 py-2 rounded-md transition font-semibold bg-green-600 text-white hover:bg-green-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110 2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        <span className="hidden md:inline">Register Farmer</span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default App;