import React, { useState, useMemo } from 'react';
import { FarmerModel } from '../db';
import { Farmer } from '../types';
import CustomSelect from './CustomSelect';

// Component to render sort icons
const SortIcon: React.FC<{ direction: 'ascending' | 'descending' | null }> = ({ direction }) => {
    if (!direction) {
        return <span className="text-gray-400">↕</span>;
    }
    return direction === 'ascending' ? <span className="text-gray-800">▲</span> : <span className="text-gray-800">▼</span>;
};


// Main Component
const RawDataView: React.FC<{ farmers: FarmerModel[]; onClose: () => void; }> = ({ farmers, onClose }) => {
    // State for interactivity
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Farmer | 'id', direction: 'ascending' | 'descending' } | null>({ key: 'registrationDate', direction: 'descending' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    // Define table headers
    const headers: { key: keyof Farmer | 'id', label: string }[] = [
        { key: 'farmerId', label: 'Hap ID' },
        { key: 'fullName', label: 'Full Name' },
        { key: 'applicationId', label: 'Application ID' },
        { key: 'status', label: 'Status' },
        { key: 'registrationDate', label: 'Reg. Date' },
        { key: 'mobileNumber', label: 'Mobile' },
        { key: 'aadhaarNumber', label: 'Aadhaar' },
        { key: 'district', label: 'District Code' },
        { key: 'mandal', label: 'Mandal Code' },
        { key: 'village', label: 'Village Code' },
        { key: 'syncStatus', label: 'Sync Status' },
        { key: 'approvedExtent', label: 'Approved Extent' },
        { key: 'id', label: 'DB ID' },
    ];

    // Memoized data processing pipeline
    const processedFarmers = useMemo(() => {
        let filteredData = [...farmers];

        // 1. Filtering logic
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredData = filteredData.filter(farmer => {
                return Object.values(farmer._raw).some(value =>
                    String(value).toLowerCase().includes(lowercasedFilter)
                );
            });
        }
        
        // 2. Sorting logic
        if (sortConfig !== null) {
            filteredData.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filteredData;
    }, [farmers, searchTerm, sortConfig]);

    // 3. Pagination logic
    const totalPages = Math.ceil(processedFarmers.length / rowsPerPage);
    const paginatedFarmers = useMemo(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
        const startIndex = (currentPage - 1) * rowsPerPage;
        return processedFarmers.slice(startIndex, startIndex + rowsPerPage);
    }, [processedFarmers, currentPage, rowsPerPage, totalPages]);

    // Handlers
    const requestSort = (key: keyof Farmer | 'id') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1); // Reset to first page on sort
    };
    
    // JSX Rendering
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col p-4 md:p-8 z-50">
            <div className="bg-white rounded-lg shadow-2xl flex flex-col w-full h-full">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Raw Farmer Data</h2>
                        <p className="text-sm text-gray-500">
                            Displaying {paginatedFarmers.length} of {processedFarmers.length} records.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Controls */}
                <div className="p-4 flex-shrink-0">
                     <input
                        type="text"
                        placeholder="Search all columns..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md"
                    />
                </div>

                {/* Table */}
                <div className="flex-grow overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                {headers.map(header => (
                                    <th 
                                        key={header.key} 
                                        onClick={() => requestSort(header.key)}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    >
                                        <div className="flex items-center gap-2">
                                            {header.label}
                                            <SortIcon direction={sortConfig?.key === header.key ? sortConfig.direction : null} />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {paginatedFarmers.map(farmer => (
                                <tr key={farmer.id} className="hover:bg-gray-50">
                                    {headers.map(header => (
                                        <td key={header.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {String(farmer[header.key as keyof FarmerModel] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                             {paginatedFarmers.length === 0 && (
                                <tr>
                                    <td colSpan={headers.length} className="text-center py-10 text-gray-500">
                                        No records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2">
                         <label htmlFor="rowsPerPage" className="text-sm text-gray-600">Rows per page:</label>
                         <CustomSelect
                            value={String(rowsPerPage)}
                            onChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1); }}
                            options={[
                                { value: '10', label: '10' },
                                { value: '25', label: '25' },
                                { value: '50', label: '50' },
                                { value: '100', label: '100' },
                            ]}
                            className="w-24"
                         />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">Page {totalPages > 0 ? currentPage : 0} of {totalPages}</span>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                             <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RawDataView;
