


import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
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
import DiscussModeModal from './components/DiscussModeModal';

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
const IoTManagementPage = lazy(() => import('./components/IoTManagementPage'));

// Wrapper to provide navigation prop to existing components and handle params
const RouteWrapper = ({ 
  component: Component, 
  currentUser, 
  permissions, 
  tenants, 
  users, 
  setNotification, 
  ...rest 
}: any) => {
  const navigate = useNavigate();
  const params = useParams();

  // Adapter for legacy onNavigate calls
  const handleNavigate = (view: string, param?: string) => {
    if (view === 'farmer-details') navigate(`/farmers/${param}`);
    else if (view === 'product-list') navigate(`/marketplace/category/${param}`);
    else if (view === 'order-confirmation') navigate(`/marketplace/order/${param}`);
    else navigate(`/${view}`);
  };

  const handleBack = () => navigate(-1);

  // Merge params into props so components can access IDs (e.g. farmerId)
  const mergedProps = { ...rest, ...params };

  return (
    <Component
      {...mergedProps}
      currentUser={currentUser}
      permissions={permissions}
      tenants={tenants}
      users={users}
      setNotification={setNotification}
      onNavigate={handleNavigate}
      onBack={handleBack}
    />
  );
};

// Main App Content (Inside Router)
const AppContent = () => {
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const navigate = useNavigate();
    const location = useLocation();

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
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
    const [isDiscussModeOpen, setIsDiscussModeOpen] = useState(false);
    const [pendingInvitation, setPendingInvitation] = useState<string | null>(null);
    const [appContent, setAppContent] = useState<any>(null);

    // Security: Kill Switch
    useEffect(() => {
        const checkSecurity = async () => {
            const lastActiveStr = localStorage.getItem('hapsara_last_active');
            const now = Date.now();
            const MAX_INACTIVITY = 30 * 24 * 60 * 60 * 1000; 

            if (lastActiveStr) {
                const lastActive = parseInt(lastActiveStr, 10);
                if (now - lastActive > MAX_INACTIVITY) {
                    try {
                        await database.write(async () => { await database.unsafeResetDatabase(); });
                        localStorage.clear();
                        alert("Session expired. Data wiped for security.");
                        window.location.reload();
                    } catch (e) { console.error(e); }
                    return;
                }
            }
            localStorage.setItem('hapsara_last_active', now.toString());
        };
        checkSecurity();
    }, [database, location]); // Check on every navigation

    // Initialize Auth
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

             if (plainUsers.length > 0 && !currentUser) {
                 const user = plainUsers[0];
                 setCurrentUser(user);
                 const tenant = plainTenants.find(t => t.id === user.tenantId) || null;
                 setCurrentTenant(tenant);

                 try {
                    const group = await database.get<GroupModel>('groups').find(user.groupId);
                    setPermissions(new Set(JSON.parse(group.permissionsStr || '[]')));
                 } catch (e) {
                     setPermissions(new Set());
                 }
             }
        };
        checkAuth();
    }, [database, currentUser]);

    const handleNavigate = (path: string) => navigate(`/${path}`);
    
    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentTenant(null);
        setPermissions(new Set());
        navigate('/');
    };

    if (!currentUser) {
        if (pendingInvitation) {
            return <AcceptInvitation invitationCode={pendingInvitation} onAccept={() => setPendingInvitation(null)} />;
        }
        return <LoginScreen supabase={getSupabase()} />;
    }
    
    // Standalone Fullscreen Views
    if (location.pathname === '/mitra') {
        return (
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading Hapsara Mitra...</div>}>
                <MitraDashboard onBack={() => navigate('/')} currentUser={currentUser} />
            </Suspense>
        );
    }
    
    if (location.pathname === '/pulse') {
        return (
            <Suspense fallback={<div className="flex items-center justify-center h-screen text-white bg-gray-900">Loading Pulse Command...</div>}>
                <IoTManagementPage onBack={() => navigate('/')} currentUser={currentUser} />
            </Suspense>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
             <Sidebar 
                currentUser={currentUser} 
                permissions={permissions}
                isOnline={isOnline}
                printQueueLength={printQueue.length}
                onLogout={handleLogout}
                onOpenHelp={() => setIsHelpModalOpen(true)}
                onOpenDiscuss={() => setIsDiscussModeOpen(true)}
            />
            <main className="flex-1 overflow-y-auto relative">
                 {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
                 <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                    <Routes>
                        <Route path="/" element={<RouteWrapper component={Dashboard} farmers={[]} onNavigateWithFilter={(v: string, f: any) => { console.log(f); navigate('/farmer-directory'); }} />} />
                        <Route path="/dashboard" element={<RouteWrapper component={Dashboard} farmers={[]} onNavigateWithFilter={(v: string, f: any) => { console.log(f); navigate('/farmer-directory'); }} />} />
                        
                        <Route path="/farmer-directory" element={<RouteWrapper component={FarmerDirectoryPage} users={users} tenants={tenants} currentUser={currentUser} permissions={permissions} newlyAddedFarmerId={newlyAddedFarmerId} onHighlightComplete={() => setNewlyAddedFarmerId(null)} setNotification={setNotification} />} />
                        
                        {/* Parameterized Routes */}
                        <Route path="/farmers/:farmerId" element={<RouteWrapper component={FarmerDetailsPage} users={users} currentUser={currentUser} permissions={permissions} tenants={tenants} setNotification={setNotification} allTenants={tenants} allTerritories={[]} />} />
                        
                        <Route path="/settings" element={<RouteWrapper component={SettingsPage} users={users} groups={[]} currentUser={currentUser} onSaveUsers={async () => {}} onSaveGroups={async () => {}} setNotification={setNotification} />} />
                        <Route path="/reports" element={<RouteWrapper component={ReportsPage} allFarmers={[]} />} />
                        <Route path="/id-verification" element={<RouteWrapper component={IdVerificationPage} allFarmers={[]} />} />
                        <Route path="/data-health" element={<RouteWrapper component={DataHealthPage} allFarmers={[]} />} />
                        <Route path="/geo-management" element={<RouteWrapper component={GeoManagementPage} />} />
                        <Route path="/schema-manager" element={<RouteWrapper component={SchemaManagerPage} />} />
                        <Route path="/tenant-management" element={<RouteWrapper component={TenantManagementPage} />} />
                        <Route path="/profile" element={<RouteWrapper component={ProfilePage} currentUser={currentUser} groups={[]} onSave={async () => {}} setNotification={setNotification} />} />
                        <Route path="/usage-analytics" element={<RouteWrapper component={UsageAnalyticsPage} currentUser={currentUser} supabase={getSupabase()} />} />
                        <Route path="/billing" element={<RouteWrapper component={BillingPage} currentUser={currentUser} currentTenant={currentTenant!} setNotification={setNotification} />} />
                        <Route path="/subscription-management" element={<RouteWrapper component={SubscriptionManagementPage} currentUser={currentUser} />} />
                        <Route path="/print-queue" element={<RouteWrapper component={PrintQueuePage} queuedFarmerIds={printQueue} users={users} onRemove={() => {}} onClear={() => setPrintQueue([])} />} />
                        <Route path="/content-manager" element={<RouteWrapper component={ContentManagerPage} supabase={getSupabase()} currentContent={appContent} onContentSave={() => {}} />} />
                        <Route path="/crop-health" element={<RouteWrapper component={CropHealthScannerPage} currentUser={currentUser} setNotification={setNotification} />} />
                        <Route path="/yield-prediction" element={<RouteWrapper component={YieldPredictionPage} allFarmers={[]} />} />
                        <Route path="/financial-ledger" element={<RouteWrapper component={FinancialLedgerPage} allFarmers={[]} currentUser={currentUser} />} />
                        <Route path="/satellite-analysis" element={<RouteWrapper component={SatelliteAnalysisPage} />} />
                        <Route path="/sustainability" element={<RouteWrapper component={SustainabilityDashboard} />} />
                        <Route path="/tasks" element={<RouteWrapper component={TaskManagementPage} currentUser={currentUser} allDirectives={[]} allTenants={tenants} allTerritories={[]} />} />
                        <Route path="/resource-management" element={<RouteWrapper component={ResourceManagementPage} />} />
                        <Route path="/distribution-report" element={<RouteWrapper component={DistributionReportPage} />} />
                        <Route path="/resource-library" element={<RouteWrapper component={ResourceLibraryPage} currentUser={currentUser} />} />
                        <Route path="/events" element={<RouteWrapper component={EventsPage} currentUser={currentUser} setNotification={setNotification} />} />
                        <Route path="/territory-management" element={<RouteWrapper component={TerritoryManagementPage} currentUser={currentUser} />} />
                        <Route path="/farmer-advisor" element={<RouteWrapper component={FarmerAdvisorPage} currentUser={currentUser} />} />
                        <Route path="/financials" element={<RouteWrapper component={FinancialsPage} allFarmers={[]} currentUser={currentUser} setNotification={setNotification} />} />
                        <Route path="/field-service" element={<RouteWrapper component={FieldServicePage} currentUser={currentUser} />} />
                        <Route path="/assistance-schemes" element={<RouteWrapper component={AssistanceSchemesPage} currentUser={currentUser} setNotification={setNotification} />} />
                        <Route path="/quality-assessment" element={<RouteWrapper component={QualityAssessmentPage} currentUser={currentUser} allFarmers={[]} setNotification={setNotification} />} />
                        <Route path="/processing" element={<RouteWrapper component={ProcessingPage} currentUser={currentUser} setNotification={setNotification} />} />
                        <Route path="/equipment-management" element={<RouteWrapper component={EquipmentManagementPage} currentUser={currentUser} />} />
                        <Route path="/equipment-access" element={<RouteWrapper component={EquipmentAccessProgramPage} currentUser={currentUser} />} />
                        <Route path="/community-forum" element={<RouteWrapper component={CommunityForumPage} currentUser={currentUser} setNotification={setNotification} />} />
                        <Route path="/mentorship" element={<RouteWrapper component={MentorshipPage} currentUser={currentUser} setNotification={setNotification} />} />
                        <Route path="/marketplace" element={<RouteWrapper component={MarketplacePage} currentUser={currentUser} />} />
                        
                        <Route path="/marketplace/category/:categoryId" element={<RouteWrapper component={ProductListPage} currentUser={currentUser} />} />
                        <Route path="/vendor-management" element={<RouteWrapper component={VendorManagementPage} currentUser={currentUser} setNotification={setNotification} />} />
                        <Route path="/checkout" element={<RouteWrapper component={CheckoutPage} onOrderPlaced={() => navigate('/marketplace/order/confirmed')} />} />
                        <Route path="/marketplace/order/:orderId" element={<RouteWrapper component={OrderConfirmationPage} />} />
                        
                        <Route path="/agri-store" element={<RouteWrapper component={AgriStorePage} />} />
                        <Route path="/climate-resilience" element={<RouteWrapper component={CaelusDashboard} />} />
                        <Route path="/hapsara-nexus" element={<RouteWrapper component={HapsaraNexusPage} currentUser={currentUser} />} />
                        <Route path="/family-shield" element={<RouteWrapper component={FamilyShield} currentUser={currentUser} setNotification={setNotification} />} />
                        <Route path="/realty" element={<RouteWrapper component={RealtyPage} currentUser={currentUser} />} />
                        <Route path="/state-craft" element={<RouteWrapper component={StateCraftDashboard} currentUser={currentUser} allDirectives={[]} allDirectiveAssignments={[]} allTenants={tenants} allUsers={users} allTerritories={[]} />} />
                        <Route path="/samridhi" element={<RouteWrapper component={SamridhiDashboard} currentUser={currentUser} />} />
                        <Route path="/genetica" element={<RouteWrapper component={SeedRegistryPage} currentUser={currentUser} />} />
                        <Route path="/performance-tracker" element={<RouteWrapper component={PerformanceTracker} currentUser={currentUser} />} />
                        <Route path="/commoditex" element={<RouteWrapper component={CommoditexDashboard} currentUser={currentUser} />} />
                        
                        <Route path="*" element={<RouteWrapper component={NotFoundPage} />} />
                    </Routes>
                 </Suspense>
            </main>

            {/* Global Modals */}
            <SupabaseSettingsModal isOpen={isSupabaseSettingsOpen} onClose={() => setIsSupabaseSettingsOpen(false)} onConnect={() => {}} />
            <HelpModal onClose={() => setIsHelpModalOpen(false)} appContent={appContent} />
            <PrivacyModal onClose={() => setIsPrivacyModalOpen(false)} appContent={appContent} />
            <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />
            {isInvitationModalOpen && <InvitationModal currentUser={currentUser} onClose={() => setIsInvitationModalOpen(false)} />}
            {isDiscussModeOpen && <DiscussModeModal currentUser={currentUser} onClose={() => setIsDiscussModeOpen(false)} />}
        </div>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
