import { Database, Q } from '@nozbe/watermelondb';
import { FarmerModel, SubsidyPaymentModel } from '../db';

// Converts a WatermelonDB model to a plain object suitable for Supabase.
// It removes WatermelonDB-specific fields (_status, _changed).
// It also maps the model's 'syncStatusLocal' property to 'syncStatus' for the backend.
const modelToSupabaseReadyObject = (model: FarmerModel | SubsidyPaymentModel) => {
    // FIX: Property '_raw' is not publicly exposed in types. Cast to 'any' to access it.
    // FIX: Cast model to `any` to access the internal `_raw` property for creating a plain object.
    const plainObject: { [key: string]: any } = { ...(model as any)._raw };
    delete plainObject._status;
    delete plainObject._changed;
    
    // The model uses 'syncStatusLocal', but the DB column is 'syncStatus'.
    // We ensure the backend receives the correct 'syncStatus' column name.
    if (plainObject.hasOwnProperty('syncStatus')) {
        plainObject.syncStatus = 'synced';
    }
    
    // Convert WatermelonDB's numeric timestamps back to ISO strings for Supabase timestamptz columns
    if (plainObject.created_at && typeof plainObject.created_at === 'number') {
        plainObject.created_at = new Date(plainObject.created_at).toISOString();
    }
     if (plainObject.updated_at && typeof plainObject.updated_at === 'number') {
        plainObject.updated_at = new Date(plainObject.updated_at).toISOString();
    }
    
    return plainObject;
};


export const synchronize = async (database: Database, supabase: any): Promise<{ pushed: number, deleted: number }> => {
    // 1. Get all local records that need syncing
    const farmersCollection = database.get<FarmerModel>('farmers');
    const paymentsCollection = database.get<SubsidyPaymentModel>('subsidy_payments');
    
    const pendingFarmers = await farmersCollection.query(Q.where('syncStatus', Q.notEq('synced'))).fetch();
    const pendingPayments = await paymentsCollection.query(Q.where('syncStatus', Q.notEq('synced'))).fetch();

    // 2. Separate records into upserts and deletes for farmers
    const farmersToUpsert = pendingFarmers
        .filter(f => f.syncStatusLocal !== 'pending_delete')
        .map(modelToSupabaseReadyObject);

    const farmerIdsToDelete = pendingFarmers
        .filter(f => f.syncStatusLocal === 'pending_delete')
        .map(f => f.id);

    const paymentsToUpsert = pendingPayments.map(modelToSupabaseReadyObject);

    // 3. Push changes to Supabase
    if (farmersToUpsert.length > 0) {
        const { error } = await supabase.from('farmers').upsert(farmersToUpsert);
        if (error) throw new Error(`Failed to push farmer updates: ${error.message}`);
    }
    if (paymentsToUpsert.length > 0) {
        const { error } = await supabase.from('subsidy_payments').upsert(paymentsToUpsert);
        if (error) throw new Error(`Failed to push payment updates: ${error.message}`);
    }
    if (farmerIdsToDelete.length > 0) {
        // Note: Deleting a farmer should cascade-delete payments in Supabase via foreign key constraints.
        const { error } = await supabase.from('farmers').delete().in('id', farmerIdsToDelete);
        if (error) throw new Error(`Failed to push farmer deletions: ${error.message}`);
    }

    // 4. If push was successful, update local records
    await database.write(async () => {
        // Mark upserted records as 'synced'
        const farmersToMarkSynced = pendingFarmers.filter(f => f.syncStatusLocal !== 'pending_delete');
        for (const farmer of farmersToMarkSynced) {
            await farmer.update(rec => { rec.syncStatusLocal = 'synced'; });
        }
        for (const payment of pendingPayments) {
            await payment.update(rec => { rec.syncStatusLocal = 'synced'; });
        }
        
        // Permanently delete the 'pending_delete' records locally
        const farmersToDeleteLocally = pendingFarmers.filter(f => f.syncStatusLocal === 'pending_delete');
        for (const farmer of farmersToDeleteLocally) {
            await farmer.destroyPermanently();
        }
    });
    
    return { pushed: farmersToUpsert.length + paymentsToUpsert.length, deleted: farmerIdsToDelete.length };
};