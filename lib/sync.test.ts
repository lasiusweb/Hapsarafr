import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sync } from './sync';
import { synchronize } from '@nozbe/watermelondb/sync';
import { getSupabase } from './supabase';

// Mock dependencies
vi.mock('@nozbe/watermelondb/sync');
vi.mock('./supabase');

describe('sync with conflict detection', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
    };
    (getSupabase as vi.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('should detect a data conflict and log it to the conflicts table instead of upserting', async () => {
    const clientTimestamp = new Date('2023-01-01T10:00:00Z').getTime();
    const serverTimestamp = new Date('2023-01-01T11:00:00Z').toISOString();

    const conflictedFarmer = {
      id: 'farmer-1',
      name: 'John Doe (Client)',
      // This custom field is the key to the new logic
      server_modified_at: clientTimestamp, 
      _raw: {
        id: 'farmer-1',
        name: 'John Doe (Client)',
        updated_at: new Date('2023-01-01T10:05:00Z').toISOString(),
      }
    };

    const serverFarmer = {
      id: 'farmer-1',
      name: 'John Doe (Server)',
      updated_at: serverTimestamp,
    };
    
    // Mock the server to return a newer version of the farmer
    mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'farmers') {
            return {
                ...mockSupabaseClient,
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: [serverFarmer], error: null }),
            }
        }
        return mockSupabaseClient;
    });


    // Capture the pushChanges function
    await sync();
    const syncCall = (synchronize as vi.Mock).mock.calls[0][0];
    const pushChanges = syncCall.pushChanges;

    const changes = {
      farmers: {
        created: [],
        updated: [conflictedFarmer],
        deleted: [],
      },
    };

    // Act
    await pushChanges({ changes, lastPulledAt: clientTimestamp });

    // Assert
    // The conflict should be logged
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('conflicts');
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.any(Array));
    
    // The original table should NOT be updated
    expect(mockSupabaseClient.upsert).not.toHaveBeenCalled();
  });

  it('should upsert the record if no conflict is detected', async () => {
    const clientTimestamp = new Date('2023-01-01T10:00:00Z').getTime();

    const nonConflictedFarmer = {
      id: 'farmer-1',
      name: 'John Doe (Client)',
      server_modified_at: clientTimestamp,
      _raw: {
        id: 'farmer-1',
        name: 'John Doe (Client)',
        updated_at: new Date('2023-01-01T10:05:00Z').toISOString(),
      }
    };

    const serverFarmer = {
      id: 'farmer-1',
      name: 'John Doe (Server)',
      updated_at: new Date('2023-01-01T10:00:00Z').toISOString(), // Same as client's last pull
    };

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'farmers') {
        return {
          ...mockSupabaseClient,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [serverFarmer], error: null }),
        }
      }
      return mockSupabaseClient;
    });

    await sync();
    const syncCall = (synchronize as vi.Mock).mock.calls[0][0];
    const pushChanges = syncCall.pushChanges;

    const changes = {
      farmers: {
        created: [],
        updated: [nonConflictedFarmer],
        deleted: [],
      },
    };

    await pushChanges({ changes, lastPulledAt: clientTimestamp });

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('farmers');
    expect(mockSupabaseClient.upsert).toHaveBeenCalled();
    expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('conflicts');
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('should handle created records', async () => {
    const newFarmer = {
      id: 'farmer-2',
      name: 'Jane Doe',
      _raw: {
        id: 'farmer-2',
        name: 'Jane Doe',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    };

    await sync();
    const syncCall = (synchronize as vi.Mock).mock.calls[0][0];
    const pushChanges = syncCall.pushChanges;

    const changes = {
      farmers: {
        created: [newFarmer],
        updated: [],
        deleted: [],
      },
    };

    await pushChanges({ changes, lastPulledAt: new Date().getTime() });

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('farmers');
    expect(mockSupabaseClient.upsert).toHaveBeenCalledWith([newFarmer._raw]);
  });

  it('should handle deleted records', async () => {
    const deletedFarmerId = 'farmer-3';

    await sync();
    const syncCall = (synchronize as vi.Mock).mock.calls[0][0];
    const pushChanges = syncCall.pushChanges;

    const changes = {
      farmers: {
        created: [],
        updated: [],
        deleted: [deletedFarmerId],
      },
    };

    await pushChanges({ changes, lastPulledAt: new Date().getTime() });

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('farmers');
    expect(mockSupabaseClient.delete).toHaveBeenCalled();
    expect(mockSupabaseClient.delete().in).toHaveBeenCalledWith('id', [deletedFarmerId]);
  });
});
