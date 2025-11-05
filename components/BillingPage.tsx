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
    const userCost = userCount * PRICING_MODEL.PER_USER_COST_INR;
    const recordCost = recordCount * PRICING_MODEL.PER_RECORD_COST_INR;
    const estimatedTotal = userCost + recordCost;

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Billing & Usage</h1>
                        <p className="text-gray-500">View your current usage and estimated monthly cost.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                </div>

                {/* Usage & Cost Section */}
                <div className="bg-white rounded-lg shadow-xl p-8 mb-8 grid md:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Current Plan</h2>
                         <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                            <h3 className="text-xl font-semibold text-green-800">Pay-As-You-Go</h3>
                            <p className="text-gray-600 mt-2">You are on our simple, transparent usage-based billing plan. You only pay for what you use.</p>
                            <ul className="mt-4 text-sm space-y-2">
                                <li className="flex justify-between"><span>Cost per User:</span> <span className="font-semibold">₹{PRICING_MODEL.PER_USER_COST_INR} / month</span></li>
                                <li className="flex justify-between"><span>Cost per Record:</span> <span className="font-semibold">₹{PRICING_MODEL.PER_RECORD_COST_INR} / month</span></li>
                            </ul>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Current Monthly Usage</h2>
                         <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                            <div className="flex justify-between items-baseline pb-2 border-b">
                                <div className="text-gray-600">
                                    <p>Active Users</p>
                                    <p className="text-xs">({userCount} users × ₹{PRICING_MODEL.PER_USER_COST_INR})</p>
                                </div>
                                <span className="text-lg font-bold text-gray-800">₹{userCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-baseline pb-2 border-b">
                                <div className="text-gray-600">
                                    <p>Farmer Records</p>
                                    <p className="text-xs">({recordCount} records × ₹{PRICING_MODEL.PER_RECORD_COST_INR})</p>
                                </div>
                                <span className="text-lg font-bold text-gray-800">₹{recordCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4">
                                <span className="text-lg font-semibold text-gray-700">Estimated Monthly Cost</span>
                                <span className="text-2xl font-extrabold text-green-600">₹{estimatedTotal.toFixed(2)}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">This is an estimate. Your final bill may vary.</p>
                    </div>
                </div>

                {/* Payment History (Placeholder) */}
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment History</h2>
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-md">
                        <p>No payment history available.</p>
                        <p className="text-sm">Your past invoices and payment details will appear here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingPage;