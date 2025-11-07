import React, { useState, useMemo } from 'react';
import { Farmer, FarmerStatus, PlantationMethod } from '../types';
import { GEO_DATA } from '../data/geoData';
import { getGeoName } from '../lib/utils';
import { exportToExcel } from '../lib/export';

interface ReportsPageProps {
    allFarmers: Farmer[];
    onBack: () => void;
}

// Reusable components
const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
);

const CustomBarChart: React.FC<{ title: string, data: { label: string, value: number, color: string }[] }> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
            <div className="space-y-4">
                {data.length > 0 ? data.map(item => (
                    <div key={item.label} className="group">
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="font-medium text-gray-600">{item.label}</span>
                            <span className="font-semibold text-gray-800">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                            <div
                                className="h-4 rounded-full transition-all duration-500"
                                style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }}
                            ></div>
                        </div>
                    </div>
                )) : <p className="text-gray-500 text-center py-8">No data for this selection.</p>}
            </div>
        </div>
    );
};

const CustomPieChart: React.FC<{ title: string, data: { label: string, value: number, color: string }[] }> = ({ title, data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md h-full">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
                <p className="text-gray-500 text-center py-8">No data for this selection.</p>
            </div>
        );
    }

    let cumulativePercent = 0;
    const segments = data.map(item => {
        const percent = (item.value / total) * 100;
        const start = cumulativePercent;
        cumulativePercent += percent;
        return { ...item, percent, start };
    });

    const conicGradient = segments.map(s => `${s.color} ${s.start}% ${s.start + s.percent}%`).join(', ');

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div 
                    className="w-32 h-32 rounded-full"
                    style={{ background: `conic-gradient(${conicGradient})` }}
                    role="img"
                    aria-label={`Pie chart for ${title}`}
                ></div>
                <div className="flex-1 space-y-2 w-full">
                    {segments.filter(s => s.value > 0).map(s => (
                        <div key={s.label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></span>
                                <span className="text-gray-600">{s.label}</span>
                            </div>
                            <span className="font-semibold text-gray-800">{s.percent.toFixed(1)}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const ReportsPage: React.FC<ReportsPageProps> = ({ allFarmers, onBack }) => {
    const [filters, setFilters] = useState({
        district: '',
        mandal: '',
        status: '',
        plantationMethod: '',
        dateFrom: '',
        dateTo: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'district') newState.mandal = '';
            return newState;
        });
        setCurrentPage(1); // Reset page on filter change
    };
    
    const clearFilters = () => {
        setFilters({ district: '', mandal: '', status: '', plantationMethod: '', dateFrom: '', dateTo: '' });
        setCurrentPage(1);
    };

    const mandals = useMemo(() => {
        if (!filters.district) return [];
        return GEO_DATA.find(d => d.code === filters.district)?.mandals || [];
    }, [filters.district]);

    const filteredFarmers = useMemo(() => {
        return allFarmers.filter(f => {
            if (filters.district && f.district !== filters.district) return false;
            if (filters.mandal && f.mandal !== filters.mandal) return false;
            if (filters.status && f.status !== filters.status) return false;
            if (filters.plantationMethod && f.methodOfPlantation !== filters.plantationMethod) return false;
            if (filters.dateFrom) {
                if (new Date(f.registrationDate).getTime() < new Date(filters.dateFrom).getTime()) return false;
            }
            if (filters.dateTo) {
                if (new Date(f.registrationDate).getTime() > new Date(filters.dateTo).getTime()) return false;
            }
            return true;
        });
    }, [allFarmers, filters]);

    // Data processing for charts and stats
    const stats = useMemo(() => {
        const totalApprovedExtent = filteredFarmers.reduce((sum, f) => sum + (f.approvedExtent || 0), 0);
        const totalPlants = filteredFarmers.reduce((sum, f) => sum + (f.numberOfPlants || 0), 0);
        const avgExtent = filteredFarmers.length > 0 ? (totalApprovedExtent / filteredFarmers.length) : 0;
        return {
            totalFarmers: filteredFarmers.length,
            totalApprovedExtent: totalApprovedExtent.toFixed(2),
            totalPlants: totalPlants.toLocaleString(),
            avgExtent: avgExtent.toFixed(2),
        };
    }, [filteredFarmers]);

    const statusDistribution = useMemo(() => {
        const counts = Object.values(FarmerStatus).reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as Record<FarmerStatus, number>);
        filteredFarmers.forEach(f => { counts[f.status]++; });
        const colors = {
            [FarmerStatus.Registered]: '#3b82f6', [FarmerStatus.Sanctioned]: '#f97316',
            [FarmerStatus.Planted]: '#22c55e', [FarmerStatus.PaymentDone]: '#a855f7',
        };
        return Object.entries(counts).map(([label, value]) => ({ label, value, color: colors[label as FarmerStatus] }));
    }, [filteredFarmers]);

    const methodDistribution = useMemo(() => {
        const counts = { [PlantationMethod.Square]: 0, [PlantationMethod.Triangle]: 0 };
        filteredFarmers.forEach(f => { counts[f.methodOfPlantation]++; });
        return [
            { label: 'Square', value: counts.Square, color: '#34d399' },
            { label: 'Triangle', value: counts.Triangle, color: '#fbbf24' },
        ];
    }, [filteredFarmers]);
    
    const genderDistribution = useMemo(() => {
        const counts = { 'Male': 0, 'Female': 0, 'Other': 0 };
        filteredFarmers.forEach(f => { counts[f.gender]++; });
        return [
            { label: 'Male', value: counts.Male, color: '#60a5fa' },
            { label: 'Female', value: counts.Female, color: '#f472b6' },
            { label: 'Other', value: counts.Other, color: '#a78bfa' },
        ];
    }, [filteredFarmers]);

    const extentByMandal = useMemo(() => {
        if (!filters.district) return [];
        const mandalExtents: Record<string, number> = {};
        const districtMandals = GEO_DATA.find(d => d.code === filters.district)?.mandals || [];
        districtMandals.forEach(m => mandalExtents[m.code] = 0);

        filteredFarmers.forEach(f => {
            if (mandalExtents.hasOwnProperty(f.mandal)) {
                mandalExtents[f.mandal] += f.approvedExtent || 0;
            }
        });
        
        const colors = ['#818cf8', '#fb923c', '#4ade80', '#f87171', '#38bdf8', '#fbbf24'];
        return Object.entries(mandalExtents)
            .map(([mandalCode, totalExtent], index) => ({
                label: getGeoName('mandal', { district: filters.district, mandal: mandalCode }),
                value: parseFloat(totalExtent.toFixed(2)),
                color: colors[index % colors.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredFarmers, filters.district]);

    // Pagination for table
    const paginatedFarmers = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredFarmers.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredFarmers, currentPage, rowsPerPage]);
    const totalPages = Math.ceil(filteredFarmers.length / rowsPerPage);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
                        <p className="text-gray-500">Visualize farmer data and gain insights.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                        {/* Filters */}
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">District</label><select name="district" value={filters.district} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md"><option value="">All Districts</option>{GEO_DATA.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Mandal</label><select name="mandal" value={filters.mandal} onChange={handleFilterChange} disabled={!filters.district} className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100"><option value="">All Mandals</option>{mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md"><option value="">All</option>{Object.values(FarmerStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Plantation Method</label><select name="plantationMethod" value={filters.plantationMethod} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md"><option value="">All</option>{Object.values(PlantationMethod).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Reg. Date From</label><input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Reg. Date To</label><input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} min={filters.dateFrom} className="w-full p-2 border border-gray-300 rounded-md" /></div>
                        <div className="lg:col-span-2 flex gap-4"><button onClick={clearFilters} className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold">Clear Filters</button></div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><StatCard title="Total Farmers" value={stats.totalFarmers} /><StatCard title="Total Approved Area (Ac)" value={stats.totalApprovedExtent} /><StatCard title="Total Plants" value={stats.totalPlants} /><StatCard title="Avg. Area / Farmer (Ac)" value={stats.avgExtent} /></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><CustomPieChart title="Farmer Status" data={statusDistribution} /><CustomPieChart title="Plantation Method" data={methodDistribution} /><CustomPieChart title="Gender Distribution" data={genderDistribution} /></div>
                    {filters.district && <CustomBarChart title={`Total Extent by Mandal in ${getGeoName('district', { district: filters.district })}`} data={extentByMandal} />}

                    <div className="bg-white rounded-lg shadow-md">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Filtered Farmer Data</h3>
                            <button onClick={() => exportToExcel(filteredFarmers, 'Filtered_Farmer_Report')} disabled={filteredFarmers.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm disabled:bg-gray-400">Export to Excel</button>
                        </div>
                        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hap ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg. Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved Extent</th></tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedFarmers.map(f => (<tr key={f.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{f.farmerId}</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{f.fullName}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getGeoName('village', f)}, {getGeoName('mandal', f)}</td><td className="px-6 py-4 whitespace-nowrap text-sm">{f.status}</td><td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(f.registrationDate).toLocaleDateString()}</td><td className="px-6 py-4 whitespace-nowrap text-sm">{f.approvedExtent} Ac</td>
                                </tr>))}
                                {filteredFarmers.length === 0 && (<tr><td colSpan={6} className="text-center py-10 text-gray-500">No farmers match the current filter criteria.</td></tr>)}
                            </tbody>
                        </table></div>
                        {totalPages > 1 && (<div className="p-4 border-t flex justify-between items-center">
                            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Previous</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Next</button>
                            </div>
                        </div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
