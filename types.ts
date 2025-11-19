
export enum FarmerStatus {
    Registered = 'Registered',
    Sanctioned = 'Sanctioned',
    Planted = 'Planted',
    PaymentDone = 'PaymentDone',
}

export enum PlantationMethod {
    Square = 'Square',
    Triangle = 'Triangle',
}

export enum PlantType {
    Imported = 'Imported',
    Domestic = 'Domestic',
}

export interface District {
    code: string;
    name: string;
    mandals: Mandal[];
}

export interface Mandal {
    code: string;
    name: string;
    villages: Village[];
}

export interface Village {
    code: string;
    name: string;
}

export interface FarmPlot {
    id: string;
    farmerId: string;
    acreage: number;
    name: string;
    number_of_plants: number;
    plantation_date?: string;
    soil_type?: SoilType;
    method_of_plantation?: PlantationMethod;
    plant_type?: PlantType;
    geojson?: string;
    is_replanting?: boolean;
    createdAt: string;
    updatedAt: string;
}

export enum SoilType {
    Red = 'Red',
    Black = 'Black',
    Sandy = 'Sandy',
    Loamy = 'Loamy',
}

export interface Farmer {
    id: string;
    hap_id?: string;
    fullName: string;
    fatherHusbandName: string;
    aadhaarNumber: string;
    mobileNumber: string;
    gender: string;
    address: string;
    district: string;
    mandal: string;
    village: string;
    photo?: string;
    bankAccountNumber: string;
    ifscCode: string;
    accountVerified: boolean;
    approvedExtent?: number;
    appliedExtent?: number;
    numberOfPlants?: number;
    methodOfPlantation?: PlantationMethod;
    plantType?: PlantType;
    plantationDate?: string;
    status: FarmerStatus | string;
    registrationDate: string;
    latitude?: number;
    longitude?: number;
    gov_application_id?: string;
    gov_farmer_id?: string;
    ppbRofrId?: string;
    is_in_ne_region?: boolean;
    proposedYear?: string;
    syncStatus: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    tenantId: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    groupId: string;
    avatar: string;
    tenantId: string;
    is_verified: boolean;
}

export interface Group {
    id: string;
    name: string;
    permissions: Permission[] | string[]; // string[] for backward compatibility/json parsing
    tenantId: string;
}

export enum Permission {
    CAN_REGISTER_FARMER = 'CAN_REGISTER_FARMER',
    CAN_EDIT_FARMER = 'CAN_EDIT_FARMER',
    CAN_DELETE_FARMER = 'CAN_DELETE_FARMER',
    CAN_IMPORT_DATA = 'CAN_IMPORT_DATA',
    CAN_EXPORT_DATA = 'CAN_EXPORT_DATA',
    CAN_SYNC_DATA = 'CAN_SYNC_DATA',
    CAN_MANAGE_USERS = 'CAN_MANAGE_USERS',
    CAN_MANAGE_GROUPS = 'CAN_MANAGE_GROUPS',
    CAN_INVITE_USERS = 'CAN_INVITE_USERS',
    CAN_MANAGE_CONTENT = 'CAN_MANAGE_CONTENT',
    CAN_VIEW_MARKETPLACE = 'CAN_VIEW_MARKETPLACE',
    CAN_MANAGE_VENDORS = 'CAN_MANAGE_VENDORS',
    CAN_MANAGE_ORDERS = 'CAN_MANAGE_ORDERS',
    CAN_MANAGE_SCHEMA = 'CAN_MANAGE_SCHEMA',
    CAN_ACCESS_MITRA = 'CAN_ACCESS_MITRA',
}

export interface Tenant {
    id: string;
    name: string;
    subscriptionStatus: 'active' | 'trial' | 'inactive';
    credit_balance: number;
    maxFarmers?: number;
    createdAt: string;
}

export interface Filters {
    searchQuery: string;
    district: string;
    mandal: string;
    village: string;
    status: string;
    registrationDateFrom: string;
    registrationDateTo: string;
    plantationMethod?: string;
}

export interface AppContent {
    landing_hero_title: string;
    landing_hero_subtitle: string;
    landing_about_us: string;
    privacy_policy: string;
    faqs: FAQItem[];
}

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export enum BillableEvent {
    CROP_HEALTH_SCAN_COMPLETED = 'CROP_HEALTH_SCAN_COMPLETED',
}

