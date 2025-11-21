
import { synchronize } from '@nozbe/watermelondb/sync';
import database from '../db';
import { getSupabase } from './supabase';

// Define the list of tables to sync
// Optimized: Removed duplicates at the end of the list
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
  'genetic_lineage',
  'benefit_agreements'
];

// Helper to process array in chunks (Network Optimization)
const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

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
                
                // Turbo-Sync: Process in batches to prevent timeouts on low-bandwidth
                const tableBatches = chunkArray(SYNC_TABLE_ORDER, 5);

                for (const batch of tableBatches) {
                    await Promise.all(batch.map(async (table) => {
                        try {
                            const lastPulledDate = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();
                            
                            // Fetch only modified records
                            const { data, error } = await supabase
                                .from(table)
                                .select('*')
                                .gt('updated_at', lastPulledDate); 
                            
                            if (error) {
                                 console.warn(`Sync warning for ${table}:`, error.message);
                                 changes[table] = { created: [], updated: [], deleted: [] };
                                 return;
                            }

                            changes[table] = {
                                created: [], 
                                updated: data || [],
                                deleted: [], 
                            };
                        } catch (e) {
                            console.error(`CRITICAL SYNC ERROR ${table}:`, e);
                            changes[table] = { created: [], updated: [], deleted: [] };
                        }
                    }));
                }

                return { changes, timestamp };
            },
            pushChanges: async ({ changes, lastPulledAt }) => {
                console.log("Sync: Pushing changes...");
                
                for (const table of SYNC_TABLE_ORDER) {
                    const changeSet = changes[table];
                    if (!changeSet) continue;

                    if (changeSet.created.length > 0) {
                        const records = changeSet.created.map(r => r._raw);
                        const { error } = await supabase.from(table).upsert(records);
                        if (error) console.error(`Push create error ${table}:`, error);
                    }

                    if (changeSet.updated.length > 0) {
                        const records = changeSet.updated.map(r => r._raw);
                        const { error } = await supabase.from(table).upsert(records);
                        if (error) console.error(`Push update error ${table}:`, error);
                    }

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
        console.error("Sync failed globally:", error);
    }
};
