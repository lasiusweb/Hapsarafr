// routes/AppRoutes.tsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import RouteWrapper from '../components/RouteWrapper';
import { User, Tenant, Permission } from '../types';

// Lazy loaded components (copied from App.tsx)
const FarmerDirectoryPage = lazy(() => import('../components/FarmerDirectoryPage'));
const FarmerDetailsPage = lazy(() => import('../components/FarmerDetailsPage'));
const Dashboard = lazy(() => import('../components/Dashboard'));
const SettingsPage = lazy(() => import('../components/AdminPage'));
const ReportsPage = lazy(() => import('../components/ReportsPage'));
const IdVerificationPage = lazy(() => import('../components/IdVerificationPage'));
const DataHealthPage = lazy(() => import('../components/DataHealthPage'));
const GeoManagementPage = lazy(() => import('../components/GeoManagementPage'));
const SchemaManagerPage = lazy(() => import('../components/SchemaManagerPage'));
const TenantManagementPage = lazy(() => import('../components/TenantManagementPage'));
const ProfilePage = lazy(() => import('../components/ProfilePage'));
const UsageAnalyticsPage = lazy(() => import('../components/UsageAnalyticsPage'));
const BillingPage = lazy(() => import('../components/BillingPage'));
const SubscriptionManagementPage = lazy(() => import('../components/SubscriptionManagementPage'));
const PrintQueuePage = lazy(() => import('../components/PrintQueuePage'));
const ContentManagerPage = lazy(() => import('../components/ContentManagerPage'));
const CropHealthScannerPage = lazy(() => import('../components/CropHealthScannerPage'));
const YieldPredictionPage = lazy(() => import('../components/YieldPredictionPage'));
const FinancialDashboardPage = lazy(() => import('../components/FinancialDashboardPage'));
const FinancialLedgerPage = lazy(() => import('../components/FinancialLedgerPage'));
const SatelliteAnalysisPage = lazy(() => import('../components/SatelliteAnalysisPage'));
const SustainabilityDashboard = lazy(() => import('../components/SustainabilityDashboard'));
const NotFoundPage = lazy(() => import('../components/NotFoundPage'));
const TaskManagementPage = lazy(() => import('../components/TaskManagementPage'));
const ResourceManagementPage = lazy(() => import('../components/ResourceManagementPage'));
const DistributionReportPage = lazy(() => import('../components/DistributionReportPage'));
const ResourceLibraryPage = lazy(() => import('../components/ResourceLibraryPage'));
const EventsPage = lazy(() => import('../components/EventsPage'));
const TerritoryManagementPage = lazy(() => import('../components/TerritoryManagementPage'));
const FarmerAdvisorPage = lazy(() => import('../components/FarmerAdvisorPage'));
const FinancialsPage = lazy(() => import('../components/FinancialsPage'));
const FieldServicePage = lazy(() => import('../components/FieldServicePage'));
const AssistanceSchemesPage = lazy(() => import('../components/AssistanceSchemesPage'));
const QualityAssessmentPage = lazy(() => import('../components/QualityAssessmentPage'));
const ProcessingPage = lazy(() => import('../components/ProcessingPage'));
const EquipmentManagementPage = lazy(() => import('../components/EquipmentManagementPage'));
const EquipmentAccessProgramPage = lazy(() => import('../components/EquipmentAccessProgramPage'));
const CommunityForumPage = lazy(() => import('../components/CommunityForumPage'));
const MentorshipPage = lazy(() => import('../components/MentorshipPage'));
const MarketplacePage = lazy(() => import('../components/MarketplacePage'));
const ProductListPage = lazy(() => import('../components/ProductListPage'));
const VendorManagementPage = lazy(() => import('../components/VendorManagementPage'));
const CheckoutPage = lazy(() => import('../components/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('../components/OrderConfirmationPage'));
const AgriStorePage = lazy(() => import('../components/AgriStorePage'));
const CaelusDashboard = lazy(() => import('../components/CaelusDashboard'));
const HapsaraNexusPage = lazy(() => import import('../components/HapsaraNexusPage'));
const StateCraftDashboard = lazy(() => import('../components/StateCraftDashboard'));
const FamilyShield = lazy(() => import('../components/FamilyShield'));
const RealtyPage = lazy(() => import('../components/RealtyPage'));
const MitraDashboard = lazy(() => import('../components/MitraDashboard'));
const SamridhiDashboard = lazy(() => import('../components/SamridhiDashboard'));
const SeedRegistryPage = lazy(() => import('../components/SeedRegistryPage'));
const PerformanceTracker = lazy(() => import('../components/PerformanceTracker'));
const CommoditexDashboard = lazy(() => import('../components/CommoditexDashboard'));
const IoTManagementPage = lazy(() => import('../components/IoTManagementPage'));


interface AppRoutesProps {
    currentUser: User | null;
    permissions: Set<Permission>;
    tenants: Tenant[];
    users: User[];
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
    printQueue: string[];
    newlyAddedFarmerId: string | null;
    onHighlightComplete: () => void;
    appContent: any; // Consider a more specific type if possible
}

const AppRoutes: React.FC<AppRoutesProps> = ({
    currentUser,
    permissions,
    tenants,
    users,
    setNotification,
    printQueue,
    newlyAddedFarmerId,
    onHighlightComplete,
    appContent,
}) => {
    const navigate = useNavigate();

    // Route Definitions
    const routes = [
        {
            path: "/",
            component: Dashboard,
            props: { farmers: [], onNavigateWithFilter: (v: string, f: any) => { console.log(f); navigate('/farmer-directory'); } }
        },
        {
            path: "/dashboard",
            component: Dashboard,
            props: { farmers: [], onNavigateWithFilter: (v: string, f: any) => { console.log(f); navigate('/farmer-directory'); } }
        },
        {
            path: "/farmer-directory",
            component: FarmerDirectoryPage,
            props: { users, tenants, currentUser, permissions, newlyAddedFarmerId, onHighlightComplete, setNotification }
        },
        {
            path: "/farmers/:farmerId",
            component: FarmerDetailsPage,
            props: { users, currentUser, permissions, tenants, setNotification, allTenants: tenants, allTerritories: [] }
        },
        {
            path: "/settings",
            component: SettingsPage,
            props: { users, groups: [], currentUser, onSaveUsers: async () => { }, onSaveGroups: async () => { }, setNotification }
        },
        { path: "/reports", component: ReportsPage, props: { allFarmers: [] } },
        { path: "/id-verification", component: IdVerificationPage, props: { allFarmers: [] } },
        { path: "/data-health", component: DataHealthPage, props: { allFarmers: [] } },
        { path: "/geo-management", component: GeoManagementPage },
        { path: "/schema-manager", component: SchemaManagerPage },
        { path: "/tenant-management", component: TenantManagementPage },
        { path: "/profile", component: ProfilePage, props: { currentUser, groups: [], onSave: async () => { }, setNotification } },
        { path: "/usage-analytics", component: UsageAnalyticsPage, props: { currentUser, supabase: {} /*getSupabase()*/ } }, // getSupabase() needs to be passed or re-evaluated
        { path: "/billing", component: BillingPage, props: { currentUser, currentTenant: tenants.find(t => t.id === currentUser?.tenantId) || null, setNotification } },
        { path: "/subscription-management", component: SubscriptionManagementPage, props: { currentUser } },
        { path: "/print-queue", component: PrintQueuePage, props: { queuedFarmerIds: printQueue, users, onRemove: () => { }, onClear: () => {} /*setPrintQueue([])*/ } }, // setPrintQueue needs to be passed or re-evaluated
        { path: "/content-manager", component: ContentManagerPage, props: { supabase: {} /*getSupabase()*/, currentContent: appContent, onContentSave: () => { } } }, // getSupabase() and onContentSave needs to be passed or re-evaluated
        { path: "/crop-health", component: CropHealthScannerPage, props: { currentUser, setNotification } },
        { path: "/yield-prediction", component: YieldPredictionPage, props: { allFarmers: [] } },
        { path: "/financial-ledger", component: FinancialLedgerPage, props: { allFarmers: [], currentUser } },
        { path: "/financial-dashboard", component: FinancialDashboardPage },
        { path: "/satellite-analysis", component: SatelliteAnalysisPage },
        { path: "/sustainability", component: SustainabilityDashboard },
        { path: "/tasks", component: TaskManagementPage, props: { currentUser, allDirectives: [], allTenants: tenants, allTerritories: [] } },
        { path: "/resource-management", component: ResourceManagementPage },
        { path: "/distribution-report", component: DistributionReportPage },
        { path: "/resource-library", component: ResourceLibraryPage, props: { currentUser } },
        { path: "/events", component: EventsPage, props: { currentUser, setNotification } },
        { path: "/territory-management", component: TerritoryManagementPage, props: { currentUser } },
        { path: "/farmer-advisor", component: FarmerAdvisorPage, props: { currentUser } },
        { path: "/financials", component: FinancialsPage, props: { allFarmers: [], currentUser, setNotification } },
        { path: "/field-service", component: FieldServicePage, props: { currentUser } },
        { path: "/assistance-schemes", component: AssistanceSchemesPage, props: { currentUser, setNotification } },
        { path: "/quality-assessment", component: QualityAssessmentPage, props: { currentUser, allFarmers: [], setNotification } },
        { path: "/processing", component: ProcessingPage, props: { currentUser, setNotification } },
        { path: "/equipment-management", component: EquipmentManagementPage, props: { currentUser } },
        { path: "/equipment-access", component: EquipmentAccessProgramPage, props: { currentUser } },
        { path: "/community-forum", component: CommunityForumPage, props: { currentUser, setNotification } },
        { path: "/mentorship", component: MentorshipPage, props: { currentUser, setNotification } },
        { path: "/marketplace", component: MarketplacePage, props: { currentUser } },
        { path: "/marketplace/category/:categoryId", component: ProductListPage, props: { currentUser } },
        { path: "/vendor-management", component: VendorManagementPage, props: { currentUser, setNotification } },
        {
            path: "/checkout",
            component: CheckoutPage,
            props: { onOrderPlaced: () => navigate('/marketplace/order/confirmed') }
        },
        { path: "/marketplace/order/:orderId", component: OrderConfirmationPage },
        { path: "/agri-store", component: AgriStorePage },
        { path: "/climate-resilience", component: CaelusDashboard },
        { path: "/hapsara-nexus", component: HapsaraNexusPage, props: { currentUser } },
        { path: "/family-shield", component: FamilyShield, props: { currentUser, setNotification } },
        { path: "/realty", component: RealtyPage, props: { currentUser } },
        { path: "/state-craft", component: StateCraftDashboard, props: { currentUser, allDirectives: [], allDirectiveAssignments: [], allTenants: tenants, allUsers: users, allTerritories: [] } },
        { path: "/samridhi", component: SamridhiDashboard, props: { currentUser } },
        { path: "/genetica", component: SeedRegistryPage, props: { currentUser } },
        { path: "/performance-tracker", component: PerformanceTracker, props: { currentUser } },
        { path: "/commoditex", component: CommoditexDashboard, props: { currentUser } },
        { path: "*", component: NotFoundPage }
    ];

    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <Routes>
                {routes.map((route, index) => (
                    <Route
                        key={index}
                        path={route.path}
                        element={<RouteWrapper component={route.component} {...route.props} currentUser={currentUser} permissions={permissions} tenants={tenants} users={users} setNotification={setNotification} />}
                    />
                ))}
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;
