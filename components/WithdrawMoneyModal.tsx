import React, { useState, useMemo } from 'react';
import { WithdrawalAccount } from '../types';
import { WalletModel } from '../db';
import CustomSelect from './CustomSelect';

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
    });
};

interface WithdrawMoneyModalProps {
    onClose: () => void;
    onSave: (data: { accountId: string, amount: number }) => Promise<void>;
    walletBalance: number;
    withdrawalAccounts: WithdrawalAccount[];
    onAddAccount: () => void;
}

const WithdrawMoneyModal: React.FC<WithdrawMoneyModalProps> = ({ onClose, onSave, walletBalance, withdrawalAccounts, onAddAccount }) => {
    const [accountId, setAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const accountOptions = useMemo(() => 
        withdrawalAccounts
            .filter(acc => acc.isVerified)
            .map(acc => ({ value: acc.id, label: `${acc.accountType === 'bank_account' ? 'Bank' : 'UPI'}: ${acc.details}`})), 
    [withdrawalAccounts]);
    
    const unverifiedAccounts = useMemo(() => withdrawalAccounts.filter(acc => !acc.isVerified), [withdrawalAccounts]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAmount = e.target.value;
        setAmount(newAmount);

        const numericAmount = parseFloat(newAmount);
        if (numericAmount > walletBalance) {
            setError('Amount cannot exceed available balance.');
        } else if (numericAmount <= 0) {
            setError('Amount must be positive.');
        } else {
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);

        if (error || !accountId || isNaN(numericAmount) || numericAmount <= 0) {
            alert('Please select a verified account and enter a valid amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                accountId,
                amount: numericAmount,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Withdraw Money</h2></div>
                <div className="p-8 space-y-4">
                    {accountOptions.length > 0 ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Withdraw to</label>
                                <CustomSelect options={accountOptions} value={accountId} onChange={setAccountId} placeholder="-- Select a Verified Account --" />
                            </div>
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                                <input 
                                    id="amount" 
                                    type="number" 
                                    step="0.01" 
                                    value={amount} 
                                    onChange={handleAmountChange} 
                                    required 
                                    className={`mt-1 w-full p-2.5 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                <p className={`text-xs mt-1 ${error ? 'text-red-600' : 'text-gray-500'}`}>
                                    {error || `Available to withdraw: ${formatCurrency(walletBalance)}`}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="font-semibold text-yellow-800">No Verified Withdrawal Accounts</p>
                            <p className="text-sm text-yellow-700 mt-1">Please add and verify a bank account or UPI ID for this farmer before you can withdraw funds.</p>
                            <button type="button" onClick={onAddAccount} className="mt-4 text-sm font-semibold text-blue-600 hover:underline">Go to Farmer Profile to Add Account</button>
                        </div>
                    )}
                    
                    {unverifiedAccounts.length > 0 && (
                        <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
                            <p className="font-semibold">Pending Verification:</p>
                            <ul className="list-disc list-inside ml-2">
                                {unverifiedAccounts.map(acc => <li key={acc.id}>{acc.details}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting || !!error || !accountId || !amount || accountOptions.length === 0} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Processing...' : 'Request Withdrawal'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WithdrawMoneyModal;