export interface AuditLogEntry {
    id: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    created_at: string;
    user_name: string;
    record_id: string;
}

export interface CreditLedgerEntry {
    id: string;
    tenantId: string;
    transaction_type: LedgerTransactionType;
    amount: number;
    serviceEventId?: string;
    createdAt: string;
}

export enum LedgerTransactionType {
    PURCHASE = 'PURCHASE',
    CONSUMPTION = 'CONSUMPTION',
    REFUND = 'REFUND',
    ADJUSTMENT = 'ADJUSTMENT',
}

export enum ExpertiseTagEnum {
    OilPalm = 'Oil Palm',
    PestControl = 'Pest Control',
    Fertigation = 'Fertigation',
    SoilHealth = 'Soil Health',
    Harvesting = 'Harvesting',
    Intercropping = 'Intercropping'
}

export interface Order {
    id: string;
    farmerId: string;
    orderDate: string;
    totalAmount: number;
    status: OrderStatus;
    paymentMethod: string;
    deliveryAddress: string;
    deliveryInstructions?: string;
    syncStatus: string;
    dealerId?: string; // Optional link to a specific dealer
}

export interface OrderItem {
    id: string;
    orderId: string;
    vendorProductId: string;
    quantity: number;
    pricePerUnit: number;
}

export enum OrderStatus {
    Pending = 'Pending',
    Confirmed = 'Confirmed',
    Shipped = 'Shipped',
    Delivered = 'Delivered',
    Cancelled = 'Cancelled',
}

export interface Product {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    categoryId: string;
    isQualityVerified: boolean;
    tenantId: string;
    type?: string; // For protection products
    providerName?: string;
    premiumBasisPoints?: number;
    coverageLimit?: number;
}

export interface ProductCategory {
    id: string;
    name: string;
    iconSvg?: string;
    tenantId: string;
}

export interface Vendor {
    id: string;
    name: string;
    contactPerson: string;
    mobileNumber: string;
    address: string;
    status: VendorStatus;
    rating: number;
    tenantId: string;
    sellerType: 'VENDOR' | 'FARMER';
    farmerId?: string;
}

export interface VendorProduct {
    id: string;
    vendorId: string;
    productId: string;
    price: number;
    stockQuantity: number;
    unit: string;
}

export enum VendorStatus {
    Pending = 'Pending',
    Verified = 'Verified',
    Suspended = 'Suspended',
}

export interface TrainingModule {
    id: string;
    title: string;
    category: string;
    description: string;
    durationMinutes: number;
    moduleType: 'video' | 'article';
    content: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    sortOrder?: number;
}

export interface WithdrawalAccount {
    id: string;
    farmerId: string;
    accountType: WithdrawalAccountType;
    details: string;
    isVerified: boolean;
}

export enum WithdrawalAccountType {
    BankAccount = 'bank_account',
    UPI = 'upi',
}

export interface Event {
    id: string;
    title: string;
    description: string;
    eventDate: string;
    location: string;
    createdBy: string;
    tenantId: string;
}

export interface EventRsvp {
    id: string;
    eventId: string;
    userId: string;
}

export interface Territory {
    id: string;
    tenantId: string;
    administrativeLevel: 'DISTRICT' | 'MANDAL';
    administrativeCode: string;
}

export interface TerritoryTransferRequest {
    id: string;
    farmerId: string;
    fromTenantId: string;
    toTenantId: string;
    status: TerritoryTransferStatus;
    requestedById: string;
    createdAt: string;
}

export enum TerritoryTransferStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

export interface TerritoryDispute {
    id: string;
    requestingTenantId: string;
    contestedTenantId: string;
    administrativeCode: string;
    reason: string;
    status: TerritoryDisputeStatus;
}

export enum TerritoryDisputeStatus {
    Open = 'Open',
    Resolved = 'Resolved',
    Closed = 'Closed',
}

export interface FarmerDealerConsent {
    id: string;
    farmerId: string;
    tenantId: string;
    isActive: boolean;
    permissionsJson: string;
    grantedBy: 'FARMER' | 'OFFICER';
}

