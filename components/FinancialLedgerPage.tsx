import React, { useState, useMemo, useCallback } from 'react';
import { Farmer, ManualLedgerEntry, User, EntrySource } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, SubsidyPaymentModel, ResourceDistributionModel, ResourceModel, ManualLedgerEntryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { formatCurrency } from '../lib/utils';

interface LedgerItem {
    date: Date;
    description: string;
    category: 'Income' | 'Expense';
    income: number;
    expense: number;
    balance: number;
}

interface FinancialLedgerPageProps {
    allFarmers: Farmer[];
    onBack: () => void;
    currentUser: User;
}

const StatCard: React.FC<{ title: string; value: string; className?: string }> = ({ title, value, className }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
);

const AddEntryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: Omit<ManualLedgerEntry, 'id' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'tenantId'>) => void;
    farmerId: string;
}> = ({ isOpen, onClose, onSave, farmerId }) => {
    const [formState, setFormState] = useState({
        entryDate: new Date().toISOString().split('T')[0],
        description: '',
        category: 'Expense' as 'Income' | 'Expense',
        amount: '',
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formState,
            farmerId,
            amount: parseFloat(formState.amount) || 0,
            entrySource: EntrySource.ManualEntry,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Add Manual Ledger Entry</h2></div>
                <div className="p-8 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input type="date" value={formState.entryDate} onChange={e => setFormState(s => ({ ...s, entryDate: e.target.value }))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input type="text" value={formState.description} onChange={e => setFormState(s => ({ ...s, description: e.target.value }))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <CustomSelect value={formState.category} onChange={v => setFormState(s => ({ ...s, category: v as 'Income' | 'Expense' }))} options={[{value: 'Expense', label: 'Expense'}, {value: 'Income', label: 'Income'}]} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                            <input type="number" step="0.01" value={formState.amount} onChange={e => setFormState(s => ({ ...s, amount: e.target.value }))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save Entry</button>
                </div>
            </form>
        </div>
    );
};

const CashFlowChart: React.FC<{ items: LedgerItem[] }> = ({ items }) => {
    const monthlyData = useMemo(() => {
        if (!items.length) return [];
        const dataByMonth: Record<string, { income: number, expense: number }> = {};
        
        items.forEach(item => {
            const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
            if (!dataByMonth[monthKey]) {
                dataByMonth[monthKey] = { income: 0, expense: 0 };
            }
            dataByMonth[monthKey].income += item.income;
            dataByMonth[monthKey].expense += item.expense;
        });
        
        return Object.entries(dataByMonth)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([key, value]) => {
                const [year, month] = key.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                const monthLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                return { label: monthLabel, ...value };
            });
    }, [items]);

    const maxAmount = useMemo(() => Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1), [monthlyData]);
    
    if (monthlyData.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Monthly Cash Flow</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {monthlyData.map((month) => (
                    <div key={month.label}>
                        <p className="text-sm font-semibold text-gray-600 mb-2">{month.label}</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-20 text-right text-sm font-semibold text-green-600">{formatCurrency(month.income)}</div>
                                <div className="flex-1 bg-gray-200 rounded-full h-5">
                                    <div className="bg-green-400 h-5 rounded-full" style={{ width: `${(month.income / maxAmount) * 100}%` }}></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-20 text-right text-sm font-semibold text-red-600">{formatCurrency(month.expense)}</div>
                                 <div className="flex-1 bg-gray-200 rounded-full h-5">
                                    <div className="bg-red-400 h-5 rounded-full" style={{ width: `${(month.expense / maxAmount) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
             <div className="flex justify-end gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-400 rounded-sm"></div> Income</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded-sm"></div> Expense</div>
            </div>
        </div>
    );
};


const FinancialLedgerPage: React.FC<FinancialLedgerPageProps> = ({ allFarmers, onBack, currentUser }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const farmerOptions = useMemo(() => allFarmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.farmerId})` })), [allFarmers]);
    
    // Fetch all resources once
    const allResources = useQuery(useMemo(() => database.get<ResourceModel>('resources').query(), [database]));
    const resourceMap = useMemo(() => new Map(allResources.map(r => [r.id, r])), [allResources]);

    // Fetch data for the selected farmer
    const selectedFarmer = useQuery<FarmerModel>(useMemo(() => selectedFarmerId ? database.get<FarmerModel>('farmers').query(Q.where('id', selectedFarmerId)) : database.get<FarmerModel>('farmers').query(Q.where('id', 'null')), [database, selectedFarmerId]))[0];
    const subsidyPayments = useQuery<SubsidyPaymentModel>(useMemo(() => selectedFarmer ? selectedFarmer.subsidyPayments : database.get<SubsidyPaymentModel>('subsidy_payments').query(Q.where('id', 'null')), [selectedFarmer]));
    const resourceDistributions = useQuery<ResourceDistributionModel>(useMemo(() => selectedFarmer ? selectedFarmer.resourceDistributions : database.get<ResourceDistributionModel>('resource_distributions').query(Q.where('id', 'null')), [selectedFarmer]));
    const manualEntries = useQuery<ManualLedgerEntryModel>(useMemo(() => selectedFarmer ? selectedFarmer.manualLedgerEntries : database.get<ManualLedgerEntryModel>('manual_ledger_entries').query(Q.where('id', 'null')), [selectedFarmer]));
    
    const ledgerData = useMemo((): { items: LedgerItem[], totalIncome: number, totalExpense: number, net: number } => {
        if (!selectedFarmerId) return { items: [], totalIncome: 0, totalExpense: 0, net: 0 };
        
        const subsidyItems = subsidyPayments.map(p => ({
            date: new Date(p.paymentDate),
            description: `Subsidy: ${p.paymentStage}`,
            category: 'Income' as const,
            amount: p.amount,
        }));
        
        const resourceItems = resourceDistributions.map(d => {
            const resource = resourceMap.get(d.resourceId);
            const cost = resource?.cost ? resource.cost * d.quantity : 0;
            return {
                date: new Date(d.distributionDate),
                description: `Expense: ${resource?.name || 'Unknown Resource'} (x${d.quantity})`,
                category: 'Expense' as const,
                amount: cost,
            };
        });

        const manualItems = manualEntries.map(e => ({
            date: new Date(e.entryDate),
            description: e.description,
            category: e.category,
            amount: e.amount,
        }));

        const combined = [...subsidyItems, ...resourceItems, ...manualItems].sort((a, b) => a.date.getTime() - b.date.getTime());

        let balance = 0;
        let totalIncome = 0;
        let totalExpense = 0;

        const items = combined.map(item => {
            const income = item.category === 'Income' ? item.amount : 0;
            const expense = item.category === 'Expense' ? item.amount : 0;
            balance += income - expense;
            totalIncome += income;
            totalExpense += expense;
            return {
                ...item,
                income,
                expense,
                balance,
            };
        });

        return { items, totalIncome, totalExpense, net: totalIncome - totalExpense };

    }, [selectedFarmerId, subsidyPayments, resourceDistributions, manualEntries, resourceMap]);

    const handleSaveEntry = useCallback(async (entryData: Omit<ManualLedgerEntry, 'id' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'tenantId'>) => {
        await database.write(async () => {
            await database.get<ManualLedgerEntryModel>('manual_ledger_entries').create(entry => {
                entry.farmerId = entryData.farmerId;
                entry.entryDate = entryData.entryDate;
                entry.description = entryData.description;
                entry.category = entryData.category;
                entry.amount = entryData.amount;
                entry.entrySource = entryData.entrySource;
                entry.syncStatusLocal = 'pending';
                entry.tenantId = currentUser.tenantId;
            });
        });
        setIsModalOpen(false);
    }, [database, currentUser]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Financial Ledger</h1>
                        <p className="text-gray-500">Track income and expenses for individual farmers.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select a Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer to view their ledger --" />
                </div>
                
                {selectedFarmerId ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard title="Total Income" value={formatCurrency(ledgerData.totalIncome)} className="border-l-4 border-green-500" />
                            <StatCard title="Total Expenses" value={formatCurrency(ledgerData.totalExpense)} className="border-l-4 border-red-500" />
                            <StatCard title="Net Profit / Loss" value={formatCurrency(ledgerData.net)} className={`border-l-4 ${ledgerData.net >= 0 ? 'border-green-500' : 'border-red-500'}`} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3 bg-white rounded-lg shadow-md">
                                <div className="p-4 border-b flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-800">Ledger Details</h3>
                                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm">+ Add Manual Entry</button>
                                </div>
                                <div className="overflow-y-auto max-h-[60vh]">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Income (+)</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expense (-)</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {ledgerData.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.date.toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.description}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{item.income > 0 ? formatCurrency(item.income) : ''}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">{item.expense > 0 ? formatCurrency(item.expense) : ''}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700 text-right">{formatCurrency(item.balance)}</td>
                                                </tr>
                                            ))}
                                            {ledgerData.items.length === 0 && (
                                                <tr><td colSpan={5} className="text-center py-10 text-gray-500">No financial activity recorded.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <CashFlowChart items={ledgerData.items} />
                            </div>
                        </div>
                    </div>
                ) : (
                     <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold">Select a Farmer to Begin</h2>
                        <p className="mt-2">Choose a farmer from the dropdown to view their financial ledger.</p>
                    </div>
                )}

                <AddEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEntry} farmerId={selectedFarmerId} />
            </div>
        </div>
    );
};

export default FinancialLedgerPage;