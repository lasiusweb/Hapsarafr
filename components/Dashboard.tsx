import React, { useMemo } from 'react';
import { Farmer, FarmerStatus, Filters } from '../types';
import { GEO_DATA } from '../data/geoData';

interface DashboardProps {
    farmers: Farmer[];
    onNavigateWithFilter: (view: 'farmer-directory', filters: Partial<Omit<Filters, 'searchQuery'>>) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-6">
        <div className="bg-green-100 p-4 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const CHART_COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#fb923c'];

const InteractiveBarChart: React.FC<{ title: string, data: { code: string; label: string; value: number }[], onBarClick: (code: string) => void }> = ({ title, data, onBarClick }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid division by zero
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
            <div className="space-y-4">
                {data.length > 0 ? data.map((item, index) => (
                    <div key={item.label} onClick={() => onBarClick(item.code)} className="cursor-pointer group">
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="font-medium text-gray-600 group-hover:text-green-600">{item.label}</span>
                            <span className="font-semibold text-gray-800">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="h-3 rounded-full transition-all duration-300 group-hover:opacity-80"
                                style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            ></div>
                        </div>
                    </div>
                )) : (
                    <p className="text-gray-500 text-center py-8">No data available to display.</p>
                )}
            </div>
        </div>
    );
};

const InteractivePieChart: React.FC<{ title: string, data: { label: string, value: number, color: string }[], onSliceClick: (label: string) => void }> = ({ title, data, onSliceClick }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-gray-500 text-center py-8">No data to display.</p>
                </div>
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
                    className="w-32 h-32 rounded-full flex-shrink-0"
                    style={{ background: `conic-gradient(${conicGradient})` }}
                    role="img"
                    aria-label={`Pie chart for ${title}`}
                ></div>
                <div className="flex-1 space-y-2 w-full">
                    {segments.filter(s => s.value > 0).map(s => (
                        <button key={s.label} onClick={() => onSliceClick(s.label)} className="w-full flex items-center justify-between text-sm p-1 rounded-md hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></span>
                                <span className="text-gray-600">{s.label}</span>
                            </div>
                            <span className="font-semibold text-gray-800">{s.value} <span className="text-gray-500 font-normal">({s.percent.toFixed(1)}%)</span></span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ farmers, onNavigateWithFilter }) => {
    const stats = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const newThisMonth = farmers.filter(f => new Date(f.registrationDate).getTime() >= firstDayOfMonth).length;
        const totalExtent = farmers.reduce((sum, f) => sum + (f.approvedExtent || 0), 0);
        return {
            totalFarmers: farmers.length.toLocaleString(),
            newThisMonth: newThisMonth.toLocaleString(),
            totalExtent: totalExtent.toFixed(2),
        };
    }, [farmers]);

    const districtData = useMemo(() => {
        const counts: Record<string, number> = {};
        farmers.forEach(f => {
            counts[f.district] = (counts[f.district] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([code, value]) => ({
                code,
                label: GEO_DATA.find(geo => geo.code === code)?.name || code,
                value
            }))
            .sort((a,b) => b.value - a.value);
    }, [farmers]);
    
    const statusData = useMemo(() => {
        const counts = Object.values(FarmerStatus).reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as Record<FarmerStatus, number>);
        farmers.forEach(f => { counts[f.status]++; });
        const colors: Record<FarmerStatus, string> = {
            [FarmerStatus.Registered]: '#3b82f6',
            [FarmerStatus.Sanctioned]: '#f97316',
            [FarmerStatus.Planted]: '#22c55e',
            [FarmerStatus.PaymentDone]: '#a855f7',
        };
        return Object.entries(counts).map(([label, value]) => ({ label, value, color: colors[label as FarmerStatus] }));
    }, [farmers]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Farmers"
                    value={stats.totalFarmers}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <StatCard 
                    title="New this Month"
                    value={stats.newThisMonth}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />
                <StatCard 
                    title="Total Area (Acres)"
                    value={stats.totalExtent}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM15.116 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM5.337 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM17.663 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InteractivePieChart 
                    title="Farmer Status" 
                    data={statusData}
                    onSliceClick={(status) => onNavigateWithFilter('farmer-directory', { status })}
                />
                <InteractiveBarChart 
                    title="Farmers by District" 
                    data={districtData} 
                    onBarClick={(districtCode) => onNavigateWithFilter('farmer-directory', { district: districtCode })}
                />
            </div>
        </div>
    );
};

export default Dashboard;
