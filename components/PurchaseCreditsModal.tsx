import React, { useState } from 'react';
import { Tenant, LedgerTransactionType } from '../types';
import { useDatabase } from '../DatabaseContext';
import { TenantModel, CreditLedgerEntryModel } from '../db';

interface PurchaseCreditsModalProps {
    onClose: () => void;
    currentTenant: Tenant;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const creditPackages = [
    { credits: 500, price: 500 },
    { credits: 1000, price: 1000, popular: true },
    { credits: 2500, price: 2500 },
    { credits: 5000, price: 5000 },
];

const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({ onClose, currentTenant, setNotification }) => {
    const database = useDatabase();
    const [selectedPackage, setSelectedPackage] = useState(creditPackages[1]);
    const [isSimulating, setIsSimulating] = useState(false);

    const handleSimulatePurchase = async () => {
        setIsSimulating(true);
        try {
            await database.write(async () => {
                const tenantRecord = await database.get<TenantModel>('tenants').find(currentTenant.id);
                
                await tenantRecord.update(t => {
                    t.creditBalance += selectedPackage.credits;
                });

                await database.get<CreditLedgerEntryModel>('credit_ledger').create(l => {
                    l.tenantId = currentTenant.id;
                    l.transactionType = LedgerTransactionType.PURCHASE;
                    l.amount = selectedPackage.credits;
                });
            });
            setNotification({ message: `${selectedPackage.credits} credits added successfully!`, type: 'success' });
            onClose();
        } catch (error) {
            console.error(error);
            setNotification({ message: `Failed to add credits.`, type: 'error' });
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Purchase Hapsara Credits</h2>
                    <p className="text-sm text-gray-500 mt-1">1 Credit = ₹1. Credits never expire.</p>
                </div>
                <div className="p-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {creditPackages.map(pkg => (
                            <button
                                key={pkg.credits}
                                onClick={() => setSelectedPackage(pkg)}
                                className={`p-4 border-2 rounded-lg text-center transition-all ${selectedPackage.credits === pkg.credits ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'}`}
                            >
                                <p className="text-2xl font-bold">{pkg.credits.toLocaleString()}</p>
                                <p className="text-sm text-gray-600">Credits</p>
                                {pkg.popular && <div className="absolute -top-3 right-0 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">POPULAR</div>}
                            </button>
                        ))}
                    </div>
                    <div className="mt-8 p-6 bg-gray-100 rounded-lg text-center">
                        <p className="text-lg font-semibold">Total Amount</p>
                        <p className="text-4xl font-extrabold text-gray-800 my-2">₹{selectedPackage.price.toLocaleString()}</p>
                        <button className="mt-4 w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition" disabled>
                            Pay with Razorpay (Coming Soon)
                        </button>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-between items-center rounded-b-lg">
                    <button type="button" onClick={handleSimulatePurchase} disabled={isSimulating} className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-semibold disabled:bg-yellow-300">
                        {isSimulating ? 'Processing...' : 'Simulate Purchase'}
                    </button>
                    <button type="button" onClick={onClose} disabled={isSimulating} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseCreditsModal;
