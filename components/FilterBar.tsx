import React, { useMemo, useState, useEffect } from 'react';
// FIX: Import from the newly created types.ts file
import { FarmerStatus, Filters } from '../types';
import { useDatabase } from '../DatabaseContext';
// FIX: Import from the newly created db/index.ts file
import { DistrictModel, MandalModel, VillageModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';

interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

const initialFilters: Filters = {
  searchQuery: '',
  district: '',
  mandal: '',
  village: '',
  status: '',
  registrationDateFrom: '',
  registrationDateTo: '',
};

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange }) => {
  const database = useDatabase();
  
  // Queries for geo data
  const districts = useQuery(useMemo(() => database.get<DistrictModel>('districts').query(Q.sortBy('name')), [database]));
  
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictModel | null>(null);
  const [selectedMandal, setSelectedMandal] = useState<MandalModel | null>(null);

  const mandalsQuery = useMemo(() => {
    if (!selectedDistrict) return null;
    return database.get<MandalModel>('mandals').query(Q.where('district_id', selectedDistrict.id), Q.sortBy('name'));
  }, [database, selectedDistrict]);
  const mandals = useQuery(mandalsQuery || database.get<MandalModel>('mandals').query(Q.where('id', 'null')));

  const villagesQuery = useMemo(() => {
    if (!selectedMandal) return null;
    return database.get<VillageModel>('villages').query(Q.where('mandal_id', selectedMandal.id), Q.sortBy('name'));
  }, [database, selectedMandal]);
  const villages = useQuery(villagesQuery || database.get<VillageModel>('villages').query(Q.where('id', 'null')));

  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };
  
  const handleCustomSelectChange = (name: keyof Omit<Filters, 'searchQuery' | 'registrationDateFrom' | 'registrationDateTo'>, value: string) => {
    const newFilters = { ...filters, [name]: value };

    if (name === 'district') {
        const district = districts.find(d => d.code === value) || null;
        setSelectedDistrict(district);
        setSelectedMandal(null);
        newFilters.mandal = '';
        newFilters.village = '';
    }
    if (name === 'mandal') {
        const mandal = mandals.find(m => m.code === value) || null;
        setSelectedMandal(mandal);
        newFilters.village = '';
    }
    
    onFilterChange(newFilters);
  };


  const clearFilters = () => {
    onFilterChange(initialFilters);
    setSelectedDistrict(null);
    setSelectedMandal(null);
  };

  const inputClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition";

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="md:col-span-4">
                <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">Search (Hap ID, Name, Mobile)</label>
                <input
                    type="text"
                    id="searchQuery"
                    name="searchQuery"
                    value={filters.searchQuery}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe, H010124001, 987..."
                    className={inputClass}
                    title="Search by farmer's name, Hap ID, or mobile number."
                />
            </div>
            {/* Geo Filters */}
            <div>
                <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <CustomSelect
                    placeholder='All Districts'
                    value={filters.district}
                    onChange={(value) => handleCustomSelectChange('district', value)}
                    options={[{ value: '', label: 'All Districts' }, ...districts.map(d => ({ value: d.code, label: d.name }))]}
                />
            </div>
            <div>
                <label htmlFor="mandal" className="block text-sm font-medium text-gray-700 mb-1">Mandal</label>
                <CustomSelect
                    placeholder='All Mandals'
                    value={filters.mandal}
                    onChange={(value) => handleCustomSelectChange('mandal', value)}
                    options={[{ value: '', label: 'All Mandals' }, ...mandals.map(m => ({ value: m.code, label: m.name }))]}
                    disabled={!filters.district}
                />
            </div>
            <div>
                <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                <CustomSelect
                    placeholder='All Villages'
                    value={filters.village}
                    onChange={(value) => handleCustomSelectChange('village', value)}
                    options={[{ value: '', label: 'All Villages' }, ...villages.map(v => ({ value: v.code, label: v.name }))]}
                    disabled={!filters.mandal}
                />
            </div>
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <CustomSelect
                    placeholder='All Statuses'
                    value={filters.status}
                    onChange={(value) => handleCustomSelectChange('status', value)}
                    options={[{ value: '', label: 'All Statuses' }, ...Object.values(FarmerStatus).map(s => ({ value: s, label: s }))]}
                />
            </div>
            <div>
                 <label htmlFor="registrationDateFrom" className="block text-sm font-medium text-gray-700 mb-1">Reg. Date From</label>
                 <input type="date" name="registrationDateFrom" id="registrationDateFrom" value={filters.registrationDateFrom} onChange={handleInputChange} className={inputClass} title="Filter by the start of the registration date range." />
            </div>
             <div>
                 <label htmlFor="registrationDateTo" className="block text-sm font-medium text-gray-700 mb-1">Reg. Date To</label>
                 <input type="date" name="registrationDateTo" id="registrationDateTo" value={filters.registrationDateTo} onChange={handleInputChange} className={inputClass} min={filters.registrationDateFrom} title="Filter by the end of the registration date range." />
            </div>

            <div className="md:col-span-4 flex items-end justify-end">
                <button onClick={clearFilters} className="w-full md:w-auto px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition font-semibold" title="Reset all search and filter criteria to their default values.">
                    Clear All Filters
                </button>
            </div>
        </div>
    </div>
  );
};

export default FilterBar;