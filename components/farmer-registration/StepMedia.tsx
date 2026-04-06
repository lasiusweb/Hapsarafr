import React from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { FarmerFormData } from '../../lib/schemas/farmerSchema';
import { PhotoCapture } from './components/PhotoCapture';
import { GeoLocationInput } from './components/GeoLocationInput';

interface StepMediaProps {
  register: UseFormRegister<FarmerFormData>;
  errors: FieldErrors<FarmerFormData>;
  watch: UseFormWatch<FarmerFormData>;
  setValue: UseFormSetValue<FarmerFormData>;
}

export function StepMedia({ register, errors, watch, setValue }: StepMediaProps) {
  const photo = watch('photo');
  const latitude = watch('latitude');
  const longitude = watch('longitude');

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Photo & Location</h3>

      <PhotoCapture
        photo={photo || ''}
        onChange={(val) => setValue('photo', val)}
        error={errors.photo?.message}
      />

      <GeoLocationInput
        latitude={latitude}
        longitude={longitude}
        onLatitudeChange={(val) => setValue('latitude', val)}
        onLongitudeChange={(val) => setValue('longitude', val)}
        error={errors.latitude?.message || errors.longitude?.message}
      />
    </div>
  );
}