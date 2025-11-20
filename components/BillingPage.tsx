
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

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Col: Balance & Actions */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-8 text-white text-center">
                                <h2 className="text-sm font-medium text-indigo-200 uppercase tracking-wider">Current Balance</h2>
                                <p className="text-5xl font-extrabold my-4">{currentTenant?.credit_balance?.toLocaleString() || 0}</p>
                                <p className="text-indigo-100 font-medium mb-6">Credits Available</p>
                                <button
                                    onClick={() => setIsPurchaseModalOpen(true)}
                                    className="w-full py-3 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition shadow-md"
                                >
                                    Top Up Balance
                                </button>
                            </div>

                            {/* Usage Summary Card */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h3 className="font-bold text-gray-800 mb-4">Consumption Breakdown</h3>
                                <div className="space-y-3">
                                    {usageSummary.length > 0 ? usageSummary.map(([service, cost]) => (
                                        <div key={service} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 capitalize">{service.toLowerCase()}</span>
                                            <span className="font-bold text-gray-800">{cost} Cr</span>
                                        </div>
                                    )) : <p className="text-sm text-gray-400 text-center py-4">No usage recorded yet.</p>}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Col: Transaction History */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="p-6 border-b bg-gray-50">
                                <h2 className="text-xl font-bold text-gray-800">Transaction History</h2>
                            </div>
                             <div className="max-h-[600px] overflow-y-auto">
                                <ul className="divide-y divide-gray-100">
                                    {transactions.map(tx => (
                                        <li key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {tx.amount > 0 ? 
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg> 
                                                        : 
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                                    }
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800 text-sm">{getTransactionDescription(tx._raw as CreditLedgerEntry)}</p>
                                                    <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <p className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-gray-800'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} Cr
                                            </p>
                                        </li>
                                    ))}
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
