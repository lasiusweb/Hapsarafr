
export interface Dealer {
    id: string;
    userId: string;
    shopName: string;
    gstin?: string;
    address: string;
    mandal: string;
    district: string;
    isVerified: boolean;
    tenantId: string;
    creditLimit?: number; // New field for credit risk management
}

export interface DealerInventorySignal {
    id: string;
    dealerId: string;
    productId: string;
    isAvailable: boolean;
    stockQuantity: number;
    reorderLevel: number;
    updatedAt: string;
}

// ... rest of the file remains unchanged, only updating Dealer interface
export interface District {
    code: string;
    name: string;
    mandals: Mandal[];
}

export interface Mandal {
    code: string;
    name: string;
    districtId?: string;
    villages: Village[];
}

export interface Village {
    code: string;
    name: string;
    mandalId?: string;
}

export interface User {
    id: string;
    name: string;
    email?: string;
    groupId: string;
    tenantId: string;
    avatar?: string;
    is_verified?: boolean;
}

export interface Tenant {
    id: string;
    name: string;
    credit_balance: number;
    subscriptionStatus: string;
    maxFarmers?: number;
    createdAt: number;
    // New SaaS fields
    featuresJson?: string;
    tier?: string;
}

export interface Group {
    id: string;
    name: string;
    permissions: Permission[];
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
}

export enum FarmerStatus {
    Registered = 'Registered',
    Sanctioned = 'Sanctioned',
    Planted = 'Planted',
    PaymentDone = 'PaymentDone'
}

export enum PlantationMethod {
    Square = 'Square',
    Triangle = 'Triangle'
}

export enum PlantType {
    Imported = 'Imported',
    Indigenous = 'Indigenous'
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
    methodOfPlantation?: string;
    plantType?: string;
    plantationDate: string;
    status: string;
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
    primary_crop?: string;
    mlrdPlants?: number;
    fullCostPlants?: number;
    asoId?: string;
    trustScore?: number; // 0-100 Data Fidelity Score
    identity_hash?: string; // For Federated Identity Deduplication
}

export interface FarmPlot {
    id: string;
    farmerId: string;
    name: string;
    acreage: number;
    number_of_plants?: number;
    plantation_date?: string;
    soil_type?: string;
    method_of_plantation?: string;
    plant_type?: string;
    geojson?: string;
    is_replanting?: boolean;
    tenantId: string;
    syncStatus?: string;
    createdAt?: number;
    updatedAt?: number;
}

export enum SoilType {
    Sandy = 'Sandy',
    Clay = 'Clay',
    Loamy = 'Loamy'
}

export interface SubsidyPayment {
    id: string;
    farmerId: string;
    paymentDate: string;
    amount: number;
    utrNumber: string;
    paymentStage: PaymentStage;
    notes?: string;
    syncStatus?: string;
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
    Other = 'Other',
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
    landing_hero_title?: string;
    landing_hero_subtitle?: string;
    landing_about_us?: string;
    privacy_policy?: string;
    faqs?: FAQItem[];
}

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export interface ActivityLog {
    id: string;
    farmerId: string;
    activityType: string;
    description: string;
    createdBy: string;
    tenantId: string;
    createdAt: number;
}

export enum ActivityType {
    PAYMENT_RECORDED = 'PAYMENT_RECORDED',
    STATUS_CHANGE = 'STATUS_CHANGE',
    FARM_PLOT_CREATED = 'FARM_PLOT_CREATED',
    AGRONOMIC_INPUT_LOGGED = 'AGRONOMIC_INPUT_LOGGED',
    HARVEST_LOGGED = 'HARVEST_LOGGED',
    VISIT_REQUESTED = 'VISIT_REQUESTED',
    VISIT_COMPLETED = 'VISIT_COMPLETED',
    ASSISTANCE_STATUS_CHANGE = 'ASSISTANCE_STATUS_CHANGE',
    QUALITY_APPEAL_STATUS_CHANGED = 'QUALITY_APPEAL_STATUS_CHANGED',
    DATA_CONSENT_UPDATED = 'DATA_CONSENT_UPDATED',
    DEALER_CONSENT_REVOKED = 'DEALER_CONSENT_REVOKED',
    COLLECTION_APPOINTMENT_BOOKED = 'COLLECTION_APPOINTMENT_BOOKED',
    CROP_ASSIGNED = 'CROP_ASSIGNED',
    SEED_REGISTERED = 'SEED_REGISTERED',
    RECOMMENDATION_ACTION = 'RECOMMENDATION_ACTION',
    SUSTAINABILITY_ACTION_LOGGED = 'SUSTAINABILITY_ACTION_LOGGED',
    SENSOR_DATA_LOGGED = 'SENSOR_DATA_LOGGED'
}

