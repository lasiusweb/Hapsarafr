
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
  Domestic = 'Domestic'
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
    CAN_MANAGE_SCHEMA = 'CAN_MANAGE_SCHEMA'
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  groupId: string;
  tenantId: string;
  is_verified?: boolean;
}

export interface Group {
    id: string;
    name: string;
    permissions: Permission[];
    tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  credit_balance: number; // legacy
  creditBalance: number;
  subscriptionStatus: string;
  createdAt: number;
  features?: string[];
  tier?: string;
}

export interface Farmer {
  id: string;
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
  syncStatusLocal?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  tenantId: string;
  primary_crop?: string;
  mlrdPlants?: number;
  fullCostPlants?: number;
  asoId?: string;
  hap_id?: string;
  trustScore?: number;
}

export interface FarmPlot {
  id: string;
  name: string;
  farmerId: string;
  acreage: number;
  soil_type?: string; // legacy
  soilType?: string;
  number_of_plants?: number;
  method_of_plantation?: string;
  plantation_date?: string;
  plant_type?: string;
  geojson?: string;
  is_replanting?: boolean;
  isReplanting?: boolean;
  tenantId: string;
}

export interface District {
  code: string;
  name: string;
  mandals: {
    code: string;
    name: string;
    villages: {
      code: string;
      name: string;
    }[];
  }[];
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
  dateFrom?: string;
  dateTo?: string;
  resourceId?: string;
  assigneeId?: string;
  farmerId?: string;
  subsidyStage?: string;
}

export interface AppContent {
    landing_hero_title?: string;
    landing_hero_subtitle?: string;
    landing_about_us?: string;
    faqs?: FAQItem[];
    privacy_policy?: string;
}

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export interface AuditLogEntry {
    id: string;
    created_at: string;
    user_name: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    record_id: string;
}

export enum BillableEvent {
    CROP_HEALTH_SCAN_COMPLETED = 'CROP_HEALTH_SCAN_COMPLETED',
    APPOINTMENT_BOOKED = 'APPOINTMENT_BOOKED',
    TRANSACTION_PROCESSED = 'TRANSACTION_PROCESSED'
}

export interface CreditLedgerEntry {
    id: string;
    tenantId: string;
    vendorId?: string;
    transactionType: LedgerTransactionType;
    amount: number;
    serviceEventId?: string;
    createdAt: string;
    _raw?: any;
}

export enum LedgerTransactionType {
    PURCHASE = 'PURCHASE',
    CONSUMPTION = 'CONSUMPTION',
    REFUND = 'REFUND',
    ADJUSTMENT = 'ADJUSTMENT'
}

export enum OrderStatus {
    Pending = 'Pending',
    Confirmed = 'Confirmed',
    Shipped = 'Shipped',
    Delivered = 'Delivered',
    Cancelled = 'Cancelled'
}

export enum PaymentStage {
  MaintenanceYear1 = 'Maintenance Year 1',
  MaintenanceYear2 = 'Maintenance Year 2',
  MaintenanceYear3 = 'Maintenance Year 3',
  MaintenanceYear4 = 'Maintenance Year 4',
  IntercroppingYear1 = 'Intercropping Year 1',
  IntercroppingYear2 = 'Intercropping Year 2',
  IntercroppingYear3 = 'Intercropping Year 3',
  IntercroppingYear4 = 'Intercropping Year 4',
  PlantingMaterialDomestic = 'Planting Material (Domestic)',
  PlantingMaterialImported = 'Planting Material (Imported)',
  BoreWell = 'Bore Well',
  VermiCompost = 'Vermi Compost',
  Replanting = 'Replanting',
  Fertilizer = 'Fertilizer',
  Other = 'Other'
}

export enum ActivityType {
    PAYMENT_RECORDED = 'PAYMENT_RECORDED',
    CROP_HEALTH_SCAN_COMPLETED = 'CROP_HEALTH_SCAN_COMPLETED',
    VISIT_REQUESTED = 'VISIT_REQUESTED',
    VISIT_COMPLETED = 'VISIT_COMPLETED',
    CROP_ASSIGNED = 'CROP_ASSIGNED',
    HARVEST_LOGGED = 'HARVEST_LOGGED',
    RECOMMENDATION_ACTION = 'RECOMMENDATION_ACTION',
    STATUS_CHANGE = 'STATUS_CHANGE',
    COLLECTION_APPOINTMENT_BOOKED = 'COLLECTION_APPOINTMENT_BOOKED',
    QUALITY_APPEAL_STATUS_CHANGED = 'QUALITY_APPEAL_STATUS_CHANGED'
}

