import { appSchema, tableSchema, Model, Database, Q, CollectionMap, Relation } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { field, date, lazy, writer, readonly, text } from '@nozbe/watermelondb/decorators';
import { FarmerStatus, PlantationMethod, PlantType, PaymentStage, Permission, Group, SoilType, TaskStatus, TaskPriority } from '../types';

// 1. Define the Schema
export const mySchema = appSchema({
  version: 10,
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
        name: 'plots',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'acreage', type: 'number' },
            { name: 'soil_type', type: 'string', isOptional: true },
            { name: 'plantation_date', type: 'string', isOptional: true },
            { name: 'geojson', type: 'string', isOptional: true },
            { name: 'number_of_plants', type: 'number' },
            { name: 'method_of_plantation', type: 'string' },
            { name: 'plant_type', type: 'string' },
            { name: 'mlrd_plants', type: 'number' },
            { name: 'full_cost_plants', type: 'number' },
            { name: 'sync_status', type: 'string', isIndexed: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
        ]
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
      name: 'resources',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'unit', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
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
        { name: 'created_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
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
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'priority', type: 'string' },
        { name: 'due_date', type: 'string', isOptional: true },
        { name: 'assignee_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'farmer_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'sync_status', type: 'string', isIndexed: true },
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
    // Corrected `update` method signature to return `Promise<this>` to match base Model.
    update!: (recordUpdater: (record: this) => void) => Promise<this>;

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
    // Corrected `update` method signature to return `Promise<this>` to match base Model.
    update!: (recordUpdater: (record: this) => void) => Promise<this>;

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

export class PlotModel extends Model {
    static table = 'plots';
    static associations = {
        farmer: { type: 'belongs_to', key: 'farmer_id' },
    } as const;

    @field('farmer_id') farmerId!: string;
    @field('acreage') acreage!: number;
    @field('soil_type') soilType?: SoilType;
    @field('plantation_date') plantationDate?: string;
    @field('geojson') geojson?: string;
    @field('number_of_plants') numberOfPlants!: number;
    @field('method_of_plantation') methodOfPlantation!: PlantationMethod;
    @field('plant_type') plantType!: PlantType;
    @field('mlrd_plants') mlrdPlants!: number;
    @field('full_cost_plants') fullCostPlants!: number;
    @field('sync_status') syncStatusLocal!: 'synced' | 'pending';
    @field('tenant_id') tenantId!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
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

export class ResourceModel extends Model {
    static table = 'resources';
    static associations = {
        resource_distributions: { type: 'has_many', foreignKey: 'resource_id' },
    } as const;

    @field('name') name!: string;
    @field('unit') unit!: string;
    @field('description') description?: string;
    @field('tenant_id') tenantId!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}

export class ResourceDistributionModel extends Model {
    static table = 'resource_distributions';
    static associations = {
        farmer: { type: 'belongs_to', key: 'farmer_id' },
        resource: { type: 'belongs_to', key: 'resource_id' },
    } as const;

    @field('farmer_id') farmerId!: string;
    @field('resource_id') resourceId!: string;
    @field('quantity') quantity!: number;
    @field('distribution_date') distributionDate!: string;
    @field('notes') notes?: string;
    @field('created_by') createdBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @field('sync_status') syncStatusLocal!: 'synced' | 'pending';
    @field('tenant_id') tenantId!: string;

    // FIX: Add declaration for inherited properties from `Model` to satisfy TypeScript.
    belongsTo!: <T extends Model>(associationName: string) => Relation<T>;

    // The lazy getter for a belongsTo relationship should use the association name 'resource'.
    @lazy get resource(): Relation<ResourceModel> {
        return this.belongsTo('resource');
    }
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
  // Corrected `update` method signature to return `Promise<this>` to match base Model.
  update!: (recordUpdater?: (record: this) => void) => Promise<this>;
  
  @lazy get plots() { return this.collections.get<PlotModel>('plots').query(Q.where('farmer_id', this.id)); }

  @lazy get subsidyPayments() { return this.database.get<SubsidyPaymentModel>('subsidy_payments').query(
      Q.where('farmer_id', this.id),
      Q.sortBy('paymentDate', Q.desc)
  ); }
  
  @lazy get activityLogs() { return this.database.get<ActivityLogModel>('activity_logs').query(
      Q.where('farmer_id', this.id),
      Q.sortBy('created_at', Q.desc)
  ); }

  @lazy get resourceDistributions() {
    return this.collections.get<ResourceDistributionModel>('resource_distributions').query(
        Q.where('farmer_id', this.id),
        Q.sortBy('distribution_date', Q.desc)
    );
  }

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

export class TaskModel extends Model {
    static table = 'tasks';

    @text('title') title!: string;
    @text('description') description?: string;
    @field('status') status!: TaskStatus;
    @field('priority') priority!: TaskPriority;
    @field('due_date') dueDate?: string;
    @field('assignee_id') assigneeId?: string;
    @field('farmer_id') farmerId?: string;
    @field('created_by') createdBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @field('tenant_id') tenantId!: string;
    @field('sync_status') syncStatusLocal!: 'synced' | 'pending';
}

// 3. Create the Database Adapter
const adapter = new LokiJSAdapter({
  schema: mySchema,
  useWebWorker: false,
  useIncrementalIDB: true,
  dbName: 'hapsara-watermelon',
  migrations: {
      from: 9,
      to: 10,
      steps: [
        // Version 10 introduces tasks table
      ]
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
    PlotModel,
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
    ResourceModel,
    ResourceDistributionModel,
    TaskModel,
  ],
});

export default database;