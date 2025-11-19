
import { Crop, CropVerificationStatus } from '../types';

export const SAMPLE_CROPS: Omit<Crop, 'id' | 'tenantId'>[] = [
    {
        name: 'Oil Palm',
        isPerennial: true,
        defaultUnit: 'ton',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Paddy',
        isPerennial: false,
        defaultUnit: 'quintal',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Maize',
        isPerennial: false,
        defaultUnit: 'quintal',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Cotton',
        isPerennial: false,
        defaultUnit: 'quintal',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Groundnut',
        isPerennial: false,
        defaultUnit: 'quintal',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Chilli',
        isPerennial: false,
        defaultUnit: 'kg',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Turmeric',
        isPerennial: false,
        defaultUnit: 'quintal',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Cocoa',
        isPerennial: true,
        defaultUnit: 'kg',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Red Gram',
        isPerennial: false,
        defaultUnit: 'quintal',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Green Gram',
        isPerennial: false,
        defaultUnit: 'quintal',
        verificationStatus: CropVerificationStatus.Verified,
    },
    {
        name: 'Black Gram',
        isPerennial: false,
        defaultUnit: 'quintal',
        verificationStatus: CropVerificationStatus.Verified,
    }
];
