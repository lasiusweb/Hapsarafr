import React, { useState, useMemo, useEffect } from 'react';
// FIX: Remove unused Invitation type, which is obsolete.
import { User, Group, Permission } from '../types';
import { PERMISSIONS_LIST } from '../data/permissionsData';
// FIX: Remove unused InvitationModal import, which is obsolete.
import CustomSelect from './CustomSelect';

interface AdminPageProps {
    users: User[];
    groups: Group[];
    currentUser: User;
    onSaveUsers: (updatedUsers: User[]) => Promise<void>;
    onSaveGroups: (updatedGroups: Group[]) => Promise<void>;
    onBack: () => void;
    // FIX: Remove obsolete invitation props.
    onNavigate: (view: 'content-manager' | 'geo-management' | 'schema-manager' | 'tenant-management') => void;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const SUPER_ADMIN_GROUP_ID = 'group-super-admin';

// FIX: Remove obsolete invitation props.
const AdminPage: React.FC<AdminPageProps> = ({ users, groups, currentUser, onSaveUsers, onSaveGroups, onBack, onNavigate, setNotification }) => {
    const permissions = useMemo(() => {
        const userGroup = groups.find(g => g.id === currentUser.groupId);
        return new Set(userGroup?.permissions || []);
    }, [currentUser.groupId, groups]);

    const canManageUsers = permissions.has(Permission.CAN_MANAGE_USERS);
    const canManageGroups = permissions.has(Permission.CAN_MANAGE_GROUPS);
    // FIX: Remove unused canInvite constant.
    const isSuperAdmin = currentUser.groupId === SUPER_ADMIN_GROUP_ID;

    const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'system'>(isSuperAdmin ? 'system' : canManageUsers ? 'users' : 'groups');
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
    
    // FIX: Remove obsolete invitation-related state.

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
    
    // FIX: Remove obsolete handleInviteSubmit function.

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
    
    const SystemManagementTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button onClick={() => onNavigate('content-manager')} className="block p-6 bg-gray-50 hover:bg-gray-100 rounded-lg border text-left transition-colors">
                <h4 className="font-bold text-gray-800">Manage Site Content</h4>
                <p className="text-sm text-gray-600 mt-1">Edit the landing page, FAQs, and privacy policy.</p>
            </button>
            <button onClick={() => onNavigate('geo-management')} className="block p-6 bg-gray-50 hover:bg-gray-100 rounded-lg border text-left transition-colors">
                <h4 className="font-bold text-gray-800">Manage Geography</h4>
                <p className="text-sm text-gray-600 mt-1">Add, edit, or remove districts, mandals, and villages.</p>
            </button>
            <button onClick={() => onNavigate('schema-manager')} className="block p-6 bg-gray-50 hover:bg-gray-100 rounded-lg border text-left transition-colors">
                <h4 className="font-bold text-gray-800">Schema & Form Manager</h4>
                <p className="text-sm text-gray-600 mt-1">Add new fields and create dynamic forms for data entry.</p>
            </button>
            <button onClick={() => onNavigate('tenant-management')} className="block p-6 bg-gray-50 hover:bg-gray-100 rounded-lg border text-left transition-colors">
                <h4 className="font-bold text-gray-800">Tenant Management</h4>
                <p className="text-sm text-gray-600 mt-1">Onboard new organizations and manage subscriptions.</p>
            </button>
            <div className="p-6 bg-gray-100 rounded-lg border border-dashed text-left opacity-60">
                <h4 className="font-bold text-gray-500">System Analytics</h4>
                <p className="text-sm text-gray-500 mt-1">View cross-tenant usage and performance metrics (coming soon).</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                         <h1 className="text-3xl font-bold text-gray-800">{isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}</h1>
                         <p className="text-gray-500">Manage user access and group permissions.</p>
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
                        {isSuperAdmin && <button onClick={() => setActiveTab('system')} className={`px-4 py-3 font-semibold ${activeTab === 'system' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>System Management</button>}
                        {canManageUsers && <button onClick={() => setActiveTab('users')} className={`px-4 py-3 font-semibold ${activeTab === 'users' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>User Management</button>}
                        {canManageGroups && <button onClick={() => setActiveTab('groups')} className={`px-4 py-3 font-semibold ${activeTab === 'groups' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Group Management</button>}
                    </div>

                    <div className="p-6">
                        {activeTab === 'system' && isSuperAdmin && <SystemManagementTab />}
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
                                {/* FIX: Remove obsolete invitation UI. */}
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
            </div>
            {/* FIX: Remove obsolete InvitationModal. */}
        </div>
    );
};

export default AdminPage;
