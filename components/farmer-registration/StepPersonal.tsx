import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FarmerFormData } from '../../lib/schemas/farmerSchema';
import { FieldError } from './components/FieldError';

interface StepPersonalProps {
  register: UseFormRegister<FarmerFormData>;
  errors: FieldErrors<FarmerFormData>;
}

export function StepPersonal({ register, errors }: StepPersonalProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Details</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('fullName')}
          placeholder="Enter full name"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <FieldError message={errors.fullName?.message} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Father/Husband Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('fatherHusbandName')}
          placeholder="Enter father or husband name"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <FieldError message={errors.fatherHusbandName?.message} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Gender <span className="text-red-500">*</span>
        </label>
        <select
          {...register('gender')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <FieldError message={errors.gender?.message} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Date of Birth
        </label>
        <input
          type="date"
          {...register('dateOfBirth')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}