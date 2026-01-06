




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
  'benefit_agreements',
  'farmer_associations',
  'territory_assignments',
  'vendor_associations',
  // New tables
  'personnel',
  'interactions',
  'farmer_crm_profiles',
  'loan_applications',
  'credit_score_history',
  'iot_devices'
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
                const timestamp = new Date().getTime();
                
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
                            
                            const updated = (data || []).map(r => ({ ...r, server_modified_at: new Date(r.updated_at).getTime() }));

                            changes[table] = {
                                created: [], 
                                updated: updated,
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
                        const records = changeSet.created.map(r => {
                            const { server_modified_at, ...rest } = r._raw;
                            return rest;
                        });
                        const { error } = await supabase.from(table).upsert(records);
                        if (error) console.error(`Push create error ${table}:`, error);
                    }

                    if (changeSet.updated.length > 0) {
                        for (const record of changeSet.updated) {
                            const { data: serverRecord, error: fetchError } = await supabase
                                .from(table)
                                .select('updated_at')
                                .eq('id', record.id);

                            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
                                console.error(`Error fetching server record for conflict check:`, fetchError);
                                continue; // or handle error more gracefully
                            }

                            const serverModifiedAt = serverRecord && serverRecord.length > 0 ? new Date(serverRecord[0].updated_at).getTime() : 0;
                            const clientLastPulledAt = (record as any).server_modified_at || 0;

                            if (serverModifiedAt > clientLastPulledAt) {
                                // Conflict detected
                                console.log(`Conflict detected for record ${record.id} in table ${table}. Logging to conflicts table.`);
                                const { data: fullServerRecord } = await supabase.from(table).select('*').eq('id', record.id);
                                await supabase.from('conflicts').insert([{
                                    table_name: table,
                                    record_id: record.id,
                                    client_record: record._raw,
                                    server_record: fullServerRecord && fullServerRecord.length > 0 ? fullServerRecord[0] : null,
                                    status: 'unresolved'
                                }]);
                                // TODO: Update local record's syncStatusLocal to 'conflicted'
                            } else {
                                // No conflict, proceed with upsert
                                const { server_modified_at, ...rest } = record._raw;
                                const { error } = await supabase.from(table).upsert(rest);
                                if (error) console.error(`Push update error ${table}:`, error);
                            }
                        }
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
