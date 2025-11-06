import React, { useState, useEffect, useMemo } from 'react';
import { FarmerStatus, Mandal, Village } from '../types';
import { GEO_DATA } from '../data/geoData';

export interface Filters {
  searchQuery: string;
  district: string;
  mandal: string;
  village: string;
  status: string;
  registrationDateFrom: string;
  registrationDateTo: string;
}

interface FilterBarProps {
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

/**
 * A custom hook to debounce a value.
 * This prevents a function from being called too frequently by delaying its update.
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    // Cleanup function to clear the timeout if the value changes before the delay has passed
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const FilterBar: React.FC<FilterBarProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 500);

  // This single effect handles updating the parent component.
  // It triggers immediately for dropdown/date changes, but debounces the text search.
  useEffect(() => {
    const newFiltersForParent = {
      ...filters,
      searchQuery: debouncedSearchQuery,
    };
    onFilterChange(newFiltersForParent);
  }, [
    debouncedSearchQuery,
    filters.district,
    filters.mandal,
    filters.village,
    filters.status,
    filters.registrationDateFrom,
    filters.registrationDateTo,
    onFilterChange,
  ]);

  // Derive mandals and villages directly from filters state to avoid chained useEffect updates.
  const mandals: Mandal[] = useMemo(() => {
    if (!filters.district) return [];
    const selectedDistrict = GEO_DATA.find(d => d.code === filters.district);
    return selectedDistrict?.mandals || [];
  }, [filters.district]);

  const villages: Village[] = useMemo(() => {
    if (!filters.district || !filters.mandal) return [];
    const selectedDistrict = GEO_DATA.find(d => d.code === filters.district);
    const selectedMandal = selectedDistrict?.mandals.find(m => m.code === filters.mandal);
    return selectedMandal?.villages || [];
  }, [filters.district, filters.mandal]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrict = e.target.value;
    setFilters(prev => ({
        ...prev,
        district: newDistrict,
        mandal: '', // Reset mandal
        village: '', // Reset village
    }));
  };

  const handleMandalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMandal = e.target.value;
      setFilters(prev => ({
          ...prev,
          mandal: newMandal,
          village: '', // Reset village
      }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
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
                        {GEO_DATA.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
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
                        {mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
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
                        {villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
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
                        {/* Dynamically generate options from the FarmerStatus enum to ensure all statuses are always included */}
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