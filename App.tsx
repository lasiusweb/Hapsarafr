// This file was regenerated to create the main App component.

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from './DatabaseContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { initializeSupabase, getSupabase } from './lib/supabase';
import { synchronize } from './lib/sync';
import { FarmerModel, UserModel, GroupModel, TenantModel, PlotModel, TerritoryModel } from './db';
import { Farmer, User, Group, Permission, Tenant, Plot } from './types';
import { farmerModelToPlain } from './lib/utils';

// Components
import Sidebar from './components/Sidebar';
import Notification from './components/Notification';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import PrintView from './components/PrintView';
import NotFoundPage from './components/NotFoundPage';

// Lazy-loaded components for different views
const FarmerDirectoryPage = lazy(() => import('./components/FarmerDirectoryPage'));
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
const Dashboard = lazy(() => import('./components/Dashboard'));
const PrintQueuePage = lazy(() => import('./components/PrintQueuePage'));


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
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);
    
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
                setView((path || 'dashboard') as View);
                if (param) setViewParam(param);
                else setViewParam(null);
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
        if (`/${newPath}` === window.location.hash.replace('#','')) {
             window.dispatchEvent(new HashChangeEvent("hashchange"));
        } else {
            window.location.hash = `/${newPath}`;
        }
    };
    
    const handleRegisterFarmer = async (farmerData: Farmer, photoFile?: File) => {
        let photoBase64 = '';
        if (photoFile) {
            photoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(photoFile);
            });
        }
        
        let newFarmer: FarmerModel | null = null;
        await database.write(async () => {
            newFarmer = await database.get<FarmerModel>('farmers').create(farmer => {
                const { id, createdAt, updatedAt, ...rest } = farmerData;
                Object.assign(farmer, rest);
                farmer.photo = photoBase64;
                farmer.syncStatusLocal = 'pending';
            });
        });

        if (newFarmer) {
            // FIX: Property 'id' does not exist on type 'FarmerModel'. Cast to any to access the ID property.
            setNewlyAddedFarmerId((newFarmer as any).id);
            navigate('farmer-directory');
        }
    };
    

    if (!session) {
        if (view !== 'landing') {
            return <LoginScreen supabase={supabase} />;
        }
        return <LandingPage onLaunch={() => navigate('dashboard')} appContent={{}} />;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
             <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div></div>}>
                <EnhancedApp 
                    view={view} 
                    viewParam={viewParam}
                    navigate={navigate} 
                    isSyncing={isSyncing} 
                    lastSync={lastSync}
                    setNotification={setNotification}
                    newlyAddedFarmerId={newlyAddedFarmerId}
                    onHighlightComplete={() => setNewlyAddedFarmerId(null)}
                    onRegisterFarmer={handleRegisterFarmer}
                />
            </Suspense>
            {notification && <Notification {...notification} onDismiss={() => setNotification(null)} />}
        </div>
    );
}

