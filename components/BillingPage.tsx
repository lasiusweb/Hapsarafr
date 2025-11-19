
import React, { useState, useMemo } from 'react';
import { User, Tenant, CreditLedgerEntry, LedgerTransactionType } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { CreditLedgerEntryModel } from '../db';
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
            case LedgerTransactionType.CONSUMPTION: return `Used ${-tx.amount} Credits for Service`;
            case LedgerTransactionType.REFUND: return `Refund of ${tx.amount} Credits`;
            case LedgerTransactionType.ADJUSTMENT: return `Admin Adjustment`;
            default: return 'Transaction';
        }
    }

    return (
        <>
            <div className="p-6 bg-gray-50 min-h-full">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Billing & Credits</h1>
                            <p className="text-gray-500">Manage your credits and view transaction history.</p>
                        </div>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back to Dashboard
                        </button>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Credit Balance */}
                        <div className="lg:col-span-1 space-y-8">
                            <div className="bg-white rounded-lg shadow-xl p-8 text-center">
                                <h2 className="text-lg font-bold text-gray-500">Current Balance</h2>
                                <p className="text-5xl font-extrabold text-green-600 my-4">{currentTenant?.credit_balance?.toLocaleString() || 0}</p>
                                <p className="text-gray-600 font-semibold">Credits</p>
                                <button
                                    onClick={() => setIsPurchaseModalOpen(true)}
                                    className="mt-6 w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
                                >
                                    Purchase Credits
                                </button>
                            </div>
                        </div>
                        
                        {/* Transaction History */}
                        <div className="lg:col-span-2 bg-white rounded-lg shadow-xl">
                            <h2 className="text-xl font-bold text-gray-800 p-6 border-b">Transaction History</h2>
                             <div className="max-h-96 overflow-y-auto">
                                <ul className="divide-y">
                                    {transactions.map(tx => (
                                        <li key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                            <div>
                                                <p className="font-semibold text-gray-800">{getTransactionDescription(tx._raw as CreditLedgerEntry)}</p>
                                                <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                                            </div>
                                            <p className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                            </p>
                                        </li>
                                    ))}
                                    {transactions.length === 0 && <li className="p-8 text-center text-gray-500">No transactions yet.</li>}
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
