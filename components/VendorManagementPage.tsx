

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
    const [selectedVendor, setSelectedVendor] = useState<VendorModel | null>(null);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    
    // Data query for vendors.
    const vendors = useQuery(useMemo(() => 
        database.get<VendorModel>('vendors').query(Q.sortBy('name', Q.asc)), 
    [database]));

    const handleVerifyClick = (vendor: VendorModel) => {
        setSelectedVendor(vendor);
        setIsVerifyModalOpen(true);
    };

    const handleApproveVerification = async () => {
        if (!selectedVendor) return;
        try {
            await database.write(async () => {
                await selectedVendor.update(v => {
                    v.status = VendorStatus.Verified;
                });
            });
            setNotification({ message: `Vendor ${selectedVendor.name} Verified.`, type: 'success' });
            setIsVerifyModalOpen(false);
            setSelectedVendor(null);
        } catch (e) {
            console.error(e);
            setNotification({ message: 'Failed to verify vendor.', type: 'error' });
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Partner & Vendor Management</h1>
                        <p className="text-gray-500">Ecosystem Ethics Board: Onboard and verify partners.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Admin Panel
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">All Partners ({vendors.length})</h2>
                        <button disabled className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md font-semibold text-sm cursor-not-allowed" title="Coming Soon">+ Add New Partner</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                                {vendors.map(vendor => (
                                    <tr key={vendor.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.sellerType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{vendor.contactPerson}</div>
                                            <div>{vendor.mobileNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><VendorStatusBadge status={vendor.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {vendor.status === VendorStatus.Pending && (
                                                <button onClick={() => handleVerifyClick(vendor)} className="text-blue-600 hover:text-blue-900 font-semibold">Verify KYC</button>
                                            )}
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

            {isVerifyModalOpen && selectedVendor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Verify Partner: {selectedVendor.name}</h2></div>
                        <div className="p-8 space-y-4">
                            <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-sm text-yellow-800">
                                <strong>Physical Verification Required:</strong> Ensure a Field Officer has visited the premises and verified the business license.
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700">Submitted Documents (Mock):</p>
                                <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                    <li>Business License (Valid)</li>
                                    <li>GST Registration (Verified)</li>
                                    <li>Shop Photo (Geo-tagged)</li>
                                </ul>
                            </div>
                        </div>
                        <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                            <button onClick={() => setIsVerifyModalOpen(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                            <button onClick={handleApproveVerification} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">Approve & Verify</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorManagementPage;
