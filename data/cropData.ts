import { Crop, CropVerificationStatus } from '../types';

export const SAMPLE_CROPS: Omit<Crop, 'id' | 'tenant_id'>[] = [
    {
        name: 'Oil Palm',
        is_perennial: true,
        default_unit: 'ton',
        verification_status: CropVerificationStatus.Verified,
    },
    {
        name: 'Paddy',
        is_perennial: false,
        default_unit: 'quintal',
        verification_status: CropVerificationStatus.Verified,
    },
    {
        name: 'Maize',
        is_perennial: false,
        default_unit: 'quintal',
        verification_status: CropVerificationStatus.Verified,
    },
    {
        name: 'Cotton',
        is_perennial: false,
        default_unit: 'quintal',
        verification_status: CropVerificationStatus.Verified,
    },
    {
        name: 'Groundnut',
        is_perennial: false,
        default_unit: 'quintal',
        verification_status: CropVerificationStatus.Verified,
    },
    {
        name: 'Chilli',
        is_perennial: false,
        default_unit: 'kg',
        verification_status: CropVerificationStatus.Verified,
    },
];
