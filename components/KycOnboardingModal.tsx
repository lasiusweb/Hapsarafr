import React, { useState, useRef, useCallback } from 'react';
import { Farmer, WithdrawalAccountType, WithdrawalAccount } from '../types';
import { useDatabase } from '../DatabaseContext';
import { WalletModel, WithdrawalAccountModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';

interface KycOnboardingModalProps {
    farmer: Farmer;
    onClose: () => void;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const STEPS = [
    { id: 1, name: 'Account Details' },
    { id: 2, name: 'Document Upload' },
    { id: 3, name: 'Review & Submit' },
];

const KycOnboardingModal: React.FC<KycOnboardingModalProps> = ({ farmer, onClose, setNotification }) => {
    const database = useDatabase();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [accountType, setAccountType] = useState<WithdrawalAccountType>(WithdrawalAccountType.BankAccount);
    const [bankDetails, setBankDetails] = useState({ accountHolderName: farmer.fullName, ifsc: '', accountNumber: '' });
    const [upiId, setUpiId] = useState('');
    const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
    const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);
    const [bankDocFile, setBankDocFile] = useState<File | null>(null);
    const [bankDocPreview, setBankDocPreview] = useState<string | null>(null);
    
    const aadhaarInputRef = useRef<HTMLInputElement>(null);
    const bankDocInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'aadhaar' | 'bankDoc') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'aadhaar') {
                    setAadhaarFile(file);
                    setAadhaarPreview(reader.result as string);
                } else {
                    setBankDocFile(file);
                    setBankDocPreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            await database.write(async () => {
                // 1. Ensure a wallet exists for the farmer
                const walletCollection = database.get<WalletModel>('wallets');
                const existingWallets = await walletCollection.query(Q.where('farmer_id', farmer.id)).fetch();
                if (existingWallets.length === 0) {
                    await walletCollection.create(wallet => {
                        wallet.farmerId = farmer.id;
                        wallet.balance = 0;
                    });
                }
                
                // 2. Create the withdrawal account
                const accountCollection = database.get<WithdrawalAccountModel>('withdrawal_accounts');
                await accountCollection.create(acc => {
                    acc.farmerId = farmer.id;
                    acc.accountType = accountType;
                    acc.isVerified = false; // Verification is a separate, offline/backend process
                    
                    if (accountType === WithdrawalAccountType.BankAccount) {
                        acc.details = `A/C: ...${bankDetails.accountNumber.slice(-4)}, Name: ${bankDetails.accountHolderName}`;
                    } else {
                        acc.details = `UPI: ${upiId}`;
                    }
                    // In a real app, you would upload aadhaarFile and bankDocFile to a secure storage
                    // and save the URLs, then call the Razorpay API to create a contact and fund account.
                    // acc.razorpayFundAccountId = '...';
                });
            });
            setNotification({ message: 'KYC details submitted for verification.', type: 'success' });
            onClose();
        } catch (error) {
            console.error("Failed to save KYC details:", error);
            setNotification({ message: 'Failed to save KYC details.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return (
                <div className="space-y-4">
                    <CustomSelect label="Account Type" value={accountType} onChange={v => setAccountType(v as WithdrawalAccountType)} options={[{value: WithdrawalAccountType.BankAccount, label: 'Bank Account'}, {value: WithdrawalAccountType.UPI, label: 'UPI'}]} />
                    {accountType === WithdrawalAccountType.BankAccount ? (
                         <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700">Account Holder Name</label><input type="text" value={bankDetails.accountHolderName} onChange={e => setBankDetails(s => ({...s, accountHolderName: e.target.value}))} required className="mt-1 w-full p-2 border rounded-md" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Account Number</label><input type="text" value={bankDetails.accountNumber} onChange={e => setBankDetails(s => ({...s, accountNumber: e.target.value}))} required className="mt-1 w-full p-2 border rounded-md" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">IFSC Code</label><input type="text" value={bankDetails.ifsc} onChange={e => setBankDetails(s => ({...s, ifsc: e.target.value.toUpperCase()}))} required className="mt-1 w-full p-2 border rounded-md" /></div>
                        </div>
                    ) : (
                        <div><label className="block text-sm font-medium text-gray-700">UPI ID</label><input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" placeholder="e.g., farmer@okhdfcbank" /></div>
                    )}
                </div>
            );
            case 2: return (
                <div className="space-y-6">
                    <input type="file" accept="image/*" capture="environment" ref={aadhaarInputRef} onChange={e => handleFileChange(e, 'aadhaar')} className="hidden" />
                    <input type="file" accept="image/*" capture="environment" ref={bankDocInputRef} onChange={e => handleFileChange(e, 'bankDoc')} className="hidden" />
                    <div className="flex gap-4 items-center">{aadhaarPreview ? <img src={aadhaarPreview} alt="Aadhaar Preview" className="w-32 h-20 object-cover rounded-md border" /> : <div className="w-32 h-20 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">Preview</div>}<button type="button" onClick={() => aadhaarInputRef.current?.click()} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Capture Aadhaar Card</button></div>
                    <div className="flex gap-4 items-center">{bankDocPreview ? <img src={bankDocPreview} alt="Bank Doc Preview" className="w-32 h-20 object-cover rounded-md border" /> : <div className="w-32 h-20 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">Preview</div>}<button type="button" onClick={() => bankDocInputRef.current?.click()} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Capture Bank Passbook / Cheque</button></div>
                </div>
            );
            case 3: return (
                <div className="space-y-4 text-sm">
                    <h4 className="font-bold text-gray-800 mb-2">Please confirm the details:</h4>
                    {accountType === WithdrawalAccountType.BankAccount ? (
                        <>
                            <p><strong>Holder Name:</strong> {bankDetails.accountHolderName}</p>
                            <p><strong>Account No:</strong> {bankDetails.accountNumber}</p>
                            <p><strong>IFSC:</strong> {bankDetails.ifsc}</p>
                        </>
                    ) : (
                        <p><strong>UPI ID:</strong> {upiId}</p>
                    )}
                    <p><strong>Aadhaar Captured:</strong> {aadhaarFile ? 'Yes' : 'No'}</p>
                    <p><strong>Bank Document Captured:</strong> {bankDocFile ? 'Yes' : 'No'}</p>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl flex flex-col max-h-full">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">KYC Onboarding for {farmer.fullName}</h2></div>
                <div className="p-8 overflow-y-auto flex-1">{renderStepContent()}</div>
                <div className="bg-gray-100 p-4 flex justify-between items-center rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                    <div className="flex items-center gap-4">
                        {currentStep > 1 && <button type="button" onClick={() => setCurrentStep(s => s - 1)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Previous</button>}
                        {currentStep < 3 && <button type="button" onClick={() => setCurrentStep(s => s + 1)} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Next</button>}
                        {currentStep === 3 && <button type="button" onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400">{isSubmitting ? 'Submitting...' : 'Submit for Verification'}</button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KycOnboardingModal;
