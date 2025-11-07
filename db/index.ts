import { appSchema, tableSchema, Model, Database, Q, CollectionMap } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { field, date, lazy, writer, readonly } from '@nozbe/watermelondb/decorators';
import { FarmerStatus, PlantationMethod, PlantType, PaymentStage, Permission, Group } from '../types';

// 1. Define the Schema
export const mySchema = appSchema({
  version: 3,
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
        ],
    }),
    tableSchema({
        name: 'users',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'avatar', type: 'string' },
            { name: 'group_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'groups',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'permissions', type: 'string' }, // Stored as a JSON string
        ]
    }),
    tableSchema({
      name: 'app_content_cache',
      columns: [
        { name: 'key', type: 'string' },
        { name: 'value', type: 'string' },
      ],
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
    } as const;

    readonly id!: string;
    readonly _raw!: any;
    readonly collections!: CollectionMap;
    readonly database!: Database;

    @field('name') name!: string;
    @field('permissions') permissionsStr!: string;

    // FIX: Renamed getter to avoid name collision with the 'permissions' db column.
    get parsedPermissions(): Permission[] {
        return JSON.parse(this.permissionsStr);
    }

    @writer
    async updatePermissions(newPermissions: Permission[]) {
        await this.update(g => {
            g.permissionsStr = JSON.stringify(newPermissions);
        });
    }
}

export class UserModel extends Model {
    static table = 'users';
    static associations = {
        groups: { type: 'belongs_to', key: 'group_id' },
    } as const;

    readonly id!: string;
    readonly _raw!: any;
    readonly collections!: CollectionMap;
    readonly database!: Database;

    @field('name') name!: string;
    @field('avatar') avatar!: string;
    @field('group_id') groupId!: string;

    @lazy group = this.collections.get<GroupModel>('groups').find(this.groupId);
}

export class SubsidyPaymentModel extends Model {
    static table = 'subsidy_payments';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;

    readonly id!: string;
    readonly _raw!: any;
    readonly database!: Database;
    readonly collections!: CollectionMap;

    @field('farmer_id') farmerId!: string;
    @field('paymentDate') paymentDate!: string;
    @field('amount') amount!: number;
    @field('utrNumber') utrNumber!: string;
    @field('paymentStage') paymentStage!: PaymentStage;
    @field('notes') notes?: string;
    @field('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @field('created_by') createdBy!: string;
    @date('created_at') createdAt!: Date;
}

export class ActivityLogModel extends Model {
    static table = 'activity_logs';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;

    readonly id!: string;
    readonly _raw!: any;
    readonly database!: Database;
    readonly collections!: CollectionMap;

    @field('farmer_id') farmerId!: string;
    @field('activity_type') activityType!: string;
    @field('description') description!: string;
    @field('created_by') createdBy!: string;
    @date('created_at') createdAt!: Date;
}

// 2. Define the Model
export class FarmerModel extends Model {
  static table = 'farmers';

  readonly id!: string;
  readonly _raw!: any;
  readonly collections!: CollectionMap;
  readonly database!: Database;

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
  @field('created_by') createdBy?: string;
  @field('updated_by') updatedBy?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  
  @lazy subsidyPayments = this.collections.get<SubsidyPaymentModel>('subsidy_payments').query(
      Q.where('farmer_id', this.id),
      Q.sortBy('paymentDate', Q.desc)
  );
  
  @lazy activityLogs = this.collections.get<ActivityLogModel>('activity_logs').query(
      Q.where('farmer_id', this.id),
      Q.sortBy('created_at', Q.desc)
  );
}

// 3. Create the Database Adapter
const adapter = new LokiJSAdapter({
  schema: mySchema,
  useWebWorker: false,
  useIncrementalIDB: true,
  dbName: 'hapsara-watermelon',
  migrations: {
      from: 1,
      to: 2,
      steps: []
  },
  // These options are recommended for production environments to improve stability and handle multi-tab scenarios.
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
  modelClasses: [FarmerModel, SubsidyPaymentModel, ActivityLogModel, UserModel, GroupModel, AppContentCacheModel],
});

export default database;
