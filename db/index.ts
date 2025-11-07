import { appSchema, tableSchema, Model, Database, Q, CollectionMap } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { field, date, lazy, writer, readonly, text } from '@nozbe/watermelondb/decorators';
import { FarmerStatus, PlantationMethod, PlantType, PaymentStage, Permission, Group } from '../types';

// 1. Define the Schema
export const mySchema = appSchema({
  version: 7,
  tables: [
    tableSchema({
      name: 'farmers',
      columns: [
        { name: 'fullName', type: 'string' },
        { name: 'fatherHusbandName', type: 'string' },
        { name: 'aadhaarNumber', type: 'string', isIndexed: true },
        { name: 'mobileNumber', type: 'string' },
        { name: 'gender', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'ppbRofrId', type: 'string' },
        { name: 'photo', type: 'string' },
        { name: 'bankAccountNumber', type: 'string' },
        { name: 'ifscCode', type: 'string' },
        { name: 'accountVerified', type: 'boolean' },
        { name: 'appliedExtent', type: 'number' },
        { name: 'approvedExtent', type: 'number' },
        { name: 'numberOfPlants', type: 'number' },
        { name: 'methodOfPlantation', type: 'string' },
        { name: 'plantType', type: 'string' },
        { name: 'plantationDate', type: 'string' },
        { name: 'mlrdPlants', type: 'number' },
        { name: 'fullCostPlants', type: 'number' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'applicationId', type: 'string' },
        { name: 'farmerId', type: 'string', isIndexed: true },
        { name: 'proposedYear', type: 'string' },
        { name: 'registrationDate', type: 'string' },
        { name: 'asoId', type: 'string' },
        { name: 'paymentUtrDd', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'district', type: 'string', isIndexed: true },
        { name: 'mandal', type: 'string', isIndexed: true },
        { name: 'village', type: 'string', isIndexed: true },
        { name: 'syncStatus', type: 'string', isIndexed: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'custom_fields', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'updated_by', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
        name: 'subsidy_payments',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'paymentDate', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'utrNumber', type: 'string' },
            { name: 'paymentStage', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'syncStatus', type: 'string', isIndexed: true },
            { name: 'created_by', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ],
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
        ],
    }),
    tableSchema({
        name: 'users',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'avatar', type: 'string' },
            { name: 'email', type: 'string', isIndexed: true },
            { name: 'is_verified', type: 'boolean' },
            { name: 'group_id', type: 'string', isIndexed: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
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
      ],
    }),
    tableSchema({
      name: 'app_content_cache',
      columns: [
        { name: 'key', type: 'string' },
        { name: 'value', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'districts',
      columns: [
        { name: 'code', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'mandals',
      columns: [
        { name: 'code', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'district_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'villages',
      columns: [
        { name: 'code', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'mandal_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'custom_field_definitions',
      columns: [
        { name: 'model_name', type: 'string', isIndexed: true },
        { name: 'field_name', type: 'string' },
        { name: 'field_label', type: 'string' },
        { name: 'field_type', type: 'string' },
        { name: 'options_json', type: 'string', isOptional: true },
        { name: 'is_required', type: 'boolean' },
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ],
});

export class AppContentCacheModel extends Model {
    static table = 'app_content_cache';
    @field('key') key!: string;
    @field('value') value!: string;
}

export class GroupModel extends Model {
    static table = 'groups';
    static associations = {
        users: { type: 'has_many', foreignKey: 'group_id' },
        tenant: { type: 'belongs_to', key: 'tenant_id' },
    } as const;

    @field('name') name!: string;
    @field('permissions_str') permissionsStr!: string;
    @field('tenant_id') tenantId!: string;

    // FIX: Add declaration for inherited properties from `Model` to satisfy TypeScript.
    update!: (recordUpdater: (record: this) => void) => Promise<void>;

    get parsedPermissions(): Permission[] {
        try {
            return JSON.parse(this.permissionsStr);
        } catch {
            return [];
        }
    }

    @writer
    async updatePermissions(newPermissions: Permission[]) {
        await this.update(g => {
            g.permissionsStr = JSON.stringify(newPermissions);
        });
    }
}

export class TenantModel extends Model {
    static table = 'tenants';
    static associations = {
        users: { type: 'has_many', foreignKey: 'tenant_id' },
        groups: { type: 'has_many', foreignKey: 'tenant_id' },
    } as const;

    @field('name') name!: string;
    @field('subscription_status') subscriptionStatus!: 'active' | 'trial' | 'inactive';
    @readonly @date('created_at') createdAt!: Date;
    
    // FIX: Add declaration for inherited properties from `Model` to satisfy TypeScript.
    update!: (recordUpdater: (record: this) => void) => Promise<void>;

    @writer
    async updateSubscriptionStatus(newStatus: 'active' | 'trial' | 'inactive') {
        await this.update(record => {
            record.subscriptionStatus = newStatus;
        });
    }
}

export class UserModel extends Model {
    static table = 'users';
    static associations = {
        group: { type: 'belongs_to', key: 'group_id' },
        tenant: { type: 'belongs_to', key: 'tenant_id' },
    } as const;

    @field('name') name!: string;
    @field('avatar') avatar!: string;
    @field('email') email!: string;
    @field('is_verified') isVerified!: boolean;
    @field('group_id') groupId!: string;
    @field('tenant_id') tenantId!: string;
}

export class SubsidyPaymentModel extends Model {
    static table = 'subsidy_payments';
    static associations = {
        farmer: { type: 'belongs_to', key: 'farmer_id' },
    } as const;

    @field('farmer_id') farmerId!: string;
    @field('paymentDate') paymentDate!: string;
    @field('amount') amount!: number;
    @field('utrNumber') utrNumber!: string;
    @field('paymentStage') paymentStage!: PaymentStage;
    @field('notes') notes?: string;
    @field('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @field('created_by') createdBy!: string;
    @date('created_at') createdAt!: Date;
    @field('tenant_id') tenantId!: string;
}

export class ActivityLogModel extends Model {
    static table = 'activity_logs';
    static associations = {
        farmer: { type: 'belongs_to', key: 'farmer_id' },
    } as const;

    @field('farmer_id') farmerId!: string;
    @field('activity_type') activityType!: string;
    @field('description') description!: string;
    @field('created_by') createdBy!: string;
    @date('created_at') createdAt!: Date;
    @field('tenant_id') tenantId!: string;
}

export class FarmerModel extends Model {
  static table = 'farmers';

  @field('fullName') fullName!: string;
  @field('fatherHusbandName') fatherHusbandName!: string;
  @field('aadhaarNumber') aadhaarNumber!: string;
  @field('mobileNumber') mobileNumber!: string;
  @field('gender') gender!: 'Male' | 'Female' | 'Other';
  @field('address') address!: string;
  @field('ppbRofrId') ppbRofrId!: string;
  @field('photo') photo!: string;
  @field('bankAccountNumber') bankAccountNumber!: string;
  @field('ifscCode') ifscCode!: string;
  @field('accountVerified') accountVerified!: boolean;
  @field('appliedExtent') appliedExtent!: number;
  @field('approvedExtent') approvedExtent!: number;
  @field('numberOfPlants') numberOfPlants!: number;
  @field('methodOfPlantation') methodOfPlantation!: PlantationMethod;
  @field('plantType') plantType!: PlantType;
  @field('plantationDate') plantationDate!: string;
  @field('mlrdPlants') mlrdPlants!: number;
  @field('fullCostPlants') fullCostPlants!: number;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @field('applicationId') applicationId!: string;
  @field('farmerId') farmerId!: string;
  @field('proposedYear') proposedYear!: string;
  @field('registrationDate') registrationDate!: string;
  @field('asoId') asoId!: string;
  @field('paymentUtrDd') paymentUtrDd!: string;
  @field('status') status!: FarmerStatus;
  @field('district') district!: string;
  @field('mandal') mandal!: string;
  @field('village') village!: string;
  @field('syncStatus') syncStatusLocal!: 'synced' | 'pending' | 'pending_delete';
  @field('tenant_id') tenantId!: string;
  @field('custom_fields') customFieldsJson?: string;
  @field('created_by') createdBy?: string;
  @field('updated_by') updatedBy?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  
  // FIX: Add declarations for inherited properties from `Model` to satisfy TypeScript.
  readonly id!: string;
  readonly database!: Database;
  update!: (recordUpdater?: (record: this) => void) => Promise<void>;
  
  @lazy get subsidyPayments() { return this.database.get<SubsidyPaymentModel>('subsidy_payments').query(
      Q.where('farmer_id', this.id),
      Q.sortBy('paymentDate', Q.desc)
  ); }
  
  @lazy get activityLogs() { return this.database.get<ActivityLogModel>('activity_logs').query(
      Q.where('farmer_id', this.id),
      Q.sortBy('created_at', Q.desc)
  ); }

  get customFields(): Record<string, any> {
      try {
          return this.customFieldsJson ? JSON.parse(this.customFieldsJson) : {};
      } catch {
          return {};
      }
  }

  @writer
  async setCustomField(key: string, value: any) {
      const fields = this.customFields;
      fields[key] = value;
      await this.update(record => {
          record.customFieldsJson = JSON.stringify(fields);
      });
  }
}

export class DistrictModel extends Model {
  static table = 'districts';
  static associations = {
    mandals: { type: 'has_many', foreignKey: 'district_id' },
  } as const;

  // FIX: Add declarations for inherited properties from `Model` to satisfy TypeScript.
  readonly id!: string;
  readonly database!: Database;

  @field('code') code!: string;
  @field('name') name!: string;

  @lazy get mandals() { return this.database.get<MandalModel>('mandals').query(
    Q.where('district_id', this.id)
  ); }
}

export class MandalModel extends Model {
  static table = 'mandals';
  static associations = {
    district: { type: 'belongs_to', key: 'district_id' },
    villages: { type: 'has_many', foreignKey: 'mandal_id' },
  } as const;

  // FIX: Add declarations for inherited properties from `Model` to satisfy TypeScript.
  readonly id!: string;
  readonly database!: Database;

  @field('code') code!: string;
  @field('name') name!: string;
  @field('district_id') districtId!: string;

  @lazy get villages() { return this.database.get<VillageModel>('villages').query(
    Q.where('mandal_id', this.id)
  ); }
}

export class VillageModel extends Model {
  static table = 'villages';
  static associations = {
    mandal: { type: 'belongs_to', key: 'mandal_id' },
  } as const;

  @field('code') code!: string;
  @field('name') name!: string;
  @field('mandal_id') mandalId!: string;
}

export class CustomFieldDefinitionModel extends Model {
    static table = 'custom_field_definitions';

    @field('model_name') modelName!: 'farmer';
    @field('field_name') fieldName!: string;
    @field('field_label') fieldLabel!: string;
    @field('field_type') fieldType!: 'text' | 'number' | 'date' | 'dropdown';
    @field('options_json') optionsJson?: string;
    @field('is_required') isRequired!: boolean;
    @field('sort_order') sortOrder!: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    get options(): string[] {
        try {
            return this.optionsJson ? JSON.parse(this.optionsJson) : [];
        } catch {
            return [];
        }
    }
}

// 3. Create the Database Adapter
const adapter = new LokiJSAdapter({
  schema: mySchema,
  useWebWorker: false,
  useIncrementalIDB: true,
  dbName: 'hapsara-watermelon',
  migrations: {
      from: 6,
      to: 7,
      steps: []
  },
  onIndexedDBVersionChange: () => {
    window.location.reload();
  },
  extraIncrementalIDBOptions: {
    onDidOverwrite: () => {
      console.warn('Local database was overwritten. If you did not intend to do this, please report an issue.');
      alert('Local database was reset. Your unsynced data may have been lost.');
    },
    onversionchange: () => {
      window.location.reload();
    },
  },
} as any);

// 4. Create the Database Instance
const database = new Database({
  adapter,
  modelClasses: [
    FarmerModel, 
    SubsidyPaymentModel, 
    ActivityLogModel, 
    UserModel, 
    GroupModel, 
    TenantModel,
    AppContentCacheModel,
    DistrictModel,
    MandalModel,
    VillageModel,
    CustomFieldDefinitionModel,
  ],
});

export default database;