export interface ForumPost {
    id: string;
    title: string;
    content: string;
    author_id: string;
    created_at: string;
    answer_count: number;
    author?: Profile;
    tenant_id: string;
}

export interface ForumAnswer {
    id: string;
    post_id: string;
    content: string;
    author_id: string;
    created_at: string;
    vote_count: number;
    author?: Profile;
}

export interface Profile {
    id: string;
    name: string;
    avatar: string;
}

export interface ForumContentFlag {
    id: string;
    content_id: string;
    content_type: 'post' | 'answer';
    reason: string;
    notes?: string;
    flagged_by_id: string;
    status: string;
}

export interface AgronomicAlert {
    id: string;
    farmerId: string;
    plotId?: string;
    alertType: AlertType;
    severity: 'High' | 'Medium' | 'Low';
    message: string;
    recommendation: string;
    is_read: boolean;
    createdAt: string;
    tenantId: string;
}

export interface AgronomicRecommendation {
    id: string;
    farmerId: string;
    triggerSource: string; // e.g., 'heuristic_engine_v1'
    actionType: 'MAINTENANCE' | 'INPUT_PURCHASE' | 'HARVEST' | 'GENERAL';
    title: string;
    description: string;
    reasoning: string; // The "Why"
    priority: 'High' | 'Medium' | 'Low';
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
    createdAt: string;
    tenantId: string;
}

export enum AlertType {
    PestAlert = 'Pest Alert',
    DiseaseAlert = 'Disease Alert',
    NutrientDeficiency = 'Nutrient Deficiency',
    IrrigationAlert = 'Irrigation Alert',
    WeatherAlert = 'Weather Alert',
    YieldForecast = 'Yield Forecast',
}

export interface Wallet {
    id: string;
    farmerId: string;
    balance: number;
    updatedAt: string;
}

export interface WalletTransaction {
    id: string;
    walletId: string;
    transactionType: 'credit' | 'debit';
    amount: number;
    source: EntrySource;
    description: string;
    status: TransactionStatus;
    metadataJson?: string;
    createdAt: string;
}

export enum EntrySource {
    Subsidy = 'Subsidy',
    Marketplace = 'Marketplace',
    P2PTransferIn = 'P2P_IN',
    P2PTransferOut = 'P2P_OUT',
    Withdrawal = 'Withdrawal',
    Harvest = 'Harvest',
    Other = 'Other',
}

export enum TransactionStatus {
    Pending = 'Pending',
    Completed = 'Completed',
    Failed = 'Failed',
}

export interface VisitRequest {
    id: string;
    farmerId: string;
    reason: string;
    preferredDate: string;
    status: VisitRequestStatus;
    assigneeId?: string;
    scheduledDate?: string;
    resolutionNotes?: string;
    notes?: string;
    priorityScore: number;
    createdAt: string;
}

export enum VisitRequestStatus {
    Pending = 'Pending',
    Scheduled = 'Scheduled',
    Completed = 'Completed',
    Cancelled = 'Cancelled',
}

export interface Directive {
    id: string;
    createdByGovUserId: string;
    administrativeCode: string;
    taskType: DirectiveTaskType;
    priority: string;
    detailsJson: string;
    isMandatory: boolean;
    dueDate?: string;
    status: string;
    createdAt: string;
}

export enum DirectiveTaskType {
    PestScouting = 'Pest Scouting',
    SubsidyVerification = 'Subsidy Verification',
    FarmerTraining = 'Farmer Training',
    DataCollection = 'Data Collection',
}

export enum DirectiveStatus {
    Open = 'Open',
    Completed = 'Completed',
    Cancelled = 'Cancelled',
}

export interface DirectiveAssignment {
    id: string;
    directiveId: string;
    tenantId: string;
    status: string; // Pending, Claimed, Completed
    claimedAt?: string;
    completedAt?: string;
    completionDetailsJson?: string;
}

export interface Crop {
    id: string;
    name: string;
    is_perennial: boolean;
    default_unit: string;
    verification_status: CropVerificationStatus;
    tenant_id: string;
}

export enum CropVerificationStatus {
    Pending = 'Pending',
    Verified = 'Verified',
    Rejected = 'Rejected',
}

