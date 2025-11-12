// This file was regenerated to define all application types.

// --- Enums ---

export enum FarmerStatus {
    Registered = 'Registered',
    Sanctioned = 'Sanctioned',
    Planted = 'Planted',
    PaymentDone = 'Payment - Done',
}

export enum PlantationMethod {
    Square = 'Square',
    Triangle = 'Triangle',
}

export enum PlantType {
    Imported = 'Imported',
    Domestic = 'Domestic',
}

export enum SoilType {
    Loamy = 'Loamy',
    Sandy = 'Sandy',
    Clay = 'Clay',
    RedSoil = 'Red Soil',
    BlackSoil = 'Black Soil',
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

export enum ActivityType {
    REGISTRATION = 'REGISTRATION',
    STATUS_CHANGE = 'STATUS_CHANGE',
    PAYMENT_RECORDED = 'PAYMENT_RECORDED',
    RESOURCE_DISTRIBUTED = 'RESOURCE_DISTRIBUTED',
    PLANTATION_UPDATE = 'PLANTATION_UPDATE',
    ASSISTANCE_STATUS_CHANGE = 'ASSISTANCE_STATUS_CHANGE',
    VOICE_NOTE = 'VOICE_NOTE',
    HARVEST_RECORDED = 'HARVEST_RECORDED',
    QUALITY_APPEAL_STATUS_CHANGED = 'QUALITY_APPEAL_STATUS_CHANGED',
    TRAINING_ATTENDED = 'TRAINING_ATTENDED',
    TERRITORY_TRANSFER = 'TERRITORY_TRANSFER',
    DEALER_CONSENT_GRANTED = 'DEALER_CONSENT_GRANTED',
    DEALER_CONSENT_REVOKED = 'DEALER_CONSENT_REVOKED',
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
    VermiCompost = 'Vermi Compost Unit',
    Replanting = 'Replanting Old Gardens',
    Fertilizer = 'Fertilizer',
    Other = 'Other',
}

export enum CustomFieldType {
    Text = 'text',
    Number = 'number',
    Date = 'date',
    Dropdown = 'dropdown',
}

export enum TaskStatus {
    ToDo = 'To Do',
    InProgress = 'In Progress',
    Done = 'Done',
}

export enum TaskPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
}

export enum OverallGrade {
    GradeA = 'Grade A',
    GradeB = 'Grade B',
    GradeC = 'Grade C',
    Reject = 'Reject',
}

