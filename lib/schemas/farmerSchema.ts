import { z } from 'zod';

const dateOfBirthSchema = z.string().optional().refine(
  (date) => {
    if (!date) return true;
    const dob = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 18;
  },
  { message: 'Farmer must be at least 18 years old' }
);

export const farmerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters'),
  fatherHusbandName: z.string().min(2, 'Please enter a valid name').regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters'),
  gender: z.enum(['Male', 'Female', 'Other'], { message: 'Please select gender' }),
  dateOfBirth: dateOfBirthSchema,

  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  email: z.string().email('Enter valid email address').optional().or(z.literal('')),

  district: z.string().min(1, 'Select a district'),
  mandal: z.string().min(1, 'Select a mandal'),
  village: z.string().min(1, 'Select a village'),
  address: z.string().min(10, 'Address must be at least 10 characters'),

  bankAccountNumber: z.string().regex(/^\d{9,18}$/, 'Enter valid bank account number (9-18 digits)'),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter valid IFSC code (e.g., SBIN0001234)'),
  accountHolderName: z.string().min(2, 'Enter account holder name'),

  appliedExtent: z.number().positive('Enter valid acreage'),
  numberOfPlants: z.number().int('Must be whole number').min(0, 'Must be positive').optional(),
  plantationMethod: z.enum(['Square', 'Triangle']).optional(),
  plantType: z.enum(['Imported', 'Domestic']).optional(),
  plantationDate: z.string().optional(),
  primaryCrop: z.string().optional(),

  photo: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  proposedYear: z.string().optional(),
});

export type FarmerFormData = z.infer<typeof farmerSchema>;

export const farmerDefaults: FarmerFormData = {
  fullName: '',
  fatherHusbandName: '',
  gender: null as any,
  dateOfBirth: '',
  aadhaarNumber: '',
  mobileNumber: '',
  email: '',
  district: '',
  mandal: '',
  village: '',
  address: '',
  bankAccountNumber: '',
  ifscCode: '',
  accountHolderName: '',
  appliedExtent: 0,
  numberOfPlants: undefined,
  plantationMethod: undefined,
  plantType: undefined,
  plantationDate: '',
  primaryCrop: '',
  photo: '',
  latitude: undefined,
  longitude: undefined,
  proposedYear: '',
};

export const stepSchemas = {
  1: farmerSchema.pick({ fullName: true, fatherHusbandName: true, gender: true, dateOfBirth: true }),
  2: farmerSchema.pick({ aadhaarNumber: true, mobileNumber: true, email: true }),
  3: farmerSchema.pick({ district: true, mandal: true, village: true, address: true }),
  4: farmerSchema.pick({ bankAccountNumber: true, ifscCode: true, accountHolderName: true }),
  5: farmerSchema.pick({ appliedExtent: true, numberOfPlants: true, plantationMethod: true, plantType: true, plantationDate: true, primaryCrop: true }),
  6: farmerSchema.pick({ photo: true, latitude: true, longitude: true, proposedYear: true }),
};