export interface CropAssignment {
    id: string;
    farmPlotId: string;
    cropId: string;
    season: Season;
    year: number;
    isPrimaryCrop: boolean;
}

export enum Season {
    Kharif = 'Kharif',
    Rabi = 'Rabi',
    Zaid = 'Zaid',
    Perennial = 'Perennial',
}

export interface HarvestLog {
    id: string;
    cropAssignmentId: string;
    harvestDate: string;
    quantity: number;
    unit: string;
    notes?: string;
    createdBy: string;
}

export interface DataSharingConsent {
    id: string;
    farmerId: string;
    partnerTenantId: string;
    dataTypesJson: string; // Array of DataSharingDataType
    isActive: boolean;
    grantedAt: string;
    expiresAt?: string;
}

export enum DataSharingDataType {
    PERSONAL_INFO = 'PERSONAL_INFO',
    FINANCIALS = 'FINANCIALS',
    CROP_DATA = 'CROP_DATA',
}

export interface FreeTierUsage {
    id: string;
    tenantId: string;
    serviceName: string;
    period: string; // YYYY-MM
    usageCount: number;
}

export interface ServiceConsumptionLog {
    id: string;
    tenantId: string;
    serviceName: string;
    creditCost: number;
    metadataJson: string;
    createdAt: string;
}

export interface ServicePoint {
    id: string;
    name: string;
    location: string;
    serviceType: 'COLLECTION_CENTER' | 'MILL' | 'NURSERY';
    tenantId: string;
}

export interface OfficerSchedule {
    id: string;
    userId: string;
    date: string;
    availabilityJson: string; // Array of time slots
}

export interface CollectionAppointment {
    id: string;
    farmerId: string;
    servicePointId: string;
    startTime: string; // ISO
    endTime: string; // ISO
    status: 'scheduled' | 'completed' | 'cancelled';
}

export interface ProcessingBatch {
    id: string;
    batchCode: string;
    harvestId: string;
    startDate: string;
    status: ProcessingStatus;
    notes?: string;
    tenantId: string;
}

export enum ProcessingStatus {
    Pending = 'Pending',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Cancelled = 'Cancelled',
}

export interface ProcessingStep {
    id: string;
    batchId: string;
    stepName: string;
    startDate: string;
    endDate?: string;
    operatorId: string;
    equipmentId?: string;
    parametersJson?: string;
}

export interface ProtectionProduct {
    id: string;
    name: string;
    type: ProtectionType;
    providerName: string;
    premiumBasisPoints: number; // e.g., 200 = 2%
    coverageLimit?: number;
    termsUrl?: string;
    tenantId: string; // The insurer tenant
}

export enum ProtectionType {
    Life = 'LIFE',
    Health = 'HEALTH',
    CropInsurance = 'CROP_INSURANCE',
    AssetProtection = 'ASSET_PROTECTION',
}

export interface ProtectionSubscription {
    id: string;
    farmerId: string;
    productId: string;
    startDate: string;
    endDate: string;
    coverageAmount: number;
    premiumPaid: number;
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}

export interface ProtectionClaim {
    id: string;
    subscriptionId: string;
    incidentDate?: string;
    triggerType: 'MANUAL_REPORT' | 'PARAMETRIC_TRIGGER';
    status: ClaimStatus;
    payoutAmount?: number;
    notes?: string;
    createdAt: string;
}

export enum ClaimStatus {
    ANALYZING = 'ANALYZING',
    VERIFYING = 'VERIFYING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    PAID = 'PAID',
}

export interface FamilyUnit {
    id: string;
    headFarmerId: string;
    memberCount: number;
}

export interface LegacyProfile {
    id: string;
    familyUnitId: string;
    name: string;
    relationship: string;
    educationLevel?: string;
    currentOccupation?: string;
    needsScholarship?: boolean;
}

export enum ListingType {
    Lease = 'LEASE',
    Sale = 'SALE',
}

export enum ListingStatus {
    Active = 'ACTIVE',
    PendingVerification = 'PENDING_VERIFICATION',
    Leased = 'LEASED',
    Withdrawn = 'WITHDRAWN',
}

