import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { Q } from '@nozbe/watermelondb';
import { FarmerModel } from '../db';

interface AdminDashboardProps {
  currentUser?: any;
}

const ITEMS_PER_PAGE = 20;

export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const database = useDatabase();
  const [farmers, setFarmers] = useState<FarmerModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    loadFarmers();
  }, [database]);

  const loadFarmers = async () => {
    setIsLoading(true);
    try {
      const allFarmers = await database.get<FarmerModel>('farmers').query().fetch();
      setFarmers(allFarmers);
    } catch (error) {
      console.error('Failed to load farmers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFarmers = useMemo(() => {
    let result = farmers;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        (f.fullName || '').toLowerCase().includes(query) ||
        (f.aadhaarNumber || '').includes(query) ||
        (f.mobileNumber || '').includes(query)
      );
    }

    if (statusFilter) {
      result = result.filter(f => f.status === statusFilter);
    }

    if (districtFilter) {
      result = result.filter(f => f.district === districtFilter);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      }
      startDate.setHours(0, 0, 0, 0);
      result = result.filter(f => {
        const regDate = new Date(f.registrationDate || 0);
        return regDate.getTime() >= startDate.getTime();
      });
    }

    return result;
  }, [farmers, searchQuery, statusFilter, districtFilter, dateRange]);

  const paginatedFarmers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFarmers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFarmers, currentPage]);

  const totalPages = Math.ceil(filteredFarmers.length / ITEMS_PER_PAGE);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = farmers.filter(f => {
      const regDate = new Date(f.registrationDate || 0);
      return regDate.getTime() >= today.getTime();
    }).length;

    const pendingSync = farmers.filter(f => (f as any).syncStatus === 'pending').length;

    const statusCounts: Record<string, number> = {};
    farmers.forEach(f => {
      statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
    });

    return {
      total: farmers.length,
      today: todayCount,
      pendingSync,
      byStatus: statusCounts,
    };
  }, [farmers]);

  const districtData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredFarmers.forEach(f => {
      if (f.district) {
        counts[f.district] = (counts[f.district] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredFarmers]);

  const statusData = useMemo(() => {
    return Object.entries(stats.byStatus).map(([label, value]) => ({
      label,
      value,
    }));
  }, [stats.byStatus]);

  const exportToCSV = () => {
    const headers = ['Full Name', 'Aadhaar', 'Mobile', 'District', 'Mandal', 'Village', 'Status', 'Registration Date', 'Sync Status'];
    const rows = filteredFarmers.map(f => [
      f.fullName || '',
      f.aadhaarNumber || '',
      f.mobileNumber || '',
      f.district || '',
      f.mandal || '',
      f.village || '',
      f.status || '',
      f.registrationDate || '',
      (f as any).syncStatus || '',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farmers_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Farmers</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Registered Today</p>
              <p className="text-2xl font-bold">{stats.today}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${stats.pendingSync > 0 ? 'border-yellow-500' : 'border-green-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Sync</p>
              <p className="text-2xl font-bold">{stats.pendingSync}</p>
            </div>
            <div className={`h-12 w-12 ${stats.pendingSync > 0 ? 'bg-yellow-100' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
              <svg className={`h-6 w-6 ${stats.pendingSync > 0 ? 'text-yellow-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Area (Acres)</p>
              <p className="text-2xl font-bold">{farmers.reduce((sum, f) => sum + (f.appliedExtent || 0), 0).toFixed(2)}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Status & District Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Farmers by Status</h3>
          <div className="space-y-3">
            {statusData.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    item.label === 'Registered' ? 'bg-blue-500' :
                    item.label === 'Sanctioned' ? 'bg-orange-500' :
                    item.label === 'Planted' ? 'bg-green-500' : 'bg-purple-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
            {statusData.length === 0 && <p className="text-gray-500 text-center py-4">No data</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Districts</h3>
          <div className="space-y-2">
            {districtData.slice(0, 6).map((item, idx) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-6">{idx + 1}.</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full mt-1">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${(item.value / (districtData[0]?.value || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {districtData.length === 0 && <p className="text-gray-500 text-center py-4">No data</p>}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name, aadhaar, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Status</option>
            <option value="Registered">Registered</option>
            <option value="Sanctioned">Sanctioned</option>
            <option value="Planted">Planted</option>
            <option value="PaymentDone">Payment Done</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
          </select>
        </div>
      </div>

      {/* Farmer List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aadhaar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">District</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedFarmers.map((farmer) => (
                <tr key={farmer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {farmer.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {farmer.aadhaarNumber ? `****${farmer.aadhaarNumber.slice(-4)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {farmer.mobileNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {farmer.district || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      farmer.status === 'Registered' ? 'bg-blue-100 text-blue-800' :
                      farmer.status === 'Sanctioned' ? 'bg-orange-100 text-orange-800' :
                      farmer.status === 'Planted' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {farmer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      (farmer as any).syncStatus === 'synced' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {(farmer as any).syncStatus || 'pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {farmer.registrationDate ? new Date(farmer.registrationDate).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
              {paginatedFarmers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No farmers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredFarmers.length)} of {filteredFarmers.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;