import { synchronize } from '@nozbe/watermelondb/sync';
import database from '../db';
import { getSupabase } from './supabase';
import { tableName } from '@nozbe/watermelondb';

// Define the list of tables to sync
export const SYNC_TABLE_ORDER = [
  'tenants',
  'users',
  'groups',
  'districts',
  'mandals',
  'villages',
  'farmers',
  'farm_plots',
  'subsidy_payments',
  'activity_logs',
  'resources',
  'resource_distributions',
  'custom_field_definitions',
  'tasks',
  'planting_records',
  'harvests',
  'quality_assessments',
  'quality_metrics',
  'user_profiles',
  'mentorships',
  'assistance_applications',
  'equipment',
  'equipment_maintenance_logs',
  'withdrawal_accounts',
  'training_modules',
  'training_completions',
  'events',
  'event_rsvps',
  'territories',
  'territory_disputes',
  'farmer_dealer_consents',
  'forum_posts',
  'forum_answers',
  'forum_content_flags',
  'wallets',
  'wallet_transactions',
  'visit_requests',
  'directives',
  'directive_assignments',
  'product_categories',
  'products',
  'vendors',
  'vendor_products',
  'orders',
  'order_items',
  'crops',
  'crop_assignments',
  'harvest_logs',
  'credit_ledger',
  'service_consumption_logs',
  'free_tier_usages',
  'service_points',
  'collection_appointments',
  'agronomic_inputs',
  'processing_batches',
  'processing_steps',
  'protection_products',
  'protection_subscriptions',
  'protection_claims',
  'land_listings',
  'land_valuation_history',
  'equipment_leases',
  'manual_ledger_entries',
  'dealers',
  'dealer_inventory_signals',
  'khata_records',
  'dealer_farmer_connections',
  'agronomic_recommendations',
  'tenant_partner_configs',
  'partners',
  'partner_offerings',
  'farmer_partner_consents',
  'partner_interactions',
  'seed_varieties',
  'seed_performance_logs',
  'commodity_listings',
  'leads',
];

export const sync = async () => {
    const supabase = getSupabase();
    
    if (!supabase) {
        console.warn("Sync aborted: Supabase not initialized.");
        return;
    }

    try {
        await synchronize({
            database,
            pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
                console.log("Sync: Pulling changes since", lastPulledAt);
                
                const changes: any = {};
                let timestamp = new Date().getTime();

                // 1. Pull changes for each table
                // Ideally, this should be a single RPC call to Postgres, but we simulate with JS for now
                await Promise.all(SYNC_TABLE_ORDER.map(async (table) => {
                    const lastPulledDate = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();
                    
                    const { data, error } = await supabase
                        .from(table)
                        .select('*')
                        .gt('updated_at', lastPulledDate); // Assuming all tables have updated_at
                    
                    if (error) {
                         // Check if error is just because table doesn't exist or permission (ignore for MVP robustness)
                         console.warn(`Sync warning for ${table}:`, error.message);
                         changes[table] = { created: [], updated: [], deleted: [] };
                         return;
                    }

                    // Map Supabase rows to WatermelonDB expected format
                    // We treat everything from server as 'updated' or 'created'. 
                    // WatermelonDB handles the distinction.
                    // Deletions require a specific 'deleted' table or soft-delete logic which we assume is not fully set up on backend yet.
                    // For MVP, we just pull create/updates.
                    
                    // Note: WatermelonDB expects 'created' and 'updated'. 
                    // Since we don't know which is which from a simple date query, we put all in 'updated' usually works, 
                    // or we can try to distinguish. Safer to put in updated/created based on client existence, 
                    // but simply putting in 'updated' usually triggers an upsert in WatermelonDB.
                    // Let's put all in 'created' for first sync, 'updated' for subsequent? 
                    // Actually WatermelonDB documentation says 'created' must be new, 'updated' must exist.
                    // Since checking local DB is expensive here, standard practice without turbo-sync is just `updated`.
                    
                    changes[table] = {
                        created: [], // We'll rely on 'updated' acting as upsert or carefully separate if needed.
                        updated: data || [],
                        deleted: [], // Needs backend Soft Delete support
                    };
                }));

                return { changes, timestamp };
            },
            pushChanges: async ({ changes, lastPulledAt }) => {
                console.log("Sync: Pushing changes...");
                
                for (const table of SYNC_TABLE_ORDER) {
                    const changeSet = changes[table];
                    if (!changeSet) continue;

                    // 1. Create
                    if (changeSet.created.length > 0) {
                        const records = changeSet.created.map(r => r._raw);
                        const { error } = await supabase.from(table).insert(records);
                        if (error) console.error(`Push create error ${table}:`, error);
                    }

                    // 2. Update
                    if (changeSet.updated.length > 0) {
                        const records = changeSet.updated.map(r => r._raw);
                        const { error } = await supabase.from(table).upsert(records);
                        if (error) console.error(`Push update error ${table}:`, error);
                    }

                    // 3. Delete
                    if (changeSet.deleted.length > 0) {
                        const ids = changeSet.deleted;
                        const { error } = await supabase.from(table).delete().in('id', ids);
                        if (error) console.error(`Push delete error ${table}:`, error);
                    }
                }
            },
            migrationsEnabledAtVersion: 1,
        });
        console.log("Sync completed successfully.");
    } catch (error) {
        console.error("Sync failed:", error);
        throw error;
    }
};