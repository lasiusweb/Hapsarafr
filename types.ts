export enum PlantationMethod {
  Square = 'Square',
  Triangle = 'Triangle',
}

export enum PlantType {
  Imported = 'Imported',
  Indigenous = 'Indigenous',
}

export enum FarmerStatus {
  Registered = 'Registered',
  Sanctioned = 'Sanctioned',
  Planted = 'Planted',
  PaymentDone = 'Payment Done',
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

export interface Tenant {
  id: string;
  name: string;
  subscriptionStatus: 'active' | 'trial' | 'inactive';
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  permissions: Permission[];
  tenantId: string;
}

export interface User {
  id: string;
  name: string;
  groupId: string;
  avatar: string;
  tenantId: string;
}

export interface Invitation {
  id: string; // unique token/code
  groupId: string;
  emailFor: string; // The email this was intended for
  createdAt: string; // ISO string
  expiresAt: string; // ISO string
  status: 'pending' | 'accepted';
  acceptedByUserId?: string;
}

export interface Farmer {
  id: string; // Unique ID, can be farmerId
  // Personal Details
  fullName: string;
  fatherHusbandName: string;
  aadhaarNumber: string;
  mobileNumber: string;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  ppbRofrId: string;
  photo: string; // base64 string

  // Bank Details
  bankAccountNumber: string;
  ifscCode: string;
  accountVerified: boolean;

  // Land & Plantation Details
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

  // Application Workflow
  applicationId: string;
  farmerId: string;
  proposedYear: string;
  registrationDate: string;
  asoId: string;
  paymentUtrDd: string;
  status: FarmerStatus;
  
  // Geographic Details
  district: string;
  mandal: string;
  village: string;

  // Sync status
  syncStatus: 'synced' | 'pending' | 'pending_delete';

  // Multi-tenancy
  tenantId: string;
  
  // Audit fields
  createdBy?: string; // User ID
  updatedBy?: string; // User ID
  createdAt: string;
  updatedAt: string;

  // Dynamic fields
  customFields?: Record<string, any>;
}

export enum PaymentStage {
    Year1 = 'Year 1 Subsidy',
    Year2 = 'Year 2 Subsidy',
    Year3 = 'Year 3 Subsidy',
    Fertilizer = 'Fertilizer Support',
    Other = 'Other',
}

export interface SubsidyPayment {
    id: string;
    farmerId: string;
    paymentDate: string; // ISO string
    amount: number;
    utrNumber: string;
    paymentStage: PaymentStage;
    notes?: string;
    createdBy: string; // User ID
    createdAt: string; // ISO string
    syncStatus: 'synced' | 'pending';
    tenantId: string;
}

export enum ActivityType {
    REGISTRATION = 'REGISTRATION',
    STATUS_CHANGE = 'STATUS_CHANGE',
    PLANTATION_UPDATE = 'PLANTATION_UPDATE',
    PAYMENT_RECORDED = 'PAYMENT_RECORDED',
    DETAILS_EDITED = 'DETAILS_EDITED',
}

export interface ActivityLog {
    id: string;
    farmerId: string;
    activityType: ActivityType;
    description: string;
    createdBy: string; // User ID
    createdAt: string; // ISO string
    tenantId: string;
}


export interface Village {
  id?: string;
  code: string;
  name: string;
  mandalId?: string;
}

export interface Mandal {
  id?: string;
  code: string;
  name:string;
  districtId?: string;
  villages?: Village[];
}

export interface District {
  id?: string;
  code: string;
  name: string;
  mandals?: Mandal[];
}

// --- CMS Types ---
export interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export interface AppContent {
    landing_hero_title: string;
    landing_hero_subtitle: string;
    landing_about_us: string;
    privacy_policy: string;
    faqs: FAQItem[];
}

export interface DashboardStats {
    total_farmers: number;
    new_this_month: number;
    total_extent: number;
    farmers_by_district: { district: string; name: string; count: number }[];
}

export interface AuditLogEntry {
    id: number;
    user_id: string;
    user_name: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    table_name: string;
    record_id: string;
    created_at: string;
    old_record_json: any;
    new_record_json: any;
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

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown';

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