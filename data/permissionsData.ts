import { Permission, Group } from '../types';

export const PERMISSIONS_LIST: { id: Permission, description: string; category: string }[] = [
    { id: Permission.CAN_REGISTER_FARMER, description: 'Register new farmers', category: 'Farmer Management' },
    { id: Permission.CAN_EDIT_FARMER, description: 'Edit farmer details', category: 'Farmer Management' },
    { id: Permission.CAN_DELETE_FARMER, description: 'Delete farmer records', category: 'Farmer Management' },
    { id: Permission.CAN_IMPORT_DATA, description: 'Bulk import from Excel', category: 'Data Management' },
    { id: Permission.CAN_EXPORT_DATA, description: 'Export data to Excel/CSV', category: 'Data Management' },
    { id: Permission.CAN_SYNC_DATA, description: 'Sync data with the server', category: 'Data Management' },
    { id: Permission.CAN_MANAGE_USERS, description: 'Manage users and their group assignments', category: 'Administration' },
    { id: Permission.CAN_MANAGE_GROUPS, description: 'Manage groups and permissions', category: 'Administration' },
    { id: Permission.CAN_INVITE_USERS, description: 'Invite new users via generating codes', category: 'Administration' },
];

export const DEFAULT_GROUPS: Group[] = [
    {
        id: 'group-admin',
        name: 'Administrator',
        permissions: Object.values(Permission), // Admin gets all permissions
    },
    {
        id: 'group-data-entry',
        name: 'Data Entry Operator',
        permissions: [
            Permission.CAN_REGISTER_FARMER,
            Permission.CAN_EDIT_FARMER,
            Permission.CAN_IMPORT_DATA,
            Permission.CAN_EXPORT_DATA,
            Permission.CAN_SYNC_DATA,
        ],
    },
    {
        id: 'group-viewer',
        name: 'Viewer',
        permissions: [
            Permission.CAN_EXPORT_DATA, // Viewers can only view and export data
        ],
    },
];