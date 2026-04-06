import { useState, useEffect } from 'react';
import { SyncService, SyncStatus } from '../lib/syncService';
import { useDatabase } from '../DatabaseContext';
import { Q } from '@nozbe/watermelondb';
import { useNavigate } from 'react-router-dom';

interface SyncIndicatorProps {
  className?: string;
}

export function SyncIndicator({ className = '' }: SyncIndicatorProps) {
  const database = useDatabase();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SyncStatus & { conflictCount: number }>({
    isSyncing: false,
    pendingCount: 0,
    conflictCount: 0,
    lastSynced: null,
  });

  useEffect(() => {
    const syncService = SyncService.getInstance();
    
    const updateCounts = async () => {
      try {
        const pending = await database
          .get('farmers')
          .query(Q.where('sync_status', 'pending'))
          .fetchCount();
        const conflicts = await database
          .get('farmers')
          .query(Q.where('sync_status_local', 'conflicted'))
          .fetchCount();
        setStatus((prev) => ({ ...prev, pendingCount: pending, conflictCount: conflicts }));
      } catch (e) {
        console.error('Failed to get sync counts:', e);
      }
    };

    updateCounts();
    
    const unsubscribe = syncService.subscribe((newStatus: SyncStatus) => {
      setStatus(prev => ({ ...prev, ...newStatus }));
    });

    syncService.startAutoSync(database, 300000);

    const interval = setInterval(updateCounts, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [database]);

  const handleManualSync = async () => {
    if (status.conflictCount > 0) {
      navigate('/conflicts');
      return;
    }
    const syncService = SyncService.getInstance();
    await syncService.syncAll(database);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleManualSync}
        disabled={status.isSyncing}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
          status.conflictCount > 0
            ? 'bg-red-100 text-red-800 hover:bg-red-200'
            : status.pendingCount > 0 
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
              : 'bg-green-100 text-green-800 hover:bg-green-200'
        }`}
      >
        {status.isSyncing ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Syncing...
          </>
        ) : status.conflictCount > 0 ? (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {status.conflictCount} conflicts
          </>
        ) : status.pendingCount > 0 ? (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {status.pendingCount} pending
          </>
        ) : (
          <>
            <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Synced
          </>
        )}
      </button>
      
      {status.lastSynced && (
        <span className="text-xs text-gray-500">
          {status.lastSynced.toLocaleTimeString()}
        </span>
      )}
      
      {status.error && (
        <span className="text-xs text-red-500" title={status.error}>
          Error
        </span>
      )}
    </div>
  );
}