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
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  FUNDS_WITHDRAWN = 'FUNDS_WITHDRAWN',
  AGRI_STORE_PURCHASE = 'AGRI_STORE_PURCHASE',
  EQUIPMENT_LEASE_STARTED = 'EQUIPMENT_LEASE_STARTED',
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

export enum TransactionType {
  PaymentIn = 'Payment In', // e.g., subsidy received, harvest sale
  Withdrawal = 'Withdrawal', // to bank account
  Purchase = 'Purchase', // from Agri-Store
  LeasePayment = 'Lease Payment', // for equipment
}

export enum TransactionStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Failed = 'Failed',
}

export enum EntrySource {
  ProcessorPayment = 'Processor Payment',
  GovernmentVGP = 'Government VGP',
  SubsidyDisbursement = 'Subsidy Disbursement',
  ManualEntry = 'Manual Entry',
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
  applicationId: string;
  farmerId: string;
  proposedYear: string;
  registrationDate: string;
  asoId: string;
  paymentUtrDd: string;
  status: FarmerStatus | string; // Allow string for flexibility with filters
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

export interface FinancialTransaction {
  id: string;
  farmerId: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  amount: number;
  transactionDate: string;
  notes?: string;
  thirdPartyRefId?: string;
  createdAt: string;
  tenantId: string;
}

export interface FarmerWallet {
  id: string; // Should be the same as farmerId
  currentBalance: number;
  lastUpdatedAt: string;
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
