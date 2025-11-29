






import React, { useMemo, useState, useEffect } from 'react';
import { Farmer, FarmerStatus, Filters } from '../types';
import { GEO_DATA } from '../data/geoData';
import { useDatabase } from '../DatabaseContext';
import { ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { getMockWeatherData } from '../lib/climateEngine';

interface DashboardProps {
    farmers: Farmer[];
    onNavigateWithFilter: (view: 'farmer-directory', filters: Partial<Omit<Filters, 'searchQuery' | 'registrationDateFrom' | 'registrationDateTo'>>) => void;
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

const ActionCard: React.FC<{ title: string; count: number; onClick: () => void; icon: React.ReactNode; }> = ({ title, count, onClick, icon }) => (
    <button onClick={onClick} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:border-green-300 border border-transparent transition-all text-left w-full flex items-start gap-4">
        <div className="bg-green-100 p-3 rounded-lg flex-shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800">{count}</p>
            <p className="font-semibold text-gray-600">{title}</p>
        </div>
    </button>
);


const CHART_COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#fb923c'];

const InteractiveBarChart: React.FC<{ title: string, data: { code: string; label: string; value: number }[], onBarClick: (code: string) => void }> = ({ title, data, onBarClick }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid division by zero
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full">
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

const IntellectusAlerts: React.FC = () => {
    const database = useDatabase();
    const [alerts, setAlerts] = useState<{ type: 'PEST' | 'WEATHER', title: string, desc: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAlerts = async () => {
            setLoading(true);
            const newAlerts: { type: 'PEST' | 'WEATHER', title: string, desc: string }[] = [];

            // 1. Weather Check (Mocked)
            const weather = getMockWeatherData();
            if (weather.tempMax > 38) {
                newAlerts.push({ type: 'WEATHER', title: 'Extreme Heat Warning', desc: `Temps hitting ${weather.tempMax.toFixed(1)}°C. Advise farmers to irrigate young palms immediately.` });
            }

            // 2. Pest Outbreak Check (Scan logs)
            try {
                // Fetch recent logs with metadata (scan results)
                const recentScans = await database.get<ActivityLogModel>('activity_logs').query(
                    Q.where('activity_type', 'CROP_HEALTH_SCAN_COMPLETED'),
                    Q.sortBy('created_at', 'desc'),
                    Q.take(50) // Limit to last 50 scans for performance
                ).fetch();
                
                const diagnosisCounts: Record<string, number> = {};
                
                recentScans.forEach(log => {
                    if (log.metadataJson) {
                        try {
                            const meta = JSON.parse(log.metadataJson);
                            if (meta.diagnosis && meta.diagnosis !== 'Healthy' && meta.severity !== 'LOW') {
                                diagnosisCounts[meta.diagnosis] = (diagnosisCounts[meta.diagnosis] || 0) + 1;
                            }
                        } catch (e) {}
                    }
                });

                // Threshold: 3 or more scans of same disease implies outbreak risk
                Object.entries(diagnosisCounts).forEach(([disease, count]) => {
                    if (count >= 3) {
                        newAlerts.push({ 
                            type: 'PEST', 
                            title: `Potential ${disease} Outbreak`, 
                            desc: `${count} severe cases reported recently. Consider issuing a directive.` 
                        });
                    }
                });

            } catch (e) {
                console.error("Failed to check pest logs", e);
            }

            setAlerts(newAlerts);
            setLoading(false);
        };
        checkAlerts();
    }, [database]);

    if (loading || alerts.length === 0) return null;

    return (
        <div className="mb-6 grid gap-4">
            {alerts.map((alert, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-l-4 shadow-sm flex items-start gap-4 ${alert.type === 'PEST' ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'}`}>
                    <div className={`p-2 rounded-full ${alert.type === 'PEST' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h4 className={`font-bold ${alert.type === 'PEST' ? 'text-red-800' : 'text-orange-800'}`}>{alert.title}</h4>
                        <p className="text-sm text-gray-700 mt-1">{alert.desc}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ farmers, onNavigateWithFilter }) => {
    const [dateRange, setDateRange] = useState<'all' | 'month' | 'week'>('all');

    const filteredFarmersByDate = useMemo(() => {
        if (dateRange === 'all') return farmers;
        const now = new Date();
        let startDate: Date;
        if (dateRange === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else { // 'week'
            startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        }
        startDate.setHours(0, 0, 0, 0);
        return farmers.filter(f => new Date(f.registrationDate).getTime() >= startDate.getTime());
    }, [farmers, dateRange]);


    const stats = useMemo(() => {
        const totalExtent = farmers.reduce((sum, f) => sum + (f.approvedExtent || 0), 0);
        return {
            totalFarmers: farmers.length.toLocaleString(),
            newInRange: filteredFarmersByDate.length.toLocaleString(),
            totalExtent: totalExtent.toFixed(2),
        };
    }, [farmers, filteredFarmersByDate]);
    
    const quickLinks = useMemo(() => {
        const pendingSanction = farmers.filter(f => f.status === FarmerStatus.Registered).length;
        const pendingPlantation = farmers.filter(f => f.status === FarmerStatus.Sanctioned).length;
        const unverifiedAccounts = farmers.filter(f => f.bankAccountNumber && !f.accountVerified).length;
        
        return { pendingSanction, pendingPlantation, unverifiedAccounts };
    }, [farmers]);

    const districtData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredFarmersByDate.forEach(f => {
            counts[f.district] = (counts[f.district] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([code, value]) => ({
                code,
                label: GEO_DATA.find(geo => geo.code === code)?.name || code,
                value
            }))
            .sort((a,b) => b.value - a.value);
    }, [filteredFarmersByDate]);
    
    const statusData = useMemo(() => {
        const counts = Object.values(FarmerStatus).reduce((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {} as Record<FarmerStatus, number>);
        
        filteredFarmersByDate.forEach(f => { counts[f.status as FarmerStatus]++; });
        
        const colors: Record<FarmerStatus, string> = {
            [FarmerStatus.Registered]: '#3b82f6',
            [FarmerStatus.Sanctioned]: '#f97316',
            [FarmerStatus.Planted]: '#22c55e',
            [FarmerStatus.PaymentDone]: '#a855f7',
        };
        return Object.entries(counts).map(([label, value]) => ({ label, value, color: colors[label as FarmerStatus] }));
    }, [filteredFarmersByDate]);
    
    const DateRangeButton: React.FC<{ range: 'all' | 'month' | 'week', text: string }> = ({ range, text }) => {
        const isActive = dateRange === range;
        return (
            <button
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 text-sm font-semibold rounded-md ${isActive ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
                {text}
            </button>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-700">Overall Statistics</h2>
                <div className="flex items-center gap-2">
                    <DateRangeButton range="week" text="This Week" />
                    <DateRangeButton range="month" text="This Month" />
                    <DateRangeButton range="all" text="All Time" />
                </div>
            </div>
            
            <IntellectusAlerts />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Farmers"
                    value={stats.totalFarmers}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <StatCard 
                    title={`New Farmers (${dateRange === 'all' ? 'All Time' : 'This ' + dateRange})`}
                    value={stats.newInRange}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />
                <StatCard 
                    title="Total Area (Acres)"
                    value={stats.totalExtent}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM15.116 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM5.337 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM17.663 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
            </div>

            <div className="border-t pt-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Links</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ActionCard 
                        title="Pending Sanction"
                        count={quickLinks.pendingSanction}
                        onClick={() => onNavigateWithFilter('farmer-directory', { status: FarmerStatus.Registered })}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <ActionCard 
                        title="Awaiting Plantation"
                        count={quickLinks.pendingPlantation}
                        onClick={() => onNavigateWithFilter('farmer-directory', { status: FarmerStatus.Sanctioned })}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <ActionCard 
                        title="Unverified Bank Accounts"
                        count={quickLinks.unverifiedAccounts}
                        onClick={() => onNavigateWithFilter('farmer-directory', {})} // No simple filter for this, but can still navigate
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                    />
                </div>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t">
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
