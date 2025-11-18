import React, { useState, useMemo, useCallback } from 'react';
import withObservables from '@nozbe/with-observables';
import { User, Farmer, EntrySource, TransactionStatus, WithdrawalAccount } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, WalletModel, WalletTransactionModel, WithdrawalAccountModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import SendMoneyModal from './SendMoneyModal';
import WithdrawMoneyModal from './WithdrawMoneyModal';
import { formatCurrency } from '../lib/utils';

interface FinancialsPageProps {
    allFarmers: Farmer[];
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
    onNavigate: (view: string, param?: string) => void;
}

const WalletView = withObservables(['farmerId'], ({ farmerId }: { farmerId: string }) => {
    const database = useDatabase();
    return {
        wallets: database.get<WalletModel>('wallets').query(Q.where('farmer_id', farmerId)).observe(),
    };
})((props: { 
    farmerId: string, 
    wallets: WalletModel[], 
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
    onOpenSendMoney: () => void;
    onOpenWithdrawMoney: () => void;
}) => {
    const { farmerId, wallets, setNotification, onOpenSendMoney, onOpenWithdrawMoney } = props;
    const wallet = wallets?.[0];
    const database = useDatabase();
    
    const transactions = useQuery(useMemo(() => 
        wallet ? database.get<WalletTransactionModel>('wallet_transactions').query(Q.where('wallet_id', wallet.id), Q.sortBy('created_at', 'desc')) : database.get<WalletTransactionModel>('wallet_transactions').query(Q.where('id', 'null')),
    [database, wallet]));

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
        if (source.includes('Subsidy')) return '🎁';
        if (source.includes('P2P')) return '👥';
        if (source.includes('Withdrawal')) return '🏦';
        if (source.includes('Marketplace')) return '🛒';
        return '⚙️';
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-xl shadow-lg p-8">
                <p className="text-lg opacity-80">Current Balance</p>
                <p className="text-5xl font-bold mt-2">{formatCurrency(wallet.balance)}</p>
                <p className="text-xs opacity-70 mt-4">Last updated: {new Date(wallet.updatedAt).toLocaleString()}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={onOpenSendMoney} disabled={wallet.balance <= 0} className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-3 disabled:bg-gray-100 disabled:cursor-not-allowed"><span className="text-2xl">💸</span> <span className="font-semibold">Send Money</span></button>
                <button onClick={onOpenWithdrawMoney} disabled={wallet.balance <= 0} className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-3 disabled:bg-gray-100 disabled:cursor-not-allowed"><span className="text-2xl">🏦</span> <span className="font-semibold">Withdraw</span></button>
                <button onClick={() => setNotification({ message: 'Adding money to the wallet is coming soon.', type: 'info' })} className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-3"><span className="text-2xl">💳</span> <span className="font-semibold">Add Money</span></button>
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Transactions</h3>
                <div className="bg-white rounded-lg shadow-md divide-y">
                    {transactions.map(tx => (
                        <div key={tx.id} className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-100 p-3 rounded-full">{getTransactionIcon(tx.source)}</div>
                                <div>
                                    <p className="font-semibold">{tx.description}</p>
                                    <p className="text-sm text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <p className={`font-bold text-lg ${tx.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.transactionType === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                            </p>
                        </div>
                    ))}
                    {transactions.length === 0 && <p className="text-center text-gray-500 p-8">No transactions yet.</p>}
                </div>
            </div>
        </div>
    );
});


const FinancialsPage: React.FC<FinancialsPageProps> = ({ allFarmers, onBack, currentUser, setNotification, onNavigate }) => {
    const isOnline = useOnlineStatus();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [isSendMoneyModalOpen, setIsSendMoneyModalOpen] = useState(false);
    const [isWithdrawMoneyModalOpen, setIsWithdrawMoneyModalOpen] = useState(false);
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

                // 1. If recipient has no wallet, create one.
                if (!recipientWallet) {
                    recipientWallet = await database.get<WalletModel>('wallets').create(w => {
                        w.farmerId = recipientId;
                        w.balance = 0;
                    });
                }
                
                // 2. Update sender's balance
                await senderWallet.update(w => { w.balance -= amount; });

                // 3. Update recipient's balance
                await recipientWallet.update(w => { w.balance += amount; });
                
                // 4. Create sender's transaction (debit)
                await database.get<WalletTransactionModel>('wallet_transactions').create(t => {
                    t.walletId = senderWallet.id;
                    t.transactionType = 'debit';
                    t.amount = amount;
                    t.source = EntrySource.P2PTransferOut;
                    t.description = description || `Sent to ${recipientFarmer.fullName}`;
                    t.status = TransactionStatus.Completed;
                    t.metadataJson = JSON.stringify({ recipientId: recipientId, recipientName: recipientFarmer.fullName });
                });
                
                // 5. Create recipient's transaction (credit)
                await database.get<WalletTransactionModel>('wallet_transactions').create(t => {
                    t.walletId = recipientWallet.id;
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
                // 1. Update wallet balance
                await senderWallet.update(w => { w.balance -= amount; });

                // 2. Create withdrawal transaction
                await database.get<WalletTransactionModel>('wallet_transactions').create(t => {
                    t.walletId = senderWallet.id;
                    t.transactionType = 'debit';
                    t.amount = amount;
                    t.source = EntrySource.Withdrawal;
                    t.description = `Withdrawal to ${account.details}`;
                    t.status = TransactionStatus.Pending; // Pending until processed by a payment gateway
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
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Farmer Finances</h1>
                        <p className="text-gray-500">Manage farmer wallets, view transactions, and initiate payments.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Back to Dashboard
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-end">
                    <div className="flex-grow">
                       <CustomSelect label="Select a Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer to view their wallet --" />
                    </div>
                </div>
                
                {selectedFarmerId ? (
                    <WalletView farmerId={selectedFarmerId} setNotification={setNotification} onOpenSendMoney={() => setIsSendMoneyModalOpen(true)} onOpenWithdrawMoney={() => setIsWithdrawMoneyModalOpen(true)} />
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
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
        </div>
    );
};

export default FinancialsPage;