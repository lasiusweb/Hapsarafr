


import { appSchema, tableSchema } from '@nozbe/watermelondb';
import { Model } from '@nozbe/watermelondb';
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { field, date, lazy } from '@nozbe/watermelondb/decorators';
import { FarmerStatus, PlantationMethod, PlantType, PaymentStage } from '../types';
import { Q } from '@nozbe/watermelondb';

// 1. Define the Schema
export const mySchema = appSchema({
  version: 1,
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
  ],
});

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

// 2. Define the Model
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
  
  @lazy subsidyPayments = this.collections.get<SubsidyPaymentModel>('subsidy_payments').query(
      Q.where('farmer_id', this.id),
      Q.sortBy('paymentDate', Q.desc)
  );
}

// 3. Create the Database Adapter
const adapter = new LokiJSAdapter({
  schema: mySchema,
  useWebWorker: false,
  useIncrementalIDB: true,
  dbName: 'hapsara-watermelon',
  // These options are recommended for production environments to improve stability and handle multi-tab scenarios.
  onIndexedDBVersionChange: () => {
    // This is a safety measure for schema migrations. If the schema version changes,
    // reloading the app ensures the database structure is up-to-date.
    window.location.reload();
  },
  extraIncrementalIDBOptions: {
    onDidOverwrite: () => {
      // This function is called when the database is overwritten, which can happen if the database is corrupted.
      // It's a good place to log an error or alert the user that their local data might have been lost.
      console.warn('Local database was overwritten. If you did not intend to do this, please report an issue.');
      alert('Local database was reset. Your unsynced data may have been lost.');
    },
    onversionchange: () => {
      // This event is fired when another browser tab is trying to upgrade the database version.
      // To avoid conflicts, we should close our connection, which is most safely done by reloading the page.
      window.location.reload();
    },
  },
} as any);

// 4. Create the Database Instance
const database = new Database({
  adapter,
  modelClasses: [FarmerModel, SubsidyPaymentModel],
});

export default database;