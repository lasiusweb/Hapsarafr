
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
    const [autoRecharge, setAutoRecharge] = useState(false);

    const GST_RATE = 0.18;
    const gstAmount = selectedPackage.price * GST_RATE;
    const totalAmount = selectedPackage.price + gstAmount;

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
                
                // In a real app, we'd save the auto-recharge preference to the tenant config here
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b bg-gray-50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-800">Purchase Hapsara Credits</h2>
                    <p className="text-sm text-gray-500 mt-1">Power your operations with flexible, prepaid credits.</p>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Col: Selection */}
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="font-semibold text-gray-700 mb-3">Select Package</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {creditPackages.map(pkg => (
                                <button
                                    key={pkg.credits}
                                    onClick={() => setSelectedPackage(pkg)}
                                    className={`relative p-4 border-2 rounded-xl text-center transition-all ${selectedPackage.credits === pkg.credits ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-green-400'}`}
                                >
                                    <p className="text-2xl font-extrabold text-gray-800">{pkg.credits.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mt-1">Credits</p>
                                    {pkg.popular && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">POPULAR</div>}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t">
                             <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                                <div className="relative flex items-center mt-1">
                                    <input type="checkbox" checked={autoRecharge} onChange={e => setAutoRecharge(e.target.checked)} className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <span className="block text-sm font-bold text-gray-800">Enable Auto-Recharge</span>
                                    <span className="block text-xs text-gray-500">Automatically top up {selectedPackage.credits} credits when balance falls below 100.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Right Col: Summary */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col h-full">
                        <h3 className="font-bold text-gray-800 mb-4">Order Summary</h3>
                        
                        <div className="space-y-2 text-sm flex-1">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium">₹{selectedPackage.price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">GST (18%)</span>
                                <span className="font-medium">₹{gstAmount.toLocaleString()}</span>
                            </div>
                            <div className="border-t pt-2 mt-2 flex justify-between items-center">
                                <span className="font-bold text-gray-800">Total</span>
                                <span className="font-extrabold text-xl text-indigo-700">₹{totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                             <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-sm" disabled>
                                Pay with Razorpay
                            </button>
                             <button type="button" onClick={handleSimulatePurchase} disabled={isSimulating} className="w-full py-3 bg-white border-2 border-yellow-400 text-yellow-700 font-bold rounded-lg hover:bg-yellow-50 transition">
                                {isSimulating ? 'Processing...' : '⚡ Simulate Success'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-3">Secure 256-bit SSL Encrypted</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseCreditsModal;