export enum AppealStatus {
    None = 'None',
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

export enum ProcessingStatus {
    Pending = 'Pending',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Cancelled = 'Cancelled',
}

export enum EntrySource {
    Subsidy = 'Subsidy',
    MarketplaceSale = 'Marketplace Sale',
    ManualCredit = 'Manual Credit',
    ManualDebit = 'Manual Debit',
}

export enum WithdrawalAccountType {
    BankAccount = 'bank_account',
    UPI = 'upi',
}

export enum ExpertiseTagEnum {
    SoilHealth = 'Soil Health',
    PestManagement = 'Pest Management',
    Irrigation = 'Irrigation',
    SubsidySchemes = 'Subsidy Schemes',
    HarvestingTechniques = 'Harvesting Techniques',
    MarketLinkage = 'Market Linkage',
}

export enum AssistanceApplicationStatus {
    NotApplied = 'Not Applied',
    Applied = 'Applied',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

export enum VendorStatus {
    Pending = 'Pending',
    Verified = 'Verified',
    Suspended = 'Suspended',
}

export enum OrderStatus {
    Pending = 'Pending',
    Confirmed = 'Confirmed',
    Shipped = 'Shipped',
    Delivered = 'Delivered',
    Cancelled = 'Cancelled',
}

export enum TerritoryTransferStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

export enum TerritoryDisputeStatus {
    Open = 'Open',
    Resolved = 'Resolved',
}


// --- Interfaces ---

export interface Farmer {
    id: string;
    hap_id?: string;
    gov_application_id?: string;
    gov_farmer_id?: string;
    fullName: string;
    fatherHusbandName: string;
    aadhaarNumber: string;
    mobileNumber: string;
    gender: 'Male' | 'Female' | 'Other';
    address: string;
    ppbRofrId?: string;
    photo: string;
    bankAccountNumber: string;
    ifscCode: string;
    accountVerified: boolean;
    appliedExtent: number;
    approvedExtent: number;
    numberOfPlants: number;
    methodOfPlantation: PlantationMethod;
    plantType: PlantType;
    plantationDate: string;
    mlrdPlants: number;
    fullCostPlants: number;
    latitude?: number;
    longitude?: number;
    proposedYear: string;
    registrationDate: string;
    asoId?: string;
    paymentUtrDd?: string;
    status: FarmerStatus | string;
    district: string;
    mandal: string;
    village: string;
    syncStatus: 'synced' | 'pending' | 'pending_delete';
    tenantId: string;
    is_in_ne_region: boolean;
    primary_crop: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
    // Phase 1 Additions
    preferredName?: string;
    dateOfBirth?: string;
    primaryLanguage?: string;
    canShareWithGovernment?: boolean;
    canShareWithInputVendors?: boolean;
    preferredCommunicationMethods?: string; // JSON array
    lastConsentUpdate?: string;
    territoryId?: string;
}

export interface Plot {
    id: string;
    farmerId: string;
    acreage: number;
    soilType: SoilType | string;
    plantationDate?: string;
    numberOfPlants: number;
    methodOfPlantation: PlantationMethod;
    plantType: PlantType;
    mlrdPlants: number;
    fullCostPlants: number;
    geojson?: string;
    is_replanting: boolean;
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

export interface Profile {
    id: string;
    name: string;
    avatar: string;
}

export interface Group {
    id: string;
    name: string;
    permissions: Permission[];
    tenantId: string;
}

export interface Filters {
    searchQuery: string;
    district: string;
    mandal: string;
    village: string;
    status: string;
    registrationDateFrom: string;
    registrationDateTo: string;
}

export interface SubsidyPayment {
    id: string;
    farmerId: string;
    paymentDate: string;
    amount: number;
    utrNumber: string;
    paymentStage: PaymentStage;
    notes?: string;
    syncStatus: 'synced' | 'pending';
    createdBy: string;
    createdAt: string;
    tenantId: string;
}

export interface ActivityLog {
    id: string;
    farmerId: string;
    activityType: ActivityType;
    description: string;
    createdBy: string;
    createdAt: string;
    tenantId: string;
}

export interface Tenant {
    id: string;
    name: string;
    subscriptionStatus: 'trial' | 'active' | 'inactive';
    maxFarmers?: number;
}

export interface Resource {
    id: string;
    name: string;
    unit: string;
    description?: string;
    cost: number;
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
}

export interface AppContent {
    landing_hero_title: string;
    landing_hero_subtitle: string;
    landing_about_us: string;
    faqs: FAQItem[];
    privacy_policy: string;
}

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export interface CustomFieldDefinition {
    id: string;
    modelName: 'farmer';
    fieldName: string;
    fieldLabel: string;
    fieldType: CustomFieldType;
    options?: string[];
    isRequired: boolean;
    sortOrder: number;
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
    createdAt: string;
    updatedAt: string;
    tenantId: string;
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
    assessmentDate: string;
    overallGrade: OverallGrade;
    priceAdjustment: number;
    notes?: string;
    appealStatus: AppealStatus;
}

export interface QualityMetric {
    id: string;
    assessmentId: string;
    metricName: string;
    metricValue: string;
}

export interface ProcessingBatch {
    id: string;
    harvestId: string;
    batchCode: string;
    startDate: string;
    endDate?: string;
    status: ProcessingStatus;
    notes?: string;
}

export interface ProcessingStep {
    id: string;
    batchId: string;
    stepName: string;
    startDate: string;
    endDate?: string;
    parameters?: string;
    operatorId: string;
    equipmentId?: string;
}

export interface Equipment {
    id: string;
    name: string;
    type: string;
    location: string;
    status: 'operational' | 'maintenance' | 'decommissioned';
    lastMaintenanceDate?: string;
}

export interface ManualLedgerEntry {
    id: string;
    farmerId: string;
    entryDate: string;
    amount: number;
    description: string;
    source: EntrySource;
    isCredit: boolean;
}

export interface EquipmentLease {
    id: string;
    equipmentId: string;
    farmerId: string;
    startDate: string;
    endDate: string;
    cost: number;
    paymentStatus: 'Paid' | 'Unpaid';
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

export interface Wallet {
    id: string;
    farmerId: string;
    balance: number;
}

export interface WithdrawalAccount {
    id: string;
    farmerId: string;
    accountType: WithdrawalAccountType;
    details: string; // e.g., 'A/C: ...1234' or 'upi@id'
    isVerified: boolean;
    razorpayFundAccountId?: string;
}

export interface UserProfile {
    id: string;
    userId: string;
    isMentor: boolean;
    expertiseTags: string; // JSON array of ExpertiseTagEnum
}

export interface Mentorship {
    id: string;
    mentorId: string;
    menteeId: string;
    status: 'pending' | 'active' | 'completed' | 'rejected';
    startDate?: string;
    endDate?: string;
}

export interface AssistanceScheme {
    id: string;
    category: string;
    title: string;
    description: string;
    assistance: string;
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

export interface ProductCategory {
    id: string;
    name: string;
    iconSvg?: string;
    tenantId: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    categoryId: string;
    isQualityVerified: boolean;
    tenantId: string;
    createdAt: string;
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
    createdAt: string;
}

export interface VendorProduct {
    id: string;
    vendorId: string;
    productId: string;
    price: number;
    stockQuantity: number;
    unit: string;
    updatedAt: string;
}

export interface Order {
    id: string;
    farmerId: string;
    orderDate: string;
    status: OrderStatus;
    totalAmount: number;
    paymentMethod: 'Cash' | 'Digital';
    deliveryAddress: string;
    deliveryInstructions?: string;
    paymentTransactionId?: string;
    logisticsPartnerId?: string;
}

export interface OrderItem {
    id: string;
    orderId: string;
    vendorProductId: string;
    quantity: number;
    pricePerUnit: number;
}

export interface TrainingModule {
    id: string;
    title: string;
    category: string;
    description: string;
    durationMinutes: number;
    moduleType: 'video' | 'article';
    content: string; // URL for video, markdown for article
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    sortOrder: number;
}

export interface TrainingCompletion {
    id: string;
    userId: string;
    moduleId: string;
    completedAt: string;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    eventDate: string; // ISO String
    location: string;
    createdBy: string;
    createdAt: string;
    tenantId: string;
}

export interface EventRsvp {
    id: string;
    eventId: string;
    userId: string;
    createdAt: string;
}

export interface AuditLogEntry {
    id: number;
    user_id: string;
    user_name?: string; // from the view
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    table_name: string;
    record_id: string;
    old_record_json?: any;
    new_record_json?: any;
    created_at: string;
}

export interface Territory {
    id: string;
    tenantId: string;
    administrativeLevel: 'DISTRICT' | 'MANDAL' | 'VILLAGE';
    administrativeCode: string; // e.g., 'H', 'H-01', 'H-01-01'
    createdAt: string;
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

export interface TerritoryDispute {
    id: string;
    requestingTenantId: string;
    contestedTenantId: string;
    administrativeCode: string; // e.g., 'H-01' for a mandal
    reason: string;
    status: TerritoryDisputeStatus;
    createdAt: string;
}

export interface FarmerDealerConsent {
    id: string;
    farmerId: string;
    tenantId: string; // The dealer/vendor tenant
    grantedAt: string;
    isActive: boolean;
    grantedBy: 'FARMER' | 'OFFICER';
    createdAt: string;
    syncStatus: 'synced' | 'pending';
}

// --- Community Forum Interfaces ---
export interface ForumPost {
    id: string;
    created_at: string;
    title: string;
    content: string;
    author_id: string;
    tenant_id: string;
    author?: Profile;
    answer_count?: number;
}
  
export interface ForumAnswer {
    id: string;
    created_at: string;
    post_id: string;
    content: string;
    author_id: string;
    tenant_id: string;
    author?: Profile;
}

export interface QualityStandard {
    id: string;
    metricName: string;
    description: string;
    measurementUnit: 'Yes/No' | '%' | 'count';
    tenantId: string;
}