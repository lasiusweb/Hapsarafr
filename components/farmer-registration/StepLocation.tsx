import React from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { FarmerFormData } from '../../lib/schemas/farmerSchema';
import { CascadingSelect } from './components/CascadingSelect';

interface StepLocationProps {
  register: UseFormRegister<FarmerFormData>;
  errors: FieldErrors<FarmerFormData>;
  watch: UseFormWatch<FarmerFormData>;
  setValue: UseFormSetValue<FarmerFormData>;
}

export function StepLocation({ register, errors, watch, setValue }: StepLocationProps) {
  const district = watch('district');
  const mandal = watch('mandal');
  const village = watch('village');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Location</h3>

      <CascadingSelect
        districtValue={district || ''}
        mandalValue={mandal || ''}
        villageValue={village || ''}
        onDistrictChange={(val) => setValue('district', val)}
        onMandalChange={(val) => setValue('mandal', val)}
        onVillageChange={(val) => setValue('village', val)}
        districtError={errors.district?.message}
        mandalError={errors.mandal?.message}
        villageError={errors.village?.message}
        required
      />

      <div className="pt-4">
        <label className="block text-sm font-medium text-gray-700">
          Address <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('address')}
          placeholder="Full address"
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>
    </div>
  );
}