export enum AssistanceApplicationStatus {
    NotApplied = 'Not Applied',
    Applied = 'Applied',
    Approved = 'Approved',
    Rejected = 'Rejected'
}

export enum RelationshipStage {
    NEW = 'NEW',
    ACTIVE = 'ACTIVE',
    ONBOARDING = 'ONBOARDING',
    AT_RISK = 'AT_RISK',
    ADVOCATE = 'ADVOCATE'
}

export interface Interaction {
    id: string;
    farmerId: string;
    personnelId: string;
    type: InteractionType;
    outcome: InteractionOutcome;
    notes: string;
    date: string;
    photoUrl?: string;
}

export interface SubsidyPayment {
    id: string;
    farmerId: string;
    paymentDate: string;
    amount: number;
    utrNumber: string;
    paymentStage: PaymentStage;
    notes?: string;
    tenantId?: string;
    syncStatusLocal?: string;
}

export enum AppealStatus {
    None = 'None',
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected'
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
    overallGrade: OverallGrade;
    priceAdjustment: number;
    notes?: string;
    appealStatus: AppealStatus;
    assessmentDate: string;
}

export interface QualityMetric {
    id: string;
    assessmentId: string;
    metricName: string;
    metricValue: string;
}

export enum OverallGrade {
    GradeA = 'Grade A',
    GradeB = 'Grade B',
    GradeC = 'Grade C',
    Rejected = 'Rejected'
}

export interface QualityStandard {
    id: string;
    cropName: string;
    metricName: string;
    measurementUnit: string;
    description?: string;
}

