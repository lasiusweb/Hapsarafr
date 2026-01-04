






import React, { useMemo, useState, useEffect } from 'react';
import { Farmer, FarmerStatus, Filters } from '../types';
import { GEO_DATA } from '../data/geoData';
import { useDatabase } from '../DatabaseContext';
import { ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { getMockWeatherData } from '../lib/climateEngine';
import DataMenu from './DataMenu';

// Import extracted UI components
import StatCard from './ui/StatCard';
import ActionCard from './ui/ActionCard';
import InteractiveBarChart from './ui/InteractiveBarChart';
import InteractivePieChart from './ui/InteractivePieChart';
import IntellectusAlerts from './IntellectusAlerts';


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
            .sort((a, b) => b.value - a.value);
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
                <div className="flex items-center gap-4"><h2 className="text-lg font-semibold text-gray-700">Overall Statistics</h2><DataMenu /></div>
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
