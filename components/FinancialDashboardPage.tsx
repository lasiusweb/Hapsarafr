import React, { useState, useMemo } from 'react';
import { User, Farmer } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, FinancialTransactionModel, FarmerWalletModel } from '../db';
import CustomSelect from './CustomSelect';
import { Q } from '@nozbe/watermelondb';

interface FinancialDashboardPageProps {
    onBack: () => void;
    currentUser: User;
}

const formatCurrency = (value: number) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

const TransactionRow: React.FC<{ transaction: FinancialTransactionModel }> = ({ transaction }) => {
    const isIncome = transaction.transactionType === 'Payment In';
    return (
        <tr className="border-b">
            <td className="px-4 py-3 text-sm text-gray-600">{new Date(transaction.transactionDate).toLocaleDateString()}</td>
            <td className="px-4 py-3 text-sm font-medium text-gray-800">{transaction.transactionType}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{transaction.notes}</td>
            <td className={`px-4 py-3 text-sm font-semibold text-right ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
            </td>
        </tr>
    );
};

const FinancialDashboardPage: React.FC<FinancialDashboardPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState('');

    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const farmerOptions = useMemo(() => allFarmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.farmerId})` })), [allFarmers]);
    
    // Fetch data for the selected farmer
    const wallet = useQuery(useMemo(() => selectedFarmerId ? database.get<FarmerWalletModel>('farmer_wallets').query(Q.where('farmer_id', selectedFarmerId)) : database.get<FarmerWalletModel>('farmer_wallets').query(Q.where('id', 'null')), [database, selectedFarmerId]))[0];
    const transactions = useQuery(useMemo(() => selectedFarmerId ? database.get<FinancialTransactionModel>('financial_transactions').query(Q.where('farmer_id', selectedFarmerId), Q.sortBy('transaction_date', Q.desc)) : database.get<FinancialTransactionModel>('financial_transactions').query(Q.where('id', 'null')), [database, selectedFarmerId]));
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Financial Dashboard</h1>
                        <p className="text-gray-500">View farmer wallet balances and transaction history.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Back
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select a Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer to view their dashboard --" />
                </div>

                {selectedFarmerId ? (
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-lg shadow-xl border-l-8 border-green-500">
                             <p className="text-lg font-semibold text-gray-600">Current Wallet Balance</p>
                             <p className="text-5xl font-bold text-gray-800 mt-2">{formatCurrency(wallet?.currentBalance || 0)}</p>
                             <div className="mt-6 flex gap-4">
                                <button className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Withdraw Funds</button>
                                <button className="px-5 py-2.5 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">View Statement</button>
                             </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md">
                            <div className="p-4 border-b">
                                <h3 className="text-xl font-bold text-gray-800">Recent Transactions</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.length > 0 ? transactions.map(t => <TransactionRow key={t.id} transaction={t} />)
                                         : <tr><td colSpan={4} className="text-center py-10 text-gray-500">No transactions found for this farmer.</td></tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold">Select a Farmer to Begin</h2>
                        <p className="mt-2">Choose a farmer from the dropdown to view their financial dashboard.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialDashboardPage;
