
import React, { useState, useMemo } from 'react';
import { User, Tenant, CreditLedgerEntry, LedgerTransactionType } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { CreditLedgerEntryModel, ServiceConsumptionLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import PurchaseCreditsModal from './PurchaseCreditsModal';

interface BillingPageProps {
    currentUser: User;
    currentTenant: Tenant;
    onBack: () => void;
    onNavigate: (view: 'subscription-management') => void;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const BillingPage: React.FC<BillingPageProps> = ({ currentUser, currentTenant, onBack, onNavigate, setNotification }) => {
    const database = useDatabase();
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

    const transactions = useQuery(useMemo(() => 
        database.get<CreditLedgerEntryModel>('credit_ledger')
            .query(Q.where('tenant_id', currentUser.tenantId), Q.sortBy('created_at', 'desc'))
    , [database, currentUser.tenantId]));

    const consumptionLogs = useQuery(useMemo(() =>
         database.get<ServiceConsumptionLogModel>('service_consumption_logs')
            .query(Q.where('tenant_id', currentUser.tenantId))
    , [database, currentUser.tenantId]));

    const formatCurrency = (value: number) => {
        return value.toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    };
    
    const getTransactionDescription = (tx: CreditLedgerEntry) => {
        switch(tx.transactionType) {
            case LedgerTransactionType.PURCHASE: return `Purchased ${tx.amount} Credits`;
            case LedgerTransactionType.CONSUMPTION: return `Service Usage`;
            case LedgerTransactionType.REFUND: return `Refund of ${tx.amount} Credits`;
            case LedgerTransactionType.ADJUSTMENT: return `Admin Adjustment`;
            default: return 'Transaction';
        }
    }

    const usageSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        consumptionLogs.forEach(log => {
            const name = log.serviceName.replace(/_/g, ' '); // Humanize
            summary[name] = (summary[name] || 0) + log.creditCost;
        });
        return Object.entries(summary).sort((a, b) => b[1] - a[1]);
    }, [consumptionLogs]);

    // --- Predictive Analytics ---
    const analytics = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const recentLogs = consumptionLogs.filter(l => new Date(l.createdAt) >= thirtyDaysAgo);
        const totalSpentLast30Days = recentLogs.reduce((sum, l) => sum + l.creditCost, 0);
        
        const dailyBurnRate = totalSpentLast30Days / 30;
        const runwayDays = dailyBurnRate > 0 ? Math.floor(currentTenant.creditBalance / dailyBurnRate) : 999;
        
        let healthStatus: 'HEALTHY' | 'CAUTION' | 'CRITICAL' = 'HEALTHY';
        if (currentTenant.creditBalance < 100 || runwayDays < 7) healthStatus = 'CRITICAL';
        else if (currentTenant.creditBalance < 500 || runwayDays < 14) healthStatus = 'CAUTION';

        return {
            dailyBurnRate: dailyBurnRate.toFixed(1),
            runwayDays: runwayDays === 999 ? '30+' : runwayDays,
            healthStatus,
            totalSpentLast30Days
        };
    }, [consumptionLogs, currentTenant.creditBalance]);

    const handleDownloadInvoice = (txId: string) => {
        // Mock invoice generation
        alert(`Downloading Invoice INV-${txId.slice(-6).toUpperCase()}...`);
    };

    return (
        <>
            <div className="p-6 bg-gray-50 min-h-full">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Billing & Valorem Credits</h1>
                            <p className="text-gray-500">Manage your prepaid balance and view usage analytics.</p>
                        </div>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back to Dashboard
                        </button>
                    </div>
                    
                    {/* Alerts */}
                    {analytics.healthStatus === 'CRITICAL' && (
                        <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex items-center gap-3 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <div>
                                <p className="font-bold">Low Balance Warning</p>
                                <p className="text-sm">You have less than 7 days of estimated runway. Top up now to avoid service interruption.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Col: Balance & Analytics */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-8 text-white text-center relative overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-sm font-medium text-indigo-200 uppercase tracking-wider">Current Balance</h2>
                                    <p className="text-5xl font-extrabold my-4">{currentTenant?.credit_balance?.toLocaleString() || 0}</p>
                                    <p className="text-indigo-100 font-medium mb-6">Credits Available</p>
                                    <button
                                        onClick={() => setIsPurchaseModalOpen(true)}
                                        className="w-full py-3 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition shadow-md flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        Top Up Balance
                                    </button>
                                </div>
                                {/* Decorative Circles */}
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10"></div>
                                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white/10"></div>
                            </div>

                            {/* Runway Card */}
                            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    Financial Foresight
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Est. Runway</span>
                                        <span className={`font-bold ${analytics.healthStatus === 'CRITICAL' ? 'text-red-600' : 'text-green-600'}`}>
                                            ~{analytics.runwayDays} Days
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className={`h-2.5 rounded-full ${analytics.healthStatus === 'CRITICAL' ? 'bg-red-500' : analytics.healthStatus === 'CAUTION' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: '100%' }}></div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-dashed">
                                        <span className="text-sm text-gray-500">Daily Burn Rate</span>
                                        <span className="font-mono text-gray-800">{analytics.dailyBurnRate} Cr/day</span>
                                    </div>
                                     <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">30-Day Spend</span>
                                        <span className="font-mono text-gray-800">{analytics.totalSpentLast30Days} Cr</span>
                                    </div>
                                </div>
                            </div>

                            {/* Usage Summary Card */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h3 className="font-bold text-gray-800 mb-4">Consumption Breakdown</h3>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {usageSummary.length > 0 ? usageSummary.map(([service, cost]) => (
                                        <div key={service} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 capitalize truncate w-2/3" title={service.toLowerCase()}>{service.toLowerCase()}</span>
                                            <span className="font-bold text-gray-800">{cost} Cr</span>
                                        </div>
                                    )) : <p className="text-sm text-gray-400 text-center py-4">No usage recorded yet.</p>}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Col: Transaction History */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-full">
                            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800">Transaction History</h2>
                                <button className="text-sm text-blue-600 hover:underline">Export CSV</button>
                            </div>
                             <div className="flex-1 overflow-y-auto">
                                <ul className="divide-y divide-gray-100">
                                    {transactions.map(tx => {
                                        const isCredit = tx.amount > 0;
                                        return (
                                            <li key={tx.id} className="p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`mt-1 p-2 rounded-full ${isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            {isCredit ? 
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg> 
                                                                : 
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                                            }
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800 text-sm">{getTransactionDescription(tx._raw as CreditLedgerEntry)}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">{new Date(tx.createdAt).toLocaleString()}</p>
                                                            {tx.transactionType === LedgerTransactionType.PURCHASE && (
                                                                <button onClick={() => handleDownloadInvoice(tx.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold mt-1 flex items-center gap-1">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                    Download Invoice
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={`font-bold font-mono text-sm ${isCredit ? 'text-green-600' : 'text-gray-800'}`}>
                                                        {isCredit ? '+' : ''}{tx.amount.toLocaleString()} Cr
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                    {transactions.length === 0 && <li className="p-10 text-center text-gray-400">No transactions found.</li>}
                                </ul>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            {isPurchaseModalOpen && (
                <PurchaseCreditsModal
                    onClose={() => setIsPurchaseModalOpen(false)}
                    currentTenant={currentTenant}
                    setNotification={setNotification}
                />
            )}
        </>
    );
};

export default BillingPage;