export enum ProcessingStatus {
    Pending = 'Pending',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export interface Equipment {
    id: string;
    name: string;
    type: string;
    location: string;
    status: string;
    lastMaintenanceDate?: string;
}

export interface ManualLedgerEntry {
    id: string;
    farmerId: string;
    amount: number;
    date: string;
    description: string;
    type: 'CREDIT' | 'DEBIT';
}

export interface EquipmentLease {
    id: string;
    equipmentId: string;
    farmerId: string;
    startDate: string;
    endDate: string;
    paymentStatus: string;
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
}

export interface KhataRecord {
    id: string;
    dealerId: string;
    farmerId: string;
    amount: number;
    transactionType: KhataTransactionType | string;
    description: string;
    transactionDate: string;
    dueDate?: string;
    status: string;
}

export enum WithdrawalAccountType {
    BankAccount = 'bank_account',
    UPI = 'upi'
}

export interface WithdrawalAccount {
    id: string;
    farmerId: string;
    accountType: WithdrawalAccountType | string;
    details: string;
    isVerified: boolean;
}

export enum ExpertiseTagEnum {
    OIL_PALM = 'Oil Palm',
    IRRIGATION = 'Irrigation',
    PEST_CONTROL = 'Pest Control',
    SOIL_HEALTH = 'Soil Health',
    FINANCE = 'Finance'
}

export enum TerritoryDisputeStatus {
    Open = 'Open',
    Resolved = 'Resolved',
    Rejected = 'Rejected'
}

export enum DirectiveStatus {
    Open = 'Open',
    InProgress = 'InProgress',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export enum DirectiveTaskType {
    PestScouting = 'Pest Scouting',
    FertilizerDistribution = 'Fertilizer Distribution',
    Survey = 'Survey',
    Training = 'Training'
}

export enum TaskPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High'
}

export enum TaskStatus {
    ToDo = 'ToDo',
    InProgress = 'InProgress',
    Done = 'Done'
}

export enum InputType {
    Fertilizer = 'FERTILIZER',
    Pesticide = 'PESTICIDE',
    Irrigation = 'IRRIGATION',
    Labor = 'LABOR',
    Seed = 'SEED'
}

export interface Resource {
    id: string;
    name: string;
    unit: string;
    cost?: number;
    description?: string;
}

export interface ResourceDistribution {
    id: string;
    resourceId: string;
    farmerId: string;
    quantity: number;
    distributionDate: string;
    createdBy: string;
}

export interface CustomFieldDefinition {
    id: string;
    modelName: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: CustomFieldType | string;
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
    createdBy?: string;
    tenantId?: string;
    source?: string;
    directiveAssignmentId?: string;
    completion_evidence_json?: string;
}

export interface ProcessingBatch {
    id: string;
    harvestId: string;
    batchCode: string;
    startDate: string;
    status: ProcessingStatus;
    notes?: string;
}

export interface ProcessingStep {
    id: string;
    batchId: string;
    stepName: string;
    startDate: string;
    operatorId: string;
    equipmentId?: string;
    parameters?: string;
}

export interface Crop {
    id: string;
    name: string;
    isPerennial: boolean;
    defaultUnit: string;
    verificationStatus: CropVerificationStatus;
    tenantId?: string;
}

export enum CropVerificationStatus {
    Verified = 'Verified',
    Pending = 'Pending',
    Rejected = 'Rejected'
}

export enum Season {
    Kharif = 'Kharif',
    Rabi = 'Rabi',
    Zaid = 'Zaid'
}

export enum ListingStatus {
    Active = 'Active',
    BidAccepted = 'BidAccepted',
    Sold = 'Sold',
    Cancelled = 'Cancelled'
}

export interface ProductCategory {
    id: string;
    name: string;
    iconSvg?: string;
}

export interface Vendor {
    id: string;
    name: string;
    contactPerson?: string;
    mobileNumber?: string;
    address?: string;
    status: VendorStatus;
    rating: number;
    sellerType: string;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    categoryId: string;
    isQualityVerified: boolean;
    type: string;
    providerName?: string;
    premiumBasisPoints?: number;
    coverageLimit?: number;
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
    Verified = 'Verified',
    Pending = 'Pending',
    Suspended = 'Suspended'
}

export interface Order {
    id: string;
    farmerId: string;
    dealerId: string;
    orderDate: string;
    status: OrderStatus | string;
    totalAmount: number;
    paymentMethod: string;
    deliveryAddress: string;
    deliveryInstructions?: string;
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
    content: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    sortOrder?: number;
}

export interface LoanApplication {
    id: string;
    farmerId: string;
    loanType: LoanType;
    amountRequested: number;
    tenureMonths: number;
    purpose: string;
    status: LoanStatus;
    creditScoreSnapshot: number;
    createdAt: string;
}

export enum LoanStatus {
    SUBMITTED = 'SUBMITTED',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    DISBURSED = 'DISBURSED'
}

export interface ForumPost {
    id: string;
    title: string;
    content: string;
    author_id: string;
    tenant_id: string;
    created_at: string;
    answer_count?: number;
    author?: Profile;
}

export interface ForumAnswer {
    id: string;
    post_id: string;
    content: string;
    author_id: string;
    created_at: string;
    vote_count?: number;
    author?: Profile;
}

export interface Profile {
    id: string;
    name: string;
    avatar?: string;
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

export enum IoTDeviceType {
    SOIL_SENSOR = 'SOIL_SENSOR',
    WEATHER_STATION = 'WEATHER_STATION',
    SMART_TRAP = 'SMART_TRAP'
}

export enum IoTDeviceStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    ERROR = 'ERROR'
}

export interface IoTDevice {
    id: string;
    serialNumber: string;
    type: IoTDeviceType;
    status: IoTDeviceStatus;
    batteryLevel: number;
    lastHeartbeat: string;
    farmPlotId?: string;
}

export interface SensorReading {
    id: string;
    deviceId: string;
    farmPlotId: string;
    sensorType: string;
    value: number;
    unit: string;
    recordedAt: string;
    source: string;
}

export interface CollectionAppointment {
    id: string;
    farmerId: string;
    servicePointId: string;
    startTime: string;
    endTime: string;
    status: string;
    cancellationReason?: string;
    syncStatusLocal?: string;
}

export enum RoadAccessType {
    Highway = 'Highway',
    PavedRoad = 'PavedRoad',
    DirtRoad = 'DirtRoad',
    NoAccess = 'NoAccess'
}

export enum ListingType {
    Lease = 'Lease',
    Sale = 'Sale'
}

export interface CommodityListing {
    id: string;
    farmerId: string;
    cropName: string;
    qualityGrade: string;
    quantity: number;
    unit: string;
    askPrice: number;
    status: ListingStatus;
    farmPlotId: string;
    createdAt: Date;
}

export interface CommodityOffer {
    id: string;
    listingId: string;
    buyerName: string;
    buyerContact: string;
    offerPrice: number;
    status: OfferStatus;
    createdAt: Date;
}

export enum OfferStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED'
}

export enum SoilType {
    Loamy = 'Loamy',
    Sandy = 'Sandy',
    Clay = 'Clay',
    Silt = 'Silt',
    Peat = 'Peat',
    Chalk = 'Chalk',
    Unknown = 'Unknown'
}

export interface AgronomicRecommendation {
    id: string;
    farmerId: string;
    triggerSource: string;
    type: string;
    title: string;
    description: string;
    reasoning: string;
    priority: string;
    status: string;
    createdAt: string;
    tenantId?: string;
    actionJson?: string;
    socialProofJson?: string;
    confidenceScore?: number;
    scientificSource?: string;
    expertReviewStatus?: string;
    actionType?: string;
}

export interface DealerInventorySignal {
    id: string;
    dealerId: string;
    productId: string;
    stockQuantity: number;
    isAvailable: boolean;
    updatedAt: string;
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

export enum LoanType {
    CROP_LOAN = 'CROP_LOAN',
    EQUIPMENT_LOAN = 'EQUIPMENT_LOAN',
    INFRASTRUCTURE_LOAN = 'INFRASTRUCTURE_LOAN',
    PERSONAL_EMERGENCY = 'PERSONAL_EMERGENCY'
}

export enum InteractionType {
    FIELD_VISIT = 'FIELD_VISIT',
    CALL = 'CALL',
    WHATSAPP = 'WHATSAPP',
    MEETING = 'MEETING'
}

export enum InteractionOutcome {
    POSITIVE = 'POSITIVE',
    NEUTRAL = 'NEUTRAL',
    NEGATIVE = 'NEGATIVE',
    REQUIRES_FOLLOW_UP = 'REQUIRES_FOLLOW_UP'
}

export interface SeedVariety {
    id: string;
    name: string;
    seedType: string;
    daysToMaturity: number;
    isSeedSavingAllowed: boolean;
    waterRequirement: string;
    potentialYield: number;
    description?: string;
    imageUrl?: string;
    consentLevel: ConsentLevel;
    ownerFarmerId?: string;
    passportHash?: string;
    scientificName?: string;
    originVillage?: string;
    oralHistoryUrl?: string;
    tenantId?: string;
}

export enum SeedType {
    HEIRLOOM = 'HEIRLOOM',
    HYBRID = 'HYBRID',
    GMO = 'GMO',
    WILD = 'WILD'
}

export enum ConsentLevel {
    Red = 'Red',
    Yellow = 'Yellow',
    Green = 'Green'
}

export enum DataSharingDataType {
    PERSONAL_INFO = 'PERSONAL_INFO',
    FINANCIALS = 'FINANCIALS',
    CROP_DATA = 'CROP_DATA'
}

export interface AssistanceScheme {
    id: string;
    category: string;
    title: string;
    description: string;
    assistance: string;
}

export enum ActivityLogType {
    // Alias for ActivityType if needed
}

export interface EntrySource {
    // This was an enum in original code, used for wallet transaction sources
    // Re-implementing as string constants or enum
}
export const EntrySource = {
    P2PTransferOut: 'P2P_TRANSFER_OUT',
    P2PTransferIn: 'P2P_TRANSFER_IN',
    Withdrawal: 'WITHDRAWAL',
    Subsidy: 'SUBSIDY',
    HarvestSale: 'HARVEST_SALE',
    MarketplacePurchase: 'MARKETPLACE_PURCHASE'
};

export enum KhataTransactionType {
    CREDIT_GIVEN = 'CREDIT_GIVEN',
    PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
    INTEREST_CHARGED = 'INTEREST_CHARGED',
    DISCOUNT_GIVEN = 'DISCOUNT_GIVEN'
}

export interface ActivityLog {
    id: string;
    farmerId: string;
    activityType: ActivityType | string;
    description: string;
    metadataJson?: string;
    createdAt: number; // Timestamp
    createdBy: string;
}
