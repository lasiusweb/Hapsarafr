export interface ActivityLogEntry {
    id: string;
    timestamp: string; // ISO 8601 format
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'LOGIN';
    targetId: string | null; // e.g., Farmer ID for CRUD, null for general actions
    details: string;
}

export const ACTIVITY_LOG_DATA: ActivityLogEntry[] = [
    {
        id: 'log-001',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        action: 'CREATE',
        targetId: 'H010101001',
        details: 'Registered new farmer: Ramesh Kumar',
    },
    {
        id: 'log-002',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        action: 'LOGIN',
        targetId: null,
        details: 'User logged in successfully.',
    },
    {
        id: 'log-003',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        action: 'EXPORT',
        targetId: null,
        details: 'Exported 152 records to Excel.',
    },
    {
        id: 'log-004',
        timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        action: 'UPDATE',
        targetId: 'M020304005',
        details: 'Updated status to "Planted" for farmer: Sunita Devi',
    },
    {
        id: 'log-005',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        action: 'CREATE',
        targetId: 'W010203007',
        details: 'Registered new farmer: Arjun Singh',
    },
    {
        id: 'log-006',
        timestamp: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
        action: 'DELETE',
        targetId: 'H040101012',
        details: 'Deleted farmer record for duplicate entry.',
    },
    {
        id: 'log-007',
        timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        action: 'UPDATE',
        targetId: 'M010101002',
        details: 'Updated mobile number for farmer: Geeta Patel',
    },
    {
        id: 'log-008',
        timestamp: new Date(Date.now() - 75 * 60 * 60 * 1000).toISOString(),
        action: 'CREATE',
        targetId: 'H020103009',
        details: 'Registered new farmer: Vikram Rathore',
    },
    {
        id: 'log-009',
        timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
        action: 'EXPORT',
        targetId: null,
        details: 'Exported 50 records to CSV.',
    },
    {
        id: 'log-010',
        timestamp: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
        action: 'UPDATE',
        targetId: 'W010203007',
        details: 'Updated status to "Sanctioned" for farmer: Arjun Singh',
    },
     {
        id: 'log-011',
        timestamp: new Date(Date.now() - 122 * 60 * 60 * 1000).toISOString(),
        action: 'UPDATE',
        targetId: 'H010101001',
        details: 'Updated approved extent to 4.5 acres.',
    },
    {
        id: 'log-012',
        timestamp: new Date(Date.now() - 130 * 60 * 60 * 1000).toISOString(),
        action: 'CREATE',
        targetId: 'M010101002',
        details: 'Registered new farmer: Geeta Patel',
    },
];