export enum BillableEvent {
    CROP_HEALTH_SCAN_COMPLETED = 'CROP_HEALTH_SCAN_COMPLETED',
    APPOINTMENT_BOOKED = 'APPOINTMENT_BOOKED',
    TRANSACTION_PROCESSED = 'TRANSACTION_PROCESSED'
}

export interface Wallet {
    id: string;
    farmerId?: string;
    vendorId?: string; // New: Vendor Wallet Support
    balance: number;
    updatedAt: number;
}

export interface CreditLedgerEntry {
    id: string;
    tenantId?: string; // Can be null if paid by Vendor
    vendorId?: string; // New: Vendor Wallet
    transactionType: string;
    amount: number;
    serviceEventId?: string;
    createdAt: number;
    _raw?: any;
}

export enum LedgerTransactionType {
    PURCHASE = 'PURCHASE',
    CONSUMPTION = 'CONSUMPTION',
    REFUND = 'REFUND',
    ADJUSTMENT = 'ADJUSTMENT'
}

export interface AuditLogEntry {
    id: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    created_at: string;
    user_name?: string;
    record_id?: string;
}

export enum WithdrawalAccountType {
    BankAccount = 'bank_account',
    UPI = 'upi'
}

export interface WithdrawalAccount {
    id: string;
    farmerId: string;
    accountType: WithdrawalAccountType;
    details: string;
    isVerified: boolean;
}

export enum ExpertiseTagEnum {
    Agronomy = 'Agronomy',
    PestControl = 'Pest Control',
    Irrigation = 'Irrigation',
    Finance = 'Finance',
    Marketing = 'Marketing'
}

export interface Profile {
    id: string;
    name: string;
    avatar?: string;
}

export interface ForumPost {
    id: string;
    title: string;
    content: string;
    author_id: string;
    tenant_id: string;
    created_at: string;
    answer_count: number;
    author?: Profile;
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

export interface ForumContentFlag {
    id: string;
    content_id: string;
    content_type: 'post' | 'answer';
    reason: string;
    notes?: string;
    flagged_by_id: string;
    status: 'pending' | 'resolved' | 'dismissed';
}

export interface Resource {
    id: string;
    name: string;
    unit: string;
    description?: string;
    cost?: number;
    tenantId: string;
}

export interface ResourceDistribution {
    id: string;
    farmerId: string;
    resourceId: string;
    quantity: number;
    distributionDate: string;
    notes?: string;
    createdBy: string;
    tenantId: string;
    syncStatus?: string;
}

export interface CustomFieldDefinition {
    id: string;
    modelName: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    optionsJson?: string;
    isRequired: boolean;
    sortOrder: number;
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown';

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
    source?: string;
    directiveAssignmentId?: string;
    completion_evidence_json?: string;
}

export enum TaskStatus {
    ToDo = 'ToDo',
    InProgress = 'InProgress',
    Done = 'Done'
}

export enum TaskPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High'
}

export interface Harvest {
    id: string;
    farmerId: string;
    harvestDate: string;
    grossWeight: number;
    tareWeight: number;
    netWeight: number;
    assessedById: string;
    tenantId: string;
}

export interface QualityAssessment {
    id: string;
    harvestId: string;
    overallGrade: string;
    priceAdjustment: number;
    notes?: string;
    appealStatus: AppealStatus;
    assessmentDate: string;
}

