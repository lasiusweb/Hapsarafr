import React, { useState, useMemo } from 'react';
import { Farmer, FarmerStatus, PlantationMethod } from '../types';
import { GEO_DATA } from '../data/geoData';

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
                )) : <p className="text-gray-500 text-center py-8">No data available.</p>}
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
                <p className="text-gray-500 text-center py-8">No data available.</p>
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
                <div className="flex-1 space-y-2">
                    {segments.map(s => (
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
    const [filters, setFilters] = useState({ district: '', mandal: '' });

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'district') newState.mandal = '';
            return newState;
        });
    };

    const mandals = useMemo(() => {
        if (!filters.district) return [];
        return GEO_DATA.find(d => d.code === filters.district)?.mandals || [];
    }, [filters.district]);

    const filteredFarmers = useMemo(() => {
        return allFarmers.filter(f => {
            if (filters.district && f.district !== filters.district) return false;
            if (filters.mandal && f.mandal !== filters.mandal) return false;
            return true;
        });
    }, [allFarmers, filters]);

    // Data processing for charts
    const statusDistribution = useMemo(() => {
        const counts = Object.values(FarmerStatus).reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as Record<FarmerStatus, number>);
        filteredFarmers.forEach(f => { counts[f.status]++; });
        const colors = {
            [FarmerStatus.Registered]: '#3b82f6',
            [FarmerStatus.Sanctioned]: '#f97316',
            [FarmerStatus.Planted]: '#22c55e',
            [FarmerStatus.PaymentDone]: '#a855f7',
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
    
    const averageExtent = useMemo(() => {
        if (filteredFarmers.length === 0) return 0;
        const total = filteredFarmers.reduce((sum, f) => sum + (f.approvedExtent || 0), 0);
        return (total / filteredFarmers.length).toFixed(2);
    }, [filteredFarmers]);

    const registrationsByMonth = useMemo(() => {
        const monthCounts: Record<string, number> = {};
        const last12Months: string[] = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            last12Months.push(key);
            monthCounts[key] = 0;
        }
        filteredFarmers.forEach(f => {
            const regDate = new Date(f.registrationDate);
            const key = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}`;
            if (monthCounts.hasOwnProperty(key)) {
                monthCounts[key]++;
            }
        });
        return last12Months.map(key => {
            const [year, month] = key.split('-');
            const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' });
            return { label: `${monthName} '${year.slice(2)}`, value: monthCounts[key], color: '#60a5fa' };
        });
    }, [filteredFarmers]);


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
                
                {/* Filter Controls */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">District</label>
                            <select id="district" name="district" value={filters.district} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md">
                                <option value="">All Districts</option>
                                {GEO_DATA.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="mandal" className="block text-sm font-medium text-gray-700 mb-1">Mandal</label>
                            <select id="mandal" name="mandal" value={filters.mandal} onChange={handleFilterChange} disabled={!filters.district} className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100">
                                <option value="">All Mandals</option>
                                {mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Farmers" value={filteredFarmers.length.toLocaleString()} />
                        <StatCard title="Total Approved Area (Ac)" value={filteredFarmers.reduce((sum, f) => sum + (f.approvedExtent || 0), 0).toFixed(2)} />
                        <StatCard title="Total Plants" value={filteredFarmers.reduce((sum, f) => sum + (f.numberOfPlants || 0), 0).toLocaleString()} />
                        <StatCard title="Avg. Area / Farmer (Ac)" value={averageExtent} />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         <CustomBarChart title="Farmer Status Distribution" data={statusDistribution} />
                         <CustomPieChart title="Plantation Method" data={methodDistribution} />
                    </div>

                    <div>
                        <CustomBarChart title="Registrations Over Last 12 Months" data={registrationsByMonth} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;