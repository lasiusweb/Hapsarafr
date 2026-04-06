import React, { useState, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { Q } from '@nozbe/watermelondb';
import { getSupabase } from '../lib/supabase';
import { format } from 'date-fns';

interface Conflict {
  id: string;
  table: string;
  recordId: string;
  clientRecord: any;
  serverRecord: any;
  createdAt: string;
}

export default function ConflictResolutionPage() {
  const database = useDatabase();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    fetchConflicts();
  }, [database]);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Fetch unresolved conflicts from Supabase
      const { data, error } = await supabase
        .from('conflicts')
        .select('*')
        .eq('status', 'unresolved');

      if (error) throw error;
      setConflicts(data || []);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (conflict: Conflict, resolution: 'client' | 'server') => {
    setResolving(conflict.id);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const finalRecord = resolution === 'client' ? conflict.clientRecord : conflict.serverRecord;

      // 1. Update Supabase with the final version
      const { error: upsertError } = await supabase
        .from(conflict.table)
        .upsert(finalRecord);

      if (upsertError) throw upsertError;

      // 2. Update local WatermelonDB
      const localTable = database.get(conflict.table as any);
      const localRecord = await localTable.find(conflict.recordId);
      
      await database.write(async () => {
        await localRecord.update((rec: any) => {
          // Map snake_case server/client data to model properties
          // This assumes common mapping patterns in the project
          Object.entries(finalRecord).forEach(([key, value]) => {
            if (key === 'id') return; // Don't update ID
            
            // Try direct property (camelCase or matching)
            const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            if (camelKey in rec) {
              rec[camelKey] = value;
            } else if (key in rec) {
              rec[key] = value;
            }
          });
          rec.syncStatusLocal = 'synced'; // Mark as resolved locally
        });
      });

      // 3. Mark conflict as resolved in Supabase
      await supabase
        .from('conflicts')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', conflict.id);

      // Refresh list
      setConflicts(prev => prev.filter(c => c.id !== conflict.id));
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      alert('Failed to resolve conflict. Please try again.');
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center">Loading conflicts...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Conflict Resolution</h1>
        <button 
          onClick={fetchConflicts}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
        >
          Refresh
        </button>
      </div>

      {conflicts.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No conflicts found</h3>
          <p className="mt-1 text-sm text-gray-500">All your data is synchronized correctly.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Table: {conflict.table}</span>
                  <h3 className="text-lg font-medium text-gray-900">Record ID: {conflict.recordId}</h3>
                  <p className="text-xs text-gray-400">Detected: {format(new Date(conflict.createdAt), 'PPpp')}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => resolveConflict(conflict, 'client')}
                    disabled={resolving === conflict.id}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {resolving === conflict.id ? 'Resolving...' : 'Use Local Version'}
                  </button>
                  <button
                    onClick={() => resolveConflict(conflict, 'server')}
                    disabled={resolving === conflict.id}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    Use Server Version
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                <div className="p-6">
                  <h4 className="text-sm font-bold text-blue-600 mb-4 uppercase flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    Local Version (Your Changes)
                  </h4>
                  <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-60 text-gray-700">
                    {JSON.stringify(conflict.clientRecord, null, 2)}
                  </pre>
                </div>
                <div className="p-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                    Server Version (Conflicting Version)
                  </h4>
                  <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-60 text-gray-700">
                    {JSON.stringify(conflict.serverRecord, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}