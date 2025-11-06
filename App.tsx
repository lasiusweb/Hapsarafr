import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Farmer, FarmerStatus, User, Group, Permission, Invitation, AppContent, AuditLogEntry, DashboardStats } from './types';
import { GEO_DATA } from './data/geoData';
import FilterBar, { Filters } from './components/FilterBar';
import FarmerList from './components/FarmerList';
import { useDatabase } from './DatabaseContext';
import { Q, Query } from '@nozbe/watermelondb';
import { FarmerModel } from './db';
import { initializeSupabase } from './lib/supabase';

// Lazily import components to enable code-splitting
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const PrintView = lazy(() => import('./components/PrintView'));
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
const HelpModal = lazy(() => import('./components/HelpModal'));
const FeedbackModal = lazy(() => import('./components/FeedbackModal'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));
const ContentManagerPage = lazy(() => import('./components/ContentManagerPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const SupabaseSetupGuide = lazy(() => import('./components/SupabaseSetupGuide'));


// Type declarations for CDN libraries
declare const html2canvas: any;
declare const jspdf: any;

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
    created_at: farmer.createdAt,
    updated_at: farmer.updatedAt,
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

type View = 'dashboard' | 'farmer-directory' | 'profile' | 'admin' | 'billing' | 'usage-analytics' | 'content-manager';

// Helper function to get view from hash
const getViewFromHash = (): View | 'not-found' => {
    const hash = window.location.hash.replace(/^#\/?/, ''); // Removes # or #/
    switch (hash) {
        case 'farmer-directory':
        case 'profile':
        case 'admin':
        case 'billing':
        case 'usage-analytics':
        case 'content-manager':
            return hash;
        case '':
        case 'dashboard':
             return 'dashboard';
        default:
            return 'not-found';
    }
};

type AppState = 'LANDING' | 'LOADING' | 'AUTH' | 'APP';

const Header: React.FC<{
    onToggleSidebar: () => void;
    currentView: View | 'not-found';
    onRegister: () => void;
    onSync: () => void;
    syncLoading: boolean;
    pendingSyncCount: number;
    isOnline: boolean;
    permissions: Set<Permission>;
}> = ({ onToggleSidebar, currentView, onRegister, onSync, syncLoading, pendingSyncCount, isOnline, permissions }) => {
    const canRegister = permissions.has(Permission.CAN_REGISTER_FARMER);
    const viewTitles: Record<View | 'not-found', string> = {
        dashboard: 'Dashboard',
        'farmer-directory': 'Farmer Directory',
        profile: 'My Profile',
        admin: 'Admin Panel',
        billing: 'Billing & Usage',
        'usage-analytics': 'Usage Analytics',
        'content-manager': 'Content Manager',
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
                            <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 text-yellow-900 text-xs items-center justify-center font-bold">{pendingSyncCount}</span></span>
                        )}
                    </button>
                )}
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

const Sidebar: React.FC<{
    isOpen: boolean;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    currentUser: User | null;
    onLogout: () => void;
    onNavigate: (view: View) => void;
    currentView: View | 'not-found';
    permissions: Set<Permission>;
    onImport: () => void;
    onExportExcel: () => void;
    onExportCsv: () => void;
    onViewRawData: () => void;
    onShowPrivacy: () => void;
    onShowHelp: () => void;
    onShowFeedback: () => void;
}> = ({ 
    isOpen, isCollapsed, onToggleCollapse, currentUser, onLogout, onNavigate, currentView, permissions, 
    onImport, onExportExcel, onExportCsv, onViewRawData,
    onShowPrivacy, onShowHelp, onShowFeedback
}) => {
    
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const canManageAdmin = permissions.has(Permission.CAN_MANAGE_GROUPS) || permissions.has(Permission.CAN_MANAGE_USERS);
    const canManageContent = permissions.has(Permission.CAN_MANAGE_CONTENT);
    const canImport = permissions.has(Permission.CAN_IMPORT_DATA);
    const canExport = permissions.has(Permission.CAN_EXPORT_DATA);

    const NavItem: React.FC<{ icon: React.ReactNode; text: string; view: View; isSubItem?: boolean; }> = ({ icon, text, view, isSubItem = false }) => {
        const isActive = currentView === view;
        return (
            <li className="relative group">
                <button
                    onClick={() => onNavigate(view)}
                    className={`flex items-center w-full text-left p-3 rounded-md transition-colors ${isSubItem ? 'pl-12' : ''} ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                    {icon}
                    <span className={`ml-4 whitespace-nowrap sidebar-item-text`}>{text}</span>
                </button>
                 {isCollapsed && <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{text}</div>}
            </li>
        );
    };
    
     const DataNavItem: React.FC<{ icon: React.ReactNode; text: string; onClick: () => void; isSubItem?: boolean; }> = ({ icon, text, onClick, isSubItem = false }) => {
        return (
            <li className="relative group">
                <button
                    onClick={onClick}
                    className={`flex items-center w-full text-left p-3 rounded-md transition-colors ${isSubItem ? 'pl-12' : ''} text-gray-300 hover:bg-gray-700 hover:text-white`}
                >
                    {icon}
                    <span className={`ml-4 whitespace-nowrap sidebar-item-text`}>{text}</span>
                </button>
                {isCollapsed && <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{text}</div>}
            </li>
        );
    };

    const NavCategory: React.FC<{ text: string }> = ({ text }) => (
        <li className="px-3 pt-4 pb-2">
            <span className={`text-xs font-semibold text-gray-500 uppercase sidebar-category-text`}>{text}</span>
        </li>
    );

    const sidebarClasses = `
        bg-gray-800 text-white flex-shrink-0 flex flex-col z-40
        ${isCollapsed ? 'sidebar-collapsed w-20' : 'w-64'}
        hidden lg:flex sidebar
    `;

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className={sidebarClasses}>
                <div className="flex items-center gap-2 p-4 border-b border-gray-700 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/></svg>
                    <span className={`text-xl font-bold sidebar-item-text`}>Hapsara</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                    <ul className="space-y-1">
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} text="Dashboard" view="dashboard" />
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} text="Farmer Directory" view="farmer-directory" />
                        {canManageAdmin && <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} text="Admin Panel" view="admin" />}
                        {canManageContent && <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} text="Content Manager" view="content-manager" />}

                        {(canImport || canExport || canManageAdmin) && <NavCategory text="Tools" />}
                        {canImport && <DataNavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} text="Import Data" onClick={onImport} />}
                        {canExport && <DataNavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} text="Export to Excel" onClick={onExportExcel} />}
                        {canExport && <DataNavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>} text="Export to CSV" onClick={onExportCsv} />}
                        {canExport && <DataNavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>} text="View Raw Data" onClick={onViewRawData} />}
                    </ul>
                </div>
                
                <div className="mt-auto flex-shrink-0">
                    <div className="p-2 border-t border-gray-700">
                        <div className="relative">
                            {isUserMenuOpen && (
                                <div className={`
                                    absolute z-50 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 bg-gray-700
                                    ${isCollapsed
                                        ? 'left-full bottom-2 ml-2 w-56' // Position to the side when collapsed
                                        : 'bottom-full mb-2 w-full' // Position above when expanded
                                    }
                                `}>
                                    <div className="py-1">
                                        <button onClick={() => { onNavigate('profile'); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 rounded-t-md">Settings</button>
                                        <button onClick={() => { onNavigate('billing'); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Billing</button>
                                        <button onClick={() => { onNavigate('usage-analytics'); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Usage</button>
                                        <div className="border-t border-gray-600 my-1"></div>
                                        <button onClick={() => { onShowHelp(); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Help</button>
                                        <button onClick={() => { onShowFeedback(); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Feedback</button>
                                        <button onClick={() => { onShowPrivacy(); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Privacy</button>
                                        <div className="border-t border-gray-600 my-1"></div>
                                        <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 rounded-b-md">Logout</button>
                                    </div>
                                </div>
                            )}
                             {currentUser && (
                                <button onClick={() => setIsUserMenuOpen(o => !o)} className="flex items-center w-full text-left p-2 rounded-md hover:bg-gray-700">
                                    <img src={currentUser.avatar} alt="User Avatar" className="w-10 h-10 rounded-full border-2 border-gray-600 flex-shrink-0" />
                                    <div className={`ml-3 overflow-hidden sidebar-item-text`}>
                                        <p className="font-semibold text-sm text-white whitespace-nowrap">{currentUser.name}</p>
                                        <p className="text-xs text-gray-400 whitespace-nowrap capitalize">Usage-Based Plan</p>
                                    </div>
                                </button>
                             )}
                        </div>
                    </div>
                     <div className="p-2 border-t border-gray-700 relative group">
                        <button onClick={onToggleCollapse} className="flex items-center justify-center w-full p-3 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white">
                            {isCollapsed 
                                ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg> 
                                : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                            }
                        </button>
                        {isCollapsed && <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Expand</div>}
                    </div>
                </div>
            </nav>
        </>
    );
};

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
        createdAt: new Date(f.createdAt).toISOString(),
        updatedAt: new Date(f.updatedAt).toISOString(),
    };
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('LANDING');

  const [supabase, setSupabase] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [appContent, setAppContent] = useState<Partial<AppContent> | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'accept-invitation'>('login');
  
  const [view, setView] = useState<View | 'not-found'>(getViewFromHash());
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
  const isOnline = useOnlineStatus();
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({ searchQuery: '', district: '', mandal: '', village: '', status: '', registrationDateFrom: '', registrationDateTo: '' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Farmer | 'id', direction: 'ascending' | 'descending' } | null>({ key: 'registrationDate', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const database = useDatabase();
  const farmersCollection = database.get<FarmerModel>('farmers');
  
  const allFarmers = useQuery(farmersCollection.query(Q.where('syncStatusLocal', Q.notEq('pending_delete'))));
  const pendingSyncCount = useQuery(farmersCollection.query(Q.where('syncStatusLocal', Q.oneOf(['pending', 'pending_delete'])))).length;
  
  const allFarmersPlain: Farmer[] = useMemo(() => allFarmers.map(f => modelToPlain(f)!), [allFarmers]);
  
  const currentUserPermissions = useMemo(() => {
    if (!currentUser) return new Set<Permission>();
    const userGroup = groups.find(g => g.id === currentUser.groupId);
    return new Set(userGroup?.permissions || []);
  }, [currentUser, groups]);


  // --- ROUTING ---
  const handleNavigate = useCallback((targetView: View) => {
      window.location.hash = targetView;
      setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
        setView(getViewFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
        window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  
  // Secure routing by checking permissions on view change
  useEffect(() => {
    if (appState !== 'APP' || !session) return;
    
    const canAccessAdmin = currentUserPermissions.has(Permission.CAN_MANAGE_USERS) || currentUserPermissions.has(Permission.CAN_MANAGE_GROUPS);
    const canAccessContentManager = currentUserPermissions.has(Permission.CAN_MANAGE_CONTENT);
    
    if (view === 'admin' && !canAccessAdmin) {
        setNotification({ message: "You don't have permission to access the Admin Panel.", type: 'error' });
        handleNavigate('dashboard');
    }
    if (view === 'content-manager' && !canAccessContentManager) {
        setNotification({ message: "You don't have permission to access the Content Manager.", type: 'error' });
        handleNavigate('dashboard');
    }

  }, [view, session, appState, currentUserPermissions, handleNavigate]);

  // --- SUPABASE & AUTH ---
  useEffect(() => {
    const client = initializeSupabase();
    setSupabase(client);
  }, []);

  const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
        console.error('Error fetching user profile:', error);
        if (error.code === 'PGRST116') { // Not found, possibly due to replication delay
            await new Promise(res => setTimeout(res, 1000));
            const { data: retryData, error: retryError } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (retryError) {
                console.error('Retry fetching user profile failed:', retryError);
                return null;
            }
            if (retryData) {
                const userProfile = { id: retryData.id, name: retryData.full_name, avatar: retryData.avatar_url, groupId: retryData.group_id };
                setCurrentUser(userProfile);
                return userProfile;
            }
        }
    } else if (data) {
        const userProfile = { id: data.id, name: data.full_name, avatar: data.avatar_url, groupId: data.group_id };
        setCurrentUser(userProfile);
        return userProfile;
    }
    return null;
  }, [supabase]);
  
    const fetchAppContent = useCallback(async () => {
        if (!supabase) return;
        const { data, error } = await supabase.from('app_content').select('key, value');
        if (error) {
            console.error("Error fetching app content:", error);
            return;
        }
        if (data) {
            const content = data.reduce((acc, { key, value }) => {
                if (key === 'landing_page') {
                    acc.landing_hero_title = value.hero_title;
                    acc.landing_hero_subtitle = value.hero_subtitle;
                    acc.landing_about_us = value.about_us;
                } else if (key === 'privacy_policy') {
                    acc.privacy_policy = value.content;
                } else if (key === 'faqs') {
                    acc.faqs = value.items;
                }
                return acc;
            }, {} as Partial<AppContent>);
            setAppContent(content);
        }
    }, [supabase]);


    useEffect(() => {
        if (appState !== 'LOADING' && appState !== 'AUTH') return;
        if (!supabase) return;

        const handleAuthSession = async (session: any | null) => {
            setSession(session);
            if (session) {
                await fetchUserProfile(session.user.id);
                await fetchAppContent();
                setAppState('APP');
            } else {
                fetchAppContent(); // Also fetch content for landing page
                setAppState('AUTH');
                setCurrentUser(null);
            }
        };
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            await handleAuthSession(session);
        });

        if (appState === 'LOADING') {
            supabase.auth.getSession().then(({ data: { session } }) => {
                handleAuthSession(session);
            });
        }
        
        return () => subscription.unsubscribe();

    }, [appState, supabase, fetchUserProfile, fetchAppContent]);


    const handlePushSync = useCallback(async (isManual = false) => {
        if (!supabase || !isOnline || syncLoading) {
            if (isManual && !isOnline) setNotification({ message: 'Cannot sync while offline.', type: 'error' });
            return;
        }

        const pendingFarmers = await farmersCollection.query(Q.where('syncStatusLocal', 'pending')).fetch();
        const pendingDeleteFarmers = await farmersCollection.query(Q.where('syncStatusLocal', 'pending_delete')).fetch();

        if (pendingFarmers.length === 0 && pendingDeleteFarmers.length === 0) {
            if (isManual) setNotification({ message: 'Everything is up to date.', type: 'success' });
            return;
        }

        setSyncLoading(true);
        if (isManual) setNotification({ message: 'Syncing local changes...', type: 'info' });

        try {
            if (pendingFarmers.length > 0) {
                const plainFarmers = pendingFarmers.map(mapModelToApi);
                const { error } = await supabase.from('farmers').upsert(plainFarmers);
                if (error) throw error;
                await database.write(async () => {
                    const updates = pendingFarmers.map(f => f.prepareUpdate(rec => { 
                        rec.syncStatusLocal = 'synced'; 
                    }));
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
  
    const handleFullSync = useCallback(async () => {
        await handlePushSync(true);
    }, [handlePushSync]);


  // --- Real-time and Background Sync ---
  useEffect(() => {
    if (appState !== 'APP' || !supabase || !session) return;
    
    const syncInterval = setInterval(() => handlePushSync(false), 30000);
      
    return () => {
        clearInterval(syncInterval);
    };

  }, [appState, supabase, session, database, farmersCollection, handlePushSync]);
  
  useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('invitation')) {
          setAuthView('accept-invitation');
          window.history.replaceState({}, document.title, window.location.pathname);
      }
  }, []);

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
  
  const handleLogout = async () => {
      if (supabase) {
          await supabase.auth.signOut();
      }
      setCurrentUser(null);
      setAppState('AUTH'); 
      handleNavigate('dashboard');
  };

  const handleSignUp = async (name: string, email: string, password: string): Promise<string | null> => {
    if (!supabase) return "Supabase client not available.";
    const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, avatar_url: 'https://terrigen-cdn-dev.marvel.com/content/prod/1x/003cap_ons_crd_03.jpg' } }
    });
    return error ? error.message : null;
  };

  const handleSaveProfile = async (updatedUser: User) => {
      if (!supabase || !currentUser) return;
      const { error } = await supabase.from('profiles').update({ full_name: updatedUser.name, avatar_url: updatedUser.avatar }).eq('id', currentUser.id);
      if (error) {
          setNotification({ message: `Error updating profile: ${error.message}`, type: 'error' });
      } else {
          setCurrentUser(updatedUser);
          setNotification({ message: 'Profile updated successfully.', type: 'success' });
          handleNavigate('dashboard');
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
      const updates = updatedUsers.filter(u => users.some(ou => ou.id === u.id && ou.groupId !== u.groupId)).map(u => ({ id: u.id, group_id: u.groupId }));
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
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const { data, error } = await supabase.from('invitations').insert({ email_for: email, group_id: groupId, expires_at: expiresAt.toISOString() }).select().single();
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
        if (!supabase) return;
        const invitation = invitations.find(inv => inv.id === code);
        if (!invitation) {
            setNotification({ message: "Invalid invitation code.", type: 'error' });
            return;
        }
        const { data, error } = await supabase.auth.signUp({
            email: invitation.emailFor, password: userDetails.password,
            options: { data: { full_name: userDetails.name, avatar_url: userDetails.avatar, group_id: invitation.groupId } },
        });
        if (error) {
            setNotification({ message: `Registration failed: ${error.message}`, type: 'error' });
        } else if (data.user) {
            await supabase.from('invitations').update({ status: 'accepted', accepted_by_user_id: data.user.id }).eq('id', code);
            setNotification({ message: "Registration successful! Please check your email to confirm, then log in.", type: 'success' });
            setAuthView('login');
        }
    };

  useEffect(() => { if (notification) { const timer = setTimeout(() => setNotification(null), 5000); return () => clearTimeout(timer); } }, [notification]);

  const handleRegisterClick = () => {
    setShowForm(true);
  };

  const handleRegistration = useCallback(async (farmer: Farmer, photoFile?: File) => {
    if (!currentUser) return;
    let photoBase64 = photoFile ? await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(photoFile); }) : '';
    await database.write(async () => { await farmersCollection.create(record => { Object.assign(record, { ...farmer, photo: photoBase64, createdBy: currentUser.id, updatedBy: currentUser.id }); record._raw.id = farmer.id; }); });
    setNewlyAddedFarmerId(farmer.id);
  }, [database, farmersCollection, currentUser]);

  const handleSaveRow = useCallback(async (farmerToUpdate: FarmerModel, updatedData: Partial<Pick<Farmer, 'fullName' | 'mobileNumber' | 'status'>>) => {
    if (!currentUser) return;
    await database.write(async () => { await farmerToUpdate.update(record => { Object.assign(record, { ...updatedData, syncStatusLocal: 'pending', updatedBy: currentUser.id }); }); });
    setEditingRowId(null);
  }, [database, currentUser]);

  const handleDeleteSelected = useCallback(() => setShowDeleteConfirmation(true), []);

  const confirmDeleteSelected = useCallback(async () => {
    await database.write(async () => { const farmersToDelete = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch(); await database.batch(...farmersToDelete.map(f => f.prepareUpdate(rec => { rec.syncStatusLocal = 'pending_delete'; }))); });
    setShowDeleteConfirmation(false); setSelectedFarmerIds([]); setNotification({ message: `${selectedFarmerIds.length} farmer(s) marked for deletion.`, type: 'success' });
  }, [database, farmersCollection, selectedFarmerIds]);

  const handleBatchUpdate = useCallback(async (newStatus: FarmerStatus) => {
    if (!currentUser) return;
    await database.write(async () => { const farmersToUpdate = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch(); await database.batch(...farmersToUpdate.map(f => f.prepareUpdate(rec => { rec.status = newStatus; rec.syncStatusLocal = 'pending'; rec.updatedBy = currentUser.id; }))); });
    setShowBatchUpdateModal(false); setSelectedFarmerIds([]); setNotification({ message: `${selectedFarmerIds.length} farmer(s) updated to "${newStatus}".`, type: 'success' });
  }, [database, farmersCollection, selectedFarmerIds, currentUser]);
  
  const handleBulkImport = useCallback(async (newFarmers: Farmer[]) => {
      if (!currentUser) return;
      await database.write(async () => { await database.batch(...newFarmers.map(f => farmersCollection.prepareCreate(rec => { Object.assign(rec, { ...f, createdBy: currentUser.id, updatedBy: currentUser.id }); rec._raw.id = f.id; }))); });
      setNotification({ message: `${newFarmers.length} new farmers imported successfully.`, type: 'success'});
  }, [database, farmersCollection, currentUser]);

  const handlePrint = (farmer: FarmerModel) => { setPrintingFarmer(farmer); setTimeout(() => { window.print(); setPrintingFarmer(null); }, 100); };
  const handleExportToPdf = useCallback((farmer: FarmerModel) => setPdfExportFarmer(farmer), []);
  
  useEffect(() => {
    if (pdfExportFarmer && pdfContainerRef.current) {
        const exportPdf = async () => {
            const { jsPDF } = jspdf; const canvas = await html2canvas(pdfContainerRef.current as HTMLElement, { scale: 2 }); const imgData = canvas.toDataURL('image/png'); const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); const pdfWidth = pdf.internal.pageSize.getWidth(); const imgProps = pdf.getImageProperties(imgData); const imgHeight = (imgProps.height * pdfWidth) / imgProps.width; let heightLeft = imgHeight, position = 0; pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight); heightLeft -= pdf.internal.pageSize.getHeight(); while (heightLeft >= 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight); heightLeft -= pdf.internal.pageSize.getHeight(); } pdf.save(`Hapsara-Farmer-${pdfExportFarmer.farmerId}.pdf`); setPdfExportFarmer(null);
        };
        setTimeout(exportPdf, 100);
    }
}, [pdfExportFarmer]);

  const handleFilterChange = useCallback((newFilters: Filters) => { setFilters(newFilters); setSelectedFarmerIds([]); setCurrentPage(1); }, []);
  const handleSortRequest = useCallback((key: keyof Farmer | 'id') => { setSortConfig(s => ({ key, direction: s?.key === key && s.direction === 'ascending' ? 'descending' : 'ascending' })); setCurrentPage(1); }, []);
  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleRowsPerPageChange = (rows: number) => { setRowsPerPage(rows); setCurrentPage(1); };

  const filteredAndSortedFarmers = useMemo(() => {
    let filtered = [...allFarmers];

    // Apply filters
    if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(f =>
            f.fullName.toLowerCase().includes(query) ||
            f.farmerId.toLowerCase().includes(query) ||
            f.mobileNumber.includes(query)
        );
    }
    if (filters.district) {
        filtered = filtered.filter(f => f.district === filters.district);
        if (filters.mandal) {
            filtered = filtered.filter(f => f.mandal === filters.mandal);
            if (filters.village) {
                filtered = filtered.filter(f => f.village === filters.village);
            }
        }
    }
    if (filters.status) {
        filtered = filtered.filter(f => f.status === filters.status);
    }
    if (filters.registrationDateFrom) {
        const fromDate = new Date(filters.registrationDateFrom);
        filtered = filtered.filter(f => new Date(f.registrationDate) >= fromDate);
    }
    if (filters.registrationDateTo) {
        const toDate = new Date(filters.registrationDateTo);
        filtered = filtered.filter(f => new Date(f.registrationDate) <= toDate);
    }

    // Apply sorting
    if (sortConfig) {
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
  }, [allFarmers, filters, sortConfig]);

  const paginatedFarmers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedFarmers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedFarmers, currentPage, rowsPerPage]);


  const exportToExcel = () => {
    const { utils, writeFile } = (window as any).XLSX; const dataToExport = allFarmers.map(f => ({ 'Hap ID': f.farmerId, 'Application ID': f.applicationId, 'Full Name': f.fullName, 'Father/Husband Name': f.fatherHusbandName, 'Mobile Number': f.mobileNumber, 'Aadhaar Number': f.aadhaarNumber, 'Status': f.status, 'Registration Date': new Date(f.registrationDate).toLocaleDateString(), District: GEO_DATA.find(d=>d.code===f.district)?.name||f.district, Mandal:GEO_DATA.find(d=>d.code===f.district)?.mandals.find(m=>m.code===f.mandal)?.name||f.mandal, Village:GEO_DATA.find(d=>d.code===f.district)?.mandals.find(m=>m.code===f.mandal)?.villages.find(v=>v.code===f.village)?.name||f.village, Address:f.address, 'Approved Extent (Acres)':f.approvedExtent, 'Number of Plants':f.numberOfPlants })); const ws = utils.json_to_sheet(dataToExport); const wb = utils.book_new(); utils.book_append_sheet(wb, ws, "Farmers"); writeFile(wb, "Hapsara_Farmers_Export.xlsx");
  };
  const exportToCsv = () => {
    const { utils } = (window as any).XLSX; const dataToExport = allFarmers.map(f => ({ 'Hap ID': f.farmerId, 'Application ID': f.applicationId, 'Full Name': f.fullName, 'Father/Husband Name': f.fatherHusbandName, 'Mobile Number': f.mobileNumber, 'Aadhaar Number': f.aadhaarNumber, 'Status': f.status, 'Registration Date': new Date(f.registrationDate).toLocaleDateString(), District: GEO_DATA.find(d=>d.code===f.district)?.name||f.district, Mandal:GEO_DATA.find(d=>d.code===f.district)?.mandals.find(m=>m.code===f.mandal)?.name||f.mandal, Village:GEO_DATA.find(d=>d.code===f.district)?.mandals.find(m=>m.code===f.mandal)?.villages.find(v=>v.code===f.village)?.name||f.village, Address:f.address, 'Approved Extent (Acres)':f.approvedExtent, 'Number of Plants':f.numberOfPlants })); const ws = utils.json_to_sheet(dataToExport); const csv = utils.sheet_to_csv(ws); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", "Hapsara_Farmers_Export.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };
  
  const renderAppContent = () => {
    const canAccessAdmin = currentUserPermissions.has(Permission.CAN_MANAGE_USERS) || currentUserPermissions.has(Permission.CAN_MANAGE_GROUPS);
    const canAccessContentManager = currentUserPermissions.has(Permission.CAN_MANAGE_CONTENT);

    if (view === 'not-found') {
        return <Suspense fallback={<ModalLoader/>}><NotFoundPage onBack={() => handleNavigate('dashboard')} /></Suspense>
    }
    switch(view) {
        case 'profile': return <Suspense fallback={<ModalLoader/>}><ProfilePage currentUser={currentUser!} groups={groups} onSave={handleSaveProfile} onBack={() => handleNavigate('dashboard')} /></Suspense>;
        case 'admin': if (!canAccessAdmin) return null; return <Suspense fallback={<ModalLoader/>}><AdminPage users={users} groups={groups} invitations={invitations} onInviteUser={handleInviteUser} currentUser={currentUser!} onSaveUsers={handleSaveUsers} onSaveGroups={handleSaveGroups} onBack={() => handleNavigate('dashboard')} onShowSetupGuide={() => setShowSetupGuide(true)} /></Suspense>;
        case 'billing': return <Suspense fallback={<ModalLoader/>}><BillingPage currentUser={currentUser!} onBack={() => handleNavigate('dashboard')} userCount={users.length} recordCount={allFarmers.length} /></Suspense>
        case 'usage-analytics': return <Suspense fallback={<ModalLoader/>}><UsageAnalyticsPage currentUser={currentUser!} onBack={() => handleNavigate('dashboard')} supabase={supabase} /></Suspense>
        case 'content-manager': if (!canAccessContentManager) return null; return <Suspense fallback={<ModalLoader/>}><ContentManagerPage supabase={supabase} currentContent={appContent} onContentSave={fetchAppContent} onBack={() => handleNavigate('dashboard')} /></Suspense>
        case 'farmer-directory':
            return (<> <FilterBar onFilterChange={handleFilterChange} /> <FarmerList farmers={paginatedFarmers} users={users} canEdit={currentUserPermissions.has(Permission.CAN_EDIT_FARMER)} canDelete={currentUserPermissions.has(Permission.CAN_DELETE_FARMER)} editingRowId={editingRowId} onEditRow={setEditingRowId} onCancelEditRow={() => setEditingRowId(null)} onSaveRow={handleSaveRow} onPrint={handlePrint} onExportToPdf={handleExportToPdf} selectedFarmerIds={selectedFarmerIds} onSelectionChange={(id, selected) => setSelectedFarmerIds(p => selected ? [...p, id] : p.filter(i => i !== id))} onSelectAll={(all) => setSelectedFarmerIds(all ? paginatedFarmers.map(f => f.id) : [])} sortConfig={sortConfig} onRequestSort={handleSortRequest} newlyAddedFarmerId={newlyAddedFarmerId} onHighlightComplete={() => setNewlyAddedFarmerId(null)} onBatchUpdate={() => setShowBatchUpdateModal(true)} onDeleteSelected={handleDeleteSelected} totalRecords={filteredAndSortedFarmers.length} currentPage={currentPage} rowsPerPage={rowsPerPage} onPageChange={handlePageChange} onRowsPerPageChange={handleRowsPerPageChange} isLoading={false} /> </>);
        case 'dashboard': default:
            return <Suspense fallback={<ModalLoader/>}><Dashboard supabase={supabase} /></Suspense>;
    }
  }

  const renderContent = () => {
    switch (appState) {
        case 'LANDING':
            return <Suspense fallback={<div></div>}><LandingPage onLaunch={() => setAppState('LOADING')} appContent={appContent} /></Suspense>;
        case 'LOADING':
            return <div className="fixed inset-0 bg-white flex items-center justify-center"><ModalLoader /></div>;
        case 'AUTH':
            if (authView === 'accept-invitation') return <Suspense fallback={<ModalLoader/>}><AcceptInvitation groups={groups} invitations={invitations} onAccept={handleAcceptInvitation} onBackToLogin={() => setAuthView('login')} /></Suspense>
            return <Suspense fallback={<ModalLoader/>}><LoginScreen supabase={supabase} onSignUp={handleSignUp} onAcceptInvitationClick={() => setAuthView('accept-invitation')} /></Suspense>;
        case 'APP':
            return (
                <div className="flex h-screen bg-gray-100 font-sans">
                    <Sidebar isOpen={isMobileMenuOpen} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(c => !c)} currentUser={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} currentView={view} permissions={currentUserPermissions} onImport={() => setShowImportModal(true)} onExportExcel={exportToExcel} onExportCsv={exportToCsv} onViewRawData={() => setShowRawDataView(true)} onShowPrivacy={() => setShowPrivacyModal(true)} onShowHelp={() => setShowHelpModal(true)} onShowFeedback={() => setShowFeedbackModal(true)} />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Header onToggleSidebar={() => setIsMobileMenuOpen(m => !m)} currentView={view} onRegister={handleRegisterClick} onSync={() => handleFullSync()} syncLoading={syncLoading} pendingSyncCount={pendingSyncCount} isOnline={isOnline} permissions={currentUserPermissions} />
                        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
                            {renderAppContent()}
                        </main>
                    </div>
                </div>
            );
        default:
            return <Suspense fallback={<div></div>}><LandingPage onLaunch={() => setAppState('LOADING')} appContent={appContent} /></Suspense>;
    }
  };

  return (
    <>
        {renderContent()}
        {showForm && ( <Suspense fallback={<ModalLoader/>}> <RegistrationForm onSubmit={handleRegistration} onCancel={() => setShowForm(false)} existingFarmers={allFarmersPlain} /> </Suspense> )}
        {showRawDataView && ( <Suspense fallback={<ModalLoader/>}> <RawDataView farmers={allFarmers} onClose={() => setShowRawDataView(false)} /> </Suspense> )}
        {showBatchUpdateModal && ( <Suspense fallback={<ModalLoader/>}> <BatchUpdateStatusModal selectedCount={selectedFarmerIds.length} onUpdate={handleBatchUpdate} onCancel={() => setShowBatchUpdateModal(false)}/> </Suspense> )}
        {showImportModal && ( <Suspense fallback={<ModalLoader/>}> <BulkImportModal onClose={() => setShowImportModal(false)} onSubmit={handleBulkImport} existingFarmers={allFarmersPlain} /> </Suspense> )}
        {showDeleteConfirmation && ( <Suspense fallback={<ModalLoader/>}> <ConfirmationModal isOpen={showDeleteConfirmation} title="Confirm Deletion" message={`Are you sure you want to delete ${selectedFarmerIds.length} farmer record(s)? This action cannot be undone.`} onConfirm={confirmDeleteSelected} onCancel={() => setShowDeleteConfirmation(false)} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" /> </Suspense> )}
        {showPrivacyModal && ( <Suspense fallback={<ModalLoader/>}> <PrivacyModal onClose={() => setShowPrivacyModal(false)} appContent={appContent} /> </Suspense> )}
        {showHelpModal && ( <Suspense fallback={<ModalLoader/>}> <HelpModal onClose={() => setShowHelpModal(false)} appContent={appContent} /> </Suspense> )}
        {showFeedbackModal && ( <Suspense fallback={<ModalLoader/>}> <FeedbackModal onClose={() => setShowFeedbackModal(false)} /> </Suspense> )}
        {showSetupGuide && ( <Suspense fallback={<ModalLoader/>}><SupabaseSetupGuide onClose={() => setShowSetupGuide(false)} /></Suspense> )}
        <div ref={pdfContainerRef} className="absolute -left-[9999px] top-0"> {pdfExportFarmer && <Suspense fallback={<div></div>}><PrintView farmer={modelToPlain(pdfExportFarmer)} users={users} isForPdf={true} /></Suspense>} </div>
        <PrintView farmer={modelToPlain(printingFarmer)} users={users} />
        {notification && ( 
            <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white animate-fade-in-up
                ${notification.type === 'success' ? 'bg-green-600' : ''}
                ${notification.type === 'error' ? 'bg-red-600' : ''}
                ${notification.type === 'info' ? 'bg-blue-600' : ''}
            `}>
                {notification.message}
            </div> 
        )}
    </>
  );
};

export default App;