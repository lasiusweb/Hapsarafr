import React, { useState, useMemo, useEffect } from 'react';
import { User, Group, Permission } from '../types';
import { PERMISSIONS_LIST } from '../data/permissionsData';
import CustomSelect from './CustomSelect';

interface AdminPageProps {
    users: User[];
    groups: Group[];
    currentUser: User;
    onSaveUsers: (updatedUsers: User[]) => Promise<void>;
    onSaveGroups: (updatedGroups: Group[]) => Promise<void>;
    onBack: () => void;
    onNavigate: (view: 'content-manager' | 'geo-management' | 'schema-manager' | 'tenant-management' | 'resource-management' | 'territory-management') => void;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const SUPER_ADMIN_GROUP_ID = 'group-super-admin';

const AdminCard: React.FC<{ title: string; description: string; onClick: () => void; icon: React.ReactNode; }> = ({ title, description, onClick, icon }) => (
    <button onClick={onClick} className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md hover:border-green-300 border border-transparent transition-all text-left w-full flex items-start gap-4">
        <div className="bg-green-100 p-3 rounded-lg flex-shrink-0">
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-gray-800">{title}</h4>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
    </button>
);


const AdminPage: React.FC<AdminPageProps> = ({ users, groups, currentUser, onSaveUsers, onSaveGroups, onBack, onNavigate, setNotification }) => {
    const permissions = useMemo(() => {
        const userGroup = groups.find(g => g.id === currentUser.groupId);
        return new Set(userGroup?.permissions || []);
    }, [currentUser.groupId, groups]);

    const canManageUsers = permissions.has(Permission.CAN_MANAGE_USERS);
    const canManageGroups = permissions.has(Permission.CAN_MANAGE_GROUPS);
    const isSuperAdmin = currentUser.groupId === SUPER_ADMIN_GROUP_ID;

    const [activeTab, setActiveTab] = useState<'users' | 'groups'>(canManageUsers ? 'users' : 'groups');
    const [editedUsers, setEditedUsers] = useState<User[]>(users);
    const [editedGroups, setEditedGroups] = useState<Group[]>(groups);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groups[0]?.id || null);

    useEffect(() => {
        setEditedUsers(users);
    }, [users]);

    useEffect(() => {
        setEditedGroups(groups);
        if (selectedGroupId && !groups.some(g => g.id === selectedGroupId)) {
            setSelectedGroupId(groups[0]?.id || null);
        }
    }, [groups, selectedGroupId]);
    
    // Filter out super admins from view if the current user is not a super admin
    const visibleUsers = useMemo(() => isSuperAdmin ? editedUsers : editedUsers.filter(u => u.groupId !== SUPER_ADMIN_GROUP_ID), [editedUsers, isSuperAdmin]);
    const visibleGroups = useMemo(() => isSuperAdmin ? editedGroups : editedGroups.filter(g => g.id !== SUPER_ADMIN_GROUP_ID), [editedGroups, isSuperAdmin]);
    const assignableGroups = useMemo(() => isSuperAdmin ? groups : groups.filter(g => g.id !== SUPER_ADMIN_GROUP_ID), [groups, isSuperAdmin]);
    const assignableGroupOptions = useMemo(() => assignableGroups.map(g => ({ value: g.id, label: g.name })), [assignableGroups]);


    const selectedGroup = useMemo(() => editedGroups.find(g => g.id === selectedGroupId) || null, [editedGroups, selectedGroupId]);

