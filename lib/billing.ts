
import { Database, Q } from '@nozbe/watermelondb';
import { TenantModel, FreeTierUsageModel, ServiceConsumptionLogModel, CreditLedgerEntryModel, WalletModel } from '../db';
import { BillableEvent, LedgerTransactionType } from '../types';
import { SERVICE_PRICING, FREE_TIER_LIMITS } from '../data/subscriptionPlans';
import { getSupabase } from './supabase';

// Offline Tolerance: Allow balance to dip to this amount before hard blocking
const MAX_NEGATIVE_BALANCE_OFFLINE = -50;

export async function deductCredits(
    database: Database,
    tenantId: string | null, // Optional if payer is vendor
    serviceName: BillableEvent,
    metadata: any = {},
    costOverride?: number,
    vendorId?: string // New: Explicit vendor payer override
): Promise<{ success: true, usedFreeTier: boolean } | { error: string }> {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const freeTierLimit = FREE_TIER_LIMITS[serviceName] || 0;
    const supabase = getSupabase();
    const isOnline = navigator.onLine;
    
    // Determine who pays. If vendorId is provided and tenantId is null/empty, Vendor pays.
    const isVendorPaying = !!vendorId && !tenantId;

    // 1. Check Free Tier (Local Logic is sufficient for speed, reconcile later)
    // Only Tenants get Free Tier currently. Vendors pay from wallet immediately.
    if (!isVendorPaying && freeTierLimit > 0 && tenantId) {
        const usageCollection = database.get('free_tier_usages');
        const usageRecords = await (usageCollection as any).query(
            Q.where('tenant_id', tenantId),
            Q.where('service_name', serviceName),
            Q.where('period', period)
        ).fetch() as unknown as FreeTierUsageModel[];
        
        let usageRecord = usageRecords[0];
        
        if (!usageRecord) {
            await database.write(async () => {
                await (usageCollection as any).create((u: any) => {
                    u.tenantId = tenantId;
                    u.serviceName = serviceName;
                    u.period = period;
                    u.usageCount = 1;
                });
            });
            return { success: true, usedFreeTier: true };
        }
        
        if (usageRecord.usageCount < freeTierLimit) {
             await database.write(async () => {
                await (usageRecord as any).update((u: any) => {
                    u.usageCount += 1;
                });
            });
            return { success: true, usedFreeTier: true };
        }
    }

    // 2. Determine Cost
    let creditCost = costOverride !== undefined ? costOverride : SERVICE_PRICING[serviceName];
    if (creditCost === undefined) return { error: `Service "${serviceName}" has no defined price.` };
    if (creditCost === 0) return { success: true, usedFreeTier: false };

    // 3. Execution Path
    if (isOnline && supabase) {
        // --- ONLINE: Server Authority ---
        try {
            const { data, error } = await supabase.rpc('deduct_credits', {
                p_tenant_id: tenantId,
                p_vendor_id: vendorId,
                p_amount: creditCost,
                p_service_type: serviceName,
                p_metadata: metadata
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error);

            // Sync local balance to match server
            await database.write(async () => {
                if (isVendorPaying && vendorId) {
                    // Find Vendor Wallet
                    const wallets = await database.get('wallets').query(Q.where('vendor_id', vendorId)).fetch() as unknown as WalletModel[];
                    if (wallets.length > 0) {
                        await (wallets[0] as any).update((w: any) => { w.balance = data.new_balance });
                    }
                } else if (tenantId) {
                    const tenant = await database.get('tenants').find(tenantId) as unknown as TenantModel;
                    await (tenant as any).update((t: any) => { t.creditBalance = data.new_balance; });
                }
            });

            return { success: true, usedFreeTier: false };

        } catch (e: any) {
            console.error("Server billing failed, falling back to offline logic if permitted:", e);
            // Fallthrough to offline logic if server error is network-related
        }
    }

    // --- OFFLINE / FALLBACK: Optimistic Deduction ---
    let error: string | null = null;
    await database.write(async () => {
        let balance = 0;
        let updateBalance: (newBal: number) => Promise<void>;

        if (isVendorPaying && vendorId) {
            const wallets = await database.get('wallets').query(Q.where('vendor_id', vendorId)).fetch() as unknown as WalletModel[];
            if (wallets.length === 0) {
                 error = "Vendor wallet not found. Please top up.";
                 return;
            }
            balance = wallets[0].balance;
            // Fix: Explicit type checking for wallet update
            const w = wallets[0];
            updateBalance = async (n) => { await (w as any).update((r: any) => { r.balance = n }) };
        } else if (tenantId) {
            const tenant = await database.get('tenants').find(tenantId) as unknown as TenantModel;
            balance = tenant.creditBalance;
            updateBalance = async (n) => { await (tenant as any).update((t: any) => { t.creditBalance = n }) };
        } else {
            error = "No payer identified.";
            return; // Should not happen
        }

        // Check Soft Limit
        if (balance - creditCost < MAX_NEGATIVE_BALANCE_OFFLINE) {
            error = `Offline credit limit exceeded (${MAX_NEGATIVE_BALANCE_OFFLINE}). Please connect to internet to sync and top up.`;
            return;
        }

        const newBalance = balance - creditCost;

        // Log Consumption locally
        const log = await (database.get('service_consumption_logs') as any).create((s: any) => {
            s.tenantId = tenantId || 'vendor_self_pay';
            s.serviceName = serviceName;
            s.creditCost = creditCost;
            s.metadataJson = JSON.stringify({ ...metadata, vendorId, _offline: true });
        }) as unknown as ServiceConsumptionLogModel;

        // Ledger Entry locally
        await (database.get('credit_ledger') as any).create((l: any) => {
            l.tenantId = tenantId || '';
            l.vendorId = vendorId;
            l.transactionType = LedgerTransactionType.CONSUMPTION;
            l.amount = -creditCost;
            l.serviceEventId = (log as any).id;
        });
        
        // Update Balance
        if (updateBalance) {
             await updateBalance(newBalance);
        }
    });

    if (error) return { error };
    return { success: true, usedFreeTier: false };
}
