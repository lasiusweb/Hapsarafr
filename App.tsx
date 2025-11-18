// This file was regenerated to create the main App component.

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from './DatabaseContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { initializeSupabase, getSupabase } from './lib/supabase';
import { synchronize } from './lib/sync';
import { FarmerModel, UserModel, GroupModel, TenantModel, TerritoryModel, FarmerDealerConsentModel, FarmPlotModel, DirectiveModel, TaskModel } from './db';
import { Farmer, User, Group, Permission, Tenant } from './types';
import { farmerModelToPlain, userModelToPlain, groupModelToPlain, tenantModelToPlain } from './lib/utils';
import { useQuery } from './hooks/useQuery';

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
const FarmerAdvisorPage = lazy(() => import('./components/FarmerAdvisorPage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const DataHealthPage = lazy(() => import('./components/DataHealthPage'));
const IdVerificationPage = lazy(() => import('./components/IdVerificationPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const MarketplacePage = lazy(() => import('./components/MarketplacePage'));
const ProductListPage = lazy(() => import('./components/ProductListPage'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./components/OrderConfirmationPage'));
const PrintQueuePage = lazy(() => import('./components/PrintQueuePage'));
const ResourceLibraryPage = lazy(() => import('./components/ResourceLibraryPage'));
const EventsPage = lazy(() => import('./components/EventsPage'));
const CommunityForumPage = lazy(() => import('./components/CommunityForumPage'));
const MentorshipPage = lazy(() => import('./components/MentorshipPage'));
const FinancialsPage = lazy(() => import('./components/FinancialsPage'));
const BillingPage = lazy(() => import('./components/BillingPage'));
const SubscriptionManagementPage = lazy(() => import('./components/SubscriptionManagementPage'));
const ContentManagerPage = lazy(() => import('./components/ContentManagerPage'));
const GeoManagementPage = lazy(() => import('./components/GeoManagementPage'));
const SchemaManagerPage = lazy(() => import('./components/SchemaManagerPage'));
const TenantManagementPage = lazy(() => import('./components/TenantManagementPage'));
const ResourceManagementPage = lazy(() => import('./components/ResourceManagementPage'));
const TerritoryManagementPage = lazy(() => import('./components/TerritoryManagementPage'));
const VendorManagementPage = lazy(() => import('./components/VendorManagementPage'));
const TaskManagementPage = lazy(() => import('./components/TaskManagementPage'));
const CropHealthScannerPage = lazy(() => import('./components/CropHealthScannerPage'));
const YieldPredictionPage = lazy(() => import('./components/YieldPredictionPage'));
const SatelliteAnalysisPage = lazy(() => import('./components/SatelliteAnalysisPage'));
const QualityAssessmentPage = lazy(() => import('./components/QualityAssessmentPage'));
const ProcessingPage = lazy(() => import('./components/ProcessingPage'));
const EquipmentManagementPage = lazy(() => import('./components/EquipmentManagementPage'));
const CaelusDashboard = lazy(() => import('./components/CaelusDashboard'));
const HapsaraNexusPage = lazy(() => import('./components/HapsaraNexusPage'));
const StateCraftDashboard = lazy(() => import('./components/StateCraftDashboard'));


const App: React.FC = () => {
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const [supabase, setSupabase] = useState(() => initializeSupabase());
    const [session, setSession] = useState<any | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [view, setView] = useState('dashboard');
    const [viewParam, setViewParam] = useState<string | null>(null);
    const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [printQueue, setPrintQueue] = useState<string[]>([]);
    
    // Auth
    useEffect(() => {
        if (!supabase) return;
        setAuthLoading(true);
        supabase.auth.getSession().then(({ data: { session } }: any) => {
            setSession(session);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setSession(session);
            if (_event === 'SIGNED_IN') {
                window.location.hash = 'dashboard';
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // Routing
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            const [path, param] = hash.split('/');
            setView(path || 'dashboard');
            setViewParam(param || null);
        };
        window.addEventListener('hashchange', handleHashChange, false);
        handleHashChange(); // Initial load
        return () => window.removeEventListener('hashchange', handleHashChange, false);
    }, []);

    const handleNavigate = (path: string, param?: string) => {
        window.location.hash = param ? `${path}/${param}` : path;
    };
    
    // Data hooks
    const allUsers = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database])).map(model => userModelToPlain(model)!);
    const allGroups = useQuery(useMemo(() => database.get<GroupModel>('groups').query(), [database])).map(model => groupModelToPlain(model)!);
    const allTenants = useQuery(useMemo(() => database.get<TenantModel>('tenants').query(), [database])).map(model => tenantModelToPlain(model)!);
    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('sync_status', Q.notEq('pending_delete'))), [database])).map(model => farmerModelToPlain(model)!);
    
    // User context
    const { currentUser, currentTenant, userPermissions } = useMemo(() => {
        const user = allUsers.find(u => u?.id === session?.user?.id);
        const group = allGroups.find(g => g?.id === user?.groupId);
        const tenant = allTenants.find(t => t?.id === user?.tenantId);
        return {
            currentUser: user,
            currentTenant: tenant,
            userPermissions: new Set(group?.permissions || []),
        };
    }, [session, allUsers, allGroups, allTenants]);
    
    const handleSync = useCallback(async () => {
        if (!isOnline) {
            setNotification({ message: 'Sync failed: You are offline.', type: 'error' });
            return;
        }
        if (!supabase) {
            setNotification({ message: 'Sync failed: Not connected to the cloud.', type: 'error' });
            return;
        }

        setIsSyncing(true);
        try {
            const { pushed, deleted } = await synchronize(database, supabase);
            setLastSync(new Date());
            if (pushed > 0 || deleted > 0) {
                setNotification({ message: `Sync successful! Pushed ${pushed} and deleted ${deleted} record(s).`, type: 'success' });
            } else {
                setNotification({ message: 'Already up-to-date.', type: 'info' });
            }
        } catch (error: any) {
            console.error("Sync failed:", error);
            setNotification({ message: `Sync failed: ${error.message}`, type: 'error' });
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, database, supabase]);

    const renderView = () => {
        if (!currentUser || !currentTenant) return <div className="p-6">Loading user data...</div>;

        switch (view) {
            case 'dashboard': return <Dashboard farmers={allFarmers} onNavigateWithFilter={(v, f) => {}} />;
            case 'farmer-directory': return <FarmerDirectoryPage users={allUsers} tenants={allTenants} currentUser={currentUser} permissions={userPermissions} newlyAddedFarmerId={newlyAddedFarmerId} onHighlightComplete={() => setNewlyAddedFarmerId(null)} onNavigate={handleNavigate} setNotification={setNotification} />;
            case 'climate-resilience': return <CaelusDashboard onBack={() => handleNavigate('dashboard')} />;
            case 'hapsara-nexus': return <HapsaraNexusPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'billing': return <BillingPage currentUser={currentUser} currentTenant={currentTenant} onBack={() => handleNavigate('dashboard')} onNavigate={handleNavigate as any} setNotification={setNotification} />;
            default: return <NotFoundPage onBack={() => handleNavigate('dashboard')} />;
        }
    };

    if (authLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!session) {
        return supabase ? <LoginScreen supabase={supabase} /> : <LandingPage onLaunch={() => window.location.reload()} appContent={null} />;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar
                view={view}
                onNavigate={handleNavigate}
                currentUser={currentUser}
                currentTenant={currentTenant}
                permissions={userPermissions}
                onSync={handleSync}
                isSyncing={isSyncing}
                lastSync={lastSync}
                isOnline={isOnline}
            />
             <main className="flex-1 overflow-y-auto">
                <Suspense fallback={<div className="p-6">Loading...</div>}>
                    {renderView()}
                </Suspense>
            </main>
             {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onDismiss={() => setNotification(null)}
                />
            )}
        </div>
    );
};

export default App;
