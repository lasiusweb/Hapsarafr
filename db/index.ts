// This file was regenerated to define the WatermelonDB schema and models.

import { appSchema, tableSchema } from '@nozbe/watermelondb';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, writer, relation, children } from '@nozbe/watermelondb/decorators';

// --- Schema Definition ---
export const mySchema = appSchema({
  version: 33,
  tables: [
    tableSchema({
      name: 'farmers',
      columns: [
        { name: 'hap_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'gov_application_id', type: 'string', isOptional: true },
        { name: 'gov_farmer_id', type: 'string', isOptional: true },
        { name: 'full_name', type: 'string' },
        { name: 'father_husband_name', type: 'string' },
        { name: 'aadhaar_number', type: 'string', isIndexed: true },
        { name: 'mobile_number', type: 'string' },
        { name: 'gender', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'ppb_rofr_id', type: 'string', isOptional: true },
        { name: 'photo', type: 'string', isOptional: true },
        { name: 'bank_account_number', type: 'string' },
        { name: 'ifsc_code', type: 'string' },
        { name: 'account_verified', type: 'boolean' },
        { name: 'applied_extent', type: 'number' },
        { name: 'approved_extent', type: 'number' },
        { name: 'number_of_plants', type: 'number' },
        { name: 'method_of_plantation', type: 'string' },
        { name: 'plant_type', type: 'string' },
        { name: 'plantation_date', type: 'string', isOptional: true },
        { name: 'mlrd_plants', type: 'number' },
        { name: 'full_cost_plants', type: 'number' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'proposed_year', type: 'string' },
        { name: 'registration_date', type: 'string' },
        { name: 'aso_id', type: 'string', isOptional: true },
        { name: 'payment_utr_dd', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'district', type: 'string', isIndexed: true },
        { name: 'mandal', type: 'string', isIndexed: true },
        { name: 'village', type: 'string', isIndexed: true },
        { name: 'sync_status', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'is_in_ne_region', type: 'boolean' },
        { name: 'primary_crop', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'updated_by', type: 'string', isOptional: true },
        { name: 'preferred_name', type: 'string', isOptional: true },
        { name: 'date_of_birth', type: 'string', isOptional: true },
        { name: 'primary_language', type: 'string', isOptional: true },
        { name: 'can_share_with_government', type: 'boolean', isOptional: true },
        { name: 'can_share_with_input_vendors', type: 'boolean', isOptional: true },
        { name: 'preferred_communication_methods', type: 'string', isOptional: true },
        { name: 'last_consent_update', type: 'string', isOptional: true },
        { name: 'territory_id', type: 'string', isOptional: true, isIndexed: true },
      ]
    }),
    tableSchema({
      name: 'plots',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'acreage', type: 'number' },
        { name: 'soil_type', type: 'string', isOptional: true },
        { name: 'plantation_date', type: 'string', isOptional: true },
        { name: 'number_of_plants', type: 'number' },
        { name: 'method_of_plantation', type: 'string' },
        { name: 'plant_type', type: 'string' },
        { name: 'mlrd_plants', type: 'number' },
        { name: 'full_cost_plants', type: 'number' },
        { name: 'geojson', type: 'string', isOptional: true },
        { name: 'is_replanting', type: 'boolean' },
        { name: 'sync_status', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ]
    }),
    tableSchema({
      name: 'subsidy_payments',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'payment_date', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'utr_number', type: 'string' },
        { name: 'payment_stage', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ]
    }),
    tableSchema({
        name: 'activity_logs',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'activity_type', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'created_by', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'users',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'email', type: 'string' },
            { name: 'group_id', type: 'string', isIndexed: true },
            { name: 'avatar', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'is_verified', type: 'boolean' },
        ]
    }),
    tableSchema({
        name: 'groups',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'permissions_str', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'tenants',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'subscription_status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'max_farmers', type: 'number', isOptional: true },
        ]
    }),
    tableSchema({
      name: 'territories',
      columns: [
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'administrative_level', type: 'string' },
        { name: 'administrative_code', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ]
    }),
     tableSchema({
      name: 'territory_transfer_requests',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'from_tenant_id', type: 'string', isIndexed: true },
        { name: 'to_tenant_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'requested_by_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'sync_status', type: 'string' },
      ]
    }),
    tableSchema({
      name: 'territory_disputes',
      columns: [
        { name: 'requesting_tenant_id', type: 'string', isIndexed: true },
        { name: 'contested_tenant_id', type: 'string', isIndexed: true },
        { name: 'administrative_code', type: 'string' },
        { name: 'reason', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'sync_status', type: 'string' },
      ]
    }),
    tableSchema({
      name: 'farmer_dealer_consents',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'granted_at', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'granted_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'sync_status', type: 'string' },
      ]
    }),
    tableSchema({
        name: 'districts',
        columns: [
            { name: 'code', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'mandals',
        columns: [
            { name: 'code', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'district_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'villages',
        columns: [
            { name: 'code', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'mandal_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'resources',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'unit', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'cost', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'resource_distributions',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'resource_id', type: 'string', isIndexed: true },
            { name: 'quantity', type: 'number' },
            { name: 'distribution_date', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'created_by', type: 'string' },
            { name: 'sync_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'tasks',
        columns: [
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'priority', type: 'string' },
            { name: 'due_date', type: 'string', isOptional: true },
            { name: 'assignee_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'farmer_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'created_by', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'sync_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'planting_records',
        columns: [
            { name: 'plot_id', type: 'string', isIndexed: true },
            { name: 'seed_source', type: 'string' },
            { name: 'planting_date', type: 'string' },
            { name: 'genetic_variety', type: 'string' },
            { name: 'number_of_plants', type: 'number' },
            { name: 'care_instructions_url', type: 'string', isOptional: true },
            { name: 'qr_code_data', type: 'string', isOptional: true },
            { name: 'sync_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'harvests',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'harvest_date', type: 'string' },
            { name: 'gross_weight', type: 'number' },
            { name: 'tare_weight', type: 'number' },
            { name: 'net_weight', type: 'number' },
            { name: 'assessed_by_id', type: 'string' },
            { name: 'sync_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
     tableSchema({
        name: 'quality_assessments',
        columns: [
            { name: 'harvest_id', type: 'string', isIndexed: true },
            { name: 'assessment_date', type: 'string' },
            { name: 'overall_grade', type: 'string' },
            { name: 'price_adjustment', type: 'number' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'appeal_status', type: 'string' },
            { name: 'sync_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'user_profiles',
        columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'is_mentor', type: 'boolean' },
            { name: 'expertise_tags', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'mentorships',
        columns: [
            { name: 'mentor_id', type: 'string', isIndexed: true },
            { name: 'mentee_id', type: 'string', isIndexed: true },
            { name: 'status', type: 'string' },
            { name: 'start_date', type: 'string', isOptional: true },
            { name: 'end_date', type: 'string', isOptional: true },
        ]
    }),
     tableSchema({
        name: 'assistance_applications',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'scheme_id', type: 'string', isIndexed: true },
            { name: 'status', type: 'string' },
            { name: 'sync_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'equipment',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'type', type: 'string' },
            { name: 'location', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'last_maintenance_date', type: 'string', isOptional: true },
            { name: 'sync_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
     tableSchema({
        name: 'equipment_maintenance_logs',
        columns: [
            { name: 'equipment_id', type: 'string', isIndexed: true },
            { name: 'maintenance_date', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'cost', type: 'number' },
            { name: 'performed_by_id', type: 'string' },
            { name: 'sync_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'withdrawal_accounts',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'account_type', type: 'string' },
            { name: 'details', type: 'string' },
            { name: 'is_verified', type: 'boolean' },
            { name: 'razorpay_fund_account_id', type: 'string', isOptional: true },
        ]
    }),
    tableSchema({
        name: 'training_modules',
        columns: [
            { name: 'title', type: 'string' },
            { name: 'category', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'duration_minutes', type: 'number' },
            { name: 'module_type', type: 'string' },
            { name: 'content', type: 'string' },
            { name: 'difficulty', type: 'string' },
            { name: 'sort_order', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'training_completions',
        columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'module_id', type: 'string', isIndexed: true },
            { name: 'completed_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'events',
        columns: [
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'event_date', type: 'string' },
            { name: 'location', type: 'string' },
            { name: 'created_by', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'sync_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'event_rsvps',
        columns: [
            { name: 'event_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'sync_status', type: 'string' },
        ]
    }),
  ]
}));

// --- Model Definitions ---

export class FarmerDealerConsentModel extends Model {
    static table = 'farmer_dealer_consents';
    readonly id!: string;
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;
    @text('farmer_id') farmerId!: string;
    @text('tenant_id') tenantId!: string;
    @readonly @date('granted_at') grantedAt!: Date;
    @field('is_active') isActive!: boolean;
    @text('granted_by') grantedBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('sync_status') syncStatusLocal!: string;
    @relation('farmers', 'farmer_id') farmer!: any;
}

export class TerritoryTransferRequestModel extends Model {
    static table = 'territory_transfer_requests';
    readonly id!: string;
    @text('farmer_id') farmerId!: string;
    @text('from_tenant_id') fromTenantId!: string;
    @text('to_tenant_id') toTenantId!: string;
    @text('status') status!: string;
    @text('requested_by_id') requestedById!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('sync_status') syncStatusLocal!: string;
}

export class TerritoryDisputeModel extends Model {
    static table = 'territory_disputes';
    readonly id!: string;
    @text('requesting_tenant_id') requestingTenantId!: string;
    @text('contested_tenant_id') contestedTenantId!: string;
    @text('administrative_code') administrativeCode!: string;
    @text('reason') reason!: string;
    @text('status') status!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('sync_status') syncStatusLocal!: string;
}

export class TerritoryModel extends Model {
    static table = 'territories';
    readonly id!: string;
    @text('tenant_id') tenantId!: string;
    @text('administrative_level') administrativeLevel!: 'DISTRICT' | 'MANDAL' | 'VILLAGE';
    @text('administrative_code') administrativeCode!: string;
    @readonly @date('created_at') createdAt!: Date;
}

export class FarmerModel extends Model {
    static table = 'farmers';
    readonly id!: string;
    static associations = {
        plots: { type: 'has_many', foreignKey: 'farmer_id' },
        subsidy_payments: { type: 'has_many', foreignKey: 'farmer_id' },
        activity_logs: { type: 'has_many', foreignKey: 'farmer_id' },
        assistance_applications: { type: 'has_many', foreignKey: 'farmer_id' },
        harvests: { type: 'has_many', foreignKey: 'farmer_id' },
        withdrawal_accounts: { type: 'has_many', foreignKey: 'farmer_id' },
        resource_distributions: { type: 'has_many', foreignKey: 'farmer_id' },
        farmer_dealer_consents: { type: 'has_many', foreignKey: 'farmer_id' },
    } as const;
    @text('hap_id') hapId!: string;
    @text('full_name') fullName!: string;
    @text('father_husband_name') fatherHusbandName!: string;
    @text('aadhaar_number') aadhaarNumber!: string;
    @text('mobile_number') mobileNumber!: string;
    @text('gender') gender!: string;
    @text('address') address!: string;
    @text('ppb_rofr_id') ppbRofrId?: string;
    @text('photo') photo!: string;
    @text('bank_account_number') bankAccountNumber!: string;
    @text('ifsc_code') ifscCode!: string;
    @field('account_verified') accountVerified!: boolean;
    @field('applied_extent') appliedExtent!: number;
    @field('approved_extent') approvedExtent!: number;
    @field('number_of_plants') numberOfPlants!: number;
    @text('method_of_plantation') methodOfPlantation!: string;
    @text('plant_type') plantType!: string;
    @text('plantation_date') plantationDate!: string;
    @field('mlrd_plants') mlrdPlants!: number;
    @field('full_cost_plants') fullCostPlants!: number;
    @field('latitude') latitude?: number;
    @field('longitude') longitude?: number;
    @text('proposed_year') proposedYear!: string;
    @text('registration_date') registrationDate!: string;
    @text('aso_id') asoId?: string;
    @text('status') status!: string;
    @text('district') district!: string;
    @text('mandal') mandal!: string;
    @text('village') village!: string;
    @text('sync_status') syncStatusLocal!: string;
    @text('tenant_id') tenantId!: string;
    @field('is_in_ne_region') isInNeRegion!: boolean;
    @text('primary_crop') primaryCrop!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('created_by') createdBy?: string;
    @text('updated_by') updatedBy?: string;
    @text('preferred_name') preferredName?: string;
    @text('date_of_birth') dateOfBirth?: string;
    @text('primary_language') primaryLanguage?: string;
    @field('can_share_with_government') canShareWithGovernment?: boolean;
    @field('can_share_with_input_vendors') canShareWithInputVendors?: boolean;
    @text('preferred_communication_methods') preferredCommunicationMethods?: string;
    @text('last_consent_update') lastConsentUpdate?: string;
    @text('territory_id') territoryId?: string;

    @children('plots') plots!: any;
    @children('subsidy_payments') subsidyPayments!: any;
    @children('activity_logs') activityLogs!: any;
    @children('assistance_applications') assistanceApplications!: any;
    @children('harvests') harvests!: any;
    @children('withdrawal_accounts') withdrawalAccounts!: any;
    @children('resource_distributions') resourceDistributions!: any;
    @children('farmer_dealer_consents') consents!: any;
}

export class PlotModel extends Model {
    static table = 'plots';
    readonly id!: string;
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
        planting_records: { type: 'has_many', foreignKey: 'plot_id' },
    } as const;
    @text('farmer_id') farmerId!: string;
    @field('acreage') acreage!: number;
    @text('soil_type') soilType?: string;
    @text('plantation_date') plantationDate?: string;
    @field('number_of_plants') numberOfPlants!: number;
    @text('method_of_plantation') methodOfPlantation!: string;
    @text('plant_type') plantType!: string;
    @field('mlrd_plants') mlrdPlants!: number;
    @field('full_cost_plants') fullCostPlants!: number;
    @text('geojson') geojson?: string;
    @field('is_replanting') isReplanting!: boolean;
    @relation('farmers', 'farmer_id') farmer!: any;
    @children('planting_records') plantingRecords!: any;
}

export class SubsidyPaymentModel extends Model {
    static table = 'subsidy_payments';
    readonly id!: string;
    @text('farmer_id') farmerId!: string;
    @text('payment_date') paymentDate!: string;
    @field('amount') amount!: number;
    @text('utr_number') utrNumber!: string;
    @text('payment_stage') paymentStage!: string;
    @text('notes') notes?: string;
    @text('sync_status') syncStatusLocal!: string;
    @text('created_by') createdBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('tenant_id') tenantId!: string;
}

export class ActivityLogModel extends Model {
    static table = 'activity_logs';
    readonly id!: string;
    @text('farmer_id') farmerId!: string;
    @text('activity_type') activityType!: string;
    @text('description') description!: string;
    @text('created_by') createdBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('tenant_id') tenantId!: string;
}

export class UserModel extends Model {
    static table = 'users';
    readonly id!: string;
    @text('name') name!: string;
    @text('email') email!: string;
    @text('group_id') groupId!: string;
    @text('avatar') avatar!: string;
    @text('tenant_id') tenantId!: string;
    @field('is_verified') isVerified!: boolean;
}

export class GroupModel extends Model {
    static table = 'groups';
    readonly id!: string;
    @text('name') name!: string;
    @text('permissions_str') permissionsStr!: string;
    @text('tenant_id') tenantId!: string;
    get permissions() {
        return JSON.parse(this.permissionsStr);
    }
}

export class TenantModel extends Model {
    static table = 'tenants';
    readonly id!: string;
    @text('name') name!: string;
    @text('subscription_status') subscriptionStatus!: string;
    @readonly @date('created_at') createdAt!: Date;
    @field('max_farmers') maxFarmers?: number;
}

export class DistrictModel extends Model {
    static table = 'districts';
    readonly id!: string;
    @text('code') code!: string;
    @text('name') name!: string;
}

export class MandalModel extends Model {
    static table = 'mandals';
    readonly id!: string;
    @text('code') code!: string;
    @text('name') name!: string;
    @text('district_id') districtId!: string;
    @relation('districts', 'district_id') district!: any;
}

export class VillageModel extends Model {
    static table = 'villages';
    readonly id!: string;
    @text('code') code!: string;
    @text('name') name!: string;
    @text('mandal_id') mandalId!: string;
    @relation('mandals', 'mandal_id') mandal!: any;
}

export class ResourceModel extends Model {
    static table = 'resources';
    readonly id!: string;
    @text('name') name!: string;
    @text('unit') unit!: string;
    @text('description') description?: string;
    @field('cost') cost!: number;
    @text('tenant_id') tenantId!: string;
}

export class ResourceDistributionModel extends Model {
    static table = 'resource_distributions';
    readonly id!: string;
    @text('farmer_id') farmerId!: string;
    @text('resource_id') resourceId!: string;
    @field('quantity') quantity!: number;
    @text('distribution_date') distributionDate!: string;
    @text('notes') notes?: string;
    @text('created_by') createdBy!: string;
    @text('sync_status') syncStatusLocal!: string;
    @text('tenant_id') tenantId!: string;
}

export class TaskModel extends Model { static table = 'tasks'; readonly id!: string; @text('title') title!: string; @text('description') description?: string; @text('status') status!: any; @text('priority') priority!: any; @text('due_date') dueDate?: string; @text('assignee_id') assigneeId?: string; @text('farmer_id') farmerId?: string; @text('created_by') createdBy!: string; @readonly @date('created_at') createdAt!: Date; @readonly @date('updated_at') updatedAt!: Date; @text('sync_status') syncStatusLocal!: string; @text('tenant_id') tenantId!: string; }
export class CustomFieldDefinitionModel extends Model { static table = 'custom_field_definitions'; readonly id!: string; @text('model_name') modelName!: string; @text('field_name') fieldName!: string; @text('field_label') fieldLabel!: string; @text('field_type') fieldType!: string; @text('options_json') optionsJson?: string; @field('is_required') isRequired!: boolean; @field('sort_order') sortOrder!: number; get options() { return this.optionsJson ? JSON.parse(this.optionsJson) : []; } }
export class PlantingRecordModel extends Model { static table = 'planting_records'; readonly id!: string; @text('plot_id') plotId!: string; @text('seed_source') seedSource!: string; @text('planting_date') plantingDate!: string; @text('genetic_variety') geneticVariety!: string; @field('number_of_plants') numberOfPlants!: number; @text('care_instructions_url') careInstructionsUrl?: string; @text('qr_code_data') qrCodeData?: string; @text('sync_status') syncStatusLocal!: string; @text('tenant_id') tenantId!: string; }
export class HarvestModel extends Model { static table = 'harvests'; readonly id!: string; @text('farmer_id') farmerId!: string; @text('harvest_date') harvestDate!: string; @field('gross_weight') grossWeight!: number; @field('tare_weight') tareWeight!: number; @field('net_weight') netWeight!: number; @text('assessed_by_id') assessedById!: string; @text('sync_status') syncStatusLocal!: string; @text('tenant_id') tenantId!: string; }
export class QualityAssessmentModel extends Model { static table = 'quality_assessments'; readonly id!: string; @text('harvest_id') harvestId!: string; @text('assessment_date') assessmentDate!: string; @text('overall_grade') overallGrade!: any; @field('price_adjustment') priceAdjustment!: number; @text('notes') notes?: string; @text('appeal_status') appealStatus!: any; @text('sync_status') syncStatusLocal!: string; @text('tenant_id') tenantId!: string; @relation('harvests', 'harvest_id') harvest!: any;}
export class QualityMetricModel extends Model { static table = 'quality_metrics'; readonly id!: string; }
export class UserProfileModel extends Model { static table = 'user_profiles'; readonly id!: string; @text('user_id') userId!: string; @field('is_mentor') isMentor!: boolean; @text('expertise_tags') expertiseTags!: string; }
export class MentorshipModel extends Model { static table = 'mentorships'; readonly id!: string; @text('mentor_id') mentorId!: string; @text('mentee_id') menteeId!: string; @text('status') status!: 'pending' | 'active' | 'completed' | 'rejected'; @text('start_date') startDate?: string; @text('end_date') endDate?: string; }
export class AssistanceApplicationModel extends Model { static table = 'assistance_applications'; readonly id!: string; @text('farmer_id') farmerId!: string; @text('scheme_id') schemeId!: string; @text('status') status!: any; @text('sync_status') syncStatusLocal!: string; @text('tenant_id') tenantId!: string; }
export class EquipmentModel extends Model { static table = 'equipment'; readonly id!: string; @text('name') name!: string; @text('type') type!: string; @text('location') location!: string; @text('status') status!: any; @text('last_maintenance_date') lastMaintenanceDate?: string; @text('sync_status') syncStatusLocal!: string; @text('tenant_id') tenantId!: string; }
export class EquipmentMaintenanceLogModel extends Model { static table = 'equipment_maintenance_logs'; readonly id!: string; @text('equipment_id') equipmentId!: string; @text('maintenance_date') maintenanceDate!: string; @text('description') description!: string; @field('cost') cost!: number; @text('performed_by_id') performedById!: string; @text('sync_status') syncStatusLocal!: string; @text('tenant_id') tenantId!: string; }
export class WithdrawalAccountModel extends Model { static table = 'withdrawal_accounts'; readonly id!: string; @text('farmer_id') farmerId!: string; @text('account_type') accountType!: any; @text('details') details!: string; @field('is_verified') isVerified!: boolean; @text('razorpay_fund_account_id') razorpayFundAccountId?: string; }
export class TrainingModuleModel extends Model { static table = 'training_modules'; readonly id!: string; @text('title') title!: string; @text('category') category!: string; @text('description') description!: string; @field('duration_minutes') durationMinutes!: number; @text('module_type') moduleType!: 'video' | 'article'; @text('content') content!: string; @text('difficulty') difficulty!: 'Beginner' | 'Intermediate' | 'Advanced'; @field('sort_order') sortOrder!: number; }
export class TrainingCompletionModel extends Model { static table = 'training_completions'; readonly id!: string; }
export class EventModel extends Model {
    static table = 'events';
    readonly id!: string;
    static associations = {
        event_rsvps: { type: 'has_many', foreignKey: 'event_id' },
        users: { type: 'belongs_to', key: 'created_by' },
    } as const;

    @text('title') title!: string;
    @text('description') description!: string;
    @text('event_date') eventDate!: string;
    @text('location') location!: string;
    @text('created_by') createdBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('sync_status') syncStatusLocal!: string;
    @text('tenant_id') tenantId!: string;

    @children('event_rsvps') rsvps!: any;
    @relation('users', 'created_by') author!: any;
}

export class EventRsvpModel extends Model {
    static table = 'event_rsvps';
    readonly id!: string;
    static associations = {
        events: { type: 'belongs_to', key: 'event_id' },
        users: { type: 'belongs_to', key: 'user_id' },
    } as const;

    @text('event_id') eventId!: string;
    @text('user_id') userId!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('sync_status') syncStatusLocal!: string;

    @relation('events', 'event_id') event!: any;
    @relation('users', 'user_id') user!: any;
}


// --- Database Setup ---
const adapter = new SQLiteAdapter({
  schema: mySchema,
  dbName: 'HapsaraDB',
  jsi: false,
  onSetUpError: error => {
    console.error('Failed to set up database', error);
  }
});

const database = new Database({
  adapter,
  modelClasses: [
    FarmerModel, PlotModel, SubsidyPaymentModel, ActivityLogModel, UserModel, GroupModel, TenantModel, DistrictModel, MandalModel, VillageModel, ResourceModel, ResourceDistributionModel, TaskModel, PlantingRecordModel, HarvestModel, QualityAssessmentModel, UserProfileModel, MentorshipModel, AssistanceApplicationModel, EquipmentModel, EquipmentMaintenanceLogModel, WithdrawalAccountModel,
    TrainingModuleModel, TrainingCompletionModel, EventModel, EventRsvpModel, TerritoryModel, TerritoryTransferRequestModel, TerritoryDisputeModel, FarmerDealerConsentModel
  ],
});

export default database;

// Models not fully implemented yet but schema exists
export class ProcessingBatchModel extends Model { static table = 'processing_batches'; readonly id!: string; @text('harvest_id') harvestId!: string; @text('batch_code') batchCode!: string; @text('start_date') startDate!: string; @text('status') status!: any; @text('notes') notes?: string; @text('sync_status') syncStatusLocal!: string; @text('tenant_id') tenantId!: string;}
export class ProcessingStepModel extends Model { static table = 'processing_steps'; readonly id!: string; @text('batch_id') batchId!: string; @text('step_name') stepName!: string; @text('start_date') startDate!: string; @text('operator_id') operatorId!: string; @text('equipment_id') equipmentId?: string; @text('sync_status') syncStatusLocal!: string; @text('tenant_id') tenantId!: string;}
export class EquipmentLeaseModel extends Model { static table = 'equipment_leases'; readonly id!: string; @text('equipment_id') equipmentId!: string; @text('farmer_id') farmerId!: string; @text('start_date') startDate!: string; @text('end_date') endDate!: string; @field('cost') cost!: number; @text('payment_status') paymentStatus!: 'Paid' | 'Unpaid'; }
export class ManualLedgerEntryModel extends Model { static table = 'manual_ledger_entries'; readonly id!: string; }
export class WalletModel extends Model { static table = 'wallets'; readonly id!: string; }
export class ProductCategoryModel extends Model { static table = 'product_categories'; readonly id!: string; @text('name') name!: string; @text('icon_svg') iconSvg?: string; }
export class ProductModel extends Model { static table = 'products'; readonly id!: string; }
export class VendorModel extends Model { static table = 'vendors'; readonly id!: string; @text('name') name!: string; @text('contact_person') contactPerson!: string; @text('mobile_number') mobileNumber!: string; @text('address') address!: string; @text('status') status!: any; @field('rating') rating!: number; }
export class VendorProductModel extends Model { static table = 'vendor_products'; readonly id!: string; @text('vendor_id') vendorId!: string; @text('product_id') productId!: string; @field('price') price!: number; }
export class OrderModel extends Model { static table = 'orders'; readonly id!: string; @text('farmer_id') farmerId!: string; @text('order_date') orderDate!: string; @text('status') status!: any; @field('total_amount') totalAmount!: number; @text('payment_method') paymentMethod!: any; @text('delivery_address') deliveryAddress!: string; @text('delivery_instructions') deliveryInstructions?: string; }
export class OrderItemModel extends Model { static table = 'order_items'; readonly id!: string; @text('order_id') orderId!: string; @text('vendor_product_id') vendorProductId!: string; @field('quantity') quantity!: number; @field('price_per_unit') pricePerUnit!: number; }