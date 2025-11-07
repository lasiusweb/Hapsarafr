import React, { useMemo, useState, useEffect } from 'react';
import { FarmerStatus, Filters } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DistrictModel, MandalModel, VillageModel } from '../db';
import { Q } from '@nozbe/watermelondb';

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

  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };
  
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrictCode = e.target.value;
    const district = districts.find(d => d.code === newDistrictCode) || null;
    setSelectedDistrict(district);
    setSelectedMandal(null);
    onFilterChange({
        ...filters,
        district: newDistrictCode,
        mandal: '',
        village: '',
    });
  };

  const handleMandalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMandalCode = e.target.value;
      const mandal = mandals.find(m => m.code === newMandalCode) || null;
      setSelectedMandal(mandal);
      onFilterChange({
          ...filters,
          mandal: newMandalCode,
          village: '',
      });
  };

  const clearFilters = () => {
    onFilterChange(initialFilters);
    setSelectedDistrict(null);
    setSelectedMandal(null);
  };

  const inputClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition";
  const selectInputClass = `${inputClass} appearance-none pr-10`;

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
                 <div className="relative">
                    <select id="district" name="district" value={filters.district} onChange={handleDistrictChange} className={selectInputClass} title="Filter farmers by their district.">
                        <option value="">All Districts</option>
                        {districts.map(d => <option key={d.id} value={d.code}>{d.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="mandal" className="block text-sm font-medium text-gray-700 mb-1">Mandal</label>
                 <div className="relative">
                    <select id="mandal" name="mandal" value={filters.mandal} onChange={handleMandalChange} className={selectInputClass} disabled={!filters.district} title="Filter farmers by their mandal. A district must be selected first.">
                        <option value="">All Mandals</option>
                        {mandals.map(m => <option key={m.id} value={m.code}>{m.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                <div className="relative">
                    <select id="village" name="village" value={filters.village} onChange={handleInputChange} className={selectInputClass} disabled={!filters.mandal} title="Filter farmers by their village. A mandal must be selected first.">
                        <option value="">All Villages</option>
                        {villages.map(v => <option key={v.id} value={v.code}>{v.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="relative">
                    <select id="status" name="status" value={filters.status} onChange={handleInputChange} className={selectInputClass} title="Filter farmers by their current registration status.">
                        <option value="">All Statuses</option>
                        {Object.values(FarmerStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
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