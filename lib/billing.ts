import { Database, Q } from '@nozbe/watermelondb';
import { TenantModel, FreeTierUsageModel, CreditLedgerEntryModel, ServiceConsumptionLogModel } from '../db';
import { BillableEvent, LedgerTransactionType } from '../types';
import { SERVICE_PRICING, FREE_TIER_LIMITS } from '../data/subscriptionPlans';

export async function deductCredits(
    database: Database,
    tenantId: string,
    serviceName: BillableEvent,
    metadata: any = {}
): Promise<{ success: true, usedFreeTier: boolean } | { error: string }> {

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // "YYYY-MM"
    const freeTierLimit = FREE_TIER_LIMITS[serviceName] || 0;

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
            await database.write(async () => {
                usageRecord = await usageCollection.create(u => {
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
    
    // 2. If free tier is exhausted, deduct credits
    const creditCost = SERVICE_PRICING[serviceName];
    if (creditCost === undefined) {
        return { error: `Service "${serviceName}" has no defined price.` };
    }

    try {
        await database.write(async (writer) => {
            const tenant = await database.get<TenantModel>('tenants').find(tenantId);

            if (tenant.creditBalance < creditCost) {
                throw new Error("Insufficient credits. Please top up your account.");
            }

            // Atomically update balance and log transactions
            const newBalance = tenant.creditBalance - creditCost;
            
            const log = await database.get<ServiceConsumptionLogModel>('service_consumption_logs').create(s => {
                s.tenantId = tenantId;
                s.serviceName = serviceName;
                s.creditCost = creditCost;
                s.metadataJson = JSON.stringify(metadata);
            });

            await database.get<CreditLedgerEntryModel>('credit_ledger').create(l => {
                l.tenantId = tenantId;
                l.transactionType = LedgerTransactionType.CONSUMPTION;
                l.amount = -creditCost;
                l.serviceEventId = log.id;
            });
            
            await tenant.update(t => {
                t.creditBalance = newBalance;
            });
        });
        return { success: true, usedFreeTier: false };
    } catch (e: any) {
        console.error("Credit deduction failed:", e);
        return { error: e.message || "An unknown billing error occurred." };
    }
}