export enum AppealStatus {
    None = 'None',
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected'
}

export enum OverallGrade {
    GradeA = 'Grade A',
    GradeB = 'Grade B',
    GradeC = 'Grade C',
    Rejected = 'Rejected'
}

export interface QualityMetric {
    id: string;
    assessmentId: string;
    metricName: string;
    metricValue: string;
}

export interface QualityStandard {
    id: string;
    metricName: string;
    description?: string;
    measurementUnit: string;
}

export interface ProcessingBatch {
    id: string;
    batchCode: string;
    harvestId: string;
    startDate: string;
    status: string;
    notes?: string;
    tenantId: string;
}

export enum ProcessingStatus {
    Pending = 'Pending',
    InProgress = 'InProgress',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
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
    tenantId: string;
}

export interface Equipment {
    id: string;
    name: string;
    type: string;
    location: string;
    status: string;
    lastMaintenanceDate?: string;
    tenantId: string;
}

export interface EquipmentMaintenanceLog {
    id: string;
    equipmentId: string;
    maintenanceDate: string;
    description: string;
    cost: number;
    performedById: string;
}

export interface EquipmentLease {
    id: string;
    equipmentId: string;
    farmerId: string;
    startDate: string;
    endDate: string;
    paymentStatus: string;
}

export interface ManualLedgerEntry {
    id: string;
    farmerId: string;
    date: string;
    type: string;
    category: string;
    amount: number;
    description?: string;
}

export enum EntrySource {
    Subsidy = 'Subsidy',
    Harvest = 'Harvest',
    P2PTransferOut = 'P2PTransferOut',
    P2PTransferIn = 'P2PTransferIn',
    Withdrawal = 'Withdrawal',
    Marketplace = 'Marketplace'
}

export enum TransactionStatus {
    Pending = 'Pending',
    Completed = 'Completed',
    Failed = 'Failed'
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
    input_type: string;
    name: string;
    quantity: number;
    unit: string;
    npk_values_json?: string;
    notes?: string;
    created_by: string;
    tenant_id: string;
}

export enum InputType {
    Fertilizer = 'FERTILIZER',
    Pesticide = 'PESTICIDE',
    Irrigation = 'IRRIGATION',
    Other = 'OTHER',
    // Add new types for flexibility
    Seeds = 'SEEDS',
    Labor = 'LABOR'
}

export interface AssistanceScheme {
    id: string;
    category: string;
    title: string;
    description: string;
    assistance: string;
}

export enum AssistanceApplicationStatus {
    NotApplied = 'Not Applied',
    Applied = 'Applied',
    Approved = 'Approved',
    Rejected = 'Rejected'
}

export interface TrainingModule {
    id: string;
    title: string;
    category: string;
    description: string;
    durationMinutes: number;
    moduleType: string;
    content: string;
    difficulty: string;
    sortOrder?: number;
}

export interface TrainingCompletion {
    id: string;
    userId: string;
    moduleId: string;
    completedAt: number;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    eventDate: string;
    location: string;
    createdBy: string;
    tenantId: string;
    createdAt: number;
}

export interface EventRsvp {
    id: string;
    eventId: string;
    userId: string;
}

export interface Territory {
    id: string;
    tenantId: string;
    administrativeLevel: string;
    administrativeCode: string;
    serviceType?: string; // Hapsara Aegis Update
}

export interface TerritoryTransferRequest {
    id: string;
    farmerId: string;
    fromTenantId: string;
    toTenantId: string;
    status: string;
    requestedById: string;
    createdAt: number;
}

export enum TerritoryTransferStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected'
}

export interface TerritoryDispute {
    id: string;
    requestingTenantId: string;
    contestedTenantId: string;
    administrativeCode: string;
    reason: string;
    status: string;
}

export enum TerritoryDisputeStatus {
    Open = 'Open',
    Resolved = 'Resolved',
    Closed = 'Closed'
}

