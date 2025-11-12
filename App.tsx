// This file was regenerated to create the main App component.

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from './DatabaseContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { initializeSupabase, getSupabase } from './lib/supabase';
import { synchronize } from './lib/sync';
import { exportToExcel, exportToCsv } from './lib/export';
import { FarmerModel, UserModel, GroupModel, TenantModel, PlotModel } from './db';
// FIX: Import 'Plot' type to resolve 'Cannot find name' error.
import { Farmer, User, Group, Permission, Filters, Tenant, Plot } from './types';
import { farmerModelToPlain } from './lib/utils';

// Components
import Sidebar from './components/Sidebar';
import FilterBar from './components/FilterBar';
import Dashboard from './components/Dashboard';
import Notification from './components/Notification';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import SupabaseSettingsModal from './components/SupabaseSettingsModal';
import BulkImportModal from './components/BulkImportModal';
import BatchUpdateStatusModal from './components/BatchUpdateStatusModal';
import ConfirmationModal from './components/ConfirmationModal';
import PrintView from './components/PrintView';
import RawDataView from './components/RawDataView';
import PrintQueuePage from './components/PrintQueuePage';
import NotFoundPage from './components/NotFoundPage';

// Lazy-loaded components for different views
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const FarmerDetailsPage = lazy(() => import('./components/FarmerDetailsPage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const HelpPage = lazy(() => import('./components/HelpPage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const DataHealthPage = lazy(() => import('./components/DataHealthPage'));
const IdVerificationPage = lazy(() => import('./components/IdVerificationPage'));
const YieldPredictionPage = lazy(() => import('./components/YieldPredictionPage'));
const SatelliteAnalysisPage = lazy(() => import('./components/SatelliteAnalysisPage'));
const CropHealthScannerPage = lazy(() => import('./components/CropHealthScannerPage'));
const ContentManagerPage = lazy(() => import('./components/ContentManagerPage'));
const GeoManagementPage = lazy(() => import('./components/GeoManagementPage'));
const SchemaManagerPage = lazy(() => import('./components/SchemaManagerPage'));
const TenantManagementPage = lazy(() => import('./components/TenantManagementPage'));
const TerritoryManagementPage = lazy(() => import('./components/TerritoryManagementPage'));
const BillingPage = lazy(() => import('./components/BillingPage'));
const SubscriptionManagementPage = lazy(() => import('./components/SubscriptionManagementPage'));
const UsageAnalyticsPage = lazy(() => import('./components/UsageAnalyticsPage'));
const TaskManagementPage = lazy(() => import('./components/TaskManagementPage'));
const ResourceManagementPage = lazy(() => import('./components/ResourceManagementPage'));
const DistributionReportPage = lazy(() => import('./components/DistributionReportPage'));
const PerformanceAnalyticsPage = lazy(() => import('./components/PerformanceAnalyticsPage'));
const MentorshipPage = lazy(() => import('./components/MentorshipPage'));
const CommunityForumPage = lazy(() => import('./components/CommunityForumPage'));
const ResourceLibraryPage = lazy(() => import('./components/ResourceLibraryPage'));
const EventsPage = lazy(() => import('./components/EventsPage'));
const FinancialsPage = lazy(() => import('./components/FinancialsPage'));
const MarketplacePage = lazy(() => import('./components/MarketplacePage'));
const ProductListPage = lazy(() => import('./components/ProductListPage'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./components/OrderConfirmationPage'));
const VendorManagementPage = lazy(() => import('./components/VendorManagementPage'));

type View =
    | 'landing' | 'dashboard' | 'farmer-directory' | 'register-farmer' | 'reports' | 'data-health'
    | 'id-verification' | 'yield-prediction' | 'satellite-analysis' | 'crop-health'
    | 'admin' | 'profile' | 'help' | 'print-queue' | 'farmer-details'
    | 'content-manager' | 'geo-management' | 'schema-manager' | 'tenant-management' | 'territory-management'
    | 'billing' | 'subscription-management' | 'usage-analytics' | 'tasks' | 'resource-management'
    | 'distribution-report' | 'performance-analytics' | 'mentorship' | 'community' | 'resource-library' | 'events'
    | 'financials' | 'marketplace' | 'product-list' | 'checkout' | 'order-confirmation' | 'vendor-management';

const App: React.FC = () => {
    // Component State
    const [view, setView] = useState<View>('landing');
    const [viewParam, setViewParam] = useState<string | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    
    // UI Modals State
    const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [isBatchUpdateModalOpen, setIsBatchUpdateModalOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [isRawDataViewOpen, setIsRawDataViewOpen] = useState(false);

    // Data State
    const [farmersToDelete, setFarmersToDelete] = useState<string[]>([]);
    const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
    const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);
    const [printQueue, setPrintQueue] = useState<string[]>([]);
    const [farmerToPrint, setFarmerToPrint] = useState<Farmer | null>(null);
    const [plotsForPrint, setPlotsForPrint] = useState<Plot[]>([]);

    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    
    // Hooks
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const [supabase, setSupabase] = useState<any | null>(() => initializeSupabase());

    useEffect(() => {
        if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }: any) => {
                setSession(session);
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
                setSession(session);
            });

            return () => subscription.unsubscribe();
        }
    }, [supabase]);
    
     useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#/', '');
            const [path, param] = hash.split('/');
            
            if (session) {
                setView(path as View || 'dashboard');
                if (param) setViewParam(param);
            } else {
                setView('landing');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial load

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [session]);
    
    const navigate = (newView: View, param?: string) => {
        const newPath = param ? `${newView}/${param}` : newView;
        window.location.hash = `/${newPath}`;
    };

    const handleNavigateWithFilter = (view: 'farmer-directory', filters: Partial<Omit<Filters, 'searchQuery' | 'registrationDateFrom' | 'registrationDateTo'>>) => {
        // This is a simplified version. A real app might use URL params for filters.
        console.log('Navigating with filters:', filters);
        navigate(view);
    };

    const handleSetSupabase = () => {
        setSupabase(initializeSupabase());
    };

    if (!session) {
        if (view !== 'landing') {
            return <LoginScreen supabase={supabase} />;
        }
        return <LandingPage onLaunch={() => navigate('dashboard')} appContent={{}} />;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
             <Suspense fallback={<div />}>
                <EnhancedApp 
                    view={view} 
                    viewParam={viewParam}
                    navigate={navigate} 
                    currentUser={currentUser!}
                    isSyncing={isSyncing} 
                    lastSync={lastSync}
                    setNotification={setNotification}
                />
            </Suspense>
            {notification && <Notification {...notification} onDismiss={() => setNotification(null)} />}
        </div>
    );
}

