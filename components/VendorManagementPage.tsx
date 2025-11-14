import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { VendorModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, VendorStatus } from '../types';

interface VendorManagementPageProps {
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const VendorStatusBadge: React.FC<{ status: VendorStatus }> = ({ status }) => {
    const colors: Record<VendorStatus, string> = {
        [VendorStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [VendorStatus.Verified]: 'bg-green-100 text-green-800',
        [VendorStatus.Suspended]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
};


const VendorManagementPage: React.FC<VendorManagementPageProps> = ({ onBack, currentUser, setNotification }) => {
    const database = useDatabase();
    
    // Data query for vendors.
    const vendors = useQuery(useMemo(() => 
        database.get<VendorModel>('vendors').query(Q.sortBy('name', Q.asc)), 
    [database]));

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Vendor Management</h1>
                        <p className="text-gray-500">Onboard, verify, and manage marketplace vendors.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Admin Panel
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">All Vendors ({vendors.length})</h2>
                        <button disabled className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md font-semibold text-sm cursor-not-allowed" title="Coming Soon">+ Add New Vendor</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                                {vendors.map(vendor => (
                                    <tr key={vendor.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{vendor.contactPerson}</div>
                                            <div>{vendor.mobileNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.address}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><VendorStatusBadge status={vendor.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button disabled className="text-gray-400 cursor-not-allowed">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                                 {vendors.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-10 text-gray-500">No vendors onboarded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default VendorManagementPage;