export enum RoadAccessType {
    Highway = 'HIGHWAY',
    PavedRoad = 'PAVED_ROAD',
    DirtRoad = 'DIRT_ROAD',
    NoAccess = 'NO_ACCESS',
}

export interface LandListing {
    id: string;
    farm_plot_id: string;
    farmer_id: string;
    listing_type: ListingType;
    status: ListingStatus;
    soil_organic_carbon: number;
    water_table_depth: number;
    road_access: RoadAccessType;
    avg_yield_history: number;
    hapsara_value_score: number;
    ask_price: number;
    duration_months: number;
    available_from: string;
    description?: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
    sync_status: 'synced' | 'pending';
}

export interface LandValuationHistory {
    id: string;
    listing_id: string;
    score: number;
    calculated_at: string;
    factors_json: string;
}

export interface CustomFieldDefinition {
    id: string;
    modelName: string; // e.g., 'farmer', 'plot'
    fieldName: string;
    fieldLabel: string;
    fieldType: CustomFieldType;
    optionsJson?: string; // For dropdowns
    isRequired: boolean;
    sortOrder: number;
}

export enum CustomFieldType {
    Text = 'text',
    Number = 'number',
    Date = 'date',
    Dropdown = 'dropdown',
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    assigneeId?: string;
    farmerId?: string;
    createdBy: string;
    tenantId: string;
    source: 'INTERNAL' | 'GOVERNMENT';
    directive_assignment_id?: string;
    completion_evidence_json?: string;
}

export enum TaskStatus {
    ToDo = 'ToDo',
    InProgress = 'In Progress',
    Done = 'Done',
}

export enum TaskPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
}

export interface Resource {
    id: string;
    name: string;
    unit: string;
    description?: string;
    cost?: number;
}

export interface ResourceDistribution {
    id: string;
    farmerId: string;
    resourceId: string;
    quantity: number;
    distributionDate: string;
    notes?: string;
    createdBy: string;
}

export interface ActivityLog {
    id: string;
    farmerId: string;
    activityType: ActivityType;
    description: string;
    createdBy: string;
    createdAt: string;
}

export enum ActivityType {
    REGISTRATION = 'REGISTRATION',
    UPDATE = 'UPDATE',
    STATUS_CHANGE = 'STATUS_CHANGE',
    PAYMENT_RECORDED = 'PAYMENT_RECORDED',
    RESOURCE_DISTRIBUTED = 'RESOURCE_DISTRIBUTED',
    FARM_PLOT_CREATED = 'FARM_PLOT_CREATED',
    AGRONOMIC_INPUT_LOGGED = 'AGRONOMIC_INPUT_LOGGED',
    ASSISTANCE_STATUS_CHANGE = 'ASSISTANCE_STATUS_CHANGE',
    HARVEST_LOGGED = 'HARVEST_LOGGED',
    QUALITY_APPEAL_STATUS_CHANGED = 'QUALITY_APPEAL_STATUS_CHANGED',
    DATA_CONSENT_UPDATED = 'DATA_CONSENT_UPDATED',
    DEALER_CONSENT_REVOKED = 'DEALER_CONSENT_REVOKED',
    VISIT_REQUESTED = 'VISIT_REQUESTED',
    VISIT_COMPLETED = 'VISIT_COMPLETED',
    CROP_ASSIGNED = 'CROP_ASSIGNED',
    COLLECTION_APPOINTMENT_BOOKED = 'COLLECTION_APPOINTMENT_BOOKED',
}

export interface SubsidyPayment {
    id: string;
    farmerId: string;
    paymentDate: string;
    amount: number;
    utrNumber: string;
    paymentStage: PaymentStage;
    notes?: string;
    createdBy?: string;
}

export enum PaymentStage {
    MaintenanceYear1 = 'Maintenance (Year 1)',
    MaintenanceYear2 = 'Maintenance (Year 2)',
    MaintenanceYear3 = 'Maintenance (Year 3)',
    MaintenanceYear4 = 'Maintenance (Year 4)',
    IntercroppingYear1 = 'Intercropping (Year 1)',
    IntercroppingYear2 = 'Intercropping (Year 2)',
    IntercroppingYear3 = 'Intercropping (Year 3)',
    IntercroppingYear4 = 'Intercropping (Year 4)',
    PlantingMaterialDomestic = 'Planting Material (Domestic)',
    PlantingMaterialImported = 'Planting Material (Imported)',
    BoreWell = 'Bore Well',
    VermiCompost = 'Vermi Compost',
    Replanting = 'Replanting',
    Fertilizer = 'Fertilizer',
    Other = 'Other'
}

