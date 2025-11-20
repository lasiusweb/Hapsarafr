
import React, { useState, useEffect, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import { User, Tenant, Permission } from './types';
import { useDatabase } from './DatabaseContext';
import { FarmerModel, UserModel, TenantModel, GroupModel } from './db';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { getSupabase } from './lib/supabase';
import LoginScreen from './components/LoginScreen';
import Notification from './components/Notification';
import HelpModal from './components/HelpModal';
import PrivacyModal from './components/PrivacyModal';
import FeedbackModal from './components/FeedbackModal';
import SupabaseSettingsModal from './components/SupabaseSettingsModal';
import InvitationModal from './components/InvitationModal';
import AcceptInvitation from './components/AcceptInvitation';

// Lazy loaded components
const FarmerDirectoryPage = lazy(() => import('./components/FarmerDirectoryPage'));
const FarmerDetailsPage = lazy(() => import('./components/FarmerDetailsPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const SettingsPage = lazy(() => import('./components/AdminPage')); 
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const IdVerificationPage = lazy(() => import('./components/IdVerificationPage'));
const DataHealthPage = lazy(() => import('./components/DataHealthPage'));
const GeoManagementPage = lazy(() => import('./components/GeoManagementPage'));
const SchemaManagerPage = lazy(() => import('./components/SchemaManagerPage'));
const TenantManagementPage = lazy(() => import('./components/TenantManagementPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const UsageAnalyticsPage = lazy(() => import('./components/UsageAnalyticsPage'));
const BillingPage = lazy(() => import('./components/BillingPage'));
const SubscriptionManagementPage = lazy(() => import('./components/SubscriptionManagementPage'));
const PrintQueuePage = lazy(() => import('./components/PrintQueuePage'));
const ContentManagerPage = lazy(() => import('./components/ContentManagerPage'));
const CropHealthScannerPage = lazy(() => import('./components/CropHealthScannerPage'));
const YieldPredictionPage = lazy(() => import('./components/YieldPredictionPage'));
const FinancialLedgerPage = lazy(() => import('./components/FinancialLedgerPage'));
const SatelliteAnalysisPage = lazy(() => import('./components/SatelliteAnalysisPage'));
const SustainabilityDashboard = lazy(() => import('./components/SustainabilityDashboard'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));
const TaskManagementPage = lazy(() => import('./components/TaskManagementPage'));
const ResourceManagementPage = lazy(() => import('./components/ResourceManagementPage'));
const DistributionReportPage = lazy(() => import('./components/DistributionReportPage'));
const ResourceLibraryPage = lazy(() => import('./components/ResourceLibraryPage'));
const EventsPage = lazy(() => import('./components/EventsPage'));
const TerritoryManagementPage = lazy(() => import('./components/TerritoryManagementPage'));
const FarmerAdvisorPage = lazy(() => import('./components/FarmerAdvisorPage'));
const FinancialsPage = lazy(() => import('./components/FinancialsPage'));
const FieldServicePage = lazy(() => import('./components/FieldServicePage'));
const AssistanceSchemesPage = lazy(() => import('./components/AssistanceSchemesPage'));
const QualityAssessmentPage = lazy(() => import('./components/QualityAssessmentPage'));
const ProcessingPage = lazy(() => import('./components/ProcessingPage'));
const EquipmentManagementPage = lazy(() => import('./components/EquipmentManagementPage'));
const EquipmentAccessProgramPage = lazy(() => import('./components/EquipmentAccessProgramPage'));
const CommunityForumPage = lazy(() => import('./components/CommunityForumPage'));
const MentorshipPage = lazy(() => import('./components/MentorshipPage'));
const MarketplacePage = lazy(() => import('./components/MarketplacePage'));
const ProductListPage = lazy(() => import('./components/ProductListPage'));
const VendorManagementPage = lazy(() => import('./components/VendorManagementPage'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./components/OrderConfirmationPage'));
const AgriStorePage = lazy(() => import('./components/AgriStorePage'));
const CaelusDashboard = lazy(() => import('./components/CaelusDashboard'));
const HapsaraNexusPage = lazy(() => import('./components/HapsaraNexusPage'));
const StateCraftDashboard = lazy(() => import('./components/StateCraftDashboard'));
const FamilyShield = lazy(() => import('./components/FamilyShield'));
const RealtyPage = lazy(() => import('./components/RealtyPage'));
const MitraDashboard = lazy(() => import('./components/MitraDashboard'));
const SamridhiDashboard = lazy(() => import('./components/SamridhiDashboard'));
const SeedRegistryPage = lazy(() => import('./components/SeedRegistryPage'));
const PerformanceTracker = lazy(() => import('./components/PerformanceTracker'));
const CommoditexDashboard = lazy(() => import('./components/CommoditexDashboard'));

function App() {
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
    const [currentView, setCurrentView] = useState('dashboard');
    const [viewParam, setViewParam] = useState<string | undefined>(undefined);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [printQueue, setPrintQueue] = useState<string[]>([]);
    const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);

    // Modals
    const [isSupabaseSettingsOpen, setIsSupabaseSettingsOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
    const [pendingInvitation, setPendingInvitation] = useState<string | null>(null);
    const [appContent, setAppContent] = useState<any>(null);

    // --- Security: Fortis Data Protection Protocol (KILL SWITCH) ---
    // Data Wipe on Inactivity (30 Days) to prevent unauthorized access on lost devices.
    useEffect(() => {
        const checkSecurity = async () => {
            const lastActiveStr = localStorage.getItem('hapsara_last_active');
            const now = Date.now();
            const MAX_INACTIVITY = 30 * 24 * 60 * 60 * 1000; // 30 Days in Milliseconds

            if (lastActiveStr) {
                const lastActive = parseInt(lastActiveStr, 10);
                if (now - lastActive > MAX_INACTIVITY) {
                    console.warn("Security Alert: Device inactive for >30 days. Initiating Fortis Wipe Protocol.");
                    try {
                        await database.write(async () => {
                            await database.unsafeResetDatabase();
                        });
                        localStorage.clear(); // Clear auth tokens and keys
                        alert("For your security, local data has been wiped due to 30 days of inactivity. Please re-authenticate.");
                        window.location.reload();
                    } catch (e) {
                        console.error("Wipe failed", e);
                    }
                    return;
                }
            }
            // Update activity timestamp on app load
            localStorage.setItem('hapsara_last_active', now.toString());
        };
        checkSecurity();
    }, [database]);

    // Initialize Auth & Data
    useEffect(() => {
        const checkAuth = async () => {
            const usersCollection = database.get<UserModel>('users');
            const allUsers = await usersCollection.query().fetch();
            const plainUsers = allUsers.map(u => ({ ...u._raw } as unknown as User));
            setUsers(plainUsers);
            
            const tenantsCollection = database.get<TenantModel>('tenants');
            const allTenants = await tenantsCollection.query().fetch();
            const plainTenants = allTenants.map(t => ({ ...t._raw } as unknown as Tenant));
            setTenants(plainTenants);

            // Auto-login first user found (for dev/offline capability)
             if (plainUsers.length > 0) {
                 const user = plainUsers[0];
                 setCurrentUser(user);
                 const tenant = plainTenants.find(t => t.id === user.tenantId) || null;
                 setCurrentTenant(tenant);

                 // Load permissions safely
                 try {
                    const group = await database.get<GroupModel>('groups').find(user.groupId);
                    setPermissions(new Set(JSON.parse(group.permissionsStr || '[]')));
                 } catch (e) {
                     console.warn("Could not load group permissions, defaulting to empty.");
                     setPermissions(new Set());
                 }
             }
        };
        checkAuth();
    }, [database]);

    // Navigation Handler with Security Timestamp Update
    const handleNavigate = (view: string, param?: string) => {
        setCurrentView(view);
        setViewParam(param);
        // Update security timestamp on every navigation action to keep session alive
        localStorage.setItem('hapsara_last_active', Date.now().toString());
    };
    
    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentTenant(null);
        setPermissions(new Set());
        setCurrentView('dashboard');
        // We do NOT wipe DB on logout, only on extended inactivity.
    };

    // Render Logic
    if (!currentUser) {
        if (pendingInvitation) {
            return <AcceptInvitation invitationCode={pendingInvitation} onAccept={() => setPendingInvitation(null)} />;
        }
        return <LoginScreen supabase={getSupabase()} />;
    }

    if (currentView === 'mitra') {
        return (
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading Hapsara Mitra...</div>}>
                <MitraDashboard onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />
            </Suspense>
        );
    }

    const renderView = () => {
        switch (currentView) {
            case 'dashboard': return <Dashboard farmers={[]} onNavigateWithFilter={(v, f) => { console.log(f); handleNavigate(v); }} />;
            case 'farmer-directory': return <FarmerDirectoryPage users={users} tenants={tenants} currentUser={currentUser} permissions={permissions} newlyAddedFarmerId={newlyAddedFarmerId} onHighlightComplete={() => setNewlyAddedFarmerId(null)} onNavigate={handleNavigate} setNotification={setNotification} />;
            case 'farmer-details': return <FarmerDetailsPage farmerId={viewParam!} users={users} currentUser={currentUser} onBack={() => handleNavigate('farmer-directory')} permissions={permissions} setNotification={setNotification} allTenants={tenants as any} allTerritories={[]} />;
            case 'settings': return <SettingsPage users={users} groups={[]} currentUser={currentUser} onSaveUsers={async () => {}} onSaveGroups={async () => {}} onBack={() => handleNavigate('dashboard')} onNavigate={handleNavigate as any} setNotification={setNotification} />;
            case 'reports': return <ReportsPage allFarmers={[]} onBack={() => handleNavigate('dashboard')} />;
            case 'id-verification': return <IdVerificationPage allFarmers={[]} onBack={() => handleNavigate('dashboard')} />;
            case 'data-health': return <DataHealthPage allFarmers={[]} onNavigate={handleNavigate} onBack={() => handleNavigate('dashboard')} />;
            case 'geo-management': return <GeoManagementPage onBack={() => handleNavigate('settings')} />;
            case 'schema-manager': return <SchemaManagerPage onBack={() => handleNavigate('settings')} />;
            case 'tenant-management': return <TenantManagementPage onBack={() => handleNavigate('settings')} />;
            case 'profile': return <ProfilePage currentUser={currentUser} groups={[]} onSave={async () => {}} onBack={() => handleNavigate('dashboard')} setNotification={setNotification} />;
            case 'usage-analytics': return <UsageAnalyticsPage currentUser={currentUser} onBack={() => handleNavigate('dashboard')} supabase={getSupabase()} />;
            case 'billing': return <BillingPage currentUser={currentUser} currentTenant={currentTenant!} onBack={() => handleNavigate('dashboard')} onNavigate={handleNavigate as any} setNotification={setNotification} />;
            case 'subscription-management': return <SubscriptionManagementPage currentUser={currentUser} onBack={() => handleNavigate('billing')} />;
            case 'print-queue': return <PrintQueuePage queuedFarmerIds={printQueue} users={users} onRemove={() => {}} onClear={() => setPrintQueue([])} onBack={() => handleNavigate('dashboard')} />;
            case 'content-manager': return <ContentManagerPage supabase={getSupabase()} currentContent={appContent} onContentSave={() => {}} onBack={() => handleNavigate('settings')} />;
            case 'crop-health': return <CropHealthScannerPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} setNotification={setNotification} />;
            case 'yield-prediction': return <YieldPredictionPage allFarmers={[]} onBack={() => handleNavigate('dashboard')} />;
            case 'financial-ledger': return <FinancialLedgerPage allFarmers={[]} onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'satellite-analysis': return <SatelliteAnalysisPage onBack={() => handleNavigate('dashboard')} />;
            case 'sustainability': return <SustainabilityDashboard onBack={() => handleNavigate('dashboard')} />;
            case 'tasks': return <TaskManagementPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} allDirectives={[]} allTenants={tenants as any} allTerritories={[]} />;
            case 'resource-management': return <ResourceManagementPage onBack={() => handleNavigate('settings')} />;
            case 'distribution-report': return <DistributionReportPage onBack={() => handleNavigate('dashboard')} />;
            case 'resource-library': return <ResourceLibraryPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'events': return <EventsPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} setNotification={setNotification} />;
            case 'territory-management': return <TerritoryManagementPage onBack={() => handleNavigate('settings')} currentUser={currentUser} />;
            case 'farmer-advisor': return <FarmerAdvisorPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} onNavigate={handleNavigate} />;
            case 'financials': return <FinancialsPage allFarmers={[]} onBack={() => handleNavigate('dashboard')} currentUser={currentUser} setNotification={setNotification} onNavigate={handleNavigate} />;
            case 'field-service': return <FieldServicePage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'assistance-schemes': return <AssistanceSchemesPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} setNotification={setNotification} />;
            case 'quality-assessment': return <QualityAssessmentPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} allFarmers={[]} setNotification={setNotification} />;
            case 'processing': return <ProcessingPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} setNotification={setNotification} />;
            case 'equipment-management': return <EquipmentManagementPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'equipment-access': return <EquipmentAccessProgramPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'community-forum': return <CommunityForumPage currentUser={currentUser} onBack={() => handleNavigate('dashboard')} setNotification={setNotification} />;
            case 'mentorship': return <MentorshipPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} setNotification={setNotification} />;
            case 'marketplace': return <MarketplacePage onBack={() => handleNavigate('dashboard')} onNavigate={handleNavigate as any} currentUser={currentUser} />;
            case 'product-list': return <ProductListPage categoryId={viewParam!} onBack={() => handleNavigate('marketplace')} />;
            case 'vendor-management': return <VendorManagementPage onBack={() => handleNavigate('settings')} currentUser={currentUser} setNotification={setNotification} />;
            case 'checkout': return <CheckoutPage onBack={() => handleNavigate('marketplace')} onOrderPlaced={() => handleNavigate('order-confirmation')} />;
            case 'order-confirmation': return <OrderConfirmationPage orderId={viewParam || ''} onNavigate={handleNavigate as any} />;
            case 'agri-store': return <AgriStorePage onBack={() => handleNavigate('dashboard')} />;
            case 'climate-resilience': return <CaelusDashboard onBack={() => handleNavigate('dashboard')} />;
            case 'hapsara-nexus': return <HapsaraNexusPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'family-shield': return <FamilyShield onBack={() => handleNavigate('dashboard')} currentUser={currentUser} setNotification={setNotification} />;
            case 'realty': return <RealtyPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'state-craft': return <StateCraftDashboard onBack={() => handleNavigate('dashboard')} currentUser={currentUser} allDirectives={[]} allDirectiveAssignments={[]} allTenants={tenants as any} allUsers={users as any} allTerritories={[]} />;
            case 'samridhi': return <SamridhiDashboard onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'genetica': return <SeedRegistryPage onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            case 'performance-tracker': return <PerformanceTracker onBack={() => handleNavigate('genetica')} currentUser={currentUser} />;
            case 'commoditex': return <CommoditexDashboard onBack={() => handleNavigate('dashboard')} currentUser={currentUser} />;
            default: return <NotFoundPage onBack={() => handleNavigate('dashboard')} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
             <Sidebar 
                activeView={currentView} 
                onNavigate={handleNavigate} 
                currentUser={currentUser} 
                permissions={permissions}
                isOnline={isOnline}
                printQueueLength={printQueue.length}
                onLogout={handleLogout}
                onOpenHelp={() => setIsHelpModalOpen(true)}
            />
            <main className="flex-1 overflow-y-auto relative">
                 {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
                 <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                    {renderView()}
                 </Suspense>
            </main>

            {/* Global Modals */}
            <SupabaseSettingsModal isOpen={isSupabaseSettingsOpen} onClose={() => setIsSupabaseSettingsOpen(false)} onConnect={() => {}} />
            <HelpModal onClose={() => setIsHelpModalOpen(false)} appContent={appContent} />
            <PrivacyModal onClose={() => setIsPrivacyModalOpen(false)} appContent={appContent} />
            <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />
            {isInvitationModalOpen && <InvitationModal currentUser={currentUser} onClose={() => setIsInvitationModalOpen(false)} />}
        </div>
    );
}

export default App;
