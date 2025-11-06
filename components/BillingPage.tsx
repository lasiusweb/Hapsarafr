import React from 'react';
import { User } from '../types';
import { PRICING_MODEL } from '../data/subscriptionPlans';

interface BillingPageProps {
    currentUser: User;
    onBack: () => void;
    userCount: number;
    recordCount: number;
}

const BillingPage: React.FC<BillingPageProps> = ({ currentUser, onBack, userCount, recordCount }) => {
    
    const estimatedUserCost = userCount * PRICING_MODEL.PER_USER_COST_INR;
    const estimatedRecordCost = recordCount * PRICING_MODEL.PER_RECORD_COST_INR;
    const estimatedTotal = estimatedUserCost + estimatedRecordCost;

    const UsageCard: React.FC<{label: string, count: number, costPerUnit: number, totalCost: number}> = ({label, count, costPerUnit, totalCost}) => (
        <div className="bg-gray-50 p-4 rounded-lg border">
            <p className="text-gray-600 font-medium">{label}</p>
            <div className="flex justify-between items-baseline mt-1">
                <p className="text-2xl font-bold text-gray-800">{count.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{count} × ₹{costPerUnit}/month</p>
            </div>
             <p className="text-right font-semibold text-gray-700 mt-2">Subtotal: ₹{totalCost.toLocaleString()}</p>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Billing & Usage</h1>
                        <p className="text-gray-500">Review your current usage and estimated monthly costs.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Estimated Bill */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-xl p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Current Monthly Estimate</h2>
                        <div className="space-y-4 mb-6">
                            <UsageCard label="Active Users" count={userCount} costPerUnit={PRICING_MODEL.PER_USER_COST_INR} totalCost={estimatedUserCost} />
                            <UsageCard label="Farmer Records" count={recordCount} costPerUnit={PRICING_MODEL.PER_RECORD_COST_INR} totalCost={estimatedRecordCost} />
                        </div>
                        <div className="mt-8 pt-6 border-t">
                            <div className="flex justify-between items-center">
                                <p className="text-xl font-semibold text-gray-600">Estimated Total:</p>
                                <p className="text-3xl font-bold text-green-600">₹{estimatedTotal.toLocaleString()}</p>
                            </div>
                            <p className="text-right text-sm text-gray-500 mt-1">Next billing date: October 1, 2024</p>
                        </div>
                    </div>
                    
                    {/* Payment & History */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-lg shadow-xl p-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Method</h2>
                            <div className="flex items-center gap-4">
                                <img src="https://js.wdd.io/img/visa_mastercard.png" alt="Visa Mastercard" className="h-8"/>
                                <div>
                                    <p className="font-semibold">Visa ending in 1234</p>
                                    <p className="text-sm text-gray-500">Expires 12/2026</p>
                                </div>
                            </div>
                            <button className="mt-4 w-full py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold text-sm">Update Payment Method</button>
                        </div>

                         <div className="bg-white rounded-lg shadow-xl p-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Billing History</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <p>September 2024</p>
                                    <p className="font-semibold">₹1,320.00</p>
                                    <a href="#" className="text-green-600 hover:underline">Download</a>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <p>August 2024</p>
                                    <p className="font-semibold">₹1,150.00</p>
                                    <a href="#" className="text-green-600 hover:underline">Download</a>
                                </div>
                                 <div className="flex justify-between items-center text-sm">
                                    <p>July 2024</p>
                                    <p className="font-semibold">₹980.00</p>
                                    <a href="#" className="text-green-600 hover:underline">Download</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingPage;