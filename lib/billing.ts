import { Database, Q } from '@nozbe/watermelondb';
import { TenantModel, FreeTierUsageModel, ServiceConsumptionLogModel, CreditLedgerEntryModel } from '../db';
import { BillableEvent, LedgerTransactionType } from '../types';
import { SERVICE_PRICING, FREE_TIER_LIMITS } from '../data/subscriptionPlans';

export async function deductCredits(
    database: Database,
    tenantId: string,
    serviceName: BillableEvent,
    metadata: any = {},
    costOverride?: number
): Promise<{ success: true, usedFreeTier: boolean } | { error: string }> {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // "YYYY-MM"
    const freeTierLimit = FREE_TIER_LIMITS[serviceName] || 0;

    try {
        // 1. Check and update free tier usage
        if (freeTierLimit > 0) {
            const usageCollection = database.get<FreeTierUsageModel>('free_tier_usages');
            const usageRecords = await usageCollection.query(
                Q.where('tenant_id', tenantId),
                Q.where('service_name', serviceName),
                Q.where('period', period)
            ).fetch();
            
            let usageRecord = usageRecords[0];

            if (!usageRecord) {
                // Create new usage record for this period
                await database.write(async () => {
                    await usageCollection.create(u => {
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
                    await usageRecord.update(u => {
                        u.usageCount += 1;
                    });
                });
                return { success: true, usedFreeTier: true };
            }
        }
        
        // 2. Determine cost (Standard or Override)
        let creditCost = costOverride !== undefined ? costOverride : SERVICE_PRICING[serviceName];

        if (creditCost === undefined) {
            return { error: `Service "${serviceName}" has no defined price.` };
        }

        if (creditCost === 0) {
             return { success: true, usedFreeTier: false }; 
        }

        // 3. Deduct Credits Transactionally
        let error: string | null = null;
        
        await database.write(async () => {
            const tenant = await database.get<TenantModel>('tenants').find(tenantId);

            if (tenant.creditBalance < creditCost) {
                error = "Insufficient credits. Please top up your account.";
                return;
            }

            const newBalance = tenant.creditBalance - creditCost;
            
            // Log Consumption
            const log = await database.get<ServiceConsumptionLogModel>('service_consumption_logs').create(s => {
                s.tenantId = tenantId;
                s.serviceName = serviceName;
                s.creditCost = creditCost;
                s.metadataJson = JSON.stringify(metadata);
            });

            // Ledger Entry
            await database.get<CreditLedgerEntryModel>('credit_ledger').create(l => {
                l.tenantId = tenantId;
                l.transactionType = LedgerTransactionType.CONSUMPTION;
                l.amount = -creditCost;
                l.serviceEventId = log.id;
            });
            
            // Update Tenant Balance
            await tenant.update(t => {
                t.creditBalance = newBalance;
            });
        });

        if (error) return { error };

        return { success: true, usedFreeTier: false };
    } catch (e: any) {
        console.error("Credit deduction failed:", e);
        return { error: e.message || "An unknown billing error occurred." };
    }
}