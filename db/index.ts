import { appSchema, tableSchema, Model, Database, Q, CollectionMap } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { field, date, lazy, writer, readonly } from '@nozbe/watermelondb/decorators';
import { FarmerStatus, PlantationMethod, PlantType, PaymentStage, Permission, Group } from '../types';

// 1. Define the Schema
export const mySchema = appSchema({
  version: 4,
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
            { name: 'permissions_str', type: 'string' },
        ]
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

    @field('name') name!: string;
    @field('permissions_str') permissionsStr!: string;

    get parsedPermissions(): Permission[] {
        try {
            return JSON.parse(this.permissionsStr);
        } catch {
            return [];
        }
    }

    // This method modifies the database, so it must be decorated with @writer.
    // Error on line 149: Property 'update' does not exist on type 'GroupModel'.
    // This is fixed by adding the @writer decorator and making the method async.
    // FIX: Added @writer decorator and made the method async to allow database updates.
    // FIX: Added @writer decorator to allow database mutation.
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

    @field('name') name!: string;
    @field('avatar') avatar!: string;
    @field('group_id') groupId!: string;

    // Property 'collections' does not exist. Use 'this.collection.database.get' to access other collections.
    // Error on line 166: Property 'collection' does not exist on type 'UserModel'.
    // The original code used `this.collections`, which is incorrect. Fixed to `this.collection.database`.
    // FIX: The error indicates 'collection' does not exist. The correct WatermelonDB syntax is this.collections.get().
    // FIX: Corrected `this.collections.get` to `this.collection.database.get` to access other collections.
    @lazy get group() { return this.collection.database.get<GroupModel>('groups').find(this.groupId); }
}

export class SubsidyPaymentModel extends Model {
    static table = 'subsidy_payments';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
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
}

export class ActivityLogModel extends Model {
    static table = 'activity_logs';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;

    @field('farmer_id') farmerId!: string;
    @field('activity_type') activityType!: string;
    @field('description') description!: string;
    @field('created_by') createdBy!: string;
    @date('created_at') createdAt!: Date;
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
  @field('created_by') createdBy?: string;
  @field('updated_by') updatedBy?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  
  // Property 'collections' does not exist. Use 'this.collection.database.get'. Also, cast `this` to `any` to access the `id` property due to a typing issue.
  // Error on line 240: Property 'collection' does not exist on type 'FarmerModel'.
  // The original code used `this.collections`, which is incorrect. Fixed to `this.collection.database`.
  // FIX: The error indicates 'collection' does not exist. The correct WatermelonDB syntax is this.collections.get().
  // FIX: Corrected `this.collections.get` to `this.collection.database.get` to access other collections.
  @lazy get subsidyPayments() { return this.collection.database.get<SubsidyPaymentModel>('subsidy_payments').query(
      Q.where('farmer_id', (this as any).id),
      Q.sortBy('paymentDate', Q.desc)
  ); }
  
  // Property 'collections' does not exist. Use 'this.collection.database.get'. Also, cast `this` to `any` to access the `id` property due to a typing issue.
  // Error on line 246: Property 'collection' does not exist on type 'FarmerModel'.
  // The original code used `this.collections`, which is incorrect. Fixed to `this.collection.database`.
  // FIX: The error indicates 'collection' does not exist. The correct WatermelonDB syntax is this.collections.get().
  // FIX: Corrected `this.collections.get` to `this.collection.database.get` to access other collections.
  @lazy get activityLogs() { return this.collection.database.get<ActivityLogModel>('activity_logs').query(
      Q.where('farmer_id', (this as any).id),
      Q.sortBy('created_at', Q.desc)
  ); }
}

// --- New Geo Models ---
export class DistrictModel extends Model {
  static table = 'districts';
  static associations = {
    mandals: { type: 'has_many', foreignKey: 'district_id' },
  } as const;

  @field('code') code!: string;
  @field('name') name!: string;

  // Property 'collections' does not exist. Use 'this.collection.database.get'. Also, cast `this` to `any` to access the `id` property due to a typing issue.
  // Error on line 263: Property 'collection' does not exist on type 'DistrictModel'.
  // The original code used `this.collections`, which is incorrect. Fixed to `this.collection.database`.
  // FIX: The error indicates 'collection' does not exist. The correct WatermelonDB syntax is this.collections.get().
  // FIX: Corrected `this.collections.get` to `this.collection.database.get` to access other collections.
  @lazy get mandals() { return this.collection.database.get<MandalModel>('mandals').query(
    Q.where('district_id', (this as any).id)
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

  // Property 'collections' does not exist. Use 'this.collection.database.get'.
  // Error on line 280: Property 'collection' does not exist on type 'MandalModel'.
  // The original code used `this.collections`, which is incorrect. Fixed to `this.collection.database`.
  // FIX: The error indicates 'collection' does not exist. The correct WatermelonDB syntax is this.collections.get().
  // FIX: Corrected `this.collections.get` to `this.collection.database.get` to access other collections.
  @lazy get district() { return this.collection.database.get<DistrictModel>('districts').find(this.districtId); }
  // Property 'collections' does not exist. Use 'this.collection.database.get'. Also, cast `this` to `any` to access the `id` property due to a typing issue.
  // Error on line 282: Property 'collection' does not exist on type 'MandalModel'.
  // The original code used `this.collections`, which is incorrect. Fixed to `this.collection.database`.
  // FIX: The error indicates 'collection' does not exist. The correct WatermelonDB syntax is this.collections.get().
  // FIX: Corrected `this.collections.get` to `this.collection.database.get` to access other collections.
  @lazy get villages() { return this.collection.database.get<VillageModel>('villages').query(
    Q.where('mandal_id', (this as any).id)
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

  // Property 'collections' does not exist. Use 'this.collection.database.get'.
  // Error on line 298: Property 'collection' does not exist on type 'VillageModel'.
  // The original code used `this.collections`, which is incorrect. Fixed to `this.collection.database`.
  // FIX: The error indicates 'collection' does not exist. The correct WatermelonDB syntax is this.collections.get().
  // FIX: Corrected `this.collections.get` to `this.collection.database.get` to access other collections.
  @lazy get mandal() { return this.collection.database.get<MandalModel>('mandals').find(this.mandalId); }
}


// 3. Create the Database Adapter
const adapter = new LokiJSAdapter({
  schema: mySchema,
  useWebWorker: false,
  useIncrementalIDB: true,
  dbName: 'hapsara-watermelon',
  migrations: {
      from: 3,
      to: 4,
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
    AppContentCacheModel,
    DistrictModel,
    MandalModel,
    VillageModel
  ],
});

export default database;