    const handleUserGroupChange = (userId: string, newGroupId: string) => {
        setEditedUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, groupId: newGroupId } : u));
    };

    const handleSaveChanges = async () => {
        try {
            await Promise.all([
                onSaveUsers(editedUsers),
                onSaveGroups(editedGroups)
            ]);
            setNotification({ message: 'Changes saved successfully!', type: 'success' });
        } catch (error) {
            console.error("Failed to save changes:", error);
            setNotification({ message: 'Failed to save changes. Please try again.', type: 'error' });
        }
    };
    
    const handleGroupNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedGroup) return;
        const newName = e.target.value;
        setEditedGroups(prev => prev.map(g => g.id === selectedGroupId ? {...g, name: newName} : g));
    };
    
    const handlePermissionChange = (permission: Permission, isChecked: boolean) => {
        if (!selectedGroup) return;
        setEditedGroups(prev => prev.map(g => {
            if (g.id === selectedGroupId) {
                const newPermissions = isChecked
                    ? [...g.permissions, permission]
                    : g.permissions.filter(p => p !== permission);
                return {...g, permissions: newPermissions};
            }
            return g;
        }));
    };
    
    const handleAddNewGroup = () => {
        const newGroupId = `group-${Date.now()}`;
        const newGroup: Group = { id: newGroupId, name: 'New Group', permissions: [], tenantId: currentUser.tenantId };
        setEditedGroups(prev => [...prev, newGroup]);
        setSelectedGroupId(newGroupId);
    };

    const handleDeleteGroup = () => {
        if (!selectedGroup || selectedGroup.id === SUPER_ADMIN_GROUP_ID) return;
        if (editedUsers.some(u => u.groupId === selectedGroupId)) {
            alert("Cannot delete a group that has users assigned to it.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete the "${selectedGroup.name}" group? This cannot be undone.`)) {
            setEditedGroups(prev => prev.filter(g => g.id !== selectedGroupId));
            setSelectedGroupId(editedGroups[0]?.id || null);
        }
    };
    
    const permissionCategories = useMemo(() => {
        const initialValue: Record<string, { id: Permission; description: string; category: string; }[]> = {};
        return PERMISSIONS_LIST.reduce((acc, p) => {
            const category = p.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(p);
            return acc;
        }, initialValue);
    }, []);
    

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                         <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
                         <p className="text-gray-500">Manage users, permissions, and system settings.</p>
                    </div>
                     <div className="flex items-center gap-4 flex-shrink-0">
                         <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                             </svg>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-xl p-2">
                    <div className="flex border-b">
                        {canManageUsers && <button onClick={() => setActiveTab('users')} className={`px-4 py-3 font-semibold ${activeTab === 'users' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>User Management</button>}
                        {canManageGroups && <button onClick={() => setActiveTab('groups')} className={`px-4 py-3 font-semibold ${activeTab === 'groups' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Group Management</button>}
                    </div>

                    <div className="p-6">
                        {activeTab === 'users' && canManageUsers && (
                            <div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Group</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {visibleUsers.map(user => (
                                                <tr key={user.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <CustomSelect
                                                            value={user.groupId}
                                                            onChange={value => handleUserGroupChange(user.id, value)}
                                                            options={assignableGroupOptions}
                                                            disabled={user.id === currentUser.id && (user.groupId === 'group-admin' || user.groupId === SUPER_ADMIN_GROUP_ID)}
                                                            className="w-full max-w-xs"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {activeTab === 'groups' && canManageGroups && (
                            <div className="flex gap-8">
                                <div className="w-1/3">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold">Groups</h3>
                                        <button onClick={handleAddNewGroup} className="text-sm text-green-600 font-semibold hover:underline">+ New</button>
                                    </div>
                                    <ul className="border rounded-md divide-y">
                                        {visibleGroups.map(g => (
                                            <li key={g.id}>
                                                <button onClick={() => setSelectedGroupId(g.id)} className={`w-full text-left p-3 ${selectedGroupId === g.id ? 'bg-green-100 font-semibold' : 'hover:bg-gray-50'}`}>
                                                    {g.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="w-2/3">
                                    {selectedGroup ? (
                                        <div>
                                            <h3 className="font-semibold text-lg mb-4">Edit Group: {selectedGroup.name}</h3>
                                            <div className="space-y-6">
                                                <div>
                                                    <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">Group Name</label>
                                                    <input id="groupName" type="text" value={selectedGroup.name} onChange={handleGroupNameChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions</h4>
                                                    <div className="space-y-4">
                                                        {Object.entries(permissionCategories).map(([category, perms]) => (
                                                            <div key={category}>
                                                                <p className="font-semibold text-gray-600 text-sm mb-2">{category}</p>
                                                                <div className="space-y-2 pl-2">
                                                                {(perms as any[]).map(p => (
                                                                    <label key={p.id} className="flex items-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedGroup.permissions.includes(p.id)}
                                                                            onChange={e => handlePermissionChange(p.id, e.target.checked)}
                                                                            className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                                        />
                                                                        <span className="ml-2 text-sm text-gray-800">{p.description}</span>
                                                                    </label>
                                                                ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                {selectedGroup.id !== 'group-admin' && (
                                                    <div className="text-right">
                                                        <button onClick={handleDeleteGroup} className="text-red-600 hover:underline text-sm font-semibold">Delete Group</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500 pt-10">Select a group to edit or create a new one.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg mt-4">
                         {(canManageUsers || canManageGroups) && <button onClick={handleSaveChanges} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Save All Changes</button>}
                    </div>
                </div>

                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Advanced Management</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AdminCard title="Territory Management" description="Define operational jurisdictions for your organization and field officers." onClick={() => onNavigate('territory-management')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5.05l.002.001a12.017 12.017 0 01-1.066 2.592A12.025 12.025 0 001.12 10c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016l-.002-.001A11.954 11.954 0 0110 1.944zM9 13.098l-3.33-3.196a.75.75 0 011.038-1.084l2.302 2.21 4.47-4.782a.75.75 0 011.096 1.026L9 13.098z" clipRule="evenodd" /></svg>} />
                        <AdminCard title="Content Manager" description="Edit content for the landing page, help modal, and privacy policy." onClick={() => onNavigate('content-manager')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>} />
                        <AdminCard title="Geo Management" description="Add, edit, or remove districts, mandals, and villages." onClick={() => onNavigate('geo-management')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>} />
                        <AdminCard title="Schema Manager" description="Define custom data fields for the farmer registration form." onClick={() => onNavigate('schema-manager')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>} />
                        <AdminCard title="Resource Definitions" description="Manage inventory items like saplings and fertilizer for distribution." onClick={() => onNavigate('resource-management')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>} />
                         {isSuperAdmin && <AdminCard title="Tenant Management" description="Onboard new organizations and manage their subscription status." onClick={() => onNavigate('tenant-management')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>} />}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminPage;