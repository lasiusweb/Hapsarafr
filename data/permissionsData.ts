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
    { id: Permission.CAN_MANAGE_CONTENT, description: 'Edit site content (Landing Page, FAQs)', category: 'Administration' },
    { id: Permission.CAN_VIEW_MARKETPLACE, description: 'Access and view the marketplace', category: 'Marketplace' },
    { id: Permission.CAN_MANAGE_VENDORS, description: 'Add, verify, and manage marketplace vendors', category: 'Marketplace' },
    { id: Permission.CAN_MANAGE_ORDERS, description: 'View and manage all farmer orders', category: 'Marketplace' },
    { id: Permission.CAN_MANAGE_SCHEMA, description: 'Manage data schemas and dynamic forms', category: 'Super Administration' },
];

export const DEFAULT_GROUPS: Group[] = [
    {
        id: 'group-super-admin',
        name: 'Super Administrator',
        permissions: Object.values(Permission), // Super Admin gets all permissions
        tenantId: 'default-tenant',
    },
    {
        id: 'group-admin',
        name: 'Administrator',
        permissions: [
            Permission.CAN_REGISTER_FARMER,
            Permission.CAN_EDIT_FARMER,
            Permission.CAN_DELETE_FARMER,
            Permission.CAN_IMPORT_DATA,
            Permission.CAN_EXPORT_DATA,
            Permission.CAN_SYNC_DATA,
            Permission.CAN_MANAGE_USERS,
            Permission.CAN_MANAGE_GROUPS,
            Permission.CAN_INVITE_USERS,
            Permission.CAN_VIEW_MARKETPLACE,
            Permission.CAN_MANAGE_VENDORS,
            Permission.CAN_MANAGE_ORDERS,
            // CAN_MANAGE_CONTENT is intentionally omitted for regular admins
        ],
        tenantId: 'default-tenant',
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
            Permission.CAN_VIEW_MARKETPLACE,
        ],
        tenantId: 'default-tenant',
    },
    {
        id: 'group-viewer',
        name: 'Viewer',
        permissions: [
            Permission.CAN_EXPORT_DATA, // Viewers can only view and export data
            Permission.CAN_VIEW_MARKETPLACE,
        ],
        tenantId: 'default-tenant',
    },
];
