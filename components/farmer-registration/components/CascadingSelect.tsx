import React, { useState, useEffect } from 'react';
import { GEO_DATA } from '../../../data/geoData';
import { FieldError } from './FieldError';
import { District } from '../../../types';

interface CascadingSelectProps {
  label?: string;
  districtValue: string;
  mandalValue: string;
  villageValue: string;
  onDistrictChange: (value: string) => void;
  onMandalChange: (value: string) => void;
  onVillageChange: (value: string) => void;
  districtError?: string;
  mandalError?: string;
  villageError?: string;
  required?: boolean;
}

interface Mandal {
  code: string;
  name: string;
  villages: { code: string; name: string }[];
}

export function CascadingSelect({
  districtValue,
  mandalValue,
  villageValue,
  onDistrictChange,
  onMandalChange,
  onVillageChange,
  districtError,
  mandalError,
  villageError,
  required = false,
}: CascadingSelectProps) {
  const [mandals, setMandals] = useState<Mandal[]>([]);
  const [villages, setVillages] = useState<{ code: string; name: string }[]>([]);

  const districts: District[] = GEO_DATA || [];

  useEffect(() => {
    if (districtValue) {
      const selectedDistrict = districts.find((d) => d.code === districtValue);
      setMandals(selectedDistrict?.mandals || []);
    } else {
      setMandals([]);
    }
    onMandalChange('');
    setVillages([]);
  }, [districtValue, districts, onMandalChange]);

  useEffect(() => {
    if (mandalValue) {
      const selectedMandal = mandals.find((m) => m.code === mandalValue);
      setVillages(selectedMandal?.villages || []);
    } else {
      setVillages([]);
    }
    onVillageChange('');
  }, [mandalValue, mandals, onVillageChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          District {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={districtValue}
          onChange={(e) => onDistrictChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select District</option>
          {districts.map((district) => (
            <option key={district.code} value={district.code}>
              {district.name}
            </option>
          ))}
        </select>
        <FieldError message={districtError} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Mandal {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={mandalValue}
          onChange={(e) => onMandalChange(e.target.value)}
          disabled={!districtValue}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select Mandal</option>
          {mandals.map((mandal) => (
            <option key={mandal.code} value={mandal.code}>
              {mandal.name}
            </option>
          ))}
        </select>
        <FieldError message={mandalError} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Village {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={villageValue}
          onChange={(e) => onVillageChange(e.target.value)}
          disabled={!mandalValue}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select Village</option>
          {villages.map((village) => (
            <option key={village.code} value={village.code}>
              {village.name}
            </option>
          ))}
        </select>
        <FieldError message={villageError} />
      </div>
    </div>
  );
}