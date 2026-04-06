import React from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { FarmerFormData } from '../../lib/schemas/farmerSchema';

interface StepFarmProps {
  register: UseFormRegister<FarmerFormData>;
  errors: FieldErrors<FarmerFormData>;
  watch: UseFormWatch<FarmerFormData>;
  setValue: UseFormSetValue<FarmerFormData>;
}

const cropOptions = ['Oil Palm', 'Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Maize', 'Soybean', 'Pulses', 'Other'];

export function StepFarm({ register, errors, watch, setValue }: StepFarmProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Farm Details</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Applied Extent (Acres) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.01"
          {...register('appliedExtent', { valueAsNumber: true })}
          placeholder="e.g., 2.5"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.appliedExtent && (
          <p className="mt-1 text-sm text-red-600">{errors.appliedExtent.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Number of Plants
        </label>
        <input
          type="number"
          {...register('numberOfPlants', { valueAsNumber: true })}
          placeholder="Enter number of plants"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.numberOfPlants && (
          <p className="mt-1 text-sm text-red-600">{errors.numberOfPlants.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Plantation Method
        </label>
        <select
          {...register('plantationMethod')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select Method</option>
          <option value="Square">Square</option>
          <option value="Triangle">Triangle</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Plant Type
        </label>
        <select
          {...register('plantType')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select Type</option>
          <option value="Imported">Imported</option>
          <option value="Domestic">Domestic</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Plantation Date
        </label>
        <input
          type="date"
          {...register('plantationDate')}
          max={new Date().toISOString().split('T')[0]}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Primary Crop
        </label>
        <select
          {...register('primaryCrop')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select Crop</option>
          {cropOptions.map((crop) => (
            <option key={crop} value={crop}>{crop}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Proposed Year
        </label>
        <input
          type="text"
          {...register('proposedYear')}
          placeholder="e.g., 2025-26"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}