export interface AssistanceApplication {
    id: string;
    farmerId: string;
    schemeId: string;
    status: AssistanceApplicationStatus;
    appliedDate?: string;
}

export enum AssistanceApplicationStatus {
    NotApplied = 'Not Applied',
    Applied = 'Applied',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

export interface AssistanceScheme {
    id: string;
    category: string;
    title: string;
    description: string;
    assistance: string;
}

export interface Harvest {
    id: string;
    farmerId: string;
    harvestDate: string;
    grossWeight: number;
    tareWeight: number;
    netWeight: number;
    assessedById: string;
}

export interface QualityAssessment {
    id: string;
    harvestId: string;
    overallGrade: OverallGrade;
    priceAdjustment: number;
    notes?: string;
    appealStatus: AppealStatus;
    assessmentDate: string;
}

export enum OverallGrade {
    GradeA = 'Grade A',
    GradeB = 'Grade B',
    GradeC = 'Grade C',
    Rejected = 'Rejected',
}

export enum AppealStatus {
    None = 'None',
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

export interface QualityMetric {
    id: string;
    assessmentId: string;
    metricName: string;
    metricValue: string; // e.g., "5%", "Yes", "High"
}

export interface QualityStandard {
    id: string;
    metricName: string;
    description: string;
    measurementUnit: string; // "%", "Count", "Yes/No", "Text"
    acceptableRange?: string;
}

export interface Equipment {
    id: string;
    name: string;
    type: string;
    location: string;
    status: 'operational' | 'maintenance' | 'decommissioned';
    purchaseDate?: string;
    lastMaintenanceDate?: string;
    tenantId: string;
}

export interface EquipmentLease {
    id: string;
    equipmentId: string;
    farmerId: string;
    startDate: string;
    endDate: string;
    paymentStatus: 'Pending' | 'Paid' | 'Overdue';
}

export interface EquipmentMaintenanceLog {
    id: string;
    equipmentId: string;
    maintenanceDate: string;
    description: string;
    cost: number;
    performedById: string;
}

export interface PlantingRecord {
    id: string;
    plotId: string;
    seedSource: string;
    plantingDate: string;
    geneticVariety: string;
    numberOfPlants: number;
    careInstructionsUrl?: string;
    qrCodeData?: string;
}

export interface AgronomicInput {
    id: string;
    farm_plot_id: string;
    input_date: string;
    input_type: InputType;
    name: string;
    quantity: number;
    unit: string;
    npk_values_json?: string;
    notes?: string;
    created_by: string;
}

export enum InputType {
    Fertilizer = 'FERTILIZER',
    Pesticide = 'PESTICIDE',
    Irrigation = 'IRRIGATION',
    Labor = 'LABOR',
    Other = 'OTHER',
}

export interface ManualLedgerEntry {
    id: string;
    farmerId: string;
    date: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description?: string;
}

// --- MITRA (Dealer) Module Types ---

export interface DealerProfile {
    id: string;
    user_id: string;
    shop_name: string;
    gstin?: string;
    address: string;
    mandal: string; // For quick filtering
    district: string;
    is_verified: boolean;
    tenant_id: string;
}

export interface DealerInventorySignal {
    id: string;
    dealer_id: string;
    product_id: string;
    is_available: boolean;
    updated_at: string;
}

export interface KhataRecord {
    id: string;
    dealer_id: string;
    farmer_id: string;
    amount: number; // Positive for credit given, Negative for payment received
    transaction_type: 'CREDIT' | 'PAYMENT';
    description: string;
    transaction_date: string;
    status: 'PENDING_OTP' | 'VERIFIED' | 'DISPUTED';
    created_at: string;
}

export interface DealerFarmerConnection {
    id: string;
    dealer_id: string;
    farmer_id: string;
    status: 'CONNECTED' | 'BLOCKED';
    last_transaction_date: string;
}
