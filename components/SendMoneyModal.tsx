import React, { useState, useMemo } from 'react';
import { Farmer } from '../types';
import { WalletModel } from '../db';
import CustomSelect from './CustomSelect';

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
    });
};

interface SendMoneyModalProps {
    onClose: () => void;
    onSave: (data: { recipientId: string, amount: number, description: string }) => Promise<void>;
    senderWallet: WalletModel;
    senderFarmer: Farmer;
    allFarmers: Farmer[];
}

const SendMoneyModal: React.FC<SendMoneyModalProps> = ({ onClose, onSave, senderWallet, senderFarmer, allFarmers }) => {
    const [recipientId, setRecipientId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescriptiion] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const recipientOptions = useMemo(() => 
        allFarmers
            .filter(f => f.id !== senderFarmer.id)
            .map(f => ({ value: f.id, label: `${f.fullName} (${f.hap_id || 'N/A'})`})), 
    [allFarmers, senderFarmer.id]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAmount = e.target.value;
        setAmount(newAmount);

        const numericAmount = parseFloat(newAmount);
        if (numericAmount > senderWallet.balance) {
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

        if (error || !recipientId || isNaN(numericAmount) || numericAmount <= 0) {
            alert('Please fill out the form correctly.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                recipientId,
                amount: numericAmount,
                description,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Send Money</h2></div>
                <div className="p-8 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">From</label>
                        <p className="mt-1 w-full p-2.5 bg-gray-100 rounded-lg text-gray-700 font-medium">{senderFarmer.fullName}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">To</label>
                        <CustomSelect options={recipientOptions} value={recipientId} onChange={setRecipientId} placeholder="-- Select a Recipient --" />
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
                            {error || `Available: ${formatCurrency(senderWallet.balance)}`}
                        </p>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Note (Optional)</label>
                        <input id="description" type="text" value={description} onChange={e => setDescriptiion(e.target.value)} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting || !!error || !recipientId || !amount} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Sending...' : 'Send Money'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SendMoneyModal;