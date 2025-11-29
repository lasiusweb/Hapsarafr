






import React, { useState, useMemo, useCallback, useEffect } from 'react';
import withObservables from '@nozbe/with-observables';
import { User, Farmer, EntrySource, TransactionStatus, WithdrawalAccount, LoanApplication, LoanStatus } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, WalletModel, WalletTransactionModel, WithdrawalAccountModel, KhataRecordModel, DealerModel, FarmPlotModel, HarvestLogModel, TaskModel, LoanApplicationModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import SendMoneyModal from './SendMoneyModal';
import WithdrawMoneyModal from './WithdrawMoneyModal';
import { formatCurrency } from '../lib/utils';
import SubsidyDisbursementModal from './SubsidyDisbursementModal';
import { calculateCreditScore, CreditScoreResult } from '../lib/financeEngine';
import LoanApplicationModal from './LoanApplicationModal';

interface FinancialsPageProps {
    allFarmers: Farmer[];
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
    onNavigate: (view: string, param?: string) => void;
}

// --- Credit Score Component ---
const CreditScorePanel: React.FC<{ result: CreditScoreResult }> = ({ result }) => {
    const { totalScore, breakdown, rating, maxLoanEligibility } = result;
    
    let color = 'text-gray-400';
    let ringColor = 'stroke-gray-200';
    if (totalScore >= 750) { color = 'text-green-600'; ringColor = 'stroke-green-500'; }
    else if (totalScore >= 650) { color = 'text-blue-600'; ringColor = 'stroke-blue-500'; }
    else if (totalScore >= 550) { color = 'text-yellow-600'; ringColor = 'stroke-yellow-500'; }
    else { color = 'text-red-600'; ringColor = 'stroke-red-500'; }

    // SVG Arc calc
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (totalScore / 850) * circumference;

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">Credit Health</h3>
                    <p className="text-xs text-gray-500">Hapsara Proprietary Score</p>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded border ${color.replace('text', 'bg').replace('600', '100')} ${color.replace('text', 'border').replace('600', '200')} ${color}`}>
                    {rating}
                </span>
            </div>

            <div className="flex items-center gap-6">
                {/* Gauge */}
                <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        <circle cx="50" cy="50" r={radius} fill="none" className={ringColor} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-extrabold ${color}`}>{totalScore}</span>
                        <span className="text-[10px] text-gray-400 uppercase">Score</span>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {Object.entries(breakdown).map(([key, val]) => {
                        const v = val as { score: number; max: number; label: string };
                        return (
                            <div key={key}>
                                <p className="text-gray-500">{v.label}</p>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(v.score / v.max) * 100}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-dashed">
                <p className="text-sm text-gray-600 flex justify-between">
                    <span>Loan Eligibility:</span>
                    <span className="font-bold text-indigo-700">{formatCurrency(maxLoanEligibility)}</span>
                </p>
            </div>
        </div>
    );
};

const WalletView = withObservables(['farmerId'], ({ farmerId }: { farmerId: string }) => {
    const database = useDatabase();
    return {
        wallets: database.get<WalletModel>('wallets').query(Q.where('farmer_id', farmerId)).observe(),
    };
})((props: { 
    farmerId: string, 
    wallets: WalletModel[], 
    currentUser: User,
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
    onOpenSendMoney: () => void;
    onOpenWithdrawMoney: () => void;
    onRefresh: () => void;
}) => {
    const { farmerId, wallets, currentUser, setNotification, onOpenSendMoney, onOpenWithdrawMoney, onRefresh } = props;
    const wallet = wallets?.[0];
    const database = useDatabase();
    
    const transactions = useQuery(useMemo(() => 
        wallet ? database.get<WalletTransactionModel>('wallet_transactions').query(Q.where('wallet_id', (wallet as any).id), Q.sortBy('created_at', 'desc')) : database.get<WalletTransactionModel>('wallet_transactions').query(Q.where('id', 'null')),
    [database, wallet]));
    
    // Fetch Data for Credit Engine
    const farmer = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('id', farmerId)), [database, farmerId]))[0];
    const plots = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', farmerId)), [database, farmerId]));
    // Harvest Logs via Crop Assignments is complex to query directly in one go without heavy joining. 
    // For MVP, we fetch all harvest logs and filter in JS (assuming local DB isn't huge) or optimize later.
    // Better: Fetch crop assignments for farmer, then harvest logs for those assignments.
    const cropAssignments = useQuery(useMemo(() => 
        plots.length > 0 ? database.get('crop_assignments').query(Q.where('farm_plot_id', Q.oneOf(plots.map(p => p.id)))) : database.get('crop_assignments').query(Q.where('id', 'null')),
    [database, plots]));
    const caIds = useMemo(() => cropAssignments.map(ca => ca.id), [cropAssignments]);
    const harvestLogs = useQuery(useMemo(() => 
        caIds.length > 0 ? database.get<HarvestLogModel>('harvest_logs').query(Q.where('crop_assignment_id', Q.oneOf(caIds))) : database.get<HarvestLogModel>('harvest_logs').query(Q.where('id', 'null')),
    [database, caIds]));
    
    const tasks = useQuery(useMemo(() => database.get<TaskModel>('tasks').query(Q.where('farmer_id', farmerId)), [database, farmerId]));
    const khataRecords = useQuery(useMemo(() => database.get<KhataRecordModel>('khata_records').query(Q.where('farmer_id', farmerId)), [database, farmerId]));
    const loanApplications = useQuery(useMemo(() => database.get<LoanApplicationModel>('loan_applications').query(Q.where('farmer_id', farmerId)), [database, farmerId]));

    const dealerMap = useMemo(() => new Map(), []); // Simplified for now

    // Calculate Credit Score
    const creditResult = useMemo(() => {
        if (!farmer) return null;
        // FIX: Cast raw records to expected types for calculation engine
        return calculateCreditScore(
            farmer._raw as unknown as Farmer, 
            plots.map(p => p._raw as any), 
            harvestLogs.map(h => h._raw as any), 
            tasks.map(t => t._raw as any), 
            khataRecords.map(k => k._raw as any)
        );
    }, [farmer, plots, harvestLogs, tasks, khataRecords]);

    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

    const handleCreateWallet = async () => {
        if (!farmerId) return;
        try {
            await database.write(async () => {
                await database.get<WalletModel>('wallets').create(w => {
                    w.farmerId = farmerId;
                    w.balance = 0;
                });
            });
            setNotification({ message: 'Wallet created successfully!', type: 'success' });
        } catch (error) {
            console.error("Failed to create wallet:", error);
            setNotification({ message: 'Failed to create wallet.', type: 'error' });
        }
    };

    if (!wallet) {
        return (
            <div className="text-center p-10 bg-gray-50 rounded-lg border-2 border-dashed">
                <p className="font-semibold text-gray-700">No wallet found for this farmer.</p>
                <button onClick={handleCreateWallet} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Create Wallet</button>
            </div>
        );
    }

    const getTransactionIcon = (source: string) => {
        if (source.includes('Subsidy') || source.includes('Harvest')) return '🎁';
        if (source.includes('P2P')) return '👥';
        if (source.includes('Withdrawal')) return '🏦';
        if (source.includes('Marketplace')) return '🛒';
        return '⚙️';
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Wallet Card */}
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-xl shadow-lg p-8">
                    <p className="text-lg opacity-80">Current Balance</p>
                    <p className="text-5xl font-bold mt-2">{formatCurrency(wallet.balance)}</p>
                    <div className="mt-6 flex gap-4">
                         <button onClick={onOpenSendMoney} disabled={wallet.balance <= 0} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition flex items-center gap-2 disabled:opacity-50"><span>💸</span> Send</button>
                         <button onClick={onOpenWithdrawMoney} disabled={wallet.balance <= 0} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition flex items-center gap-2 disabled:opacity-50"><span>🏦</span> Withdraw</button>
                    </div>
                </div>
                
                {/* Active Loans */}
                {loanApplications.length > 0 && (
                     <div className="bg-white rounded-lg shadow-md border border-indigo-100 p-4">
                        <h3 className="font-bold text-indigo-900 mb-3">Loan Applications</h3>
                        <div className="space-y-2">
                            {loanApplications.map(loan => (
                                <div key={loan.id} className="flex justify-between items-center bg-indigo-50 p-3 rounded">
                                    <div>
                                        <p className="font-semibold text-indigo-800">{loan.loanType.replace('_', ' ')}</p>
                                        <p className="text-xs text-indigo-600">{new Date(loan.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800">{formatCurrency(loan.amountRequested)}</p>
                                        <span className="text-xs bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">{loan.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                )}

                {/* Transactions */}
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Wallet History</h3>
                    <div className="bg-white rounded-lg shadow-md divide-y border border-gray-200">
                        {transactions.map(tx => (
                            <div key={tx.id} className="p-4 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="bg-gray-100 p-3 rounded-full text-xl">{getTransactionIcon(tx.source)}</div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{tx.description}</p>
                                        <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className={`font-bold ${tx.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.transactionType === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                                </p>
                            </div>
                        ))}
                        {transactions.length === 0 && <p className="text-center text-gray-500 p-8">No transactions yet.</p>}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                 {creditResult && <CreditScorePanel result={creditResult} />}
                 
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                     <h4 className="font-bold text-gray-700 mb-3">Financial Actions</h4>
                     <button 
                        onClick={() => setIsLoanModalOpen(true)}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 flex items-center justify-center gap-2 mb-3"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Apply for Loan
                     </button>
                     <p className="text-xs text-gray-500 text-center">
                         Apply for KCC, Equipment finance, or Input credit based on your Hapsara Score.
                     </p>
                 </div>
            </div>

            {isLoanModalOpen && farmer && creditResult && (
                <LoanApplicationModal 
                    onClose={() => setIsLoanModalOpen(false)}
                    farmer={farmer._raw as unknown as Farmer}
                    creditScore={creditResult.totalScore}
                    maxEligibility={creditResult.maxLoanEligibility}
                    currentUser={currentUser}
                    onSuccess={onRefresh}
                />
            )}
        </div>
    );
});


const FinancialsPage: React.FC<FinancialsPageProps> = ({ allFarmers, onBack, currentUser, setNotification, onNavigate }) => {
    const isOnline = useOnlineStatus();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [isSendMoneyModalOpen, setIsSendMoneyModalOpen] = useState(false);
    const [isWithdrawMoneyModalOpen, setIsWithdrawMoneyModalOpen] = useState(false);
    const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);
    const database = useDatabase();

    const farmerOptions = useMemo(() => allFarmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hap_id || 'N/A'})` })), [allFarmers]);
    const selectedFarmer = useMemo(() => allFarmers.find(f => f.id === selectedFarmerId), [allFarmers, selectedFarmerId]);

    const senderWallet = useQuery(useMemo(() => 
        selectedFarmerId ? database.get<WalletModel>('wallets').query(Q.where('farmer_id', selectedFarmerId)) : database.get<WalletModel>('wallets').query(Q.where('id', 'null')),
    [database, selectedFarmerId]))[0];

    const withdrawalAccounts = useQuery(useMemo(() =>
        selectedFarmerId ? database.get<WithdrawalAccountModel>('withdrawal_accounts').query(Q.where('farmer_id', selectedFarmerId)) : database.get<WithdrawalAccountModel>('withdrawal_accounts').query(Q.where('id', 'null')),
    [database, selectedFarmerId]));
    
    const plainWithdrawalAccounts: WithdrawalAccount[] = useMemo(() => withdrawalAccounts.map(acc => acc._raw as unknown as WithdrawalAccount), [withdrawalAccounts]);

    const handleSendMoney = useCallback(async ({ recipientId, amount, description }: { recipientId: string, amount: number, description: string }) => {
        const recipientFarmer = allFarmers.find(f => f.id === recipientId);
        if (!recipientFarmer || !senderWallet || !selectedFarmer) {
            setNotification({ message: 'An error occurred. Sender or recipient not found.', type: 'error' });
            return;
        }

        try {
            await database.write(async () => {
                const recipientWallets = await database.get<WalletModel>('wallets').query(Q.where('farmer_id', recipientId)).fetch();
                let recipientWallet = recipientWallets[0];

                if (!recipientWallet) {
                    recipientWallet = await database.get<WalletModel>('wallets').create(w => {
                        w.farmerId = recipientId;
                        w.balance = 0;
                    });
                }
                
                await senderWallet.update(w => { w.balance -= amount; });
                await recipientWallet.update(w => { w.balance += amount; });
                
                await database.get<WalletTransactionModel>('wallet_transactions').create(t => {
                    t.walletId = (senderWallet as any).id;
                    t.transactionType = 'debit';
                    t.amount = amount;
                    t.source = EntrySource.P2PTransferOut;
                    t.description = description || `Sent to ${recipientFarmer.fullName}`;
                    t.status = TransactionStatus.Completed;
                    t.metadataJson = JSON.stringify({ recipientId: recipientId, recipientName: recipientFarmer.fullName });
                });
                
                await database.get<WalletTransactionModel>('wallet_transactions').create(t => {
                    t.walletId = (recipientWallet as any).id;
                    t.transactionType = 'credit';
                    t.amount = amount;
                    t.source = EntrySource.P2PTransferIn;
                    t.description = description || `Received from ${selectedFarmer.fullName}`;
                    t.status = TransactionStatus.Completed;
                    t.metadataJson = JSON.stringify({ senderId: selectedFarmerId, senderName: selectedFarmer.fullName });
                });
            });
            setNotification({ message: 'Money sent successfully!', type: 'success' });
            setIsSendMoneyModalOpen(false);
        } catch (error) {
            console.error("Failed to send money:", error);
            setNotification({ message: 'Failed to send money. Please try again.', type: 'error' });
        }
    }, [database, senderWallet, selectedFarmer, selectedFarmerId, allFarmers, setNotification]);

    const handleWithdrawMoney = useCallback(async ({ accountId, amount }: { accountId: string, amount: number }) => {
        const account = plainWithdrawalAccounts.find(acc => acc.id === accountId);
        if (!account || !senderWallet) {
            setNotification({ message: 'An error occurred. Sender wallet or account not found.', type: 'error' });
            return;
        }

        try {
            await database.write(async () => {
                await senderWallet.update(w => { w.balance -= amount; });

                await database.get<WalletTransactionModel>('wallet_transactions').create(t => {
                    t.walletId = (senderWallet as any).id;
                    t.transactionType = 'debit';
                    t.amount = amount;
                    t.source = EntrySource.Withdrawal;
                    t.description = `Withdrawal to ${account.details}`;
                    t.status = TransactionStatus.Pending;
                    t.metadataJson = JSON.stringify({ withdrawalAccountId: accountId });
                });
            });
            setNotification({ message: 'Withdrawal request submitted successfully.', type: 'success' });
            setIsWithdrawMoneyModalOpen(false);
        } catch (error) {
            console.error("Failed to request withdrawal:", error);
            setNotification({ message: 'Failed to request withdrawal. Please try again.', type: 'error' });
        }
    }, [database, senderWallet, plainWithdrawalAccounts, setNotification]);
    
    // Refresh handler simply forces re-render by toggling ID slightly if needed, but observables handle it mostly.
    const handleRefresh = () => {
         // No-op, observables handle updates
    };

    if (!isOnline) {
         return (
            <div className="p-6 bg-gray-50 min-h-full">
                <div className="max-w-4xl mx-auto text-center py-20 bg-white rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold text-yellow-800">Financials Offline</h2>
                    <p className="mt-2 text-gray-600 max-w-md mx-auto">Wallet and payment features are disabled while you are offline. Please connect to the internet to manage farmer finances.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Farmer Wallet Dashboard</h1>
                        <p className="text-gray-500">Manage farmer wallets, view transactions, and initiate payments.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsDisbursementModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm">Disburse Subsidy</button>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            Back
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select a Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer to view their wallet --" />
                </div>
                
                {selectedFarmerId ? (
                    <WalletView 
                        farmerId={selectedFarmerId} 
                        currentUser={currentUser}
                        setNotification={setNotification} 
                        onOpenSendMoney={() => setIsSendMoneyModalOpen(true)} 
                        onOpenWithdrawMoney={() => setIsWithdrawMoneyModalOpen(true)}
                        onRefresh={handleRefresh}
                    />
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <h2 className="text-xl font-semibold mt-4">Select a Farmer</h2>
                        <p className="mt-1">Choose a farmer from the list above to view their wallet and transaction history.</p>
                    </div>
                )}
            </div>

            {isSendMoneyModalOpen && selectedFarmer && senderWallet && (
                <SendMoneyModal
                    onClose={() => setIsSendMoneyModalOpen(false)}
                    onSave={handleSendMoney}
                    senderWallet={senderWallet}
                    senderFarmer={selectedFarmer}
                    allFarmers={allFarmers}
                />
            )}
            {isWithdrawMoneyModalOpen && selectedFarmer && senderWallet && (
                <WithdrawMoneyModal
                    onClose={() => setIsWithdrawMoneyModalOpen(false)}
                    onSave={handleWithdrawMoney}
                    walletBalance={senderWallet.balance}
                    withdrawalAccounts={plainWithdrawalAccounts}
                    onAddAccount={() => onNavigate('farmer-details', selectedFarmer.id)}
                />
            )}
             {isDisbursementModalOpen && (
                <SubsidyDisbursementModal
                    onClose={() => setIsDisbursementModalOpen(false)}
                    onSave={async () => {}} // This will be implemented in the modal
                    allFarmers={allFarmers}
                />
            )}
        </div>
    );
};

export default FinancialsPage;
