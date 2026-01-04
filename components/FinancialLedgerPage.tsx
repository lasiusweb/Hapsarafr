import React, { useState, useMemo } from 'react';
import { Farmer, User } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { SubsidyPaymentModel, ManualLedgerEntryModel, FarmerModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { formatCurrency, farmerModelToPlain } from '../lib/utils';

interface FinancialLedgerPageProps {
    allFarmers?: Farmer[];
    onBack: () => void;
    currentUser: User;
    // Optional prop, we'll fetch if missing
    farmers?: FarmerModel[];
}

const FinancialLedgerPage: React.FC<FinancialLedgerPageProps> = ({ allFarmers, farmers, onBack }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');

    // Fetch farmers if not provided
    const fetchedFarmers = useQuery<FarmerModel>(
        useMemo(() => {
            if ((allFarmers && allFarmers.length > 0) || (farmers && farmers.length > 0)) {
                return database.get<FarmerModel>('farmers').query(Q.where('id', 'nothing'));
            }
            return database.get<FarmerModel>('farmers').query();
        }, [allFarmers, farmers, database])
    );

    // Merge passed farmers or fetched farmers
    const farmerList = useMemo(() => {
        if (allFarmers && allFarmers.length > 0) return allFarmers;
        if (farmers && farmers.length > 0) return farmers.map(f => farmerModelToPlain(f)!);
        return fetchedFarmers.map(f => farmerModelToPlain(f)!);
    }, [allFarmers, farmers, fetchedFarmers]);

    const farmerOptions = useMemo(() => farmerList.map(f => ({ value: f.id, label: `${f.fullName} (${f.hap_id || 'N/A'})` })), [farmerList]);

    // Fetch transactions for selected farmer
    const subsidies = useQuery<SubsidyPaymentModel>(
        useMemo(() =>
            selectedFarmerId
                ? database.get<SubsidyPaymentModel>('subsidy_payments').query(Q.where('farmer_id', selectedFarmerId))
                : database.get<SubsidyPaymentModel>('subsidy_payments').query(Q.where('id', 'nothing')),
            [selectedFarmerId, database])
    );

    const manualEntries = useQuery<ManualLedgerEntryModel>(
        useMemo(() =>
            selectedFarmerId
                ? database.get<ManualLedgerEntryModel>('manual_ledger_entries').query(Q.where('farmer_id', selectedFarmerId))
                : database.get<ManualLedgerEntryModel>('manual_ledger_entries').query(Q.where('id', 'nothing')),
            [selectedFarmerId, database])
    );

    const transactions = useMemo(() => {
        const all = [
            ...subsidies.map(s => ({
                id: s.id,
                date: s.paymentDate,
                description: `Subsidy Payment (${s.paymentStage})`,
                amount: s.amount,
                type: 'credit', // Inflow to farmer
                source: 'Gov/Subsidy'
            })),
            ...manualEntries.map(e => ({
                id: e.id,
                date: e.date,
                description: e.description,
                amount: e.amount,
                type: e.type,
                source: 'Manual'
            }))
        ];
        // Sort by date desc
        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [subsidies, manualEntries]);

    const balance = useMemo(() => {
        return transactions.reduce((acc, t) => t.type === 'credit' ? acc + t.amount : acc - t.amount, 0);
    }, [transactions]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Financial Ledger</h1>
                        <p className="text-gray-500">Track income and expenses for individual farmers.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            Back
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select a Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer to view their ledger --" />
                </div>

                {selectedFarmerId ? (
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{farmerList.find(f => f.id === selectedFarmerId)?.fullName}</h2>
                                <p className="text-gray-500">Net Ledger Balance</p>
                            </div>
                            <div className={`text-4xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(balance)}
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit (In)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit (Out)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {transactions.map(t => (
                                        <tr key={t.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(t.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{t.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.source}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                                                {t.type === 'credit' ? formatCurrency(t.amount) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                                                {t.type === 'debit' ? formatCurrency(t.amount) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-500">No transactions found for this farmer.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold">Ready</h2>
                        <p className="mt-2">Select a farmer above to load their financial details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialLedgerPage;