// Enhance main app with data fetching
const EnhancedApp = withObservables(['currentUser'], ({ 
    view, viewParam, navigate, isSyncing, lastSync, setNotification, 
    newlyAddedFarmerId, onHighlightComplete, onRegisterFarmer
}: any) => {
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const supabase = getSupabase();
    
    let currentUserObservable;
    if (supabase) {
        try {
            const user = supabase.auth.getUser();
            currentUserObservable = user ? database.get('users').query(Q.where('id', user.id)).observe() : undefined;
        } catch(e) {
            // Can happen on first load
        }
    }


    return {
        view, viewParam, navigate, isSyncing, lastSync, setNotification, isOnline,
        newlyAddedFarmerId, onHighlightComplete, onRegisterFarmer,
        allFarmers: database.get('farmers').query(Q.where('sync_status', Q.notEq('pending_delete'))).observe(),
        allUsers: database.get('users').query().observe(),
        allGroups: database.get('groups').query().observe(),
        allTenants: database.get('tenants').query().observe(),
        allTerritories: database.get('territories').query().observe(),
        currentUser: currentUserObservable,
    };
})((props: any) => {
    const { 
        view, viewParam, navigate, allFarmers, allUsers, allGroups, allTenants, allTerritories, currentUser, 
        isOnline, isSyncing, lastSync, setNotification,
        newlyAddedFarmerId, onHighlightComplete, onRegisterFarmer
    } = props;
    
    const currentActiveUser = currentUser?.[0];
    const userPermissions = useMemo(() => {
        if (!currentActiveUser || !allGroups) return new Set<Permission>();
        // FIX: Property 'id' does not exist on type 'GroupModel'. Cast to any to access the ID property.
        const group = allGroups.find((g: GroupModel) => (g as any).id === currentActiveUser.groupId);
        return new Set(group?.permissions || []);
    }, [currentActiveUser, allGroups]);

    const currentTenant = useMemo(() => {
        if (!currentActiveUser || !allTenants) return undefined;
        // FIX: Property 'id' does not exist on type 'TenantModel'. Cast to any to access the ID property.
        return allTenants.find((t: TenantModel) => (t as any).id === currentActiveUser.tenantId);
    }, [currentActiveUser, allTenants]);
    
    // FIX: Cannot find name 'suspenseFallback'. Defined it here to be in scope for Suspense.
    const suspenseFallback = <div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div></div>;
    const renderView = () => {
        switch (view) {
            case 'dashboard': return <Dashboard farmers={allFarmers.map((f: FarmerModel) => farmerModelToPlain(f)!)} onNavigateWithFilter={(v, f) => navigate(v, f)} />;
            case 'farmer-directory': return <FarmerDirectoryPage users={allUsers} tenants={allTenants} currentUser={currentActiveUser} permissions={userPermissions} newlyAddedFarmerId={newlyAddedFarmerId} onHighlightComplete={onHighlightComplete} onNavigate={navigate} setNotification={setNotification} />;
            case 'register-farmer': return <RegistrationForm onSubmit={onRegisterFarmer} onCancel={() => navigate('farmer-directory')} existingFarmers={allFarmers} setNotification={setNotification} currentUser={currentActiveUser} />;
            case 'reports': return <ReportsPage allFarmers={allFarmers.map((f: FarmerModel) => farmerModelToPlain(f)!)} onBack={() => navigate('dashboard')} />;
            case 'data-health': return <DataHealthPage allFarmers={allFarmers.map((f: FarmerModel) => farmerModelToPlain(f)!)} onBack={() => navigate('dashboard')} onNavigate={navigate} />;
            case 'id-verification': return <IdVerificationPage allFarmers={allFarmers.map((f: FarmerModel) => farmerModelToPlain(f)!)} onBack={() => navigate('dashboard')} />;
            case 'yield-prediction': return <YieldPredictionPage allFarmers={allFarmers.map((f: FarmerModel) => farmerModelToPlain(f)!)} onBack={() => navigate('dashboard')} />;
            case 'satellite-analysis': return <SatelliteAnalysisPage onBack={() => navigate('dashboard')} />;
            case 'crop-health': return <CropHealthScannerPage onBack={() => navigate('dashboard')} />;
            case 'admin': return <AdminPage users={allUsers} groups={allGroups} currentUser={currentActiveUser} onBack={() => navigate('dashboard')} onSaveUsers={async() => {}} onSaveGroups={async() => {}} onNavigate={navigate} setNotification={setNotification} />;
            case 'profile': return <ProfilePage currentUser={currentActiveUser} groups={allGroups} onBack={() => navigate('dashboard')} onSave={async() => {}} setNotification={setNotification}/>;
            case 'help': return <HelpPage onBack={() => navigate('dashboard')} />;
            case 'print-queue': return <PrintQueuePage queuedFarmerIds={[]} users={allUsers} onRemove={() => {}} onClear={() => {}} onBack={() => navigate('farmer-directory')} />;
            case 'farmer-details': return <FarmerDetailsPage farmerId={viewParam!} users={allUsers} currentUser={currentActiveUser} onBack={() => navigate('farmer-directory')} permissions={userPermissions} setNotification={setNotification} allTenants={allTenants} allTerritories={allTerritories} />;
            case 'content-manager': return <ContentManagerPage supabase={getSupabase()} currentContent={{}} onContentSave={() => {}} onBack={() => navigate('admin')} />;
            case 'geo-management': return <GeoManagementPage onBack={() => navigate('admin')} />;
            case 'schema-manager': return <SchemaManagerPage onBack={() => navigate('admin')} />;
            case 'tenant-management': return <TenantManagementPage onBack={() => navigate('admin')} />;
            case 'territory-management': return <TerritoryManagementPage onBack={() => navigate('admin')} currentUser={currentActiveUser} />;
            case 'billing': return <BillingPage currentUser={currentActiveUser} userCount={allUsers.length} recordCount={allFarmers.length} onBack={() => navigate('dashboard')} onNavigate={navigate} />;
            case 'subscription-management': return <SubscriptionManagementPage currentUser={currentActiveUser} onBack={() => navigate('billing')} />;
            case 'usage-analytics': return <UsageAnalyticsPage currentUser={currentActiveUser} supabase={getSupabase()} onBack={() => navigate('dashboard')} />;
            case 'tasks': return <TaskManagementPage currentUser={currentActiveUser} onBack={() => navigate('dashboard')} />;
            case 'resource-management': return <ResourceManagementPage currentUser={currentActiveUser} onBack={() => navigate('admin')} />;
            case 'distribution-report': return <DistributionReportPage onBack={() => navigate('dashboard')} />;
            case 'performance-analytics': return <PerformanceAnalyticsPage onBack={() => navigate('dashboard')} />;
            case 'mentorship': return <MentorshipPage currentUser={currentActiveUser} setNotification={setNotification} onBack={() => navigate('dashboard')} />;
            case 'community': return <CommunityForumPage currentUser={currentActiveUser} setNotification={setNotification} onBack={() => navigate('dashboard')} />;
            case 'resource-library': return <ResourceLibraryPage onBack={() => navigate('dashboard')} currentUser={currentActiveUser} />;
            case 'events': return <EventsPage onBack={() => navigate('dashboard')} currentUser={currentActiveUser} setNotification={setNotification} />;
            case 'financials': return <FinancialsPage allFarmers={allFarmers} currentUser={currentActiveUser} onBack={() => navigate('dashboard')} />;
            case 'marketplace': return <MarketplacePage onBack={() => navigate('dashboard')} onNavigate={(v,p) => navigate(v,p)} />;
            case 'product-list': return <ProductListPage categoryId={viewParam!} onBack={() => navigate('marketplace')} />;
            case 'checkout': return <CheckoutPage onBack={() => navigate('marketplace')} onOrderPlaced={(orderId) => navigate('order-confirmation', orderId)} />;
            case 'order-confirmation': return <OrderConfirmationPage orderId={viewParam!} onNavigate={navigate} />;
            case 'vendor-management': return <VendorManagementPage currentUser={currentActiveUser} setNotification={setNotification} onBack={() => navigate('admin')} />;
            default: return <NotFoundPage onBack={() => navigate('dashboard')} />;
        }
    };

    return (
        <>
            <Sidebar 
                view={view}
                onNavigate={navigate}
                currentUser={currentActiveUser}
                currentTenant={currentTenant}
                permissions={userPermissions}
                onSync={() => {}}
                isSyncing={isSyncing}
                lastSync={lastSync}
                isOnline={isOnline}
            />
            <main className="flex-1 overflow-y-auto p-6">
                <Suspense fallback={suspenseFallback}>
                    {renderView()}
                </Suspense>
            </main>
        </>
    );
});


export default App;