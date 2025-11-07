import React, { useState, useEffect } from 'react';
import { SubsidyPayment, PaymentStage } from '../types';
import { SubsidyPaymentModel } from '../db';
import CustomSelect from './CustomSelect';

interface SubsidyPaymentFormProps {
    onClose: () => void;
    onSubmit: (paymentData: Omit<SubsidyPayment, 'syncStatus' | 'createdAt' | 'createdBy' | 'farmerId' | 'tenantId'>) => Promise<void>;
    existingPayment?: SubsidyPaymentModel | null;
    initialStage?: PaymentStage;
}

const STAGE_AMOUNT_MAP: Partial<Record<PaymentStage, number>> = {
  [PaymentStage.MaintenanceYear1]: 5250,
  [PaymentStage.MaintenanceYear2]: 5250,
  [PaymentStage.MaintenanceYear3]: 5250,
  [PaymentStage.MaintenanceYear4]: 5250,
  [PaymentStage.IntercroppingYear1]: 5250,
  [PaymentStage.IntercroppingYear2]: 5250,
  [PaymentStage.IntercroppingYear3]: 5250,
  [PaymentStage.IntercroppingYear4]: 5250,
  [PaymentStage.PlantingMaterialDomestic]: 20000,
  [PaymentStage.PlantingMaterialImported]: 29000,
  [PaymentStage.BoreWell]: 50000,
  [PaymentStage.VermiCompost]: 15000,
};


const SubsidyPaymentForm: React.FC<SubsidyPaymentFormProps> = ({ onClose, onSubmit, existingPayment = null, initialStage }) => {
    const getInitialAmount = (stage?: PaymentStage) => {
        if (!stage) return '';
        return String(STAGE_AMOUNT_MAP[stage] || '');
    };
    
    const [formData, setFormData] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: getInitialAmount(initialStage),
        utrNumber: '',
        paymentStage: initialStage || PaymentStage.MaintenanceYear1,
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isEditMode = !!existingPayment;

    useEffect(() => {
        if (isEditMode && existingPayment) {
            setFormData({
                paymentDate: existingPayment.paymentDate,
                amount: String(existingPayment.amount),
                utrNumber: existingPayment.utrNumber,
                paymentStage: existingPayment.paymentStage,
                notes: existingPayment.notes || '',
            });
        }
    }, [isEditMode, existingPayment]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleStageChange = (stage: PaymentStage) => {
        setFormData(prev => ({
            ...prev,
            paymentStage: stage,
            amount: getInitialAmount(stage)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                id: existingPayment?.id || '', // Pass ID for updates
                ...formData,
                amount,
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const paymentStageOptions = Object.values(PaymentStage).map(stage => ({ value: stage, label: stage }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Subsidy / Assistance' : 'Record Subsidy / Assistance'}</h2>
                </div>
                <div className="p-8 space-y-4">
                    <div>
                        <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Payment Date</label>
                        <input type="date" id="paymentDate" name="paymentDate" value={formData.paymentDate} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="paymentStage" className="block text-sm font-medium text-gray-700">Payment Stage</label>
                        <CustomSelect
                            value={formData.paymentStage}
                            onChange={(value) => handleStageChange(value as PaymentStage)}
                            options={paymentStageOptions}
                        />
                    </div>
                     <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                        <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} required placeholder="e.g., 5250" className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="utrNumber" className="block text-sm font-medium text-gray-700">UTR/DD Number</label>
                        <input type="text" id="utrNumber" name="utrNumber" value={formData.utrNumber} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Payment' : 'Record Payment')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SubsidyPaymentForm;