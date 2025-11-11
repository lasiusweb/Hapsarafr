import { tableSchema } from '@nozbe/watermelondb/Schema';

// --- ENUMS ---

export enum FarmerStatus {
  Registered = 'Registered',
  Sanctioned = 'Sanctioned',
  Planted = 'Planted',
  PaymentDone = 'Payment Done',
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
  Alluvial = 'Alluvial',
  Clay = 'Clay',
  Loamy = 'Loamy',
  Red = 'Red',
  Sandy = 'Sandy',
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
  BoreWell = 'Bore-Well',
  VermiCompost = 'Vermi-Compost',
  Replanting = 'Replanting',
  Fertilizer = 'Fertilizer',
  Other = 'Other',
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
  CAN_MANAGE_SCHEMA = 'CAN_MANAGE_SCHEMA',
  CAN_VIEW_MARKETPLACE = 'CAN_VIEW_MARKETPLACE',
  CAN_MANAGE_VENDORS = 'CAN_MANAGE_VENDORS',
  CAN_MANAGE_ORDERS = 'CAN_MANAGE_ORDERS',
}

export enum ActivityType {
  REGISTRATION = 'REGISTRATION',
  STATUS_CHANGE = 'STATUS_CHANGE',
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  RESOURCE_DISTRIBUTED = 'RESOURCE_DISTRIBUTED',
  VOICE_NOTE = 'VOICE_NOTE',
  TRAINING_ATTENDED = 'TRAINING_ATTENDED',
  PLANTATION_UPDATE = 'PLANTATION_UPDATE',
  ASSISTANCE_STATUS_CHANGE = 'ASSISTANCE_STATUS_CHANGE',
  QUALITY_APPEAL_STATUS_CHANGED = 'QUALITY_APPEAL_STATUS_CHANGED',
  BATCH_CREATED = 'BATCH_CREATED',
  PROCESSING_STEP_COMPLETED = 'PROCESSING_STEP_COMPLETED',
  MAINTENANCE_LOGGED = 'MAINTENANCE_LOGGED',
  EQUIPMENT_ADDED = 'EQUIPMENT_ADDED',
  HARVEST_RECORDED = 'HARVEST_RECORDED',
  IDS_UPDATED = 'IDS_UPDATED',
  TRAINING_COMPLETED = 'TRAINING_COMPLETED',
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

export enum CustomFieldType {
  Text = 'text',
  Number = 'number',
  Date = 'date',
  Dropdown = 'dropdown',
}

export enum AssistanceApplicationStatus {
  NotApplied = 'Not Applied',
  Applied = 'Applied',
  Approved = 'Approved',
  Rejected = 'Rejected',
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

export enum ProcessingStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum EntrySource {
  ProcessorPayment = 'Processor Payment',
  GovernmentVGP = 'Government VGP',
  SubsidyDisbursement = 'Subsidy Disbursement',
  ManualEntry = 'Manual Entry',
}

export enum SustainabilityTier {
    Bronze = 'Bronze',
    Silver = 'Silver',
    Gold = 'Gold',
    Platinum = 'Platinum',
}

// --- INTERFACES ---

export interface Farmer {
  id: string;
  fullName: string;
  fatherHusbandName: string;
  aadhaarNumber: string;
  mobileNumber: string;
  gender: string;
  address: string;
  ppbRofrId?: string;
  photo?: string;
  bankAccountNumber: string;
  ifscCode: string;
  accountVerified: boolean;
  appliedExtent: number;
  approvedExtent: number;
  numberOfPlants: number;
  methodOfPlantation: PlantationMethod;
  plantType: PlantType;
  plantationDate?: string;
  mlrdPlants: number;
  fullCostPlants: number;
  latitude?: number;
  longitude?: number;
  hap_id?: string;
  gov_application_id?: string;
  gov_farmer_id?: string;
  proposedYear: string;
  registrationDate: string;
  asoId: string;
  paymentUtrDd: string;
  status: FarmerStatus | string;
  district: string;
  mandal: string;
  village: string;
  syncStatus: 'synced' | 'pending' | 'pending_delete';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  tenantId: string;
  is_in_ne_region: boolean;
  primary_crop?: string;
}

export interface Plot {
  id: string;
  farmerId: string;
  acreage: number;
  soilType?: SoilType;
  plantationDate?: string;
  numberOfPlants: number;
  methodOfPlantation: PlantationMethod;
  plantType: PlantType;
  mlrdPlants: number;
  fullCostPlants: number;
  geojson?: string;
  is_replanting: boolean;
}

export interface PlantingRecord {
  id: string;
  plotId: string;
  seedSource: string;
  plantingDate: string;
  geneticVariety: string;
  careInstructionsUrl?: string;
  numberOfPlants: number;
  qrCodeData?: string;
  syncStatus: 'synced' | 'pending';
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  groupId: string;
  is_verified?: boolean;
  tenantId: string;
}

export interface Group {
  id: string;
  name: string;
  permissions: Permission[];
  tenantId: string;
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
  createdBy?: string;
  createdAt: string;
  tenantId: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: string;
  user_name?: string; // from the view
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_record_json?: object;
  new_record_json?: object;
  created_at: string;
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

export interface ActivityLog {
    id: string;
    farmerId: string;
    activityType: ActivityType;
    description: string;
    createdAt: string;
    createdBy: string;
    tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  subscriptionStatus: 'active' | 'trial' | 'inactive';
  createdAt: string;
}

export interface Resource {
  id: string;
  name: string;
  unit: string;
  description?: string;
  tenantId: string;
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
  createdAt: string;
  tenantId: string;
}

export interface CustomFieldDefinition {
  id: string;
  modelName: 'farmer';
  fieldName: string;
  fieldLabel: string;
  fieldType: CustomFieldType;
  options: string[];
  isRequired: boolean;
  sortOrder: number;
  tenantId: string;
}

export interface AssistanceScheme {
    id: string;
    category: string;
    title: string;
    description: string;
    assistance: string;
}

export interface AssistanceApplication {
    id: string;
    farmerId: string;
    schemeId: string;
    status: AssistanceApplicationStatus;
    syncStatus: 'synced' | 'pending';
    createdAt: string;
    updatedAt: string;
    tenantId: string;
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
    syncStatus: 'synced' | 'pending';
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
  createdAt: string;
  tenantId: string;
}

export interface QualityAssessment {
  id: string;
  harvestId: string;
  assessmentDate: string;
  overallGrade: OverallGrade;
  priceAdjustment: number;
  notes?: string;
  appealStatus: AppealStatus;
  createdAt: string;
  tenantId: string;
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
  description: string;
  measurementUnit: '%' | 'Yes/No' | 'count';
  tenantId: string;
}

export interface ProcessingBatch {
  id: string;
  harvestId: string;
  batchCode: string;
  startDate: string;
  endDate?: string;
  status: ProcessingStatus;
  notes?: string;
  tenantId: string;
}

export interface ProcessingStep {
  id: string;
  batchId: string;
  stepName: string;
  startDate: string;
  endDate?: string;
  parameters: string; // JSON string for flexibility
  operatorId: string;
  equipmentId?: string;
  notes?: string;
  tenantId: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'operational' | 'maintenance' | 'decommissioned';
  lastMaintenanceDate?: string;
  tenantId: string;
}

export interface EquipmentMaintenanceLog {
  id: string;
  equipmentId: string;
  maintenanceDate: string;
  description: string;
  performedById: string;
  cost: number;
  tenantId: string;
}

export interface ManualLedgerEntry {
    id: string;
    farmerId: string;
    entryDate: string;
    description: string;
    category: 'Income' | 'Expense';
    amount: number;
    entrySource: EntrySource;
    syncStatus: 'synced' | 'pending';
    createdAt: string;
    updatedAt: string;
    tenantId: string;
}

export interface EquipmentLease {
  id: string;
  farmerId: string;
  equipmentId: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  paymentStatus: 'Pending' | 'Paid';
  createdAt: string;
  tenantId: string;
}

export interface SustainabilityPractice {
    id: string;
    name: string;
    description: string;
    category: 'Water Management' | 'Soil Health' | 'Pest Management' | 'Biodiversity';
    tier: SustainabilityTier;
}

export interface SustainabilityVerification {
    id: string;
    farmerId: string;
    practiceId: string;
    officerId: string;
    verificationDate: string;
    status: 'Verified' | 'Pending' | 'Rejected' | 'Under Review';
    notes?: string;
    evidenceUrl?: string; // Link to photo/video evidence
    createdAt: string;
}

export interface FarmInput {
    id: string;
    farmerId: string;
    inputType: 'Fertilizer' | 'Pesticide' | 'Water' | 'Labor' | 'Other';
    date: string;
    cost: number;
    quantity: number;
    unit: string;
}

// --- TRAINING ---

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  moduleType: 'video' | 'article';
  content: string; // URL for video, markdown for article
  durationMinutes?: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingCompletion {
  id: string;
  farmerId: string;
  moduleId: string;
  completedAt: string;
  completedByUserId?: string;
  syncStatus: 'synced' | 'pending';
  tenantId: string;
}

// --- COMMUNITY ---

export type ExpertiseTag = 'Pest Control' | 'Irrigation' | 'Soil Health' | 'Harvesting Techniques' | 'Financial Planning' | 'Nursery Management';

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  expertise_tags?: ExpertiseTag[];
}

export interface UserProfile {
  user_id: string;
  is_mentor: boolean;
  expertise_tags: ExpertiseTag[];
  needs_tags: ExpertiseTag[];
}

export interface Mentorship {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: 'requested' | 'active' | 'ended';
  created_at: string;
  mentor?: Profile;
  mentee?: Profile;
}


export interface ForumPost {
  id: string;
  created_at: string;
  author_id: string;
  title: string;
  content: string;
  tenant_id: string;
  author?: Profile;
  answer_count?: number;
}

export interface ForumAnswer {
  id: string;
  created_at: string;
  post_id: string;
  author_id: string;
  content: string;
  tenant_id: string;
  author?: Profile;
}


// --- FILTERS ---

export interface Filters {
  searchQuery: string;
  district: string;
  mandal: string;
  village: string;
  status: string;
  registrationDateFrom: string;
  registrationDateTo: string;
}

// --- MARKETPLACE ---

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

export enum DisputeStatus {
    Open = 'Open',
    InProgress = 'In Progress',
    Resolved = 'Resolved',
    Closed = 'Closed',
}

export interface Vendor {
    id: string;
    name: string;
    contactPerson: string;
    mobileNumber: string;
    address: string;
    status: VendorStatus;
    rating: number; // 0-5
    createdAt: string;
    tenantId: string;
}

export interface ProductCategory {
    id: string;
    name: string;
    iconSvg: string;
    tenantId: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    categoryId: string;
    isQualityVerified: boolean;
    createdAt: string;
    tenantId: string;
}

export interface VendorProduct {
    id: string;
    vendorId: string;
    productId: string;
    price: number;
    stockQuantity: number;
    unit: string; // e.g., '50kg bag', 'litre'
    updatedAt: string;
}

export interface Order {
    id: string;
    farmerId: string;
    orderDate: string;
    status: OrderStatus;
    totalAmount: number;
    paymentMethod: 'Cash' | 'Digital';
    paymentTransactionId?: string; // For Juspay integration
    deliveryAddress: string;
    deliveryInstructions?: string;
    logisticsPartnerId?: string; // e.g., Blowhorn order ID
    createdAt: string;
    tenantId: string;
}

export interface OrderItem {
    id: string;
    orderId: string;
    vendorProductId: string;
    quantity: number;
    pricePerUnit: number;
}

export interface DisputeTicket {
    id: string;
    orderId: string;
    farmerId: string;
    reason: string;
    status: DisputeStatus;
    resolutionNotes?: string;
    createdAt: string;
    resolvedAt?: string;
    tenantId: string;
}