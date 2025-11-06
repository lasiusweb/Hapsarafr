

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Farmer, FarmerStatus, User, Group, Permission, Invitation } from './types';
import { GEO_DATA } from './data/geoData';
import FilterBar, { Filters } from './components/FilterBar';
import FarmerList from './components/FarmerList';
import { useDatabase } from './DatabaseContext';
import { Q, Query } from '@nozbe/watermelondb';
import { FarmerModel } from './db';
import DataMenu from './components/DataMenu';
import { initializeSupabase } from './lib/supabase';

// Lazily import components to enable code-splitting
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const PrintView = lazy(() => import('./components/PrintView'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const BatchUpdateStatusModal = lazy(() => import('./components/BatchUpdateStatusModal'));
const SyncConfirmationModal = lazy(() => import('./components/SyncConfirmationModal'));
const BulkImportModal = lazy(() => import('./components/BulkImportModal'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const ConfirmationModal = lazy(() => import('./components/ConfirmationModal'));
const AcceptInvitation = lazy(() => import('./components/AcceptInvitation'));
const SupabaseSettingsModal = lazy(() => import('./components/SupabaseSettingsModal'));
const SupabaseSetupGuide = lazy(() => import('./components/SupabaseSetupGuide'));
const RawDataView = lazy(() => import('./components/RawDataView'));
const BillingPage = lazy(() => import('./components/BillingPage'));
const UsageAnalyticsPage = lazy(() => import('./components/UsageAnalyticsPage'));


// Type declarations for CDN libraries
declare const html2canvas: any;
declare const jspdf: any;

const SUPABASE_URL = "https://dfqjwffrnzhmocaeqrmg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcWp3ZmZybnpobW9jYWVxcm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNjUxNjMsImV4cCI6MjA3Nzk0MTE2M30.6og6IkZDzNGO2dEdf5sAg8AKuYl85a9quSd5DD_dRSA";

// Helper to convert object keys from snake_case to camelCase
const snakeToCamelCase = (obj: any) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const newObj: {[key: string]: any} = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            newObj[camelKey] = obj[key];
        }
    }
    return newObj;
};

// Helper to explicitly map a FarmerModel to a snake_case object for the Supabase API
const mapModelToApi = (farmer: FarmerModel) => ({
    id: farmer.id,
    full_name: farmer.fullName,
    father_husband_name: farmer.fatherHusbandName,
    aadhaar_number: farmer.aadhaarNumber,
    mobile_number: farmer.mobileNumber,
    gender: farmer.gender,
    address: farmer.address,
    ppb_rofr_id: farmer.ppbRofrId,
    photo: farmer.photo,
    bank_account_number: farmer.bankAccountNumber,
    ifsc_code: farmer.ifscCode,
    account_verified: farmer.accountVerified,
    applied_extent: farmer.appliedExtent,
    approved_extent: farmer.approvedExtent,
    number_of_plants: farmer.numberOfPlants,
    method_of_plantation: farmer.methodOfPlantation,
    plant_type: farmer.plantType,
    plantation_date: farmer.plantationDate,
    mlrd_plants: farmer.mlrdPlants,
    full_cost_plants: farmer.fullCostPlants,
    application_id: farmer.applicationId,
    farmer_id: farmer.farmerId,
    proposed_year: farmer.proposedYear,
    registration_date: farmer.registrationDate,
    aso_id: farmer.asoId,
    payment_utr_dd: farmer.paymentUtrDd,
    status: farmer.status,
    district: farmer.district,
    mandal: farmer.mandal,
    village: farmer.village,
    sync_status: 'synced', // Always set to synced when pushing
    created_by: farmer.createdBy,
    updated_by: farmer.updatedBy,
});


const mapInvitationToCamelCase = (inv: any): Invitation => ({
    id: inv.id,
    groupId: inv.group_id,
    emailFor: inv.email_for,
    createdAt: inv.created_at,
    expiresAt: inv.expires_at,
    status: inv.status,
    acceptedByUserId: inv.accepted_by_user_id,
});

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

// Custom hooks to observe WatermelonDB queries
const useQuery = <T extends FarmerModel>(query: Query<T>): T[] => {
  const [data, setData] = useState<T[]>([]);
  useEffect(() => {
    const subscription = query.observe().subscribe(setData);
    return () => subscription.unsubscribe();
  }, [query]);
  return data;
};

const Header: React.FC<{
  currentUser: User | null;
  onLogout: () => void;
  onProfileClick: () => void;
  onBillingClick: () => void;
  onUsageAnalyticsClick: () => void;
  onAdminClick: () => void;
  onSetupGuideClick: () => void;
  onRegister: () => void;
  onExport: () => void;
  onExportCsv: () => void;
  onImport: () => void;
  onViewRawData: () => void;
  onDeleteSelected: () => void;
  onBatchUpdate: () => void;
  onSync: () => void;
  syncLoading: boolean;
  selectedCount: number;
  isOnline: boolean;
  pendingSyncCount: number;
  permissions: Set<Permission>;
}> = ({ currentUser, onLogout, onProfileClick, onBillingClick, onUsageAnalyticsClick, onAdminClick, onSetupGuideClick, onRegister, onExport, onExportCsv, onImport, onViewRawData, onDeleteSelected, onBatchUpdate, onSync, syncLoading, selectedCount, isOnline, pendingSyncCount, permissions }) => {
  const canRegister = permissions.has(Permission.CAN_REGISTER_FARMER);
  const canDelete = permissions.has(Permission.CAN_DELETE_FARMER);
  const canEdit = permissions.has(Permission.CAN_EDIT_FARMER);
  const canManage = (permissions.has(Permission.CAN_MANAGE_GROUPS) || permissions.has(Permission.CAN_MANAGE_USERS));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
            setIsProfileMenuOpen(false);
            setIsMobileMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuAction = (action: () => void) => {
      action();
      setIsProfileMenuOpen(false);
      setIsMobileMenuOpen(false);
  };

  const renderActionButtons = (isMobile = false) => (
    <>
        {canDelete && selectedCount > 0 && (
            <button onClick={() => handleMenuAction(onDeleteSelected)} className={`w-full text-left px-4 py-2 rounded-md transition font-semibold flex items-center gap-2 ${isMobile ? 'text-red-600 hover:bg-red-50' : 'bg-red-600 text-white hover:bg-red-700'}`} title={`Delete ${selectedCount} selected farmer(s)`}>
                {isMobile ? `Delete Selected (${selectedCount})` : `Delete (${selectedCount})`}
            </button>
        )}
        {canEdit && selectedCount > 0 && (
            <button onClick={() => handleMenuAction(onBatchUpdate)} className={`w-full text-left px-4 py-2 rounded-md transition font-semibold flex items-center gap-2 ${isMobile ? 'text-yellow-600 hover:bg-yellow-50' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`} title={`Update status for ${selectedCount} selected farmer(s)`}>
                {isMobile ? `Update Status (${selectedCount})` : `Update (${selectedCount})`}
            </button>
        )}
        <DataMenu onImport={onImport} onExportExcel={onExport} onExportCsv={onExportCsv} onViewRawData={onViewRawData} permissions={permissions} isMobile={isMobile} onAction={handleMenuAction} />
        {canRegister && (
            <button onClick={() => handleMenuAction(onRegister)} className={`w-full text-left px-4 py-2 rounded-md transition font-semibold ${isMobile ? 'text-gray-700 hover:bg-gray-100' : 'bg-green-600 text-white hover:bg-green-700'}`}>Register Farmer</button>
        )}
        {canManage && (
            <button onClick={() => handleMenuAction(onAdminClick)} className={`w-full text-left px-4 py-2 rounded-md transition font-semibold ${isMobile ? 'text-gray-700 hover:bg-gray-100' : 'bg-gray-700 text-white hover:bg-gray-800'}`}>Admin Panel</button>
        )}
        {canManage && (
            <button onClick={() => handleMenuAction(onSetupGuideClick)} className={`w-full text-left px-4 py-2 rounded-md transition font-semibold ${isMobile ? 'text-gray-700 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Setup Guide</button>
        )}
    </>
  );
  
  const SyncStatusIndicator: React.FC<{isMobile?: boolean}> = ({ isMobile = false }) => {
      if (!syncLoading && pendingSyncCount === 0) return null;
      
      const baseClass = `flex items-center gap-1.5 text-sm font-semibold`;
      const mobileClass = isMobile ? 'mt-2' : '';
      const colorClass = syncLoading ? 'text-blue-600 animate-pulse' : 'text-yellow-700';
      
      return (
          <div className={`${baseClass} ${mobileClass} ${colorClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M15.312 11.224a5.5 5.5 0 01-9.537 2.112l.14-.141a.5.5 0 01.707.707l-.141.141a6.5 6.5 0 0011.23-2.618.5.5 0 01-.48-.655z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M4.688 8.776a5.5 5.5 0 019.537-2.112l-.14.141a.5.5 0 01-.707-.707l.141-.141a6.5 6.5 0 00-11.23 2.618.5.5 0 01.48.655z" clipRule="evenodd" />
              </svg>
              <span>{syncLoading ? 'Syncing...' : `${pendingSyncCount} to Sync`}</span>
          </div>
      );
  };

  return (
    <header className="bg-white shadow-md p-3 sm:p-4 relative" ref={headerRef}>
        <div className="flex justify-between items-center">
          {/* Left Side: Logo, Title, Status */}
          <div className="flex items-center gap-2 sm:gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 00-1.09.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/></svg>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                  <span className="hidden sm:inline">Hapsara Farmer Registration</span>
                  <span className="sm:hidden">Hapsara</span>
              </h1>
              <div className="hidden sm:flex items-center gap-4 border-l pl-4 ml-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} transition-colors`} title={isOnline ? 'Online' : 'Offline - Changes are saved locally'}></span>
                    <span className="text-sm font-medium text-gray-600">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                  <SyncStatusIndicator />
              </div>
          </div>

          {/* Right Side: Desktop Buttons & Profile */}
          <div className="hidden md:flex items-center gap-2">
              {isOnline && (
                <button 
                  onClick={onSync}
                  disabled={syncLoading} 
                  className="relative px-4 py-2 text-sm font-semibold rounded-md transition text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait"
                >
                  {syncLoading ? 'Syncing...' : 'Sync Now'}
                  {pendingSyncCount > 0 && !syncLoading && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-yellow-500 text-yellow-900 text-xs items-center justify-center">{pendingSyncCount}</span>
                    </span>
                  )}
                </button>
              )}
              {renderActionButtons(false)}
              {currentUser && (
                <div className="relative">
                    <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 hover:bg-gray-100 rounded-lg p-2 transition">
                        <img src={currentUser.avatar} alt="User Avatar" className="w-10 h-10 rounded-full border-2 border-gray-200" />
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isProfileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                            <div className="p-2 border-b">
                                <p className="font-semibold text-gray-800 text-sm truncate">{currentUser.name}</p>
                                <p className="text-xs text-gray-500">Pay-as-you-go Plan</p>
                            </div>
                            <div className="py-1" role="menu">
                                <button onClick={() => handleMenuAction(onProfileClick)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Profile</button>
                                <button onClick={() => handleMenuAction(onBillingClick)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Billing</button>
                                <button onClick={() => handleMenuAction(onUsageAnalyticsClick)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Usage</button>
                                <div className="border-t my-1"></div>
                                <button onClick={() => handleMenuAction(onLogout)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Logout</button>
                            </div>
                        </div>
                    )}
                </div>
              )}
          </div>
          
          {/* Mobile Hamburger Button */}
          <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
              </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
            <div className="absolute top-full left-0 w-full bg-white shadow-lg md:hidden z-40 animate-fade-in-down">
                 {currentUser && (
                    <div className="p-4 border-b">
                         <div className="flex items-center gap-3 mb-4">
                            <img src={currentUser.avatar} alt="User Avatar" className="w-10 h-10 rounded-full border-2 border-gray-200" />
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">{currentUser.name}</p>
                                <p className="text-xs text-gray-500">Pay-as-you-go Plan</p>
                            </div>
                        </div>
                        <div className="sm:hidden">
                            <div className="flex items-center gap-2">
                                <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} transition-colors`}></span>
                                <span className="text-sm font-medium text-gray-600">{isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                            <SyncStatusIndicator isMobile={true} />
                        </div>
                    </div>
                )}
                <div className="p-2 space-y-1">
                    {renderActionButtons(true)}
                    <div className="border-t my-2"></div>
                     <button onClick={() => handleMenuAction(onProfileClick)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md" role="menuitem">Profile</button>
                     <button onClick={() => handleMenuAction(onBillingClick)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md" role="menuitem">Billing</button>
                     <button onClick={() => handleMenuAction(onUsageAnalyticsClick)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md" role="menuitem">Usage Analytics</button>
                    <div className="border-t my-2"></div>
                    <button onClick={() => handleMenuAction(onLogout)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md" role="menuitem">Logout</button>
                </div>
            </div>
        )}
    </header>
  );
};

// FIX: Add a helper function to convert FarmerModel to a plain Farmer object.
const modelToPlain = (f: FarmerModel | null): Farmer | null => {
    if (!f) return null;
    return {
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
    };
};

const App: React.FC = () => {
  const [isAppLaunched, setIsAppLaunched] = useState(false);
  const [supabase, setSupabase] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showSupabaseSettings, setShowSupabaseSettings] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'accept-invitation'>('login');
  
  const [view, setView] = useState<'dashboard' | 'profile' | 'admin' | 'billing' | 'usage-analytics'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [printingFarmer, setPrintingFarmer] = useState<FarmerModel | null>(null);
  const [pdfExportFarmer, setPdfExportFarmer] = useState<FarmerModel | null>(null);
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showRawDataView, setShowRawDataView] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const isOnline = useOnlineStatus();
  const [filters, setFilters] = useState<Filters>({ searchQuery: '', district: '', mandal: '', village: '', status: '', registrationDateFrom: '', registrationDateTo: '' });
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Farmer | 'id', direction: 'ascending' | 'descending' } | null>({ key: 'registrationDate', direction: 'descending' });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const database = useDatabase();
  const farmersCollection = database.get<FarmerModel>('farmers');
  
  const allFarmers = useQuery(farmersCollection.query(Q.where('syncStatus', Q.notEq('pending_delete'))));
  const pendingSyncCount = useQuery(farmersCollection.query(Q.where('syncStatus', Q.oneOf(['pending', 'pending_delete'])))).length;
  
  // FIX: Create a memoized plain object version of the farmers for components that expect the `Farmer[]` type.
  const allFarmersPlain: Farmer[] = useMemo(() => allFarmers.map(f => modelToPlain(f)!), [allFarmers]);
  
  const currentUserPermissions = useMemo(() => {
    if (!currentUser) return new Set<Permission>();
    const userGroup = groups.find(g => g.id === currentUser.groupId);
    return new Set(userGroup?.permissions || []);
  }, [currentUser, groups]);

  // --- SUPABASE & AUTH ---
  useEffect(() => {
    // Pre-configure Supabase credentials by setting them in localStorage.
    // This ensures the app connects automatically on first load.
    if (!localStorage.getItem('supabaseUrl') || !localStorage.getItem('supabaseAnonKey')) {
        localStorage.setItem('supabaseUrl', SUPABASE_URL);
        localStorage.setItem('supabaseAnonKey', SUPABASE_ANON_KEY);
    }
    
    const client = initializeSupabase();
    if (client) {
      setSupabase(client);
    } else {
      // This modal will now only show if the Supabase CDN script fails to load.
      setShowSupabaseSettings(true);
    }
  }, []);

    const handlePushSync = useCallback(async (isManual = false) => {
        if (!supabase || !isOnline || syncLoading) {
            if (isManual && !isOnline) setNotification({ message: 'Cannot sync while offline.', type: 'error' });
            return;
        }

        const pendingFarmers = await farmersCollection.query(Q.where('syncStatus', 'pending')).fetch();
        const pendingDeleteFarmers = await farmersCollection.query(Q.where('syncStatus', 'pending_delete')).fetch();

        if (pendingFarmers.length === 0 && pendingDeleteFarmers.length === 0) {
            if (isManual) setNotification({ message: 'Everything is up to date.', type: 'success' });
            return;
        }

        setSyncLoading(true);
        if (isManual) setNotification({ message: 'Syncing local changes...', type: 'success' });

        try {
            if (pendingFarmers.length > 0) {
                const plainFarmers = pendingFarmers.map(mapModelToApi);
                const { error } = await supabase.from('farmers').upsert(plainFarmers);
                if (error) throw error;
                await database.write(async () => {
                    const updates = pendingFarmers.map(f => f.prepareUpdate(rec => { 
// FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
rec.syncStatusLocal = 'synced'; }));
                    await database.batch(...updates);
                });
            }

            if (pendingDeleteFarmers.length > 0) {
                const idsToDelete = pendingDeleteFarmers.map(f => f.id);
                const { error } = await supabase.from('farmers').delete().in('id', idsToDelete);
                if (error) throw error;
                await database.write(async () => {
                    const deletions = pendingDeleteFarmers.map(f => f.prepareDestroyPermanently());
                    await database.batch(...deletions);
                });
            }
            if (isManual) setNotification({ message: 'Local changes synced successfully.', type: 'success' });
        } catch (error: any) {
            console.error('Push sync failed:', error);
            if (isManual) setNotification({ message: `Sync failed: ${error.message}`, type: 'error' });
        } finally {
            setSyncLoading(false);
        }
    }, [supabase, isOnline, syncLoading, database, farmersCollection]);
  
  const handlePullSync = useCallback(async (isInitialSync = false) => {
      if (!supabase || !isOnline) {
          if (!isInitialSync) setNotification({ message: `Cannot sync while offline.`, type: 'error'});
          return;
      }
      if (!isInitialSync) setNotification({ message: 'Fetching latest data from server...', type: 'success' });
      try {
          const { data, error } = await supabase.from('farmers').select('*');
          if (error) throw error;

          if (data && data.length > 0) {
              await database.write(async () => {
                  const existingFarmers = await farmersCollection.query().fetch();
                  const recordsToUpdate: FarmerModel[] = [];
                  const recordsToCreate: any[] = [];

                  for (const remoteFarmer of data) {
                      const remoteFarmerCamel = snakeToCamelCase(remoteFarmer);
                      const localFarmer = existingFarmers.find(f => f.id === remoteFarmerCamel.id);
                      if (localFarmer) {
                          // FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
if (localFarmer.syncStatusLocal === 'synced') {
                             recordsToUpdate.push(
                                localFarmer.prepareUpdate(record => {
                                    // FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
Object.assign(record, { ...remoteFarmerCamel, syncStatusLocal: 'synced' });
                                })
                            );
                          }
                      } else {
                          recordsToCreate.push(
                              farmersCollection.prepareCreate(record => {
                                  // FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
Object.assign(record, { ...remoteFarmerCamel, syncStatusLocal: 'synced' });
                                  record._raw.id = remoteFarmerCamel.id;
                              })
                          );
                      }
                  }
                  
                  const allOperations = [...recordsToCreate, ...recordsToUpdate];
                  if (allOperations.length > 0) {
                      await database.batch(...allOperations);
                  }
              });
              if (!isInitialSync) setNotification({ message: `Successfully synced ${data.length} records from the server.`, type: 'success' });
          } else {
               if (!isInitialSync) setNotification({ message: 'No new data found on the server.', type: 'success' });
          }
      } catch (error: any) {
          if (!isInitialSync) setNotification({ message: `Failed to fetch data: ${error.message}`, type: 'error' });
      }
  }, [supabase, isOnline, database, farmersCollection]);

  // --- Real-time and Background Sync ---
  useEffect(() => {
    if (!supabase || !session) return;
    
    // 1. Background PUSH sync for pending changes
    const syncInterval = setInterval(() => handlePushSync(false), 30000); // Sync every 30 seconds

    // 2. Real-time PULL subscription for changes from other clients
    const channel = supabase.channel('public:farmers');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farmers' }, async (payload: any) => {
        await database.write(async () => {
            const collection = database.get<FarmerModel>('farmers');
            let farmer;
            const newRecord = payload.new ? snakeToCamelCase(payload.new) : null;
            const oldRecordId = payload.old ? payload.old.id : null;
            
            switch (payload.eventType) {
                case 'INSERT':
                case 'UPDATE':
                    if (!newRecord) return;
                    const existing = await collection.query(Q.where('id', newRecord.id)).fetch();
                    if (existing.length > 0) {
                        farmer = existing[0];
                        // FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
if (farmer.syncStatusLocal === 'synced') {
                           // FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
await farmer.update(rec => Object.assign(rec, { ...newRecord, syncStatusLocal: 'synced' }));
                        }
                    } else {
                       await collection.create(rec => {
                           // FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
Object.assign(rec, { ...newRecord, syncStatusLocal: 'synced' });
                           rec._raw.id = newRecord.id;
                       });
                    }
                    break;
                case 'DELETE':
                    if (!oldRecordId) return;
                    try {
                      farmer = await collection.find(oldRecordId);
                      await farmer.destroyPermanently();
                    } catch (e) {
                      // Might have already been deleted, ignore
                    }
                    break;
            }
        });
      })
      .subscribe();
      
    return () => {
        clearInterval(syncInterval);
        supabase.removeChannel(channel);
    };

  }, [supabase, session, database, farmersCollection, handlePushSync]);
  
  useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('invitation')) {
          setAuthView('accept-invitation');
          window.history.replaceState({}, document.title, window.location.pathname);
      }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      console.error('Error fetching user profile:', error);
    } else if (data) {
      setCurrentUser({ id: data.id, name: data.full_name, avatar: data.avatar_url, groupId: data.group_id });
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const fetchPublicData = async () => {
        const { data: groupsData, error: groupsError } = await supabase.from('groups').select('*');
        if (groupsError) console.error('Error fetching groups:', groupsError); else setGroups(groupsData || []);
        
        const { data: invData, error: invError } = await supabase.from('invitations').select('*');
        if (invError) console.error('Error fetching invitations:', invError); else setInvitations((invData || []).map(mapInvitationToCamelCase));
    };
    fetchPublicData();
  }, [supabase]);
  
  useEffect(() => {
    if (!supabase) return;
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        handlePullSync(true); // Initial data pull on session load
      }
    };
    getInitialSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        handlePullSync(true); // Initial data pull on login
      }
      else setCurrentUser(null);
    });
    return () => authListener.subscription.unsubscribe();
  }, [supabase, fetchUserProfile, handlePullSync]);

  useEffect(() => {
    // Fetch all users for displaying names, not just for admins
    if (session && supabase) {
        const fetchAllUsers = async () => {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) {
                console.error('Error fetching users:', error);
            } else {
                setUsers(data.map((d: any) => ({ id: d.id, name: d.full_name, avatar: d.avatar_url, groupId: d.group_id })) || []);
            }
        };
        fetchAllUsers();
    }
  }, [session, supabase]);

  const handleSaveSupabaseSettings = (url: string, key: string) => {
    localStorage.setItem('supabaseUrl', url);
    localStorage.setItem('supabaseAnonKey', key);
    window.location.reload();
  };
  
  const handleLogout = async () => {
      if (supabase) await supabase.auth.signOut();
      setCurrentUser(null);
      setView('dashboard');
  };

  const handleSignUp = async (name: string, email: string, password: string): Promise<string | null> => {
    if (!supabase) return "Supabase client not available.";

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                avatar_url: 'https://terrigen-cdn-dev.marvel.com/content/prod/1x/003cap_ons_crd_03.jpg', // Default avatar
            }
        }
    });

    if (error) {
        return error.message;
    }
    
    // On success, return null to indicate no error. The LoginScreen will show a success message.
    return null;
  };

  const handleSaveProfile = async (updatedUser: User) => {
      if (!supabase || !currentUser) return;
      const { error } = await supabase
          .from('profiles')
          .update({ full_name: updatedUser.name, avatar_url: updatedUser.avatar })
          .eq('id', currentUser.id);

      if (error) {
          setNotification({ message: `Error updating profile: ${error.message}`, type: 'error' });
      } else {
          setCurrentUser(updatedUser); // Optimistic update
          setNotification({ message: 'Profile updated successfully.', type: 'success' });
          setView('dashboard');
      }
  };
  
  const handleSaveGroups = async (updatedGroups: Group[]) => {
      if (!supabase) return;
      const { error } = await supabase.from('groups').upsert(updatedGroups);
      if (error) {
          setNotification({ message: `Error saving groups: ${error.message}`, type: 'error' });
      } else {
          setGroups(updatedGroups);
          setNotification({ message: 'Groups and permissions saved successfully.', type: 'success' });
      }
  };

  const handleSaveUsers = async (updatedUsers: User[]) => {
      if (!supabase) return;
      const updates = updatedUsers
          .filter(u => {
              const originalUser = users.find(ou => ou.id === u.id);
              return originalUser && originalUser.groupId !== u.groupId;
          })
          .map(u => ({ id: u.id, group_id: u.groupId }));

      if (updates.length > 0) {
        const { error } = await supabase.from('profiles').upsert(updates);
        if (error) {
            setNotification({ message: `Error updating user groups: ${error.message}`, type: 'error' });
        } else {
            setUsers(updatedUsers);
            setNotification({ message: 'User groups updated successfully.', type: 'success' });
        }
      }
  };
  
  const handleInviteUser = async (email: string, groupId: string): Promise<string> => {
      if (!supabase) return '';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const { data, error } = await supabase
          .from('invitations')
          .insert({
              email_for: email,
              group_id: groupId,
              expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

      if (error) {
          setNotification({ message: `Error creating invitation: ${error.message}`, type: 'error' });
          return '';
      } else {
          const newInvitation = mapInvitationToCamelCase(data);
          setInvitations(prev => [...prev, newInvitation]);
          setNotification({ message: `Invitation created for ${email}.`, type: 'success' });
          return newInvitation.id;
      }
  };
  
    const handleAcceptInvitation = async (code: string, userDetails: { name: string; avatar: string; password: string }) => {
// FIX: The original code used snake_case (`group_id`, `email_for`) to access properties
// on the `invitation` object, but the TypeScript type `Invitation` defines these
// properties in camelCase (`groupId`, `emailFor`). This caused a TypeScript error.
// The code is corrected to use the camelCase properties as defined in the type,
// ensuring type safety and preventing runtime errors.
        if (!supabase) return;
        const invitation = invitations.find(inv => inv.id === code);
        if (!invitation) {
            setNotification({ message: "Invalid invitation code.", type: 'error' });
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email: invitation.emailFor,
            password: userDetails.password,
            options: {
                data: {
                    full_name: userDetails.name,
                    avatar_url: userDetails.avatar,
                    group_id: invitation.groupId,
                },
            },
        });
        
        if (error) {
            setNotification({ message: `Registration failed: ${error.message}`, type: 'error' });
        } else if (data.user) {
            await supabase
                .from('invitations')
                .update({ status: 'accepted', accepted_by_user_id: data.user.id })
                .eq('id', code);

            setNotification({ message: "Registration successful! You can now log in.", type: 'success' });
            setAuthView('login');
        }
    };


  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleRegisterClick = () => {
    setShowForm(true);
  };

  const handleRegistration = useCallback(async (farmer: Farmer, photoFile?: File) => {
    if (!currentUser) return;
    let photoBase64 = '';
    if (photoFile) {
        photoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(photoFile);
        });
    }

    await database.write(async () => {
      await farmersCollection.create(record => {
        Object.assign(record, { 
            ...farmer, 
            photo: photoBase64,
            createdBy: currentUser.id,
            updatedBy: currentUser.id 
        });
        record._raw.id = farmer.id; // Important for WatermelonDB
      });
    });
    setNewlyAddedFarmerId(farmer.id);
  }, [database, farmersCollection, currentUser]);

  const handleSaveRow = useCallback(async (farmerToUpdate: FarmerModel, updatedData: Partial<Pick<Farmer, 'fullName' | 'mobileNumber' | 'status'>>) => {
    if (!currentUser) return;
    await database.write(async () => {
      await farmerToUpdate.update(record => {
        // FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
Object.assign(record, { ...updatedData, syncStatusLocal: 'pending', updatedBy: currentUser.id });
      });
    });
    setEditingRowId(null);
  }, [database, currentUser]);

  const handleDeleteSelected = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const confirmDeleteSelected = useCallback(async () => {
    await database.write(async () => {
      const farmersToDelete = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
      const updates = farmersToDelete.map(farmer =>
        farmer.prepareUpdate(record => {
          // FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
record.syncStatusLocal = 'pending_delete';
        })
      );
      await database.batch(...updates);
    });
    setShowDeleteConfirmation(false);
    setSelectedFarmerIds([]);
    setNotification({ message: `${selectedFarmerIds.length} farmer(s) marked for deletion.`, type: 'success' });
  }, [database, farmersCollection, selectedFarmerIds]);

  const handleBatchUpdate = useCallback(async (newStatus: FarmerStatus) => {
    if (!currentUser) return;
    await database.write(async () => {
      const farmersToUpdate = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
      const updates = farmersToUpdate.map(farmer =>
        farmer.prepareUpdate(record => {
          record.status = newStatus;
          // FIX: Use `syncStatusLocal` to avoid conflict with the base Model's `syncStatus` accessor.
record.syncStatusLocal = 'pending';
          record.updatedBy = currentUser.id;
        })
      );
      await database.batch(...updates);
    });
    setShowBatchUpdateModal(false);
    setSelectedFarmerIds([]);
    setNotification({ message: `${selectedFarmerIds.length} farmer(s) updated to "${newStatus}".`, type: 'success' });
  }, [database, farmersCollection, selectedFarmerIds, currentUser]);
  
  const handleBulkImport = useCallback(async (newFarmers: Farmer[]) => {
      if (!currentUser) return;
      await database.write(async () => {
          const creations = newFarmers.map(farmer => 
              farmersCollection.prepareCreate(record => {
                  Object.assign(record, {
                      ...farmer,
                      createdBy: currentUser.id,
                      updatedBy: currentUser.id,
                  });
                  record._raw.id = farmer.id;
              })
          );
          await database.batch(...creations);
      });
      setNotification({ message: `${newFarmers.length} new farmers imported successfully.`, type: 'success'});
  }, [database, farmersCollection, currentUser]);

  const handlePrint = (farmer: FarmerModel) => {
    setPrintingFarmer(farmer);
    setTimeout(() => {
        window.print();
        setPrintingFarmer(null);
    }, 100);
  };
  
    const handleExportToPdf = useCallback((farmer: FarmerModel) => {
    setPdfExportFarmer(farmer);
  }, []);
  
  useEffect(() => {
    if (pdfExportFarmer && pdfContainerRef.current) {
        const exportPdf = async () => {
            const { jsPDF } = jspdf;
            const canvas = await html2canvas(pdfContainerRef.current as HTMLElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`Hapsara-Farmer-${pdfExportFarmer.farmerId}.pdf`);
            setPdfExportFarmer(null);
        };
        // Use a short timeout to allow the component to render before capturing
        setTimeout(exportPdf, 100);
    }
}, [pdfExportFarmer]);

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setSelectedFarmerIds([]);
    setCurrentPage(1);
  }, []);

  const handleSortRequest = useCallback((key: keyof Farmer | 'id') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  }, [sortConfig]);

  const processedFarmers = useMemo(() => {
    let farmersData = [...allFarmers];

    if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        farmersData = farmersData.filter(f =>
            f.fullName.toLowerCase().includes(query) ||
            f.farmerId.toLowerCase().includes(query) ||
            f.mobileNumber.includes(query)
        );
    }
    if (filters.district) farmersData = farmersData.filter(f => f.district === filters.district);
    if (filters.mandal) farmersData = farmersData.filter(f => f.mandal === filters.mandal);
    if (filters.village) farmersData = farmersData.filter(f => f.village === filters.village);
    if (filters.status) farmersData = farmersData.filter(f => f.status === filters.status);
    if (filters.registrationDateFrom) farmersData = farmersData.filter(f => new Date(f.registrationDate) >= new Date(filters.registrationDateFrom));
    if (filters.registrationDateTo) farmersData = farmersData.filter(f => new Date(f.registrationDate) <= new Date(filters.registrationDateTo));
    
    if (sortConfig !== null) {
      farmersData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return farmersData;
  }, [allFarmers, filters, sortConfig]);

  useEffect(() => {
    const totalPages = Math.ceil(processedFarmers.length / rowsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
    }
  }, [processedFarmers, currentPage, rowsPerPage]);

  const paginatedFarmers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return processedFarmers.slice(startIndex, startIndex + rowsPerPage);
  }, [processedFarmers, currentPage, rowsPerPage]);

  const handleSelectionChange = useCallback((farmerId: string, isSelected: boolean) => {
    setSelectedFarmerIds(prev => {
      if (isSelected) {
        return [...prev, farmerId];
      } else {
        return prev.filter(id => id !== farmerId);
      }
    });
  }, []);

  const handleSelectAll = useCallback((allSelected: boolean) => {
    if (allSelected) {
      setSelectedFarmerIds(paginatedFarmers.map(f => f.id));
    } else {
      setSelectedFarmerIds([]);
    }
  }, [paginatedFarmers]);

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleRowsPerPageChange = (rows: number) => {
      setRowsPerPage(rows);
      setCurrentPage(1);
  };

  const exportToExcel = () => {
    const { utils, writeFile } = (window as any).XLSX;
    const dataToExport = processedFarmers.map(f => {
        const district = GEO_DATA.find(d => d.code === f.district)?.name || f.district;
        const mandal = GEO_DATA.find(d => d.code === f.district)?.mandals.find(m => m.code === f.mandal)?.name || f.mandal;
        const village = GEO_DATA.find(d => d.code === f.district)?.mandals.find(m => m.code === f.mandal)?.villages.find(v => v.code === f.village)?.name || f.village;
        
        return {
            'Hap ID': f.farmerId,
            'Application ID': f.applicationId,
            'Full Name': f.fullName,
            'Father/Husband Name': f.fatherHusbandName,
            'Mobile Number': f.mobileNumber,
            'Aadhaar Number': f.aadhaarNumber,
            'Status': f.status,
            'Registration Date': new Date(f.registrationDate).toLocaleDateString(),
            'District': district,
            'Mandal': mandal,
            'Village': village,
            'Address': f.address,
            'Approved Extent (Acres)': f.approvedExtent,
            'Number of Plants': f.numberOfPlants,
        };
    });
    const ws = utils.json_to_sheet(dataToExport);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Farmers");
    writeFile(wb, "Hapsara_Farmers_Export.xlsx");
  };

  const exportToCsv = () => {
    const { utils } = (window as any).XLSX;
    const dataToExport = processedFarmers.map(f => {
        const district = GEO_DATA.find(d => d.code === f.district)?.name || f.district;
        const mandal = GEO_DATA.find(d => d.code === f.district)?.mandals.find(m => m.code === f.mandal)?.name || f.mandal;
        const village = GEO_DATA.find(d => d.code === f.district)?.mandals.find(m => m.code === f.mandal)?.villages.find(v => v.code === f.village)?.name || f.village;
        
        return {
            'Hap ID': f.farmerId,
            'Application ID': f.applicationId,
            'Full Name': f.fullName,
            'Father/Husband Name': f.fatherHusbandName,
            'Mobile Number': f.mobileNumber,
            'Aadhaar Number': f.aadhaarNumber,
            'Status': f.status,
            'Registration Date': new Date(f.registrationDate).toLocaleDateString(),
            'District': district,
            'Mandal': mandal,
            'Village': village,
            'Address': f.address,
            'Approved Extent (Acres)': f.approvedExtent,
            'Number of Plants': f.numberOfPlants,
        };
    });
    const ws = utils.json_to_sheet(dataToExport);
    const csv = utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Hapsara_Farmers_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!isAppLaunched) {
      return <Suspense fallback={<div></div>}><LandingPage onLaunch={() => setIsAppLaunched(true)} /></Suspense>;
  }

  if (showSupabaseSettings) {
      return <Suspense fallback={<div></div>}><SupabaseSettingsModal onSave={handleSaveSupabaseSettings} /></Suspense>;
  }
  
  if (!session) {
    if (authView === 'accept-invitation') {
      return <Suspense fallback={<div></div>}><AcceptInvitation groups={groups} invitations={invitations} onAccept={handleAcceptInvitation} onBackToLogin={() => setAuthView('login')} /></Suspense>
    }
    return <Suspense fallback={<div></div>}><LoginScreen supabase={supabase} onSignUp={handleSignUp} onAcceptInvitationClick={() => setAuthView('accept-invitation')} /></Suspense>;
  }

  const renderView = () => {
    switch(view) {
        case 'profile':
            return <Suspense fallback={<ModalLoader/>}><ProfilePage currentUser={currentUser!} groups={groups} onSave={handleSaveProfile} onBack={() => setView('dashboard')} /></Suspense>;
        case 'admin':
            return <Suspense fallback={<ModalLoader/>}><AdminPage users={users} groups={groups} invitations={invitations} onInviteUser={handleInviteUser} currentUser={currentUser!} onSaveUsers={handleSaveUsers} onSaveGroups={handleSaveGroups} onBack={() => setView('dashboard')} /></Suspense>;
        case 'billing':
            return <Suspense fallback={<ModalLoader/>}><BillingPage currentUser={currentUser!} onBack={() => setView('dashboard')} userCount={users.length} recordCount={allFarmers.length} /></Suspense>
        case 'usage-analytics':
            return <Suspense fallback={<ModalLoader/>}><UsageAnalyticsPage currentUser={currentUser!} onBack={() => setView('dashboard')} /></Suspense>
        case 'dashboard':
        default:
            return (
                <main className="p-4 sm:p-6">
                    <FilterBar onFilterChange={handleFilterChange} />
                    <FarmerList
                        farmers={paginatedFarmers}
                        users={users}
                        canEdit={currentUserPermissions.has(Permission.CAN_EDIT_FARMER)}
                        canDelete={currentUserPermissions.has(Permission.CAN_DELETE_FARMER)}
                        editingRowId={editingRowId}
                        onEditRow={setEditingRowId}
                        onCancelEditRow={() => setEditingRowId(null)}
                        onSaveRow={handleSaveRow}
                        onPrint={handlePrint}
                        onExportToPdf={handleExportToPdf}
                        selectedFarmerIds={selectedFarmerIds}
                        onSelectionChange={handleSelectionChange}
                        onSelectAll={handleSelectAll}
                        sortConfig={sortConfig}
                        onRequestSort={handleSortRequest}
                        newlyAddedFarmerId={newlyAddedFarmerId}
                        onHighlightComplete={() => setNewlyAddedFarmerId(null)}
                        onDeleteSelected={handleDeleteSelected}
                        totalRecords={processedFarmers.length}
                        currentPage={currentPage}
                        rowsPerPage={rowsPerPage}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                    />
                </main>
            );
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onProfileClick={() => setView('profile')}
        onBillingClick={() => setView('billing')}
        onUsageAnalyticsClick={() => setView('usage-analytics')}
        onAdminClick={() => setView('admin')}
        onSetupGuideClick={() => setShowSetupGuide(true)}
        onRegister={handleRegisterClick}
        onExport={() => exportToExcel()}
        onExportCsv={() => exportToCsv()}
        onImport={() => setShowImportModal(true)}
        onViewRawData={() => setShowRawDataView(true)}
        onDeleteSelected={handleDeleteSelected}
        onBatchUpdate={() => setShowBatchUpdateModal(true)}
        onSync={() => handlePushSync(true)}
        syncLoading={syncLoading}
        selectedCount={selectedFarmerIds.length}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        permissions={currentUserPermissions}
      />
      
      {renderView()}

      {showForm && (
        <Suspense fallback={<ModalLoader/>}>
            <RegistrationForm
                onSubmit={handleRegistration}
                onCancel={() => setShowForm(false)}
// FIX: Pass the plain Farmer array instead of FarmerModel array to match component's prop type.
                existingFarmers={allFarmersPlain}
            />
        </Suspense>
      )}
      
       {showRawDataView && (
            <Suspense fallback={<ModalLoader/>}>
                <RawDataView farmers={allFarmers} onClose={() => setShowRawDataView(false)} />
            </Suspense>
       )}

       {showSetupGuide && (
        <Suspense fallback={<ModalLoader/>}>
          <SupabaseSetupGuide onClose={() => setShowSetupGuide(false)} />
        </Suspense>
       )}
      
      {showBatchUpdateModal && (
        <Suspense fallback={<ModalLoader/>}>
            <BatchUpdateStatusModal selectedCount={selectedFarmerIds.length} onUpdate={handleBatchUpdate} onCancel={() => setShowBatchUpdateModal(false)}/>
        </Suspense>
      )}

      {showImportModal && (
          <Suspense fallback={<ModalLoader/>}>
{/* FIX: Pass the plain Farmer array instead of FarmerModel array to match component's prop type. */}
              <BulkImportModal onClose={() => setShowImportModal(false)} onSubmit={handleBulkImport} existingFarmers={allFarmersPlain} />
          </Suspense>
      )}

      {showDeleteConfirmation && (
          <Suspense fallback={<ModalLoader/>}>
              <ConfirmationModal
                  isOpen={showDeleteConfirmation}
                  title="Confirm Deletion"
                  message={`Are you sure you want to delete ${selectedFarmerIds.length} farmer record(s)? This action cannot be undone.`}
                  onConfirm={confirmDeleteSelected}
                  onCancel={() => setShowDeleteConfirmation(false)}
                  confirmText="Delete"
                  confirmButtonClass="bg-red-600 hover:bg-red-700"
              />
          </Suspense>
      )}

      <div ref={pdfContainerRef} className="absolute -left-[9999px] top-0">
{/* FIX: Convert FarmerModel to plain Farmer object before passing to PrintView. */}
          {pdfExportFarmer && <Suspense fallback={<div></div>}><PrintView farmer={modelToPlain(pdfExportFarmer)} users={users} isForPdf={true} /></Suspense>}
      </div>
{/* FIX: Convert FarmerModel to plain Farmer object before passing to PrintView. */}
      <PrintView farmer={modelToPlain(printingFarmer)} users={users} />

      {notification && (
        <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default App;