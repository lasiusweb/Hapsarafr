import React, { useState, useMemo } from 'react';
import { TaskModel, UserModel, FarmerModel, ResourceDistributionModel } from '../db';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { Q } from '@nozbe/watermelondb';
import { TaskStatus } from '../types';

interface PerformanceAnalyticsPageProps {
    onBack: () => void;
}

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
);

const PerformanceAnalyticsPage: React.FC<PerformanceAnalyticsPageProps> = ({ onBack }) => {
    const database = useDatabase();
    const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'all'>('month');

    // Data fetching
    const allTasks = useQuery(useMemo(() => database.get<TaskModel>('tasks').query(), [database]));
    const allUsers = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));
    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const allDistributions = useQuery(useMemo(() => database.get<ResourceDistributionModel>('resource_distributions').query(), [database]));

    // Memoized data processing
    const { filteredFarmers, filteredTasks, filteredDistributions } = useMemo(() => {
        const now = new Date();
        let startDate = new Date(0); // 'all' time
        if (dateRange === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (dateRange === 'quarter') {
            const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        }

        const filterByDate = (items: any[], dateField: string) => items.filter(item => new Date(item[dateField]).getTime() >= startDate.getTime());

        return {
            filteredFarmers: filterByDate(allFarmers, 'createdAt'),
            filteredTasks: filterByDate(allTasks, 'createdAt'),
            filteredDistributions: filterByDate(allDistributions, 'distributionDate'),
        };
    }, [allTasks, allFarmers, allDistributions, dateRange]);

    const stats = useMemo(() => ({
        farmersRegistered: filteredFarmers.length,
        tasksCompleted: filteredTasks.filter(t => t.status === TaskStatus.Done).length,
        resourcesDistributed: filteredDistributions.length,
    }), [filteredFarmers, filteredTasks, filteredDistributions]);

    const leaderboardData = useMemo(() => {
        return allUsers
            .filter(user => user.groupId !== 'group-super-admin')
            .map(user => {
                const registrations = filteredFarmers.filter(f => f.createdBy === user.id).length;
                const tasksCompleted = filteredTasks.filter(t => t.assigneeId === user.id && t.status === TaskStatus.Done).length;
                const resourcesDistributed = filteredDistributions.filter(d => d.createdBy === user.id).length;
                return {
                    user,
                    registrations,
                    tasksCompleted,
                    resourcesDistributed,
                    score: registrations * 3 + tasksCompleted * 2 + resourcesDistributed,
                };
            })
            .sort((a, b) => b.score - a.score);
    }, [filteredFarmers, filteredTasks, filteredDistributions, allUsers]);

    const DateRangeButton: React.FC<{ range: 'month' | 'quarter' | 'all', text: string }> = ({ range, text }) => (
        <button onClick={() => setDateRange(range)} className={`px-3 py-1 text-sm font-semibold rounded-md ${dateRange === range ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {text}
        </button>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Performance Analytics</h1>
                        <p className="text-gray-500">Track key performance indicators for your team.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <DateRangeButton range="month" text="This Month" />
                            <DateRangeButton range="quarter" text="This Quarter" />
                            <DateRangeButton range="all" text="All Time" />
                        </div>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                           Back
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard title="Farmers Registered" value={stats.farmersRegistered} />
                    <StatCard title="Tasks Completed" value={stats.tasksCompleted} />
                    <StatCard title="Resources Distributed" value={stats.resourcesDistributed} />
                </div>
                
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b">
                        <h3 className="text-xl font-bold text-gray-800">Field Officer Leaderboard</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Officer</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Registrations</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tasks Completed</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Resources Given</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {leaderboardData.map((data, index) => (
                                    <tr key={data.user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img className="h-10 w-10 rounded-full" src={data.user.avatar} alt="" />
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{data.user.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-center font-semibold">{data.registrations}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-center font-semibold">{data.tasksCompleted}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-center font-semibold">{data.resourcesDistributed}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceAnalyticsPage;
