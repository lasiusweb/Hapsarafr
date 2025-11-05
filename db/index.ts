import { appSchema, tableSchema } from '@nozbe/watermelondb';
import { Model } from '@nozbe/watermelondb';
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { field } from '@nozbe/watermelondb/decorators';
import { FarmerStatus, PlantationMethod, PlantType } from '../types';

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
      ],
    }),
  ],
});

// 2. Define the Model
export class FarmerModel extends Model {
  static table = 'farmers';

  // FIX: Explicitly declare properties and methods from the base Model class
  // to make them visible to TypeScript. WatermelonDB adds these at runtime,
  // but TypeScript's static analysis can't see them without this.
  readonly id!: string;
  _raw!: { id: string, [key: string]: any };
  update!: (recordUpdater?: (record: this) => void | Promise<void>) => Promise<void>;
  prepareUpdate!: (recordUpdater?: (record: this) => void) => this;
  prepareDestroyPermanently!: () => this;
  destroyPermanently!: () => Promise<void>;


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
  @field('syncStatus') syncStatus!: 'synced' | 'pending' | 'pending_delete';
}

// 3. Create the Database Adapter
const adapter = new LokiJSAdapter({
  schema: mySchema,
  useWebWorker: false,
  useIncrementalIDB: true,
  dbName: 'hapsara-watermelon',
});

// 4. Create the Database Instance
const database = new Database({
  adapter,
  modelClasses: [FarmerModel],
});

export default database;