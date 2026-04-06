import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FarmerFormData } from '../../lib/schemas/farmerSchema';
import { FieldError } from './components/FieldError';

interface StepIdentityProps {
  register: UseFormRegister<FarmerFormData>;
  errors: FieldErrors<FarmerFormData>;
}

export function StepIdentity({ register, errors }: StepIdentityProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Identity & Contact</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Aadhaar Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d*"
          {...register('aadhaarNumber')}
          placeholder="12-digit Aadhaar"
          maxLength={12}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <FieldError message={errors.aadhaarNumber?.message} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Mobile Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          inputMode="tel"
          {...register('mobileNumber')}
          placeholder="10-digit mobile"
          maxLength={10}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <FieldError message={errors.mobileNumber?.message} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="email"
          {...register('email')}
          placeholder="email@example.com"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <FieldError message={errors.email?.message} />
      </div>
    </div>
  );
}