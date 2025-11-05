
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
  syncedToSheets: boolean;
}

export interface Village {
  code: string;
  name: string;
}

export interface Mandal {
  code: string;
  name:string;
  villages: Village[];
}

export interface District {
  code: string;
  name: string;
  mandals: Mandal[];
}
