import { FarmerFormData } from './schemas/farmerSchema';

export function mapFarmerFormToDBRecord(
  formData: FarmerFormData,
  userId: string,
  tenantId: string
): Record<string, any> {
  const now = Date.now();
  
  return {
    full_name: formData.fullName,
    father_husband_name: formData.fatherHusbandName,
    aadhaar_number: formData.aadhaarNumber,
    mobile_number: formData.mobileNumber,
    gender: formData.gender || 'Other',
    address: formData.address,
    district: formData.district,
    mandal: formData.mandal,
    village: formData.village,
    photo: formData.photo || '',
    bank_account_number: formData.bankAccountNumber,
    ifsc_code: formData.ifscCode,
    account_verified: false,
    applied_extent: formData.appliedExtent || 0,
    number_of_plants: formData.numberOfPlants || 0,
    method_of_plantation: formData.plantationMethod || '',
    plant_type: formData.plantType || '',
    plantation_date: formData.plantationDate || '',
    status: 'Registered',
    registration_date: new Date().toISOString(),
    latitude: formData.latitude || 0,
    longitude: formData.longitude || 0,
    proposed_year: formData.proposedYear || '',
    sync_status: 'pending',
    created_at: now,
    updated_at: now,
    created_by: userId,
    tenant_id: tenantId,
    primary_crop: formData.primaryCrop || '',
  };
}