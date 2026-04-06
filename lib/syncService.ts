import { getSupabase } from './supabase';
import { Q } from '@nozbe/watermelondb';
import { sync as watermelonSync } from './sync';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export class SyncService {
  private static instance: SyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(status: Partial<SyncStatus>) {
    // Note: This is an incomplete notification, we should probably fetch current counts here
    // But for now, we'll just merge with a default/previous state
    this.listeners.forEach(listener => listener({
      isSyncing: false,
      pendingCount: 0,
      conflictCount: 0,
      lastSynced: null,
      ...status
    } as SyncStatus));
  }

  async syncAll(database: any): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.isSyncing = true;
    this.notify({ isSyncing: true });

    try {
      await watermelonSync();
      
      const pendingCount = await database
        .get('farmers')
        .query(Q.where('sync_status', 'pending'))
        .fetchCount();
      
      const conflictCount = await database
        .get('farmers')
        .query(Q.where('sync_status_local', 'conflicted'))
        .fetchCount();

      this.notify({ 
        isSyncing: false, 
        pendingCount, 
        conflictCount,
        lastSynced: new Date(),
      });

      return { success: true, synced: 0, failed: 0, errors: [] }; // synced/failed counts are not easily available from watermelonSync
    } catch (error) {
      this.notify({ isSyncing: false, error: String(error) });
      return { success: false, synced: 0, failed: 0, errors: [String(error)] };
    } finally {
      this.isSyncing = false;
    }
  }

  startAutoSync(database: any, intervalMs: number = 300000) {
    this.stopAutoSync();
    this.syncInterval = setInterval(() => {
      this.syncAll(database);
    }, intervalMs);
    
    this.syncAll(database);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSynced: Date | null;
  error?: string | null;
}