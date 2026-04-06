import React from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { FarmerFormData } from '../../lib/schemas/farmerSchema';
import { IFSCLookup } from './components/IFSCLookup';

interface StepBankProps {
  register: UseFormRegister<FarmerFormData>;
  errors: FieldErrors<FarmerFormData>;
  watch: UseFormWatch<FarmerFormData>;
  setValue: UseFormSetValue<FarmerFormData>;
}

export function StepBank({ register, errors, watch, setValue }: StepBankProps) {
  const ifscCode = watch('ifscCode') || '';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Bank Details</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Bank Account Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d*"
          {...register('bankAccountNumber')}
          placeholder="9-18 digits"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.bankAccountNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.bankAccountNumber.message}</p>
        )}
      </div>

      <IFSCLookup
        ifscCode={ifscCode}
        onChange={(val) => setValue('ifscCode', val)}
        onBankFound={(bankName, branch) => {
          console.log(`Bank: ${bankName}, Branch: ${branch}`);
        }}
        error={errors.ifscCode?.message}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Account Holder Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('accountHolderName')}
          placeholder="As per bank records"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.accountHolderName && (
          <p className="mt-1 text-sm text-red-600">{errors.accountHolderName.message}</p>
        )}
      </div>
    </div>
  );
}