import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { TenantModel, UserModel, FarmerModel, GroupModel } from '../db';
import { DEFAULT_GROUPS } from '../data/permissionsData';
import { AVATARS } from '../data/avatars';

interface OnboardTenantModalProps {
    onClose: () => void;
    onSave: (data: { orgName: string, adminName: string }) => Promise<void>;
}

const OnboardTenantModal: React.FC<OnboardTenantModalProps> = ({ onClose, onSave }) => {
    const [orgName, setOrgName] = useState('');
    const [adminName, setAdminName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({ orgName, adminName });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Onboard New Tenant</h2></div>
                <div className="p-8 space-y-4">
                    <div>
                        <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">Organization Name</label>
                        <input id="orgName" type="text" value={orgName} onChange={e => setOrgName(e.target.value)} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">First Admin's Name</label>
                        <input id="adminName" type="text" value={adminName} onChange={e => setAdminName(e.target.value)} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        <p className="text-xs text-gray-500 mt-1">This will create an initial administrator account for the new tenant.</p>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300">
                        {isSaving ? 'Saving...' : 'Create Tenant'}
                    </button>
                </div>
            </form>
        </div>
    );
};


const TenantManagementPage: React.FC<{ onBack: () => void; }> = ({ onBack }) => {
    const database = useDatabase();
    
    // Data queries
    const tenants = useQuery(useMemo(() => database.get<TenantModel>('tenants').query(), [database]));
    const users = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    
    // State
    const [showOnboardModal, setShowOnboardModal] = useState(false);

    const tenantStats = useMemo(() => {
        const stats = new Map<string, { userCount: number; farmerCount: number }>();
        users.forEach(user => {
            const stat = stats.get(user.tenantId) || { userCount: 0, farmerCount: 0 };
            stat.userCount++;
            stats.set(user.tenantId, stat);
        });
        farmers.forEach(farmer => {
            const stat = stats.get(farmer.tenantId) || { userCount: 0, farmerCount: 0 };
            stat.farmerCount++;
            stats.set(farmer.tenantId, stat);
        });
        return stats;
    }, [users, farmers]);

    const handleOnboardTenant = async ({ orgName, adminName }: { orgName: string, adminName: string }) => {
        const tenantId = `tenant-${Date.now()}`;
        
        await database.write(async () => {
            // 1. Create Tenant
            await database.get<TenantModel>('tenants').create(t => {
                t._raw.id = tenantId;
                t.name = orgName;
                t.subscriptionStatus = 'trial';
            });

            // 2. Create default groups for this tenant
            const tenantAdminGroup = DEFAULT_GROUPS.find(g => g.id === 'group-admin');
            if (!tenantAdminGroup) throw new Error("Default admin group not found");
            
            const newAdminGroupId = `${tenantAdminGroup.id}-${tenantId}`;

            for (const defaultGroup of DEFAULT_GROUPS) {
                 if (defaultGroup.id === 'group-super-admin') continue; // Don't create super admin group for tenants
                 await database.get<GroupModel>('groups').create(g => {
                    g._raw.id = `${defaultGroup.id}-${tenantId}`;
                    g.name = defaultGroup.name;
                    g.permissionsStr = JSON.stringify(defaultGroup.permissions);
                    g.tenantId = tenantId;
                });
            }

            // 3. Create the tenant admin user
            await database.get<UserModel>('users').create(u => {
                u._raw.id = `user-${Date.now()}`;
                u.name = adminName;
                u.avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
                u.groupId = newAdminGroupId;
                u.tenantId = tenantId;
            });
        });

        alert(`Tenant "${orgName}" created successfully!`);
        setShowOnboardModal(false);
    };

    const handleStatusChange = async (tenant: TenantModel, newStatus: 'active' | 'trial' | 'inactive') => {
        await database.write(async () => {
            // FIX: Cast `tenant` to `any` to call the `update` method. This resolves a TypeScript error where the inherited `update` method from the WatermelonDB Model class was not recognized on the TenantModel type.
            await (tenant as any).update(t => {
                t.subscriptionStatus = newStatus;
            });
        });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Tenant Management</h1>
                        <p className="text-gray-500">Onboard new organizations and manage their status.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Admin Panel
                    </button>
                </div>

                 <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-800">All Tenants ({tenants.length})</h3>
                        <button onClick={() => setShowOnboardModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Onboard New Tenant</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmers</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tenants.map(tenant => {
                                    const stats = tenantStats.get(tenant.id) || { userCount: 0, farmerCount: 0 };
                                    return (
                                        <tr key={tenant.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tenant.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.userCount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.farmerCount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <select value={tenant.subscriptionStatus} onChange={(e) => handleStatusChange(tenant, e.target.value as any)} className="p-1 border border-gray-300 rounded-md bg-white">
                                                    <option value="active">Active</option>
                                                    <option value="trial">Trial</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {tenants.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-10 text-gray-500">No tenants have been onboarded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {showOnboardModal && <OnboardTenantModal onClose={() => setShowOnboardModal(false)} onSave={handleOnboardTenant} />}
        </div>
    );
};

export default TenantManagementPage;