export interface FarmerDealerConsent {
    id: string;
    farmerId: string;
    tenantId: string;
    isActive: boolean;
    permissionsJson: string;
    grantedBy: string;
    consentExpiry?: string; // Hapsara Aegis Update
}

export enum DataSharingDataType {
    PERSONAL_INFO = 'PERSONAL_INFO',
    FINANCIALS = 'FINANCIALS',
    CROP_DATA = 'CROP_DATA'
}

export interface VisitRequest {
    id: string;
    farmerId: string;
    reason: string;
    preferredDate: string;
    status: string;
    assigneeId?: string;
    scheduledDate?: string;
    resolutionNotes?: string;
    notes?: string;
    priorityScore: number;
    createdBy: string;
    tenantId: string;
    createdAt: number;
}

export enum VisitRequestStatus {
    Pending = 'Pending',
    Scheduled = 'Scheduled',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export interface Directive {
    id: string;
    createdByGovUserId: string;
    administrativeCode: string;
    taskType: string;
    priority: string;
    detailsJson: string;
    isMandatory: boolean;
    dueDate?: string;
    status: string;
    createdAt: Date;
}

export enum DirectiveStatus {
    Open = 'Open',
    Completed = 'Completed'
}

export enum DirectiveTaskType {
    PestScouting = 'Pest Scouting',
    Survey = 'Survey',
    Distribution = 'Distribution'
}

export interface DirectiveAssignment {
    id: string;
    directiveId: string;
    tenantId: string;
    status: string;
    claimedAt?: string;
    completedAt?: string;
    completionDetailsJson?: string;
}

export interface ProductCategory {
    id: string;
    name: string;
    iconSvg?: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    categoryId: string;
    isQualityVerified: boolean;
    tenantId: string;
    type: string;
    providerName?: string;
    premiumBasisPoints?: number;
    coverageLimit?: number;
}

export interface Vendor {
    id: string;
    name: string;
    contactPerson: string;
    mobileNumber: string;
    address: string;
    status: VendorStatus;
    rating: number;
    tenantId?: string; // Optional now, as vendors can be independent
    sellerType: string;
    farmerId?: string;
    documentsJson?: string;
    // Add these
    mandal?: string;
    district?: string;
}

export interface VendorAssociation {
    id: string;
    vendorId: string;
    tenantId: string;
    status: 'Active' | 'Pending' | 'Inactive';
    createdAt: number;
}

export enum VendorStatus {
    Pending = 'Pending',
    Verified = 'Verified',
    Suspended = 'Suspended'
}

export interface VendorProduct {
    id: string;
    vendorId: string;
    productId: string;
    price: number;
    stockQuantity: number;
    unit: string;
}

export interface Order {
    id: string;
    farmerId: string;
    orderDate: string;
    totalAmount: number;
    status: string;
    paymentMethod: string;
    deliveryAddress: string;
    deliveryInstructions?: string;
    dealerId?: string;
}

export enum OrderStatus {
    Pending = 'Pending',
    Confirmed = 'Confirmed',
    Shipped = 'Shipped',
    Delivered = 'Delivered',
    Cancelled = 'Cancelled'
}

export interface OrderItem {
    id: string;
    orderId: string;
    vendorProductId: string;
    quantity: number;
    pricePerUnit: number;
}

// --- Hapsara Agros: Multi-Crop System Types ---

export interface Crop {
    id: string;
    name: string;
    isPerennial: boolean;
    defaultUnit: string;
    verificationStatus: string;
    tenantId: string;
}

export enum CropVerificationStatus {
    Verified = 'Verified',
    Pending = 'Pending'
}

export interface CropAssignment {
    id: string;
    farmPlotId: string;
    cropId: string;
    season: string;
    year: number;
    isPrimaryCrop: boolean;
}

export enum Season {
    Kharif = 'Kharif',
    Rabi = 'Rabi',
    Zaid = 'Zaid'
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

// --- End Hapsara Agros Types ---

export interface DataSharingConsent {
    id: string;
    farmerId: string;
    partnerTenantId: string;
    dataTypesJson: string;
    isActive: boolean;
    grantedAt: string;
    expiresAt?: string;
}

export interface ServiceConsumptionLog {
    id: string;
    tenantId: string;
    serviceName: string;
    creditCost: number;
    metadataJson?: string;
    createdAt: number;
}

export interface FreeTierUsage {
    id: string;
    tenantId: string;
    serviceName: string;
    period: string;
    usageCount: number;
}

export interface ServicePoint {
    id: string;
    name: string;
    location: string;
    serviceType: string;
    capacityPerSlot?: number;
    isActive?: boolean;
    tenantId: string;
}

export interface OfficerSchedule {
    id: string;
    userId: string;
    date: string;
    availabilityJson: string;
}

export interface CollectionAppointment {
    id: string;
    farmerId: string;
    servicePointId: string;
    startTime: string;
    endTime: string;
    status: string;
}

export interface ProtectionProduct {
    id: string;
    name: string;
    type: string;
    providerName: string;
    premiumBasisPoints: number;
    coverageLimit?: number;
    termsUrl?: string;
    tenantId: string;
}

export interface ProtectionSubscription {
    id: string;
    farmerId: string;
    productId: string;
    startDate: string;
    endDate: string;
    coverageAmount: number;
    premiumPaid: number;
    status: string;
}

export interface ProtectionClaim {
    id: string;
    subscriptionId: string;
    incidentDate?: string;
    triggerType: string;
    status: string;
    payoutAmount?: number;
    notes?: string;
    createdAt: number;
}

export enum ClaimStatus {
    PAID = 'PAID',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    VERIFYING = 'VERIFYING',
    ANALYZING = 'ANALYZING'
}

export enum ProtectionType {
    CropInsurance = 'CropInsurance',
    HealthInsurance = 'HealthInsurance',
    LifeInsurance = 'LifeInsurance'
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

export enum RoadAccessType {
    Highway = 'HIGHWAY',
    PavedRoad = 'PAVED_ROAD',
    DirtRoad = 'DIRT_ROAD',
    NoAccess = 'NO_ACCESS'
}

export interface LandListing {
    id: string;
    farmPlotId: string;
    farmerId: string;
    listingType: string;
    status: string;
    soilOrganicCarbon: number;
    waterTableDepth: number;
    roadAccess: RoadAccessType;
    avgYieldHistory: number;
    hapsaraValueScore: number;
    askPrice: number;
    durationMonths: number;
    availableFrom: string;
    description?: string;
    tenantId: string;
    createdAt: number;
    updatedAt: number;
}

export interface LandValuationHistory {
    id: string;
    listingId: string;
    score: number;
    calculatedAt: number;
    factorsJson: string;
}

export enum ListingType {
    Lease = 'LEASE',
    Sale = 'SALE'
}

export enum ListingStatus {
    Active = 'ACTIVE',
    BidAccepted = 'BID_ACCEPTED',
    Sold = 'SOLD',
    Expired = 'EXPIRED',
    Withdrawn = 'WITHDRAWN'
}

// Enhanced Khata Types for Hapsara Khata v2.0
export enum KhataTransactionType {
    CREDIT_GIVEN = 'CREDIT_GIVEN',
    PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
    INTEREST_CHARGED = 'INTEREST_CHARGED',
    DISCOUNT_GIVEN = 'DISCOUNT_GIVEN'
}

export interface KhataRecord {
    id: string;
    dealerId: string;
    farmerId: string;
    amount: number;
    transactionType: KhataTransactionType | string; // string fallback for legacy
    description: string;
    transactionDate: string;
    dueDate?: string; // New for aging analysis
    proofImageUrl?: string; // New for evidence
    status: string; // 'PENDING' | 'SYNCED' | 'DISPUTED'
    createdAt: number;
    syncStatusLocal?: string;
}

export interface DealerFarmerConnection {
    id: string;
    dealerId: string;
    farmerId: string;
    status: string;
    lastTransactionDate: string;
}

// Expanded for Hapsara Scientia
export interface AgronomicRecommendation {
    id: string;
    farmerId: string;
    triggerSource: string;
    type: 'URGENT_INTERVENTION' | 'YIELD_OPPORTUNITY' | 'MARKET_TIMING' | 'MAINTENANCE' | 'INPUT_PURCHASE' | 'GENERAL';
    actionType: string; // Deprecated in favor of type, keep for compat if needed or map it
    title: string;
    description: string;
    reasoning: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED'; // Added Feedback status
    createdAt: string;
    tenantId: string;
    // New rich fields
    actionJson?: string; // JSON string: { label: string, intent: string, payload: any }
    impactJson?: string; // JSON string: { metric: string, change: string, confidence: number }
    socialProofJson?: string; // JSON string: { text: string, stats: any }
    // Added for contextual awareness
    isFinanciallyFeasible?: boolean;
    inventoryStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    alternativeProductId?: string;
    // Hapsara Scientia Fields
    confidenceScore?: number; // 0-100, calculated based on data completeness
    scientificSource?: string; // e.g., "IIOPR Guidelines 2024", "ICAR Research"
    expertReviewStatus?: 'NOT_REQUIRED' | 'PENDING_REVIEW' | 'APPROVED' | 'MODIFIED';
}

export interface DealerInsights {
    id: string;
    dealerId: string;
    metricKey: string;
    metricValue: number;
    generatedAt: number;
}

export interface MarketTrends {
    id: string;
    regionCode: string;
    trendType: string;
    payloadJson: string;
    validUntil: number;
}

export interface ClimateRiskCache {
    id: string;
    regionCode: string;
    date: string;
    temperatureMax: number;
    rainfallMm: number;
    ndviIndex?: number;
    riskScore: number;
    metadataJson?: string;
    createdAt: number;
}

export interface SustainabilityAction {
    id: string;
    farmerId: string;
    actionType: string; // 'Mulching', 'CoverCropping', 'DripIrrigation', 'OrganicInput', 'BioControl'
    description: string;
    status: 'Pending' | 'Verified' | 'Rejected';
    verificationPhotoUrl?: string;
    geoCoords?: string;
    submittedAt: number;
    verifiedAt?: number;
    verifiedBy?: string;
    creditValue?: number; // Estimated Carbon Credit Value
    tenantId: string;
}

export interface SustainabilityCredential {
    id: string;
    farmerId: string;
    grade: string; // 'Gold', 'Silver', 'Bronze' based on actions
    type: 'CARBON_CREDIT' | 'WATER_STEWARD' | 'BIODIVERSITY_GUARDIAN';
    issuedAt: number;
    validUntil: number;
    hash: string;
    metadataJson?: string;
    tenantId: string;
}

export interface SensorReading {
    id: string;
    farmPlotId: string;
    sensorType: 'SOIL_MOISTURE' | 'WATER_FLOW' | 'TEMPERATURE' | 'HUMIDITY';
    value: number;
    unit: string;
    recordedAt: string;
    source: 'IOT_DEVICE' | 'MANUAL_ENTRY';
    deviceId?: string;
    tenantId: string;
}

export interface DealerProfile {
    id: string;
    userId: string;
    shopName: string;
    address: string;
    district: string;
    mandal: string;
}

// --- Hapsara Genetica (Seed System) Types ---

export enum ConsentLevel {
    Red = 'RED',       // Private
    Yellow = 'YELLOW', // Community Share
    Green = 'GREEN'    // Global/Research
}

export enum SeedType {
    Traditional = 'TRADITIONAL',
    OpenSource = 'OPEN_SOURCE',
    CommercialPatented = 'COMMERCIAL_PATENTED',
    CommercialHybrid = 'COMMERCIAL_HYBRID'
}

export interface SeedVariety {
    id: string;
    name: string;
    scientificName?: string;
    seedType: SeedType;
    breederId?: string; // If commercial
    daysToMaturity: number;
    isSeedSavingAllowed: boolean;
    waterRequirement: 'Low' | 'Medium' | 'High';
    potentialYield: number; // tons/acre
    description: string;
    imageUrl?: string;
    tenantId?: string; // If private to a tenant
    // Genetica fields
    consentLevel: ConsentLevel;
    ownerFarmerId?: string;
    originVillage?: string;
    oralHistoryUrl?: string; // Audio URL
    passportHash?: string;
}

export interface GeneticLineage {
    id: string;
    childSeedId: string;
    parentSeedId: string;
    relationshipType: 'POLLINATOR' | 'MOTHER' | 'SELECTION' | 'MUTATION';
    confidenceScore: number;
}

export interface BenefitAgreement {
    id: string;
    seedVarietyId: string;
    researcherOrgName: string;
    communityId: string; // Village code
    termsHash: string;
    status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
    agreedAt: string;
}

export interface SeedPerformanceLog {
    id: string;
    seedVarietyId: string;
    farmPlotId: string;
    farmerId: string;
    season: string;
    year: number;
    yieldPerAcre: number;
    diseaseResistanceScore: number; // 1-10
    droughtSurvivalScore: number; // 1-10
    notes?: string;
    createdAt: string;
    tenantId: string;
}

export interface ResearchPartnership {
    id: string;
    institutionName: string;
    projectTitle: string;
    description: string;
    benefitSharingTerms: string; // Text description of what farmers get
    status: 'Active' | 'Pending' | 'Closed';
    dataAccessExpiry: string;
}

// --- Hapsara Commoditex Types ---

export interface MarketPrice {
    id: string;
    regionCode: string;
    commodity: string;
    date: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    source: string;
}

export interface CommodityListing {
    id: string;
    farmerId: string;
    cropName: string;
    variety?: string;
    quantity: number;
    unit: string;
    qualityGrade?: string;
    harvestDate?: string;
    askPrice: number;
    minAcceptablePrice?: number;
    status: ListingStatus;
    farmPlotId?: string;
    tenantId: string;
    createdAt: string;
}

export interface CommodityBid {
    id: string;
    listingId: string;
    buyerId: string;
    offerPrice: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    isBinding: boolean;
}

export enum OfferStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    WITHDRAWN = 'WITHDRAWN'
}

export interface CommodityOffer {
    id: string;
    listingId: string;
    buyerName: string; // External or internal name
    buyerContact: string;
    offerPrice: number; // Per unit
    status: OfferStatus;
    createdAt: number;
}

// --- Lead Generation ---

export interface Lead {
    id: string;
    farmerId: string;
    vendorId: string;
    serviceCategory: string; // 'Equipment', 'Insurance', 'Credit'
    status: 'Pending' | 'Contacted' | 'Converted' | 'Closed';
    notes?: string;
    createdAt: number;
    tenantId: string;
}

// --- Partnership Ecosystem Types ---

export interface Partner {
    id: string;
    name: string;
    category: string;
    trustScore: number;
    status: 'Sandbox' | 'Active' | 'Suspended';
    kybStatus: 'Pending' | 'Verified' | 'Rejected';
    logoUrl?: string;
    website?: string;
    createdAt: number;
}

export interface PartnerOffering {
    id: string;
    partnerId: string;
    title: string;
    description: string;
    targetCropsJson?: string;
    targetSoilTypesJson?: string;
    regionCodesJson?: string;
    affiliateFeePercent: number;
    actionLabel: string;
}

export interface FarmerPartnerConsent {
    id: string;
    farmerId: string;
    partnerId: string;
    scopesJson: string;
    grantedAt: number;
    expiresAt: number;
    status: 'Active' | 'Revoked';
    tenantId: string;
}

export interface PartnerInteraction {
    id: string;
    farmerId: string;
    partnerId: string;
    offeringId?: string;
    interactionType: 'VIEW' | 'CONNECT' | 'CONVERT';
    timestamp: number;
    tenantId: string;
}
export interface TenantPartnerConfig {
    id: string;
    tenantId: string;
    revenueShareEnabled: boolean;
    blockedCategoriesJson?: string; // JSON array of blocked partner categories
    blockedPartnerIdsJson?: string; // JSON array of blocked partner IDs
    syncStatus?: string;
}
