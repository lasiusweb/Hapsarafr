import { Database, Q } from '@nozbe/watermelondb';

// List of all syncable tables in an order that respects dependencies.
// Parent tables (like 'farmers') come before child tables (like 'farm_plots').
const SYNC_TABLE_ORDER = [
  'farmers',
  'farm_plots',
  'assistance_applications',
  'subsidy_payments',
  'resource_distributions',
  'planting_records',
  'harvests',
  'quality_assessments',
  'processing_batches',
  'processing_steps',
  'tasks',
  'agronomic_alerts',
  'visit_requests',
  'orders',
  'service_points',
  'collection_appointments',
  'officer_schedules',
  'farmer_dealer_consents',
  'territory_transfer_requests',
  'territory_disputes',
  'directives',
  'equipment',
  'equipment_maintenance_logs',
  'events',
  'event_rsvps',
  'service_consumption_logs',
  'credit_ledger',
  'free_tier_usages',
];


// Converts a WatermelonDB model to a plain object suitable for Supabase.
const modelToSupabaseReadyObject = (model: any) => {
    const plainObject: { [key: string]: any } = { ...model._raw };
    
    // Remove WatermelonDB-specific internal fields
    delete plainObject._status;
    delete plainObject._changed;
    
    // The 'sync_status' column is for local tracking and should not be sent to the server.
    delete plainObject.sync_status;

    // Convert WatermelonDB's numeric timestamps back to ISO strings for Supabase timestamptz columns.
    const dateFields = ['created_at', 'updated_at', 'granted_at', 'claimed_at', 'event_timestamp', 'start_time', 'end_time', 'completed_at', 'expires_at'];
    for (const field of dateFields) {
        if (plainObject[field] && typeof plainObject[field] === 'number') {
            plainObject[field] = new Date(plainObject[field]).toISOString();
        }
    }
    
    return plainObject;
};


export const synchronize = async (database: Database, supabase: any): Promise<{ pushed: number, deleted: number }> => {
    let totalPushed = 0;
    let totalDeleted = 0;

    const syncResults: { [key: string]: { toSync: any[], toDelete: any[] } } = {};
    
    // Phase 1: Collect all local changes from all syncable tables
    for (const tableName of SYNC_TABLE_ORDER) {
        const collection = database.get(tableName);
        const pendingRecords = await collection.query(Q.where('sync_status', Q.notEq('synced'))).fetch();

        if (pendingRecords.length > 0) {
            syncResults[tableName] = {
                toSync: pendingRecords.filter(r => (r as any).syncStatusLocal !== 'pending_delete'),
                toDelete: pendingRecords.filter(r => (r as any).syncStatusLocal === 'pending_delete'),
            };
        }
    }
    
    // Phase 2: Push all upserts (creations/updates) to Supabase in dependency order
    for (const tableName of SYNC_TABLE_ORDER) {
        if (syncResults[tableName]?.toSync.length > 0) {
            const recordsToUpsert = syncResults[tableName].toSync.map(modelToSupabaseReadyObject);
            const { error } = await supabase.from(tableName).upsert(recordsToUpsert);
            if (error) throw new Error(`Failed to push upserts for ${tableName}: ${error.message}`);
            totalPushed += recordsToUpsert.length;
        }
    }

    // Phase 3: Push all deletions to Supabase in reverse dependency order
    for (const tableName of [...SYNC_TABLE_ORDER].reverse()) {
        if (syncResults[tableName]?.toDelete.length > 0) {
            const recordIdsToDelete = syncResults[tableName].toDelete.map(r => r.id);
            const { error } = await supabase.from(tableName).delete().in('id', recordIdsToDelete);
            if (error) throw new Error(`Failed to push deletions for ${tableName}: ${error.message}`);
            totalDeleted += recordIdsToDelete.length;
        }
    }
    
    // Phase 4: If all pushes were successful, update the local database atomically
    await database.write(async () => {
        for (const tableName in syncResults) {
            for (const record of syncResults[tableName].toSync) {
                await record.update((rec: any) => { rec.syncStatusLocal = 'synced'; });
            }
            const deletions = syncResults[tableName].toDelete.map(record => record.prepareDestroyPermanently());
            if (deletions.length > 0) {
                await database.batch(...deletions);
            }
        }
    });

    return { pushed: totalPushed, deleted: totalDeleted };
};