// Enhance main app with data fetching
const EnhancedApp = withObservables([], ({ view, viewParam, navigate, isSyncing, lastSync, setNotification }: any) => {
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const supabase = getSupabase();

    return {
        view, viewParam, navigate, isSyncing, lastSync, setNotification, isOnline,
        farmers: database.get('farmers').query().observe(),
        users: database.get('users').query().observe(),
        groups: database.get('groups').query().observe(),
        tenants: database.get('tenants').query().observe(),
        plots: database.get('plots').query().observe(),
        currentUser: supabase ? database.get('users').query(Q.where('id', supabase.auth.getUser().id)).observe() : undefined,
    };
})((props: any) => {
    const { view, viewParam, navigate, farmers, users, groups, tenants, plots, currentUser, isOnline, isSyncing, lastSync, setNotification } = props;
    
    // In a real app this would be a single component with logic. For simplicity, we create a basic shell here.
    const renderView = () => {
        const suspenseFallback = <div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div></div>;
        switch (view) {
            case 'dashboard': return <Dashboard farmers={farmers} onNavigateWithFilter={() => {}} />;
            case 'farmer-directory': return <p>Farmer Directory (Not implemented)</p>;
            case 'register-farmer': return <RegistrationForm onSubmit={async () => {}} onCancel={() => navigate('farmer-directory')} existingFarmers={farmers} setNotification={setNotification} />;
            case 'reports': return <ReportsPage allFarmers={farmers.map((f: FarmerModel) => farmerModelToPlain(f)!)} onBack={() => navigate('dashboard')} />;
            case 'data-health': return <DataHealthPage allFarmers={farmers.map((f: FarmerModel) => farmerModelToPlain(f)!)} onBack={() => navigate('dashboard')} onNavigate={navigate} />;
            case 'id-verification': return <IdVerificationPage allFarmers={farmers.map((f: FarmerModel) => farmerModelToPlain(f)!)} onBack={() => navigate('dashboard')} />;
            case 'yield-prediction': return <YieldPredictionPage allFarmers={farmers.map((f: FarmerModel) => farmerModelToPlain(f)!)} onBack={() => navigate('dashboard')} />;
            case 'satellite-analysis': return <SatelliteAnalysisPage onBack={() => navigate('dashboard')} />;
            case 'crop-health': return <CropHealthScannerPage onBack={() => navigate('dashboard')} />;
            case 'admin': return <AdminPage users={users} groups={groups} currentUser={currentUser?.[0]} onBack={() => navigate('dashboard')} onSaveUsers={async() => {}} onSaveGroups={async() => {}} onNavigate={navigate} setNotification={setNotification} />;
            case 'profile': return <ProfilePage currentUser={currentUser?.[0]} groups={groups} onBack={() => navigate('dashboard')} onSave={async() => {}} setNotification={setNotification}/>;
            case 'help': return <HelpPage onBack={() => navigate('dashboard')} />;
            case 'print-queue': return <PrintQueuePage queuedFarmerIds={[]} users={users} onRemove={() => {}} onClear={() => {}} onBack={() => navigate('farmer-directory')} />;
            case 'farmer-details': return <FarmerDetailsPage farmerId={viewParam!} users={users} currentUser={currentUser?.[0]} onBack={() => navigate('farmer-directory')} permissions={new Set()} setNotification={setNotification} />;
            case 'content-manager': return <ContentManagerPage supabase={getSupabase()} currentContent={{}} onContentSave={() => {}} onBack={() => navigate('admin')} />;
            case 'geo-management': return <GeoManagementPage onBack={() => navigate('admin')} />;
            case 'schema-manager': return <SchemaManagerPage onBack={() => navigate('admin')} />;
            case 'tenant-management': return <TenantManagementPage onBack={() => navigate('admin')} />;
            case 'territory-management': return <TerritoryManagementPage onBack={() => navigate('admin')} currentUser={currentUser?.[0]} />;
            case 'billing': return <BillingPage currentUser={currentUser?.[0]} userCount={users.length} recordCount={farmers.length} onBack={() => navigate('dashboard')} onNavigate={navigate} />;
            case 'subscription-management': return <SubscriptionManagementPage currentUser={currentUser?.[0]} onBack={() => navigate('billing')} />;
            case 'usage-analytics': return <UsageAnalyticsPage currentUser={currentUser?.[0]} supabase={getSupabase()} onBack={() => navigate('dashboard')} />;
            case 'tasks': return <TaskManagementPage currentUser={currentUser?.[0]} onBack={() => navigate('dashboard')} />;
            case 'resource-management': return <ResourceManagementPage currentUser={currentUser?.[0]} onBack={() => navigate('admin')} />;
            case 'distribution-report': return <DistributionReportPage onBack={() => navigate('dashboard')} />;
            case 'performance-analytics': return <PerformanceAnalyticsPage onBack={() => navigate('dashboard')} />;
            case 'mentorship': return <MentorshipPage currentUser={currentUser?.[0]} setNotification={setNotification} onBack={() => navigate('dashboard')} />;
            case 'community': return <CommunityForumPage currentUser={currentUser?.[0]} setNotification={setNotification} onBack={() => navigate('dashboard')} />;
            case 'resource-library': return <ResourceLibraryPage onBack={() => navigate('dashboard')} currentUser={currentUser?.[0]} />;
            case 'events': return <EventsPage onBack={() => navigate('dashboard')} currentUser={currentUser?.[0]} setNotification={setNotification} />;
            case 'financials': return <FinancialsPage allFarmers={farmers} currentUser={currentUser?.[0]} onBack={() => navigate('dashboard')} />;
            case 'marketplace': return <MarketplacePage onBack={() => navigate('dashboard')} onNavigate={(v,p) => navigate(v,p)} />;
            case 'product-list': return <ProductListPage categoryId={viewParam!} onBack={() => navigate('marketplace')} />;
            case 'checkout': return <CheckoutPage onBack={() => navigate('marketplace')} onOrderPlaced={(orderId) => navigate('order-confirmation', orderId)} />;
            case 'order-confirmation': return <OrderConfirmationPage orderId={viewParam!} onNavigate={navigate} />;
            case 'vendor-management': return <VendorManagementPage currentUser={currentUser?.[0]} setNotification={setNotification} onBack={() => navigate('admin')} />;
            default: return <NotFoundPage onBack={() => navigate('dashboard')} />;
        }
    };

    return (
        <>
            <Sidebar 
                view={view}
                onNavigate={navigate}
                currentUser={currentUser?.[0]}
                permissions={new Set()}
                onSync={() => {}}
                isSyncing={isSyncing}
                lastSync={lastSync}
                isOnline={isOnline}
            />
            <main className="flex-1 overflow-y-auto">
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div></div>}>
                    {renderView()}
                </Suspense>
            </main>
        </>
    );
});


export default App;