
import React, { useState, useMemo } from 'react';
import { LoanType, LoanStatus, Farmer } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { LoanApplicationModel, ActivityLogModel } from '../db';
import { formatCurrency } from '../lib/utils';

interface LoanApplicationModalProps {
    onClose: () => void;
    farmer: Farmer;
    creditScore: number;
    maxEligibility: number;
    currentUser: any;
    onSuccess: () => void;
}

const LoanApplicationModal: React.FC<LoanApplicationModalProps> = ({ onClose, farmer, creditScore, maxEligibility, currentUser, onSuccess }) => {
    const database = useDatabase();
    const [step, setStep] = useState(1);
    const [formState, setFormState] = useState({
        loanType: LoanType.CROP_LOAN,
        amount: '',
        tenure: '12',
        purpose: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await database.write(async () => {
                await database.get<LoanApplicationModel>('loan_applications').create(l => {
                    l.farmerId = farmer.id;
                    l.loanType = formState.loanType;
                    l.amountRequested = parseFloat(formState.amount);
                    l.tenureMonths = parseInt(formState.tenure);
                    l.purpose = formState.purpose;
                    l.status = LoanStatus.SUBMITTED;
                    l.creditScoreSnapshot = creditScore;
                    l.createdAt = new Date().toISOString();
                    l.tenantId = currentUser.tenantId;
                    l.syncStatusLocal = 'pending';
                });
                
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = 'LOAN_APPLICATION_SUBMITTED';
                    log.description = `Applied for ${formatCurrency(parseFloat(formState.amount))} ${formState.loanType.replace('_', ' ').toLowerCase()}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                    log.createdAt = Date.now();
                });
            });
            alert("Loan Application Submitted Successfully!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to submit application.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const emi = useMemo(() => {
        const p = parseFloat(formState.amount) || 0;
        const n = parseInt(formState.tenure) || 12;
        const r = 12 / 12 / 100; // 12% annual interest example
        if (p === 0) return 0;
        return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }, [formState.amount, formState.tenure]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-indigo-600 p-6 text-white">
                    <h2 className="text-xl font-bold">Apply for Credit</h2>
                    <p className="text-indigo-200 text-sm">Hapsara Capital • Instant Eligibility Check</p>
                </div>

                <div className="p-6 space-y-6">
                    {step === 1 && (
                        <>
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-indigo-800 uppercase font-bold">Max Eligibility</p>
                                    <p className="text-2xl font-bold text-indigo-900">{formatCurrency(maxEligibility)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-indigo-800 uppercase font-bold">Current Score</p>
                                    <p className="text-2xl font-bold text-indigo-900">{creditScore}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Type</label>
                                <CustomSelect 
                                    value={formState.loanType} 
                                    onChange={v => setFormState(s => ({...s, loanType: v as LoanType}))} 
                                    options={[
                                        {value: LoanType.CROP_LOAN, label: 'KCC / Crop Loan (Inputs)'},
                                        {value: LoanType.EQUIPMENT_LOAN, label: 'Equipment Finance'},
                                        {value: LoanType.INFRASTRUCTURE_LOAN, label: 'Infrastructure (Drip/Bore)'},
                                        {value: LoanType.PERSONAL_EMERGENCY, label: 'Personal Emergency'}
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Needed (₹)</label>
                                <input 
                                    type="number" 
                                    value={formState.amount} 
                                    onChange={e => setFormState(s => ({...s, amount: e.target.value}))} 
                                    className="w-full p-2 border rounded-md"
                                    max={maxEligibility}
                                />
                                {parseFloat(formState.amount) > maxEligibility && (
                                    <p className="text-xs text-red-600 mt-1">Amount exceeds eligibility limit.</p>
                                )}
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Repayment Tenure (Months)</label>
                                <select value={formState.tenure} onChange={e => setFormState(s => ({...s, tenure: e.target.value}))} className="w-full p-2 border rounded-md bg-white">
                                    <option value="6">6 Months</option>
                                    <option value="12">12 Months</option>
                                    <option value="24">24 Months</option>
                                    <option value="36">36 Months</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Usage Plan</label>
                                <textarea 
                                    value={formState.purpose} 
                                    onChange={e => setFormState(s => ({...s, purpose: e.target.value}))} 
                                    className="w-full p-2 border rounded-md" 
                                    rows={3} 
                                    placeholder="e.g., Purchasing drip irrigation system for Plot A..."
                                />
                            </div>

                            <div className="bg-gray-100 p-4 rounded-lg">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Est. Interest Rate:</span>
                                    <span className="font-semibold">12% p.a.</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-300">
                                    <span>Est. Monthly EMI:</span>
                                    <span>{formatCurrency(emi)}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="bg-gray-50 p-4 flex justify-between rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    {step === 1 ? (
                        <button 
                            onClick={() => setStep(2)} 
                            disabled={!formState.amount || parseFloat(formState.amount) > maxEligibility} 
                            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                        >
                            Next
                        </button>
                    ) : (
                         <button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting || !formState.purpose} 
                            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoanApplicationModal;
